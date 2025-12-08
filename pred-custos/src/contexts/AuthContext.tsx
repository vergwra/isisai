"use client"
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AuthContextType, AuthUser, LoginRequest, RegisterRequest } from '@/types/auth'
import { useRouter } from 'next/navigation'
import { toast } from "sonner"

// Contexto de autenticação
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  
  // Restaurar o estado do usuário do localStorage (se disponível) ao carregar
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user')
    
    console.log('[AuthContext] Inicializando, storedUser:', !!storedUser)
    
    // Função para verificar se o cookie de autenticação existe
    const checkAuthCookie = async () => {
      try {
        // Ao invés de fazer um fetch /api/auth/me, vamos tentar fazer uma requisição simples 
        // para uma API protegida como /api/predictions. Se retornar 401, não estamos autenticados.
        const testResponse = await fetch('/api/predictions', { 
          method: 'GET',
          credentials: 'include'
        })
        
        console.log('[AuthContext] Teste de cookie auth:', testResponse.status)
        
        if (testResponse.status === 401) {
          // Se não estiver autenticado via cookie, limpar localStorage
          console.log('[AuthContext] Não autenticado via cookie, limpando localStorage')
          localStorage.removeItem('auth_user')
          setUser(null)
          setIsLoading(false)
          return
        }
        
        // Se temos cookie válido mas não temos user no localStorage, tente obter dados do usuário
        if (!storedUser && testResponse.ok) {
          const userData = await testResponse.json()
          // Aqui podemos extrair alguma informação do usuário da resposta se disponível
          console.log('[AuthContext] Autenticado via cookie, mas sem dados no localStorage')
          // Neste caso, podemos redirecionar para login para forçar um novo login
          window.location.href = '/login'
          return
        }
      } catch (error) {
        console.error('[AuthContext] Erro ao verificar autenticação:', error)
      }
      
      // Se temos dados no localStorage, usar eles
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          console.log('[AuthContext] Usando dados do localStorage:', parsedUser)
          setUser(parsedUser)
        } catch (error) {
          // Se houver erro no parsing, limpa o localStorage
          console.error('[AuthContext] Erro ao parsear dados do localStorage:', error)
          localStorage.removeItem('auth_user')
          setUser(null)
        }
      }
      
      setIsLoading(false)
    }
    
    checkAuthCookie()
  }, [])
  
  // Função de login
  const login = async (data: LoginRequest) => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log('[AuthContext] Iniciando login...')
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Importante: isso garante que os cookies serão armazenados
        body: JSON.stringify(data)
      })
      
      console.log('[AuthContext] Resposta do login:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao realizar login')
      }
      
      const result = await response.json()
      console.log('[AuthContext] Dados do usuário:', result.user)
      
      // Definir usuário diretamente da resposta de login
      setUser(result.user)
      
      // Salvar no localStorage para persistência
      localStorage.setItem('auth_user', JSON.stringify(result.user))
      
      // Verificar se os cookies foram definidos corretamente
      console.log('[AuthContext] Verificando cookies após login...')
      setTimeout(async () => {
        const testResponse = await fetch('/api/predictions', { 
          method: 'GET',
          credentials: 'include'
        }).catch(e => {
          console.error('[AuthContext] Erro ao testar cookie após login:', e)
          return { ok: false, status: 0 }
        })
        
        console.log('[AuthContext] Teste de cookie após login:', testResponse.status)
        
        if (testResponse.status === 401) {
          console.warn('[AuthContext] Aviso: Token não foi definido corretamente!')
          // Ainda assim, tentamos continuar com o login usando localStorage
        } else if (testResponse.ok) {
          console.log('[AuthContext] Token definido corretamente!')
        }
        
        // Feedback de sucesso e redirecionamento
        toast.success('Login realizado com sucesso!')
        console.log('[AuthContext] Redirecionando para o dashboard...')
        
        // Redirecionamento forçado para garantir que os cookies sejam enviados
        window.location.href = '/dashboard'
      }, 300) // Pequeno delay para garantir que os cookies foram armazenados
      
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      console.error('[AuthContext] Erro no login:', error)
      toast.error('Falha ao realizar login')
      setIsLoading(false)
    }
  }
  
  // Função de registro
  const register = async (data: RegisterRequest) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao registrar usuário')
      }
      
      const result = await response.json()
      
      // Redirecionar para login após registro bem-sucedido
      router.push('/login?registered=true')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro desconhecido')
      console.error('Erro no registro:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Função de logout
  const logout = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Importante para enviar cookies
      })
      
      // Mesmo em caso de erro, limpar dados do usuário
      setUser(null)
      
      // Remover do localStorage
      localStorage.removeItem('auth_user')
      
      // Feedback de sucesso
      toast.success('Logout realizado com sucesso!')
      
      // Redirecionar para login
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Calculamos o estado de autenticação baseado no usuário
  const isAuthenticated = !!user
  
  // Valor do contexto
  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    error
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personalizado para acessar o contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
