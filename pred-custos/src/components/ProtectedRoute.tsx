'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingSpinner } from './ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

/**
 * Componente para proteger rotas que exigem autenticação
 * Redireciona para a página de login se o usuário não estiver autenticado
 * Opcionalmente verifica se o usuário é admin
 */
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    // Só redireciona depois que terminar de carregar
    if (!isLoading) {
      // Se não estiver autenticado, redireciona para o login
      if (!isAuthenticated) {
        router.replace('/login')
      } 
      // Se precisar ser admin e não for, redireciona para dashboard
      else if (requireAdmin && user?.role !== 'ADMIN') {
        router.replace('/dashboard')
      }
    }
  }, [isLoading, isAuthenticated, requireAdmin, user, router])
  
  // Enquanto carrega, mostra spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  // Se não estiver autenticado ou precisar ser admin e não for, não renderiza nada
  if (!isAuthenticated || (requireAdmin && user?.role !== 'ADMIN')) {
    return null
  }
  
  // Se passou por todas as verificações, renderiza o conteúdo
  return <>{children}</>
}
