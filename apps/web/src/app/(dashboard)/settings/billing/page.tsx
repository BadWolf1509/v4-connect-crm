'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  CreditCard,
  ExternalLink,
  Loader2,
  MessageSquare,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    users: number | 'unlimited';
    conversations: number | 'unlimited';
    channels: number | 'unlimited';
    storage: string;
  };
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    features: [
      '1 usuário',
      '100 conversas/mês',
      '1 canal WhatsApp',
      '500MB de armazenamento',
      'Suporte por email',
    ],
    limits: {
      users: 1,
      conversations: 100,
      channels: 1,
      storage: '500MB',
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 97,
    features: [
      '3 usuários',
      '1.000 conversas/mês',
      '2 canais',
      '5GB de armazenamento',
      'Chatbots básicos',
      'Suporte prioritário',
    ],
    limits: {
      users: 3,
      conversations: 1000,
      channels: 2,
      storage: '5GB',
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 297,
    popular: true,
    features: [
      '10 usuários',
      '10.000 conversas/mês',
      '5 canais',
      '25GB de armazenamento',
      'Chatbots avançados',
      'Campanhas de marketing',
      'API de integração',
      'Suporte 24/7',
    ],
    limits: {
      users: 10,
      conversations: 10000,
      channels: 5,
      storage: '25GB',
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: -1, // Custom pricing
    features: [
      'Usuários ilimitados',
      'Conversas ilimitadas',
      'Canais ilimitados',
      'Armazenamento ilimitado',
      'Todos os recursos',
      'SLA garantido',
      'Gerente de conta dedicado',
      'Implantação personalizada',
    ],
    limits: {
      users: 'unlimited',
      conversations: 'unlimited',
      channels: 'unlimited',
      storage: 'Ilimitado',
    },
  },
];

export default function BillingSettingsPage() {
  const { api, isAuthenticated } = useApi();

  // Fetch current plan
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-plan'],
    queryFn: () => api.get<{ user: { tenant: { plan: string } } }>('/auth/me'),
    enabled: isAuthenticated,
  });

  const currentPlan = (userData?.user as { tenant?: { plan?: string } })?.tenant?.plan || 'free';

  const handleUpgrade = (planId: string) => {
    if (planId === 'enterprise') {
      toast.info('Entre em contato para planos Enterprise', {
        description: 'Nossa equipe entrará em contato em até 24h',
      });
      return;
    }
    toast.info('Redirecionando para checkout...', {
      description: 'Integração com Stripe em desenvolvimento',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-v4-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Plano e Faturamento</h1>
        <p className="mt-1 text-sm text-gray-400">Gerencie seu plano e informações de pagamento</p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <h2 className="font-semibold text-white">Plano Atual</h2>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-2xl font-bold text-white capitalize">
                {plans.find((p) => p.id === currentPlan)?.name || currentPlan}
              </span>
              {currentPlan !== 'enterprise' && (
                <span className="rounded-full bg-v4-red-500/10 px-3 py-1 text-xs font-medium text-v4-red-500">
                  {currentPlan === 'free' ? 'Gratuito' : 'Ativo'}
                </span>
              )}
            </div>
          </div>

          {currentPlan === 'free' && (
            <button
              type="button"
              onClick={() => handleUpgrade('starter')}
              className="flex items-center gap-2 rounded-lg bg-v4-red-500 px-4 py-2 font-medium text-white transition hover:bg-v4-red-600"
            >
              <Sparkles className="h-4 w-4" />
              Fazer Upgrade
            </button>
          )}
        </div>

        {/* Usage Stats */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="h-4 w-4" />
              <span className="text-sm">Usuários</span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold text-white">1</span>
              <span className="text-gray-500">
                {' '}
                / {plans.find((p) => p.id === currentPlan)?.limits.users}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Conversas</span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold text-white">45</span>
              <span className="text-gray-500">
                {' '}
                / {plans.find((p) => p.id === currentPlan)?.limits.conversations}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Zap className="h-4 w-4" />
              <span className="text-sm">Canais</span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold text-white">1</span>
              <span className="text-gray-500">
                {' '}
                / {plans.find((p) => p.id === currentPlan)?.limits.channels}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
            <div className="flex items-center gap-2 text-gray-400">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">Armazenamento</span>
            </div>
            <div className="mt-2">
              <span className="text-xl font-bold text-white">125MB</span>
              <span className="text-gray-500">
                {' '}
                / {plans.find((p) => p.id === currentPlan)?.limits.storage}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Todos os Planos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-xl border p-6',
                plan.popular
                  ? 'border-v4-red-500 bg-v4-red-500/5'
                  : 'border-gray-800 bg-gray-900/50',
                currentPlan === plan.id && 'ring-2 ring-v4-red-500',
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-v4-red-500 px-3 py-1 text-xs font-medium text-white">
                    Mais Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-2">
                  {plan.price === -1 ? (
                    <span className="text-2xl font-bold text-white">Personalizado</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">R${plan.price}</span>
                      {plan.price > 0 && <span className="text-gray-400">/mês</span>}
                    </>
                  )}
                </div>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 shrink-0 text-green-500" />
                    <span className="text-sm text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleUpgrade(plan.id)}
                disabled={currentPlan === plan.id}
                className={cn(
                  'mt-6 w-full rounded-lg px-4 py-2 text-sm font-medium transition',
                  currentPlan === plan.id
                    ? 'cursor-not-allowed bg-gray-700 text-gray-400'
                    : plan.popular
                      ? 'bg-v4-red-500 text-white hover:bg-v4-red-600'
                      : 'border border-gray-700 text-white hover:bg-gray-800',
                )}
              >
                {currentPlan === plan.id
                  ? 'Plano Atual'
                  : plan.price === -1
                    ? 'Falar com Vendas'
                    : 'Selecionar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Método de Pagamento</h2>
            <p className="mt-1 text-sm text-gray-400">
              {currentPlan === 'free'
                ? 'Adicione um cartão para fazer upgrade'
                : 'Gerencie seus métodos de pagamento'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => toast.info('Integração com Stripe em desenvolvimento')}
            className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
          >
            <CreditCard className="h-4 w-4" />
            {currentPlan === 'free' ? 'Adicionar Cartão' : 'Gerenciar'}
          </button>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Histórico de Faturas</h2>
          <button
            type="button"
            onClick={() => toast.info('Funcionalidade em desenvolvimento')}
            className="flex items-center gap-1 text-sm text-v4-red-500 hover:text-v4-red-400"
          >
            Ver Todas
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center py-8 text-gray-400">
          {currentPlan === 'free'
            ? 'Nenhuma fatura disponível no plano gratuito'
            : 'Nenhuma fatura encontrada'}
        </div>
      </div>
    </div>
  );
}
