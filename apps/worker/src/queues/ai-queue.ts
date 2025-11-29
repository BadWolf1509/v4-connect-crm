import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

interface TranscriptionJob {
  messageId: string;
  audioUrl: string;
  language?: string;
}

interface SuggestionJob {
  conversationId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

interface SentimentJob {
  messageId: string;
  content: string;
}

interface ChatbotJob {
  chatbotId: string;
  conversationId: string;
  message: string;
  context: Record<string, any>;
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
  }
);

async function transcribeAudio(data: TranscriptionJob) {
  const { messageId, audioUrl, language } = data;

  console.log(`Transcribing audio for message ${messageId}`);

  // TODO: Download audio file
  // TODO: Send to OpenAI Whisper API
  // TODO: Save transcription to database
  // TODO: Emit socket event

  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const transcription = await openai.audio.transcriptions.create({
  //   file: audioFile,
  //   model: 'whisper-1',
  //   language,
  // });

  return { transcription: 'Transcribed text here' };
}

async function generateSuggestion(data: SuggestionJob) {
  const { conversationId, messages } = data;

  console.log(`Generating suggestions for conversation ${conversationId}`);

  // TODO: Call OpenAI GPT API
  // TODO: Generate 3 response suggestions
  // TODO: Emit socket event with suggestions

  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const completion = await openai.chat.completions.create({
  //   model: 'gpt-4',
  //   messages: [
  //     { role: 'system', content: 'Generate 3 helpful response suggestions...' },
  //     ...messages,
  //   ],
  // });

  return {
    suggestions: [
      'Sugestão de resposta 1',
      'Sugestão de resposta 2',
      'Sugestão de resposta 3',
    ],
  };
}

async function analyzeSentiment(data: SentimentJob) {
  const { messageId, content } = data;

  console.log(`Analyzing sentiment for message ${messageId}`);

  // TODO: Call AI for sentiment analysis
  // TODO: Update message with sentiment
  // TODO: Update contact sentiment score

  return {
    sentiment: 'positive',
    score: 0.85,
  };
}

async function processChatbot(data: ChatbotJob) {
  const { chatbotId, conversationId, message, context } = data;

  console.log(`Processing chatbot ${chatbotId} for conversation ${conversationId}`);

  // TODO: Get chatbot configuration
  // TODO: Build prompt with context
  // TODO: Call AI API
  // TODO: Parse response
  // TODO: Execute actions (send message, collect data, transfer, etc)

  return {
    response: 'Chatbot response',
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
