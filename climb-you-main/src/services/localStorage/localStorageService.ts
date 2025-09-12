/**
 * Local Storage Service - PR2: Demo write policy fallback
 * AsyncStorage wrapper for Firebase data when Firestore is unavailable
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  FirebaseUserProfile,
  FirebaseGoal,
  FirebaseQuest,
  FirebaseProgress,
} from '../../types/firebase';

// Storage keys
const STORAGE_KEYS = {
  USER_PROFILE: (userId: string) => `user_profile_${userId}`,
  USER_GOALS: (userId: string) => `user_goals_${userId}`,
  USER_QUESTS: (userId: string) => `user_quests_${userId}`,
  USER_PROGRESS: (userId: string) => `user_progress_${userId}`,
  MIGRATION_STATUS: (userId: string) => `migration_status_${userId}`,
} as const;

export class LocalStorageService {
  
  // ============================================================================
  // USER PROFILE OPERATIONS
  // ============================================================================

  async saveUserProfile(userId: string, profileData: Partial<FirebaseUserProfile>): Promise<void> {
    try {
      const key = STORAGE_KEYS.USER_PROFILE(userId);
      const existing = await this.getUserProfile(userId);
      
      const updatedProfile = {
        userId,
        onboardingCompleted: false,
        onboardingVersion: '1.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...existing,
        ...profileData,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(updatedProfile));
      console.log(`💾 User profile saved locally: ${userId}`);
    } catch (error) {
      console.error(`❌ Error saving user profile locally for ${userId}:`, error);
      throw error;
    }
  }

  async getUserProfile(userId: string): Promise<FirebaseUserProfile | null> {
    try {
      const key = STORAGE_KEYS.USER_PROFILE(userId);
      const data = await AsyncStorage.getItem(key);
      
      if (data) {
        return JSON.parse(data) as FirebaseUserProfile;
      }
      
      console.log(`📄 User profile not found locally: ${userId}`);
      return null;
    } catch (error) {
      console.error(`❌ Error reading user profile locally for ${userId}:`, error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, updates: Partial<FirebaseUserProfile>): Promise<void> {
    try {
      const existing = await this.getUserProfile(userId);
      if (!existing) {
        throw new Error(`User profile not found for ${userId}`);
      }
      
      const updatedProfile = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await this.saveUserProfile(userId, updatedProfile);
    } catch (error) {
      console.error(`❌ Error updating user profile locally for ${userId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // GOAL OPERATIONS
  // ============================================================================

  async saveGoal(userId: string, goalData: Partial<FirebaseGoal>): Promise<string> {
    try {
      const goalId = goalData.id || `goal_${new Date().getTime()}`;
      const key = STORAGE_KEYS.USER_GOALS(userId);
      
      const goals = await this.getUserGoals(userId);
      const newGoal = {
        id: goalId,
        userId,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...goalData,
      };
      
      const updatedGoals = [...goals.filter(g => g.id !== goalId), newGoal];
      await AsyncStorage.setItem(key, JSON.stringify(updatedGoals));
      
      console.log(`💾 Goal saved locally: ${userId}/${goalId}`);
      return goalId;
    } catch (error) {
      console.error(`❌ Error saving goal locally for ${userId}:`, error);
      throw error;
    }
  }

  async getUserGoals(userId: string, status?: string): Promise<FirebaseGoal[]> {
    try {
      const key = STORAGE_KEYS.USER_GOALS(userId);
      const data = await AsyncStorage.getItem(key);
      
      let goals: FirebaseGoal[] = [];
      if (data) {
        goals = JSON.parse(data) as FirebaseGoal[];
      }
      
      if (status) {
        goals = goals.filter(goal => goal.status === status);
      }
      
      // Sort by created date descending
      goals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return goals;
    } catch (error) {
      console.error(`❌ Error reading goals locally for ${userId}:`, error);
      return [];
    }
  }

  // ============================================================================
  // QUEST OPERATIONS
  // ============================================================================

  async saveQuests(userId: string, quests: Partial<FirebaseQuest>[]): Promise<string[]> {
    try {
      const key = STORAGE_KEYS.USER_QUESTS(userId);
      const existingQuests = await this.getUserQuests(userId);
      const questIds: string[] = [];
      
      const newQuests = quests.map((quest, index) => {
        const questId = quest.id || `quest_${new Date().getTime()}_${index}`;
        questIds.push(questId);
        
        return {
          id: questId,
          userId,
          status: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...quest,
        };
      });
      
      const updatedQuests = [...existingQuests.filter(q => !questIds.includes(q.id)), ...newQuests];
      await AsyncStorage.setItem(key, JSON.stringify(updatedQuests));
      
      console.log(`💾 Quests saved locally: ${questIds.length} quests for user ${userId}`);
      return questIds;
    } catch (error) {
      console.error(`❌ Error saving quests locally for ${userId}:`, error);
      throw error;
    }
  }

  async getUserQuests(userId: string, status?: string): Promise<FirebaseQuest[]> {
    try {
      const key = STORAGE_KEYS.USER_QUESTS(userId);
      const data = await AsyncStorage.getItem(key);
      
      let quests: FirebaseQuest[] = [];
      if (data) {
        quests = JSON.parse(data) as FirebaseQuest[];
      }
      
      if (status) {
        quests = quests.filter(quest => quest.status === status);
      }
      
      // Sort by created date descending
      quests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return quests;
    } catch (error) {
      console.error(`❌ Error reading quests locally for ${userId}:`, error);
      return [];
    }
  }

  async updateQuestStatus(
    userId: string,
    questId: string,
    status: 'active' | 'completed' | 'skipped' | 'failed',
    outcome?: any
  ): Promise<void> {
    try {
      const quests = await this.getUserQuests(userId);
      const questIndex = quests.findIndex(q => q.id === questId);
      
      if (questIndex === -1) {
        throw new Error(`Quest not found: ${questId}`);
      }
      
      const updatedQuest = {
        ...quests[questIndex],
        status,
        updatedAt: new Date().toISOString(),
      };
      
      if (status === 'completed') {
        updatedQuest.completedAt = new Date().toISOString();
      } else if (status === 'skipped') {
        updatedQuest.skippedAt = new Date().toISOString();
      }
      
      if (outcome) {
        updatedQuest.outcome = outcome;
      }
      
      quests[questIndex] = updatedQuest;
      
      const key = STORAGE_KEYS.USER_QUESTS(userId);
      await AsyncStorage.setItem(key, JSON.stringify(quests));
      
      console.log(`💾 Quest status updated locally: ${userId}/${questId} -> ${status}`);
    } catch (error) {
      console.error(`❌ Error updating quest status locally for ${userId}/${questId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PROGRESS OPERATIONS
  // ============================================================================

  async saveDailyProgress(userId: string, progressData: Partial<FirebaseProgress>): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const progressId = progressData.id || `progress_${today}`;
      const key = STORAGE_KEYS.USER_PROGRESS(userId);
      
      const existingProgress = await this.getUserProgress(userId);
      const newProgress = {
        id: progressId,
        userId,
        date: today,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...progressData,
      };
      
      const updatedProgress = [...existingProgress.filter(p => p.id !== progressId), newProgress];
      await AsyncStorage.setItem(key, JSON.stringify(updatedProgress));
      
      console.log(`💾 Daily progress saved locally: ${userId}/${progressId}`);
    } catch (error) {
      console.error(`❌ Error saving daily progress locally for ${userId}:`, error);
      throw error;
    }
  }

  async getUserProgress(userId: string, days: number = 30): Promise<FirebaseProgress[]> {
    try {
      const key = STORAGE_KEYS.USER_PROGRESS(userId);
      const data = await AsyncStorage.getItem(key);
      
      let progress: FirebaseProgress[] = [];
      if (data) {
        progress = JSON.parse(data) as FirebaseProgress[];
      }
      
      // Filter by date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];
      
      progress = progress.filter(p => p.date >= startDateStr);
      
      // Sort by date descending
      progress.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      return progress;
    } catch (error) {
      console.error(`❌ Error reading progress locally for ${userId}:`, error);
      return [];
    }
  }

  // ============================================================================
  // MIGRATION HELPERS - PR6
  // ============================================================================

  async markAsMigrated(userId: string): Promise<void> {
    try {
      const key = STORAGE_KEYS.MIGRATION_STATUS(userId);
      await AsyncStorage.setItem(key, JSON.stringify({
        migrated: true,
        migratedAt: new Date().toISOString(),
      }));
      console.log(`📤 User marked as migrated: ${userId}`);
    } catch (error) {
      console.error(`❌ Error marking user as migrated: ${userId}:`, error);
    }
  }

  async isMigrated(userId: string): Promise<boolean> {
    try {
      const key = STORAGE_KEYS.MIGRATION_STATUS(userId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data).migrated === true : false;
    } catch (error) {
      console.error(`❌ Error checking migration status for ${userId}:`, error);
      return false;
    }
  }

  async hasLocalData(userId: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(userId);
      const goals = await this.getUserGoals(userId);
      const quests = await this.getUserQuests(userId);
      
      return !!(profile || goals.length > 0 || quests.length > 0);
    } catch (error) {
      console.error(`❌ Error checking local data for ${userId}:`, error);
      return false;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async clearUserData(userId: string): Promise<void> {
    try {
      const keys = [
        STORAGE_KEYS.USER_PROFILE(userId),
        STORAGE_KEYS.USER_GOALS(userId),
        STORAGE_KEYS.USER_QUESTS(userId),
        STORAGE_KEYS.USER_PROGRESS(userId),
        STORAGE_KEYS.MIGRATION_STATUS(userId),
      ];
      
      await AsyncStorage.multiRemove(keys);
      console.log(`🗑️ Local data cleared for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Error clearing local data for ${userId}:`, error);
      throw error;
    }
  }
}

// Provide a default singleton instance for ease of import
const localStorageService = new LocalStorageService();
export default localStorageService;
export { localStorageService };

// (Legacy exports removed to avoid duplicate declarations)
