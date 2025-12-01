'use client';

import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Loader2, MessageSquare, Search, X, Zap } from 'lucide-react';
import { useState } from 'react';

interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
}

// Respostas rápidas default (usadas como fallback)
const defaultQuickReplies: QuickReply[] = [
  {
    id: '1',
    title: 'Saudação',
    content: 'Olá! Seja bem-vindo(a). Como posso ajudar você hoje?',
    shortcut: '/ola',
    category: 'Geral',
  },
  {
    id: '2',
    title: 'Aguarde um momento',
    content: 'Um momento, por favor. Estou verificando essa informação para você.',
    shortcut: '/aguarde',
    category: 'Geral',
  },
  {
    id: '3',
    title: 'Horário de atendimento',
    content:
      'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Aos sábados, das 9h às 13h.',
    shortcut: '/horario',
    category: 'Informações',
  },
  {
    id: '4',
    title: 'Encerramento',
    content:
      'Foi um prazer atendê-lo(a)! Se precisar de mais alguma coisa, estamos à disposição. Tenha um ótimo dia!',
    shortcut: '/tchau',
    category: 'Geral',
  },
  {
    id: '5',
    title: 'Transferência',
    content:
      'Vou transferir você para um especialista que poderá ajudá-lo(a) melhor. Um momento, por favor.',
    shortcut: '/transferir',
    category: 'Atendimento',
  },
  {
    id: '6',
    title: 'Pagamento',
    content:
      'Aceitamos pagamento via PIX, cartão de crédito (em até 12x) e boleto bancário. Qual forma prefere?',
    shortcut: '/pagamento',
    category: 'Vendas',
  },
  {
    id: '7',
    title: 'Prazo de entrega',
    content:
      'O prazo de entrega varia de acordo com a sua região. Pode me informar seu CEP para eu verificar?',
    shortcut: '/prazo',
    category: 'Vendas',
  },
  {
    id: '8',
    title: 'Retorno',
    content:
      'Obrigado pelo contato! Vou verificar essa questão e retorno em breve com uma solução.',
    shortcut: '/retorno',
    category: 'Atendimento',
  },
];

interface QuickRepliesProps {
  onSelect: (content: string) => void;
  onClose: () => void;
  searchTerm?: string;
}

export function QuickReplies({ onSelect, onClose, searchTerm = '' }: QuickRepliesProps) {
  const { api } = useApi();
  const [search, setSearch] = useState(searchTerm);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch quick replies from API
  const { data, isLoading } = useQuery({
    queryKey: ['quick-replies'],
    queryFn: () => api.get<{ quickReplies: QuickReply[] }>('/quick-replies'),
  });

  // Use API data or fallback to defaults
  const quickReplies = data?.quickReplies?.length ? data.quickReplies : defaultQuickReplies;

  const categories = Array.from(
    new Set(quickReplies.map((reply) => reply.category).filter(Boolean)),
  ) as string[];

  const filteredReplies = quickReplies.filter((reply) => {
    const matchesSearch =
      !search ||
      reply.title.toLowerCase().includes(search.toLowerCase()) ||
      reply.content.toLowerCase().includes(search.toLowerCase()) ||
      reply.shortcut?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = !selectedCategory || reply.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSelect = (reply: QuickReply) => {
    onSelect(reply.content);
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-gray-900 border border-gray-800 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Zap className="h-4 w-4 text-v4-red-500" />
          Respostas Rápidas
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ou digitar atalho..."
            className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-3 border-b border-gray-800 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition',
            !selectedCategory
              ? 'bg-v4-red-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white',
          )}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition',
              selectedCategory === category
                ? 'bg-v4-red-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white',
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Replies List */}
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Carregando respostas...</p>
          </div>
        ) : filteredReplies.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <p>Nenhuma resposta encontrada</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredReplies.map((reply) => (
              <button
                type="button"
                key={reply.id}
                onClick={() => handleSelect(reply)}
                className="w-full text-left rounded-lg p-3 hover:bg-gray-800 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white text-sm">{reply.title}</span>
                  {reply.shortcut && (
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded font-mono">
                      {reply.shortcut}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{reply.content}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="border-t border-gray-800 px-3 py-2 text-xs text-gray-500">
        Dica: Digite{' '}
        <span className="bg-gray-800 px-1.5 py-0.5 rounded font-mono text-gray-400">/</span> no chat
        para acessar rapidamente
      </div>
    </div>
  );
}
