import { Queue, Worker, QueueEvents } from 'bullmq'
import { logger } from '@/server/utils/logger'
import { PredictionService } from '@/server/services/predictionService'

// Recupera a URL do Redis do env ou usa o padrão
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const PY_BACKEND_URL = process.env.PY_BACKEND_URL || 'http://localhost:8000'

// Configuração de conexão Redis
const connection = {
  url: REDIS_URL
}

// Instâncias singleton para evitar múltiplas instanciações em dev
let predictionQueueInstance: Queue | null = null
let predictionWorkerInstance: Worker | null = null
let predictionEventsInstance: QueueEvents | null = null

const predictionService = new PredictionService()

// Função para obter a Queue, usando o padrão singleton
export function getPredictionQueue(): Queue {
  if (!predictionQueueInstance) {
    predictionQueueInstance = new Queue('prediction', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000 // 5 segundos iniciais, depois exponencial
        },
        removeOnComplete: true,
        removeOnFail: 500 // Mantém os últimos 500 jobs com falha para análise
      }
    })
  }
  return predictionQueueInstance
}

// Função para obter o Worker, usando o padrão singleton
export function getPredictionWorker(): Worker {
  if (!predictionWorkerInstance) {
    predictionWorkerInstance = new Worker(
      'prediction',
      async (job) => {
        const { predictionId } = job.data

        logger.info({
          operation: 'process_prediction_job_start',
          jobId: job.id,
          predictionId
        })

        try {
          // 1. Buscar a predição no banco
          const prediction = await predictionService.getPredictionById(predictionId)

          if (!prediction) {
            throw new Error(`Prediction not found: ${predictionId}`)
          }

          // 2. Marcar como processando
          await predictionService.markProcessing(predictionId)

          // 3. Construir payload para o Python
          // O inputJson já está no formato snake_case correto esperado pela API Python
          const payload = prediction.inputJson

          // 4. Chamar API Python
          const url = `${PY_BACKEND_URL}/api/v1/predict`
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Python API error: ${response.status} - ${errorText}`)
          }

          const result = await response.json()

          // 5. Calcular métricas e salvar resultado
          // result = { cost: number, currency: string, breakdown: object }

          const totalCost = Number(result.cost)
          const volumeTon = Number(prediction.volumeTon)
          const volumeKg = volumeTon * 1000

          // Calcular custo por kg (assumindo que se a moeda for BRL, convertemos para EUR se necessário, 
          // mas o campo chama euroPerKg. Por enquanto vamos salvar o valor na moeda da predição/kg
          // ou tentar converter se tivermos a taxa)
          let costPerKg = totalCost / volumeKg

          // Se a moeda de saída for BRL e tivermos a taxa BRL_EUR, podemos tentar converter para ser fiel ao nome do campo
          // Mas para simplificar e manter consistência com o que o usuário vê, vamos salvar o custo/kg na moeda escolhida
          // O frontend deve saber interpretar ou o nome do campo no banco é apenas legado.

          await predictionService.markCompleted(predictionId, {
            costTotal: totalCost,
            euroPerKg: costPerKg, // Salvando custo/kg na moeda original por enquanto
            outputJson: result.breakdown || {},
            modelUsed: result.breakdown?.model_used,
            modelVersion: result.breakdown?.version,
            artifactPath: result.breakdown?.artifact_path
          })

          logger.info({
            operation: 'process_prediction_job_success',
            jobId: job.id,
            predictionId,
            cost: totalCost
          })

          return { processed: true, cost: totalCost }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)

          logger.error({
            operation: 'process_prediction_job_error',
            jobId: job.id,
            predictionId,
            error: errorMessage
          })

          // Marcar erro no banco
          await predictionService.markError(predictionId, errorMessage)

          throw error // Re-throw para o BullMQ saber que falhou
        }
      },
      { connection }
    )

    // Configurar eventos do worker
    predictionWorkerInstance.on('completed', (job) => {
      logger.info({
        operation: 'job_completed',
        jobId: job.id
      })
    })

    predictionWorkerInstance.on('failed', (job, error) => {
      logger.error({
        operation: 'job_failed',
        queue: 'prediction',
        jobId: job?.id,
        data: job?.data,
        error: error.message,
        attempt: job?.attemptsMade
      })
    })
  }
  return predictionWorkerInstance
}

// Função para obter QueueEvents, usando o padrão singleton
export function getPredictionEvents(): QueueEvents {
  if (!predictionEventsInstance) {
    predictionEventsInstance = new QueueEvents('prediction', { connection })
  }
  return predictionEventsInstance
}

// Inicializa as filas e registra eventos
export async function initializeQueues() {
  try {
    // Inicializar instâncias singleton
    const queue = getPredictionQueue();
    const worker = getPredictionWorker();
    const events = getPredictionEvents();

    // Registra eventos da fila de predição
    queue.on('error', (error: Error) => {
      logger.error({ operation: 'queue_error', queue: 'prediction', error: error.message })
    })

    // Usando eventos do worker para lidar com falhas
    worker.on('failed', (job, error) => {
      logger.error({
        operation: 'job_failed',
        queue: 'prediction',
        jobId: job?.id,
        predictionId: job?.data.predictionId,
        error: error.message,
        attempt: job?.attemptsMade
      })
    })

    logger.info({ operation: 'queues_initialized', status: 'success' })
  } catch (error) {
    logger.error({
      operation: 'queues_initialization_failed',
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

// Função para adicionar job de predição à fila
export async function enqueuePrediction(predictionId: string) {
  try {
    const queue = getPredictionQueue();
    // Garantir que o worker está inicializado
    getPredictionWorker();

    const job = await queue.add('process', { predictionId }, {
      jobId: `prediction-${predictionId}`,
    })

    logger.info({
      operation: 'enqueue_prediction',
      predictionId,
      jobId: job.id
    })

    return job
  } catch (error) {
    logger.error({
      operation: 'enqueue_prediction_failed',
      predictionId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}
