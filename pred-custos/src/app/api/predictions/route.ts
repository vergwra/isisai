import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/server/middleware/auth"
import { PredictionService } from "@/server/services/predictionService"
import { logger } from "@/server/utils/logger"
import { z } from "zod"

// Definimos runtime como nodejs para garantir compatibilidade com fetch
export const runtime = 'nodejs'

const predictionService = new PredictionService()

// Schema de validação para criação de previsão (compatível com API Python)
const createPredictionSchema = z.object({
  container_tamanho: z.string().nullable().optional(),
  container_tipo: z.string().nullable().optional(),
  destino_porto: z.string().min(2),
  fuel_index: z.number().min(0.5).max(2).optional(),
  fx_brl_eur: z.number().optional(),
  lead_time_days: z.number().int().min(1).max(365).optional(),
  modal: z.string(),
  model_name: z.string(),
  origem_porto: z.string().min(2),
  output_currency: z.string().min(3).max(3).default("EUR"),
  period_end: z.string().optional(),
  period_start: z.string().optional(),
  taxes_pct: z.number().min(0).max(100).optional(),
  tipo_embalagem: z.string(),
  tipo_produto: z.string(),
  volume_ton: z.number().min(0.1).max(1000)
})

// Endpoint para criar uma nova previsão e fazer proxy para a API FastAPI
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse do payload
    const payload = await request.json()

    // Validamos o payload usando o schema (agora para ambos os fluxos)
    const validationResult = createPredictionSchema.safeParse(payload)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // URL do backend FastAPI - usando variável de ambiente ou valor padrão
    const PY_BACKEND_URL = process.env.PY_BACKEND_URL || 'http://localhost:8000'

    // Flag que controla se vamos usar a fila ou não
    const USE_QUEUE = process.env.USE_QUEUE === 'true'

    // Se USE_QUEUE=true, usar sistema de fila
    if (USE_QUEUE) {
      try {
        // Import dinâmico para evitar carregamento quando não é necessário
        const { enqueuePrediction } = await import('@/server/jobs/queue')

        // Criar previsão com status PENDING
        const prediction = await predictionService.createPrediction({
          userId: user.id,
          volumeTon: data.volume_ton,
          currency: data.output_currency,
          inputJson: data, // Salvamos o payload validado completo (snake_case)
          leadTimeDays: data.lead_time_days,
          fuelIndex: data.fuel_index,
          taxMultiplier: data.taxes_pct ? (data.taxes_pct / 100) + 1 : undefined
        })

        // Adicionar à fila de processamento
        await enqueuePrediction(prediction.id)

        logger.info({
          operation: 'create_prediction_queued',
          predictionId: prediction.id,
          userId: user.id
        })

        return NextResponse.json({
          status: "queued",
          id: prediction.id,
          jobId: prediction.id,
          createdAt: prediction.createdAt
        }, { status: 202 }) // 202 Accepted para indicar processamento assíncrono
      } catch (error) {
        logger.error({
          operation: 'create_prediction_queue_error',
          error: error instanceof Error ? error.message : String(error)
        })

        return NextResponse.json(
          { error: "Failed to enqueue prediction request" },
          { status: 500 }
        )
      }
    } else {
      // Fluxo síncrono: proxy direto para o FastAPI, mas persistindo o resultado
      try {
        // 1. Criar registro da previsão (PENDING) para ter um ID
        const prediction = await predictionService.createPrediction({
          userId: user.id,
          volumeTon: data.volume_ton,
          currency: data.output_currency,
          inputJson: data, // Salvamos o payload validado completo
          leadTimeDays: data.lead_time_days,
          fuelIndex: data.fuel_index,
          taxMultiplier: data.taxes_pct ? (data.taxes_pct / 100) + 1 : undefined
        })

        // Construir a URL completa para o endpoint de predição
        const url = `${PY_BACKEND_URL}/api/v1/predict`

        // 2. Realizar chamada server-to-server para o FastAPI
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data) // Usando dados validados
        })

        if (!response.ok) {
          // Se falhar, marcar como erro no banco
          const errorText = await response.text()
          await predictionService.markError(prediction.id, `Backend error: ${response.status} - ${errorText}`)

          throw new Error(`Backend responded with ${response.status}: ${errorText}`)
        }

        // Obter resposta como JSON
        const responseData = await response.json()

        // 3. Atualizar previsão com o resultado (COMPLETED)
        // Calcular custo por kg (estimativa simples baseada no total / volume em kg)
        // volume_ton * 1000 = kg
        const volumeKg = data.volume_ton * 1000

        // Mapear campos da resposta do backend (PredictResponse)
        // O backend retorna: { cost: number, currency: string, breakdown: { ... } }
        const costTotal = responseData.cost || responseData.estimated_cost || 0
        const unitCost = volumeKg > 0 ? costTotal / volumeKg : 0

        const breakdown = responseData.breakdown || {}

        await predictionService.markCompleted(prediction.id, {
          costTotal: costTotal,
          euroPerKg: unitCost,
          outputJson: responseData,
          modelUsed: breakdown.model_used || responseData.model_used,
          modelVersion: breakdown.version || responseData.version,
          artifactPath: breakdown.artifact_path || responseData.artifact_path
        })

        // Log de sucesso
        logger.info({
          operation: 'create_prediction_sync_saved',
          status: response.status,
          predictionId: prediction.id,
          userId: user.id
        })

        // Retornar resposta combinando dados do banco (ID) e do backend
        return NextResponse.json({
          ...responseData,
          id: prediction.id, // Importante: retornar o ID para o frontend redirecionar
          status: "COMPLETED"
        }, { status: 200 })

      } catch (error) {
        // Log de erro
        logger.error({
          operation: 'create_prediction_sync_error',
          error: error instanceof Error ? error.message : String(error)
        })

        // Erro 502 Bad Gateway para problemas com o servidor upstream
        return NextResponse.json(
          { error: "Failed to process prediction", details: error instanceof Error ? error.message : String(error) },
          { status: 502 }
        )
      }
    }
  } catch (error) {
    logger.error({
      operation: 'create_prediction_error',
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Endpoint para listar previsões do usuário
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Parse parâmetros de paginação
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    // Obter previsões com paginação
    const { predictions, pagination } = await predictionService.getAllPredictions({
      userId: user.id,
      page,
      limit
    })

    return NextResponse.json({
      predictions: predictions.map(p => {
        // Usar type assertion para acessar as propriedades do JSON
        const inputData = p.inputJson as { route?: { origin: string, destination: string } }

        return {
          id: p.id,
          status: p.status,
          volumeTon: p.volumeTon,
          origin: inputData.route?.origin,
          destination: inputData.route?.destination,
          costTotal: p.costTotal,
          euroPerKg: p.euroPerKg,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          inputData
        }
      }),
      pagination
    })

  } catch (error) {
    logger.error({
      operation: 'list_predictions_error',
      error: error instanceof Error ? error.message : String(error)
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
