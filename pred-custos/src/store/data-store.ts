import { create } from 'zustand';

export interface DataRow {
  [key: string]: string | number | Date;
}

interface DataState {
  data: DataRow[];
  columns: string[];
  fileName: string;
  setData: (data: DataRow[], columns: string[], fileName: string) => void;
  clearData: () => void;
}

export const useDataStore = create<DataState>((set) => ({
  data: [],
  columns: [],
  fileName: '',
  setData: (data, columns, fileName) => set({ data, columns, fileName }),
  clearData: () => set({ data: [], columns: [], fileName: '' }),
}));
