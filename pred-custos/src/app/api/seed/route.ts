import { NextResponse } from 'next/server'
import { prisma } from '@/server/utils/prisma'
import { hash } from 'bcryptjs'
import { Role } from '@prisma/client'

export async function POST() {
    try {
        // Obter variáveis de ambiente
        const adminEmail = process.env.ADMIN_EMAIL
        const adminPassword = process.env.ADMIN_PASSWORD
        const adminName = process.env.ADMIN_NAME || 'Administrador'

        if (!adminEmail || !adminPassword) {
            return NextResponse.json(
                { error: 'Variáveis de ambiente ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórias' },
                { status: 400 }
            )
        }

        // Verificar se já existe um usuário com este email
        const existingUser = await prisma.user.findUnique({
            where: { email: adminEmail }
        })

        if (existingUser) {
            return NextResponse.json(
                { message: `O usuário admin com email ${adminEmail} já existe`, user: existingUser },
                { status: 200 }
            )
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

        return NextResponse.json(
            { message: 'Usuário admin criado com sucesso', user: { id: admin.id, email: admin.email } },
            { status: 201 }
        )
    } catch (error) {
        console.error('Erro ao executar seed via API:', error)
        return NextResponse.json(
            { error: 'Erro interno ao criar usuário admin' },
            { status: 500 }
        )
    }
}
