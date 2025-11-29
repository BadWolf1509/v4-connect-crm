'use client';

import { cn } from '@/lib/utils';
import { useSocketContext } from '@/providers/socket-provider';
import { type ConversationStatus, type Message, useInboxStore } from '@/stores/inbox-store';
import {
  Check,
  CheckCheck,
  Info,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  messenger: 'bg-blue-500',
  email: 'bg-gray-500',
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  email: 'Email',
};

export default function InboxPage() {
  const { data: session } = useSession();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    selectedConversationId,
    conversationsLoading,
    conversationsError,
    filter,
    searchQuery,
    messages: _messages,
    messagesLoading,
    typingUsers,
    setConversations,
    selectConversation,
    setFilter,
    setSearchQuery,
    setConversationsLoading,
    setConversationsError,
    setMessages,
    addMessage,
    setMessagesLoading,
    getFilteredConversations,
    getSelectedConversation,
    getConversationMessages,
  } = useInboxStore();

  const {
    socket: _socket,
    isConnected,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping: _stopTyping,
  } = useSocketContext();

  const selectedConversation = getSelectedConversation();
  const filteredConversations = getFilteredConversations();
  const conversationMessages = selectedConversationId
    ? getConversationMessages(selectedConversationId)
    : [];

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!session?.user?.tenantId) return;

    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`${API_URL}/api/v1/conversations?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.user.tenantId,
          'x-user-id': session.user.id,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao carregar conversas');
      }

      const data = await response.json();

      // Transform API response to store format
      const transformedConversations = (data.conversations || []).map(
        (conv: {
          id: string;
          contact: {
            id: string;
            name: string;
            phone?: string;
            email?: string;
            avatarUrl?: string;
          } | null;
          channel: { type: string } | null;
          lastMessageAt: string;
          status: string;
          assigneeId?: string;
        }) => ({
          id: conv.id,
          contact: {
            id: conv.contact?.id || '',
            name: conv.contact?.name || 'Desconhecido',
            phone: conv.contact?.phone,
            email: conv.contact?.email,
            avatarUrl: conv.contact?.avatarUrl,
          },
          channel: conv.channel?.type || 'whatsapp',
          lastMessage: '', // Will be populated when selecting
          lastMessageAt: conv.lastMessageAt,
          unreadCount: 0, // TODO: Add unread count to API
          status: conv.status as ConversationStatus,
          assignedTo: conv.assigneeId,
        }),
      );

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversationsError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setConversationsLoading(false);
    }
  }, [session, filter, setConversations, setConversationsLoading, setConversationsError]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!session?.user?.tenantId) return;

      setMessagesLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/v1/messages/conversation/${conversationId}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': session.user.tenantId,
            'x-user-id': session.user.id,
          },
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar mensagens');
        }

        const data = await response.json();

        // Transform API response to store format
        const transformedMessages: Message[] = (data.messages || []).map(
          (msg: {
            id: string;
            content?: string;
            type: string;
            senderType: string;
            senderId?: string;
            createdAt: string;
            status: string;
            mediaUrl?: string;
          }) => ({
            id: msg.id,
            conversationId,
            content: msg.content || '',
            type: msg.type || 'text',
            sender: msg.senderType === 'user' ? 'user' : 'contact',
            senderName: msg.senderType === 'user' ? session.user?.name : undefined,
            timestamp: msg.createdAt,
            status: msg.status || 'sent',
            mediaUrl: msg.mediaUrl,
          }),
        );

        setMessages(conversationId, transformedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    },
    [session, setMessages, setMessagesLoading],
  );

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !session?.user?.tenantId) return;

    setSending(true);
    const content = messageInput;
    setMessageInput('');

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversationId,
      content,
      type: 'text',
      sender: 'user',
      senderName: session.user.name || undefined,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    addMessage(selectedConversationId, tempMessage);

    try {
      const response = await fetch(`${API_URL}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': session.user.tenantId,
          'x-user-id': session.user.id,
        },
        body: JSON.stringify({
          conversationId: selectedConversationId,
          type: 'text',
          content,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar mensagem');
      }

      // Socket will handle the real message update
    } catch (error) {
      console.error('Error sending message:', error);
      // TODO: Show error toast
    } finally {
      setSending(false);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      // Leave previous room
      if (selectedConversationId) {
        leaveConversation(selectedConversationId);
      }

      selectConversation(conversationId);
      joinConversation(conversationId);
      fetchMessages(conversationId);
    },
    [
      selectedConversationId,
      selectConversation,
      joinConversation,
      leaveConversation,
      fetchMessages,
    ],
  );

  // Handle typing
  const handleTyping = useCallback(() => {
    if (selectedConversationId) {
      startTyping(selectedConversationId);
    }
  }, [selectedConversationId, startTyping]);

  // Load conversations on mount and filter change
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Scroll to bottom when new messages arrive
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on message change is intentional
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) {
      return 'Ontem';
    }
    if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Get typing users for current conversation
  const currentTypingUsers = typingUsers.filter((t) => t.conversationId === selectedConversationId);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-6">
      {/* Conversations List */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        {/* Search & Filter */}
        <div className="border-b border-gray-800 p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full rounded-lg border border-gray-800 bg-gray-950 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'open', 'pending', 'resolved'] as const).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition',
                  filter === status
                    ? 'bg-v4-red-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white',
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

        {/* Connection Status */}
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500')}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <button
            type="button"
            onClick={fetchConversations}
            className="p-1 text-gray-500 hover:text-white transition"
            title="Atualizar"
          >
            <RefreshCw className={cn('h-4 w-4', conversationsLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : conversationsError ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-400">{conversationsError}</p>
              <button
                type="button"
                onClick={fetchConversations}
                className="mt-2 text-sm text-v4-red-500 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p className="text-sm">Nenhuma conversa encontrada</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                type="button"
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-gray-800 p-4 text-left transition hover:bg-gray-800',
                  selectedConversationId === conv.id && 'bg-gray-800',
                )}
              >
                {/* Avatar with channel indicator */}
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gray-700 flex items-center justify-center">
                    {conv.contact.avatarUrl ? (
                      <img
                        src={conv.contact.avatarUrl}
                        alt={conv.contact.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-medium text-white">
                        {conv.contact.name[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-gray-900',
                      channelColors[conv.channel],
                    )}
                    title={channelLabels[conv.channel]}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white truncate">{conv.contact.name}</span>
                    <span className="text-xs text-gray-500">{formatTime(conv.lastMessageAt)}</span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">
                    {conv.lastMessage || conv.contact.phone || 'Sem mensagens'}
                  </p>
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-v4-red-500 px-1.5 text-xs font-medium text-white">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
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
                  {selectedConversation.contact.avatarUrl ? (
                    <img
                      src={selectedConversation.contact.avatarUrl}
                      alt={selectedConversation.contact.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="font-medium text-white">
                      {selectedConversation.contact.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-gray-900',
                    channelColors[selectedConversation.channel],
                  )}
                />
              </div>
              <div>
                <h2 className="font-medium text-white">{selectedConversation.contact.name}</h2>
                <p className="text-sm text-gray-400">
                  {selectedConversation.contact.phone || selectedConversation.contact.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <Phone className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <Video className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <Info className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : conversationMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="h-12 w-12 mb-2" />
                <p>Nenhuma mensagem ainda</p>
                <p className="text-sm">Inicie a conversa enviando uma mensagem</p>
              </div>
            ) : (
              <>
                {conversationMessages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex',
                      message.sender === 'user' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2',
                        message.sender === 'user'
                          ? 'bg-v4-red-500 text-white'
                          : 'bg-gray-800 text-white',
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div
                        className={cn(
                          'mt-1 flex items-center justify-end gap-1 text-xs',
                          message.sender === 'user' ? 'text-white/70' : 'text-gray-500',
                        )}
                      >
                        <span>{formatTime(message.timestamp)}</span>
                        {message.sender === 'user' && (
                          <>
                            {message.status === 'sending' && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            {message.status === 'sent' && <Check className="h-3 w-3" />}
                            {message.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                            {message.status === 'read' && (
                              <CheckCheck className="h-3 w-3 text-blue-400" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}

            {/* Typing indicator */}
            {currentTypingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
                  <div
                    className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
                <span>
                  {currentTypingUsers.map((t) => t.userName).join(', ')} está digitando...
                </span>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-800 bg-gray-900 p-4">
            <div className="flex items-end gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <div className="flex-1">
                <textarea
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                />
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || sending}
                className="rounded-lg bg-v4-red-500 p-3 text-white hover:bg-v4-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-gray-950">
          <MessageSquare className="h-16 w-16 text-gray-700 mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">Selecione uma conversa</h2>
          <p className="text-gray-500">Escolha uma conversa da lista para começar a atender</p>
        </div>
      )}
    </div>
  );
}
