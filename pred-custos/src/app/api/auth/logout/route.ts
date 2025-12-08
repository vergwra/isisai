import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/server/services/authService'
import { getRefreshTokenFromCookies, clearAuthCookies } from '@/server/utils/cookies'
import { logger } from '@/server/utils/logger'

/**
 * Rota de API para logout de usuário
 * @route POST /api/auth/logout
 */
export async function POST(request: NextRequest) {
  try {
    // Obter o refresh token do cookie
    const refreshToken = await getRefreshTokenFromCookies()
    
    // Se houver um refresh token, tenta revogá-lo
    if (refreshToken) {
      await authService.logout(refreshToken)
    }
    
    // Criar resposta
    const response = NextResponse.json({
      message: 'Logout realizado com sucesso'
    }, { status: 200 })
    
    // Limpar cookies de autenticação
    clearAuthCookies(response)
    
    return response
    
  } catch (error) {
    logger.error({ 
      msg: 'Erro ao processar logout', 
      error: error instanceof Error ? error.message : String(error) 
    })
    
    // Mesmo com erro, tentamos limpar os cookies
    const response = NextResponse.json({
      message: 'Logout realizado com sucesso',
      warning: 'Houve um erro ao revogar o token no servidor'
    }, { status: 200 })
    
    clearAuthCookies(response)
    
    return response
  }
}
