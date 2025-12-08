import { prisma } from '../db'
import { Decimal } from '@prisma/client/runtime/library'
import { PredictionStatus } from '@prisma/client'

export type CreatePredictionInput = {
  userId: string
  currency: string
  volumeTon: number | string | Decimal
  leadTimeDays?: number
  fuelIndex?: number | string | Decimal
  taxMultiplier?: number | string | Decimal
  inputJson: Record<string, any>
}

export type CompletePredictionInput = {
  costTotal: number | string | Decimal
  euroPerKg: number | string | Decimal
  outputJson: Record<string, any>
  modelUsed?: string
  modelVersion?: string
  artifactPath?: string
}

export class PredictionService {
  async createPrediction(data: CreatePredictionInput) {
    // Validate volume_ton > 0
    if (Number(data.volumeTon) <= 0) {
      throw new Error('Volume must be greater than 0')
    }

    return await prisma.prediction.create({
      data: {
        userId: data.userId,
        status: PredictionStatus.PENDING,
        currency: data.currency,
        volumeTon: new Decimal(data.volumeTon),
        leadTimeDays: data.leadTimeDays,
        fuelIndex: data.fuelIndex ? new Decimal(data.fuelIndex) : null,
        taxMultiplier: data.taxMultiplier ? new Decimal(data.taxMultiplier) : null,
        inputJson: data.inputJson
      }
    })
  }

  async markProcessing(id: string) {
    return await prisma.prediction.update({
      where: { id },
      data: { 
        status: PredictionStatus.PROCESSING,
        updatedAt: new Date()
      }
    })
  }

  async markCompleted(id: string, data: CompletePredictionInput) {
    // Sanity check for euro_per_kg
    const euroPerKg = Number(data.euroPerKg)
    const isAbsurdValue = euroPerKg > 10_000
    
    if (Number(data.costTotal) <= 0) {
      return this.markError(id, 'Invalid cost total: must be greater than 0')
    }
    
    return await prisma.prediction.update({
      where: { id },
      data: {
        status: PredictionStatus.COMPLETED,
        costTotal: new Decimal(data.costTotal),
        euroPerKg: new Decimal(data.euroPerKg),
        outputJson: data.outputJson,
        modelUsed: data.modelUsed,
        modelVersion: data.modelVersion,
        artifactPath: data.artifactPath,
        // If the value is absurd, add a warning in errorMessage but keep status COMPLETED
        errorMessage: isAbsurdValue ? 'WARNING: Abnormally high €/kg value detected' : null,
        updatedAt: new Date()
      }
    })
  }

  async markError(id: string, errorMessage: string) {
    return await prisma.prediction.update({
      where: { id },
      data: {
        status: PredictionStatus.ERROR,
        errorMessage,
        updatedAt: new Date()
      }
    })
  }

  async getAllPredictions(options?: {
    userId?: string,
    status?: PredictionStatus,
    page?: number,
    limit?: number
  }) {
    const { userId, status, page = 1, limit = 10 } = options || {}
    
    const where = {
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {})
    }
    
    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.prediction.count({ where })
    ])
    
    return {
      predictions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getPredictionById(id: string) {
    return await prisma.prediction.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
  }
}
