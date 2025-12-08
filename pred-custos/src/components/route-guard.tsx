'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

// Rotas que requerem autenticação e seus respectivos perfis necessários
const protectedRoutes: Record<string, 'admin' | 'user' | 'both'> = {
  '/config': 'admin',
  '/normalize': 'admin',
  '/preview': 'admin',
  '/upload': 'admin',
  '/results': 'both',
  '/': 'both',
};

// Rotas públicas (login, registro, etc)
const publicRoutes = ['/login', '/register'];

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    // Permite acesso a rotas públicas
    if (publicRoutes.includes(pathname)) {
      return;
    }

    // Redireciona para login se não estiver autenticado
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Verifica permissões da rota
    const requiredRole = protectedRoutes[pathname];
    if (requiredRole) {
      const isAdmin = user?.role === 'admin';
      const hasAccess =
        requiredRole === 'both' || 
        (requiredRole === 'admin' && isAdmin) || 
        (requiredRole === 'user' && !isAdmin);

      if (!hasAccess) {
        router.push('/unauthorized');
      }
    }
  }, [pathname, isAuthenticated, user, router]);

  return <>{children}</>;
}
