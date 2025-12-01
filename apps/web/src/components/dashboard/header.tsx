'use client';

import { useNotifications } from '@/hooks/use-notifications';
import { Bell, ChevronDown, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950 px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar conversas, contatos..."
            className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none focus:ring-1 focus:ring-v4-red-500"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
            ?K
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
            className="relative rounded-lg p-2 text-gray-400 transition hover:bg-gray-800 hover:text-white"
          >
            <Bell className="h-5 w-5" />
            {badgeVisible && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-v4-red-500" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-xl">
              <h3 className="mb-3 text-sm font-semibold text-white">Notificações</h3>
              <div className="space-y-2">
                {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}
                {!isLoading && sortedNotifications.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhuma notificação</p>
                )}
                {!isLoading &&
                  sortedNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => markAsRead(notification.id)}
                      className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-gray-800"
                    >
                      <div
                        className={`h-8 w-8 rounded-full ${
                          notification.read ? 'bg-gray-800' : 'bg-v4-red-500/20'
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-sm text-white">{notification.title}</p>
                        {notification.body && (
                          <p className="text-xs text-gray-400">{notification.body}</p>
                        )}
                        <p className="text-xs text-gray-500">
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
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg p-2 transition hover:bg-gray-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-v4-red-500/20">
              <span className="text-sm font-medium text-v4-red-500">U</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-gray-800 bg-gray-900 py-2 shadow-xl">
              <div className="border-b border-gray-800 px-4 pb-3 pt-2">
                <p className="text-sm font-medium text-white">Usuário</p>
                <p className="text-xs text-gray-500">usuario@empresa.com</p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Meu Perfil
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                >
                  Configurações
                </button>
              </div>
              <div className="border-t border-gray-800 py-1">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-sm text-v4-red-500 hover:bg-gray-800"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
