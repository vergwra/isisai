/**
 * Opções para os seletores da página de predição
 * Estruturado como arrays constantes para permitir tipagem estática
 */

// Porto de Origem (América do Sul)
export const originPorts = [
  'Paranaguá',
  'Pecém',
  'Suape',
  'Callao',
  'Chancay',
  'Salaverry',
  'Paita',
  'Cartagena',
  'Buenaventura',
  'Santa Marta',
] as const;

// Porto de Destino (Europa)
export const destinationPorts = [
  'Rotterdam',
  'Hamburg',
  'Le Havre',
  'Valencia',
  'Antwerp',
] as const;

// Modal Logístico
export const logisticModals = [
  'marítimo',
  'aéreo',
  'multimodal',
] as const;

// Tipo de Produto (Polpa)
export const productTypes = [
  'polpa de acerola',
  'polpa de caju',
  'polpa de manga',
  'polpa de maracujá',
  'polpa de goiaba',
] as const;

// Tipo de Embalagem
export const packagingTypes = [
  'containerizado',
  'granel',
] as const;

// Tipo de Container
export const containerTypes = [
  'Reefer',
  'Dry',
] as const;

// Tamanho do Container
export const containerSizes = [
  '20ft',
  '40ft',
] as const;

// Configurações para sliders
export const sliderConfig = {
  fxBrlEur: {
    min: 4.00,
    max: 8.00,
    step: 0.05,
    default: 4.95
  },
  fuelIndex: {
    min: 0.5,
    max: 2.5,
    step: 0.1,
    default: 1.5
  },
  taxesPct: {
    min: 0,
    max: 50,
    step: 1,
    default: 15
  },
  leadTimeDays: {
    min: 7,
    max: 90,
    step: 1,
    default: 56
  }
}

// Modelo Preditivo
export const predictiveModels = [
  'random_forest',
  'linear_regression',
] as const;

// Moeda de Saída
export const outputCurrencies = [
  'BRL',
  'USD',
  'EUR',
] as const;

// Tipos derivados para uso com TypeScript e Zod
export type OriginPort = typeof originPorts[number];
export type DestinationPort = typeof destinationPorts[number];
export type LogisticModal = typeof logisticModals[number];
export type ProductType = typeof productTypes[number];
export type PackagingType = typeof packagingTypes[number];
export type ContainerType = typeof containerTypes[number];
export type ContainerSize = typeof containerSizes[number];
export type PredictiveModel = typeof predictiveModels[number];
export type OutputCurrency = typeof outputCurrencies[number];
