// ===========================================
// V4 Connect CRM - Shared Types
// ===========================================

// ============ Enums ============

export const UserRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  AGENT: 'agent',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ChannelType = {
  WHATSAPP: 'whatsapp',
  INSTAGRAM: 'instagram',
  MESSENGER: 'messenger',
  EMAIL: 'email',
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export const WhatsAppProvider = {
  EVOLUTION: 'evolution',
  DIALOG_360: '360dialog',
} as const;
export type WhatsAppProvider = (typeof WhatsAppProvider)[keyof typeof WhatsAppProvider];

export const ConversationStatus = {
  PENDING: 'pending',
  OPEN: 'open',
  RESOLVED: 'resolved',
  SNOOZED: 'snoozed',
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  LOCATION: 'location',
  CONTACT: 'contact',
  STICKER: 'sticker',
  TEMPLATE: 'template',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const MessageDirection = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound',
} as const;
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const DealStatus = {
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
} as const;
export type DealStatus = (typeof DealStatus)[keyof typeof DealStatus];

export const CampaignStatus = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

// ============ Base Types ============

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDelete {
  deletedAt: Date | null;
}

// ============ Domain Types ============

export interface Tenant extends Timestamps {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  settings: TenantSettings;
}

export interface TenantSettings {
  timezone: string;
  businessHours: BusinessHours;
  autoAssignment: boolean;
}

export interface BusinessHours {
  enabled: boolean;
  schedule: WeekSchedule;
}

export interface WeekSchedule {
  monday: DaySchedule | null;
  tuesday: DaySchedule | null;
  wednesday: DaySchedule | null;
  thursday: DaySchedule | null;
  friday: DaySchedule | null;
  saturday: DaySchedule | null;
  sunday: DaySchedule | null;
}

export interface DaySchedule {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface User extends Timestamps {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
}

export interface Team extends Timestamps {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
}

export interface Channel extends Timestamps {
  id: string;
  tenantId: string;
  type: ChannelType;
  name: string;
  provider: WhatsAppProvider | null;
  config: Record<string, unknown>;
  isActive: boolean;
}

export interface Contact extends Timestamps, SoftDelete {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
}

export interface Conversation extends Timestamps {
  id: string;
  tenantId: string;
  channelId: string;
  contactId: string;
  inboxId: string | null;
  assigneeId: string | null;
  teamId: string | null;
  status: ConversationStatus;
  lastMessageAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface Message extends Timestamps {
  id: string;
  conversationId: string;
  senderId: string | null; // null = system/bot
  type: MessageType;
  direction: MessageDirection;
  content: string;
  metadata: MessageMetadata;
  status: MessageStatus;
  externalId: string | null;
}

export interface MessageMetadata {
  mediaUrl?: string;
  mimeType?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number; // for audio/video
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
  templateName?: string;
  templateParams?: string[];
}

export interface Pipeline extends Timestamps {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
}

export interface Stage extends Timestamps {
  id: string;
  pipelineId: string;
  name: string;
  color: string;
  order: number;
}

export interface Deal extends Timestamps {
  id: string;
  tenantId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  assigneeId: string | null;
  title: string;
  value: number | null;
  currency: string;
  status: DealStatus;
  expectedCloseDate: Date | null;
  lostReason: string | null;
}

export interface Campaign extends Timestamps {
  id: string;
  tenantId: string;
  channelId: string;
  name: string;
  status: CampaignStatus;
  templateId: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  stats: CampaignStats;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

// ============ API Types ============

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============ Socket Events ============

export interface SocketEvents {
  // Server -> Client
  'conversation:new': Conversation;
  'conversation:updated': Conversation;
  'message:new': Message;
  'message:status': { messageId: string; status: MessageStatus };
  'typing:start': { conversationId: string; userId: string };
  'typing:stop': { conversationId: string; userId: string };

  // Client -> Server
  'conversation:join': { conversationId: string };
  'conversation:leave': { conversationId: string };
  'typing:emit': { conversationId: string };
}
