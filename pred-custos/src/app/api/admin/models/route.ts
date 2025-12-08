import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/server/middleware/auth"
import { mlClient } from "@/server/services/mlClient"
import { logger } from "@/server/utils/logger"

// Endpoint para listar modelos disponíveis (apenas admin)
export async function GET(request: NextRequest) {
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
    
    // Listar modelos disponíveis no serviço ML
    const models = await mlClient.listModels()
    
    logger.info({
      operation: 'admin_list_models',
      userId: user.id,
      modelsCount: models.length
    })
    
    return NextResponse.json({
      models: models.map(model => ({
        name: model.name,
        version: model.version,
        createdAt: model.created_at
      }))
    })
    
  } catch (error) {
    logger.error({
      operation: 'admin_list_models_error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
