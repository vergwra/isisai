import { PrismaClient, User, Role } from '@prisma/client'
import { compare, hash } from 'bcryptjs'
import { 
  signAccessToken, 
  signRefreshToken, 
  getRefreshTokenExpiration,
  UserRole,
  JWTAccessPayload
} from '@/server/utils/jwt'
import { logger } from '@/server/utils/logger'
import { randomUUID } from 'crypto'
import { AuthTokens } from '@/server/utils/cookies'

// Singleton do Prisma
import { prisma } from '@/server/db'

export class AuthService {
  private prisma: PrismaClient

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || prisma
  }

  /**
   * Registra um novo usuário
   * @param email Email do usuário
   * @param password Senha do usuário (será hasheada)
   * @param name Nome do usuário
   * @param role Role opcional (default é USER)
   * @returns Usuário criado (sem senha)
   */
  async register(email: string, password: string, name: string, role: UserRole = UserRole.USER): Promise<Omit<User, 'passwordHash'>> {
    try {
      // Hash da senha (10 rounds)
      const hashedPassword = await hash(password, 10)
      
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hashedPassword, // Nome do campo correto no schema
          role
        }
      })
      
      // Remover senha antes de retornar
      const { passwordHash: _, ...userWithoutPassword } = user
      return userWithoutPassword
    } catch (error) {
      logger.error({ msg: 'Erro ao registrar usuário', error })
      throw new Error('Falha ao registrar usuário')
    }
  }

  /**
   * Faz login e gera tokens de acesso e refresh
   * @param email Email do usuário
   * @param password Senha em texto plano
   * @returns Tokens de acesso e refresh + dados do usuário
   */
  async login(email: string, password: string): Promise<{
    tokens: AuthTokens
    user: Omit<User, 'passwordHash'>
  }> {
    try {
      // Buscar usuário pelo email com seleção explícita dos campos
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          passwordHash: true,
          createdAt: true,
          updatedAt: true,
        }
      })
      
      if (!user) {
        throw new Error('Credenciais inválidas')
      }
      
      // Verificar senha
      const passwordValid = await compare(password, user.passwordHash)
      if (!passwordValid) {
        throw new Error('Credenciais inválidas')
      }
      
      // Criar tokens
      const tokens = await this.createTokens(user as User)
      
      // Remover senha antes de retornar
      const { passwordHash: _, ...userWithoutPassword } = user
      
      return { 
        tokens, 
        user: userWithoutPassword as Omit<User, 'passwordHash'>
      }
    } catch (error) {
      logger.error({ msg: 'Erro ao fazer login', error })
      throw new Error('Falha na autenticação')
    }
  }

  /**
   * Utiliza um refresh token para gerar novos tokens de acesso e refresh
   * @param refreshToken Token de refresh
   * @returns Novos tokens de acesso e refresh
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verificar se o token existe e é válido
      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      })
      
      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new Error('Token inválido ou expirado')
      }
      
      // Revogar o token atual
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() }
      })
      
      // Gerar novos tokens
      return this.createTokens(storedToken.user)
    } catch (error) {
      logger.error({ msg: 'Erro ao fazer refresh de token', error })
      throw new Error('Falha ao renovar tokens')
    }
  }

  /**
   * Revoga um refresh token
   * @param refreshToken Token de refresh a revogar
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: { 
          token: refreshToken,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      })
    } catch (error) {
      logger.error({ msg: 'Erro ao fazer logout', error })
      throw new Error('Falha ao fazer logout')
    }
  }

  /**
   * Cria novos tokens de acesso e refresh para um usuário
   * @param user Usuário para o qual criar tokens
   * @returns Tokens de acesso e refresh
   */
  private async createTokens(user: User): Promise<AuthTokens> {
    try {
      // Criar payload JWT
      const accessPayload: JWTAccessPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as unknown as UserRole // Conversão entre os enums
      }
      
      // Gerar ID para o refresh token
      const refreshTokenId = randomUUID()
      
      // Gerar token de acesso (agora assíncrono com jose)
      const accessToken = await signAccessToken(accessPayload)
      
      // Gerar token de refresh (agora assíncrono com jose)
      const refreshToken = await signRefreshToken(user.id, refreshTokenId)
      
      // Calcular data de expiração
      const expiresAt = getRefreshTokenExpiration()
      
      // Armazenar refresh token no banco
      await this.prisma.refreshToken.create({
        data: {
          id: refreshTokenId,
          token: refreshToken,
          userId: user.id,
          expiresAt
        }
      })
      
      // Retornar tokens
      return {
        access: accessToken,
        refresh: refreshToken,
        refreshExpiresAt: expiresAt
      }
    } catch (error) {
      logger.error({ msg: 'Erro ao criar tokens', error })
      throw new Error('Falha ao gerar tokens')
    }
  }
}

// Exportar instância singleton do serviço
export const authService = new AuthService()
