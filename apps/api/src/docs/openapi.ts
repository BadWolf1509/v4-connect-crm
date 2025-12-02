import { Hono } from 'hono';
import type { AppType } from '../middleware/auth';

const docsRoutes = new Hono<AppType>();

// OpenAPI 3.0 specification
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'V4 Connect CRM API',
    description: `
API do V4 Connect CRM - Sistema de atendimento omnichannel com CRM integrado.

## Autenticação

Todas as rotas (exceto /auth/login e /auth/register) requerem autenticação via JWT Bearer token.

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Rate Limiting

- 100 requests por minuto para rotas autenticadas
- 10 requests por minuto para rotas de autenticação

## Recursos Principais

- **Auth**: Autenticação e gerenciamento de sessão
- **Conversations**: Conversas do inbox omnichannel
- **Contacts**: Gerenciamento de contatos
- **Channels**: Canais de comunicação (WhatsApp, Instagram, Messenger)
- **Deals**: Pipeline de CRM
- **Campaigns**: Campanhas de mensagens em massa
- **Chatbots**: Automação de atendimento
- **Analytics**: Métricas e relatórios
    `,
    version: '1.0.0',
    contact: {
      name: 'V4 Company',
      url: 'https://v4company.com',
      email: 'suporte@v4company.com',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: 'http://localhost:3002',
      description: 'Development server',
    },
    {
      url: 'https://api.v4connect.com.br',
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Autenticação e sessão' },
    { name: 'Conversations', description: 'Conversas do inbox' },
    { name: 'Messages', description: 'Mensagens das conversas' },
    { name: 'Contacts', description: 'Gerenciamento de contatos' },
    { name: 'Channels', description: 'Canais de comunicação' },
    { name: 'Deals', description: 'Pipeline de CRM' },
    { name: 'Pipelines', description: 'Configuração de pipelines' },
    { name: 'Campaigns', description: 'Campanhas de mensagens' },
    { name: 'Chatbots', description: 'Automação de atendimento' },
    { name: 'Automations', description: 'Triggers e automações' },
    { name: 'Analytics', description: 'Métricas e relatórios' },
    { name: 'Teams', description: 'Gestão de equipes' },
    { name: 'Users', description: 'Gerenciamento de usuários' },
    { name: 'Tags', description: 'Tags para contatos' },
    { name: 'Quick Replies', description: 'Respostas rápidas' },
    { name: 'Notifications', description: 'Notificações' },
    { name: 'Settings', description: 'Configurações' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via /auth/login',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'integer' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['owner', 'admin', 'agent'] },
          avatarUrl: { type: 'string', nullable: true },
          tenantId: { type: 'string', format: 'uuid' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['open', 'pending', 'resolved', 'snoozed'] },
          contactId: { type: 'string', format: 'uuid' },
          channelId: { type: 'string', format: 'uuid' },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          lastMessageAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          conversationId: { type: 'string', format: 'uuid' },
          content: { type: 'string', nullable: true },
          type: {
            type: 'string',
            enum: ['text', 'image', 'video', 'audio', 'document', 'location', 'sticker'],
          },
          direction: { type: 'string', enum: ['inbound', 'outbound'] },
          senderType: { type: 'string', enum: ['contact', 'user', 'bot'] },
          senderId: { type: 'string', format: 'uuid', nullable: true },
          mediaUrl: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['pending', 'sent', 'delivered', 'read', 'failed'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', nullable: true },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Channel: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['whatsapp', 'instagram', 'messenger', 'email', 'webchat'],
          },
          provider: { type: 'string', enum: ['evolution', 'meta', 'internal'] },
          isActive: { type: 'boolean' },
          config: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Deal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          value: { type: 'number' },
          stageId: { type: 'string', format: 'uuid' },
          contactId: { type: 'string', format: 'uuid', nullable: true },
          assigneeId: { type: 'string', format: 'uuid', nullable: true },
          expectedCloseDate: { type: 'string', format: 'date', nullable: true },
          probability: { type: 'integer', minimum: 0, maximum: 100 },
          status: { type: 'string', enum: ['open', 'won', 'lost'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Campaign: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          status: {
            type: 'string',
            enum: ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'],
          },
          channelId: { type: 'string', format: 'uuid' },
          content: { type: 'string', nullable: true },
          templateId: { type: 'string', nullable: true },
          scheduledAt: { type: 'string', format: 'date-time', nullable: true },
          stats: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              sent: { type: 'integer' },
              delivered: { type: 'integer' },
              read: { type: 'integer' },
              failed: { type: 'integer' },
            },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Chatbot: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          channelId: { type: 'string', format: 'uuid', nullable: true },
          isActive: { type: 'boolean' },
          triggerType: { type: 'string', enum: ['keyword', 'always', 'schedule'] },
          triggerConfig: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Automation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          triggerType: { type: 'string' },
          triggerConfig: { type: 'object' },
          conditions: { type: 'array', items: { type: 'object' } },
          actions: { type: 'array', items: { type: 'object' } },
          status: { type: 'string', enum: ['active', 'paused'] },
          priority: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AnalyticsOverview: {
        type: 'object',
        properties: {
          totalConversations: { type: 'integer' },
          openConversations: { type: 'integer' },
          pendingConversations: { type: 'integer' },
          resolvedConversations: { type: 'integer' },
          totalContacts: { type: 'integer' },
          totalMessages: { type: 'integer' },
          activeChannels: { type: 'integer' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Token JWT inválido ou ausente',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Recurso não encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      BadRequest: {
        description: 'Requisição inválida',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // Auth
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login de usuário',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login bem-sucedido',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registro de novo tenant e usuário',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'tenantName'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                  tenantName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Registro bem-sucedido',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                    token: { type: 'string' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obter usuário atual',
        responses: {
          200: {
            description: 'Dados do usuário',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    // Conversations
    '/conversations': {
      get: {
        tags: ['Conversations'],
        summary: 'Listar conversas',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['open', 'pending', 'resolved', 'snoozed'] },
          },
          { name: 'assigneeId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'channelId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Lista de conversas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    conversations: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Conversation' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/conversations/{id}': {
      get: {
        tags: ['Conversations'],
        summary: 'Obter conversa por ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: {
            description: 'Dados da conversa',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Conversation' },
              },
            },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/conversations/{id}/assign': {
      patch: {
        tags: ['Conversations'],
        summary: 'Atribuir conversa a um usuário',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  assigneeId: { type: 'string', format: 'uuid', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Conversa atribuída' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    // Messages
    '/messages': {
      post: {
        tags: ['Messages'],
        summary: 'Enviar mensagem',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['conversationId', 'content'],
                properties: {
                  conversationId: { type: 'string', format: 'uuid' },
                  content: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['text', 'image', 'video', 'audio', 'document'],
                    default: 'text',
                  },
                  mediaUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Mensagem enviada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Message' },
              },
            },
          },
        },
      },
    },
    // Analytics
    '/analytics/overview': {
      get: {
        tags: ['Analytics'],
        summary: 'Obter métricas gerais',
        responses: {
          200: {
            description: 'Métricas do dashboard',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AnalyticsOverview' },
              },
            },
          },
        },
      },
    },
    '/analytics/agents': {
      get: {
        tags: ['Analytics'],
        summary: 'Performance dos agentes',
        parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }],
        responses: {
          200: {
            description: 'Métricas dos agentes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          userId: { type: 'string' },
                          userName: { type: 'string' },
                          conversationsHandled: { type: 'integer' },
                          conversationsResolved: { type: 'integer' },
                          messagesSent: { type: 'integer' },
                          averageResponseTime: { type: 'integer' },
                          resolutionRate: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/analytics/campaigns': {
      get: {
        tags: ['Analytics'],
        summary: 'Métricas de campanhas',
        parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }],
        responses: {
          200: {
            description: 'Métricas de campanhas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    totalCampaigns: { type: 'integer' },
                    activeCampaigns: { type: 'integer' },
                    completedCampaigns: { type: 'integer' },
                    totalMessagesSent: { type: 'integer' },
                    deliveryRate: { type: 'integer' },
                    readRate: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/analytics/export/{type}': {
      get: {
        tags: ['Analytics'],
        summary: 'Exportar relatório',
        parameters: [
          {
            name: 'type',
            in: 'path',
            required: true,
            schema: { type: 'string', enum: ['overview', 'conversations', 'agents', 'campaigns'] },
          },
          {
            name: 'format',
            in: 'query',
            schema: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          },
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
        ],
        responses: {
          200: {
            description: 'Dados do relatório',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { type: 'object' } },
                    exportedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              'text/csv': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};

// Swagger UI HTML
const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>V4 Connect CRM API - Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
  <style>
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 36px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: 'BaseLayout'
      });
    };
  </script>
</body>
</html>
`;

// Routes
docsRoutes.get('/', (c) => {
  return c.html(swaggerHtml);
});

docsRoutes.get('/openapi.json', (c) => {
  return c.json(openApiSpec);
});

export { docsRoutes };
