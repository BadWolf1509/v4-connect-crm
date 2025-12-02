'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell, ChevronDown, LogOut, Plus, Search, Settings, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export function Header() {
  const { data: session } = useSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [notifications],
  );

  useEffect(() => {
    if (!showNotifications || unreadCount === 0) return;
    markAllAsRead();
  }, [showNotifications, unreadCount, markAllAsRead]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const badgeVisible = unreadCount > 0;

  const userInitials = session?.user?.name
    ? session.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="flex h-16 items-center justify-between border-b border-v4-gray-800 bg-v4-gray-950 px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-v4-gray-300" />
          <input
            type="text"
            placeholder="Buscar conversas, contatos..."
            className="w-full rounded-lg border border-v4-gray-800 bg-v4-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-v4-gray-300 focus:border-v4-red-500 focus:outline-none focus:ring-1 focus:ring-v4-red-500"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-v4-gray-800 px-2 py-0.5 text-xs text-v4-gray-300">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* New Button */}
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-v4-red-600"
        >
          <Plus className="h-4 w-4" />
          <span>Novo</span>
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg p-2 text-v4-gray-300 transition hover:bg-v4-gray-800 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {badgeVisible && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-v4-red-500" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-v4-gray-800 bg-v4-gray-900 p-4 shadow-xl z-50">
              <h3 className="mb-3 text-sm font-semibold text-white">Notificações</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {isLoading && <p className="text-sm text-v4-gray-300">Carregando...</p>}
                {!isLoading && sortedNotifications.length === 0 && (
                  <p className="text-sm text-v4-gray-300">Nenhuma notificação</p>
                )}
                {!isLoading &&
                  sortedNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-v4-gray-800 transition"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex-shrink-0 ${
                          notification.read ? 'bg-v4-gray-800' : 'bg-v4-red-500/20'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{notification.title}</p>
                        {notification.body && (
                          <p className="text-xs text-v4-gray-300 line-clamp-2">
                            {notification.body}
                          </p>
                        )}
                        <p className="text-xs text-v4-gray-300 mt-1">
                          {new Date(notification.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="mt-3 w-full text-center text-sm text-v4-red-500 hover:underline"
              >
                Ver todas
              </button>
            </div>
          )}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-v4-gray-800 outline-none focus:ring-2 focus:ring-v4-red-500/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-v4-red-500/20">
                {session?.user?.avatarUrl ? (
                  <img
                    src={session.user.avatarUrl}
                    alt={session.user.name || 'User'}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium text-v4-red-500">{userInitials}</span>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-v4-gray-300" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-white">
                  {session?.user?.name || 'Usuário'}
                </p>
                <p className="text-xs leading-none text-v4-gray-300">
                  {session?.user?.email || 'usuario@empresa.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-v4-red-500 focus:text-v4-red-500"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
