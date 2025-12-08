import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Constantes para nomes de cookies
const ACCESS_TOKEN_COOKIE = 'access_token'
const REFRESH_TOKEN_COOKIE = 'refresh_token'

// Opções padrão para cookies seguros
const defaultCookieOptions = {
  httpOnly: true, // Não acessível via JavaScript no cliente
  secure: process.env.NODE_ENV === 'production', // HTTPS apenas em produção
  sameSite: 'lax' as const, // Protege contra CSRF mas permite navegação normal
  path: '/' // Disponível em todo o site
}

/**
 * Interface para os tokens de autenticação
 */
export interface AuthTokens {
  access: string
  refresh: string
  refreshExpiresAt: Date
}

/**
 * Configura cookies de autenticação na resposta
 * @param response Resposta do Next.js
 * @param tokens Tokens de acesso e refresh
 * @returns Resposta com cookies definidos
 */
export function setAuthCookies(
  response: NextResponse,
  tokens: AuthTokens
): NextResponse {
  // Tempo de expiração para o cookie de acesso (15 minutos por padrão)
  const accessExpires = new Date()
  accessExpires.setMinutes(accessExpires.getMinutes() + 15) // Ajuste conforme JWT_EXPIRES_IN

  // Configurar cookie de acesso
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: tokens.access,
    expires: accessExpires,
    ...defaultCookieOptions
  })

  // Configurar cookie de refresh
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: tokens.refresh,
    expires: tokens.refreshExpiresAt,
    ...defaultCookieOptions
  })

  return response
}

/**
 * Limpa os cookies de autenticação
 * @param response Resposta do Next.js
 * @returns Resposta com cookies removidos
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: '',
    expires: new Date(0),
    ...defaultCookieOptions
  })

  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: '',
    expires: new Date(0),
    ...defaultCookieOptions
  })

  return response
}

/**
 * Obtém o token de acesso do cookie
 * @returns Token de acesso ou null se não existir
 */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value || null
}

/**
 * Obtém o token de refresh do cookie
 * @returns Token de refresh ou null se não existir
 */
export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(REFRESH_TOKEN_COOKIE)
  return cookie?.value || null
}
