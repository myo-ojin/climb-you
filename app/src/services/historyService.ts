import { FirestoreService } from './firestore';
import { QuestStateService } from './questStateService';
import { 
  DailyCompletion, 
  WeeklyStats, 
  SimpleStats, 
  HistoryViewData,
  calculateCompletionRate,
  formatDate,
  getDateDaysAgo
} from '../types/history';
import { QuestCompletionRecord, DailyStats } from '../types/questHistory';

export class HistoryService {
  private firestoreService: FirestoreService;
  private questStateService: QuestStateService;

  constructor() {
    this.firestoreService = new FirestoreService();
    this.questStateService = new QuestStateService();
  }

  /**
   * Get comprehensive history data for the History screen
   */
  async getHistoryViewData(userId: string): Promise<HistoryViewData> {
    try {
      const [weeklyStats, simpleStats] = await Promise.all([
        this.getWeeklyStats(userId),
        this.getSimpleStats(userId),
      ]);

      const recentAchievements = await this.getRecentAchievements(userId);

      return {
        weeklyStats,
        simpleStats,
        recentAchievements,
      };
    } catch (error) {
      throw new Error(`Failed to get history data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get past 7 days statistics
   */
  async getWeeklyStats(userId: string): Promise<WeeklyStats> {
    try {
      const today = new Date();
      const weekStartDate = getDateDaysAgo(6); // 7 days ago to today

      const dailyRecords: DailyCompletion[] = [];
      let totalCompleted = 0;
      let totalAssigned = 0;
      let streak = 0;
      let currentStreakActive = true;

      // Get daily stats for the past 7 days
      for (let i = 6; i >= 0; i--) {
        const date = getDateDaysAgo(i);
        const dailyStats = await this.getDailyCompletion(userId, date);
        dailyRecords.push(dailyStats);

        totalCompleted += dailyStats.completedCount;
        totalAssigned += dailyStats.totalCount;

        // Calculate streak (consecutive days with at least one completion)
        if (dailyStats.completedCount > 0) {
          if (currentStreakActive || i === 0) { // Today or continuing streak
            streak++;
            currentStreakActive = true;
          }
        } else {
          if (i === 0) { // Today had no completions
            currentStreakActive = false;
          } else {
            currentStreakActive = false;
          }
        }
      }

      const averageCompletionRate = calculateCompletionRate(totalCompleted, totalAssigned);

      return {
        weekStartDate,
        totalCompleted,
        totalAssigned,
        averageCompletionRate,
        streak,
        dailyRecords,
      };
    } catch (error) {
      throw new Error(`Failed to get weekly stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get simple overall statistics
   */
  async getSimpleStats(userId: string): Promise<SimpleStats> {
    try {
      // Get all-time stats from quest state service
      const analytics = await this.questStateService.getQuestAnalytics(userId);
      
      // Get past 7 days stats
      const weeklyStats = await this.getWeeklyStats(userId);
      
      // Calculate overall stats
      const totalCompletedEver = analytics.totalCompleted;
      const totalAssignedEver = analytics.totalGenerated;
      const overallCompletionRate = calculateCompletionRate(totalCompletedEver, totalAssignedEver);
      
      // Get longest streak from stored data
      const longestStreak = await this.getLongestStreak(userId);
      
      return {
        totalCompletedEver,
        totalAssignedEver,
        overallCompletionRate,
        currentStreak: weeklyStats.streak,
        longestStreak,
        last7DaysCompleted: weeklyStats.totalCompleted,
        last7DaysAssigned: weeklyStats.totalAssigned,
        last7DaysRate: weeklyStats.averageCompletionRate,
      };
    } catch (error) {
      // Return default stats if there's an error
      return {
        totalCompletedEver: 0,
        totalAssignedEver: 0,
        overallCompletionRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        last7DaysCompleted: 0,
        last7DaysAssigned: 0,
        last7DaysRate: 0,
      };
    }
  }

  /**
   * Get daily completion data for a specific date
   */
  async getDailyCompletion(userId: string, date: string): Promise<DailyCompletion> {
    try {
      // Try to get daily stats from quest state service first
      const dailyStats = await this.questStateService.getDailyStats(userId, date);
      
      if (dailyStats) {
        // Get completed quests for this date
        const completedQuests = await this.getCompletedQuestsForDate(userId, date);
        
        return {
          date,
          completedCount: dailyStats.completedQuests,
          totalCount: dailyStats.totalQuests,
          completionRate: dailyStats.completionRate,
          completedQuests,
        };
      }

      // Fallback: return empty day
      return {
        date,
        completedCount: 0,
        totalCount: 0,
        completionRate: 0,
        completedQuests: [],
      };
    } catch (error) {
      // Return empty day on error
      return {
        date,
        completedCount: 0,
        totalCount: 0,
        completionRate: 0,
        completedQuests: [],
      };
    }
  }

  /**
   * Get completed quests for a specific date
   */
  private async getCompletedQuestsForDate(userId: string, date: string): Promise<Array<{
    id: string;
    title: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    completedAt: string;
  }>> {
    try {
      // Query completed quests for the date
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const records = await this.firestoreService.queryDocuments(
        `users/${userId}/questCompletions`,
        [
          { field: 'completedAt', operator: '>=', value: startDate.toISOString() },
          { field: 'completedAt', operator: '<', value: endDate.toISOString() },
          { field: 'status', operator: '==', value: 'completed' }
        ]
      );

      return records.map((record) => ({
        id: record.questId as string,
        title: record.questTitle as string,
        category: record.questCategory as string,
        difficulty: record.questDifficulty as 'easy' | 'medium' | 'hard',
        completedAt: (record.completedAt as Date).toISOString(),
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get recent achievements (simplified for MVP)
   */
  private async getRecentAchievements(userId: string): Promise<Array<{
    date: string;
    title: string;
    description: string;
    icon: string;
  }>> {
    try {
      const weeklyStats = await this.getWeeklyStats(userId);
      const achievements = [];

      // Add streak achievements
      if (weeklyStats.streak >= 7) {
        achievements.push({
          date: formatDate(new Date()),
          title: '1週間継続達成！',
          description: `${weeklyStats.streak}日連続でクエストを完了しました`,
          icon: '🔥',
        });
      } else if (weeklyStats.streak >= 3) {
        achievements.push({
          date: formatDate(new Date()),
          title: '継続の力！',
          description: `${weeklyStats.streak}日連続でクエストを完了中`,
          icon: '⭐',
        });
      }

      // Add completion rate achievements
      if (weeklyStats.averageCompletionRate >= 0.8) {
        achievements.push({
          date: formatDate(new Date()),
          title: '高達成率！',
          description: `この1週間の達成率: ${Math.round(weeklyStats.averageCompletionRate * 100)}%`,
          icon: '🎯',
        });
      }

      // Add total completion achievements
      if (weeklyStats.totalCompleted >= 10) {
        achievements.push({
          date: formatDate(new Date()),
          title: '積極的な学習！',
          description: `この1週間で${weeklyStats.totalCompleted}個のクエストを完了`,
          icon: '📚',
        });
      }

      return achievements.slice(0, 3); // Return max 3 recent achievements
    } catch (error) {
      return []; // Return empty array on error
    }
  }

  /**
   * Get longest streak ever achieved
   */
  private async getLongestStreak(userId: string): Promise<number> {
    try {
      // This would ideally be stored in user profile or calculated from historical data
      // For MVP, we'll use a simple approximation based on recent data
      const analytics = await this.questStateService.getQuestAnalytics(userId);
      
      // Simple estimate: if user has been consistent, longest streak is similar to recent activity
      if (analytics.currentStreak > 0) {
        return Math.max(analytics.currentStreak, 1);
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate mock history data for development/testing
   */
  generateMockHistoryData(): HistoryViewData {
    const today = new Date();
    const dailyRecords: DailyCompletion[] = [];

    // Generate 7 days of mock data
    for (let i = 6; i >= 0; i--) {
      const date = getDateDaysAgo(i);
      const totalCount = 3 + Math.floor(Math.random() * 3); // 3-5 quests per day
      const completedCount = Math.floor(totalCount * (0.6 + Math.random() * 0.4)); // 60-100% completion
      
      dailyRecords.push({
        date,
        completedCount,
        totalCount,
        completionRate: calculateCompletionRate(completedCount, totalCount),
        completedQuests: Array.from({ length: completedCount }, (_, index) => ({
          id: `quest_${date}_${index}`,
          title: `学習クエスト ${index + 1}`,
          category: ['language', 'skill', 'certification'][Math.floor(Math.random() * 3)],
          difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard',
          completedAt: new Date(date + 'T' + (10 + Math.floor(Math.random() * 8)) + ':00:00').toISOString(),
        })),
      });
    }

    const totalCompleted = dailyRecords.reduce((sum, day) => sum + day.completedCount, 0);
    const totalAssigned = dailyRecords.reduce((sum, day) => sum + day.totalCount, 0);

    const weeklyStats: WeeklyStats = {
      weekStartDate: getDateDaysAgo(6),
      totalCompleted,
      totalAssigned,
      averageCompletionRate: calculateCompletionRate(totalCompleted, totalAssigned),
      streak: 3, // Mock streak
      dailyRecords,
    };

    const simpleStats: SimpleStats = {
      totalCompletedEver: 45,
      totalAssignedEver: 60,
      overallCompletionRate: 0.75,
      currentStreak: 3,
      longestStreak: 7,
      last7DaysCompleted: totalCompleted,
      last7DaysAssigned: totalAssigned,
      last7DaysRate: weeklyStats.averageCompletionRate,
    };

    const recentAchievements = [
      {
        date: formatDate(today),
        title: '継続の力！',
        description: '3日連続でクエストを完了中',
        icon: '⭐',
      },
      {
        date: getDateDaysAgo(1),
        title: '高達成率！',
        description: 'この1週間の達成率: 75%',
        icon: '🎯',
      },
    ];

    return {
      weeklyStats,
      simpleStats,
      recentAchievements,
    };
  }
}