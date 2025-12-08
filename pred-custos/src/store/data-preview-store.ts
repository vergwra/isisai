import { create } from 'zustand';

export interface ColumnStats {
  mean?: number;
  median?: number;
  mode?: string | number;
  stdDev?: number;
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
}

export interface Column {
  id: string;
  name: string;
  type: 'numeric' | 'text' | 'date';
  stats: ColumnStats;
}

export interface DataRow {
  id: string;
  [key: string]: any;
}

interface DataPreviewState {
  columns: Column[];
  data: DataRow[];
  setData: (data: DataRow[]) => void;
  setColumns: (columns: Column[]) => void;
  updateCell: (rowId: string, columnId: string, value: any) => void;
  deleteRow: (rowId: string) => void;
  deleteColumn: (columnId: string) => void;
  calculateStats: (columnId: string) => void;
}

// Função auxiliar para calcular estatísticas
const calculateColumnStats = (data: DataRow[], columnId: string): ColumnStats => {
  const values = data.map(row => row[columnId]).filter(v => v !== null && v !== undefined);
  const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
  
  if (numericValues.length > 0) {
    const sum = numericValues.reduce((a, b) => a + b, 0);
    const mean = sum / numericValues.length;
    const sortedValues = [...numericValues].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    const variance = numericValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericValues.length;
    
    return {
      mean,
      median,
      stdDev: Math.sqrt(variance),
      nullCount: data.length - values.length,
      uniqueCount: new Set(values).size,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      mode: values
        .reduce((acc: any, val: any) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string | number, number>)
        .reduce((a: any, b: any) => (a[1] > b[1] ? a : b), ['', 0])[0],
    };
  }

  // Para dados não numéricos
  return {
    nullCount: data.length - values.length,
    uniqueCount: new Set(values).size,
    mode: values
      .reduce((acc: any, val: any) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<string | number, number>)
      .reduce((a: any, b: any) => (a[1] > b[1] ? a : b), ['', 0])[0],
  };
};

// Dados mockados para desenvolvimento
const mockData: DataRow[] = [
  {
    id: '1',
    data: '2025-07-01',
    origem: 'Fortaleza',
    destino: 'Lisboa',
    modal: 'Marítimo',
    peso: 1500,
    valor: 25000,
  },
  {
    id: '2',
    data: '2025-07-02',
    origem: 'Fortaleza',
    destino: 'Madrid',
    modal: 'Aéreo',
    peso: 800,
    valor: 18000,
  },
  // ... mais dados mockados
];

const mockColumns: Column[] = [
  {
    id: 'data',
    name: 'Data',
    type: 'date',
    stats: { nullCount: 0, uniqueCount: 2 },
  },
  {
    id: 'origem',
    name: 'Origem',
    type: 'text',
    stats: { nullCount: 0, uniqueCount: 1 },
  },
  {
    id: 'destino',
    name: 'Destino',
    type: 'text',
    stats: { nullCount: 0, uniqueCount: 2 },
  },
  {
    id: 'modal',
    name: 'Modal',
    type: 'text',
    stats: { nullCount: 0, uniqueCount: 2 },
  },
  {
    id: 'peso',
    name: 'Peso (kg)',
    type: 'numeric',
    stats: {
      mean: 1150,
      median: 1150,
      stdDev: 350,
      nullCount: 0,
      uniqueCount: 2,
      min: 800,
      max: 1500,
    },
  },
  {
    id: 'valor',
    name: 'Valor (R$)',
    type: 'numeric',
    stats: {
      mean: 21500,
      median: 21500,
      stdDev: 3500,
      nullCount: 0,
      uniqueCount: 2,
      min: 18000,
      max: 25000,
    },
  },
];

export const useDataPreviewStore = create<DataPreviewState>((set, get) => ({
  columns: mockColumns,
  data: mockData,
  setData: (data) => set({ data }),
  setColumns: (columns) => set({ columns }),
  updateCell: (rowId, columnId, value) =>
    set((state) => ({
      data: state.data.map((row) =>
        row.id === rowId ? { ...row, [columnId]: value } : row
      ),
    })),
  deleteRow: (rowId) =>
    set((state) => ({
      data: state.data.filter((row) => row.id !== rowId),
    })),
  deleteColumn: (columnId) =>
    set((state) => ({
      columns: state.columns.filter((col) => col.id !== columnId),
      data: state.data.map((row) => {
        const newRow: DataRow = Object.entries(row).reduce((acc, [key, value]) => {
          if (key !== columnId) {
            acc[key] = value;
          }
          return acc;
        }, { id: row.id } as DataRow);
        
        return newRow;
      }),
    })),
  calculateStats: (columnId) =>
    set((state) => ({
      columns: state.columns.map((col) =>
        col.id === columnId
          ? { ...col, stats: calculateColumnStats(state.data, columnId) }
          : col
      ),
    })),
}));
