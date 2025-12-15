'use client';


import { UserHeader } from '@/components/user-header';
import { RouteGuard } from '@/components/route-guard';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      <div className="flex h-screen flex-col">
        <UserHeader />
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}
