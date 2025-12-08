import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fetch from 'node-fetch'

const API_URL = 'http://localhost:3000/api'
const prisma = new PrismaClient()

// Dados de teste
const testUser = {
  name: 'Teste Previsões',
  email: 'prediction-test@example.com',
  password: 'senha123',
  role: Role.USER
}

// Input de previsão de teste
const testPredictionInput = {
  inputJson: {
    peso: 100,
    distancia: 200,
    tipo: 'rodoviario'
  }
}

describe('Fluxo de Previsões', () => {
  let accessCookies: string
  let userId: string
  let predictionId: string

  // Preparar ambiente de teste
  beforeAll(async () => {
    // Limpar usuário e previsões de teste se existirem
    await prisma.prediction.deleteMany({
      where: {
        user: {
          email: testUser.email
        }
      }
    })
    
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: testUser.email
        }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        email: testUser.email
      }
    })

    // Criar usuário de teste
    const hashedPassword = await bcrypt.hash(testUser.password, 10)
    const user = await prisma.user.create({
      data: {
        name: testUser.name,
        email: testUser.email,
        passwordHash: hashedPassword,
        role: testUser.role
      }
    })
    userId = user.id

    // Fazer login para obter cookies
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    })
    
    accessCookies = loginResponse.headers.get('set-cookie') || ''
  })

  // Limpar ambiente após testes
  afterAll(async () => {
    // Remover previsões de teste
    await prisma.prediction.deleteMany({
      where: {
        userId
      }
    })
    
    // Remover usuário de teste
    await prisma.refreshToken.deleteMany({
      where: {
        userId
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        id: userId
      }
    })
    
    await prisma.$disconnect()
  })

  it('Deve criar uma nova previsão', async () => {
    const response = await fetch(`${API_URL}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: accessCookies
      },
      body: JSON.stringify(testPredictionInput)
    })

    expect(response.status).toBe(201)
    const data = await response.json() as { prediction: { id: string; status: string } }
    expect(data.prediction).toBeDefined()
    expect(data.prediction.status).toBe('PENDING')
    
    // Salvar o ID da previsão para os próximos testes
    predictionId = data.prediction.id
  })

  it('Deve listar as previsões do usuário', async () => {
    const response = await fetch(`${API_URL}/predictions`, {
      headers: {
        Cookie: accessCookies
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { predictions: Array<{ id: string }> }
    expect(data.predictions).toBeDefined()
    expect(Array.isArray(data.predictions)).toBe(true)
    expect(data.predictions.length).toBeGreaterThan(0)
    
    // Verifica se a previsão criada anteriormente está na lista
    const foundPrediction = data.predictions.some(
      (p) => p.id === predictionId
    )
    expect(foundPrediction).toBe(true)
  })

  it('Deve buscar uma previsão específica pelo ID', async () => {
    // Pular o teste se não temos um ID de previsão
    if (!predictionId) {
      console.log('Pulando teste, nenhuma previsão foi criada')
      return
    }

    const response = await fetch(`${API_URL}/predictions/${predictionId}`, {
      headers: {
        Cookie: accessCookies
      }
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { 
      prediction: { 
        id: string; 
        inputData: { 
          peso: number; 
          distancia: number; 
          tipo: string 
        } 
      } 
    }
    expect(data.prediction).toBeDefined()
    expect(data.prediction.id).toBe(predictionId)
    expect(data.prediction.inputData).toBeDefined()
    expect(data.prediction.inputData.peso).toBe(testPredictionInput.inputJson.peso)
  })

  it('Não deve permitir acesso a previsões de outros usuários', async () => {
    // Criar outro usuário temporário
    const otherUser = {
      name: 'Outro Usuário',
      email: 'other-user@example.com',
      password: 'senha123'
    }
    
    // Registrar o outro usuário
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(otherUser)
    })
    
    expect(registerResponse.status).toBe(201)
    
    // Login com o outro usuário
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: otherUser.email,
        password: otherUser.password
      })
    })
    
    const otherUserCookies = loginResponse.headers.get('set-cookie') || ''
    
    // Tentar acessar a previsão do usuário original com o outro usuário
    const response = await fetch(`${API_URL}/predictions/${predictionId}`, {
      headers: {
        Cookie: otherUserCookies
      }
    })
    
    // Deve receber um erro 403 (Forbidden) ou 404 (Not Found)
    expect([403, 404]).toContain(response.status)
    
    // Limpar o outro usuário
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          email: otherUser.email
        }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        email: otherUser.email
      }
    })
  })
})
