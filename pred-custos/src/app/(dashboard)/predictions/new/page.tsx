'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, type UseFormReturn, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ShadCN UI Components
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useToast } from '@/components/ui/use-toast'

// Prediction options
import {
  originPorts,
  destinationPorts,
  logisticModals,
  productTypes,
  packagingTypes,
  containerTypes,
  containerSizes,
  predictiveModels,
  outputCurrencies,
  sliderConfig,
  type PackagingType,
  type OriginPort,
  type DestinationPort,
  type LogisticModal,
  type ProductType,
  type ContainerType,
  type ContainerSize,
  type PredictiveModel,
  type OutputCurrency
} from '@/constants/predictionOptions'

// Schema de validação do formulário
const predictionFormSchema = z.object({
  // Campos existentes com algumas adaptações para novos tipos
  peso: z
    .number()
    .min(1, 'Peso deve ser maior que 0')
    .max(30000, 'Peso deve ser menor que 30.000 kg'),
  distancia: z
    .number()
    .min(1, 'Distância deve ser maior que 0')
    .max(20000, 'Distância deve ser menor que 20.000 km'),
  originPort: z.enum(originPorts, {
    required_error: 'Selecione o porto de origem',
  }),
  destinationPort: z.enum(destinationPorts, {
    required_error: 'Selecione o porto de destino',
  }),
  logisticModal: z.enum(logisticModals, {
    required_error: 'Selecione o modal logístico',
  }),
  productType: z.enum(productTypes, {
    required_error: 'Selecione o tipo de produto',
  }),
  packagingType: z.enum(packagingTypes, {
    required_error: 'Selecione o tipo de embalagem',
  }),
  containerType: z.enum(containerTypes, {
    required_error: 'Selecione o tipo de container',
  }).optional(),
  containerSize: z.enum(containerSizes, {
    required_error: 'Selecione o tamanho do container',
  }).optional(),
  predictiveModel: z.enum(predictiveModels, {
    required_error: 'Selecione o modelo preditivo',
  }),
  outputCurrency: z.enum(outputCurrencies, {
    required_error: 'Selecione a moeda de saída',
  }),
  fxBrlEur: z
    .number()
    .min(sliderConfig.fxBrlEur.min, `Câmbio deve ser no mínimo ${sliderConfig.fxBrlEur.min}`)
    .max(sliderConfig.fxBrlEur.max, `Câmbio deve ser no máximo ${sliderConfig.fxBrlEur.max}`)
    .default(sliderConfig.fxBrlEur.default),
  fuelIndex: z
    .number()
    .min(sliderConfig.fuelIndex.min, `Índice de combustível deve ser no mínimo ${sliderConfig.fuelIndex.min}`)
    .max(sliderConfig.fuelIndex.max, `Índice de combustível deve ser no máximo ${sliderConfig.fuelIndex.max}`)
    .default(sliderConfig.fuelIndex.default),
  taxesPct: z
    .number()
    .min(sliderConfig.taxesPct.min, `Taxa deve ser no mínimo ${sliderConfig.taxesPct.min}%`)
    .max(sliderConfig.taxesPct.max, `Taxa deve ser no máximo ${sliderConfig.taxesPct.max}%`)
    .default(sliderConfig.taxesPct.default),
  leadTimeDays: z
    .number()
    .min(sliderConfig.leadTimeDays.min, `Prazo deve ser no mínimo ${sliderConfig.leadTimeDays.min} dias`)
    .max(sliderConfig.leadTimeDays.max, `Prazo deve ser no máximo ${sliderConfig.leadTimeDays.max} dias`)
    .default(sliderConfig.leadTimeDays.default)
})

// Type-safe form data based on Zod schema
type PredictionFormData = z.infer<typeof predictionFormSchema>

// Type for the form with proper React Hook Form integration
type FormType = UseFormReturn<PredictionFormData, any, undefined>

export default function NewPredictionPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [packagingType, setPackagingType] = useState<PackagingType>(packagingTypes[0])
  const { toast } = useToast()

  // Initialize form with proper typing
  const form = useForm<PredictionFormData>({
    resolver: zodResolver(predictionFormSchema) as any, // Type assertion to resolve resolver incompatibility
    mode: 'onSubmit', // Add explicit validation mode
    defaultValues: {
      peso: 1000,
      distancia: 5000,
      originPort: originPorts[0],
      destinationPort: destinationPorts[0],
      logisticModal: logisticModals[0],
      productType: productTypes[0],
      packagingType: packagingTypes[0],
      containerType: containerTypes[0],
      containerSize: containerSizes[0],
      predictiveModel: predictiveModels[0],
      outputCurrency: outputCurrencies[0],
      fxBrlEur: sliderConfig.fxBrlEur.default,
      fuelIndex: sliderConfig.fuelIndex.default,
      taxesPct: sliderConfig.taxesPct.default,
      leadTimeDays: sliderConfig.leadTimeDays.default,
    }
  })

  // Monitor packaging type changes to handle conditional fields
  const watchPackagingType = form.watch('packagingType');

  // Effect to update containerType/containerSize disabled state
  useEffect(() => {
    if (watchPackagingType === 'granel') {
      form.setValue('containerType', undefined);
      form.setValue('containerSize', undefined);
    } else {
      // Reset to default values if they were cleared
      if (!form.getValues('containerType')) {
        form.setValue('containerType', containerTypes[0]);
      }
      if (!form.getValues('containerSize')) {
        form.setValue('containerSize', containerSizes[0]);
      }
    }
  }, [watchPackagingType, form]);

  // Type-safe submit handler with explicit typing
  const onSubmit: SubmitHandler<PredictionFormData> = async (data) => {
    try {
      setIsSubmitting(true)
      setError(null)

      // Usar o endpoint proxy para evitar CORS e beneficiar-se da fila
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Mapeamento para o formato esperado pela API
          container_tamanho: data.packagingType === 'granel' ? null : data.containerSize,
          container_tipo: data.packagingType === 'granel' ? null : data.containerType,
          destino_porto: data.destinationPort,
          // Valores dos sliders
          fuel_index: data.fuelIndex,
          fx_brl_eur: data.fxBrlEur,
          lead_time_days: data.leadTimeDays,
          modal: data.logisticModal,
          model_name: data.predictiveModel,
          origem_porto: data.originPort,
          output_currency: data.outputCurrency,
          period_end: "2025/10/16", // Valores padrão ou calculados
          period_start: "2025/09/16", // Valores padrão ou calculados
          taxes_pct: data.taxesPct,
          tipo_embalagem: data.packagingType,
          tipo_produto: data.productType,
          volume_ton: data.peso // Convertendo peso para volume em toneladas
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || 'Falha ao criar previsão')
      }

      const result = await response.json()

      // Processar resultado da API
      const predictionId = result.id || result.prediction_id || 'novo'
      const estimatedCost = result.estimated_cost || result.cost || 0
      const costCurrency = data.outputCurrency

      // Exibir toast de sucesso
      toast({
        title: "Previsão de custo calculada com sucesso!",
        description: `O custo estimado é de ${estimatedCost} ${costCurrency}`,
        variant: "default",
      })

      // Redirecionar para a página de detalhes da previsão criada
      // Se a API não retornar um ID, redirecionamos para a lista de previsões
      if (predictionId !== 'novo') {
        router.push(`/predictions/${predictionId}`)
      } else {
        router.push('/predictions')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar previsão')
      console.error('Erro ao criar previsão:', err)

      // Exibir toast de erro
      toast({
        title: "Erro ao criar previsão",
        description: err instanceof Error ? err.message : 'Falha ao processar a requisição',
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Previsão</h1>
        <p className="text-gray-600 mt-1">
          Preencha os dados abaixo para calcular o custo de transporte
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="bg-red-50 p-4 rounded-md mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Primeira linha: peso e distância */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="peso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Peso da carga"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="distancia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distância (km)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Distância"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Segunda linha: Porto de Origem e Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="originPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porto de Origem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o porto de origem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {originPorts.map((port) => (
                          <SelectItem key={port} value={port}>{port}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="destinationPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porto de Destino</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o porto de destino" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {destinationPorts.map((port) => (
                          <SelectItem key={port} value={port}>{port}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Terceira linha: Modal Logístico e Tipo de Produto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="logisticModal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modal Logístico</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {logisticModals.map((modal) => (
                          <SelectItem key={modal} value={modal}>{modal}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Produto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quarta linha: Tipo de Embalagem e Tipo de Container */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="packagingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Embalagem</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a embalagem" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packagingTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="containerType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Container</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={watchPackagingType === 'granel'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o container" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {containerTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Quinta linha: Tamanho do Container e Modelo Preditivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="containerSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamanho do Container</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={watchPackagingType === 'granel'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tamanho" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {containerSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="predictiveModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo Preditivo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {predictiveModels.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sexta linha: Moeda de Saída */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="outputCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moeda de Saída</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a moeda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {outputCurrencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </div>

            {/* Sliders */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Parâmetros Adicionais</h3>

              {/* Câmbio BRL/EUR or dynamic based on selected currency */}
              <FormField
                control={form.control}
                name="fxBrlEur"
                render={({ field }) => {
                  // Get the selected output currency for dynamic label
                  const selectedCurrency = form.watch('outputCurrency') || outputCurrencies[0];
                  const currencyLabel = selectedCurrency === 'BRL' ? 'BRL/EUR' :
                    selectedCurrency === 'USD' ? 'BRL/USD' : 'BRL/EUR';

                  return (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Câmbio {currencyLabel}</FormLabel>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{field.value.toFixed(2)}</span>
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val >= sliderConfig.fxBrlEur.min && val <= sliderConfig.fxBrlEur.max) {
                                field.onChange(val);
                              }
                            }}
                            className="w-16 h-8 text-xs"
                            step={sliderConfig.fxBrlEur.step}
                            min={sliderConfig.fxBrlEur.min}
                            max={sliderConfig.fxBrlEur.max}
                          />
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          min={sliderConfig.fxBrlEur.min}
                          max={sliderConfig.fxBrlEur.max}
                          step={sliderConfig.fxBrlEur.step}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          aria-label={`Câmbio ${currencyLabel}`}
                          className="cursor-pointer"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{sliderConfig.fxBrlEur.min.toFixed(2)}</span>
                        <span>{sliderConfig.fxBrlEur.max.toFixed(2)}</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Índice de Combustível */}
              <FormField
                control={form.control}
                name="fuelIndex"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Índice de Combustível</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.value.toFixed(1)}</span>
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= sliderConfig.fuelIndex.min && val <= sliderConfig.fuelIndex.max) {
                              field.onChange(val);
                            }
                          }}
                          className="w-16 h-8 text-xs"
                          step={sliderConfig.fuelIndex.step}
                          min={sliderConfig.fuelIndex.min}
                          max={sliderConfig.fuelIndex.max}
                        />
                      </div>
                    </div>
                    <FormControl>
                      <Slider
                        min={sliderConfig.fuelIndex.min}
                        max={sliderConfig.fuelIndex.max}
                        step={sliderConfig.fuelIndex.step}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        aria-label="Índice de Combustível"
                        className="cursor-pointer"
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{sliderConfig.fuelIndex.min.toFixed(1)}</span>
                      <span>{sliderConfig.fuelIndex.max.toFixed(1)}</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Taxas (%) */}
              <FormField
                control={form.control}
                name="taxesPct"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Taxas (%)</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.value}%</span>
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= sliderConfig.taxesPct.min && val <= sliderConfig.taxesPct.max) {
                              field.onChange(val);
                            }
                          }}
                          className="w-16 h-8 text-xs"
                          step={sliderConfig.taxesPct.step}
                          min={sliderConfig.taxesPct.min}
                          max={sliderConfig.taxesPct.max}
                        />
                      </div>
                    </div>
                    <FormControl>
                      <Slider
                        min={sliderConfig.taxesPct.min}
                        max={sliderConfig.taxesPct.max}
                        step={sliderConfig.taxesPct.step}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        aria-label="Taxas Percentual"
                        className="cursor-pointer"
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{sliderConfig.taxesPct.min}%</span>
                      <span>{sliderConfig.taxesPct.max}%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Lead Time (dias) */}
              <FormField
                control={form.control}
                name="leadTimeDays"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Prazo de Entrega (dias)</FormLabel>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{field.value} dias</span>
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= sliderConfig.leadTimeDays.min && val <= sliderConfig.leadTimeDays.max) {
                              field.onChange(val);
                            }
                          }}
                          className="w-16 h-8 text-xs"
                          step={sliderConfig.leadTimeDays.step}
                          min={sliderConfig.leadTimeDays.min}
                          max={sliderConfig.leadTimeDays.max}
                        />
                      </div>
                    </div>
                    <FormControl>
                      <Slider
                        min={sliderConfig.leadTimeDays.min}
                        max={sliderConfig.leadTimeDays.max}
                        step={sliderConfig.leadTimeDays.step}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                        aria-label="Prazo de Entrega em Dias"
                        className="cursor-pointer"
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{sliderConfig.leadTimeDays.min} dias</span>
                      <span>{sliderConfig.leadTimeDays.max} dias</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Calculando...' : 'Criar Previsão'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
