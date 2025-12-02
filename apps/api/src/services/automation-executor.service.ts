import { and, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';
import { addSendMessageJob } from '../lib/queues';
import { channelsService } from './channels.service';
import { messagesService } from './messages.service';
import { notificationsService } from './notifications.service';

const { automations, automationLogs, conversations, contacts, deals, tags, contactTags } = schema;

type AutomationTriggerType =
  | 'message_received'
  | 'conversation_opened'
  | 'conversation_resolved'
  | 'contact_created'
  | 'deal_stage_changed'
  | 'deal_created'
  | 'tag_added'
  | 'tag_removed';

interface TriggerContext {
  tenantId: string;
  conversationId?: string;
  contactId?: string;
  dealId?: string;
  channelId?: string;
  messageContent?: string;
  tagId?: string;
  fromStageId?: string;
  toStageId?: string;
  pipelineId?: string;
  userId?: string;
}

interface AutomationAction {
  type: string;
  [key: string]: unknown;
}

interface AutomationCondition {
  field: string;
  operator: string;
  value?: string;
}

export const automationExecutorService = {
  /**
   * Check and execute automations for a trigger event
   */
  async processTrigger(triggerType: AutomationTriggerType, context: TriggerContext): Promise<void> {
    const startTime = Date.now();

    try {
      // Find active automations for this trigger type
      const activeAutomations = await db
        .select()
        .from(automations)
        .where(
          and(
            eq(automations.tenantId, context.tenantId),
            eq(automations.triggerType, triggerType),
            eq(automations.status, 'active'),
          ),
        )
        .orderBy(automations.priority);

      console.log(
        `[Automation] Found ${activeAutomations.length} active automations for ${triggerType}`,
      );

      for (const automation of activeAutomations) {
        try {
          // Check if trigger config matches
          if (!this.matchesTriggerConfig(automation, triggerType, context)) {
            continue;
          }

          // Check conditions
          const conditions = (automation.conditions as AutomationCondition[]) || [];
          if (!this.evaluateConditions(conditions, context)) {
            continue;
          }

          // Execute actions
          const actions = (automation.actions as AutomationAction[]) || [];
          const executedActions: Array<{ action: string; status: string; error?: string }> = [];

          for (const action of actions) {
            try {
              await this.executeAction(action, context);
              executedActions.push({ action: action.type, status: 'success' });
            } catch (actionError) {
              console.error(`[Automation] Action ${action.type} failed:`, actionError);
              executedActions.push({
                action: action.type,
                status: 'error',
                error: actionError instanceof Error ? actionError.message : 'Unknown error',
              });
            }
          }

          // Log execution
          const duration = `${Date.now() - startTime}ms`;
          await db.insert(automationLogs).values({
            automationId: automation.id,
            tenantId: context.tenantId,
            triggeredBy: context,
            actionsExecuted: executedActions,
            status: executedActions.some((a) => a.status === 'error') ? 'partial' : 'success',
            duration,
          });

          // Update automation run count
          const currentCount = Number.parseInt(automation.runCount || '0', 10);
          await db
            .update(automations)
            .set({
              runCount: String(currentCount + 1),
              lastRunAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(automations.id, automation.id));

          console.log(`[Automation] Executed automation ${automation.name} (${automation.id})`);
        } catch (automationError) {
          console.error(`[Automation] Error executing ${automation.id}:`, automationError);

          // Log failure
          await db.insert(automationLogs).values({
            automationId: automation.id,
            tenantId: context.tenantId,
            triggeredBy: context,
            actionsExecuted: [],
            status: 'error',
            errorMessage:
              automationError instanceof Error ? automationError.message : 'Unknown error',
            duration: `${Date.now() - startTime}ms`,
          });
        }
      }
    } catch (error) {
      console.error('[Automation] Error processing trigger:', error);
    }
  },

  /**
   * Check if automation trigger config matches the context
   */
  matchesTriggerConfig(
    automation: { triggerConfig: unknown },
    triggerType: AutomationTriggerType,
    context: TriggerContext,
  ): boolean {
    const config = (automation.triggerConfig as Record<string, unknown>) || {};

    switch (triggerType) {
      case 'message_received': {
        // Check channel filter
        const channelIds = config.channelIds as string[] | undefined;
        if (channelIds && channelIds.length > 0 && context.channelId) {
          if (!channelIds.includes(context.channelId)) {
            return false;
          }
        }

        // Check keyword filter
        const keywords = config.keywords as string[] | undefined;
        if (keywords && keywords.length > 0 && context.messageContent) {
          const matchMode = (config.matchMode as string) || 'contains';
          const lowerContent = context.messageContent.toLowerCase();

          const matches = keywords.some((keyword) => {
            const lowerKeyword = keyword.toLowerCase();
            if (matchMode === 'exact') return lowerContent === lowerKeyword;
            if (matchMode === 'starts_with') return lowerContent.startsWith(lowerKeyword);
            return lowerContent.includes(lowerKeyword);
          });

          if (!matches) return false;
        }
        return true;
      }

      case 'deal_stage_changed': {
        const pipelineId = config.pipelineId as string | undefined;
        const fromStageId = config.fromStageId as string | undefined;
        const toStageId = config.toStageId as string | undefined;

        if (pipelineId && context.pipelineId !== pipelineId) return false;
        if (fromStageId && context.fromStageId !== fromStageId) return false;
        if (toStageId && context.toStageId !== toStageId) return false;
        return true;
      }

      case 'tag_added':
      case 'tag_removed': {
        const tagIds = config.tagIds as string[] | undefined;
        if (tagIds && tagIds.length > 0 && context.tagId) {
          return tagIds.includes(context.tagId);
        }
        return true;
      }

      default:
        return true;
    }
  },

  /**
   * Evaluate automation conditions
   */
  evaluateConditions(conditions: AutomationCondition[], context: TriggerContext): boolean {
    if (conditions.length === 0) return true;

    return conditions.every((condition) => {
      const fieldValue = this.getFieldValue(condition.field, context);
      const strValue = String(fieldValue || '').toLowerCase();
      const condValue = String(condition.value || '').toLowerCase();

      switch (condition.operator) {
        case 'equals':
          return strValue === condValue;
        case 'not_equals':
          return strValue !== condValue;
        case 'contains':
          return strValue.includes(condValue);
        case 'not_contains':
          return !strValue.includes(condValue);
        case 'is_empty':
          return !fieldValue || strValue === '';
        case 'is_not_empty':
          return !!fieldValue && strValue !== '';
        default:
          return true;
      }
    });
  },

  /**
   * Get field value from context
   */
  getFieldValue(field: string, context: TriggerContext): unknown {
    const fieldMap: Record<string, unknown> = {
      messageContent: context.messageContent,
      conversationId: context.conversationId,
      contactId: context.contactId,
      channelId: context.channelId,
      dealId: context.dealId,
      tagId: context.tagId,
    };
    return fieldMap[field];
  },

  /**
   * Execute a single automation action
   */
  async executeAction(action: AutomationAction, context: TriggerContext): Promise<void> {
    console.log(`[Automation] Executing action: ${action.type}`);

    switch (action.type) {
      case 'send_message': {
        if (!context.conversationId) {
          throw new Error('No conversation context for send_message action');
        }

        const content = action.content as string;
        const delay = (action.delay as number) || 0;

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        // Get conversation to find channel
        const [conversation] = await db
          .select({ channelId: conversations.channelId, contactId: conversations.contactId })
          .from(conversations)
          .where(eq(conversations.id, context.conversationId))
          .limit(1);

        if (!conversation) {
          throw new Error('Conversation not found');
        }

        const channel = await channelsService.findById(conversation.channelId, context.tenantId);
        if (!channel) {
          throw new Error('Channel not found');
        }

        // Create message
        const message = await messagesService.create({
          tenantId: context.tenantId,
          conversationId: context.conversationId,
          senderType: 'bot',
          type: 'text',
          content,
        });

        // Get contact phone
        const [contact] = await db
          .select({ phone: contacts.phone, externalId: contacts.externalId })
          .from(contacts)
          .where(eq(contacts.id, conversation.contactId))
          .limit(1);

        // Queue for sending
        const channelType =
          channel.type === 'whatsapp' && channel.provider === 'evolution'
            ? 'whatsapp_unofficial'
            : channel.type === 'whatsapp'
              ? 'whatsapp_official'
              : (channel.type as 'instagram' | 'messenger');

        await addSendMessageJob({
          tenantId: context.tenantId,
          conversationId: context.conversationId,
          channelId: conversation.channelId,
          channelType,
          messageId: message.id,
          message: { type: 'text', content },
          recipientPhone: contact?.phone || undefined,
          recipientExternalId: contact?.externalId || undefined,
        });
        break;
      }

      case 'add_tag': {
        if (!context.contactId) {
          throw new Error('No contact context for add_tag action');
        }
        const tagId = action.tagId as string;

        // Check if tag exists
        const [tag] = await db
          .select()
          .from(tags)
          .where(and(eq(tags.id, tagId), eq(tags.tenantId, context.tenantId)))
          .limit(1);

        if (!tag) {
          throw new Error('Tag not found');
        }

        // Add tag to contact
        await db
          .insert(contactTags)
          .values({
            contactId: context.contactId,
            tagId,
          })
          .onConflictDoNothing();
        break;
      }

      case 'remove_tag': {
        if (!context.contactId) {
          throw new Error('No contact context for remove_tag action');
        }
        const tagId = action.tagId as string;

        await db
          .delete(contactTags)
          .where(and(eq(contactTags.contactId, context.contactId), eq(contactTags.tagId, tagId)));
        break;
      }

      case 'assign_user': {
        if (!context.conversationId) {
          throw new Error('No conversation context for assign_user action');
        }
        const userId = action.userId as string;

        await db
          .update(conversations)
          .set({ assigneeId: userId, updatedAt: new Date() })
          .where(eq(conversations.id, context.conversationId));
        break;
      }

      case 'move_deal': {
        if (!context.dealId) {
          throw new Error('No deal context for move_deal action');
        }
        const stageId = action.stageId as string;

        await db
          .update(deals)
          .set({ stageId, updatedAt: new Date() })
          .where(eq(deals.id, context.dealId));
        break;
      }

      case 'create_notification': {
        const title = action.title as string;
        const body = action.body as string;
        const userId = (action.userId as string) || context.userId;

        if (!userId) {
          throw new Error('No user context for create_notification action');
        }

        await notificationsService.create({
          tenantId: context.tenantId,
          userId,
          title,
          body,
          type: 'automation',
          link: context.conversationId
            ? `/inbox?conversation=${context.conversationId}`
            : undefined,
        });
        break;
      }

      case 'send_webhook': {
        const url = action.url as string;
        const method = (action.method as string) || 'POST';
        const headers = (action.headers as Record<string, string>) || {};

        await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify({
            trigger: 'automation',
            context,
            timestamp: new Date().toISOString(),
          }),
        });
        break;
      }

      case 'wait': {
        const duration = action.duration as number;
        const unit = (action.unit as string) || 'seconds';

        let ms = duration * 1000;
        if (unit === 'minutes') ms = duration * 60 * 1000;
        else if (unit === 'hours') ms = duration * 60 * 60 * 1000;
        else if (unit === 'days') ms = duration * 24 * 60 * 60 * 1000;

        await new Promise((resolve) => setTimeout(resolve, ms));
        break;
      }

      default:
        console.warn(`[Automation] Unknown action type: ${action.type}`);
    }
  },
};
