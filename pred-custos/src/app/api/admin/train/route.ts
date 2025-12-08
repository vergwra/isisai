import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/server/middleware/auth"
import { mlClient } from "@/server/services/mlClient"
import { logger } from "@/server/utils/logger"
import { z } from "zod"

// Schema de validação para payload de treinamento
const trainModelSchema = z.object({
  datasetUrl: z.string().url(),
  hyperparams: z.record(z.any()).optional(),
})

// Endpoint para iniciar treinamento de um novo modelo (apenas admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação e autorização (apenas admins)
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }
    
    // Parse e validação do payload
    const payload = await request.json()
    const validationResult = trainModelSchema.safeParse(payload)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: validationResult.error.format() },
        { status: 400 }
      )
    }
    
    const { datasetUrl, hyperparams } = validationResult.data
    
    // Iniciar treinamento no serviço ML
    const trainResult = await mlClient.train({
      dataset_url: datasetUrl,
      hyperparams,
      meta: {
        requested_by: user.email || user.id
      }
    })
    
    logger.info({
      operation: 'admin_train_model',
      userId: user.id,
      jobId: trainResult.job_id
    })
    
    return NextResponse.json({
      jobId: trainResult.job_id,
      status: trainResult.status,
      message: "Training job initiated successfully"
    }, { status: 202 }) // 202 Accepted para indicar processamento assíncrono
    
  } catch (error) {
    logger.error({
      operation: 'admin_train_model_error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
