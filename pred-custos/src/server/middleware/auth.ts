import { NextRequest } from 'next/server'
import { logger } from '@/server/utils/logger'
import { verifyAccessToken, UserRole } from '@/server/utils/jwt'
import { getAccessTokenFromCookies } from '@/server/utils/cookies'
import { prisma } from '@/server/db'

// Tipo para dados do usuário autenticado
export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

/**
 * Verifica o token JWT na request e retorna os dados do usuário, se autenticado
 * Verifica primeiro em cookies, depois em header Authorization
 * @param req Request do Next.js 
 * @returns Dados do usuário ou null se não autenticado
 */
export async function getUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    // 1. Tentar obter o token do cookie
    let token = await getAccessTokenFromCookies()

    // 2. Se não encontrou no cookie, tenta no header Authorization (Bearer token)
    if (!token) {
      const authHeader = req.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1]
      }
    }
    
    // Se não há token, usuário não está autenticado
    if (!token) {
      return null
    }

    // Verificar e decodificar o token
    const payload = await verifyAccessToken(token)
    
    // Verificar se usuário existe no banco
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true }
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole
    }
  } catch (error) {
    logger.debug({
      operation: 'auth_token_invalid',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return null
  }
}

/**
 * Middleware para verificar se o usuário está autenticado
 * @param req Request do Next.js
 * @param handler Função a ser executada se autenticado
 * @param options Opções adicionais (adminOnly)
 * @returns Função para execução posterior
 */
export function requireAuth(req: NextRequest, handler: (user: AuthUser) => any, options?: { adminOnly?: boolean }) {
  return async () => {
    const user = await getUser(req)
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    // Verificar se é necessário ser admin
    if (options?.adminOnly && user.role !== UserRole.ADMIN) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    return handler(user)
  }
}
