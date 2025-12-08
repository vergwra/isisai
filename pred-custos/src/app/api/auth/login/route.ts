import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/server/services/authService'
import { setAuthCookies } from '@/server/utils/cookies'
import { logger } from '@/server/utils/logger'
import { z } from 'zod'

// Schema de validação para o corpo da requisição
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

/**
 * Rota de API para login de usuário
 * @route POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    // Parsing do corpo da requisição
    const body = await request.json()
    
    // Validação dos dados
    const validationResult = loginSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Dados inválidos',
        details: validationResult.error.errors
      }, { status: 400 })
    }
    
    // Extração dos dados validados
    const { email, password } = validationResult.data
    
    // Tentativa de login
    const { tokens, user } = await authService.login(email, password)
    
    // Criação da resposta
    const response = NextResponse.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 200 })
    
    // Define os cookies de autenticação
    setAuthCookies(response, tokens)
    
    return response
    
  } catch (error) {
    logger.error({ 
      msg: 'Erro ao processar login', 
      error: error instanceof Error ? error.message : String(error) 
    })
    
    // Resposta genérica de erro de autenticação (por segurança)
    return NextResponse.json({
      error: 'Credenciais inválidas'
    }, { status: 401 })
  }
}
