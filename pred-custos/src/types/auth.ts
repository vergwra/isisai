import { Role } from "@prisma/client"

/**
 * Tipo de usuário autenticado
 */
export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
}

/**
 * Resposta da API de login
 */
export interface LoginResponse {
  message: string
  user: AuthUser
}

/**
 * Request de login
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Request de registro
 */
export interface RegisterRequest {
  email: string
  password: string
  name: string
}

/**
 * Resposta da API de registro
 */
export interface RegisterResponse {
  message: string
  user: AuthUser
}

/**
 * Contexto de autenticação compartilhado na aplicação
 */
export interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  error: string | null
}
