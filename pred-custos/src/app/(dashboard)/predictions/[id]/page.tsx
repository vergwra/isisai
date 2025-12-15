'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface PredictionDetail {
  id: string
  createdAt: string
  updatedAt: string
  status: string
  volumeTon: number
  currency: string
  input: {
    route: {
      origin: string
      destination: string
    }
    fxRates: Record<string, number>
    leadTimeDays?: number
    fuelIndex?: number
    taxMultiplier?: number
  }
  output: {
    costTotal: number
    euroPerKg: number
    modelUsed?: string
    modelVersion?: string
    breakdown?: any
  } | null
  error: string | null
}

export default function PredictionDetailPage() {
  const params = useParams()
  const id = params?.id as string

  const [prediction, setPrediction] = useState<PredictionDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Buscar detalhes da previsão
  useEffect(() => {
    if (!id) return

    const fetchPrediction = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/predictions/${id}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Previsão não encontrada')
          }
          throw new Error('Falha ao buscar detalhes da previsão')
        }

        const data = await response.json()
        setPrediction(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar previsão')
        console.error('Erro ao buscar previsão:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPrediction()
  }, [id])

  // Status da previsão formatado
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { text: string, color: string, bgColor: string }> = {
      PENDING: {
        text: 'Pendente',
        color: 'text-yellow-800',
        bgColor: 'bg-yellow-100'
      },
      PROCESSING: {
        text: 'Processando',
        color: 'text-blue-800',
        bgColor: 'bg-blue-100'
      },
      COMPLETED: {
        text: 'Concluído',
        color: 'text-green-800',
        bgColor: 'bg-green-100'
      },
      ERROR: {
        text: 'Erro',
        color: 'text-red-800',
        bgColor: 'bg-red-100'
      }
    }

    return statusMap[status] || { text: status, color: 'text-gray-800', bgColor: 'bg-gray-100' }
  }

  // Formatar tipo de transporte
  const formatTransportType = (type: string) => {
    const typeMap: Record<string, string> = {
      rodoviario: 'Rodoviário',
      maritimo: 'Marítimo',
      aereo: 'Aéreo'
    }

    return typeMap[type] || type
  }

  // Enquanto carrega
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Se ocorreu um erro
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Voltar para Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Se a previsão não foi encontrada
  if (!prediction) {
    return (
      <div className="bg-white shadow rounded-lg p-6 text-center">
        <h2 className="text-xl font-medium mb-4">Previsão não encontrada</h2>
        <p className="text-gray-600 mb-6">A previsão solicitada não existe ou você não tem permissão para acessá-la.</p>
        <Link
          href="/dashboard"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Voltar para Dashboard
        </Link>
      </div>
    )
  }

  // Informações de status
  const status = getStatusInfo(prediction.status)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Detalhes da Previsão</h1>
        <Link
          href="/dashboard"
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para Dashboard
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-medium">Previsão #{prediction.id.substring(0, 8)}</h2>
              <p className="text-sm text-gray-500">
                Criada em {new Date(prediction.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full ${status.bgColor}`}>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">DADOS DE ENTRADA</h3>
              <div className="bg-gray-50 p-4 rounded-md space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Volume</p>
                  <p className="font-medium">{prediction.volumeTon} ton</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Origem</p>
                  <p className="font-medium">{prediction.input.route.origin}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Destino</p>
                  <p className="font-medium">{prediction.input.route.destination}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">RESULTADO</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                {prediction.status === 'COMPLETED' && prediction.output ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">Custo de Transporte</p>
                    <p className="text-3xl font-bold text-green-600">
                      {prediction.currency === 'EUR' ? '€' : (prediction.currency === 'USD' ? '$' : 'R$')}
                      {Number(prediction.output.euroPerKg).toFixed(2)}/kg
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Custo total: {prediction.currency === 'EUR' ? '€' : (prediction.currency === 'USD' ? '$' : 'R$')}
                      {Number(prediction.output.costTotal).toFixed(2)}
                    </p>
                  </div>
                ) : prediction.status === 'ERROR' ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-red-500">Ocorreu um erro ao processar a previsão</p>
                    {prediction.error && (
                      <p className="text-xs mt-2 bg-red-50 p-2 rounded">{prediction.error}</p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      {prediction.status === 'PROCESSING'
                        ? 'Processando previsão...'
                        : 'Aguardando processamento'
                      }
                    </p>
                    <div className="mt-2 flex justify-center">
                      <div className="animate-pulse w-16 h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detalhes Técnicos e Breakdown */}
        {prediction.status === 'COMPLETED' && prediction.output && (
          <div className="border-t border-gray-100 px-6 py-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">DETALHES TÉCNICOS</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Informações do Modelo */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Modelo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Algoritmo:</span>
                    <span className="text-sm font-medium">{prediction.output.modelUsed || prediction.output.breakdown?.model_used || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Versão:</span>
                    <span className="text-sm font-medium">{prediction.output.modelVersion || prediction.output.breakdown?.version || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lead Time:</span>
                    <span className="text-sm font-medium">{prediction.output.breakdown?.lead_time_days || prediction.input.leadTimeDays || 'N/A'} dias</span>
                  </div>
                </div>
              </div>

              {/* Taxas e Índices */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fatores de Custo</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Índice Combustível:</span>
                    <span className="text-sm font-medium">{prediction.output.breakdown?.fuel_index || prediction.input.fuelIndex || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Multiplicador Taxas:</span>
                    <span className="text-sm font-medium">
                      {prediction.output.breakdown?.tax_multiplier
                        ? `${((prediction.output.breakdown.tax_multiplier - 1) * 100).toFixed(0)}%`
                        : (prediction.input.taxMultiplier ? `${((prediction.input.taxMultiplier - 1) * 100).toFixed(0)}%` : 'N/A')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Câmbio */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Câmbio Utilizado</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Moeda Saída:</span>
                    <span className="text-sm font-medium">{prediction.currency}</span>
                  </div>
                  {prediction.output.breakdown?.fx_used && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">BRL/EUR:</span>
                        <span className="text-sm font-medium">{Number(prediction.output.breakdown.fx_used.BRL_EUR).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">BRL/USD:</span>
                        <span className="text-sm font-medium">{Number(prediction.output.breakdown.fx_used.BRL_USD).toFixed(4)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {prediction.status === 'PENDING' && (
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
          <button
            onClick={() => router.refresh()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Atualizar Status
          </button>
        </div>
      )}
    </div>

  )
}
