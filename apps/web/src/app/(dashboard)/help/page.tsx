'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useMutation } from '@tanstack/react-query';
import {
  Book,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquare,
  Play,
  Send,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqItems: FAQItem[] = [
  {
    category: 'Geral',
    question: 'O que é o V4 Connect?',
    answer:
      'O V4 Connect é uma plataforma completa de CRM e atendimento omnichannel que integra WhatsApp, Instagram, Facebook Messenger e outros canais em uma única interface. Permite gerenciar conversas, pipeline de vendas, campanhas de marketing e muito mais.',
  },
  {
    category: 'Geral',
    question: 'Como funciona o período de teste?',
    answer:
      'Oferecemos 14 dias de teste gratuito com acesso a todas as funcionalidades. Não é necessário cartão de crédito para começar. Após o período de teste, você pode escolher o plano que melhor se adequa às suas necessidades.',
  },
  {
    category: 'WhatsApp',
    question: 'Como conectar meu WhatsApp ao V4 Connect?',
    answer:
      'Vá em Configurações > Canais > Adicionar Canal > WhatsApp. Você pode conectar via QR Code (WhatsApp Web) ou via API Oficial do WhatsApp Business. Recomendamos a API oficial para negócios de maior volume.',
  },
  {
    category: 'WhatsApp',
    question: 'Posso usar múltiplos números de WhatsApp?',
    answer:
      'Sim! Você pode conectar quantos números de WhatsApp precisar. Cada número pode ser atribuído a equipes diferentes, permitindo uma gestão organizada do atendimento.',
  },
  {
    category: 'CRM',
    question: 'Como criar um pipeline de vendas?',
    answer:
      'No menu lateral, acesse CRM. Clique em "Novo Pipeline" e defina um nome. Em seguida, adicione as etapas do seu funil (ex: Novo Lead, Qualificação, Proposta, Negociação, Fechado). Você pode personalizar as cores de cada etapa.',
  },
  {
    category: 'CRM',
    question: 'Como mover deals entre etapas?',
    answer:
      'Você pode arrastar e soltar os cards de deal entre as colunas do pipeline, ou clicar no deal e selecionar a nova etapa no painel lateral. Todas as movimentações são registradas no histórico de atividades.',
  },
  {
    category: 'Chatbots',
    question: 'Como criar um chatbot?',
    answer:
      'Acesse Chatbots no menu lateral e clique em "Novo Chatbot". Configure o tipo de gatilho (palavra-chave, sempre ou agendado) e defina o fluxo de mensagens no editor visual. Os chatbots podem ser vinculados a canais específicos.',
  },
  {
    category: 'Chatbots',
    question: 'Posso integrar IA no chatbot?',
    answer:
      'Sim! O V4 Connect oferece integração com modelos de IA para criar chatbots inteligentes que entendem linguagem natural e podem responder perguntas complexas de forma automatizada.',
  },
  {
    category: 'Campanhas',
    question: 'Como enviar campanhas em massa?',
    answer:
      'Em Campanhas, crie uma nova campanha, selecione os contatos destinatários (por tags, segmentos ou lista), escreva sua mensagem e agende o envio. Respeite as políticas do WhatsApp para evitar bloqueios.',
  },
  {
    category: 'Integrações',
    question: 'Quais integrações estão disponíveis?',
    answer:
      'O V4 Connect integra com WhatsApp (API e Web), Instagram, Facebook Messenger, Telegram, além de webhooks para integrar com qualquer sistema externo. APIs estão disponíveis para integrações personalizadas.',
  },
];

const categories = ['Geral', 'WhatsApp', 'CRM', 'Chatbots', 'Campanhas', 'Integrações'];

const documentationLinks = [
  {
    title: 'Guia de Início Rápido',
    description: 'Aprenda o básico em 10 minutos',
    icon: Zap,
    url: '#',
  },
  {
    title: 'Documentação Completa',
    description: 'Referência técnica detalhada',
    icon: Book,
    url: '#',
  },
  {
    title: 'API Reference',
    description: 'Documentação da API REST',
    icon: ExternalLink,
    url: '#',
  },
  {
    title: 'Comunidade',
    description: 'Fórum de discussões e dicas',
    icon: Users,
    url: '#',
  },
];

const tutorialVideos = [
  {
    title: 'Introdução ao V4 Connect',
    duration: '5:32',
    thumbnail: '/api/placeholder/320/180',
  },
  {
    title: 'Configurando WhatsApp',
    duration: '8:15',
    thumbnail: '/api/placeholder/320/180',
  },
  {
    title: 'Criando seu primeiro Chatbot',
    duration: '12:45',
    thumbnail: '/api/placeholder/320/180',
  },
  {
    title: 'Gerenciando o Pipeline de Vendas',
    duration: '10:20',
    thumbnail: '/api/placeholder/320/180',
  },
];

const systemStatus = {
  overall: 'operational' as const,
  services: [
    { name: 'API', status: 'operational' as const },
    { name: 'WhatsApp Integration', status: 'operational' as const },
    { name: 'WebSocket Server', status: 'operational' as const },
    { name: 'Background Jobs', status: 'operational' as const },
  ],
  lastIncident: null as string | null,
};

export default function HelpPage() {
  const { api } = useApi();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    priority: 'normal' as 'low' | 'normal' | 'high',
  });

  const submitSupport = useMutation({
    mutationFn: (data: typeof supportForm) => api.post('/support/tickets', data),
    onSuccess: () => {
      toast.success('Ticket enviado com sucesso! Entraremos em contato em breve.');
      setSupportForm({ subject: '', message: '', priority: 'normal' });
    },
    onError: () => {
      toast.error('Erro ao enviar ticket. Tente novamente.');
    },
  });

  const handleSubmitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    submitSupport.mutate(supportForm);
  };

  const filteredFAQ = selectedCategory
    ? faqItems.filter((item) => item.category === selectedCategory)
    : faqItems;

  const getStatusColor = (status: 'operational' | 'degraded' | 'outage') => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'outage':
        return 'bg-red-500';
    }
  };

  const getStatusText = (status: 'operational' | 'degraded' | 'outage') => {
    switch (status) {
      case 'operational':
        return 'Operacional';
      case 'degraded':
        return 'Degradado';
      case 'outage':
        return 'Fora do ar';
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Central de Ajuda</h1>
          <p className="text-gray-400">
            Encontre respostas, aprenda com tutoriais e entre em contato com nosso suporte
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {documentationLinks.map((link) => (
            <a
              key={link.title}
              href={link.url}
              className="flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-gray-700 transition-colors"
            >
              <div className="rounded-lg bg-v4-red-500/20 p-2">
                <link.icon className="h-5 w-5 text-v4-red-500" />
              </div>
              <div>
                <h3 className="font-medium text-white">{link.title}</h3>
                <p className="text-sm text-gray-400">{link.description}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* FAQ Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="h-5 w-5 text-v4-red-500" />
                <h2 className="text-lg font-semibold text-white">Perguntas Frequentes</h2>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    'rounded-full px-3 py-1 text-sm transition',
                    !selectedCategory
                      ? 'bg-v4-red-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:text-white',
                  )}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      'rounded-full px-3 py-1 text-sm transition',
                      selectedCategory === category
                        ? 'bg-v4-red-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white',
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* FAQ Accordion */}
              <div className="space-y-2">
                {filteredFAQ.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-lg border border-gray-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFAQ(expandedFAQ === item.question ? null : item.question)
                      }
                      className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-800/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                          {item.category}
                        </span>
                        <span className="text-sm font-medium text-white">{item.question}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 text-gray-400 transition-transform',
                          expandedFAQ === item.question && 'rotate-180',
                        )}
                      />
                    </button>
                    {expandedFAQ === item.question && (
                      <div className="border-t border-gray-800 bg-gray-800/30 px-4 py-3">
                        <p className="text-sm text-gray-300 leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tutorial Videos */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Play className="h-5 w-5 text-v4-red-500" />
                <h2 className="text-lg font-semibold text-white">Tutoriais em Vídeo</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {tutorialVideos.map((video) => (
                  <div
                    key={video.title}
                    className="group relative rounded-lg border border-gray-800 overflow-hidden cursor-pointer hover:border-gray-700 transition"
                  >
                    <div className="aspect-video bg-gray-800 flex items-center justify-center">
                      <div className="rounded-full bg-white/10 p-3 group-hover:bg-v4-red-500/80 transition">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-white">{video.title}</h3>
                      <p className="text-xs text-gray-400">{video.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Status do Sistema</h2>
                <div className="flex items-center gap-2">
                  <div
                    className={cn('h-2 w-2 rounded-full', getStatusColor(systemStatus.overall))}
                  />
                  <span className="text-sm text-gray-400">
                    {getStatusText(systemStatus.overall)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {systemStatus.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <div className={cn('h-2 w-2 rounded-full', getStatusColor(service.status))} />
                      <span className="text-xs text-gray-400">{getStatusText(service.status)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {systemStatus.lastIncident && (
                <div className="mt-4 rounded-lg bg-yellow-500/10 p-3">
                  <p className="text-xs text-yellow-400">
                    Último incidente: {systemStatus.lastIncident}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Todos os sistemas operacionais</span>
                </div>
              </div>
            </div>

            {/* Support Form */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-v4-red-500" />
                <h2 className="text-lg font-semibold text-white">Falar com Suporte</h2>
              </div>

              <form onSubmit={handleSubmitSupport} className="space-y-4">
                <div>
                  <label htmlFor="support-subject" className="block text-sm text-gray-400 mb-1">
                    Assunto
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    placeholder="Descreva brevemente o problema"
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="support-priority" className="block text-sm text-gray-400 mb-1">
                    Prioridade
                  </label>
                  <select
                    id="support-priority"
                    value={supportForm.priority}
                    onChange={(e) =>
                      setSupportForm({
                        ...supportForm,
                        priority: e.target.value as 'low' | 'normal' | 'high',
                      })
                    }
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white focus:border-v4-red-500 focus:outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="support-message" className="block text-sm text-gray-400 mb-1">
                    Mensagem
                  </label>
                  <textarea
                    id="support-message"
                    value={supportForm.message}
                    onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                    placeholder="Descreva seu problema ou dúvida em detalhes..."
                    rows={4}
                    className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitSupport.isPending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-v4-red-500 py-2 text-sm font-medium text-white hover:bg-v4-red-600 disabled:opacity-50 transition"
                >
                  {submitSupport.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Ticket
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Outras formas de contato:</p>
                <div className="space-y-2">
                  <a
                    href="mailto:suporte@v4company.com"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
                  >
                    <Mail className="h-4 w-4" />
                    suporte@v4company.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
