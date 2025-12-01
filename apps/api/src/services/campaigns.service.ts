import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';

const { campaigns, campaignContacts, contacts, channels } = schema;

type CampaignStatus = (typeof campaigns.$inferSelect)['status'];

interface CampaignFilters {
  tenantId: string;
  status?: CampaignStatus;
  page?: number;
  limit?: number;
}

interface CreateCampaignData {
  tenantId: string;
  channelId: string;
  name: string;
  content?: string;
  templateId?: string;
  scheduledAt?: Date;
  contactIds: string[];
}

export const campaignsService = {
  async findAll(filters: CampaignFilters) {
    const { tenantId, status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: campaigns.id,
        tenantId: campaigns.tenantId,
        channelId: campaigns.channelId,
        name: campaigns.name,
        status: campaigns.status,
        templateId: campaigns.templateId,
        content: campaigns.content,
        scheduledAt: campaigns.scheduledAt,
        startedAt: campaigns.startedAt,
        completedAt: campaigns.completedAt,
        stats: campaigns.stats,
        createdAt: campaigns.createdAt,
        channel: {
          id: channels.id,
          name: channels.name,
          type: channels.type,
        },
      })
      .from(campaigns)
      .leftJoin(channels, eq(campaigns.channelId, channels.id))
      .where(
        status
          ? and(eq(campaigns.tenantId, tenantId), eq(campaigns.status, status))
          : eq(campaigns.tenantId, tenantId),
      )
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      campaigns: rows,
      pagination: {
        page,
        limit,
      },
    };
  },

  async findById(id: string, tenantId: string) {
    const [campaign] = await db
      .select({
        id: campaigns.id,
        tenantId: campaigns.tenantId,
        channelId: campaigns.channelId,
        name: campaigns.name,
        status: campaigns.status,
        templateId: campaigns.templateId,
        content: campaigns.content,
        scheduledAt: campaigns.scheduledAt,
        startedAt: campaigns.startedAt,
        completedAt: campaigns.completedAt,
        stats: campaigns.stats,
        createdAt: campaigns.createdAt,
        channel: {
          id: channels.id,
          name: channels.name,
          type: channels.type,
        },
      })
      .from(campaigns)
      .leftJoin(channels, eq(campaigns.channelId, channels.id))
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .limit(1);

    if (!campaign) return null;

    const recipients = await db
      .select({
        id: contacts.id,
        name: contacts.name,
        phone: contacts.phone,
        status: campaignContacts.status,
      })
      .from(campaignContacts)
      .leftJoin(contacts, eq(campaignContacts.contactId, contacts.id))
      .where(eq(campaignContacts.campaignId, id))
      .limit(50);

    return {
      ...campaign,
      recipients,
    };
  },

  async create(data: CreateCampaignData) {
    return db.transaction(async (tx) => {
      const [created] = await tx
        .insert(campaigns)
        .values({
          tenantId: data.tenantId,
          channelId: data.channelId,
          name: data.name,
          content: data.content,
          templateId: data.templateId,
          status: data.scheduledAt ? 'scheduled' : 'draft',
          scheduledAt: data.scheduledAt ?? null,
          stats: {
            total: data.contactIds.length,
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0,
          },
        })
        .returning();

      if (!created) return null;

      if (data.contactIds.length > 0) {
        const values = data.contactIds.map((contactId) => ({
          campaignId: created.id,
          contactId,
          status: 'pending',
        }));

        await tx.insert(campaignContacts).values(values);
      }

      return created;
    });
  },

  async schedule(id: string, tenantId: string, scheduledAt?: Date) {
    const [result] = await db
      .update(campaigns)
      .set({
        status: 'scheduled',
        scheduledAt: scheduledAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .returning();

    return result ? this.findById(id, tenantId) : null;
  },
};
