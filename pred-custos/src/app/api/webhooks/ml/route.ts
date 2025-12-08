import { NextRequest, NextResponse } from "next/server"
import { PredictionService } from "@/server/services/predictionService"
import { logger } from "@/server/utils/logger"
import { trackPredictionLatency } from "@/server/utils/logger"
import { z } from "zod"

const predictionService = new PredictionService()

// Webhook secret para verificar que a solicitação vem do serviço ML
const ML_WEBHOOK_SECRET = process.env.ML_WEBHOOK_SECRET || 'changeme_webhook_secret'

// Schema de validação para webhook de atualização de previsão
const predictionUpdateSchema = z.object({
  prediction_id: z.string().uuid(),
  status: z.enum(["completed", "error"]),
  output: z.object({
    cost_total: z.number().optional(),
    currency: z.string().optional(),
    breakdown: z.record(z.any()).optional(),
  }).optional(),
  error: z.string().optional(),
  processing_time_ms: z.number().optional(),
  model_used: z.string().optional(),
  model_version: z.string().optional(),
})

// Endpoint para receber webhooks de atualização do serviço ML
export async function POST(request: NextRequest) {
  try {
    // Verificar secret do webhook
    const authHeader = request.headers.get('authorization')
    const secret = authHeader?.split(' ')[1] || ''
    
    if (secret !== ML_WEBHOOK_SECRET) {
      logger.warn({
        operation: 'ml_webhook_unauthorized',
        headers: Object.fromEntries(request.headers)
      })
      
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Parse e validação do payload
    const payload = await request.json()
    const validationResult = predictionUpdateSchema.safeParse(payload)
    
    if (!validationResult.success) {
      logger.warn({
        operation: 'ml_webhook_invalid_payload',
        payload,
        errors: validationResult.error.format()
      })
      
      return NextResponse.json(
        { error: "Invalid payload", details: validationResult.error.format() },
        { status: 400 }
      )
    }
    
    const data = validationResult.data
    const { prediction_id: predictionId, status, output, error, processing_time_ms, model_used, model_version } = data
    
    // Buscar previsão por ID
    const prediction = await predictionService.getPredictionById(predictionId)
    
    if (!prediction) {
      logger.warn({
        operation: 'ml_webhook_prediction_not_found',
        predictionId
      })
      
      return NextResponse.json(
        { error: "Prediction not found" },
        { status: 404 }
      )
    }
    
    // Atualizar previsão com base no status
    if (status === 'completed' && output) {
      // Calcular €/kg
      const costTotal = output.cost_total || 0
      const volumeTonNumber = Number(prediction.volumeTon)
      const euroPerKg = costTotal / (volumeTonNumber * 1000)
      
      // Marcar como concluída com os dados do output
      await predictionService.markCompleted(predictionId, {
        costTotal,
        euroPerKg,
        outputJson: output,
        modelUsed: model_used || output.breakdown?.model_used,
        modelVersion: model_version || output.breakdown?.version,
        artifactPath: output.breakdown?.artifact_path
      })
      
      // Registrar métricas de latência se disponível
      if (processing_time_ms) {
        trackPredictionLatency(processing_time_ms)
      }
      
      logger.info({
        operation: 'ml_webhook_prediction_completed',
        predictionId,
        latency_ms: processing_time_ms
      })
    } else if (status === 'error') {
      // Marcar como erro com a mensagem de erro
      await predictionService.markError(predictionId, error || "Unknown error from ML service")
      
      logger.error({
        operation: 'ml_webhook_prediction_error',
        predictionId,
        error
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Prediction ${predictionId} updated to ${status}`
    })
    
  } catch (error) {
    logger.error({
      operation: 'ml_webhook_error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
