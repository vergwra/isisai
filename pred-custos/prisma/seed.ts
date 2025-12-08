import { PrismaClient, Role } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Obter variáveis de ambiente
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD
    const adminName = process.env.ADMIN_NAME || 'Administrador'

    if (!adminEmail || !adminPassword) {
      throw new Error('Variáveis de ambiente ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias')
    }

    // Verificar se já existe um usuário com este email
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      console.log(`O usuário admin com email ${adminEmail} já existe`)
      return
    }

    // Hash da senha
    const passwordHash = await hash(adminPassword, 10)

    // Criar usuário admin
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: Role.ADMIN
      }
    })

    console.log(`Usuário admin criado: ${admin.email} (ID: ${admin.id})`)
  } catch (error) {
    console.error('Erro ao executar seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
