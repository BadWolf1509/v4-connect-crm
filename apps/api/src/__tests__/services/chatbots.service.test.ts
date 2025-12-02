import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockChatbots = [
  {
    id: 'chatbot-1',
    tenantId: 'test-tenant',
    name: 'Welcome Bot',
    description: 'Welcomes new users',
    channelId: 'channel-1',
    isActive: true,
    triggerType: 'keyword',
    triggerConfig: { keywords: ['oi', 'olá'] },
    createdAt: new Date(),
    channel: { id: 'channel-1', name: 'WhatsApp', type: 'whatsapp' },
    nodes: [
      { id: 'node-1', type: 'start', name: 'Início', config: {}, position: { x: 250, y: 50 } },
    ],
    edges: [],
  },
];

const mockNodes = [
  {
    id: 'node-1',
    chatbotId: 'chatbot-1',
    type: 'start',
    name: 'Início',
    config: {},
    position: { x: 250, y: 50 },
    order: 0,
  },
  {
    id: 'node-2',
    chatbotId: 'chatbot-1',
    type: 'message',
    name: 'Welcome Message',
    config: { content: 'Hello!' },
    position: { x: 250, y: 150 },
    order: 1,
  },
];

const mockEdges = [
  {
    id: 'edge-1',
    chatbotId: 'chatbot-1',
    sourceId: 'node-1',
    targetId: 'node-2',
    label: null,
    condition: null,
  },
];

const mockQuery = {
  chatbots: {
    findMany: vi.fn(async () => mockChatbots),
    findFirst: vi.fn(async () => mockChatbots[0]),
  },
};

const dbChains = {
  select: vi.fn(() => dbChains),
  from: vi.fn(() => dbChains),
  where: vi.fn(() => dbChains),
  orderBy: vi.fn(async () => mockChatbots),
  limit: vi.fn(async () => [mockChatbots[0]]),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(async () => [mockChatbots[0]]),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(async () => [mockChatbots[0]]),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(async () => undefined),
  })),
  query: mockQuery,
};

vi.mock('@v4-connect/database', () => ({
  db: {
    ...dbChains,
    query: mockQuery,
  },
}));

vi.mock('@v4-connect/database/schema', () => ({
  chatbots: {
    id: 'id',
    tenantId: 'tenant_id',
    name: 'name',
    description: 'description',
    channelId: 'channel_id',
    isActive: 'is_active',
    triggerType: 'trigger_type',
    triggerConfig: 'trigger_config',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  flowNodes: {
    id: 'id',
    chatbotId: 'chatbot_id',
    type: 'type',
    name: 'name',
    config: 'config',
    position: 'position',
    order: 'order',
    updatedAt: 'updated_at',
  },
  flowEdges: {
    id: 'id',
    chatbotId: 'chatbot_id',
    sourceId: 'source_id',
    targetId: 'target_id',
    label: 'label',
    condition: 'condition',
  },
}));

const { chatbotsService } = await import('../../services/chatbots.service');

describe('Chatbots Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns all chatbots for tenant with channel and nodes', async () => {
      const result = await chatbotsService.findAll('test-tenant');

      expect(result.chatbots).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQuery.chatbots.findMany).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('returns chatbot with nodes and edges', async () => {
      const result = await chatbotsService.findById('chatbot-1', 'test-tenant');

      expect(result).not.toBeNull();
      expect(mockQuery.chatbots.findFirst).toHaveBeenCalled();
    });

    it('returns undefined when chatbot not found', async () => {
      mockQuery.chatbots.findFirst.mockResolvedValueOnce(undefined);

      const result = await chatbotsService.findById('non-existent', 'test-tenant');

      expect(result).toBeUndefined();
    });
  });

  describe('create', () => {
    it('creates chatbot with default start node', async () => {
      const data = {
        tenantId: 'test-tenant',
        name: 'New Bot',
        description: 'A new chatbot',
        channelId: 'channel-1',
      };

      const result = await chatbotsService.create(data);

      expect(result).not.toBeNull();
      // Should create chatbot and then start node
      expect(dbChains.insert).toHaveBeenCalledTimes(2);
    });

    it('uses default trigger type when not provided', async () => {
      const data = {
        tenantId: 'test-tenant',
        name: 'Bot without trigger',
      };

      const result = await chatbotsService.create(data);

      expect(result).not.toBeNull();
    });
  });

  describe('update', () => {
    it('updates chatbot fields', async () => {
      const result = await chatbotsService.update('chatbot-1', 'test-tenant', {
        name: 'Updated Bot',
        isActive: false,
      });

      expect(result).not.toBeNull();
      expect(dbChains.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes chatbot', async () => {
      await chatbotsService.delete('chatbot-1', 'test-tenant');

      expect(dbChains.delete).toHaveBeenCalled();
    });
  });

  describe('toggleActive', () => {
    it('toggles chatbot active state', async () => {
      const result = await chatbotsService.toggleActive('chatbot-1', 'test-tenant', false);

      expect(result).not.toBeNull();
      expect(dbChains.update).toHaveBeenCalled();
    });
  });

  describe('addNode', () => {
    it('adds node to chatbot', async () => {
      dbChains.insert.mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [mockNodes[1]]),
        })),
      }));

      const result = await chatbotsService.addNode('chatbot-1', {
        type: 'message',
        name: 'New Message',
        config: { content: 'Hello!' },
        position: { x: 100, y: 200 },
      });

      expect(result).not.toBeNull();
      expect(result.type).toBe('message');
    });

    it('uses default position when not provided', async () => {
      dbChains.insert.mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{ ...mockNodes[0], position: { x: 0, y: 0 } }]),
        })),
      }));

      const result = await chatbotsService.addNode('chatbot-1', {
        type: 'action',
      });

      expect(result).not.toBeNull();
    });
  });

  describe('updateNode', () => {
    it('updates node fields', async () => {
      dbChains.update.mockImplementationOnce(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(async () => [{ ...mockNodes[0], name: 'Updated Node' }]),
          })),
        })),
      }));

      const result = await chatbotsService.updateNode('node-1', {
        name: 'Updated Node',
        config: { content: 'Updated content' },
      });

      expect(result).not.toBeNull();
      expect(result.name).toBe('Updated Node');
    });
  });

  describe('deleteNode', () => {
    it('deletes node', async () => {
      await chatbotsService.deleteNode('node-1');

      expect(dbChains.delete).toHaveBeenCalled();
    });
  });

  describe('addEdge', () => {
    it('adds edge to chatbot', async () => {
      dbChains.insert.mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [mockEdges[0]]),
        })),
      }));

      const result = await chatbotsService.addEdge('chatbot-1', {
        sourceId: 'node-1',
        targetId: 'node-2',
        label: 'Next',
      });

      expect(result).not.toBeNull();
      expect(result.sourceId).toBe('node-1');
      expect(result.targetId).toBe('node-2');
    });

    it('adds edge with condition', async () => {
      dbChains.insert.mockImplementationOnce(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(async () => [{
            ...mockEdges[0],
            condition: { operator: 'equals', value: 'yes' },
          }]),
        })),
      }));

      const result = await chatbotsService.addEdge('chatbot-1', {
        sourceId: 'node-1',
        targetId: 'node-2',
        condition: { operator: 'equals', value: 'yes' },
      });

      expect(result).not.toBeNull();
      expect(result.condition).toBeDefined();
    });
  });

  describe('deleteEdge', () => {
    it('deletes edge', async () => {
      await chatbotsService.deleteEdge('edge-1');

      expect(dbChains.delete).toHaveBeenCalled();
    });
  });
});
