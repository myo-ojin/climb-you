import { z } from 'zod';

// OpenAI API Response Types
export const OpenAIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

export const OpenAICompletionSchema = z.object({
  id: z.string(),
  object: z.string(),
  created: z.number(),
  model: z.string(),
  choices: z.array(
    z.object({
      index: z.number(),
      message: OpenAIMessageSchema,
      finish_reason: z.string().nullable(),
    })
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

// User Profile Analysis Types
export const UserProfileSchema = z.object({
  age: z.string(),
  availableTime: z.number(), // minutes per day
  goals: z.array(z.string()),
  learningStyle: z.object({
    motivation: z.string(),
    pace: z.string(),
    obstacles: z.array(z.string()),
  }),
});

export const ProfileAnalysisSchema = z.object({
  learningStrategy: z.string(),
  recommendedPace: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  personalizedMessage: z.string(),
});

// Quest Generation Types
export const QuestSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedTime: z.number(), // minutes
  steps: z.array(z.string()),
  successCriteria: z.string(),
  goalContribution: z.string(),
});

export const DailyQuestsSchema = z.object({
  date: z.string(),
  quests: z.array(QuestSchema),
  aiMessage: z.string(),
  totalEstimatedTime: z.number(),
});

// API Error Types
export interface OpenAIError {
  type: 'rate_limit' | 'network' | 'api' | 'validation' | 'unknown';
  message: string;
  statusCode?: number;
  retryAfter?: number;
}

// Service Types
export interface OpenAIServiceConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// Type exports
export type OpenAIMessage = z.infer<typeof OpenAIMessageSchema>;
export type OpenAICompletion = z.infer<typeof OpenAICompletionSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProfileAnalysis = z.infer<typeof ProfileAnalysisSchema>;
export type Quest = z.infer<typeof QuestSchema>;
export type DailyQuests = z.infer<typeof DailyQuestsSchema>;