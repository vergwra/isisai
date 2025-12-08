import { sign } from "jsonwebtoken"
import { jwtVerify } from "jose"

// DEV_SECRET constante para desenvolvimento - sempre o mesmo valor
const DEV_SECRET = 'cbcwkbdwosxadwpzwpdmwcbcwkbdwosxadwpzwpdmw' // 32 bytes para compatibilidade com jose

// Verificar env ou usar valor padrão para segurança
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h' // Aumentado para 1h para facilitar testes
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || '7')

// Log para debug
console.log(`[JWT] Inicializado com expiração: ${JWT_EXPIRES_IN}, ambiente: ${process.env.NODE_ENV || 'não definido'}`)

// Criar chave para uso com jose
const textEncoder = new TextEncoder()
const secretKey = textEncoder.encode(JWT_SECRET)

// Enumeração para roles no JWT (separada do Prisma para evitar dependências diretas)
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

// Payload do token JWT de acesso
export interface JWTAccessPayload {
  sub: string // userId conforme padrões JWT (subject)
  email: string
  role: UserRole
}

// Payload para refresh token
export interface JWTRefreshPayload {
  sub: string // userId conforme padrões JWT (subject)
  jti: string // ID único do token (JWT ID)
}

/**
 * Gera um token de acesso JWT
 * @param payload dados do usuário para o token
 * @returns string com o token assinado
 */
export function signAccessToken(payload: JWTAccessPayload): string {
  // A biblioteca jsonwebtoken aceita strings como '15m', '1h', mas a tipagem é mais específica
  const options = { expiresIn: JWT_EXPIRES_IN as any }
  console.log(`[JWT] Gerando token de acesso para ${payload.email}, role: ${payload.role}, expira em: ${JWT_EXPIRES_IN}`)
  return sign(payload, JWT_SECRET, options)
}

/**
 * Gera um token de refresh JWT
 * @param userId ID do usuário
 * @param tokenId ID único do token (usado para revogação)
 * @returns string com o token assinado
 */
export function signRefreshToken(userId: string, tokenId: string): string {
  // A biblioteca jsonwebtoken aceita strings como '7d', mas a tipagem é mais específica
  const options = { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` as any }
  return sign(
    { sub: userId, jti: tokenId },
    JWT_SECRET,
    options
  )
}

/**
 * Calcula a data de expiração para um refresh token
 * @returns Data de expiração
 */
export function getRefreshTokenExpiration(): Date {
  const date = new Date()
  date.setDate(date.getDate() + REFRESH_TOKEN_TTL_DAYS)
  return date
}

/**
 * Verifica e decodifica um token de acesso JWT
 * @param token Token JWT a ser verificado
 * @returns Payload do token se válido
 * @throws Error se o token for inválido
 */
export async function verifyAccessToken(token: string): Promise<JWTAccessPayload> {
  try {
    // Logging detalhado para debug
    console.log(`[JWT] Verificando token de acesso: ${token.substring(0, 10)}...`)
    console.log(`[JWT] Comprimento do token: ${token.length}`)
    
    // Usar jose para verificação compatível com Edge Runtime
    const { payload } = await jwtVerify(token, secretKey)
    
    // Validar se o payload tem a estrutura esperada
    if (!payload.sub || !payload.email || !payload.role) {
      throw new Error('Payload do token inválido')
    }
    
    const jwtPayload: JWTAccessPayload = {
      sub: payload.sub as string,
      email: payload.email as string,
      role: payload.role as UserRole
    }
    
    console.log(`[JWT] Token válido para usuário: ${jwtPayload.email}, role: ${jwtPayload.role}`)
    return jwtPayload
  } catch (error) {
    console.error(`[JWT] Erro ao verificar token:`, error instanceof Error ? error.message : String(error))
    throw new Error('Token de acesso inválido')
  }
}

/**
 * Verifica e decodifica um token de refresh JWT
 * @param token Token JWT a ser verificado
 * @returns Payload do token se válido
 * @throws Error se o token for inválido
 */
export function verifyRefreshToken(token: string): JWTRefreshPayload {
  try {
    return verify(token, JWT_SECRET) as JWTRefreshPayload
  } catch (error) {
    throw new Error('Token de refresh inválido')
  }
}

/**
 * Extrai um token JWT do cabeçalho Authorization
 * @param header Valor do cabeçalho Authorization
 * @returns Token JWT sem o prefixo 'Bearer '
 * @throws Error se não houver token no formato esperado
 */
export function extractTokenFromHeader(header: string | null): string {
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('Token Bearer não encontrado')
  }
  return header.split(' ')[1]
}
