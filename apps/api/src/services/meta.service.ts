/**
 * Meta Graph API Integration Service
 *
 * Handles Instagram Direct and Facebook Messenger integrations
 * using the Meta Graph API.
 *
 * Required environment variables:
 * - META_APP_ID
 * - META_APP_SECRET
 * - META_WEBHOOK_VERIFY_TOKEN
 */

const META_GRAPH_API_VERSION = 'v18.0';
const META_GRAPH_API_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

interface MetaError {
  message: string;
  type: string;
  code: number;
  fbtrace_id: string;
}

interface MetaApiResponse<T> {
  success: boolean;
  data?: T;
  error?: MetaError;
}

interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

interface MetaMessage {
  recipient: {
    id: string;
  };
  message: {
    text?: string;
    attachment?: {
      type: 'image' | 'video' | 'audio' | 'file';
      payload: {
        url: string;
        is_reusable?: boolean;
      };
    };
  };
  messaging_type: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  tag?: string;
}

interface SendMessageResult {
  recipient_id: string;
  message_id: string;
}

interface InstagramMessageData {
  recipient: {
    id: string;
  };
  message: {
    text?: string;
    attachment?: {
      type: 'image' | 'video' | 'audio';
      payload: {
        url: string;
      };
    };
  };
}

interface ConversationInfo {
  id: string;
  participants: {
    data: Array<{
      id: string;
      name?: string;
      username?: string;
      profile_pic?: string;
    }>;
  };
  messages?: {
    data: Array<{
      id: string;
      message: string;
      created_time: string;
      from: {
        id: string;
        name?: string;
      };
    }>;
  };
}

class MetaService {
  private appId: string;
  private appSecret: string;

  constructor() {
    this.appId = process.env.META_APP_ID || '';
    this.appSecret = process.env.META_APP_SECRET || '';
  }

  /**
   * Make a request to the Meta Graph API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE',
    accessToken: string,
    body?: unknown,
  ): Promise<MetaApiResponse<T>> {
    try {
      const url = `${META_GRAPH_API_URL}${endpoint}`;

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = (await response.json()) as { error?: MetaError } & T;

      if (data.error) {
        console.error('[Meta] API Error:', data.error);
        return { success: false, error: data.error };
      }

      return { success: true, data: data as T };
    } catch (error) {
      console.error('[Meta] Request failed:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Request failed',
          type: 'NetworkError',
          code: 0,
          fbtrace_id: '',
        },
      };
    }
  }

  /**
   * Exchange short-lived token for long-lived token
   */
  async getLongLivedToken(
    shortLivedToken: string,
  ): Promise<MetaApiResponse<{ access_token: string; expires_in: number }>> {
    const url = `/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortLivedToken}`;
    return this.request(url, 'GET', shortLivedToken);
  }

  /**
   * Get user's Facebook pages
   */
  async getPages(userAccessToken: string): Promise<MetaApiResponse<{ data: MetaPage[] }>> {
    return this.request(
      '/me/accounts?fields=id,name,access_token,instagram_business_account',
      'GET',
      userAccessToken,
    );
  }

  /**
   * Get page details
   */
  async getPageInfo(pageId: string, pageAccessToken: string): Promise<MetaApiResponse<MetaPage>> {
    return this.request(
      `/${pageId}?fields=id,name,instagram_business_account`,
      'GET',
      pageAccessToken,
    );
  }

  /**
   * Subscribe to page webhooks
   */
  async subscribePageToWebhooks(
    pageId: string,
    pageAccessToken: string,
  ): Promise<MetaApiResponse<{ success: boolean }>> {
    return this.request(`/${pageId}/subscribed_apps`, 'POST', pageAccessToken, {
      subscribed_fields: ['messages', 'messaging_postbacks', 'message_reads', 'message_deliveries'],
    });
  }

  // ==================== FACEBOOK MESSENGER ====================

  /**
   * Send a text message via Facebook Messenger
   */
  async sendMessengerText(
    pageAccessToken: string,
    recipientId: string,
    text: string,
    messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE',
  ): Promise<MetaApiResponse<SendMessageResult>> {
    const message: MetaMessage = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: messagingType,
    };

    return this.request('/me/messages', 'POST', pageAccessToken, message);
  }

  /**
   * Send a media message via Facebook Messenger
   */
  async sendMessengerMedia(
    pageAccessToken: string,
    recipientId: string,
    type: 'image' | 'video' | 'audio' | 'file',
    url: string,
  ): Promise<MetaApiResponse<SendMessageResult>> {
    const message: MetaMessage = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type,
          payload: { url, is_reusable: true },
        },
      },
      messaging_type: 'RESPONSE',
    };

    return this.request('/me/messages', 'POST', pageAccessToken, message);
  }

  /**
   * Get Messenger conversation info
   */
  async getMessengerConversation(
    conversationId: string,
    pageAccessToken: string,
  ): Promise<MetaApiResponse<ConversationInfo>> {
    return this.request(
      `/${conversationId}?fields=id,participants,messages{id,message,created_time,from}`,
      'GET',
      pageAccessToken,
    );
  }

  /**
   * Mark Messenger message as seen
   */
  async markMessengerSeen(
    pageAccessToken: string,
    recipientId: string,
  ): Promise<MetaApiResponse<unknown>> {
    return this.request('/me/messages', 'POST', pageAccessToken, {
      recipient: { id: recipientId },
      sender_action: 'mark_seen',
    });
  }

  // ==================== INSTAGRAM DIRECT ====================

  /**
   * Send a text message via Instagram Direct
   */
  async sendInstagramText(
    igUserId: string,
    pageAccessToken: string,
    recipientId: string,
    text: string,
  ): Promise<MetaApiResponse<SendMessageResult>> {
    const message: InstagramMessageData = {
      recipient: { id: recipientId },
      message: { text },
    };

    return this.request(`/${igUserId}/messages`, 'POST', pageAccessToken, message);
  }

  /**
   * Send a media message via Instagram Direct
   */
  async sendInstagramMedia(
    igUserId: string,
    pageAccessToken: string,
    recipientId: string,
    type: 'image' | 'video' | 'audio',
    url: string,
  ): Promise<MetaApiResponse<SendMessageResult>> {
    const message: InstagramMessageData = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type,
          payload: { url },
        },
      },
    };

    return this.request(`/${igUserId}/messages`, 'POST', pageAccessToken, message);
  }

  /**
   * Get Instagram conversation
   */
  async getInstagramConversation(
    conversationId: string,
    pageAccessToken: string,
  ): Promise<MetaApiResponse<ConversationInfo>> {
    return this.request(
      `/${conversationId}?fields=id,participants,messages{id,message,created_time,from}`,
      'GET',
      pageAccessToken,
    );
  }

  /**
   * Get Instagram user profile
   */
  async getInstagramProfile(
    igUserId: string,
    pageAccessToken: string,
  ): Promise<
    MetaApiResponse<{ id: string; username: string; name?: string; profile_picture_url?: string }>
  > {
    return this.request(
      `/${igUserId}?fields=id,username,name,profile_picture_url`,
      'GET',
      pageAccessToken,
    );
  }

  // ==================== WEBHOOKS ====================

  /**
   * Verify webhook subscription
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Meta] Webhook verified');
      return challenge;
    }

    console.warn('[Meta] Webhook verification failed');
    return null;
  }

  /**
   * Parse incoming webhook event
   */
  parseWebhookEvent(body: unknown): {
    platform: 'messenger' | 'instagram';
    events: Array<{
      type: 'message' | 'delivery' | 'read' | 'postback';
      senderId: string;
      recipientId: string;
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: string;
          payload: { url: string };
        }>;
      };
      delivery?: {
        mids: string[];
        watermark: number;
      };
      read?: {
        watermark: number;
      };
      postback?: {
        title: string;
        payload: string;
      };
    }>;
  } | null {
    try {
      const payload = body as {
        object: 'page' | 'instagram';
        entry: Array<{
          id: string;
          time: number;
          messaging?: Array<{
            sender: { id: string };
            recipient: { id: string };
            timestamp: number;
            message?: {
              mid: string;
              text?: string;
              attachments?: Array<{
                type: string;
                payload: { url: string };
              }>;
            };
            delivery?: {
              mids: string[];
              watermark: number;
            };
            read?: {
              watermark: number;
            };
            postback?: {
              title: string;
              payload: string;
            };
          }>;
        }>;
      };

      const platform = payload.object === 'instagram' ? 'instagram' : 'messenger';
      const events: Array<{
        type: 'message' | 'delivery' | 'read' | 'postback';
        senderId: string;
        recipientId: string;
        timestamp: number;
        message?: {
          mid: string;
          text?: string;
          attachments?: Array<{
            type: string;
            payload: { url: string };
          }>;
        };
        delivery?: {
          mids: string[];
          watermark: number;
        };
        read?: {
          watermark: number;
        };
        postback?: {
          title: string;
          payload: string;
        };
      }> = [];

      for (const entry of payload.entry) {
        for (const event of entry.messaging || []) {
          let type: 'message' | 'delivery' | 'read' | 'postback' = 'message';

          if (event.delivery) type = 'delivery';
          else if (event.read) type = 'read';
          else if (event.postback) type = 'postback';

          events.push({
            type,
            senderId: event.sender.id,
            recipientId: event.recipient.id,
            timestamp: event.timestamp,
            message: event.message,
            delivery: event.delivery,
            read: event.read,
            postback: event.postback,
          });
        }
      }

      return { platform, events };
    } catch (error) {
      console.error('[Meta] Error parsing webhook event:', error);
      return null;
    }
  }
}

export const metaService = new MetaService();
