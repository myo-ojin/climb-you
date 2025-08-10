import { QuestService } from './questService';
import { QuestStateService } from './questStateService';
import { 
  QuestGenerationRequest, 
  DailyQuestCollection, 
  Quest,
  QuestError,
  QuestStatus 
} from '../types/quest';
import { 
  QuestCompletionRecord, 
  DailyStats, 
  QuestStateUpdate 
} from '../types/questHistory';

/**
 * Quest Manager - High-level interface for quest operations
 * Provides manual execution capabilities for MVP
 */
export class QuestManager {
  private questService: QuestService;
  private questStateService: QuestStateService;

  constructor() {
    this.questService = new QuestService();
    this.questStateService = new QuestStateService();
  }

  /**
   * Generate and save daily quests for a user (Manual execution for MVP)
   */
  async generateTodaysQuests(
    userId: string,
    userProfile: {
      goals: string[];
      learningStyle: string;
      availableTimeMinutes: number;
      currentLevel: string;
      interests: string[];
      challenges?: string[];
    },
    options?: {
      questCount?: number;
      forceRegenerate?: boolean;
    }
  ): Promise<DailyQuestCollection> {
    try {
      const questCount = options?.questCount || 3;
      const forceRegenerate = options?.forceRegenerate || false;

      // Check if quests already exist for today
      if (!forceRegenerate) {
        const existingQuests = await this.questService.getDailyQuests(userId);
        if (existingQuests) {
          return existingQuests;
        }
      }

      // Create generation request
      const request: QuestGenerationRequest = {
        userId,
        userProfile,
        questCount,
        difficultyDistribution: {
          easy: 0.4,    // 40% easy
          medium: 0.4,  // 40% medium  
          hard: 0.2,    // 20% hard
        },
      };

      // Generate quests
      const dailyCollection = await this.questService.generateDailyQuests(request);

      // Save to Firestore
      await this.questService.saveDailyQuests(dailyCollection);

      return dailyCollection;
    } catch (error) {
      console.error('Error generating daily quests:', error);
      throw this.handleError(error, 'generateTodaysQuests');
    }
  }

  /**
   * Get today's quests for a user
   */
  async getTodaysQuests(userId: string): Promise<DailyQuestCollection | null> {
    try {
      return await this.questService.getDailyQuests(userId);
    } catch (error) {
      console.error('Error getting today\'s quests:', error);
      throw this.handleError(error, 'getTodaysQuests');
    }
  }

  /**
   * Mark a quest as completed with enhanced state management
   */
  async completeQuest(
    userId: string, 
    questId: string, 
    metadata?: {
      timeSpent?: number;
      rating?: number;
      feedback?: string;
      completionNotes?: string;
    }
  ): Promise<void> {
    try {
      await this.questStateService.updateQuestStatus(userId, questId, 'completed', metadata);
    } catch (error) {
      console.error('Error completing quest:', error);
      throw this.handleError(error, 'completeQuest');
    }
  }

  /**
   * Mark a quest as in progress
   */
  async startQuest(userId: string, questId: string): Promise<void> {
    try {
      await this.questStateService.updateQuestStatus(userId, questId, 'in_progress');
    } catch (error) {
      console.error('Error starting quest:', error);
      throw this.handleError(error, 'startQuest');
    }
  }

  /**
   * Skip a quest
   */
  async skipQuest(userId: string, questId: string, reason?: string): Promise<void> {
    try {
      await this.questStateService.updateQuestStatus(userId, questId, 'skipped', {
        completionNotes: reason,
      });
    } catch (error) {
      console.error('Error skipping quest:', error);
      throw this.handleError(error, 'skipQuest');
    }
  }

  /**
   * Generate sample quest request for testing (MVP helper)
   */
  createSampleQuestRequest(userId: string): QuestGenerationRequest {
    return {
      userId,
      userProfile: {
        goals: ['英語力向上', '資格取得', 'プログラミングスキル習得'],
        learningStyle: '実践重視で、短時間集中型の学習を好む',
        availableTimeMinutes: 60,
        currentLevel: '初級〜中級',
        interests: ['テクノロジー', '言語学習', '自己啓発'],
        challenges: ['継続性', '時間管理'],
      },
      questCount: 3,
      difficultyDistribution: {
        easy: 0.4,
        medium: 0.4,
        hard: 0.2,
      },
    };
  }

  /**
   * Test quest generation (MVP testing helper)
   */
  async testQuestGeneration(userId: string): Promise<{
    success: boolean;
    message: string;
    quests?: DailyQuestCollection;
    error?: string;
  }> {
    try {
      const sampleRequest = this.createSampleQuestRequest(userId);
      const quests = await this.questService.generateDailyQuests(sampleRequest);

      return {
        success: true,
        message: `Successfully generated ${quests.quests.length} quests`,
        quests,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Quest generation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get enhanced quest completion stats for user
   */
  async getCompletionStats(userId: string): Promise<{
    todayTotal: number;
    todayCompleted: number;
    todayCompletionRate: number;
    currentStreak: number;
    todayTimeSpent: number;
    todayTimeEfficiency: number;
    averageRating: number;
  }> {
    try {
      // Get today's daily stats
      const dailyStats = await this.questStateService.getDailyStats(userId);
      
      if (!dailyStats) {
        // Fallback to basic calculation
        const todaysQuests = await this.getTodaysQuests(userId);
        
        if (!todaysQuests) {
          return this.getEmptyStats();
        }

        const completedQuests = todaysQuests.quests.filter(q => q.status === 'completed');
        const completionRate = todaysQuests.quests.length > 0 
          ? Math.round((completedQuests.length / todaysQuests.quests.length) * 100)
          : 0;

        return {
          todayTotal: todaysQuests.quests.length,
          todayCompleted: completedQuests.length,
          todayCompletionRate: completionRate,
          currentStreak: 0,
          todayTimeSpent: 0,
          todayTimeEfficiency: 0,
          averageRating: 0,
        };
      }

      // Get current streak
      const currentStreak = await this.questStateService.calculateStreak(userId);

      return {
        todayTotal: dailyStats.totalQuests,
        todayCompleted: dailyStats.completedQuests,
        todayCompletionRate: dailyStats.completionRate,
        currentStreak,
        todayTimeSpent: dailyStats.totalActualTime,
        todayTimeEfficiency: Math.round(dailyStats.timeEfficiency * 100),
        averageRating: dailyStats.averageRating || 0,
      };
    } catch (error) {
      console.error('Error getting completion stats:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get quest completion history
   */
  async getCompletionHistory(userId: string, days: number = 7): Promise<QuestCompletionRecord[]> {
    try {
      return await this.questStateService.getCompletionHistory(userId, days);
    } catch (error) {
      console.error('Error getting completion history:', error);
      return [];
    }
  }

  /**
   * Get daily statistics for a specific date
   */
  async getDailyStats(userId: string, date?: string): Promise<DailyStats | null> {
    try {
      return await this.questStateService.getDailyStats(userId, date);
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return null;
    }
  }

  /**
   * Setup real-time listener for quest state changes
   */
  setupRealtimeListener(
    userId: string,
    onUpdate: (update: QuestStateUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    return this.questStateService.setupRealtimeListener(userId, onUpdate, onError);
  }

  /**
   * Get analytics data for quest adaptation
   */
  async getAnalyticsData(userId: string, days: number = 7) {
    try {
      return await this.questStateService.getBasicAnalytics(userId, days);
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return null;
    }
  }

  /**
   * Helper method to return empty stats
   */
  private getEmptyStats() {
    return {
      todayTotal: 0,
      todayCompleted: 0,
      todayCompletionRate: 0,
      currentStreak: 0,
      todayTimeSpent: 0,
      todayTimeEfficiency: 0,
      averageRating: 0,
    };
  }

  /**
   * Check if OpenAI service is ready
   */
  async isReady(): Promise<boolean> {
    try {
      // Test if OpenAI service can be initialized
      const sampleUserId = 'test-user';
      const testResult = await this.testQuestGeneration(sampleUserId);
      return testResult.success;
    } catch (error) {
      console.error('Quest Manager readiness check failed:', error);
      return false;
    }
  }

  /**
   * Get available quest categories and their descriptions
   */
  getQuestCategories(): Array<{
    category: string;
    description: string;
    icon: string;
  }> {
    return [
      {
        category: 'learning',
        description: '新しい知識やスキルの習得',
        icon: '📚',
      },
      {
        category: 'practice', 
        description: '既習内容の練習・定着',
        icon: '💪',
      },
      {
        category: 'reflection',
        description: '学習の振り返りと分析',
        icon: '🤔',
      },
      {
        category: 'action',
        description: '学んだことを実際に応用・実践',
        icon: '🚀',
      },
      {
        category: 'research',
        description: '情報収集や調査活動',
        icon: '🔍',
      },
    ];
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: any, operation: string): QuestError {
    if (error && typeof error === 'object' && 'type' in error) {
      // Already a QuestError
      return error as QuestError;
    }

    if (error instanceof Error) {
      return {
        type: 'unknown',
        message: `${operation} failed: ${error.message}`,
      };
    }

    return {
      type: 'unknown',
      message: `Unknown error in ${operation}`,
    };
  }
}