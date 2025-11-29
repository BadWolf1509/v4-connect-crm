/**
 * Evolution API Service
 *
 * Provides integration with Evolution API for WhatsApp Business
 * Documentation: https://doc.evolution-api.com/
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

interface EvolutionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface Instance {
  instanceName: string;
  instanceId?: string;
  status: 'open' | 'close' | 'connecting';
  owner?: string;
  profileName?: string;
  profilePicUrl?: string;
}

interface QRCode {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

interface SendTextMessage {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
}

interface SendMediaMessage {
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  mimetype: string;
  caption?: string;
  media: string; // URL or base64
  fileName?: string;
}

interface MessageSent {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: Record<string, unknown>;
  messageTimestamp: string;
  status: string;
}

interface WebhookConfig {
  enabled: boolean;
  url: string;
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
  events: string[];
}

async function evolutionFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<EvolutionResponse<T>> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Evolution API Error: ${response.status} - ${error}`);
      return { success: false, error: error || `HTTP ${response.status}` };
    }

    const data = (await response.json()) as T;
    return { success: true, data };
  } catch (error) {
    console.error('Evolution API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export const evolutionService = {
  /**
   * Create a new WhatsApp instance
   */
  async createInstance(
    instanceName: string,
    options?: {
      integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS';
      qrcode?: boolean;
      number?: string;
    },
  ): Promise<EvolutionResponse<Instance>> {
    return evolutionFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: options?.integration || 'WHATSAPP-BAILEYS',
        qrcode: options?.qrcode !== false,
        number: options?.number,
      }),
    });
  },

  /**
   * Connect instance and get QR code
   */
  async connectInstance(instanceName: string): Promise<EvolutionResponse<QRCode>> {
    return evolutionFetch(`/instance/connect/${instanceName}`, {
      method: 'GET',
    });
  },

  /**
   * Get instance connection state
   */
  async getInstanceState(instanceName: string): Promise<EvolutionResponse<{ state: string }>> {
    return evolutionFetch(`/instance/connectionState/${instanceName}`, {
      method: 'GET',
    });
  },

  /**
   * Get instance info
   */
  async getInstanceInfo(instanceName: string): Promise<EvolutionResponse<Instance>> {
    return evolutionFetch(`/instance/fetchInstances?instanceName=${instanceName}`, {
      method: 'GET',
    });
  },

  /**
   * List all instances
   */
  async listInstances(): Promise<EvolutionResponse<Instance[]>> {
    return evolutionFetch('/instance/fetchInstances', {
      method: 'GET',
    });
  },

  /**
   * Delete instance
   */
  async deleteInstance(instanceName: string): Promise<EvolutionResponse<{ deleted: boolean }>> {
    return evolutionFetch(`/instance/delete/${instanceName}`, {
      method: 'DELETE',
    });
  },

  /**
   * Logout instance (disconnect without deleting)
   */
  async logoutInstance(instanceName: string): Promise<EvolutionResponse<{ logout: boolean }>> {
    return evolutionFetch(`/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
  },

  /**
   * Restart instance
   */
  async restartInstance(instanceName: string): Promise<EvolutionResponse<Instance>> {
    return evolutionFetch(`/instance/restart/${instanceName}`, {
      method: 'PUT',
    });
  },

  /**
   * Send text message
   */
  async sendText(
    instanceName: string,
    params: SendTextMessage,
  ): Promise<EvolutionResponse<MessageSent>> {
    return evolutionFetch(`/message/sendText/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        number: params.number,
        text: params.text,
        delay: params.delay,
        linkPreview: params.linkPreview,
      }),
    });
  },

  /**
   * Send media message (image, video, audio, document)
   */
  async sendMedia(
    instanceName: string,
    params: SendMediaMessage,
  ): Promise<EvolutionResponse<MessageSent>> {
    return evolutionFetch(`/message/sendMedia/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Send image message
   */
  async sendImage(
    instanceName: string,
    params: { number: string; image: string; caption?: string },
  ): Promise<EvolutionResponse<MessageSent>> {
    return this.sendMedia(instanceName, {
      number: params.number,
      mediatype: 'image',
      mimetype: 'image/jpeg',
      media: params.image,
      caption: params.caption,
    });
  },

  /**
   * Send audio message
   */
  async sendAudio(
    instanceName: string,
    params: { number: string; audio: string },
  ): Promise<EvolutionResponse<MessageSent>> {
    return this.sendMedia(instanceName, {
      number: params.number,
      mediatype: 'audio',
      mimetype: 'audio/ogg',
      media: params.audio,
    });
  },

  /**
   * Send document message
   */
  async sendDocument(
    instanceName: string,
    params: { number: string; document: string; fileName: string; mimetype: string },
  ): Promise<EvolutionResponse<MessageSent>> {
    return this.sendMedia(instanceName, {
      number: params.number,
      mediatype: 'document',
      mimetype: params.mimetype,
      media: params.document,
      fileName: params.fileName,
    });
  },

  /**
   * Configure webhook for instance
   */
  async setWebhook(
    instanceName: string,
    config: WebhookConfig,
  ): Promise<EvolutionResponse<{ webhook: boolean }>> {
    return evolutionFetch(`/webhook/set/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        enabled: config.enabled,
        url: config.url,
        webhookByEvents: config.webhookByEvents,
        webhookBase64: config.webhookBase64,
        events: config.events,
      }),
    });
  },

  /**
   * Get webhook configuration
   */
  async getWebhook(instanceName: string): Promise<EvolutionResponse<WebhookConfig>> {
    return evolutionFetch(`/webhook/find/${instanceName}`, {
      method: 'GET',
    });
  },

  /**
   * Check if number is on WhatsApp
   */
  async checkNumber(
    instanceName: string,
    numbers: string[],
  ): Promise<EvolutionResponse<Array<{ exists: boolean; jid: string; number: string }>>> {
    return evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ numbers }),
    });
  },

  /**
   * Get profile picture URL
   */
  async getProfilePicture(
    instanceName: string,
    number: string,
  ): Promise<EvolutionResponse<{ wuid: string; profilePictureUrl: string }>> {
    return evolutionFetch(`/chat/fetchProfilePictureUrl/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({ number }),
    });
  },

  /**
   * Mark message as read
   */
  async markAsRead(
    instanceName: string,
    params: { remoteJid: string; fromMe: boolean; id: string },
  ): Promise<EvolutionResponse<{ read: boolean }>> {
    return evolutionFetch(`/chat/markMessageAsRead/${instanceName}`, {
      method: 'PUT',
      body: JSON.stringify({
        readMessages: [
          {
            remoteJid: params.remoteJid,
            fromMe: params.fromMe,
            id: params.id,
          },
        ],
      }),
    });
  },

  /**
   * Send presence update (typing, recording, etc)
   */
  async sendPresence(
    instanceName: string,
    params: { number: string; presence: 'composing' | 'recording' | 'paused' },
  ): Promise<EvolutionResponse<{ presence: boolean }>> {
    return evolutionFetch(`/chat/sendPresence/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Get chat history
   */
  async getChatHistory(
    instanceName: string,
    params: { remoteJid: string; count?: number },
  ): Promise<
    EvolutionResponse<
      Array<{
        key: { remoteJid: string; fromMe: boolean; id: string };
        message: Record<string, unknown>;
        messageTimestamp: string;
      }>
    >
  > {
    return evolutionFetch(`/chat/findMessages/${instanceName}`, {
      method: 'POST',
      body: JSON.stringify({
        where: { key: { remoteJid: params.remoteJid } },
        limit: params.count || 50,
      }),
    });
  },
};

export type { Instance, QRCode, SendTextMessage, SendMediaMessage, MessageSent, WebhookConfig };
