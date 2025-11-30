/**
 * Evolution API Service for Worker
 * Handles WhatsApp message sending via Evolution API
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

interface EvolutionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SendTextPayload {
  number: string;
  text: string;
}

interface SendMediaPayload {
  number: string;
  mediatype: 'image' | 'video' | 'audio' | 'document';
  mimetype: string;
  media: string; // URL or base64
  caption?: string;
  fileName?: string;
}

interface MessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

interface SendResult {
  key: MessageKey;
  message: unknown;
  status: string;
}

async function request<T>(
  _instance: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: unknown,
): Promise<EvolutionResponse<T>> {
  try {
    const url = `${EVOLUTION_API_URL}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        apikey: EVOLUTION_API_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || 'Request failed',
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

export const evolutionService = {
  async sendText(
    instance: string,
    payload: SendTextPayload,
  ): Promise<EvolutionResponse<SendResult>> {
    return request<SendResult>(instance, `/message/sendText/${instance}`, 'POST', payload);
  },

  async sendMedia(
    instance: string,
    payload: SendMediaPayload,
  ): Promise<EvolutionResponse<SendResult>> {
    return request<SendResult>(instance, `/message/sendMedia/${instance}`, 'POST', payload);
  },

  async sendImage(
    instance: string,
    payload: { number: string; image: string; caption?: string },
  ): Promise<EvolutionResponse<SendResult>> {
    return request<SendResult>(instance, `/message/sendMedia/${instance}`, 'POST', {
      number: payload.number,
      mediatype: 'image',
      media: payload.image,
      caption: payload.caption,
    });
  },

  async sendAudio(
    instance: string,
    payload: { number: string; audio: string },
  ): Promise<EvolutionResponse<SendResult>> {
    return request<SendResult>(instance, `/message/sendWhatsAppAudio/${instance}`, 'POST', {
      number: payload.number,
      audio: payload.audio,
    });
  },

  async sendDocument(
    instance: string,
    payload: { number: string; document: string; fileName: string; mimetype: string },
  ): Promise<EvolutionResponse<SendResult>> {
    return request<SendResult>(instance, `/message/sendMedia/${instance}`, 'POST', {
      number: payload.number,
      mediatype: 'document',
      media: payload.document,
      fileName: payload.fileName,
      mimetype: payload.mimetype,
    });
  },
};
