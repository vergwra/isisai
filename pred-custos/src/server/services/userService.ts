import { prisma } from '../db'
import { hash, compare } from 'bcrypt'
import { Role } from '@prisma/client'
import { createToken } from '../utils/jwt'

const SALT_ROUNDS = 10

export class UserService {
  async createUser(data: {
    email: string
    password: string
    name: string
    role?: Role
  }) {
    const hashedPassword = await hash(data.password, SALT_ROUNDS)
    
    return await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const isValid = await compare(password, user.password)
    if (!isValid) {
      throw new Error('Invalid password')
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  }

  async getUser(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
  }

  async updateUser(id: string, data: {
    email?: string
    name?: string
    role?: Role
  }) {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
  }
}
