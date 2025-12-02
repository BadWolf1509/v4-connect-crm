'use client';

import {
  ContactPanel,
  MediaUpload,
  NewConversationModal,
  QuickReplies,
  TransferModal,
} from '@/components/inbox';
import { useApi } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useSocketContext } from '@/providers/socket-provider';
import { type ConversationStatus, type Message, useInboxStore } from '@/stores/inbox-store';
import {
  Archive,
  Ban,
  Check,
  CheckCheck,
  Download,
  Info,
  Loader2,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  Smile,
  Video,
  Zap,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  messenger: 'bg-blue-500',
  email: 'bg-gray-500',
};

// Common emojis for quick selection
const commonEmojis = [
  '😊',
  '😂',
  '🙂',
  '😉',
  '👍',
  '👋',
  '🎉',
  '❤️',
  '🙏',
  '✅',
  '👏',
  '🔥',
  '💯',
  '✨',
  '🤝',
  '💪',
  '🚀',
  '⭐',
  '💡',
  '📌',
];

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  email: 'Email',
};

export default function InboxPage() {
  const { data: session } = useSession();
  const { api, isAuthenticated } = useApi();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showContactPanel, setShowContactPanel] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    updateConversation,
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

  // Socket context - must be before any useCallback that uses these
  const {
    socket: _socket,
    isConnected,
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
  } = useSocketContext();

  const selectedConversation = getSelectedConversation();
  const filteredConversations = getFilteredConversations();
  const conversationMessages = selectedConversationId
    ? getConversationMessages(selectedConversationId)
    : [];

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;

    setConversationsLoading(true);
    setConversationsError(null);

    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') {
        params.status = filter;
      }

      const data = await api.get<{
        conversations: Array<{
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
          unreadCount?: number;
        }>;
      }>('/conversations', { params });

      // Transform API response to store format
      const transformedConversations = (data.conversations || []).map((conv) => ({
        id: conv.id,
        contact: {
          id: conv.contact?.id || '',
          name: conv.contact?.name || 'Desconhecido',
          phone: conv.contact?.phone,
          email: conv.contact?.email,
          avatarUrl: conv.contact?.avatarUrl,
        },
        channel: (conv.channel?.type || 'whatsapp') as
          | 'whatsapp'
          | 'instagram'
          | 'messenger'
          | 'email',
        lastMessage: '', // Will be populated when selecting
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount || 0,
        status: conv.status as ConversationStatus,
        assignedTo: conv.assigneeId,
      }));

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversationsError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setConversationsLoading(false);
    }
  }, [
    api,
    isAuthenticated,
    filter,
    setConversations,
    setConversationsLoading,
    setConversationsError,
  ]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!isAuthenticated) return;

      setMessagesLoading(true);

      try {
        const data = await api.get<{
          messages: Array<{
            id: string;
            content?: string;
            type: string;
            senderType: string;
            senderId?: string;
            createdAt: string;
            status: string;
            mediaUrl?: string;
          }>;
        }>(`/messages/conversation/${conversationId}`);

        // Transform API response to store format
        const transformedMessages: Message[] = (data.messages || []).map((msg) => ({
          id: msg.id,
          conversationId,
          content: msg.content || '',
          type: (msg.type || 'text') as 'text' | 'image' | 'audio' | 'video' | 'file',
          sender: msg.senderType === 'user' ? ('user' as const) : ('contact' as const),
          senderName: msg.senderType === 'user' ? session?.user?.name : undefined,
          timestamp: msg.createdAt,
          status: (msg.status || 'sent') as 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
          mediaUrl: msg.mediaUrl,
        }));

        setMessages(conversationId, transformedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setMessagesLoading(false);
      }
    },
    [api, isAuthenticated, session, setMessages, setMessagesLoading],
  );

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId || !isAuthenticated) return;

    // Stop typing indicator when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

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
      senderName: session?.user?.name || undefined,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    addMessage(selectedConversationId, tempMessage);

    try {
      await api.post('/messages', {
        conversationId: selectedConversationId,
        type: 'text',
        content,
      });

      // Socket will handle the real message update
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem', {
        description: error instanceof Error ? error.message : 'Tente novamente',
      });
    } finally {
      setSending(false);
    }
  };

  // Handle conversation selection
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      // Stop typing in previous conversation
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

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

  const handleTyping = useCallback(() => {
    if (!selectedConversationId) return;

    // Start typing indicator
    startTyping(selectedConversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(selectedConversationId);
    }, 2000);
  }, [selectedConversationId, startTyping, stopTyping]);

  // Handle quick reply selection
  const handleQuickReplySelect = useCallback((content: string) => {
    setMessageInput(content);
    setShowQuickReplies(false);
  }, []);

  // Handle conversation status change (persisted to API)
  const handleStatusChange = useCallback(
    async (status: ConversationStatus) => {
      if (!selectedConversationId) return;

      // Optimistic update
      updateConversation(selectedConversationId, { status });

      try {
        await api.patch(`/conversations/${selectedConversationId}`, { status });
        toast.success(
          `Conversa ${status === 'resolved' ? 'resolvida' : status === 'pending' ? 'marcada como pendente' : 'aberta'}`,
        );
      } catch (error) {
        // Rollback on error
        const previousStatus = selectedConversation?.status || 'open';
        updateConversation(selectedConversationId, {
          status: previousStatus as ConversationStatus,
        });
        toast.error('Erro ao atualizar status da conversa');
        console.error('Status update error:', error);
      }
    },
    [selectedConversationId, updateConversation, api, selectedConversation?.status],
  );

  // Handle archive conversation
  const handleArchiveConversation = useCallback(async () => {
    if (!selectedConversationId) return;
    setShowConversationMenu(false);

    try {
      await api.patch(`/conversations/${selectedConversationId}`, { status: 'resolved' });
      updateConversation(selectedConversationId, { status: 'resolved' });
      toast.success('Conversa arquivada');
    } catch (error) {
      toast.error('Erro ao arquivar conversa');
      console.error('Archive error:', error);
    }
  }, [selectedConversationId, api, updateConversation]);

  // Handle block contact
  const handleBlockContact = useCallback(async () => {
    if (!selectedConversation?.contact?.id) return;
    setShowConversationMenu(false);

    try {
      await api.patch(`/contacts/${selectedConversation.contact.id}`, { isBlocked: true });
      toast.success('Contato bloqueado');
    } catch (error) {
      toast.error('Erro ao bloquear contato');
      console.error('Block error:', error);
    }
  }, [selectedConversation?.contact?.id, api]);

  // Handle export conversation
  const handleExportConversation = useCallback(() => {
    if (!conversationMessages.length) {
      toast.error('Nenhuma mensagem para exportar');
      return;
    }
    setShowConversationMenu(false);

    // Create text content for export
    const contactName = selectedConversation?.contact?.name || 'Desconhecido';
    const exportContent = conversationMessages
      .map((msg) => {
        const sender = msg.sender === 'user' ? 'Você' : contactName;
        const time = new Date(msg.timestamp).toLocaleString('pt-BR');
        return `[${time}] ${sender}: ${msg.content}`;
      })
      .join('\n');

    // Create and download file
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-${contactName}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Conversa exportada');
  }, [conversationMessages, selectedConversation?.contact?.name]);

  // Handle message input change with quick reply detection
  const handleInputChange = useCallback((value: string) => {
    setMessageInput(value);
    // Show quick replies when typing starts with /
    if (value.startsWith('/')) {
      setShowQuickReplies(true);
    } else {
      setShowQuickReplies(false);
    }
  }, []);

  // Handle file upload completion
  const handleFileUploaded = useCallback(
    (file: { url: string; type: string; filename: string }) => {
      if (!selectedConversationId) return;

      // Add message with the uploaded file
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: selectedConversationId,
        content: file.filename,
        type: file.type as 'image' | 'audio' | 'video' | 'file',
        sender: 'user',
        senderName: session?.user?.name || undefined,
        timestamp: new Date().toISOString(),
        status: 'sent',
        mediaUrl: file.url,
      };
      addMessage(selectedConversationId, tempMessage);
      setShowMediaUpload(false);
    },
    [selectedConversationId, session, addMessage],
  );

  // Handle new conversation created
  const handleNewConversationCreated = useCallback(
    (conversationId: string) => {
      fetchConversations().then(() => {
        handleSelectConversation(conversationId);
      });
    },
    [fetchConversations, handleSelectConversation],
  );

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
          <div className="flex flex-wrap gap-2">
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

        {/* Connection Status & New Conversation */}
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn('h-2 w-2 rounded-full', isConnected ? 'bg-green-500' : 'bg-red-500')}
            />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowNewConversationModal(true)}
              className="flex items-center gap-1 rounded-lg bg-v4-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-v4-red-600 transition"
              title="Nova conversa"
            >
              <Plus className="h-3 w-3" />
              Nova
            </button>
            <button
              type="button"
              onClick={fetchConversations}
              className="p-1 text-gray-500 hover:text-white transition"
              title="Atualizar"
            >
              <RefreshCw className={cn('h-4 w-4', conversationsLoading && 'animate-spin')} />
            </button>
          </div>
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
        <>
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
                  onClick={() =>
                    toast.info('Chamada de voz', {
                      description: 'Funcionalidade em desenvolvimento',
                    })
                  }
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  title="Chamada de voz"
                >
                  <Phone className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Videochamada', { description: 'Funcionalidade em desenvolvimento' })
                  }
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  title="Videochamada"
                >
                  <Video className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowContactPanel(!showContactPanel)}
                  className={cn(
                    'rounded-lg p-2 transition',
                    showContactPanel
                      ? 'bg-v4-red-500 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )}
                >
                  <Info className="h-5 w-5" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowConversationMenu(!showConversationMenu)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {showConversationMenu && (
                    <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-800 bg-gray-950 py-1 shadow-lg z-50">
                      <button
                        type="button"
                        onClick={handleArchiveConversation}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar conversa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleStatusChange('pending');
                          setShowConversationMenu(false);
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Marcar como spam
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockContact}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                      >
                        <Ban className="h-4 w-4" />
                        Bloquear contato
                      </button>
                      <div className="border-t border-gray-800 my-1" />
                      <button
                        type="button"
                        onClick={handleExportConversation}
                        className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
                      >
                        <Download className="h-4 w-4" />
                        Exportar conversa
                      </button>
                    </div>
                  )}
                </div>
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
              <div className="relative flex items-end gap-3">
                {/* Quick Replies Popup */}
                {showQuickReplies && (
                  <QuickReplies
                    onSelect={handleQuickReplySelect}
                    onClose={() => setShowQuickReplies(false)}
                    searchTerm={messageInput.slice(1)}
                  />
                )}

                {/* Media Upload Popup */}
                {showMediaUpload && selectedConversationId && (
                  <MediaUpload
                    conversationId={selectedConversationId}
                    onFileUploaded={handleFileUploaded}
                    onClose={() => setShowMediaUpload(false)}
                  />
                )}

                <button
                  type="button"
                  onClick={() => setShowMediaUpload(!showMediaUpload)}
                  className={cn(
                    'rounded-lg p-2 transition',
                    showMediaUpload
                      ? 'bg-v4-red-500 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className={cn(
                    'rounded-lg p-2 transition',
                    showQuickReplies
                      ? 'bg-v4-red-500 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                  )}
                  title="Respostas rápidas (digite /)"
                >
                  <Zap className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => {
                      handleInputChange(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                      if (e.key === 'Escape') {
                        setShowQuickReplies(false);
                      }
                    }}
                    placeholder="Digite sua mensagem... (/ para respostas rápidas)"
                    rows={1}
                    className="w-full resize-none rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-v4-red-500 focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={cn(
                      'rounded-lg p-2 transition',
                      showEmojiPicker
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                    )}
                    title="Emojis"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 p-2 rounded-lg bg-gray-900 border border-gray-800 shadow-xl">
                      <div className="grid grid-cols-10 gap-1">
                        {commonEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setMessageInput((prev) => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="p-1 text-lg hover:bg-gray-800 rounded transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

          {/* Contact Panel */}
          {showContactPanel && (
            <ContactPanel
              conversation={selectedConversation}
              onClose={() => setShowContactPanel(false)}
              onStatusChange={handleStatusChange}
              onTransfer={() => setShowTransferModal(true)}
            />
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center bg-gray-950">
          <MessageSquare className="h-16 w-16 text-gray-700 mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">Selecione uma conversa</h2>
          <p className="text-gray-500">Escolha uma conversa da lista para começar a atender</p>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedConversationId && (
        <TransferModal
          conversationId={selectedConversationId}
          onClose={() => setShowTransferModal(false)}
          onTransferred={() => {
            fetchConversations();
            setShowTransferModal(false);
          }}
        />
      )}

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <NewConversationModal
          onClose={() => setShowNewConversationModal(false)}
          onCreated={handleNewConversationCreated}
        />
      )}
    </div>
  );
}
