// ===========================================
// V4 Connect CRM - Zod Validators
// ===========================================

import { z } from 'zod';

// ============ Common ============

export const idSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============ Auth ============

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve ter ao menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve ter ao menos um número'),
  tenantName: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
});

export const inviteUserSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'agent']),
  teamIds: z.array(z.string().uuid()).optional(),
});

// ============ Contacts ============

export const createContactSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{10,14}$/, 'Telefone inválido')
    .optional()
    .nullable(),
  email: z.string().email('Email inválido').optional().nullable(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
});

export const updateContactSchema = createContactSchema.partial();

export const importContactsSchema = z.object({
  contacts: z.array(createContactSchema).min(1).max(10000),
  tags: z.array(z.string()).optional(),
  skipDuplicates: z.boolean().default(true),
});

// ============ Conversations ============

export const conversationStatusSchema = z.enum(['pending', 'open', 'resolved', 'snoozed']);

export const updateConversationSchema = z.object({
  status: conversationStatusSchema.optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  teamId: z.string().uuid().nullable().optional(),
});

export const assignConversationSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
  teamId: z.string().uuid().nullable().optional(),
});

// ============ Messages ============

export const messageTypeSchema = z.enum([
  'text',
  'image',
  'video',
  'audio',
  'document',
  'location',
  'contact',
  'sticker',
  'template',
]);

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: messageTypeSchema.default('text'),
  content: z.string().min(1, 'Mensagem não pode estar vazia'),
  metadata: z
    .object({
      mediaUrl: z.string().url().optional(),
      mimeType: z.string().optional(),
      fileName: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      templateName: z.string().optional(),
      templateParams: z.array(z.string()).optional(),
    })
    .optional(),
});

// ============ Pipelines & Deals ============

export const createPipelineSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  stages: z
    .array(
      z.object({
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      }),
    )
    .min(1, 'Pipeline deve ter ao menos uma etapa'),
});

export const createDealSchema = z.object({
  pipelineId: z.string().uuid(),
  stageId: z.string().uuid(),
  contactId: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  value: z.number().positive().optional().nullable(),
  currency: z.string().length(3).default('BRL'),
  expectedCloseDate: z.coerce.date().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
});

export const updateDealSchema = createDealSchema.partial();

export const moveDealSchema = z.object({
  stageId: z.string().uuid(),
  order: z.number().int().min(0).optional(),
});

// ============ Campaigns ============

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  channelId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  content: z.string().optional(),
  scheduledAt: z.coerce.date().optional(),
  contactIds: z.array(z.string().uuid()).optional(),
  filters: z
    .object({
      tags: z.array(z.string()).optional(),
      lastContactDays: z.number().int().positive().optional(),
    })
    .optional(),
});

// ============ Channels ============

export const channelTypeSchema = z.enum(['whatsapp', 'instagram', 'messenger', 'email']);

export const whatsappProviderSchema = z.enum(['evolution', '360dialog']);

export const connectWhatsAppSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  provider: whatsappProviderSchema,
  config: z.object({
    instanceName: z.string().optional(), // Evolution API
    apiKey: z.string().optional(), // 360dialog
    phoneNumber: z.string().optional(),
  }),
});

export const connectMetaChannelSchema = z.object({
  type: z.enum(['instagram', 'messenger']),
  name: z.string().min(1, 'Nome é obrigatório'),
  accessToken: z.string().min(1, 'Access token é obrigatório'),
  pageId: z.string().min(1, 'Page ID é obrigatório'),
});

// ============ Type Exports ============

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ImportContactsInput = z.infer<typeof importContactsSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AssignConversationInput = z.infer<typeof assignConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type MoveDealInput = z.infer<typeof moveDealSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type ConnectWhatsAppInput = z.infer<typeof connectWhatsAppSchema>;
export type ConnectMetaChannelInput = z.infer<typeof connectMetaChannelSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SortInput = z.infer<typeof sortSchema>;

export { z };
