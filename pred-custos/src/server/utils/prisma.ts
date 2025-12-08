import { PrismaClient } from '@prisma/client'

// Evitar múltiplas instâncias do Prisma Client em desenvolvimento
// https://www.prisma.io/docs/guides/performance-and-optimization/connection-management#prismaclient-in-long-running-applications

// Declaração global para o PrismaClient em ambiente de desenvolvimento
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

// Usar variável global para persistência entre hot reloads
export const prisma = global.prisma || new PrismaClient()

// Prevenir criação de múltiplas instâncias em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}
