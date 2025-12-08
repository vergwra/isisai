import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/server/services/authService'
import { logger } from '@/server/utils/logger'
import { z } from 'zod'
import { UserRole } from '@/server/utils/jwt'

// Schema de validação para o corpo da requisição
const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  role: z.enum([UserRole.USER, UserRole.ADMIN]).optional()
})

/**
 * Rota de API para registro de novo usuário
 * @route POST /api/auth/register
 */
export async function POST(request: NextRequest) {
  try {
    // Parsing do corpo da requisição
    const body = await request.json()
    
    // Validação dos dados
    const validationResult = registerSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: validationResult.error.errors
      }, { status: 400 })
    }
    
    // Extração dos dados validados
    const { email, password, name, role = UserRole.USER } = validationResult.data
    
    // Tentativa de registro
    const user = await authService.register(email, password, name, role)
    
    // Resposta de sucesso
    return NextResponse.json({
      message: 'Usuário registrado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 201 })
    
  } catch (error) {
    logger.error({ 
      msg: 'Erro ao processar registro', 
      error: error instanceof Error ? error.message : String(error) 
    })
    
    // Verificar se é erro de email duplicado
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({
        error: 'Email já cadastrado'
      }, { status: 409 })
    }
    
    // Resposta genérica de erro
    return NextResponse.json({
      error: 'Falha ao registrar usuário'
    }, { status: 500 })
  }
}
