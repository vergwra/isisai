'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  console.log('[ProtectedRoute] Path:', pathname);
  console.log('[ProtectedRoute] isAuthenticated:', isAuthenticated);
  console.log('[ProtectedRoute] isLoading:', isLoading);
  
  useEffect(() => {
    // Só verificamos após o carregamento inicial para evitar flashes
    if (!isLoading) {
      console.log('[ProtectedRoute] Verificação completa:', isAuthenticated ? 'Autenticado' : 'Não autenticado');
      
      // Se não estiver autenticado e não for uma rota pública, redirecionar para login
      if (!isAuthenticated && pathname !== '/login' && pathname !== '/register') {
        console.log('[ProtectedRoute] Redirecionando para /login...');
        router.push('/login');
        return;
      }
      
      // Se estiver autenticado e estiver em uma rota pública (login/register), redirecionar para dashboard
      if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
        console.log('[ProtectedRoute] Usuário autenticado tentando acessar rota pública, redirecionando para /dashboard...');
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);
  
  // Durante o carregamento, exibir um indicador de loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Se não estiver autenticado em uma rota protegida, não renderizar nada
  // (o redirecionamento já foi acionado no useEffect)
  if (!isAuthenticated && pathname !== '/login' && pathname !== '/register') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Redirecionando...</div>
      </div>
    );
  }
  
  // Nos outros casos, renderizar o conteúdo normalmente
  return <>{children}</>;
}
