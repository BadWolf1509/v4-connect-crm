'use client';

import { cn } from '@/lib/utils';
import {
  BarChart3,
  Bot,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Kanban,
  Megaphone,
  MessageSquare,
  Settings,
  Users,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/overview' as Route, icon: BarChart3 },
  { name: 'Inbox', href: '/inbox' as Route, icon: MessageSquare },
  { name: 'Contatos', href: '/contacts' as Route, icon: Users },
  { name: 'CRM', href: '/crm' as Route, icon: Kanban },
  { name: 'Chatbots', href: '/chatbots' as Route, icon: Bot },
  { name: 'Campanhas', href: '/campaigns' as Route, icon: Megaphone },
];

const bottomNavigation = [
  { name: 'Configurações', href: '/settings' as Route, icon: Settings },
  { name: 'Ajuda', href: '/help' as Route, icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-800 bg-gray-950 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-v4-red-500" />
            <span className="text-lg font-bold text-white">V4 Connect</span>
          </Link>
        )}
        {collapsed && <div className="mx-auto h-8 w-8 rounded-lg bg-v4-red-500" />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navigation.map((item) => {
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
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-800 p-2">
        {bottomNavigation.map((item) => {
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
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Collapse Toggle */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Recolher</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
