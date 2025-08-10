import { z } from 'zod';

// Quest difficulty levels
export type QuestDifficulty = 'easy' | 'medium' | 'hard';

// Quest categories
export type QuestCategory = 'learning' | 'practice' | 'reflection' | 'action' | 'research';

// Quest status
export type QuestStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

// Base Quest structure
export const QuestSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.enum(['learning', 'practice', 'reflection', 'action', 'research']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedTimeMinutes: z.number().min(5).max(240), // 5 minutes to 4 hours
  instructions: z.array(z.string()).min(1).max(10),
  successCriteria: z.array(z.string()).min(1).max(5),
  goalContribution: z.string().min(1).max(200), // How this contributes to long-term goal
  motivationMessage: z.string().min(1).max(150), // AI encouragement message
  status: z.enum(['pending', 'in_progress', 'completed', 'skipped']).default('pending'),
  createdAt: z.date(),
  completedAt: z.date().optional(),
  userId: z.string(),
});

export type Quest = z.infer<typeof QuestSchema>;

// Quest creation input (without system fields)
export const QuestInputSchema = QuestSchema.omit({
  id: true,
  status: true,
  createdAt: true,
  completedAt: true,
  userId: true,
});

export type QuestInput = z.infer<typeof QuestInputSchema>;

// Daily Quest Collection
export const DailyQuestCollectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD format
  quests: z.array(QuestSchema),
  totalEstimatedTime: z.number(),
  aiGeneratedMessage: z.string().min(1).max(300), // Daily motivation message
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DailyQuestCollection = z.infer<typeof DailyQuestCollectionSchema>;

// Quest Generation Request
export const QuestGenerationRequestSchema = z.object({
  userId: z.string(),
  userProfile: z.object({
    goals: z.array(z.string()),
    learningStyle: z.string(),
    availableTimeMinutes: z.number(),
    currentLevel: z.string(),
    interests: z.array(z.string()),
    challenges: z.array(z.string()).optional(),
  }),
  questCount: z.number().min(1).max(5).default(3),
  difficultyDistribution: z.object({
    easy: z.number().min(0).max(1),
    medium: z.number().min(0).max(1),
    hard: z.number().min(0).max(1),
  }).optional(),
  previousQuestHistory: z.array(z.object({
    category: z.string(),
    difficulty: z.string(),
    completed: z.boolean(),
    timeSpent: z.number().optional(),
  })).optional(),
});

export type QuestGenerationRequest = z.infer<typeof QuestGenerationRequestSchema>;

// AI Quest Generation Response Schema
export const AIQuestGenerationResponseSchema = z.object({
  quests: z.array(QuestInputSchema),
  dailyMessage: z.string().min(1).max(300),
  analysisNotes: z.string().optional(), // Internal AI analysis
  totalEstimatedTime: z.number(),
});

export type AIQuestGenerationResponse = z.infer<typeof AIQuestGenerationResponseSchema>;

// Quest Progress Tracking
export const QuestProgressSchema = z.object({
  questId: z.string(),
  userId: z.string(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  timeSpentMinutes: z.number().optional(),
  completionNotes: z.string().optional(),
  rating: z.number().min(1).max(5).optional(), // User satisfaction rating
  feedback: z.string().optional(),
});

export type QuestProgress = z.infer<typeof QuestProgressSchema>;

// Quest Statistics
export interface QuestStats {
  totalQuests: number;
  completedQuests: number;
  completionRate: number;
  averageTimeSpent: number;
  favoriteCategory: QuestCategory;
  currentStreak: number;
  longestStreak: number;
  totalTimeSpent: number;
}

// Error types for quest operations
export interface QuestError {
  type: 'generation' | 'validation' | 'storage' | 'network' | 'unknown';
  message: string;
  questId?: string;
  details?: any;
}

// Quest generation context for AI prompts
export interface QuestGenerationContext {
  userGoals: string[];
  recentCompletions: Quest[];
  failurePatterns: string[];
  timeConstraints: {
    availableTime: number;
    preferredTimes: string[];
  };
  adaptationNotes: string[];
}