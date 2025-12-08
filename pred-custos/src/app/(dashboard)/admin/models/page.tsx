'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Role } from '@prisma/client'

interface Model {
  id: string
  name: string
  version: string
  accuracy: number
  status: string
  createdAt: string
}

export default function AdminModelsPage() {
  const { user } = useAuth()
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingSuccess, setTrainingSuccess] = useState(false)
  const router = useRouter()
  
  // Verificar se o usuário é admin
  useEffect(() => {
    if (user && user.role !== Role.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, router])
  
  // Carregar modelos
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/models')
        
        if (!response.ok) {
          throw new Error('Falha ao buscar modelos')
        }
        
        const data = await response.json()
        setModels(data.models)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar modelos')
        console.error('Erro ao buscar modelos:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchModels()
  }, [trainingSuccess])
  
  // Iniciar treinamento de um novo modelo
  const handleTrainModel = async () => {
    try {
      setIsTraining(true)
      setTrainingSuccess(false)
      
      const response = await fetch('/api/models/train', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao iniciar treinamento')
      }
      
      setTrainingSuccess(true)
      setTimeout(() => setTrainingSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar treinamento')
      console.error('Erro ao iniciar treinamento:', err)
    } finally {
      setIsTraining(false)
    }
  }
  
  // Formatar status
  const formatStatus = (status: string) => {
    const statusMap: Record<string, { text: string, color: string }> = {
      active: { text: 'Ativo', color: 'bg-green-100 text-green-800' },
      training: { text: 'Treinando', color: 'bg-blue-100 text-blue-800' },
      failed: { text: 'Falhou', color: 'bg-red-100 text-red-800' },
      inactive: { text: 'Inativo', color: 'bg-gray-100 text-gray-800' }
    }
    
    return statusMap[status.toLowerCase()] || { text: status, color: 'bg-gray-100 text-gray-800' }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Modelos de ML</h1>
        <button
          onClick={handleTrainModel}
          disabled={isTraining}
          className={`px-4 py-2 rounded-md text-sm font-medium ${
            isTraining 
              ? 'bg-blue-300 text-white cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isTraining ? 'Iniciando treinamento...' : 'Treinar novo modelo'}
        </button>
      </div>
      
      {trainingSuccess && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700">Treinamento iniciado com sucesso! O novo modelo aparecerá na lista quando estiver pronto.</p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-medium mb-4">Modelos Disponíveis</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum modelo disponível.</p>
              <p className="text-sm text-gray-500 mt-2">Clique em "Treinar novo modelo" para criar o primeiro modelo.</p>
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
                      Versão
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acurácia
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data de Criação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {models.map((model) => {
                    const status = formatStatus(model.status)
                    
                    return (
                      <tr key={model.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{model.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{model.version}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{(model.accuracy * 100).toFixed(2)}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(model.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Informações sobre os Modelos</h2>
        
        <div className="space-y-4 text-sm text-gray-600">
          <p>
            Os modelos de machine learning são usados para prever os custos de transporte com base no peso,
            distância e tipo de transporte.
          </p>
          
          <p>
            O treinamento de um novo modelo pode levar alguns minutos. Uma vez completo,
            o modelo se tornará automaticamente o modelo ativo para novas previsões.
          </p>
          
          <p>
            A acurácia dos modelos é calculada usando validação cruzada nos dados históricos
            de custos de transporte.
          </p>
        </div>
      </div>
    </div>
  )
}
