'use client';

import type { ReactNode } from 'react';
import { MessageSquare, Users, TrendingUp, Zap } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Visão geral do seu atendimento</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Conversas Abertas"
          value="24"
          change="+12%"
          icon={<MessageSquare className="h-5 w-5" />}
        />
        <StatCard
          title="Contatos"
          value="1,234"
          change="+8%"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Deals Ativos"
          value="18"
          change="+15%"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Automações"
          value="5"
          change="0%"
          icon={<Zap className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Conversas Recentes</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-3"
              >
                <div className="h-10 w-10 rounded-full bg-gray-700" />
                <div className="flex-1">
                  <p className="font-medium text-white">Cliente {i}</p>
                  <p className="text-sm text-gray-400">Última mensagem...</p>
                </div>
                <span className="text-xs text-gray-500">2min</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Desempenho da Equipe</h2>
          <div className="space-y-4">
            {['Maria', 'João', 'Ana', 'Pedro'].map((name) => (
              <div key={name} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-v4-red-500/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-v4-red-500">{name[0]}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-white">{name}</span>
                    <span className="text-sm text-gray-400">{Math.floor(Math.random() * 20) + 5} conversas</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-800">
                    <div
                      className="h-2 rounded-full bg-v4-red-500"
                      style={{ width: `${Math.random() * 60 + 40}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
}) {
  const isPositive = change.startsWith('+');

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between">
        <div className="rounded-lg bg-v4-red-500/10 p-2 text-v4-red-500">{icon}</div>
        <span
          className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-gray-500'}`}
        >
          {change}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{title}</p>
      </div>
    </div>
  );
}
