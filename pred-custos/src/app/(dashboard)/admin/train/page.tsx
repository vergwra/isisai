'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Role } from '@prisma/client'
import { Upload, AlertCircle, CheckCircle, Loader2, FileText, Info, Download } from 'lucide-react'

interface TrainingResult {
  message: string
  model_type: string
  metrics: {
    mae?: number
    mse?: number
    rmse?: number
    r2?: number
  }
  timestamp: string
}

export default function TrainModelPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [modelType, setModelType] = useState('random_forest')
  const [isTraining, setIsTraining] = useState(false)
  const [result, setResult] = useState<TrainingResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  // Verificar se o usuário é admin
  useEffect(() => {
    if (user && user.role !== Role.ADMIN) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
        setError(null)
      }
    }
  }

  const validateFile = (file: File): boolean => {
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    const validExtensions = ['.csv', '.xls', '.xlsx']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setError('Formato de arquivo inválido. Use CSV, XLS ou XLSX.')
      return false
    }
    
    if (file.size > 50 * 1024 * 1024) { // 50MB
      setError('Arquivo muito grande. Tamanho máximo: 50MB')
      return false
    }
    
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
        setError(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      setError('Por favor, selecione um arquivo')
      return
    }

    setIsTraining(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('model_type', modelType)

      let response: Response
      
      try {
        response = await fetch('/api/admin/train-upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        })
      } catch (fetchError) {
        // Erro de rede/conexão
        throw new Error(
          'Falha na conexão com o servidor. Verifique se:\n' +
          '1. O servidor Next.js está rodando\n' +
          '2. O backend ML está rodando em http://localhost:8000\n' +
          '3. Sua conexão de internet está funcionando'
        )
      }

      if (!response.ok) {
        let errorMessage = 'Erro ao treinar modelo'
        
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.detail || errorMessage
          
          // Adicionar detalhes se disponível
          if (errorData.details) {
            errorMessage += `\n\nDetalhes: ${errorData.details}`
          }
          
          // Tratamento específico para erro 401
          if (response.status === 401) {
            errorMessage = 'Sessão expirada. Por favor, faça login novamente.'
            setTimeout(() => {
              window.location.href = '/login'
            }, 2000)
          }
          
          // Tratamento para erro 503 (backend ML offline)
          if (response.status === 503) {
            errorMessage = 'Backend ML não está disponível. Verifique se o servidor está rodando em http://localhost:8000'
          }
        } catch {
          // Se não conseguir parsear JSON, usar mensagem padrão
          errorMessage = `Erro ${response.status}: ${response.statusText}`
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setResult(data)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao treinar modelo')
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Treinar Modelo de ML</h1>
            <p className="mt-2 text-gray-600">
              Faça upload de um arquivo CSV ou Excel com dados históricos para treinar o modelo de previsão de custos.
            </p>
          </div>
          <a
            href="/template_treinamento.csv"
            download
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Template CSV
          </a>
        </div>
      </div>

      {/* Informações sobre o formato do arquivo */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-2">Formato do arquivo esperado:</p>
            <div className="space-y-2">
              <p><strong>Formatos aceitos:</strong> CSV, XLS, XLSX (máximo 50MB)</p>
              
              <p className="font-semibold mt-3">Colunas obrigatórias (nesta ordem):</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li><strong>origem_porto</strong> - Porto de origem (ex: "Paranaguá", "Santos")</li>
                <li><strong>destino_porto</strong> - Porto de destino (ex: "Rotterdam", "Hamburg")</li>
                <li><strong>modal</strong> - Tipo de transporte: "maritimo", "aereo" ou "rodoviario"</li>
                <li><strong>volume_ton</strong> - Volume em toneladas (número)</li>
                <li><strong>tipo_produto</strong> - Tipo de polpa (ex: "polpa de acerola", "polpa de manga")</li>
                <li><strong>tipo_embalagem</strong> - Tipo: "containerizado", "paletizado", "caixas" ou "bags"</li>
                <li><strong>container_tipo</strong> - Tipo: "dry", "reefer", "open_top" ou "flat_rack"</li>
                <li><strong>container_tamanho</strong> - Tamanho: "20ft" ou "40ft"</li>
                <li><strong>fuel_index</strong> - Índice de combustível (número, ex: 1.5)</li>
                <li><strong>taxes_pct</strong> - Percentual de impostos (número, ex: 15)</li>
                <li><strong>lead_time_days</strong> - Tempo de entrega em dias (número)</li>
                <li><strong>period_start</strong> - Data início no formato YYYY/MM/DD</li>
                <li><strong>period_end</strong> - Data fim no formato YYYY/MM/DD</li>
                <li><strong>fx_brl_eur</strong> - Taxa de câmbio BRL/EUR (número, ex: 5.5)</li>
                <li><strong>custo_total_logistico_brl</strong> - Custo total em BRL (valor alvo para treinar)</li>
              </ol>
              
              <p className="mt-3 text-xs italic">
                💡 Dica: A coluna "custo_total_logistico_brl" também pode ser chamada de "target_couts_eur" no arquivo.
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seleção do tipo de modelo */}
        <div className="bg-white shadow rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Modelo
          </label>
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isTraining}
          >
            <option value="linear_regression">Linear Regression</option>
            <option value="random_forest">Random Forest</option>
            <option value="gradient_boosting">Gradient Boosting</option>
            <option value="mlp">MLP (Neural Network)</option>
          </select>
        </div>

        {/* Upload de arquivo */}
        <div className="bg-white shadow rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arquivo de Treinamento
          </label>
          
          <div
            className={`mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                >
                  <span>Selecione um arquivo</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    disabled={isTraining}
                  />
                </label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-gray-500">
                CSV, XLS ou XLSX até 50MB
              </p>
            </div>
          </div>

          {file && (
            <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-md">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="ml-2 text-xs text-gray-500">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="text-sm text-red-600 hover:text-red-800"
                disabled={isTraining}
              >
                Remover
              </button>
            </div>
          )}
        </div>

        {/* Mensagens de erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-800">{error}</div>
            </div>
          </div>
        )}

        {/* Resultado do treinamento */}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800 mb-2">{result.message}</p>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Modelo:</strong> {result.model_type}</p>
                  {result.metrics && (
                    <div className="mt-2">
                      <p className="font-semibold">Métricas:</p>
                      <ul className="ml-4 mt-1 space-y-1">
                        {result.metrics.mae && <li>MAE: {result.metrics.mae.toFixed(4)}</li>}
                        {result.metrics.mse && <li>MSE: {result.metrics.mse.toFixed(4)}</li>}
                        {result.metrics.rmse && <li>RMSE: {result.metrics.rmse.toFixed(4)}</li>}
                        {result.metrics.r2 && <li>R²: {result.metrics.r2.toFixed(4)}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão de submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || isTraining}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isTraining ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
                Treinando...
              </>
            ) : (
              'Treinar Modelo'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
