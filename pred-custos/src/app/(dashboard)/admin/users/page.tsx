'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Role } from '@prisma/client'

interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export default function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null)
  const router = useRouter()
  
  // Verificar se o usuário é admin
  useEffect(() => {
    if (user && user.role !== Role.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, router])
  
  // Carregar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/users')
        
        if (!response.ok) {
          throw new Error('Falha ao buscar usuários')
        }
        
        const data = await response.json()
        setUsers(data.users)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar usuários')
        console.error('Erro ao buscar usuários:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUsers()
  }, [])
  
  // Alternar papel do usuário (entre USER e ADMIN)
  const handleToggleRole = async (userId: string, currentRole: Role) => {
    try {
      const newRole = currentRole === Role.USER ? Role.ADMIN : Role.USER
      
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar o papel do usuário')
      }
      
      // Atualizar a lista de usuários
      setUsers(users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ))
      
      // Mostrar feedback de sucesso
      setActionFeedback({
        message: `Usuário atualizado com sucesso para ${newRole === Role.ADMIN ? 'Administrador' : 'Usuário'}`,
        type: 'success'
      })
      
      // Limpar feedback após 3 segundos
      setTimeout(() => setActionFeedback(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar usuário')
      console.error('Erro ao atualizar usuário:', err)
      
      // Mostrar feedback de erro
      setActionFeedback({
        message: 'Falha ao atualizar o papel do usuário',
        type: 'error'
      })
      
      // Limpar feedback após 3 segundos
      setTimeout(() => setActionFeedback(null), 3000)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
      
      {actionFeedback && (
        <div className={`p-4 rounded-md ${actionFeedback.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={actionFeedback.type === 'success' ? 'text-green-700' : 'text-red-700'}>
            {actionFeedback.message}
          </p>
        </div>
      )}
      
      {error && !actionFeedback && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Lista de Usuários</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Papel
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          u.role === Role.ADMIN 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role === Role.ADMIN ? 'Administrador' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {/* Não permitir alterar o próprio usuário */}
                        {user?.id !== u.id ? (
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            {u.role === Role.USER ? 'Promover a Admin' : 'Rebaixar para Usuário'}
                          </button>
                        ) : (
                          <span className="text-gray-400">Usuário atual</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Informações sobre Papéis de Usuário</h2>
        
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            <strong>Usuários</strong> podem criar e visualizar suas próprias previsões de custo.
          </p>
          
          <p>
            <strong>Administradores</strong> podem gerenciar usuários, treinar novos modelos de ML
            e acessar todas as funcionalidades do sistema.
          </p>
          
          <p className="text-amber-600">
            Nota: Tenha cuidado ao promover usuários para Administrador, pois isso concede
            acesso completo ao sistema, incluindo a capacidade de modificar outros usuários.
          </p>
        </div>
      </div>
    </div>
  )
}
