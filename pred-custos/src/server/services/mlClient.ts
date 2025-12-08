import { logger } from '@/server/utils/logger'

const ML_API_URL = process.env.ML_API_URL || 'http://ml:8000'
const ML_API_KEY = process.env.ML_API_KEY || 'changeme_ml_key'
const DEFAULT_TIMEOUT = 25000 // 25 segundos

/**
 * Cliente para integração com o serviço ML
 */
export class MLClient {
  private async fetchWithTimeout(url: string, options: RequestInit, timeoutMs = DEFAULT_TIMEOUT) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ML_API_KEY}`,
          ...(options.headers || {})
        }
      })
      
      if (!response.ok) {
        throw new Error(`ML API error: ${response.status} ${response.statusText}`)
      }
      
      return response
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`)
      }
      throw error
    } finally {
      clearTimeout(id)
    }
  }
  
  /**
   * Envia uma solicitação de previsão para o serviço ML
   */
  async predict(input: PredictInput): Promise<PredictOutput> {
    try {
      const startTime = Date.now()
      logger.info({ operation: 'ml_predict_start', input: { prediction_id: input.meta?.prediction_id } })
      
      const res = await this.fetchWithTimeout(`${ML_API_URL}/api/v1/predict`, {
        method: 'POST',
        body: JSON.stringify(input)
      })
      
      const data = await res.json()
      const latencyMs = Date.now() - startTime
      
      logger.info({
        operation: 'ml_predict_success',
        latency_ms: latencyMs,
        prediction_id: input.meta?.prediction_id
      })
      
      return data
    } catch (error) {
      logger.error({
        operation: 'ml_predict_error',
        error: error instanceof Error ? error.message : String(error),
        prediction_id: input.meta?.prediction_id
      })
      throw error
    }
  }
  
  /**
   * Envia uma solicitação de treinamento para o serviço ML
   */
  async train(payload: TrainInput): Promise<TrainOutput> {
    try {
      const startTime = Date.now()
      logger.info({
        operation: 'ml_train_start',
        input: { requested_by: payload.meta?.requested_by }
      })
      
      const res = await this.fetchWithTimeout(`${ML_API_URL}/api/v1/train`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      const latencyMs = Date.now() - startTime
      
      logger.info({
        operation: 'ml_train_success',
        latency_ms: latencyMs,
        job_id: data.job_id
      })
      
      return data
    } catch (error) {
      logger.error({
        operation: 'ml_train_error',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
  
  /**
   * Lista os modelos disponíveis no serviço ML
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const res = await this.fetchWithTimeout(`${ML_API_URL}/api/v1/models`, {
        method: 'GET'
      })
      
      return res.json()
    } catch (error) {
      logger.error({
        operation: 'ml_list_models_error',
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
}

export type PredictInput = {
  currency: string
  volume_ton: number
  lead_time_days?: number
  fuel_index?: number
  tax_multiplier?: number
  route: {
    origin: string
    destination: string
  }
  fx_used: Record<string, number>
  meta?: {
    prediction_id: string
    callback_url?: string
  }
}

export type PredictOutput = {
  cost_total: number
  currency: string
  breakdown: {
    model_used: string
    version: string
    tax_multiplier: number
    fuel_index: number
    lead_time_days: number
    fx_used: Record<string, number>
    artifact_path: string
  }
}

export type TrainInput = {
  dataset_url: string
  hyperparams?: Record<string, any>
  meta?: {
    requested_by: string
  }
}

export type TrainOutput = {
  job_id: string
  status: string
}

export type ModelInfo = {
  name: string
  version: string
  created_at: string
}

// Singleton instance
export const mlClient = new MLClient()
