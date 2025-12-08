import { create } from 'zustand';

export interface PredictionResult {
  id: string;
  origem: string;
  destino: string;
  modal: string;
  custoEstimado: number;
  custoReal: number | null;
  acuracia: number;
  modelo: string;
  data: string;
}

interface ResultsState {
  results: PredictionResult[];
  selectedModel: string | null;
  loading: boolean;
  setResults: (results: PredictionResult[]) => void;
  setSelectedModel: (model: string | null) => void;
  setLoading: (loading: boolean) => void;
}

// Dados mockados para desenvolvimento
const mockResults: PredictionResult[] = [
  {
    id: '1',
    origem: 'Fortaleza',
    destino: 'Lisboa',
    modal: 'Marítimo',
    custoEstimado: 15420.50,
    custoReal: 15800.00,
    acuracia: 0.87,
    modelo: 'Random Forest',
    data: '2025-07-06',
  },
  {
    id: '2',
    origem: 'Fortaleza',
    destino: 'Lisboa',
    modal: 'Marítimo',
    custoEstimado: 15650.75,
    custoReal: 15800.00,
    acuracia: 0.85,
    modelo: 'XGBoost',
    data: '2025-07-06',
  },
  {
    id: '3',
    origem: 'Fortaleza',
    destino: 'Madrid',
    modal: 'Aéreo',
    custoEstimado: 22450.30,
    custoReal: null,
    acuracia: 0.82,
    modelo: 'Random Forest',
    data: '2025-07-06',
  },
];

export const useResultsStore = create<ResultsState>((set) => ({
  results: mockResults, // Usando dados mockados inicialmente
  selectedModel: null,
  loading: false,
  setResults: (results) => set({ results }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setLoading: (loading) => set({ loading }),
}));
