import { z } from 'zod';
import { QuestStatus, QuestDifficulty, QuestCategory } from './quest';

// Quest completion record
export const QuestCompletionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  questId: z.string(),
  questTitle: z.string(),
  questCategory: z.enum(['learning', 'practice', 'reflection', 'action', 'research']),
  questDifficulty: z.enum(['easy', 'medium', 'hard']),
  estimatedTimeMinutes: z.number(),
  actualTimeMinutes: z.number().optional(),
  status: z.enum(['completed', 'skipped']),
  completedAt: z.date(),
  rating: z.number().min(1).max(5).optional(), // User satisfaction rating
  feedback: z.string().optional(),
  goalContribution: z.string(),
  date: z.string(), // YYYY-MM-DD format
});

export type QuestCompletionRecord = z.infer<typeof QuestCompletionRecordSchema>;

// Daily statistics
export const DailyStatsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string(), // YYYY-MM-DD format
  totalQuests: z.number(),
  completedQuests: z.number(),
  skippedQuests: z.number(),
  pendingQuests: z.number(),
  completionRate: z.number(), // 0-100
  totalEstimatedTime: z.number(),
  totalActualTime: z.number(),
  timeEfficiency: z.number(), // actual/estimated ratio
  averageRating: z.number().optional(),
  categoryBreakdown: z.record(z.string(), z.object({
    total: z.number(),
    completed: z.number(),
    completionRate: z.number(),
  })),
  difficultyBreakdown: z.record(z.string(), z.object({
    total: z.number(),
    completed: z.number(),
    completionRate: z.number(),
  })),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DailyStats = z.infer<typeof DailyStatsSchema>;

// Weekly/Monthly aggregated statistics
export const PeriodStatsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  period: z.enum(['week', 'month']),
  startDate: z.string(),
  endDate: z.string(),
  totalQuests: z.number(),
  completedQuests: z.number(),
  completionRate: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  totalTimeSpent: z.number(),
  averageTimePerQuest: z.number(),
  mostProductiveDay: z.string().optional(),
  favoriteCategory: z.string().optional(),
  preferredDifficulty: z.string().optional(),
  improvementAreas: z.array(z.string()),
  achievements: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type PeriodStats = z.infer<typeof PeriodStatsSchema>;

// Real-time quest state update
export const QuestStateUpdateSchema = z.object({
  questId: z.string(),
  userId: z.string(),
  oldStatus: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  newStatus: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
  timestamp: z.date(),
  metadata: z.object({
    timeSpent: z.number().optional(),
    rating: z.number().min(1).max(5).optional(),
    feedback: z.string().optional(),
    completionNotes: z.string().optional(),
  }).optional(),
});

export type QuestStateUpdate = z.infer<typeof QuestStateUpdateSchema>;

// Achievement definitions
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'streak' | 'completion' | 'category' | 'difficulty' | 'time' | 'rating';
  criteria: {
    value: number;
    operator: '>=' | '>' | '==' | '<' | '<=';
    field: string; // e.g., 'currentStreak', 'completionRate', 'totalQuests'
  };
  unlockedAt?: Date;
}

// Quest analytics for adaptation
export interface QuestAnalytics {
  userId: string;
  period: 'last_7_days' | 'last_30_days';
  completionPatterns: {
    byCategory: Record<QuestCategory, { completed: number; total: number; rate: number }>;
    byDifficulty: Record<QuestDifficulty, { completed: number; total: number; rate: number }>;
    byTimeOfDay: Record<string, { completed: number; total: number; rate: number }>;
    byDayOfWeek: Record<string, { completed: number; total: number; rate: number }>;
  };
  timeEfficiency: {
    average: number;
    byCategory: Record<QuestCategory, number>;
    byDifficulty: Record<QuestDifficulty, number>;
  };
  userSatisfaction: {
    averageRating: number;
    ratingDistribution: Record<number, number>;
    commonFeedback: string[];
  };
  recommendations: {
    preferredCategories: QuestCategory[];
    optimalDifficulty: QuestDifficulty[];
    suggestedTimeSlots: string[];
    adaptationNotes: string[];
  };
}

// Error types for quest state management
export interface QuestStateError {
  type: 'state_update' | 'history_save' | 'stats_calculation' | 'sync' | 'unknown';
  message: string;
  questId?: string;
  userId?: string;
  details?: any;
}