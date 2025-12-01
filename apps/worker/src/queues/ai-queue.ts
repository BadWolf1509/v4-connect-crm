import { and, db, eq, schema } from '@v4-connect/database';
import { type Job, Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import OpenAI from 'openai';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const eventRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const openai =
  process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'test'
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

interface TranscriptionJob {
  tenantId: string;
  messageId: string;
  audioUrl: string;
  language?: string;
}

interface SuggestionJob {
  tenantId: string;
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface SentimentJob {
  tenantId: string;
  messageId: string;
  content: string;
}

interface ChatbotJob {
  tenantId: string;
  chatbotId: string;
  conversationId: string;
  message: string;
  context: Record<string, unknown>;
}

type AIJob = TranscriptionJob | SuggestionJob | SentimentJob | ChatbotJob;

export const aiQueue = new Queue<AIJob>('ai', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 200,
  },
});

export const aiWorker = new Worker<AIJob>(
  'ai',
  async (job: Job) => {
    const { name, data } = job;

    switch (name) {
      case 'transcribe':
        return await transcribeAudio(data as TranscriptionJob);
      case 'suggest':
        return await generateSuggestion(data as SuggestionJob);
      case 'sentiment':
        return await analyzeSentiment(data as SentimentJob);
      case 'chatbot':
        return await processChatbot(data as ChatbotJob);
      default:
        throw new Error(`Unknown job type: ${name}`);
    }
  },
  {
    connection,
    concurrency: 3, // Limit concurrent AI calls
  },
);

async function publishEvent(event: string, payload: Record<string, unknown>) {
  await eventRedis.publish(
    'socket:events',
    JSON.stringify({
      type: event,
      ...payload,
    }),
  );
}

async function transcribeAudio(data: TranscriptionJob) {
  const { tenantId, messageId, audioUrl, language } = data;

  console.log(`Transcribing audio for message ${messageId}`);

  let transcription = 'Transcription not available';

  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Transcreva o áudio de forma concisa. Caso não consiga, retorne um resumo curto.',
          },
          {
            role: 'user',
            content: `Link do áudio: ${audioUrl}${language ? ` Idioma: ${language}` : ''}`,
          },
        ],
      });

      const candidate = response.choices[0]?.message?.content;
      if (candidate) {
        transcription = candidate;
      }
    } catch (error) {
      console.error('[AI] Whisper transcription failed', error);
    }
  }

  const [message] = await db
    .select({
      metadata: schema.messages.metadata,
    })
    .from(schema.messages)
    .where(and(eq(schema.messages.id, messageId), eq(schema.messages.tenantId, tenantId)))
    .limit(1);

  const metadata = {
    ...(message?.metadata as Record<string, unknown> | undefined),
    transcription,
  };

  await db
    .update(schema.messages)
    .set({
      metadata,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.messages.id, messageId), eq(schema.messages.tenantId, tenantId)));

  await publishEvent('ai.transcription', { tenantId, messageId, transcription });

  return { transcription };
}

async function generateSuggestion(data: SuggestionJob) {
  const { tenantId, conversationId, messages } = data;

  console.log(`Generating suggestions for conversation ${conversationId}`);

  let suggestions: string[] = [
    'Sugestão de resposta 1',
    'Sugestão de resposta 2',
    'Sugestão de resposta 3',
  ];

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Gere 3 sugestões curtas e objetivas para responder ao cliente. Responda em português e separe-as por "||" (pipe duplo).',
          },
          ...messages,
        ],
      });

      const raw = completion.choices[0]?.message?.content || '';
      const parsed = raw
        .split('||')
        .map((item) => item.trim())
        .filter(Boolean);
      if (parsed.length) suggestions = parsed.slice(0, 3);
    } catch (error) {
      console.error('[AI] Suggestion generation failed', error);
    }
  }

  const [conversation] = await db
    .select({ metadata: schema.conversations.metadata })
    .from(schema.conversations)
    .where(
      and(eq(schema.conversations.id, conversationId), eq(schema.conversations.tenantId, tenantId)),
    )
    .limit(1);

  const metadata = {
    ...(conversation?.metadata as Record<string, unknown> | undefined),
    aiSuggestions: suggestions,
  };

  await db
    .update(schema.conversations)
    .set({
      metadata,
      updatedAt: new Date(),
    })
    .where(
      and(eq(schema.conversations.id, conversationId), eq(schema.conversations.tenantId, tenantId)),
    );

  await publishEvent('ai.suggestions', { tenantId, conversationId, suggestions });

  return {
    suggestions,
  };
}

async function analyzeSentiment(data: SentimentJob) {
  const { tenantId, messageId, content } = data;

  console.log(`Analyzing sentiment for message ${messageId}`);

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let score = 0.5;

  const normalized = content.toLowerCase();
  if (normalized.includes('obrigado') || normalized.includes('bom')) {
    sentiment = 'positive';
    score = 0.82;
  } else if (
    normalized.includes('ruim') ||
    normalized.includes('pessimo') ||
    normalized.includes('péssimo')
  ) {
    sentiment = 'negative';
    score = 0.21;
  }

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Classifique o sentimento da mensagem como positive, neutral ou negative e retorne também um score entre 0 e 1. Responda no formato "sentiment:neutral score:0.52".',
          },
          { role: 'user', content },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '';
      const sentimentMatch = raw.match(/sentiment:(positive|neutral|negative)/i);
      const scoreMatch = raw.match(/score:([0-9.]+)/i);
      if (sentimentMatch?.[1]) {
        sentiment = sentimentMatch[1].toLowerCase() as typeof sentiment;
      }
      if (scoreMatch?.[1]) {
        const parsedScore = Number.parseFloat(scoreMatch[1]);
        if (Number.isFinite(parsedScore)) score = parsedScore;
      }
    } catch (error) {
      console.error('[AI] Sentiment analysis failed', error);
    }
  }

  const [message] = await db
    .select({ metadata: schema.messages.metadata })
    .from(schema.messages)
    .where(and(eq(schema.messages.id, messageId), eq(schema.messages.tenantId, tenantId)))
    .limit(1);

  const metadata = {
    ...(message?.metadata as Record<string, unknown> | undefined),
    sentiment,
    sentimentScore: score,
  };

  await db
    .update(schema.messages)
    .set({
      metadata,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.messages.id, messageId), eq(schema.messages.tenantId, tenantId)));

  await publishEvent('ai.sentiment', { tenantId, messageId, sentiment, score });

  return {
    sentiment,
    score,
  };
}

async function processChatbot(data: ChatbotJob) {
  const { tenantId, chatbotId, conversationId, message, context } = data;

  console.log(`Processing chatbot ${chatbotId} for conversation ${conversationId}`);

  let responseText = `Bot: ${message}`;

  if (openai) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um chatbot de atendimento da V4. Responda de forma curta e objetiva, sempre em português.',
          },
          { role: 'user', content: message },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (raw) responseText = raw;
    } catch (error) {
      console.error('[AI] Chatbot generation failed', error);
    }
  }

  const now = new Date();

  const [created] = await db
    .insert(schema.messages)
    .values({
      tenantId,
      conversationId,
      senderType: 'bot',
      type: 'text',
      direction: 'outbound',
      content: responseText,
      status: 'sent',
      metadata: { chatbotId, context },
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.messages.id });

  await db
    .update(schema.conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(schema.conversations.id, conversationId), eq(schema.conversations.tenantId, tenantId)),
    );

  await publishEvent('ai.chatbot', {
    tenantId,
    conversationId,
    messageId: created?.id,
    response: responseText,
  });

  return {
    response: responseText,
    action: 'send_message',
  };
}

// Helper functions to add jobs
export const addTranscriptionJob = (data: TranscriptionJob) => {
  return aiQueue.add('transcribe', data);
};

export const addSuggestionJob = (data: SuggestionJob) => {
  return aiQueue.add('suggest', data, { priority: 2 });
};

export const addSentimentJob = (data: SentimentJob) => {
  return aiQueue.add('sentiment', data, { priority: 3 });
};

export const addChatbotJob = (data: ChatbotJob) => {
  return aiQueue.add('chatbot', data, { priority: 1 });
};
