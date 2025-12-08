'use client';

import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">Bem-vindo, {user?.name}!</h3>
          <p className="text-sm text-gray-600">
            {isAdmin
              ? 'Você tem acesso total ao sistema, incluindo treinamento de modelos.'
              : 'Você pode visualizar e consultar previsões de custos.'}
          </p>
        </Card>

        {isAdmin && (
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Área do Administrador</h3>
            <p className="text-sm text-gray-600">
              Gerencie dados, treine modelos e configure o sistema.
            </p>
          </Card>
        )}

        <Card className="p-6">
          <h3 className="font-semibold mb-2">Previsões Disponíveis</h3>
          <p className="text-sm text-gray-600">
            Consulte as previsões de custos logísticos.
          </p>
        </Card>
      </div>
    </div>
  );
}
