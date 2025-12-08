'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface Prediction {
  id: string
  createdAt: string
  status: string
  volumeTon: number
  origin: string
  destination: string
  costTotal: number | null
  euroPerKg: number | null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar previsões do usuário ao carregar a página
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/predictions')

        if (!response.ok) {
          throw new Error('Falha ao buscar previsões')
        }

        const data = await response.json()
        setPredictions(data.predictions)
      } catch (err) {
        setError('Erro ao carregar previsões')
        console.error('Erro ao buscar previsões:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPredictions()
  }, [])

  // Formatar status para exibição
  const formatStatus = (status: string) => {
    const statusMap: Record<string, { text: string, color: string }> = {
      PENDING: { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      PROCESSING: { text: 'Processando', color: 'bg-blue-100 text-blue-800' },
      COMPLETED: { text: 'Concluído', color: 'bg-green-100 text-green-800' },
      ERROR: { text: 'Erro', color: 'bg-red-100 text-red-800' }
    }

    return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Link
          href="/predictions/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Nova Previsão
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Bem-vindo, {user?.name}!</h2>
        <p className="text-gray-600">
          Este é o sistema Pred-Custos, onde você pode criar previsões de custos de transporte baseadas em modelos de machine learning.
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Suas Previsões Recentes</h2>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Você ainda não criou nenhuma previsão.</p>
            <Link
              href="/predictions/new"
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Criar sua primeira previsão
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origem
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destino
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resultado (€/kg)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {predictions.map((prediction) => {
                  const status = formatStatus(prediction.status)

                  return (
                    <tr key={prediction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(prediction.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prediction.volumeTon} ton
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prediction.origin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prediction.destination}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {prediction.euroPerKg !== null ? `€${Number(prediction.euroPerKg).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/predictions/${prediction.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Detalhes
                        </Link>
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
  )
}
