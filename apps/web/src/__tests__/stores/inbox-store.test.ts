import { beforeEach, describe, expect, it } from 'vitest';
import { useInboxStore, type Conversation, type Message } from '../../stores/inbox-store';

const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  contact: {
    id: 'contact-1',
    name: 'John Doe',
    phone: '+5511999999999',
  },
  channel: 'whatsapp',
  lastMessage: 'Hello!',
  lastMessageAt: new Date().toISOString(),
  unreadCount: 0,
  status: 'open',
  ...overrides,
});

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  content: 'Hello, world!',
  type: 'text',
  sender: 'contact',
  timestamp: new Date().toISOString(),
  status: 'delivered',
  ...overrides,
});

describe('InboxStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useInboxStore.setState({
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
    });
  });

  describe('Conversation Actions', () => {
    it('should set conversations', () => {
      const conversations = [createMockConversation()];
      useInboxStore.getState().setConversations(conversations);
      expect(useInboxStore.getState().conversations).toEqual(conversations);
    });

    it('should add conversation at the beginning', () => {
      const existing = createMockConversation({ id: 'conv-1' });
      const newConv = createMockConversation({ id: 'conv-2' });

      useInboxStore.getState().setConversations([existing]);
      useInboxStore.getState().addConversation(newConv);

      const { conversations } = useInboxStore.getState();
      expect(conversations).toHaveLength(2);
      expect(conversations[0]?.id).toBe('conv-2');
    });

    it('should update conversation', () => {
      const conv = createMockConversation();
      useInboxStore.getState().setConversations([conv]);
      useInboxStore.getState().updateConversation('conv-1', { status: 'resolved' });

      expect(useInboxStore.getState().conversations[0]?.status).toBe('resolved');
    });

    it('should not update non-existent conversation', () => {
      const conv = createMockConversation();
      useInboxStore.getState().setConversations([conv]);
      useInboxStore.getState().updateConversation('non-existent', { status: 'resolved' });

      expect(useInboxStore.getState().conversations[0]?.status).toBe('open');
    });

    it('should select conversation', () => {
      useInboxStore.getState().selectConversation('conv-1');
      expect(useInboxStore.getState().selectedConversationId).toBe('conv-1');
    });

    it('should deselect conversation with null', () => {
      useInboxStore.getState().selectConversation('conv-1');
      useInboxStore.getState().selectConversation(null);
      expect(useInboxStore.getState().selectedConversationId).toBeNull();
    });

    it('should set filter', () => {
      useInboxStore.getState().setFilter('pending');
      expect(useInboxStore.getState().filter).toBe('pending');
    });

    it('should set search query', () => {
      useInboxStore.getState().setSearchQuery('john');
      expect(useInboxStore.getState().searchQuery).toBe('john');
    });

    it('should set loading state', () => {
      useInboxStore.getState().setConversationsLoading(true);
      expect(useInboxStore.getState().conversationsLoading).toBe(true);
    });

    it('should set error state', () => {
      useInboxStore.getState().setConversationsError('Failed to load');
      expect(useInboxStore.getState().conversationsError).toBe('Failed to load');
    });
  });

  describe('Message Actions', () => {
    it('should set messages for conversation', () => {
      const messages = [createMockMessage()];
      useInboxStore.getState().setMessages('conv-1', messages);
      expect(useInboxStore.getState().messages['conv-1']).toEqual(messages);
    });

    it('should add message to conversation', () => {
      const msg1 = createMockMessage({ id: 'msg-1' });
      const msg2 = createMockMessage({ id: 'msg-2' });

      useInboxStore.getState().setMessages('conv-1', [msg1]);
      useInboxStore.getState().addMessage('conv-1', msg2);

      expect(useInboxStore.getState().messages['conv-1']).toHaveLength(2);
    });

    it('should add message to empty conversation', () => {
      const msg = createMockMessage();
      useInboxStore.getState().addMessage('conv-1', msg);
      expect(useInboxStore.getState().messages['conv-1']).toHaveLength(1);
    });

    it('should update message', () => {
      const msg = createMockMessage();
      useInboxStore.getState().setMessages('conv-1', [msg]);
      useInboxStore.getState().updateMessage('conv-1', 'msg-1', { status: 'read' });

      expect(useInboxStore.getState().messages['conv-1']?.[0]?.status).toBe('read');
    });

    it('should set messages loading state', () => {
      useInboxStore.getState().setMessagesLoading(true);
      expect(useInboxStore.getState().messagesLoading).toBe(true);
    });

    it('should set messages error state', () => {
      useInboxStore.getState().setMessagesError('Failed');
      expect(useInboxStore.getState().messagesError).toBe('Failed');
    });
  });

  describe('Typing Actions', () => {
    it('should add typing user', () => {
      const typingUser = {
        conversationId: 'conv-1',
        userId: 'user-1',
        userName: 'Agent',
      };
      useInboxStore.getState().addTypingUser(typingUser);
      expect(useInboxStore.getState().typingUsers).toContainEqual(typingUser);
    });

    it('should not duplicate typing user', () => {
      const typingUser = {
        conversationId: 'conv-1',
        userId: 'user-1',
        userName: 'Agent',
      };
      useInboxStore.getState().addTypingUser(typingUser);
      useInboxStore.getState().addTypingUser(typingUser);
      expect(useInboxStore.getState().typingUsers).toHaveLength(1);
    });

    it('should remove typing user', () => {
      const typingUser = {
        conversationId: 'conv-1',
        userId: 'user-1',
        userName: 'Agent',
      };
      useInboxStore.getState().addTypingUser(typingUser);
      useInboxStore.getState().removeTypingUser('conv-1', 'user-1');
      expect(useInboxStore.getState().typingUsers).toHaveLength(0);
    });

    it('should only remove specific typing user', () => {
      useInboxStore.getState().addTypingUser({
        conversationId: 'conv-1',
        userId: 'user-1',
        userName: 'Agent 1',
      });
      useInboxStore.getState().addTypingUser({
        conversationId: 'conv-1',
        userId: 'user-2',
        userName: 'Agent 2',
      });
      useInboxStore.getState().removeTypingUser('conv-1', 'user-1');
      expect(useInboxStore.getState().typingUsers).toHaveLength(1);
      expect(useInboxStore.getState().typingUsers[0]?.userId).toBe('user-2');
    });
  });

  describe('Computed Selectors', () => {
    describe('getFilteredConversations', () => {
      it('should return all conversations when filter is "all"', () => {
        const conversations = [
          createMockConversation({ id: 'conv-1', status: 'open' }),
          createMockConversation({ id: 'conv-2', status: 'pending' }),
        ];
        useInboxStore.getState().setConversations(conversations);

        expect(useInboxStore.getState().getFilteredConversations()).toHaveLength(2);
      });

      it('should filter by status', () => {
        const conversations = [
          createMockConversation({ id: 'conv-1', status: 'open' }),
          createMockConversation({ id: 'conv-2', status: 'pending' }),
          createMockConversation({ id: 'conv-3', status: 'open' }),
        ];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().setFilter('open');

        const filtered = useInboxStore.getState().getFilteredConversations();
        expect(filtered).toHaveLength(2);
        expect(filtered.every((c) => c.status === 'open')).toBe(true);
      });

      it('should filter by search query on contact name', () => {
        const conversations = [
          createMockConversation({
            id: 'conv-1',
            contact: { id: 'c1', name: 'John Doe' },
          }),
          createMockConversation({
            id: 'conv-2',
            contact: { id: 'c2', name: 'Jane Smith' },
          }),
        ];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().setSearchQuery('john');

        const filtered = useInboxStore.getState().getFilteredConversations();
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.contact.name).toBe('John Doe');
      });

      it('should filter by search query on phone', () => {
        const conversations = [
          createMockConversation({
            id: 'conv-1',
            contact: { id: 'c1', name: 'John', phone: '+5511999999999' },
          }),
          createMockConversation({
            id: 'conv-2',
            contact: { id: 'c2', name: 'Jane', phone: '+5511888888888' },
          }),
        ];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().setSearchQuery('9999');

        const filtered = useInboxStore.getState().getFilteredConversations();
        expect(filtered).toHaveLength(1);
      });

      it('should filter by search query on last message', () => {
        const conversations = [
          createMockConversation({ id: 'conv-1', lastMessage: 'Hello there!' }),
          createMockConversation({ id: 'conv-2', lastMessage: 'Goodbye' }),
        ];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().setSearchQuery('hello');

        const filtered = useInboxStore.getState().getFilteredConversations();
        expect(filtered).toHaveLength(1);
      });

      it('should combine filter and search', () => {
        const conversations = [
          createMockConversation({
            id: 'conv-1',
            status: 'open',
            contact: { id: 'c1', name: 'John' },
          }),
          createMockConversation({
            id: 'conv-2',
            status: 'pending',
            contact: { id: 'c2', name: 'John' },
          }),
        ];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().setFilter('open');
        useInboxStore.getState().setSearchQuery('john');

        const filtered = useInboxStore.getState().getFilteredConversations();
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.id).toBe('conv-1');
      });
    });

    describe('getSelectedConversation', () => {
      it('should return selected conversation', () => {
        const conversations = [
          createMockConversation({ id: 'conv-1' }),
          createMockConversation({ id: 'conv-2' }),
        ];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().selectConversation('conv-2');

        const selected = useInboxStore.getState().getSelectedConversation();
        expect(selected?.id).toBe('conv-2');
      });

      it('should return undefined when no selection', () => {
        expect(useInboxStore.getState().getSelectedConversation()).toBeUndefined();
      });

      it('should return undefined for invalid selection', () => {
        const conversations = [createMockConversation({ id: 'conv-1' })];
        useInboxStore.getState().setConversations(conversations);
        useInboxStore.getState().selectConversation('non-existent');

        expect(useInboxStore.getState().getSelectedConversation()).toBeUndefined();
      });
    });

    describe('getConversationMessages', () => {
      it('should return messages for conversation', () => {
        const messages = [createMockMessage(), createMockMessage({ id: 'msg-2' })];
        useInboxStore.getState().setMessages('conv-1', messages);

        expect(useInboxStore.getState().getConversationMessages('conv-1')).toEqual(messages);
      });

      it('should return empty array for unknown conversation', () => {
        expect(useInboxStore.getState().getConversationMessages('unknown')).toEqual([]);
      });
    });
  });
});
