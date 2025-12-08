import { create } from 'zustand';

export interface ModelSummary {
  id: string;
  nome: string;
  tipo: string;
  dataTreinamento: string;
  acuracia: number;
}

export interface HistoricalPrediction {
  data: string;
  custoEstimado: number;
  rota: string;
  modal: string;
}

interface DashboardState {
  arquivosProcessados: number;
  totalPrevisoes: number;
  modelosDisponiveis: string[];
  ultimaAtualizacao: string;
  historicoPrevisoes: HistoricalPrediction[];
  modelosRecentes: ModelSummary[];
}

// Dados mockados para desenvolvimento
const mockHistorico: HistoricalPrediction[] = [
  { data: '2025-01-06', custoEstimado: 14500, rota: 'FOR-LIS', modal: 'Marítimo' },
  { data: '2025-02-06', custoEstimado: 15200, rota: 'FOR-LIS', modal: 'Marítimo' },
  { data: '2025-03-06', custoEstimado: 15800, rota: 'FOR-LIS', modal: 'Marítimo' },
  { data: '2025-04-06', custoEstimado: 16100, rota: 'FOR-LIS', modal: 'Marítimo' },
  { data: '2025-05-06', custoEstimado: 16500, rota: 'FOR-LIS', modal: 'Marítimo' },
  { data: '2025-06-06', custoEstimado: 15900, rota: 'FOR-LIS', modal: 'Marítimo' },
  { data: '2025-07-06', custoEstimado: 15420, rota: 'FOR-LIS', modal: 'Marítimo' },
];

const mockModelos: ModelSummary[] = [
  {
    id: '1',
    nome: 'Random Forest v1',
    tipo: 'Random Forest',
    dataTreinamento: '2025-07-06',
    acuracia: 0.87,
  },
  {
    id: '2',
    nome: 'XGBoost v1',
    tipo: 'XGBoost',
    dataTreinamento: '2025-07-05',
    acuracia: 0.85,
  },
  {
    id: '3',
    nome: 'LSTM v1',
    tipo: 'Deep Learning',
    dataTreinamento: '2025-07-04',
    acuracia: 0.83,
  },
];

export const useDashboardStore = create<DashboardState>(() => ({
  arquivosProcessados: 15,
  totalPrevisoes: 127,
  modelosDisponiveis: ['Regressão Linear', 'Random Forest', 'XGBoost', 'LSTM'],
  ultimaAtualizacao: '2025-07-06T14:00:00',
  historicoPrevisoes: mockHistorico,
  modelosRecentes: mockModelos,
}));
