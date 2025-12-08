import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/server/services/authService'
import { getRefreshTokenFromCookies, setAuthCookies } from '@/server/utils/cookies'
import { logger } from '@/server/utils/logger'

/**
 * Rota de API para renovar tokens de acesso usando um refresh token
 * @route POST /api/auth/refresh
 */
export async function POST(request: NextRequest) {
  try {
    // Obter o refresh token do cookie
    const refreshToken = await getRefreshTokenFromCookies()
    
    if (!refreshToken) {
      return NextResponse.json({
        error: 'Refresh token não encontrado'
      }, { status: 401 })
    }
    
    // Renovar tokens
    const newTokens = await authService.refresh(refreshToken)
    
    // Criar resposta
    const response = NextResponse.json({
      message: 'Tokens renovados com sucesso'
    }, { status: 200 })
    
    // Definir novos cookies
    setAuthCookies(response, newTokens)
    
    return response
    
  } catch (error) {
    logger.error({ 
      msg: 'Erro ao renovar tokens', 
      error: error instanceof Error ? error.message : String(error) 
    })
    
    // Resposta de erro
    return NextResponse.json({
      error: 'Falha ao renovar tokens'
    }, { status: 401 })
  }
}
