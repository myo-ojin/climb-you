import { z } from 'zod';

// Daily completion record
export const DailyCompletionSchema = z.object({
  date: z.string(), // YYYY-MM-DD format
  completedCount: z.number().min(0),
  totalCount: z.number().min(0),
  completionRate: z.number().min(0).max(1), // 0-1
  completedQuests: z.array(z.object({
    id: z.string(),
    title: z.string(),
    category: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
    completedAt: z.string(), // ISO string
  })),
});

// Weekly stats
export const WeeklyStatsSchema = z.object({
  weekStartDate: z.string(), // YYYY-MM-DD format
  totalCompleted: z.number().min(0),
  totalAssigned: z.number().min(0),
  averageCompletionRate: z.number().min(0).max(1),
  streak: z.number().min(0), // consecutive days with at least one completion
  dailyRecords: z.array(DailyCompletionSchema),
});

// Simple statistics for MVP
export const SimpleStatsSchema = z.object({
  totalCompletedEver: z.number().min(0),
  totalAssignedEver: z.number().min(0),
  overallCompletionRate: z.number().min(0).max(1),
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  last7DaysCompleted: z.number().min(0),
  last7DaysAssigned: z.number().min(0),
  last7DaysRate: z.number().min(0).max(1),
});

// History view data
export const HistoryViewDataSchema = z.object({
  weeklyStats: WeeklyStatsSchema,
  simpleStats: SimpleStatsSchema,
  recentAchievements: z.array(z.object({
    date: z.string(),
    title: z.string(),
    description: z.string(),
    icon: z.string(),
  })),
});

// Type exports
export type DailyCompletion = z.infer<typeof DailyCompletionSchema>;
export type WeeklyStats = z.infer<typeof WeeklyStatsSchema>;
export type SimpleStats = z.infer<typeof SimpleStatsSchema>;
export type HistoryViewData = z.infer<typeof HistoryViewDataSchema>;

// Helper functions
export function calculateCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(1, completed / total);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getDateDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return formatDate(date);
}

export function getDayOfWeek(dateString: string): string {
  const date = new Date(dateString);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
}

export function isToday(dateString: string): boolean {
  return dateString === formatDate(new Date());
}

export function isYesterday(dateString: string): boolean {
  return dateString === getDateDaysAgo(1);
}