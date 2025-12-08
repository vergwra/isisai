import { beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar environment do teste
// Nota: Em vez de tentar modificar NODE_ENV diretamente (que é readonly),
// apenas verificamos se estamos em ambiente de teste
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Verificar se estamos usando um banco de dados de teste
if (!process.env.DATABASE_URL?.includes('test')) {
  console.warn(
    '⚠️ AVISO: Os testes não estão sendo executados em um banco de dados de teste! ⚠️\n' +
    'Configure DATABASE_URL para apontar para um banco de dados de teste para evitar perda de dados.\n'
  );
}

// Mock para serviços externos
vi.mock('../src/server/utils/mlClient', () => ({
  default: {
    predict: vi.fn().mockResolvedValue({ 
      predictionId: 'mock-prediction-id', 
      status: 'completed',
      result: { custoEurKg: 2.5, custoEurTotal: 250 }
    }),
    getModels: vi.fn().mockResolvedValue([
      { id: 'model1', name: 'Modelo de teste 1', accuracy: 0.92, created_at: new Date().toISOString() },
      { id: 'model2', name: 'Modelo de teste 2', accuracy: 0.88, created_at: new Date().toISOString() }
    ]),
    trainModel: vi.fn().mockResolvedValue({ 
      trainingId: 'mock-training-id', 
      status: 'training'
    })
  }
}));

// Silenciar logs durante os testes
vi.mock('../src/server/utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Limpar mocks entre testes
beforeAll(() => {
  vi.resetAllMocks();
});

// Limpar recursos após todos os testes
afterAll(async () => {
  // Fechar conexões do Prisma se necessário
  const prisma = new PrismaClient();
  await prisma.$disconnect();
  
  // Adicionar qualquer outra limpeza necessária aqui
});
