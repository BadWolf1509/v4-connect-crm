'use client';

import { useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  Info,
  Check,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data
const conversations = [
  {
    id: '1',
    contact: { name: 'João Silva', avatar: null, phone: '+55 11 99999-1234' },
    channel: 'whatsapp',
    lastMessage: 'Olá, gostaria de saber mais sobre o produto',
    unread: 3,
    timestamp: '10:30',
    status: 'open',
  },
  {
    id: '2',
    contact: { name: 'Maria Santos', avatar: null, phone: '+55 11 99999-5678' },
    channel: 'instagram',
    lastMessage: 'Qual o prazo de entrega?',
    unread: 0,
    timestamp: '09:45',
    status: 'open',
  },
  {
    id: '3',
    contact: { name: 'Pedro Oliveira', avatar: null, phone: '+55 11 99999-9012' },
    channel: 'messenger',
    lastMessage: 'Obrigado pelo atendimento!',
    unread: 0,
    timestamp: 'Ontem',
    status: 'resolved',
  },
  {
    id: '4',
    contact: { name: 'Ana Costa', avatar: null, phone: '+55 11 99999-3456' },
    channel: 'whatsapp',
    lastMessage: 'Vou verificar e retorno',
    unread: 1,
    timestamp: 'Ontem',
    status: 'pending',
  },
];

const messages = [
  {
    id: '1',
    content: 'Olá, tudo bem? Gostaria de saber mais sobre o produto X.',
    sender: 'contact',
    timestamp: '10:25',
    status: 'read',
  },
  {
    id: '2',
    content: 'Olá João! Tudo ótimo, e com você? O produto X está disponível com entrega em até 3 dias úteis.',
    sender: 'user',
    timestamp: '10:28',
    status: 'read',
  },
  {
    id: '3',
    content: 'Perfeito! Qual o valor?',
    sender: 'contact',
    timestamp: '10:29',
    status: 'read',
  },
  {
    id: '4',
    content: 'O valor é R$ 199,90 com frete grátis para sua região.',
    sender: 'user',
    timestamp: '10:30',
    status: 'delivered',
  },
  {
    id: '5',
    content: 'Olá, gostaria de saber mais sobre o produto',
    sender: 'contact',
    timestamp: '10:30',
    status: 'read',
  },
];

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  messenger: 'bg-blue-500',
};

export default function InboxPage() {
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageInput, setMessageInput] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'pending' | 'resolved'>('all');

  const filteredConversations = conversations.filter((conv) => {
    if (filter === 'all') return true;
    return conv.status === filter;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Conversations List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-900">
        {/* Search & Filter */}
        <div className="border-b border-gray-800 p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'open', 'pending', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  filter === status
                    ? 'bg-v4-red-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                )}
              >
                {status === 'all' && 'Todos'}
                {status === 'open' && 'Abertos'}
                {status === 'pending' && 'Pendentes'}
                {status === 'resolved' && 'Resolvidos'}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="overflow-y-auto">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={cn(
                'flex w-full items-start gap-3 border-b border-gray-800 p-4 text-left transition hover:bg-gray-800',
                selectedConversation?.id === conv.id && 'bg-gray-800'
              )}
            >
              {/* Avatar with channel indicator */}
              <div className="relative">
                <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-lg font-medium text-white">
                    {conv.contact.name[0]}
                  </span>
                </div>
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-gray-900',
                    channelColors[conv.channel]
                  )}
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white truncate">
                    {conv.contact.name}
                  </span>
                  <span className="text-xs text-gray-500">{conv.timestamp}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{conv.lastMessage}</p>
              </div>

              {/* Unread badge */}
              {conv.unread > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-v4-red-500 px-1.5 text-xs font-medium text-white">
                  {conv.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex flex-1 flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="font-medium text-white">
                    {selectedConversation.contact.name[0]}
                  </span>
                </div>
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900',
                    channelColors[selectedConversation.channel]
                  )}
                />
              </div>
              <div>
                <h2 className="font-medium text-white">
                  {selectedConversation.contact.name}
                </h2>
                <p className="text-sm text-gray-400">
                  {selectedConversation.contact.phone}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <Phone className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <Video className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <Info className="h-5 w-5" />
              </button>
              <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[70%] rounded-2xl px-4 py-2',
                    message.sender === 'user'
                      ? 'bg-v4-red-500 text-white'
                      : 'bg-gray-800 text-white'
                  )}
                >
                  <p className="text-sm">{message.content}</p>
                  <div
                    className={cn(
                      'mt-1 flex items-center justify-end gap-1 text-xs',
                      message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                    )}
                  >
                    <span>{message.timestamp}</span>
                    {message.sender === 'user' && (
                      <>
                        {message.status === 'sent' && <Clock className="h-3 w-3" />}
                        {message.status === 'delivered' && <Check className="h-3 w-3" />}
                        {message.status === 'read' && <CheckCheck className="h-3 w-3" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-800 bg-gray-900 p-4">
            <div className="flex items-end gap-3">
              <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>
              <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
                <Smile className="h-5 w-5" />
              </button>
              <button className="rounded-lg bg-v4-red-500 p-3 text-white hover:bg-v4-red-600">
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-gray-500">Selecione uma conversa</p>
        </div>
      )}

      {/* Contact Details Panel (Optional - could be toggled) */}
    </div>
  );
}
