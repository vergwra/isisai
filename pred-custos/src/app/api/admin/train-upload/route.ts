import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/server/middleware/auth"
import { logger } from "@/server/utils/logger"
import * as XLSX from 'xlsx'

/**
 * Endpoint para upload de arquivo e treinamento de modelo (apenas admin)
 * Aceita CSV, XLS e XLSX
 */
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
    
    // Parse do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File
    const modelType = formData.get('model_type') as string || 'random_forest'
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }
    
    // Validar tipo de arquivo
    const validExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    
    if (!validExtensions.includes(fileExtension)) {
      return NextResponse.json(
        { error: "Invalid file format. Use CSV, XLS or XLSX" },
        { status: 400 }
      )
    }
    
    // Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let csvData: string
    
    // Se for Excel, converter para CSV
    if (fileExtension === '.xls' || fileExtension === '.xlsx') {
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        csvData = XLSX.utils.sheet_to_csv(worksheet)
      } catch (error) {
        logger.error({
          operation: 'excel_to_csv_conversion',
          error: error instanceof Error ? error.message : String(error)
        })
        return NextResponse.json(
          { error: "Failed to convert Excel file to CSV" },
          { status: 400 }
        )
      }
    } else {
      // Se já for CSV, usar diretamente
      csvData = buffer.toString('utf-8')
    }
    
    // Criar FormData para enviar ao backend ML
    const mlFormData = new FormData()
    const csvBlob = new Blob([csvData], { type: 'text/csv' })
    mlFormData.append('file', csvBlob, 'training_data.csv')
    
    // Enviar para o backend ML
    const mlBackendUrl = process.env.ML_BACKEND_URL || 'http://localhost:8000'
    
    logger.info({
      operation: 'ml_backend_train_request',
      url: `${mlBackendUrl}/api/v1/train?model_type=${modelType}`,
      modelType,
      fileName: file.name
    })
    
    let mlResponse: Response
    
    try {
      // Timeout de 5 minutos para treinamento
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)
      
      mlResponse = await fetch(`${mlBackendUrl}/api/v1/train?model_type=${modelType}`, {
        method: 'POST',
        body: mlFormData,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
    } catch (fetchError) {
      logger.error({
        operation: 'ml_backend_train_fetch_error',
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        mlBackendUrl
      })
      
      // Verificar se foi timeout
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: "Training timeout - processo demorou mais de 5 minutos" },
          { status: 504 }
        )
      }
      
      // Erro de conexão
      return NextResponse.json(
        { 
          error: `Não foi possível conectar ao backend ML em ${mlBackendUrl}. Verifique se o servidor está rodando.`,
          details: fetchError instanceof Error ? fetchError.message : String(fetchError)
        },
        { status: 503 }
      )
    }
    
    if (!mlResponse.ok) {
      let errorData: any
      try {
        errorData = await mlResponse.json()
      } catch {
        errorData = { detail: await mlResponse.text() }
      }
      
      logger.error({
        operation: 'ml_backend_train',
        status: mlResponse.status,
        error: errorData
      })
      return NextResponse.json(
        { error: errorData.detail || "Failed to train model" },
        { status: mlResponse.status }
      )
    }
    
    const result = await mlResponse.json()
    
    logger.info({
      operation: 'admin_train_model_upload',
      userId: user.id,
      modelType,
      fileName: file.name
    })
    
    return NextResponse.json(result, { status: 200 })
    
  } catch (error) {
    logger.error({
      operation: 'admin_train_model_upload_error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
