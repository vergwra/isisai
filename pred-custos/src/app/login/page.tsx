"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { Label } from '@/components/ui/label'

// Schema para validação do formulário
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  // Estado local para rastrear o submit
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, error, isLoading } = useAuth()
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })
  
  const onSubmit = async (data: LoginFormData) => {
    if (isSubmitting || isLoading) return
    
    setIsSubmitting(true)
    try {
      await login(data)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-center">LogiPredict</h1>
            <p className="text-sm text-gray-500 text-center mt-2">
              Entre com suas credenciais para acessar o sistema
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                {...register('email')}
                id="email"
                type="email"
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                {...register('password')}
                id="password"
                type="password"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className={`w-full p-2 text-white rounded-md ${
                isLoading || isSubmitting ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading || isSubmitting ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          
          <div className="text-center text-sm">
            <p>
              Não tem uma conta?{' '}
              <a href="/register" className="text-blue-600 hover:underline">
                Registre-se
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
