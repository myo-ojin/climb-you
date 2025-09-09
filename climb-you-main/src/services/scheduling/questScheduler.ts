/**
 * Quest Scheduler Service
 * Handles automatic daily quest generation scheduling
 */

import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyQuestService, UserProfile, QuestHistory } from '../ai/dailyQuestService';

const DAILY_QUEST_TASK = 'DAILY_QUEST_GENERATION';
const QUEST_NOTIFICATION_ID = 'daily_quest_notification';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface SchedulerConfig {
  enabled: boolean;
  dailyTime: { hour: number; minute: number }; // Default: 6:00 AM
  notificationEnabled: boolean;
  lastGeneratedDate?: string; // YYYY-MM-DD
}

export class QuestScheduler {
  private dailyQuestService: DailyQuestService;
  private isInitialized: boolean = false;

  constructor() {
    this.dailyQuestService = new DailyQuestService();
  }

  /**
   * Initialize the scheduler system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }

      // Define the background task
      this.defineBackgroundTask();

      // Check if we need to generate quests for today
      await this.checkAndGenerateTodayQuests();

      this.isInitialized = true;
      console.log('Quest scheduler initialized successfully');
    } catch (error) {
      console.error('Failed to initialize quest scheduler:', error);
    }
  }

  /**
   * Schedule daily 6AM quest generation
   */
  async scheduleDailyGeneration(userId: string, config: Partial<SchedulerConfig> = {}): Promise<void> {
    const defaultConfig: SchedulerConfig = {
      enabled: true,
      dailyTime: { hour: 6, minute: 0 },
      notificationEnabled: true,
      ...config,
    };

    try {
      // Cancel existing scheduled notifications
      await this.cancelDailyGeneration();

      if (!defaultConfig.enabled) {
        await this.saveSchedulerConfig(userId, { ...defaultConfig, enabled: false });
        return;
      }

      // Schedule daily notification at specified time
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🏔️ 今日のクエストが準備完了！",
          body: "新しいクエストであなたの目標に近づきましょう",
          data: { 
            type: 'daily_quest_ready',
            userId: userId,
            generateQuests: true,
          },
        },
        trigger: {
          hour: defaultConfig.dailyTime.hour,
          minute: defaultConfig.dailyTime.minute,
          repeats: true,
        },
        identifier: QUEST_NOTIFICATION_ID,
      });

      // Save configuration
      await this.saveSchedulerConfig(userId, defaultConfig);

      console.log(`Daily quest generation scheduled for ${defaultConfig.dailyTime.hour}:${defaultConfig.dailyTime.minute.toString().padStart(2, '0')}`);
    } catch (error) {
      console.error('Failed to schedule daily generation:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled daily generation
   */
  async cancelDailyGeneration(): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(QUEST_NOTIFICATION_ID);
      console.log('Daily quest generation canceled');
    } catch (error) {
      console.error('Failed to cancel daily generation:', error);
    }
  }

  /**
   * Generate quests for today (manual trigger)
   */
  async generateTodayQuests(userId: string): Promise<any> {
    try {
      const userProfile = await this.loadUserProfile(userId);
      const recentHistory = await this.loadRecentHistory(userId, 14); // Last 14 days

      const result = await this.dailyQuestService.generateTodaysQuests(
        userProfile,
        recentHistory
      );

      // Cache the generated quests
      await this.saveGeneratedQuests(userId, result);

      // Update last generated date
      const config = await this.getSchedulerConfig(userId);
      await this.saveSchedulerConfig(userId, {
        ...config,
        lastGeneratedDate: result.targetDate,
      });

      console.log('Today\'s quests generated successfully:', result.quests.length);
      return result;
    } catch (error) {
      console.error('Failed to generate today\'s quests:', error);
      throw error;
    }
  }

  /**
   * Get today's quests (from cache or generate if needed)
   */
  async getTodayQuests(userId: string): Promise<any | null> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Try to load from cache first
      const cachedQuests = await this.loadCachedQuests(userId, today);
      if (cachedQuests) {
        return cachedQuests;
      }

      // Generate if not cached
      return await this.generateTodayQuests(userId);
    } catch (error) {
      console.error('Failed to get today\'s quests:', error);
      return null;
    }
  }

  /**
   * Check if we need to generate quests for today
   */
  private async checkAndGenerateTodayQuests(): Promise<void> {
    try {
      // This would typically check all users, but for demo we'll check if there's a current user
      const currentUserId = await AsyncStorage.getItem('current_user_id');
      if (!currentUserId) return;

      const config = await this.getSchedulerConfig(currentUserId);
      const today = new Date().toISOString().split('T')[0];

      // Generate if enabled and not generated today
      if (config.enabled && config.lastGeneratedDate !== today) {
        await this.generateTodayQuests(currentUserId);
        
        // Send local notification if enabled
        if (config.notificationEnabled) {
          await this.sendQuestReadyNotification();
        }
      }
    } catch (error) {
      console.error('Failed to check and generate today\'s quests:', error);
    }
  }

  /**
   * Define the background task for quest generation
   */
  private defineBackgroundTask(): void {
    TaskManager.defineTask(DAILY_QUEST_TASK, async () => {
      try {
        await this.checkAndGenerateTodayQuests();
        return { success: true };
      } catch (error) {
        console.error('Background quest generation failed:', error);
        return { success: false };
      }
    });
  }

  /**
   * Send notification when quests are ready
   */
  private async sendQuestReadyNotification(): Promise<void> {
    try {
      await Notifications.presentNotificationAsync({
        title: "🎯 新しいクエストが到着！",
        body: "今日もあなたの目標に向かって一歩前進しましょう",
        data: { type: 'quest_ready' },
        sound: true,
      });
    } catch (error) {
      console.error('Failed to send quest ready notification:', error);
    }
  }

  // Storage methods

  private async saveSchedulerConfig(userId: string, config: SchedulerConfig): Promise<void> {
    const key = `scheduler_config_${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(config));
  }

  private async getSchedulerConfig(userId: string): Promise<SchedulerConfig> {
    const key = `scheduler_config_${userId}`;
    const configJson = await AsyncStorage.getItem(key);
    
    if (configJson) {
      return JSON.parse(configJson);
    }

    // Return default config
    return {
      enabled: true,
      dailyTime: { hour: 6, minute: 0 },
      notificationEnabled: true,
    };
  }

  private async saveGeneratedQuests(userId: string, questResult: any): Promise<void> {
    const key = `daily_quests_${userId}_${questResult.targetDate}`;
    await AsyncStorage.setItem(key, JSON.stringify(questResult));
  }

  private async loadCachedQuests(userId: string, date: string): Promise<any | null> {
    const key = `daily_quests_${userId}_${date}`;
    const questsJson = await AsyncStorage.getItem(key);
    return questsJson ? JSON.parse(questsJson) : null;
  }

  private async loadUserProfile(userId: string): Promise<UserProfile> {
    // This would typically load from Firestore, but for now we'll use a mock
    const mockProfile: UserProfile = {
      userId,
      goalData: {
        goal_text: "React Nativeでアプリ開発スキルを向上させる",
        goal_category: "skill",
        goal_deadline: "6m",
        goal_importance: 4,
        goal_motivation: "high",
        time_budget_min_per_day: 60,
        preferred_session_length_min: 25,
        env_constraints: [],
        modality_preference: ['read', 'video'],
        avoid_modality: [],
      },
      profileV1: {
        time_budget_min_per_day: 60,
        peak_hours: [9, 14, 19],
        env_constraints: [],
        hard_constraints: [],
        motivation_style: 'push',
        difficulty_tolerance: 0.7,
        novelty_preference: 0.6,
        pace_preference: 'cadence',
        long_term_goal: "React Nativeでアプリ開発スキルを向上させる",
        milestone_granularity: 0.5,
        current_level_tags: ['beginner'],
        priority_areas: ['skill'],
        heat_level: 4,
        risk_factors: [],
        preferred_session_length_min: 25,
        modality_preference: ['read', 'video'],
        deliverable_preferences: ['note'],
        weekly_minimum_commitment_min: 420,
        goal_motivation: 'high',
      },
      learningPatterns: {
        averageCompletionRate: 0.75,
        bestTimeSlots: [9, 14, 19],
        preferredDifficulty: 0.6,
        weeklyTrends: {
          Mon: 0.8,
          Tue: 0.75,
          Wed: 0.7,
          Thu: 0.65,
          Fri: 0.6,
          Sat: 0.8,
          Sun: 0.85,
        },
        improvementAreas: ['consistency', 'advanced concepts'],
        lastAnalyzed: Date.now(),
      },
      milestones: [],
      createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      lastUpdated: Date.now(),
    };

    return mockProfile;
  }

  private async loadRecentHistory(userId: string, days: number): Promise<QuestHistory[]> {
    // This would typically load from Firestore, but for now we'll return mock data
    const mockHistory: QuestHistory[] = [
      {
        questId: 'quest_1',
        title: 'React Native基礎学習',
        pattern: 'read_note_q',
        completedAt: Date.now() - 24 * 60 * 60 * 1000,
        actualMinutes: 30,
        difficulty: 0.5,
        wasSuccessful: true,
        userRating: 4,
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        questId: 'quest_2',
        title: 'コンポーネント作成練習',
        pattern: 'build_micro',
        completedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        actualMinutes: 45,
        difficulty: 0.7,
        wasSuccessful: true,
        userRating: 5,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      {
        questId: 'quest_3',
        title: 'デバッグ練習',
        pattern: 'debug_explain',
        difficulty: 0.6,
        wasSuccessful: false,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    ];

    return mockHistory;
  }

  /**
   * Get scheduler status for user
   */
  async getSchedulerStatus(userId: string): Promise<{
    isScheduled: boolean;
    config: SchedulerConfig;
    nextGeneration?: Date;
  }> {
    const config = await this.getSchedulerConfig(userId);
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const questNotification = scheduledNotifications.find(n => n.identifier === QUEST_NOTIFICATION_ID);
    
    let nextGeneration: Date | undefined;
    if (questNotification && questNotification.trigger && 'hour' in questNotification.trigger) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(questNotification.trigger.hour, questNotification.trigger.minute, 0, 0);
      nextGeneration = tomorrow;
    }

    return {
      isScheduled: !!questNotification,
      config,
      nextGeneration,
    };
  }
}

// Export singleton instance
export const questScheduler = new QuestScheduler();