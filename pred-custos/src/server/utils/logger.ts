import pino from 'pino'

// Configurações para diferentes ambientes
const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Métricas em memória para estatísticas básicas
interface Metrics {
  predictions: {
    total: number
    byStatus: Record<string, number>
    latencyMs: {
      sum: number
      count: number
      max: number
      min: number
    }
  }
}

export const metrics: Metrics = {
  predictions: {
    total: 0,
    byStatus: {
      PENDING: 0,
      PROCESSING: 0,
      COMPLETED: 0,
      ERROR: 0
    },
    latencyMs: {
      sum: 0,
      count: 0,
      max: 0,
      min: Number.MAX_SAFE_INTEGER
    }
  }
}

// Configurações do logger
const pinoConfig: pino.LoggerOptions = {
  level: isProduction ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Formatação mais amigável  // Em desenvolvimento, formato mais simples, sem pino-pretty para evitar erros de transporte
  transport: undefined,
  // Desabilitando temporariamente a formatação pretty para resolver problemas de compatibilidade
  // transport: isDevelopment ? {
  //   target: 'pino-pretty',
  //   options: {
  //     colorize: true,
  //     translateTime: 'SYS:standard',
  //     ignore: 'pid,hostname'
  //   }
  // } : undefined,
  
  // Desativar logs em testes a menos que esteja explicitamente habilitado
  enabled: !isTest || process.env.ENABLE_LOGS === 'true'
}

// Criação do logger
export const logger = pino(pinoConfig)

// Funções auxiliares para métricas
export function trackPredictionStatus(status: string) {
  metrics.predictions.total++
  metrics.predictions.byStatus[status] = (metrics.predictions.byStatus[status] || 0) + 1
}

export function trackPredictionLatency(latencyMs: number) {
  const latency = metrics.predictions.latencyMs
  
  latency.sum += latencyMs
  latency.count++
  latency.max = Math.max(latency.max, latencyMs)
  latency.min = Math.min(latency.min, latencyMs)
}

// Função para obter resumo de métricas
export function getMetrics() {
  const { predictions } = metrics
  
  return {
    predictions: {
      ...predictions,
      latencyMs: {
        ...predictions.latencyMs,
        avg: predictions.latencyMs.count > 0 
          ? predictions.latencyMs.sum / predictions.latencyMs.count 
          : 0
      }
    },
    uptime: process.uptime()
  }
}
