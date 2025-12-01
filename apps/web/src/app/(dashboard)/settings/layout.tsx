'use client';

import { cn } from '@/lib/utils';
import { Building2, CreditCard, MessageSquare, Tag, Users } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const settingsNav = [
  { name: 'Canais', href: '/settings/channels' as Route, icon: MessageSquare },
  { name: 'Equipe', href: '/settings/team' as Route, icon: Users },
  { name: 'Tags', href: '/settings/tags' as Route, icon: Tag },
  { name: 'Empresa', href: '/settings/company' as Route, icon: Building2 },
  { name: 'Plano', href: '/settings/billing' as Route, icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      {/* Settings Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-950/50 p-4">
        <h1 className="mb-6 text-lg font-semibold text-white">Configuracoes</h1>
        <nav className="space-y-1">
          {settingsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-v4-red-500/10 text-v4-red-500'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
