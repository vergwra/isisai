import { create } from 'zustand';

export type DataType = 'numeric' | 'categorical' | 'date';

export interface ColumnInfo {
  name: string;
  dataType: DataType;
  nullPercentage: number;
  example: string | number;
  isSelected: boolean;
  isRecommended: boolean;
  hasOutliers: boolean;
  correlation?: number;
  variance?: number;
}

interface NormalizationState {
  columns: ColumnInfo[];
  setColumns: (columns: ColumnInfo[]) => void;
  toggleColumnSelection: (columnName: string) => void;
  updateColumnType: (columnName: string, newType: DataType) => void;
  autoNormalize: () => void;
}

// Dados mockados para desenvolvimento
const mockColumns: ColumnInfo[] = [
  {
    name: 'data',
    dataType: 'date',
    nullPercentage: 0,
    example: '2025-07-10',
    isSelected: true,
    isRecommended: true,
    hasOutliers: false,
  },
  {
    name: 'origem',
    dataType: 'categorical',
    nullPercentage: 0,
    example: 'Fortaleza',
    isSelected: true,
    isRecommended: true,
    hasOutliers: false,
  },
  {
    name: 'destino',
    dataType: 'categorical',
    nullPercentage: 0,
    example: 'Lisboa',
    isSelected: true,
    isRecommended: true,
    hasOutliers: false,
  },
  {
    name: 'modal',
    dataType: 'categorical',
    nullPercentage: 0,
    example: 'Marítimo',
    isSelected: true,
    isRecommended: true,
    hasOutliers: false,
  },
  {
    name: 'peso',
    dataType: 'numeric',
    nullPercentage: 2.5,
    example: 1500.5,
    isSelected: true,
    isRecommended: true,
    hasOutliers: true,
    variance: 0.85,
  },
  {
    name: 'valor_mercadoria',
    dataType: 'numeric',
    nullPercentage: 0,
    example: 25000.00,
    isSelected: true,
    isRecommended: true,
    hasOutliers: false,
    variance: 0.92,
  },
  {
    name: 'distancia',
    dataType: 'numeric',
    nullPercentage: 0,
    example: 7500,
    isSelected: true,
    isRecommended: true,
    hasOutliers: false,
    variance: 0.78,
  },
  {
    name: 'observacoes',
    dataType: 'categorical',
    nullPercentage: 45.2,
    example: 'Carga refrigerada',
    isSelected: false,
    isRecommended: false,
    hasOutliers: false,
  },
];

export const useNormalizationStore = create<NormalizationState>((set) => ({
  columns: mockColumns,
  setColumns: (columns) => set({ columns }),
  toggleColumnSelection: (columnName) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.name === columnName ? { ...col, isSelected: !col.isSelected } : col
      ),
    })),
  updateColumnType: (columnName, newType) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.name === columnName ? { ...col, dataType: newType } : col
      ),
    })),
  autoNormalize: () =>
    set((state) => ({
      columns: state.columns.map((col) => ({
        ...col,
        isSelected:
          col.isRecommended &&
          col.nullPercentage < 30 &&
          (col.variance === undefined || col.variance > 0.5),
      })),
    })),
}));
