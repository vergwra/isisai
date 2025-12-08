import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/server/middleware/auth"
import { PredictionService } from "@/server/services/predictionService"
import { logger } from "@/server/utils/logger"

const predictionService = new PredictionService()

interface RouteParams {
  params: {
    id: string
  }
}

// Endpoint para obter uma previsão específica por ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // Verificar autenticação
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = params

    // Buscar previsão por ID
    const prediction = await predictionService.getPredictionById(id)

    // Verificar se previsão existe
    if (!prediction) {
      return NextResponse.json(
        { error: "Prediction not found" },
        { status: 404 }
      )
    }

    // Verificar se o usuário tem permissão para ver esta previsão
    // Admins podem ver qualquer previsão, usuários comuns apenas as suas
    if (user.role !== "ADMIN" && prediction.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Formatar resposta com detalhes completos da previsão
    // Usar type assertion para acessar as propriedades do JSON
    const inputData = prediction.inputJson as { route?: any; fx_used?: Record<string, number> }
    const outputData = prediction.outputJson as { breakdown?: any } | null

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      volumeTon: prediction.volumeTon,
      currency: prediction.currency,
      input: {
        route: inputData?.route || {},
        fxRates: inputData?.fx_used || {},
        leadTimeDays: prediction.leadTimeDays,
        fuelIndex: prediction.fuelIndex,
        taxMultiplier: prediction.taxMultiplier
      },
      output: prediction.status === 'COMPLETED' ? {
        costTotal: prediction.costTotal,
        euroPerKg: prediction.euroPerKg,
        modelUsed: prediction.modelUsed,
        modelVersion: prediction.modelVersion,
        breakdown: outputData?.breakdown || {}
      } : null,
      error: prediction.errorMessage,
      createdAt: prediction.createdAt,
      updatedAt: prediction.updatedAt
    })

  } catch (error) {
    logger.error({
      operation: 'get_prediction_error',
      error: error instanceof Error ? error.message : String(error),
      predictionId: params.id
    })

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
