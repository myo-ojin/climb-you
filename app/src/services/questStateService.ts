import { 
  QuestCompletionRecord, 
  DailyStats, 
  QuestStateUpdate, 
  QuestStateError,
  QuestAnalytics,
  QuestCompletionRecordSchema,
  DailyStatsSchema 
} from '../types/questHistory';
import { Quest, DailyQuestCollection, QuestStatus } from '../types/quest';
import { FirestoreService } from './firestore';
import { onSnapshot, doc, collection, query, where, orderBy, DocumentData } from 'firebase/firestore';
import { db } from './firebase';

export class QuestStateService {
  
  /**
   * Update quest status and handle state transitions
   */
  async updateQuestStatus(
    userId: string,
    questId: string,
    newStatus: QuestStatus,
    metadata?: {
      timeSpent?: number;
      rating?: number;
      feedback?: string;
      completionNotes?: string;
    }
  ): Promise<void> {
    try {
      // Get current daily quests
      const today = this.getTodayDateString();
      const dailyCollectionPath = `users/${userId}/dailyQuests`;
      
      const collections = await FirestoreService.queryDocuments<DailyQuestCollection>(
        dailyCollectionPath,
        [{ field: 'date', operator: '==', value: today }]
      );

      if (collections.length === 0) {
        throw new Error('No daily quests found for today');
      }

      const dailyCollection = collections[0];
      const questIndex = dailyCollection.quests.findIndex(q => q.id === questId);
      
      if (questIndex === -1) {
        throw new Error(`Quest ${questId} not found in today's collection`);
      }

      const quest = dailyCollection.quests[questIndex];
      const oldStatus = quest.status;

      // Update quest status
      quest.status = newStatus;
      quest.completedAt = newStatus === 'completed' ? new Date() : quest.completedAt;
      
      // Update the collection
      dailyCollection.quests[questIndex] = quest;
      dailyCollection.updatedAt = new Date();

      // Save updated collection
      await FirestoreService.set(dailyCollectionPath, dailyCollection.id, {
        ...dailyCollection,
        updatedAt: dailyCollection.updatedAt.toISOString(),
        quests: dailyCollection.quests.map(q => ({
          ...q,
          createdAt: q.createdAt.toISOString(),
          completedAt: q.completedAt?.toISOString(),
        }))
      });

      // If quest is completed or skipped, create completion record
      if (newStatus === 'completed' || newStatus === 'skipped') {
        await this.createCompletionRecord(userId, quest, newStatus, metadata);
      }

      // Update daily statistics
      await this.updateDailyStats(userId, today);

      // Create state update record for real-time sync
      const stateUpdate: QuestStateUpdate = {
        questId,
        userId,
        oldStatus,
        newStatus,
        timestamp: new Date(),
        metadata,
      };

      await this.recordStateUpdate(stateUpdate);

    } catch (error) {
      throw this.handleError(error, 'updateQuestStatus');
    }
  }

  /**
   * Create completion record in history
   */
  private async createCompletionRecord(
    userId: string,
    quest: Quest,
    status: 'completed' | 'skipped',
    metadata?: {
      timeSpent?: number;
      rating?: number;
      feedback?: string;
      completionNotes?: string;
    }
  ): Promise<void> {
    try {
      const completionRecord: QuestCompletionRecord = {
        id: `${quest.id}_completion_${Date.now()}`,
        userId,
        questId: quest.id,
        questTitle: quest.title,
        questCategory: quest.category,
        questDifficulty: quest.difficulty,
        estimatedTimeMinutes: quest.estimatedTimeMinutes,
        actualTimeMinutes: metadata?.timeSpent,
        status,
        completedAt: new Date(),
        rating: metadata?.rating,
        feedback: metadata?.feedback,
        goalContribution: quest.goalContribution,
        date: this.getTodayDateString(),
      };

      // Validate the record
      QuestCompletionRecordSchema.parse({
        ...completionRecord,
        completedAt: completionRecord.completedAt,
      });

      // Save to Firestore
      const historyPath = `users/${userId}/questHistory`;
      await FirestoreService.set(historyPath, completionRecord.id, {
        ...completionRecord,
        completedAt: completionRecord.completedAt.toISOString(),
      });

    } catch (error) {
      throw this.handleError(error, 'createCompletionRecord');
    }
  }

  /**
   * Update daily statistics
   */
  private async updateDailyStats(userId: string, date: string): Promise<void> {
    try {
      // Get today's quests
      const dailyCollectionPath = `users/${userId}/dailyQuests`;
      const collections = await FirestoreService.queryDocuments<DailyQuestCollection>(
        dailyCollectionPath,
        [{ field: 'date', operator: '==', value: date }]
      );

      if (collections.length === 0) {
        return;
      }

      const dailyCollection = collections[0];
      const quests = dailyCollection.quests;

      // Calculate statistics
      const totalQuests = quests.length;
      const completedQuests = quests.filter(q => q.status === 'completed').length;
      const skippedQuests = quests.filter(q => q.status === 'skipped').length;
      const pendingQuests = quests.filter(q => q.status === 'pending' || q.status === 'in_progress').length;
      const completionRate = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

      // Calculate time statistics
      const totalEstimatedTime = quests.reduce((sum, q) => sum + q.estimatedTimeMinutes, 0);
      
      // Get completion records for actual time calculation
      const historyPath = `users/${userId}/questHistory`;
      const completionRecords = await FirestoreService.queryDocuments<QuestCompletionRecord>(
        historyPath,
        [{ field: 'date', operator: '==', value: date }]
      );

      const totalActualTime = completionRecords
        .filter(r => r.actualTimeMinutes)
        .reduce((sum, r) => sum + (r.actualTimeMinutes || 0), 0);

      const timeEfficiency = totalEstimatedTime > 0 ? totalActualTime / totalEstimatedTime : 0;

      // Calculate average rating
      const ratingsWithValues = completionRecords.filter(r => r.rating);
      const averageRating = ratingsWithValues.length > 0
        ? ratingsWithValues.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsWithValues.length
        : undefined;

      // Category breakdown
      const categoryBreakdown: Record<string, { total: number; completed: number; completionRate: number }> = {};
      const categories = ['learning', 'practice', 'reflection', 'action', 'research'];
      
      categories.forEach(category => {
        const categoryQuests = quests.filter(q => q.category === category);
        const categoryCompleted = categoryQuests.filter(q => q.status === 'completed').length;
        categoryBreakdown[category] = {
          total: categoryQuests.length,
          completed: categoryCompleted,
          completionRate: categoryQuests.length > 0 ? Math.round((categoryCompleted / categoryQuests.length) * 100) : 0,
        };
      });

      // Difficulty breakdown
      const difficultyBreakdown: Record<string, { total: number; completed: number; completionRate: number }> = {};
      const difficulties = ['easy', 'medium', 'hard'];

      difficulties.forEach(difficulty => {
        const difficultyQuests = quests.filter(q => q.difficulty === difficulty);
        const difficultyCompleted = difficultyQuests.filter(q => q.status === 'completed').length;
        difficultyBreakdown[difficulty] = {
          total: difficultyQuests.length,
          completed: difficultyCompleted,
          completionRate: difficultyQuests.length > 0 ? Math.round((difficultyCompleted / difficultyQuests.length) * 100) : 0,
        };
      });

      // Create daily stats record
      const dailyStats: DailyStats = {
        id: `${userId}_stats_${date}`,
        userId,
        date,
        totalQuests,
        completedQuests,
        skippedQuests,
        pendingQuests,
        completionRate,
        totalEstimatedTime,
        totalActualTime,
        timeEfficiency,
        averageRating,
        categoryBreakdown,
        difficultyBreakdown,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Validate and save
      DailyStatsSchema.parse({
        ...dailyStats,
        createdAt: dailyStats.createdAt,
        updatedAt: dailyStats.updatedAt,
      });

      const statsPath = `users/${userId}/dailyStats`;
      await FirestoreService.set(statsPath, dailyStats.id, {
        ...dailyStats,
        createdAt: dailyStats.createdAt.toISOString(),
        updatedAt: dailyStats.updatedAt.toISOString(),
      });

    } catch (error) {
      throw this.handleError(error, 'updateDailyStats');
    }
  }

  /**
   * Record state update for real-time sync
   */
  private async recordStateUpdate(stateUpdate: QuestStateUpdate): Promise<void> {
    try {
      const updatesPath = `users/${stateUpdate.userId}/questStateUpdates`;
      const updateId = `${stateUpdate.questId}_${Date.now()}`;
      
      await FirestoreService.set(updatesPath, updateId, {
        ...stateUpdate,
        timestamp: stateUpdate.timestamp.toISOString(),
      });
    } catch (error) {
      // Log error but don't throw - state updates are supplementary
      console.error('Failed to record state update:', error);
    }
  }

  /**
   * Get daily statistics for a user
   */
  async getDailyStats(userId: string, date?: string): Promise<DailyStats | null> {
    try {
      const targetDate = date || this.getTodayDateString();
      const statsPath = `users/${userId}/dailyStats`;
      
      const results = await FirestoreService.queryDocuments<DailyStats>(
        statsPath,
        [{ field: 'date', operator: '==', value: targetDate }]
      );

      if (results.length === 0) {
        return null;
      }

      const stats = results[0];
      return {
        ...stats,
        createdAt: new Date(stats.createdAt),
        updatedAt: new Date(stats.updatedAt),
      } as DailyStats;
    } catch (error) {
      throw this.handleError(error, 'getDailyStats');
    }
  }

  /**
   * Get quest completion history for a period
   */
  async getCompletionHistory(
    userId: string, 
    days: number = 7
  ): Promise<QuestCompletionRecord[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days + 1);

      const startDateString = startDate.toISOString().split('T')[0];
      const endDateString = endDate.toISOString().split('T')[0];

      const historyPath = `users/${userId}/questHistory`;
      
      // For now, we'll get all records and filter in memory
      // In a production app, we'd want to use compound queries
      const allRecords = await FirestoreService.queryDocuments<QuestCompletionRecord>(
        historyPath,
        [{ field: 'userId', operator: '==', value: userId }]
      );

      return allRecords
        .filter(record => record.date >= startDateString && record.date <= endDateString)
        .map(record => ({
          ...record,
          completedAt: new Date(record.completedAt),
        }))
        .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());
    } catch (error) {
      throw this.handleError(error, 'getCompletionHistory');
    }
  }

  /**
   * Calculate completion streak
   */
  async calculateStreak(userId: string): Promise<number> {
    try {
      // Get last 30 days of stats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const statsPath = `users/${userId}/dailyStats`;
      const allStats = await FirestoreService.queryDocuments<DailyStats>(
        statsPath,
        [{ field: 'userId', operator: '==', value: userId }]
      );

      // Sort by date descending
      const sortedStats = allStats
        .filter(stat => new Date(stat.date) >= thirtyDaysAgo)
        .sort((a, b) => b.date.localeCompare(a.date));

      let streak = 0;
      const today = this.getTodayDateString();
      
      // Check if today has any completed quests
      const todayStats = sortedStats.find(stat => stat.date === today);
      if (!todayStats || todayStats.completedQuests === 0) {
        return 0;
      }

      // Count consecutive days with completed quests
      for (const stat of sortedStats) {
        if (stat.completedQuests > 0) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
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
    try {
      const updatesRef = collection(db, `users/${userId}/questStateUpdates`);
      const updatesQuery = query(
        updatesRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      return onSnapshot(
        updatesQuery,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const data = change.doc.data();
              const update: QuestStateUpdate = {
                ...data,
                timestamp: new Date(data.timestamp),
              } as QuestStateUpdate;
              
              onUpdate(update);
            }
          });
        },
        (error) => {
          console.error('Real-time listener error:', error);
          if (onError) {
            onError(error);
          }
        }
      );
    } catch (error) {
      console.error('Failed to setup real-time listener:', error);
      return () => {}; // Return empty cleanup function
    }
  }

  /**
   * Get basic quest analytics for adaptation
   */
  async getBasicAnalytics(userId: string, days: number = 7): Promise<Partial<QuestAnalytics>> {
    try {
      const completionHistory = await this.getCompletionHistory(userId, days);
      
      if (completionHistory.length === 0) {
        return {
          userId,
          period: days === 7 ? 'last_7_days' : 'last_30_days',
          completionPatterns: {
            byCategory: {} as any,
            byDifficulty: {} as any,
            byTimeOfDay: {} as any,
            byDayOfWeek: {} as any,
          },
          recommendations: {
            preferredCategories: [],
            optimalDifficulty: [],
            suggestedTimeSlots: [],
            adaptationNotes: [],
          },
        };
      }

      // Basic completion patterns by category
      const completedByCategory: Record<string, number> = {};
      const totalByCategory: Record<string, number> = {};

      completionHistory.forEach(record => {
        const category = record.questCategory;
        totalByCategory[category] = (totalByCategory[category] || 0) + 1;
        if (record.status === 'completed') {
          completedByCategory[category] = (completedByCategory[category] || 0) + 1;
        }
      });

      const byCategory: Record<string, { completed: number; total: number; rate: number }> = {};
      Object.keys(totalByCategory).forEach(category => {
        const completed = completedByCategory[category] || 0;
        const total = totalByCategory[category];
        byCategory[category] = {
          completed,
          total,
          rate: total > 0 ? completed / total : 0,
        };
      });

      return {
        userId,
        period: days === 7 ? 'last_7_days' : 'last_30_days',
        completionPatterns: {
          byCategory: byCategory as any,
          byDifficulty: {} as any, // Will be implemented similarly
          byTimeOfDay: {} as any,
          byDayOfWeek: {} as any,
        },
        recommendations: {
          preferredCategories: Object.entries(byCategory)
            .filter(([_, stats]) => stats.rate > 0.7)
            .map(([category, _]) => category as any),
          optimalDifficulty: [],
          suggestedTimeSlots: [],
          adaptationNotes: [],
        },
      };
    } catch (error) {
      console.error('Error getting basic analytics:', error);
      return {
        userId,
        period: days === 7 ? 'last_7_days' : 'last_30_days',
        completionPatterns: {
          byCategory: {} as any,
          byDifficulty: {} as any,
          byTimeOfDay: {} as any,
          byDayOfWeek: {} as any,
        },
        recommendations: {
          preferredCategories: [],
          optimalDifficulty: [],
          suggestedTimeSlots: [],
          adaptationNotes: [],
        },
      };
    }
  }

  /**
   * Get quest analytics summary
   */
  async getQuestAnalytics(userId: string): Promise<{ totalCompleted: number; totalGenerated: number; totalSkipped: number; completionRate: number; currentStreak: number }> {
    try {
      // Get all completion records
      const completionHistoryPath = `users/${userId}/questHistory`;
      const allCompletions = await FirestoreService.queryDocuments<QuestCompletionRecord>(
        completionHistoryPath,
        [{ field: 'userId', operator: '==', value: userId }]
      );

      const totalCompleted = allCompletions.filter(record => record.status === 'completed').length;
      const totalSkipped = allCompletions.filter(record => record.status === 'skipped').length;
      const totalGenerated = allCompletions.length;
      const completionRate = totalGenerated > 0 ? totalCompleted / totalGenerated : 0;
      
      // Get current streak
      const currentStreak = await this.calculateStreak(userId);

      return {
        totalCompleted,
        totalGenerated,
        totalSkipped,
        completionRate,
        currentStreak,
      };
    } catch (error) {
      console.error('Error getting quest analytics:', error);
      return {
        totalCompleted: 0,
        totalGenerated: 0,
        totalSkipped: 0,
        completionRate: 0,
        currentStreak: 0,
      };
    }
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: any, operation: string): QuestStateError {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return {
          type: 'state_update',
          message: `Quest or collection not found in ${operation}: ${error.message}`,
        };
      }

      if (error.message.includes('Firestore') || error.message.includes('Firebase')) {
        return {
          type: 'sync',
          message: `Database error in ${operation}: ${error.message}`,
        };
      }

      if (error.message.includes('validation') || error.message.includes('schema')) {
        return {
          type: 'stats_calculation',
          message: `Data validation error in ${operation}: ${error.message}`,
        };
      }

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