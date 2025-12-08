'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Schema de validação do formulário
const registerSchema = z.object({
  name: z
    .string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Formato de email inválido'),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z
    .string()
    .min(1, 'Confirmação de senha é obrigatória')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword']
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  
  // Redirecionar para dashboard se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, router])
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  })
  
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Remover confirmPassword antes de enviar para a API
      const { confirmPassword, ...registerData } = data
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registerData)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao registrar usuário')
      }
      
      // Redirecionar para login com parâmetro de sucesso
      router.push('/login?registered=true')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar usuário')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-center">Criar Conta</h1>
            <p className="text-sm text-gray-500 text-center mt-2">
              Registre-se para acessar o sistema LogiPredict
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Nome
              </label>
              <input
                {...register('name')}
                id="name"
                type="text"
                className="w-full p-2 border rounded-md"
                placeholder="Seu nome completo"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                className="w-full p-2 border rounded-md"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Senha
              </label>
              <input
                {...register('password')}
                id="password"
                type="password"
                className="w-full p-2 border rounded-md"
                placeholder="******"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirmar Senha
              </label>
              <input
                {...register('confirmPassword')}
                id="confirmPassword"
                type="password"
                className="w-full p-2 border rounded-md"
                placeholder="******"
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full p-2 text-white rounded-md ${
                isLoading ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Registrando...' : 'Registrar'}
            </button>
          </form>
          
          <div className="text-center text-sm">
            <p>
              Já tem uma conta?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
