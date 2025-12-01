'use client';

import { useApi } from '@/hooks/use-api';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, MessageSquare, Radio, Timer, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsOverview {
  totalConversations: number;
  openConversations: number;
  pendingConversations: number;
  resolvedConversations: number;
  totalContacts: number;
  totalMessages: number;
  activeChannels: number;
}

interface DailyConversation {
  date: string;
  count: number;
}

interface ResponseTimeMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  fastestResponseTime: number;
  slowestResponseTime: number;
  totalResponses: number;
}

interface DailyResponseTime {
  date: string;
  averageResponseTime: number;
  totalResponses: number;
}

interface RecentConversation {
  id: string;
  status: string;
  lastMessageAt: string;
  contact: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string | null;
  } | null;
  channel: {
    id: string;
    name: string;
    type: string;
  } | null;
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'gray',
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  color?: 'gray' | 'green' | 'yellow' | 'blue' | 'red';
}) {
  const colorClasses = {
    gray: 'bg-gray-500/10 text-gray-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    blue: 'bg-blue-500/10 text-blue-400',
    red: 'bg-v4-red-500/10 text-v4-red-400',
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className="flex items-center text-xs text-green-400">
            <TrendingUp className="mr-1 h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400">{title}</p>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: DailyConversation[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex h-40 items-end justify-between gap-2">
      {data.map((day) => {
        const height = (day.count / maxCount) * 100;
        const dateObj = new Date(day.date);
        const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

        return (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative w-full flex-1">
              <div
                className="absolute bottom-0 w-full rounded-t bg-v4-red-500 transition-all hover:bg-v4-red-400"
                style={{ height: `${Math.max(height, 4)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{dayName}</span>
          </div>
        );
      })}
    </div>
  );
}

// Format seconds to human readable time
function formatResponseTime(seconds: number): string {
  if (seconds === 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function ResponseTimeCard({ metrics }: { metrics: ResponseTimeMetrics | undefined }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-v4-red-500/10 p-2">
          <Timer className="h-5 w-5 text-v4-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Tempo de Resposta</h2>
          <p className="text-xs text-gray-400">Últimos 30 dias</p>
        </div>
      </div>

      {metrics && metrics.totalResponses > 0 ? (
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {formatResponseTime(metrics.averageResponseTime)}
            </span>
            <span className="text-sm text-gray-400">média</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-800">
            <div>
              <p className="text-sm text-gray-400">Mediana</p>
              <p className="text-lg font-semibold text-white">
                {formatResponseTime(metrics.medianResponseTime)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total de respostas</p>
              <p className="text-lg font-semibold text-white">
                {metrics.totalResponses.toLocaleString('pt-BR')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Mais rápida</p>
              <p className="text-lg font-semibold text-green-400">
                {formatResponseTime(metrics.fastestResponseTime)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Mais lenta</p>
              <p className="text-lg font-semibold text-yellow-400">
                {formatResponseTime(metrics.slowestResponseTime)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Timer className="h-12 w-12 text-gray-600" />
          <p className="mt-2 text-gray-400">Sem dados de resposta</p>
          <p className="text-sm text-gray-500">As m�tricas aparecer�o quando houver conversas</p>
        </div>
      )}
    </div>
  );
}

function ResponseTimeTrendChart({ data }: { data: DailyResponseTime[] }) {
  const hasData = data.some((d) => d.averageResponseTime > 0);
  const maxTime = Math.max(...data.map((d) => d.averageResponseTime), 1);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Tempo de Resposta (7 dias)</h2>
      {hasData ? (
        <div className="flex h-40 items-end justify-between gap-2">
          {data.map((day) => {
            const height = (day.averageResponseTime / maxTime) * 100;
            const dateObj = new Date(day.date);
            const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full flex-1 group">
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-blue-500 transition-all hover:bg-blue-400"
                    style={{ height: `${Math.max(height, day.averageResponseTime > 0 ? 4 : 0)}%` }}
                  />
                  {day.averageResponseTime > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-800 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                      {formatResponseTime(day.averageResponseTime)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">{dayName}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-gray-500">
          Sem dados para exibir
        </div>
      )}
    </div>
  );
}

function RecentConversationsList({
  conversations,
}: {
  conversations: RecentConversation[];
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-600" />
        <p className="mt-2 text-gray-400">Nenhuma conversa recente</p>
        <p className="text-sm text-gray-500">
          As conversas aparecerão aqui quando você receber mensagens
        </p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    open: 'bg-green-500',
    resolved: 'bg-gray-500',
    snoozed: 'bg-blue-500',
  };

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/inbox?conversation=${conversation.id}`}
          className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900/30 p-4 transition hover:bg-gray-800/50"
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700">
              <span className="text-sm font-medium text-white">
                {conversation.contact?.name?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-gray-900 ${
                statusColors[conversation.status] || 'bg-gray-500'
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">
              {conversation.contact?.name || 'Contato desconhecido'}
            </p>
            <p className="text-sm text-gray-400 truncate">
              {conversation.channel?.name || 'Canal'} •{' '}
              {new Date(conversation.lastMessageAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(conversation.lastMessageAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { api, isAuthenticated } = useApi();

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.get<AnalyticsOverview>('/analytics/overview'),
    enabled: isAuthenticated,
  });

  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['analytics', 'daily'],
    queryFn: () =>
      api.get<{ data: DailyConversation[] }>('/analytics/conversations/daily', {
        params: { days: 7 },
      }),
    enabled: isAuthenticated,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['analytics', 'recent'],
    queryFn: () =>
      api.get<{ data: RecentConversation[] }>('/analytics/conversations/recent', {
        params: { limit: 5 },
      }),
    enabled: isAuthenticated,
  });

  const { data: responseTimeData } = useQuery({
    queryKey: ['analytics', 'response-time'],
    queryFn: () => api.get<ResponseTimeMetrics>('/analytics/response-time'),
    enabled: isAuthenticated,
  });

  const { data: dailyResponseTimeData } = useQuery({
    queryKey: ['analytics', 'response-time-daily'],
    queryFn: () =>
      api.get<{ data: DailyResponseTime[] }>('/analytics/response-time/daily', {
        params: { days: 7 },
      }),
    enabled: isAuthenticated,
  });

  const isLoading = !isAuthenticated || overviewLoading || dailyLoading || recentLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-v4-red-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400">Visão geral do seu atendimento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Conversas"
          value={overview?.totalConversations || 0}
          icon={MessageSquare}
          color="gray"
        />
        <StatCard
          title="Conversas Abertas"
          value={overview?.openConversations || 0}
          icon={Clock}
          color="green"
        />
        <StatCard
          title="Aguardando Resposta"
          value={overview?.pendingConversations || 0}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Resolvidas"
          value={overview?.resolvedConversations || 0}
          icon={CheckCircle}
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Contatos" value={overview?.totalContacts || 0} icon={Users} color="gray" />
        <StatCard
          title="Mensagens Enviadas"
          value={overview?.totalMessages || 0}
          icon={MessageSquare}
          color="gray"
        />
        <StatCard
          title="Canais Ativos"
          value={overview?.activeChannels || 0}
          icon={Radio}
          color="red"
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversations Chart */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Conversas nos últimos 7 dias</h2>
          {dailyData?.data && dailyData.data.length > 0 ? (
            <SimpleBarChart data={dailyData.data} />
          ) : (
            <div className="flex h-40 items-center justify-center text-gray-500">
              Sem dados para exibir
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Conversas Recentes</h2>
            <Link href="/inbox" className="text-sm text-v4-red-500 hover:text-v4-red-400">
              Ver todas
            </Link>
          </div>
          <RecentConversationsList conversations={recentData?.data || []} />
        </div>
      </div>

      {/* Response Time Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Response Time Card */}
        <ResponseTimeCard metrics={responseTimeData} />

        {/* Response Time Trend */}
        {dailyResponseTimeData?.data && (
          <ResponseTimeTrendChart data={dailyResponseTimeData.data} />
        )}
      </div>
    </div>
  );
}
