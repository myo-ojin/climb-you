/**
 * Firebase User Profile Service
 * Firebase統合版ユーザープロファイル管理サービス
 */

import { 
  CompleteOnboardingData, 
  IntegratedUserProfile,
  AppSettings,
  UserProgress,
  GoalDeepDiveData,
  DailyQuestCompletion
} from '../../types/userProfile';
import { 
  FirebaseUserProfile,
  FirebaseGoal,
  FirebaseQuest,
  FirebaseProgress,
  FirebaseProfileResponse,
  FirebaseQuestPreference,
  OnboardingToFirebaseData
} from '../../types/firebase';
import { ProfileV1, Quest, SkillAtom, Pattern } from '../ai/promptEngine';
import { firestoreService } from './firestoreService';
import { getCurrentUserId, signInAnonymousUser } from '../../config/firebaseConfig';
import { advancedQuestService } from '../ai/advancedQuestService.fixed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { EnvironmentConfig } from '../../config/environmentConfig';
import { localStorageService } from '../localStorage/localStorageService';

class FirebaseUserProfileService {
  private readonly STORAGE_KEYS = {
    CACHED_PROFILE: 'firebase_cached_profile',
    LAST_SYNC: 'firebase_last_sync',
  };

  /**
   * オンボーディング完了後のFirebaseデータ統合処理
   */
  async integrateOnboardingData(
    onboardingData: CompleteOnboardingData
  ): Promise<IntegratedUserProfile> {
    try {
      console.log('🔥 Starting Firebase onboarding data integration...', {
        hasGoalDeepDiveData: !!onboardingData.goalDeepDiveData,
        hasProfileData: !!onboardingData.profileData,
        hasQuestPreferencesData: !!onboardingData.questPreferencesData,
        hasLearningStrategy: !!onboardingData.learningStrategy,
        goalText: onboardingData.goalDeepDiveData?.goal_text || 'Not provided',
        profileAnswersCount: Object.keys(onboardingData.profileData?.profileAnswers || {}).length,
        questPreferencesCount: Object.keys(onboardingData.questPreferencesData?.preferences || {}).length
      });
      
      // 1. Anonymous userを取得/作成 (デモモード対応済み)
      const userId = await signInAnonymousUser();
      console.log('🔍 Firebase: User ID obtained:', userId);
      
      // 2. AI Profileを生成
      const aiProfile = this.convertToAIProfile(onboardingData);
      
      // 3. スキルマップを生成 (エラーハンドリング付き)
      let skillAtoms: SkillAtom[] = [];
      try {
        skillAtoms = await this.generateSkillMap(onboardingData.goalDeepDiveData);
      } catch (skillError) {
        console.log('⚠️ Skill map generation failed, using basic skills:', skillError);
        skillAtoms = this.getBasicSkillAtoms(onboardingData.goalDeepDiveData);
      }
      
      // 4. 初期クエストを生成 (エラーハンドリング付き)
      let initialQuests: Quest[] = [];
      try {
        initialQuests = await this.generateInitialQuests(aiProfile, skillAtoms);
      } catch (questError) {
        console.log('⚠️ Initial quest generation failed, using basic quests:', questError);
        initialQuests = this.getBasicQuests(onboardingData.goalDeepDiveData);
      }
      
      // 5. Firebaseデータ構造に変換 (エラーハンドリング付き)
      let firebaseData;
      try {
        console.log('🔍 Converting to Firebase data structure...', {
          userId,
          hasOnboardingData: !!onboardingData,
          hasAiProfile: !!aiProfile,
          skillAtomsCount: skillAtoms.length,
          initialQuestsCount: initialQuests.length,
          onboardingDataKeys: Object.keys(onboardingData || {})
        });
        
        firebaseData = await this.convertToFirebaseData(
          userId,
          onboardingData,
          aiProfile,
          skillAtoms,
          initialQuests
        );
        
        console.log('✅ Firebase data conversion successful');
      } catch (conversionError) {
        console.error('❌ Firebase data conversion error:', conversionError);
        throw new Error(`Firebase data conversion failed: ${conversionError.message}`);
      }
      
      // 6. データを永続化 (PR3: Always persist onboarding result - never skip)
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log('💾 Firebase Save Decision:', {
        mode: envInfo.mode,
        persistenceTarget: envInfo.persistenceTarget,
        alwaysPersist: true, // PR3: Never skip persistence
        userId: userId,
        dataStructure: {
          userProfile: !!firebaseData.userProfile,
          goal: !!firebaseData.goal,
          questsCount: firebaseData.initialQuests.length,
          responsesCount: firebaseData.profileResponses.length,
          preferencesCount: firebaseData.questPreferences.length
        }
      });
      
      try {
        console.log(`💾 Starting persistence operation to ${envInfo.persistenceTarget}...`);
        await this.saveToFirestore(userId, firebaseData);
        console.log(`✅ Onboarding data persisted successfully to ${envInfo.persistenceTarget}`);
      } catch (persistenceError) {
        console.error('❌ Persistence operation failed:', persistenceError);
        // This should not happen with PR2 fallback mechanism, but log for debugging
        throw new Error(`Failed to persist onboarding data: ${persistenceError.message}`);
      }
      
      // 7. 統合プロファイル形式で返却
      console.log('🔧 Building integrated profile...');
      const integratedProfile = await this.buildIntegratedProfile(userId, firebaseData);
      console.log('✅ Integrated profile built:', {
        userId: integratedProfile.userId,
        questCount: integratedProfile.initialQuests?.length || 0,
        todayQuestCount: integratedProfile.progress?.todaysQuests?.length || 0,
        todayQuestTitles: integratedProfile.progress?.todaysQuests?.map(q => q.title) || []
      });
      
      // 8. ローカルキャッシュに保存 (常に実行)
      console.log('💾 Saving integrated profile to cache...');
      await this.cacheProfile(integratedProfile);
      console.log('✅ Profile cached successfully');
      
      console.log('✅ Firebase onboarding data integration completed:', {
        userId,
        questCount: initialQuests.length,
        skillCount: skillAtoms.length,
        demoMode: envInfo.mode
      });
      
      return integratedProfile;
    } catch (error) {
      console.error('❌ Firebase onboarding integration error:', error);
      
      // Create fallback profile with basic data
      console.log('🎭 Creating fallback profile...');
      return await this.createFallbackProfile(onboardingData);
    }
  }

  /**
   * ユーザープロファイルをロード（Firestore→ローカル）
   */
  async loadUserProfile(): Promise<IntegratedUserProfile | null> {
    try {
      console.log('📂 Loading user profile...');
      
      // デモモード時は最初にキャッシュを確認（Firebase呼び出しをスキップ）
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      if (envInfo.mode === 'demo') {
        console.log('🎭 Demo mode: Checking cache first before Firebase...');
        const cachedProfile = await this.loadCachedProfile();
        if (cachedProfile) {
          console.log('✅ Demo mode: Successfully loaded profile from cache');
          return cachedProfile;
        } else {
          console.log('📭 Demo mode: No cached profile found, will create fallback');
          return null;
        }
      }
      
      // プロダクションモード：Firebase優先
      console.log('🔥 Production mode: Loading from Firebase...');
      
      // 1. 現在のユーザーIDを取得
      const userId = await getCurrentUserId();
      console.log('🔍 Firebase: Got user ID:', userId);
      
      // 2. Firestoreからプロファイルを取得
      console.log('🔍 Firebase: Attempting to load profile for user:', userId);
      const firebaseProfile = await firestoreService.getUserProfile(userId);
      console.log('🔍 Firebase: Profile load result:', {
        hasProfile: !!firebaseProfile,
        onboardingCompleted: firebaseProfile?.onboardingCompleted,
        userId: userId
      });
      
      if (!firebaseProfile || !firebaseProfile.onboardingCompleted) {
        console.log('📄 No completed profile found in Firebase');
        return null;
      }
      
      // 3. 関連データを取得
      const goals = await firestoreService.getUserGoals(userId, 'active');
      const quests = await firestoreService.getUserQuests(userId);
      const progress = await firestoreService.getUserProgress(userId, 7); // Last 7 days
      
      // 4. 統合プロファイル形式に変換
      const integratedProfile = this.convertFromFirebaseData(
        firebaseProfile,
        goals,
        quests,
        progress
      );
      
      // 5. ローカルキャッシュを更新
      await this.cacheProfile(integratedProfile);
      
      console.log('✅ Profile loaded from Firebase:', {
        userId: integratedProfile.userId,
        questCount: integratedProfile.initialQuests.length,
        goalCount: goals.length,
      });
      
      return integratedProfile;
    } catch (error) {
      console.error('❌ Error loading profile from Firebase:', error);
      
      // フォールバック：ローカルキャッシュを試行
      console.log('🔍 Firebase error: Attempting to load from cache...');
      const cachedProfile = await this.loadCachedProfile();
      if (cachedProfile) {
        console.log('✅ Successfully loaded profile from cache after Firebase error');
        return cachedProfile;
      } else {
        console.log('📭 No cached profile found either');
        return null;
      }
    }
  }

  /**
   * オンボーディング完了状態をチェック
   */
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const userId = await getCurrentUserId();
      const profile = await firestoreService.getUserProfile(userId);
      return profile?.onboardingCompleted || false;
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * 日次クエスト完了を記録
   */
  async recordDailyQuestCompletion(
    questId: string,
    completionData: DailyQuestCompletion
  ): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      
      // 1. クエストステータスを更新
      await firestoreService.updateQuestStatus(
        userId, 
        questId, 
        'completed', 
        {
          completionQuality: completionData.quality,
          timeSpent: completionData.timeSpent,
          userNotes: completionData.notes,
        }
      );
      
      // 2. 日次進捗を更新
      await this.updateDailyProgress(userId, questId, completionData);
      
      console.log('✅ Quest completion recorded:', { questId, quality: completionData.quality });
    } catch (error) {
      console.error('❌ Error recording quest completion:', error);
      throw error;
    }
  }

  /**
   * リアルタイム進捗更新を購読
   */
  subscribeToProgressUpdates(
    callback: (profile: IntegratedUserProfile | null) => void
  ): () => void {
    const unsubscribe = async () => {
      try {
        const userId = await getCurrentUserId();
        
        // プロファイル変更をリッスン
        const unsubscribeProfile = firestoreService.subscribeToUserProfile(
          userId,
          async (firebaseProfile) => {
            if (firebaseProfile) {
              const integratedProfile = await this.loadUserProfile();
              callback(integratedProfile);
            } else {
              callback(null);
            }
          }
        );
        
        return unsubscribeProfile;
      } catch (error) {
        console.error('❌ Error setting up profile subscription:', error);
        callback(null);
        return () => {};
      }
    };
    
    // 非同期でunsubscribe関数を返す
    let actualUnsubscribe: (() => void) | null = null;
    unsubscribe().then(unsub => {
      actualUnsubscribe = unsub;
    });
    
    return () => {
      if (actualUnsubscribe) {
        actualUnsubscribe();
      }
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async convertToFirebaseData(
    userId: string,
    onboardingData: CompleteOnboardingData,
    aiProfile: ProfileV1,
    skillAtoms: SkillAtom[],
    initialQuests: Quest[]
  ): Promise<OnboardingToFirebaseData> {
    try {
      console.log('🔍 [convertToFirebaseData] Starting conversion...', {
        userId: userId || 'MISSING',
        hasOnboardingData: !!onboardingData,
        hasAiProfile: !!aiProfile,
        skillAtomsLength: skillAtoms?.length || 0,
        initialQuestsLength: initialQuests?.length || 0,
        onboardingDataType: typeof onboardingData,
        onboardingDataKeys: onboardingData ? Object.keys(onboardingData) : [],
      });
      
      // Enhanced null checks
      if (!userId) {
        throw new Error('userId is required for Firebase conversion');
      }
      
      if (!onboardingData || typeof onboardingData !== 'object') {
        throw new Error('onboardingData is required and must be an object');
      }
      
      if (!aiProfile || typeof aiProfile !== 'object') {
        throw new Error('aiProfile is required and must be an object');
      }

      const now = Timestamp.now();
      
      // Debug: Check goalDeepDiveData structure
      console.log('🔍 [convertToFirebaseData] Goal data analysis:', {
        hasGoalDeepDiveData: !!onboardingData.goalDeepDiveData,
        goalDeepDiveDataType: typeof onboardingData.goalDeepDiveData,
        goalDeepDiveDataKeys: onboardingData.goalDeepDiveData ? Object.keys(onboardingData.goalDeepDiveData) : [],
        goalText: onboardingData.goalDeepDiveData?.goal_text || 'MISSING',
        goalCategory: onboardingData.goalDeepDiveData?.goal_category || 'MISSING',
      });
      
      // Safely extract goal data with fallbacks
      const goalData = onboardingData.goalDeepDiveData || {};
      const defaultGoalData = {
        goal_text: goalData.goal_text || 'Default goal',
        goal_category: goalData.goal_category || 'learning',
        goal_deadline: goalData.goal_deadline || '2024-12-31',
        goal_importance: goalData.goal_importance || 3,
        time_budget_min_per_day: goalData.time_budget_min_per_day || 30,
        preferred_session_length_min: goalData.preferred_session_length_min || aiProfile.preferred_session_length_min || 15,
        env_constraints: goalData.env_constraints || [],
        modality_preference: goalData.modality_preference || [],
        avoid_modality: goalData.avoid_modality || [],
      };
      
      console.log('🔍 [convertToFirebaseData] Using goal data:', defaultGoalData);
      
      // User Profile
      const userProfile: Partial<FirebaseUserProfile> = {
        userId,
        onboardingCompleted: true,
        onboardingCompletedAt: now,
        onboardingVersion: '1.0',
        aiProfile,
        skillAtoms: skillAtoms || [],
        appSettings: {
          notifications: true,
          theme: 'auto',
          language: 'ja',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        dataRetentionDays: 365,
        analyticsOptIn: true,
        stats: {
          totalQuests: initialQuests?.length || 0,
          completedQuests: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalLearningMinutes: 0,
          averageSessionLength: aiProfile.preferred_session_length_min || 15,
          completionRate: 0,
          lastActiveDate: now,
        },
      };

      // Goal with safe access
      const goal: Partial<FirebaseGoal> = {
        goalText: defaultGoalData.goal_text,
        goalCategory: defaultGoalData.goal_category as any,
        goalDeadline: defaultGoalData.goal_deadline,
        goalImportance: defaultGoalData.goal_importance as any,
        timeBudgetPerDay: defaultGoalData.time_budget_min_per_day,
        preferredSessionLength: defaultGoalData.preferred_session_length_min,
        envConstraints: defaultGoalData.env_constraints,
        modalityPreference: defaultGoalData.modality_preference as any,
        avoidModality: defaultGoalData.avoid_modality as any,
        status: 'active',
        progress: {
          currentLevel: 1,
          totalMilestones: 10,
          completedMilestones: 0,
          progressPercentage: 0,
        },
      };
      
      console.log('🔍 [convertToFirebaseData] Created goal object:', goal);

    // Profile Responses - Add null checks
    const profileResponses: FirebaseProfileResponse[] = [];
    if (onboardingData.profileData?.profileAnswers && typeof onboardingData.profileData.profileAnswers === 'object') {
      Object.entries(onboardingData.profileData.profileAnswers).forEach(([key, value], index) => {
        if (key && value !== undefined && value !== null) {
          profileResponses.push({
            id: `response_${Date.now()}_${index}`,
            userId,
            questionId: `question_${key}`,
            goalId: '', // Will be filled after goal creation
            createdAt: now,
            response: value,
            confidence: 0.8,
            timeSpentSeconds: 30,
            memo: onboardingData.profileData.memos?.[key] || '',
          });
        }
      });
    }

    // Quest Preferences - Add null checks
    const questPreferences: FirebaseQuestPreference[] = [];
    if (onboardingData.questPreferencesData?.preferences && typeof onboardingData.questPreferencesData.preferences === 'object') {
      Object.entries(onboardingData.questPreferencesData.preferences).forEach(([questIndex, rating], index) => {
        if (questIndex && rating && ['love', 'like', 'dislike'].includes(rating as string)) {
          questPreferences.push({
            id: `pref_${Date.now()}_${index}`,
            userId,
            questId: `quest_${questIndex}`,
            createdAt: now,
            rating: rating as 'love' | 'like' | 'dislike',
            context: {
              questStatus: 'pending',
              sessionContext: 'onboarding',
              timeOfDay: new Date().getHours().toString(),
            },
          });
        }
      });
    }

      // Initial Quests with safe mapping
      const firebaseQuests: FirebaseQuest[] = (initialQuests || []).map((quest, index) => {
        console.log(`🔍 [convertToFirebaseData] Processing quest ${index}:`, {
          title: quest?.title || 'MISSING',
          deliverable: quest?.deliverable || 'MISSING',
          minutes: quest?.minutes || 0,
          pattern: quest?.pattern || 'unknown',
        });
        
        return {
          id: `quest_${Date.now()}_${index}`,
          userId,
          goalId: '', // Will be filled after goal creation
          createdAt: now,
          updatedAt: now,
          title: quest?.title || 'Generated Quest',
          description: quest?.description || '',
          deliverable: quest?.deliverable || 'Complete the task',
          minutes: quest?.minutes || 15,
          difficulty: quest?.difficulty || 0.5,
          pattern: quest?.pattern || 'read_note_q',
          skillAtomIds: quest?.skillAtoms?.map(atom => atom?.id).filter(Boolean) || [],
          dependencies: [],
          tags: quest?.tags || [quest?.pattern] || ['default'],
          status: 'pending',
          generationContext: {
            model: process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo',
            version: '1.0',
            parentQuests: [],
            personalizationFactors: ['onboarding_profile'],
          },
        };
      });

      // Initial Progress
      const initialProgress: FirebaseProgress = {
        id: `progress_${new Date().toISOString().split('T')[0]}`,
        userId,
        goalId: '', // Will be filled after goal creation
        date: new Date().toISOString().split('T')[0],
        createdAt: now,
        updatedAt: now,
        dailyStats: {
          questsCompleted: 0,
          totalMinutes: 0,
          sessionCount: 0,
          averageQuality: 0,
          skillAtomsProgressed: [],
        },
        streakDays: 0,
        weeklyPattern: [0, 0, 0, 0, 0, 0, 0],
        mountainProgress: {
          currentAltitude: 0,
          todayClimb: 0,
          totalDistance: 0,
          flagsCollected: [],
        },
      };

      const result = {
        userProfile,
        goal,
        profileResponses,
        questPreferences,
        initialQuests: firebaseQuests,
        initialProgress,
      };
      
      console.log('✅ [convertToFirebaseData] Conversion completed successfully:', {
        userProfileKeys: Object.keys(userProfile),
        goalKeys: Object.keys(goal),
        profileResponsesCount: profileResponses.length,
        questPreferencesCount: questPreferences.length,
        firebaseQuestsCount: firebaseQuests.length,
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ [convertToFirebaseData] Conversion failed:', {
        error: error.message,
        stack: error.stack,
        userId,
        hasOnboardingData: !!onboardingData,
        hasAiProfile: !!aiProfile,
        errorType: error.constructor.name,
      });
      
      // Re-throw with more context
      throw new Error(`Firebase data conversion failed: ${error.message}. Check that all required onboarding data is properly structured.`);
    }
  }

  private async saveToFirestore(userId: string, data: OnboardingToFirebaseData): Promise<void> {
    try {
      console.log('💾 Step 1: Creating user profile in Firestore...');
      await firestoreService.createUserProfile(userId, data.userProfile);
      console.log('✅ User profile created successfully');
      
      console.log('💾 Step 2: Creating goal and getting ID...');
      const goalId = await firestoreService.createGoal(userId, data.goal);
      console.log('✅ Goal created successfully with ID:', goalId);
      
      console.log('💾 Step 3: Updating references with goal ID...');
      data.profileResponses.forEach(response => response.goalId = goalId);
      data.initialQuests.forEach(quest => quest.goalId = goalId);
      data.initialProgress.goalId = goalId;
      console.log('✅ References updated - quests:', data.initialQuests.length, 'responses:', data.profileResponses.length);
      
      console.log('💾 Step 4: Creating quests in Firestore...');
      await firestoreService.createQuests(userId, data.initialQuests);
      console.log('✅ Quests created successfully');
      
      console.log('💾 Step 5: Creating initial progress...');
      await firestoreService.updateDailyProgress(userId, data.initialProgress);
      console.log('✅ Initial progress created successfully');
      
      console.log('✅ All onboarding data saved to Firestore successfully');
    } catch (error) {
      console.error('❌ Error saving to Firestore:', error);
      console.error('❌ Failed at operation for userId:', userId);
      throw error;
    }
  }

  private async buildIntegratedProfile(
    userId: string,
    firebaseData: OnboardingToFirebaseData
  ): Promise<IntegratedUserProfile> {
    const now = new Date();
    
    return {
      userId,
      createdAt: now,
      updatedAt: now,
      onboardingData: {
        goalDeepDiveData: {
          goal_text: firebaseData.goal.goalText || '',
          goal_category: firebaseData.goal.goalCategory || '',
          goal_deadline: firebaseData.goal.goalDeadline || '',
          goal_importance: firebaseData.goal.goalImportance || 3,
          time_budget_min_per_day: firebaseData.goal.timeBudgetPerDay || 30,
          preferred_session_length_min: firebaseData.goal.preferredSessionLength || 25,
          env_constraints: firebaseData.goal.envConstraints || [],
          modality_preference: firebaseData.goal.modalityPreference || [],
          avoid_modality: firebaseData.goal.avoidModality || []
        },
        profileData: {
          profileAnswers: {},
          memos: {}
        },
        questPreferencesData: {
          preferences: {},
          feedback: {}
        },
        learningStrategy: {
          recommendedPace: 'moderate',
          dailyTimeAllocation: firebaseData.goal.timeBudgetPerDay || 30,
          learningStyle: '段階的・実践重視型',
          keyStrengths: [],
          potentialChallenges: [],
          initialQuests: firebaseData.initialQuests.map(fq => ({
            title: fq.title,
            description: fq.description,
            deliverable: fq.deliverable,
            minutes: fq.minutes,
            difficulty: fq.difficulty,
            pattern: fq.pattern,
            skillAtoms: [],
            tags: fq.tags,
          })),
          milestones: [],
          successPrediction: {
            probability: 0.75,
            confidenceLevel: 'medium' as const,
            keyFactors: []
          }
        }
      } as CompleteOnboardingData,
      aiProfile: firebaseData.userProfile.aiProfile!,
      skillAtoms: firebaseData.userProfile.skillAtoms!,
      initialQuests: firebaseData.initialQuests.map(fq => ({
        title: fq.title,
        description: fq.description,
        deliverable: fq.deliverable,
        minutes: fq.minutes,
        difficulty: fq.difficulty,
        pattern: fq.pattern,
        skillAtoms: [],
        tags: fq.tags,
      })),
      appSettings: firebaseData.userProfile.appSettings!,
      progress: {
        todaysQuests: firebaseData.initialQuests.slice(0, 3).map(quest => ({
          title: quest.title,
          deliverable: quest.deliverable,
          completed: false,
          timeEstimate: quest.minutes,
        })),
        completedQuests: 0,
        totalQuests: firebaseData.initialQuests.length,
        currentStreak: 0,
        weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
        skillProgression: {},
        mountainProgress: 0,
      },
    };
  }

  private convertFromFirebaseData(
    profile: FirebaseUserProfile,
    goals: FirebaseGoal[],
    quests: FirebaseQuest[],
    progressData: FirebaseProgress[]
  ): IntegratedUserProfile {
    return {
      userId: profile.userId,
      createdAt: profile.createdAt.toDate(),
      updatedAt: profile.updatedAt.toDate(),
      onboardingData: {} as CompleteOnboardingData,
      aiProfile: profile.aiProfile,
      skillAtoms: profile.skillAtoms,
      initialQuests: quests.map(quest => ({
        title: quest.title,
        description: quest.description,
        deliverable: quest.deliverable,
        minutes: quest.minutes,
        difficulty: quest.difficulty,
        pattern: quest.pattern,
        skillAtoms: [],
        tags: quest.tags,
      })),
      appSettings: profile.appSettings,
      progress: {
        todaysQuests: quests.filter(q => q.status === 'pending').slice(0, 3).map(quest => ({
          title: quest.title,
          deliverable: quest.deliverable,
          completed: quest.status === 'completed',
          timeEstimate: quest.minutes,
        })),
        completedQuests: profile.stats.completedQuests,
        totalQuests: profile.stats.totalQuests,
        currentStreak: profile.stats.currentStreak,
        weeklyProgress: progressData.length > 0 ? progressData[0].weeklyPattern : [0, 0, 0, 0, 0, 0, 0],
        skillProgression: {},
        mountainProgress: progressData.length > 0 ? progressData[0].mountainProgress.currentAltitude : 0,
      },
    };
  }

  // Original userProfileService methods adapted for Firebase
  private convertToAIProfile(onboardingData: CompleteOnboardingData): ProfileV1 {
    return {
      time_budget_min_per_day: onboardingData.goalDeepDiveData.time_budget_min_per_day,
      peak_hours: [9, 14, 19],
      env_constraints: onboardingData.goalDeepDiveData.env_constraints || [],
      hard_constraints: [],
      motivation_style: 'push',
      difficulty_tolerance: 0.7,
      novelty_preference: 0.6,
      pace_preference: 'cadence',
      long_term_goal: onboardingData.goalDeepDiveData.goal_text,
      milestone_granularity: 0.5,
      current_level_tags: [],
      priority_areas: [onboardingData.goalDeepDiveData.goal_category],
      heat_level: onboardingData.goalDeepDiveData.goal_importance,
      risk_factors: [],
      preferred_session_length_min: onboardingData.goalDeepDiveData.preferred_session_length_min,
      modality_preference: onboardingData.goalDeepDiveData.modality_preference || [],
      deliverable_preferences: ['note'],
      weekly_minimum_commitment_min: onboardingData.goalDeepDiveData.time_budget_min_per_day * 7,
    };
  }

  private async generateSkillMap(goalData: GoalDeepDiveData): Promise<SkillAtom[]> {
    return [
      {
        id: 'skill_foundation',
        name: '基礎スキル',
        level: 0,
        dependencies: [],
        estimatedHours: 10,
        tags: [goalData.goal_category],
      },
      {
        id: 'skill_intermediate',
        name: '中級スキル',
        level: 1,
        dependencies: ['skill_foundation'],
        estimatedHours: 20,
        tags: [goalData.goal_category],
      },
    ];
  }

  private async generateInitialQuests(aiProfile: ProfileV1, skillAtoms: SkillAtom[]): Promise<Quest[]> {
    try {
      const result = await advancedQuestService.generateOptimizedQuests({
        goalText: aiProfile.long_term_goal || '学習目標',
        profile: aiProfile,
        currentLevelTags: aiProfile.current_level_tags || [],
        priorityAreas: aiProfile.priority_areas || [],
        checkins: {
          mood_energy: 'high',
          available_time_today_delta_min: 0,
          focus_noise: 'low'
        }
      });
      
      return result.finalQuests?.quests || [];
    } catch (error) {
      console.error('❌ Error generating initial quests:', error);
      return this.getFallbackQuests(aiProfile);
    }
  }

  private getFallbackQuests(aiProfile: ProfileV1): Quest[] {
    return [
      {
        title: `${aiProfile.long_term_goal}の基礎調査`,
        description: '目標達成のための基礎情報を調べる',
        deliverable: '調査結果をまとめたメモ',
        minutes: 25,
        difficulty: 0.3,
        pattern: 'research',
        skillAtoms: [],
        tags: ['foundation'],
      },
    ];
  }

  private async updateDailyProgress(
    userId: string,
    questId: string,
    completion: DailyQuestCompletion
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await firestoreService.updateDailyProgress(userId, {
      dailyStats: {
        questsCompleted: 1,
        totalMinutes: completion.timeSpent,
        sessionCount: 1,
        averageQuality: completion.quality,
        skillAtomsProgressed: [],
      },
      mountainProgress: {
        currentAltitude: 0.1, // Small progress increment
        todayClimb: 10, // Meters climbed today
        totalDistance: 10,
        flagsCollected: [],
      },
    });
  }

  private async cacheProfile(profile: IntegratedUserProfile): Promise<void> {
    try {
      console.log('💾 Firebase: Caching profile:', {
        userId: profile.userId,
        questCount: profile.initialQuests?.length || 0,
        todayQuests: profile.progress?.todaysQuests?.length || 0,
        todayQuestTitles: profile.progress?.todaysQuests?.map(q => q.title) || [],
        goalText: profile.onboardingData?.goalDeepDiveData?.goal_text,
        key: this.STORAGE_KEYS.CACHED_PROFILE
      });
      
      const serializedProfile = JSON.stringify(profile);
      await AsyncStorage.setItem(this.STORAGE_KEYS.CACHED_PROFILE, serializedProfile);
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      
      console.log('✅ Firebase: Profile cached successfully:', {
        dataSize: serializedProfile.length,
        key: this.STORAGE_KEYS.CACHED_PROFILE
      });
    } catch (error) {
      console.error('❌ Error caching profile:', error);
    }
  }

  private async loadCachedProfile(): Promise<IntegratedUserProfile | null> {
    try {
      console.log('🔍 Firebase: Loading cached profile...');
      const cached = await AsyncStorage.getItem(this.STORAGE_KEYS.CACHED_PROFILE);
      console.log('🔍 Firebase: Raw cached data:', {
        exists: !!cached,
        length: cached?.length || 0,
        key: this.STORAGE_KEYS.CACHED_PROFILE
      });
      
      if (cached) {
        const profile = JSON.parse(cached);
        console.log('✅ Cached profile loaded successfully:', {
          userId: profile.userId,
          questCount: profile.initialQuests?.length || 0,
          todayQuests: profile.progress?.todaysQuests?.length || 0,
          todayQuestTitles: profile.progress?.todaysQuests?.map(q => q.title) || [],
          goalText: profile.onboardingData?.goalDeepDiveData?.goal_text
        });
        return profile;
      } else {
        console.log('📭 No cached profile found - cache is empty');
      }
    } catch (error) {
      console.error('❌ Error loading cached profile:', error);
    }
    return null;
  }

  private getBasicSkillAtoms(goalData: GoalDeepDiveData): SkillAtom[] {
    return [
      {
        id: 'basic_skill_1',
        name: '基礎知識',
        level: 0,
        dependencies: [],
        estimatedHours: 5,
        tags: [goalData.goal_category],
      },
      {
        id: 'basic_skill_2', 
        name: '実践スキル',
        level: 1,
        dependencies: ['basic_skill_1'],
        estimatedHours: 10,
        tags: [goalData.goal_category],
      }
    ];
  }

  private getBasicQuests(goalData: GoalDeepDiveData): Quest[] {
    return [
      {
        title: '基本学習クエスト',
        description: `${goalData.goal_text}の基礎を学習しましょう`,
        pattern: 'read_note_q' as Pattern,
        minutes: goalData.session_length_preference || 30,
        difficulty: 1,
        skill_atoms: ['basic_skill_1'],
        learning_objective: goalData.goal_text,
        deliverable_format: 'note',
        cognitive_load: 'low',
        steps: [
          '基本概念を理解する',
          'メモを作成する',
          '理解度を確認する'
        ]
      }
    ];
  }

  private async createFallbackProfile(onboardingData: CompleteOnboardingData): Promise<IntegratedUserProfile> {
    console.log('🔍 Firebase: Creating fallback profile...');
    const userId = `fallback_${Date.now()}`;
    const basicSkills = this.getBasicSkillAtoms(onboardingData.goalDeepDiveData);
    const basicQuests = this.getBasicQuests(onboardingData.goalDeepDiveData);
    
    console.log('🔍 Firebase: Fallback profile components:', {
      userId,
      skillCount: basicSkills.length,
      questCount: basicQuests.length,
      firstQuest: basicQuests[0]?.title || 'None'
    });

    const fallbackProfile: IntegratedUserProfile = {
      userId,
      onboardingData,
      aiProfile: this.convertToAIProfile(onboardingData),
      skillAtoms: basicSkills,
      initialQuests: basicQuests,
      appSettings: {
        notificationsEnabled: true,
        darkModeEnabled: false,
        language: 'ja',
        aiAssistanceEnabled: false // Disable for fallback
      },
      progress: {
        currentStreak: 0,
        totalQuestsCompleted: 0,
        todaysProgress: { completed: 0, total: basicQuests.length },
        todaysQuests: basicQuests.slice(0, 3).map(quest => ({
          title: quest.title,
          deliverable: quest.deliverable,
          completed: false,
          status: 'active'
        })),
        weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
        skillProgression: {},
        mountainProgress: 0,
        lastQuestCompleted: null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Cache the fallback profile
    await this.cacheProfile(fallbackProfile);
    
    console.log('✅ Fallback profile created successfully:', {
      userId: fallbackProfile.userId,
      todayQuestsCount: fallbackProfile.progress.todaysQuests.length,
      todayQuestsDetails: fallbackProfile.progress.todaysQuests.map(q => q.title)
    });
    return fallbackProfile;
  }

  /**
   * オンボーディング完了状態を確認 (デモモード対応)
   */
  async isOnboardingComplete(): Promise<boolean> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      if (envInfo.mode === 'demo') {
        console.log('🎭 Demo mode: Always return onboarding incomplete');
        return false;
      }

      // Production mode: check Firebase
      const userId = await getCurrentUserId();
      const profile = await firestoreService.getUserProfile(userId);
      return profile?.onboardingCompleted || false;
    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      return false;
    }
  }

  // ============================================================================
  // PR6: MIGRATION FUNCTIONALITY
  // ============================================================================

  /**
   * Migrate local onboarding cache to Firestore - PR6: Optional migration
   */
  async migrateLocalCacheToFirestore(userId: string): Promise<boolean> {
    try {
      console.log('📤 Checking for local cache migration...');

      // 1. Check if user has local data
      const hasLocalData = await localStorageService.hasLocalData(userId);
      if (!hasLocalData) {
        console.log('📭 No local data found for migration');
        return false;
      }

      // 2. Check if already migrated
      const alreadyMigrated = await localStorageService.isMigrated(userId);
      if (alreadyMigrated) {
        console.log('📦 User data already migrated');
        return false;
      }

      // 3. Check if DB is empty (avoid overwriting existing data)
      const existingProfile = await firestoreService.getUserProfile(userId);
      if (existingProfile?.onboardingCompleted) {
        console.log('🏢 User already has complete data in Firestore, skipping migration');
        await localStorageService.markAsMigrated(userId);
        return false;
      }

      console.log('🔄 Starting local to Firestore migration...');

      // 4. Migrate user profile
      const localProfile = await localStorageService.getUserProfile(userId);
      if (localProfile) {
        await firestoreService.createUserProfile(userId, localProfile);
        console.log('✅ Profile migrated');
      }

      // 5. Migrate goals
      const localGoals = await localStorageService.getUserGoals(userId);
      for (const goal of localGoals) {
        await firestoreService.createGoal(userId, goal);
      }
      if (localGoals.length > 0) {
        console.log(`✅ ${localGoals.length} goals migrated`);
      }

      // 6. Migrate quests
      const localQuests = await localStorageService.getUserQuests(userId);
      if (localQuests.length > 0) {
        await firestoreService.createQuests(userId, localQuests);
        console.log(`✅ ${localQuests.length} quests migrated`);
      }

      // 7. Migrate progress
      const localProgress = await localStorageService.getUserProgress(userId, 90); // Last 90 days
      for (const progress of localProgress) {
        await firestoreService.updateDailyProgress(userId, progress);
      }
      if (localProgress.length > 0) {
        console.log(`✅ ${localProgress.length} progress entries migrated`);
      }

      // 8. Mark as migrated
      await localStorageService.markAsMigrated(userId);
      console.log('📤 Local cache migration completed successfully');

      return true;

    } catch (error) {
      console.error('❌ Local cache migration failed:', error);
      return false;
    }
  }

  /**
   * Attempt migration on app startup - PR6: Optional migration
   */
  async attemptStartupMigration(): Promise<void> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        console.log('👤 No user ID available for migration');
        return;
      }

      // Only attempt migration if Firestore is available
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      if (envInfo.persistenceTarget === 'local') {
        console.log('💾 Persistence target is local, skipping migration');
        return;
      }

      // Attempt migration
      const migrated = await this.migrateLocalCacheToFirestore(userId);
      if (migrated) {
        console.log('🎉 Startup migration completed successfully');
      }

    } catch (error) {
      console.warn('⚠️ Startup migration failed, continuing with normal flow:', error);
    }
  }
}

// Create singleton instance
export const firebaseUserProfileService = new FirebaseUserProfileService();
export default firebaseUserProfileService;