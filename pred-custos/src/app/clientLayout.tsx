'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import React from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const pathname = usePathname();

  // Logs de debug
  console.log('[ClientLayout] Pathname:', pathname);
  console.log('[ClientLayout] isAuthenticated:', isAuthenticated);
  console.log('[ClientLayout] isLoading:', isLoading);
  console.log('[ClientLayout] User:', user);

  // Verificar se estamos em uma rota pública (login ou register)
  const isPublicRoute = pathname === '/login' || pathname === '/register';

  return (
    <div className="flex h-screen flex-col">
      <main className={cn("flex-1 overflow-y-auto bg-gray-50", {
        "p-8": isAuthenticated || isPublicRoute,
      })}>
        {children}
      </main>
    </div>
  );
}
