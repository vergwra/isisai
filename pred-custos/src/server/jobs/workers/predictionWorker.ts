import { Worker } from 'bullmq'
import { PredictionService } from '../../services/predictionService'
import { mlClient, PredictInput } from '../../services/mlClient'
import { logger } from '@/server/utils/logger'

const predictionService = new PredictionService()

// Função para construir o payload de previsão do ML a partir da predição do banco
function buildMlPayloadFromPrediction(prediction: any): PredictInput {
  // Extrai dados da previsão para o formato esperado pela API ML
  const input = prediction.inputJson

  return {
    currency: prediction.currency,
    volume_ton: Number(prediction.volumeTon),
    lead_time_days: prediction.leadTimeDays || 30,
    fuel_index: prediction.fuelIndex ? Number(prediction.fuelIndex) : 1.0,
    tax_multiplier: prediction.taxMultiplier ? Number(prediction.taxMultiplier) : 1.0,
    route: input.route || {
      origin: "BR-CE",
      destination: "PT-LIS"
    },
    fx_used: input.fx_used || {
      BRL_EUR: 0.18,
      BRL_USD: 0.20
    },
    meta: {
      prediction_id: prediction.id,
    }
  }
}

// Inicialização do worker para processar jobs de predição
export function initializePredictionWorker() {
  const worker = new Worker('prediction', async (job) => {
    const { predictionId } = job.data

    logger.info({
      operation: 'process_prediction_start',
      predictionId,
      jobId: job.id
    })

    try {
      // 1. Marcar previsão como em processamento
      const prediction = await predictionService.markProcessing(predictionId)

      // 2. Construir payload para API ML
      const input = buildMlPayloadFromPrediction(prediction)

      // 3. Chamar serviço ML
      const startTime = Date.now()
      const output = await mlClient.predict(input)
      const latencyMs = Date.now() - startTime

      // 4. Calcular €/kg
      const costTotal = output.cost_total
      const volumeTonNumber = Number(prediction.volumeTon)
      const euroPerKg = costTotal / (volumeTonNumber * 1000)

      logger.info({
        operation: 'prediction_calculation',
        predictionId,
        costTotal,
        volumeTon: volumeTonNumber,
        euroPerKg,
        latency_ms: latencyMs
      })

      // 5. Atualizar previsão com resultados
      await predictionService.markCompleted(predictionId, {
        costTotal,
        euroPerKg,
        outputJson: output,
        modelUsed: output.breakdown?.model_used,
        modelVersion: output.breakdown?.version,
        artifactPath: output.breakdown?.artifact_path
      })

      logger.info({
        operation: 'process_prediction_complete',
        predictionId,
        status: 'success',
        latency_ms: latencyMs
      })

      return { success: true, predictionId }

    } catch (error) {
      // Em caso de erro, marca previsão como erro
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error({
        operation: 'process_prediction_error',
        predictionId,
        error: errorMessage
      })

      await predictionService.markError(predictionId, errorMessage)

      // Re-throw para o BullMQ gerenciar retentativas
      throw error
    }
  }, {
    connection: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    concurrency: 3, // Processa até 3 previsões simultaneamente
  })

  worker.on('completed', (job) => {
    logger.info({
      operation: 'worker_job_completed',
      jobId: job.id,
      predictionId: job.data.predictionId
    })
  })

  worker.on('failed', (job, error) => {
    if (job) {
      logger.error({
        operation: 'worker_job_failed',
        jobId: job.id,
        predictionId: job.data.predictionId,
        error: error.message,
        attempt: job.attemptsMade
      })
    }
  })

  logger.info({ operation: 'prediction_worker_initialized' })

  return worker
}
