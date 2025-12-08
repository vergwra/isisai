'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import {
  BarChart,
  Upload,
  Table,
  Settings,
  LineChart,
  PlayCircle,
  Home,
} from 'lucide-react';

interface SidebarItem {
  href: string;
  title: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    href: '/',
    title: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: '/upload',
    title: 'Upload',
    icon: <Upload className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: '/preview',
    title: 'Visualizar Dados',
    icon: <Table className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: '/normalize',
    title: 'Normalização',
    icon: <LineChart className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: '/config',
    title: 'Configuração',
    icon: <Settings className="h-5 w-5" />,
    adminOnly: true,
  },
  {
    href: '/predictions/new',
    title: 'Testar Modelos',
    icon: <PlayCircle className="h-5 w-5" />,
  },
  {
    href: '/results',
    title: 'Resultados',
    icon: <BarChart className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">LogiPredict</h2>
      </div>
      <nav className="space-y-1 p-4">
        {sidebarItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900',
                pathname === item.href &&
                  'bg-gray-100 text-gray-900'
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
