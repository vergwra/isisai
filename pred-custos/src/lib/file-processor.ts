import * as XLSX from 'xlsx';
import { DataRow } from '@/store/data-store';

export async function processFile(file: File): Promise<{ data: DataRow[]; columns: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Erro ao ler arquivo');

        let parsedData: DataRow[];
        let columns: string[];

        if (file.name.endsWith('.csv')) {
          const result = await processCSV(data as string);
          parsedData = result.data;
          columns = result.columns;
        } else {
            
          const result = await processExcel(data as ArrayBuffer);
          parsedData = result.data;
          columns = result.columns;
        }

        // Validar colunas obrigatórias
        const requiredColumns = ['data', 'origem', 'destino', 'modal', 'peso', 'valor'];
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));

        if (missingColumns.length > 0) {
          throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
        }

        resolve({ data: parsedData, columns });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
}

async function processCSV(content: string): Promise<{ data: DataRow[]; columns: string[] }> {
  const lines = content.split('\n');
  const columns = lines[0].split(',').map(col => col.trim().toLowerCase());
  
  const data = lines.slice(1)
    .filter(line => line.trim())
    .map(line => {
      const values = line.split(',');
      return columns.reduce((obj, col, index) => {
        obj[col] = values[index]?.trim() || '';
        return obj;
      }, {} as DataRow);
    });

  return { data, columns };
}

async function processExcel(content: ArrayBuffer): Promise<{ data: DataRow[]; columns: string[] }> {
  const workbook = XLSX.read(content, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(firstSheet);
  
  if (jsonData.length === 0) {
    throw new Error('Arquivo vazio');
  }

  const columns = Object.keys(jsonData[0]).map(col => col.toLowerCase());
  const data = jsonData.map((row: any) => {
    const newRow: DataRow = {};
    for (const [key, value] of Object.entries(row)) {
      newRow[key?.toLowerCase()] = value?.toString() || '';
    }
    return newRow;
  });

  return { data, columns };
}
