'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { Role } from '@prisma/client'

/**
 * Layout compartilhado para páginas do dashboard e outras áreas protegidas
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AuthProvider>
  )
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth()
  const router = useRouter()

  // Redirecionar para login se não estiver autenticado e não estiver carregando
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Só renderiza o layout se estiver autenticado
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen -m-8 bg-gray-100">
      {/* Header/Navbar */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              Pred-Custos
            </Link>
          </div>

          <nav className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>

            <Link href="/predictions/new" className="text-gray-700 hover:text-blue-600">
              Nova Previsão
            </Link>

            {user?.role === Role.ADMIN && (
              <>
                <Link href="/admin/models" className="text-gray-700 hover:text-blue-600">
                  Modelos
                </Link>
                <Link href="/admin/users" className="text-gray-700 hover:text-blue-600">
                  Usuários
                </Link>
              </>
            )}

            <div className="border-l border-gray-300 h-6 mx-2"></div>

            <div className="relative group">
              <button className="flex items-center text-gray-700 hover:text-blue-600">
                <span className="mr-1">{user?.name.split(' ')[0]}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <div className="px-4 py-2 text-sm text-gray-500">
                  <div>{user?.name}</div>
                  <div className="text-xs">{user?.email}</div>
                </div>
                <div className="border-t border-gray-100"></div>
                <button
                  onClick={() => logout()}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                >
                  Sair
                </button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            © {new Date().getFullYear()} Pred-Custos - Sistema de Previsão de Custos
          </p>
        </div>
      </footer>
    </div>
  )
}
