'use client';

import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

export function UserHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const isPublicRoute = ['/login', '/register'].includes(pathname);

  if (isPublicRoute || !user) {
    return null;
  }

  return (
    <div className="h-16 border-b px-6 flex items-center justify-between bg-white">
      <div className="flex items-center gap-2">
        <span className="font-medium">{user.name}</span>
        <span className="text-sm text-gray-500">
          ({user.role === 'admin' ? 'Administrador' : 'Usuário'})
        </span>
      </div>
      <Button variant="ghost" onClick={logout}>
        Sair
      </Button>
    </div>
  );
}
