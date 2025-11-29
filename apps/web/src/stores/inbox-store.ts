import { create } from 'zustand';

export type ConversationStatus = 'open' | 'pending' | 'resolved' | 'spam';
export type ChannelType = 'whatsapp' | 'instagram' | 'messenger' | 'email';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  channel: ChannelType;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: ConversationStatus;
  assignedTo?: string;
  tags?: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'file';
  sender: 'contact' | 'user';
  senderName?: string;
  timestamp: string;
  status: MessageStatus;
  mediaUrl?: string;
}

export interface TypingUser {
  conversationId: string;
  userId: string;
  userName: string;
}

interface InboxState {
  // Conversations
  conversations: Conversation[];
  selectedConversationId: string | null;
  conversationsLoading: boolean;
  conversationsError: string | null;
  filter: 'all' | ConversationStatus;
  searchQuery: string;

  // Messages
  messages: Record<string, Message[]>;
  messagesLoading: boolean;
  messagesError: string | null;

  // Typing indicators
  typingUsers: TypingUser[];

  // Actions - Conversations
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  selectConversation: (id: string | null) => void;
  setFilter: (filter: 'all' | ConversationStatus) => void;
  setSearchQuery: (query: string) => void;
  setConversationsLoading: (loading: boolean) => void;
  setConversationsError: (error: string | null) => void;

  // Actions - Messages
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  setMessagesLoading: (loading: boolean) => void;
  setMessagesError: (error: string | null) => void;

  // Actions - Typing
  addTypingUser: (typingUser: TypingUser) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;

  // Computed
  getFilteredConversations: () => Conversation[];
  getSelectedConversation: () => Conversation | undefined;
  getConversationMessages: (conversationId: string) => Message[];
}

export const useInboxStore = create<InboxState>((set, get) => ({
  // Initial state
  conversations: [],
  selectedConversationId: null,
  conversationsLoading: false,
  conversationsError: null,
  filter: 'all',
  searchQuery: '',

  messages: {},
  messagesLoading: false,
  messagesError: null,

  typingUsers: [],

  // Conversation actions
  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv,
      ),
    })),

  selectConversation: (id) => set({ selectedConversationId: id }),

  setFilter: (filter) => set({ filter }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setConversationsLoading: (loading) => set({ conversationsLoading: loading }),

  setConversationsError: (error) => set({ conversationsError: error }),

  // Message actions
  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] || []), message],
      },
    })),

  updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg,
        ),
      },
    })),

  setMessagesLoading: (loading) => set({ messagesLoading: loading }),

  setMessagesError: (error) => set({ messagesError: error }),

  // Typing actions
  addTypingUser: (typingUser) =>
    set((state) => {
      const exists = state.typingUsers.some(
        (t) => t.conversationId === typingUser.conversationId && t.userId === typingUser.userId,
      );
      if (exists) return state;
      return { typingUsers: [...state.typingUsers, typingUser] };
    }),

  removeTypingUser: (conversationId, userId) =>
    set((state) => ({
      typingUsers: state.typingUsers.filter(
        (t) => !(t.conversationId === conversationId && t.userId === userId),
      ),
    })),

  // Computed
  getFilteredConversations: () => {
    const { conversations, filter, searchQuery } = get();

    return conversations.filter((conv) => {
      // Filter by status
      if (filter !== 'all' && conv.status !== filter) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          conv.contact.name.toLowerCase().includes(query) ||
          conv.contact.phone?.toLowerCase().includes(query) ||
          conv.lastMessage.toLowerCase().includes(query)
        );
      }

      return true;
    });
  },

  getSelectedConversation: () => {
    const { conversations, selectedConversationId } = get();
    return conversations.find((conv) => conv.id === selectedConversationId);
  },

  getConversationMessages: (conversationId) => {
    return get().messages[conversationId] || [];
  },
}));
