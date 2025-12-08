import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fetch from 'node-fetch'

const API_URL = 'http://localhost:3000/api'
const prisma = new PrismaClient()

// Dados de teste
const testUser = {
  name: 'Teste Smoke',
  email: 'smoke-test@example.com',
  password: 'senha123'
}

describe('Fluxo de Autenticação', () => {
  // Preparar ambiente de teste
  beforeAll(async () => {
    // Limpar usuário de teste se existir
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
  })

  // Limpar ambiente após testes
  afterAll(async () => {
    // Remover usuário de teste
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
    await prisma.$disconnect()
  })

  it('Deve registrar um novo usuário', async () => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    })

    expect(response.status).toBe(201)
    const data = await response.json() as { user: { email: string; name: string; id: string } }
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe(testUser.email)
  })

  it('Deve fazer login com credenciais válidas', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    })

    expect(response.status).toBe(200)
    const data = await response.json() as { user: { email: string; name: string; id: string } }
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe(testUser.email)
  })

  it('Deve rejeitar login com senha incorreta', async () => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testUser.email,
        password: 'senha-errada'
      })
    })

    expect(response.status).toBe(401)
    const data = await response.json() as { error: string }
    expect(data.error).toBeDefined()
  })

  it('Deve obter informações do usuário autenticado', async () => {
    // Primeiro faz login para obter cookies
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
    
    // Extrair cookies da resposta
    const cookies = loginResponse.headers.get('set-cookie')
    
    // Usar cookies para fazer requisição autenticada
    const meResponse = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Cookie: cookies || ''
      }
    })

    expect(meResponse.status).toBe(200)
    const data = await meResponse.json() as { user: { email: string; name: string; id: string } }
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe(testUser.email)
  })

  it('Deve fazer logout e invalidar tokens', async () => {
    // Primeiro faz login para obter cookies
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
    
    // Extrair cookies da resposta
    const cookies = loginResponse.headers.get('set-cookie')
    
    // Fazer logout
    const logoutResponse = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: cookies || ''
      }
    })

    expect(logoutResponse.status).toBe(200)
    
    // Tentar acessar rota protegida após logout
    const meResponse = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Cookie: cookies || ''
      }
    })

    expect(meResponse.status).toBe(401) // Não autorizado
  })
})
