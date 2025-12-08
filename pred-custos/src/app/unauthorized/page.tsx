'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
        <h1 className="text-3xl font-bold">Acesso Não Autorizado</h1>
        <p className="text-gray-600">
          Você não tem permissão para acessar esta página.
        </p>
        <Button onClick={() => router.push('/')} className="mt-4">
          Voltar para o Dashboard
        </Button>
      </div>
    </div>
  );
}
