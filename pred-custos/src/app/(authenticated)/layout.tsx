'use client';

import { Sidebar } from '@/components/sidebar';
import { UserHeader } from '@/components/user-header';
import { RouteGuard } from '@/components/route-guard';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <UserHeader />
          <main className="flex-1 overflow-auto p-6 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
