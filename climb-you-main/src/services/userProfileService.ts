/**
 * User Profile Service
 * オンボーディング完了後のユーザーデータ統合・管理サービス
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CompleteOnboardingData, 
  IntegratedUserProfile,
  AppSettings,
  UserProgress,
  GoalDeepDiveData,
  DailyQuestCompletion
} from '../types/userProfile';
import { ProfileV1, Quest, SkillAtom, Pattern } from './ai/promptEngine';
import { advancedQuestService } from './ai/advancedQuestService.fixed';

class UserProfileService {
  private readonly STORAGE_KEYS = {
    USER_PROFILE: 'integrated_user_profile',
    ONBOARDING_COMPLETE: 'onboarding_completed',
    DAILY_PROGRESS: 'daily_progress',
    APP_SETTINGS: 'app_settings',
  };

  /**
   * オンボーディング完了後のデータ統合処理
   */
  async integrateOnboardingData(
    onboardingData: CompleteOnboardingData
  ): Promise<IntegratedUserProfile> {
    try {
      console.log('🔄 Starting onboarding data integration...');
      
      // 1. AI Profileを生成
      const aiProfile = this.convertToAIProfile(onboardingData);
      
      // 2. スキルマップを生成
      const skillAtoms = await this.generateSkillMap(onboardingData.goalDeepDiveData);
      
      // 3. 初期クエストを生成
      const initialQuests = await this.generateInitialQuests(aiProfile, skillAtoms);
      
      // 4. 統合プロファイルを作成
      const userId = await this.generateUserId();
      const now = new Date();
      
      const integratedProfile: IntegratedUserProfile = {
        userId,
        createdAt: now,
        updatedAt: now,
        onboardingData,
        aiProfile,
        skillAtoms,
        initialQuests,
        appSettings: this.createDefaultAppSettings(),
        progress: this.createInitialProgress(initialQuests),
      };
      
      // 5. ローカルストレージに保存
      await this.saveUserProfile(integratedProfile);
      await this.markOnboardingComplete();
      
      console.log('✅ Onboarding data integration completed');
      return integratedProfile;
      
    } catch (error) {
      console.error('❌ Onboarding data integration failed:', error);
      throw new Error('Failed to integrate onboarding data');
    }
  }

  /**
   * オンボーディングデータからAI Profileに変換
   */
  private convertToAIProfile(data: CompleteOnboardingData): ProfileV1 {
    const { goalDeepDiveData, profileData } = data;
    
    return advancedQuestService.createBasicProfile({
      goalText: goalDeepDiveData.goal_text,
      timeBudgetMin: goalDeepDiveData.time_budget_min_per_day,
      motivation: goalDeepDiveData.goal_motivation,
      sessionLength: goalDeepDiveData.session_length_preference,
    });
  }

  /**
   * スキルマップ生成
   */
  private async generateSkillMap(goalData: GoalDeepDiveData): Promise<SkillAtom[]> {
    try {
      return await advancedQuestService.generateSkillMap({
        goalText: goalData.goal_text,
        currentLevelTags: [],
        priorityAreas: [],
      });
    } catch (error) {
      console.error('Skill map generation failed, using fallback:', error);
      // フォールバック: 基本的なスキルマップ
      return this.createFallbackSkillMap(goalData);
    }
  }

  /**
   * 初期クエスト生成
   */
  private async generateInitialQuests(profile: ProfileV1, skillAtoms: SkillAtom[]): Promise<Quest[]> {
    try {
      return await advancedQuestService.generateDailyQuests({
        profile,
        skillAtoms,
        checkins: {
          mood_energy: 'mid',
          available_time_today_delta_min: 0,
          focus_noise: 'mid',
        },
      });
    } catch (error) {
      console.error('Initial quest generation failed, using fallback:', error);
      return this.createFallbackQuests(profile);
    }
  }

  /**
   * ユーザープロファイル保存
   */
  async saveUserProfile(profile: IntegratedUserProfile): Promise<void> {
    try {
      profile.updatedAt = new Date();
      const serializedProfile = JSON.stringify(profile);
      await AsyncStorage.setItem(this.STORAGE_KEYS.USER_PROFILE, serializedProfile);
      console.log('💾 User profile saved to local storage');
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  /**
   * ユーザープロファイル読み込み
   */
  async loadUserProfile(): Promise<IntegratedUserProfile | null> {
    try {
      const serializedProfile = await AsyncStorage.getItem(this.STORAGE_KEYS.USER_PROFILE);
      if (serializedProfile) {
        const profile = JSON.parse(serializedProfile) as IntegratedUserProfile;
        // Dateオブジェクトの復元
        profile.createdAt = new Date(profile.createdAt);
        profile.updatedAt = new Date(profile.updatedAt);
        return profile;
      }
      return null;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

  /**
   * オンボーディング完了フラグ管理
   */
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(this.STORAGE_KEYS.ONBOARDING_COMPLETE);
      return completed === 'true';
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      return false;
    }
  }

  async markOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem(this.STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
  }

  async resetOnboarding(): Promise<void> {
    await AsyncStorage.multiRemove([
      this.STORAGE_KEYS.USER_PROFILE,
      this.STORAGE_KEYS.ONBOARDING_COMPLETE,
      this.STORAGE_KEYS.DAILY_PROGRESS,
    ]);
  }

  /**
   * 今日のクエスト生成
   */
  async generateTodaysQuests(profile: IntegratedUserProfile): Promise<Quest[]> {
    try {
      const checkins = await this.getDailyCheckins();
      return await advancedQuestService.generateDailyQuests({
        profile: profile.aiProfile,
        skillAtoms: profile.skillAtoms,
        checkins,
      });
    } catch (error) {
      console.error('Failed to generate today\'s quests:', error);
      return profile.initialQuests.slice(0, 3); // フォールバック
    }
  }

  /**
   * クエスト完了記録
   */
  async completeQuest(
    questId: string, 
    timeSpent: number, 
    feedback?: 'love' | 'like' | 'dislike',
    notes?: string
  ): Promise<void> {
    try {
      const profile = await this.loadUserProfile();
      if (!profile) return;

      // 完了記録を作成
      const completion: DailyQuestCompletion = {
        questId,
        completedAt: new Date(),
        timeSpent,
        feedback,
        notes,
      };

      // 進捗を更新
      profile.progress.totalQuestsCompleted++;
      profile.progress.totalTimeSpent += timeSpent;
      profile.progress.todaysProgress.completed++;
      profile.progress.todaysProgress.timeSpent += timeSpent;
      profile.progress.lastActiveAt = new Date();

      // 保存
      await this.saveUserProfile(profile);
      await this.saveDailyCompletion(completion);

      console.log(`✅ Quest completed: ${questId}`);
    } catch (error) {
      console.error('Failed to record quest completion:', error);
    }
  }

  // ===================
  // プライベートメソッド
  // ===================

  private async generateUserId(): Promise<string> {
    // シンプルなユニークID生成
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private createDefaultAppSettings(): AppSettings {
    return {
      aiEnabled: true,
      useMockAI: true, // デフォルトはモック
      dailyReminders: true,
      reminderTime: '09:00',
      theme: 'system',
      language: 'ja',
      dataSharing: false,
      analytics: true,
    };
  }

  private createInitialProgress(initialQuests: Quest[]): UserProgress {
    return {
      totalQuestsCompleted: 0,
      totalTimeSpent: 0,
      currentStreak: 0,
      todaysQuests: initialQuests.slice(0, 3),
      todaysProgress: {
        completed: 0,
        total: 3,
        timeSpent: 0,
      },
      weeklyProgress: {
        questsCompleted: 0,
        timeSpent: 0,
        daysActive: 0,
      },
      milestonesReached: [],
      lastActiveAt: new Date(),
    };
  }

  private createFallbackSkillMap(goalData: GoalDeepDiveData): SkillAtom[] {
    const baseSkills = goalData.goal_text.toLowerCase();
    return [
      {
        id: 'skill_basics',
        label: `${goalData.goal_text}の基礎`,
        type: 'concept' as const,
        level: 'intro' as const,
        bloom: 'understand' as const,
        prereq: [],
        representative_tasks: [`${goalData.goal_text}の基本概念を理解する`],
        suggested_patterns: ['read_note_q', 'flashcards'] as Pattern[],
      },
      {
        id: 'skill_practice',
        label: `${goalData.goal_text}の実践`,
        type: 'procedure' as const,
        level: 'basic' as const,
        bloom: 'apply' as const,
        prereq: ['skill_basics'],
        representative_tasks: [`${goalData.goal_text}の実践課題を完了する`],
        suggested_patterns: ['build_micro', 'config_verify'] as Pattern[],
      },
    ];
  }

  private createFallbackQuests(profile: ProfileV1): Quest[] {
    return [
      {
        title: `${profile.long_term_goal || '学習'}の基礎学習`,
        pattern: 'read_note_q' as const,
        minutes: profile.preferred_session_length_min || 20,
        difficulty: 0.3,
        deliverable: '基礎ノート',
        steps: ['重要ポイントを3つ選ぶ', 'ノートにまとめる'],
        criteria: ['基本概念が理解できている'],
        knowledge_check: [],
        tags: ['基礎', '学習'],
      },
    ];
  }

  private async getDailyCheckins() {
    // TODO: 実際のチェックイン機能実装
    return {
      mood_energy: 'mid' as const,
      available_time_today_delta_min: 0,
      focus_noise: 'mid' as const,
    };
  }

  private async saveDailyCompletion(completion: DailyQuestCompletion): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `${this.STORAGE_KEYS.DAILY_PROGRESS}_${today}`;
      
      const existing = await AsyncStorage.getItem(key);
      const completions = existing ? JSON.parse(existing) : [];
      completions.push(completion);
      
      await AsyncStorage.setItem(key, JSON.stringify(completions));
    } catch (error) {
      console.error('Failed to save daily completion:', error);
    }
  }
}

export const userProfileService = new UserProfileService();