import { and, eq } from 'drizzle-orm';
import { db, schema } from '../lib/db';
import { addSendMessageJob } from '../lib/queues';
import { channelsService } from './channels.service';
import { messagesService } from './messages.service';

const { chatbots, flowNodes, flowEdges, chatbotExecutions, contacts, conversations } = schema;

interface ExecutionContext {
  executionId: string;
  chatbotId: string;
  conversationId: string;
  contactId: string;
  tenantId: string;
  channelId: string;
  variables: Record<string, unknown>;
  messageHistory: Array<{ role: 'user' | 'bot'; content: string; timestamp: string }>;
}

interface FlowNodeConfig {
  text?: string;
  mediaUrl?: string;
  delay?: number;
  condition?: string;
  variable?: string;
  value?: unknown;
  action?: string;
  webhook?: string;
  tagId?: string;
  assigneeId?: string;
}

type NodeType = 'start' | 'message' | 'condition' | 'action' | 'delay' | 'end';

export const chatbotExecutorService = {
  /**
   * Find active chatbots for a channel that should trigger on a message
   */
  async findTriggeredChatbots(
    channelId: string,
    tenantId: string,
    messageContent: string,
  ): Promise<Array<{ id: string; triggerType: string; triggerConfig: Record<string, unknown> }>> {
    const activeChatbots = await db
      .select({
        id: chatbots.id,
        triggerType: chatbots.triggerType,
        triggerConfig: chatbots.triggerConfig,
      })
      .from(chatbots)
      .where(
        and(
          eq(chatbots.tenantId, tenantId),
          eq(chatbots.channelId, channelId),
          eq(chatbots.isActive, true),
        ),
      );

    return activeChatbots
      .filter((chatbot) => {
        const config = chatbot.triggerConfig as Record<string, unknown>;

        switch (chatbot.triggerType) {
          case 'always':
            return true;

          case 'keyword': {
            const keywords = (config.keywords as string[]) || [];
            const matchMode = (config.matchMode as string) || 'contains';
            const lowerContent = messageContent.toLowerCase();

            return keywords.some((keyword) => {
              const lowerKeyword = keyword.toLowerCase();
              if (matchMode === 'exact') {
                return lowerContent === lowerKeyword;
              }
              if (matchMode === 'startsWith') {
                return lowerContent.startsWith(lowerKeyword);
              }
              return lowerContent.includes(lowerKeyword);
            });
          }

          default:
            return false;
        }
      })
      .map((chatbot) => ({
        id: chatbot.id,
        triggerType: chatbot.triggerType,
        triggerConfig: chatbot.triggerConfig as Record<string, unknown>,
      }));
  },

  /**
   * Check if there's an active execution for a conversation
   */
  async getActiveExecution(conversationId: string): Promise<ExecutionContext | null> {
    const [execution] = await db
      .select()
      .from(chatbotExecutions)
      .where(
        and(
          eq(chatbotExecutions.conversationId, conversationId),
          eq(chatbotExecutions.status, 'waiting'),
        ),
      )
      .limit(1);

    if (!execution) return null;

    const [conversation] = await db
      .select({ channelId: conversations.channelId })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    return {
      executionId: execution.id,
      chatbotId: execution.chatbotId,
      conversationId: execution.conversationId,
      contactId: execution.contactId,
      tenantId: execution.tenantId,
      channelId: conversation?.channelId || '',
      variables: execution.variables as Record<string, unknown>,
      messageHistory: execution.messageHistory as ExecutionContext['messageHistory'],
    };
  },

  /**
   * Start a new chatbot execution
   */
  async startExecution(
    chatbotId: string,
    conversationId: string,
    contactId: string,
    tenantId: string,
    channelId: string,
    triggerMessage: string,
  ): Promise<void> {
    console.log(
      `[Chatbot] Starting execution for chatbot ${chatbotId} in conversation ${conversationId}`,
    );

    // Get the start node
    const [startNode] = await db
      .select()
      .from(flowNodes)
      .where(and(eq(flowNodes.chatbotId, chatbotId), eq(flowNodes.type, 'start')))
      .limit(1);

    if (!startNode) {
      console.error(`[Chatbot] No start node found for chatbot ${chatbotId}`);
      return;
    }

    // Create execution record
    const [execution] = await db
      .insert(chatbotExecutions)
      .values({
        chatbotId,
        conversationId,
        contactId,
        tenantId,
        currentNodeId: startNode.id,
        variables: {},
        messageHistory: [
          {
            role: 'user',
            content: triggerMessage,
            timestamp: new Date().toISOString(),
          },
        ],
        status: 'running',
      })
      .onConflictDoUpdate({
        target: [chatbotExecutions.chatbotId, chatbotExecutions.conversationId],
        set: {
          currentNodeId: startNode.id,
          variables: {},
          messageHistory: [
            {
              role: 'user',
              content: triggerMessage,
              timestamp: new Date().toISOString(),
            },
          ],
          status: 'running',
          startedAt: new Date(),
          updatedAt: new Date(),
          completedAt: null,
          error: null,
        },
      })
      .returning();

    if (!execution) {
      console.error('[Chatbot] Failed to create execution');
      return;
    }

    const context: ExecutionContext = {
      executionId: execution.id,
      chatbotId,
      conversationId,
      contactId,
      tenantId,
      channelId,
      variables: {},
      messageHistory: [
        {
          role: 'user',
          content: triggerMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // Find and execute next node after start
    await this.executeNextNode(context, startNode.id);
  },

  /**
   * Continue execution from current node (when user responds)
   */
  async continueExecution(context: ExecutionContext, userMessage: string): Promise<void> {
    console.log(`[Chatbot] Continuing execution ${context.executionId}`);

    // Add user message to history
    context.messageHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Store user message in variables for condition evaluation
    context.variables._lastUserMessage = userMessage;

    // Get current execution state
    const [execution] = await db
      .select({ currentNodeId: chatbotExecutions.currentNodeId })
      .from(chatbotExecutions)
      .where(eq(chatbotExecutions.id, context.executionId))
      .limit(1);

    if (!execution?.currentNodeId) {
      console.error(`[Chatbot] No current node for execution ${context.executionId}`);
      return;
    }

    // Update status to running
    await db
      .update(chatbotExecutions)
      .set({
        status: 'running',
        messageHistory: context.messageHistory,
        variables: context.variables,
        updatedAt: new Date(),
      })
      .where(eq(chatbotExecutions.id, context.executionId));

    // Continue from current node
    await this.executeNextNode(context, execution.currentNodeId);
  },

  /**
   * Find and execute the next node
   */
  async executeNextNode(context: ExecutionContext, currentNodeId: string): Promise<void> {
    // Find outgoing edges from current node
    const edges = await db.select().from(flowEdges).where(eq(flowEdges.sourceId, currentNodeId));

    if (edges.length === 0) {
      // No more nodes, end execution
      await this.endExecution(context);
      return;
    }

    // Find the appropriate next node (evaluate conditions if multiple edges)
    let nextEdge = edges[0];

    if (edges.length > 1) {
      // Multiple edges - evaluate conditions
      for (const edge of edges) {
        const condition = edge.condition as Record<string, unknown> | null;
        if (condition && this.evaluateCondition(context, condition)) {
          nextEdge = edge;
          break;
        }
      }
    }

    if (!nextEdge) {
      await this.endExecution(context);
      return;
    }

    // Get next node
    const [nextNode] = await db
      .select()
      .from(flowNodes)
      .where(eq(flowNodes.id, nextEdge.targetId))
      .limit(1);

    if (!nextNode) {
      await this.endExecution(context);
      return;
    }

    // Execute the node
    await this.executeNode(context, nextNode);
  },

  /**
   * Execute a single node
   */
  async executeNode(
    context: ExecutionContext,
    node: { id: string; type: string; config: unknown },
  ): Promise<void> {
    const config = node.config as FlowNodeConfig;
    const nodeType = node.type as NodeType;

    console.log(`[Chatbot] Executing node ${node.id} (${nodeType})`);

    switch (nodeType) {
      case 'start':
        // Start node just advances to next
        await this.executeNextNode(context, node.id);
        break;

      case 'message':
        await this.handleMessageNode(context, node.id, config);
        break;

      case 'condition':
        await this.handleConditionNode(context, node.id, config);
        break;

      case 'action':
        await this.handleActionNode(context, node.id, config);
        break;

      case 'delay':
        await this.handleDelayNode(context, node.id, config);
        break;

      case 'end':
        await this.endExecution(context);
        break;

      default:
        console.warn(`[Chatbot] Unknown node type: ${nodeType}`);
        await this.executeNextNode(context, node.id);
    }
  },

  /**
   * Handle message node - send a message
   */
  async handleMessageNode(
    context: ExecutionContext,
    nodeId: string,
    config: FlowNodeConfig,
  ): Promise<void> {
    const messageText = this.interpolateVariables(config.text || '', context);

    // Get channel details
    const channel = await channelsService.findById(context.channelId, context.tenantId);
    if (!channel) {
      console.error(`[Chatbot] Channel not found: ${context.channelId}`);
      await this.executeNextNode(context, nodeId);
      return;
    }

    // Create message in database
    const message = await messagesService.create({
      tenantId: context.tenantId,
      conversationId: context.conversationId,
      senderType: 'bot',
      type: config.mediaUrl ? 'image' : 'text',
      content: messageText,
      mediaUrl: config.mediaUrl,
    });

    // Queue message for sending
    const channelType =
      channel.type === 'whatsapp' && channel.provider === 'evolution'
        ? 'whatsapp_unofficial'
        : channel.type === 'whatsapp'
          ? 'whatsapp_official'
          : (channel.type as 'instagram' | 'messenger');

    // Get contact phone
    const [contact] = await db
      .select({ phone: contacts.phone, externalId: contacts.externalId })
      .from(contacts)
      .where(eq(contacts.id, context.contactId))
      .limit(1);

    await addSendMessageJob({
      tenantId: context.tenantId,
      conversationId: context.conversationId,
      channelId: context.channelId,
      channelType,
      messageId: message.id,
      message: {
        type: config.mediaUrl ? 'image' : 'text',
        content: messageText,
        mediaUrl: config.mediaUrl,
      },
      recipientPhone: contact?.phone || undefined,
      recipientExternalId: contact?.externalId || undefined,
    });

    // Add to message history
    context.messageHistory.push({
      role: 'bot',
      content: messageText,
      timestamp: new Date().toISOString(),
    });

    // Check if this message expects a response (wait for user input)
    const expectsResponse = config.delay === undefined || config.delay === -1;

    if (expectsResponse) {
      // Update execution to waiting state
      await db
        .update(chatbotExecutions)
        .set({
          currentNodeId: nodeId,
          status: 'waiting',
          messageHistory: context.messageHistory,
          variables: context.variables,
          updatedAt: new Date(),
        })
        .where(eq(chatbotExecutions.id, context.executionId));
    } else {
      // Continue to next node
      await this.executeNextNode(context, nodeId);
    }
  },

  /**
   * Handle condition node - evaluate and branch
   */
  async handleConditionNode(
    context: ExecutionContext,
    nodeId: string,
    _config: FlowNodeConfig,
  ): Promise<void> {
    // Get all outgoing edges
    const edges = await db.select().from(flowEdges).where(eq(flowEdges.sourceId, nodeId));

    // Find matching edge based on condition
    let matchedEdge = null;
    let defaultEdge = null;

    for (const edge of edges) {
      const condition = edge.condition as Record<string, unknown> | null;

      if (!condition || Object.keys(condition).length === 0) {
        defaultEdge = edge;
        continue;
      }

      if (this.evaluateCondition(context, condition)) {
        matchedEdge = edge;
        break;
      }
    }

    const nextEdge = matchedEdge || defaultEdge;

    if (nextEdge) {
      // Get next node and execute
      const [nextNode] = await db
        .select()
        .from(flowNodes)
        .where(eq(flowNodes.id, nextEdge.targetId))
        .limit(1);

      if (nextNode) {
        await this.executeNode(context, nextNode);
        return;
      }
    }

    await this.endExecution(context);
  },

  /**
   * Handle action node - perform an action
   */
  async handleActionNode(
    context: ExecutionContext,
    nodeId: string,
    config: FlowNodeConfig,
  ): Promise<void> {
    const action = config.action;

    switch (action) {
      case 'set_variable':
        if (config.variable && config.value !== undefined) {
          context.variables[config.variable] = config.value;
        }
        break;

      case 'add_tag':
        if (config.tagId) {
          // Add tag to contact (implementation depends on tags service)
          console.log(`[Chatbot] Would add tag ${config.tagId} to contact ${context.contactId}`);
        }
        break;

      case 'assign_user':
        if (config.assigneeId) {
          await db
            .update(conversations)
            .set({
              assigneeId: config.assigneeId,
              updatedAt: new Date(),
            })
            .where(eq(conversations.id, context.conversationId));
        }
        break;

      case 'webhook':
        if (config.webhook) {
          try {
            await fetch(config.webhook, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conversationId: context.conversationId,
                contactId: context.contactId,
                variables: context.variables,
              }),
            });
          } catch (err) {
            console.error('[Chatbot] Webhook failed:', err);
          }
        }
        break;

      default:
        console.warn(`[Chatbot] Unknown action: ${action}`);
    }

    // Update variables and continue
    await db
      .update(chatbotExecutions)
      .set({
        variables: context.variables,
        updatedAt: new Date(),
      })
      .where(eq(chatbotExecutions.id, context.executionId));

    await this.executeNextNode(context, nodeId);
  },

  /**
   * Handle delay node - wait before continuing
   */
  async handleDelayNode(
    context: ExecutionContext,
    nodeId: string,
    config: FlowNodeConfig,
  ): Promise<void> {
    const delayMs = (config.delay || 1) * 1000;

    // Update status to paused
    await db
      .update(chatbotExecutions)
      .set({
        currentNodeId: nodeId,
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(eq(chatbotExecutions.id, context.executionId));

    // Schedule continuation (in a real system, use a queue)
    setTimeout(async () => {
      // Re-fetch execution to ensure it's still valid
      const [execution] = await db
        .select({ status: chatbotExecutions.status })
        .from(chatbotExecutions)
        .where(eq(chatbotExecutions.id, context.executionId))
        .limit(1);

      if (execution?.status === 'paused') {
        await db
          .update(chatbotExecutions)
          .set({ status: 'running', updatedAt: new Date() })
          .where(eq(chatbotExecutions.id, context.executionId));

        await this.executeNextNode(context, nodeId);
      }
    }, delayMs);
  },

  /**
   * End execution
   */
  async endExecution(context: ExecutionContext): Promise<void> {
    console.log(`[Chatbot] Ending execution ${context.executionId}`);

    await db
      .update(chatbotExecutions)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
        messageHistory: context.messageHistory,
        variables: context.variables,
      })
      .where(eq(chatbotExecutions.id, context.executionId));
  },

  /**
   * Evaluate a condition against context
   */
  evaluateCondition(context: ExecutionContext, condition: Record<string, unknown>): boolean {
    const { field, operator, value } = condition as {
      field?: string;
      operator?: string;
      value?: unknown;
    };

    if (!field || !operator) return false;

    // Get field value from context
    let fieldValue: unknown;
    if (field === '_lastUserMessage') {
      fieldValue = context.variables._lastUserMessage;
    } else if (field.startsWith('variables.')) {
      fieldValue = context.variables[field.substring(10)];
    } else {
      fieldValue = context.variables[field];
    }

    const strFieldValue = String(fieldValue || '').toLowerCase();
    const strValue = String(value || '').toLowerCase();

    switch (operator) {
      case 'equals':
        return strFieldValue === strValue;
      case 'not_equals':
        return strFieldValue !== strValue;
      case 'contains':
        return strFieldValue.includes(strValue);
      case 'not_contains':
        return !strFieldValue.includes(strValue);
      case 'starts_with':
        return strFieldValue.startsWith(strValue);
      case 'ends_with':
        return strFieldValue.endsWith(strValue);
      case 'is_empty':
        return !fieldValue || strFieldValue === '';
      case 'is_not_empty':
        return !!fieldValue && strFieldValue !== '';
      default:
        return false;
    }
  },

  /**
   * Interpolate variables in text
   */
  interpolateVariables(text: string, context: ExecutionContext): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      if (varName in context.variables) {
        return String(context.variables[varName]);
      }
      return match;
    });
  },
};
