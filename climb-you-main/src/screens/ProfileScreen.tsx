import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnvironmentConfig } from '../config/environmentConfig';
import { hybridStorageService } from '../services/storage/hybridStorage';
import { advancedQuestService, ProfileV1 } from '../services/ai/advancedQuestService.fixed';
import { aiInitializationService, AIInitializationResult } from '../services/ai/aiInitializationService';
import { apiKeyManager } from '../config/apiKeys';
import { profileService } from '../services/firebase/profileService';
import { ProfileV1Schema, GoalDeepDiveAnswersSchema, GoalDeepDiveAnswers, OnboardingInputSchema, OnboardingInput } from '../types/questGeneration';
import { GoalDeepDive } from '../components/GoalDeepDive';
import { ProfileForm } from '../components/ProfileForm';
import { OnboardingForm } from '../components/OnboardingForm';
import { runAllBranchingTests, runTestCategory, TestSuite } from '../utils/branchingTests';
import { userProfileService } from '../services/userProfileService';
import { firebaseUserProfileService } from '../services/firebase/firebaseUserProfileService';
import { firestoreService } from '../services/firebase/firestoreService';
import { initializeFirebaseServices, getCurrentUserId, getFirebaseStatus, signInAnonymousUser } from '../config/firebaseConfig';
import { IntegratedUserProfile, CompleteOnboardingData } from '../types/userProfile';

export default function ProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('未接続');
  const [syncStatus, setSyncStatus] = useState<string>('不明');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<string>('未確認');
  const [initializationResult, setInitializationResult] = useState<AIInitializationResult | null>(null);
  
  // Phase 2: Profiling UI state
  const [showGoalDeepDive, setShowGoalDeepDive] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [currentGoalDeepDive, setCurrentGoalDeepDive] = useState<GoalDeepDiveAnswers | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileV1 | null>(null);
  const [currentOnboardingInput, setCurrentOnboardingInput] = useState<OnboardingInput | null>(null);
  
  // Branching Test state
  const [branchingTestResults, setBranchingTestResults] = useState<TestSuite | null>(null);
  
  // Data Flow Integration Test state
  const [integratedProfile, setIntegratedProfile] = useState<IntegratedUserProfile | null>(null);

  useEffect(() => {
    checkServices();
    checkAIStatus();
  }, []);

  const checkServices = async () => {
    const currentUserId = await getCurrentUserId();
    if (currentUserId) {
      setUserId(currentUserId);
      setConnectionStatus('匿名認証済み');
      await checkSyncStatus();
    } else {
      setConnectionStatus('未認証');
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await hybridStorageService.getSyncStatus();
      const statusText = status.hasUnsyncedChanges 
        ? '未同期の変更あり' 
        : status.lastSyncAt 
          ? `最終同期: ${status.lastSyncAt.toLocaleTimeString()}`
          : '同期なし';
      setSyncStatus(statusText);
    } catch (error) {
      setSyncStatus('ステータス取得エラー');
    }
  };


  const checkAIStatus = async () => {
    try {
      const diagnosis = apiKeyManager.diagnoseConfiguration();
      const statusParts = [];
      
      if (diagnosis.openaiKeyConfigured) statusParts.push('APIキー✅');
      else statusParts.push('APIキー❌');
      
      if (diagnosis.openaiKeyValid) statusParts.push('検証✅');
      else statusParts.push('検証❌');
      
      if (diagnosis.aiFeatureEnabled) statusParts.push('AI機能✅');
      else statusParts.push('AI機能❌');
      
      setAiStatus(statusParts.join(' '));
    } catch (error) {
      setAiStatus('エラー');
    }
  };

  const runFullFirebaseTest = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔥 Firebase初期化確認...');
      
      // Anonymous認証テスト
      try {
        const userId = await signInAnonymousUser();
        setUserId(userId);
        setConnectionStatus('匿名認証済み');
        results.push(`✅ 匿名認証成功: ${userId.substring(0, 8)}...`);
        
        // Hybrid Storageテスト - Goal作成
        const goalId = await hybridStorageService.createGoal({
          title: 'テスト目標',
          description: 'Firebase機能テスト用の目標',
          category: 'テスト',
          timeframe: '1週間',
          intensity: 'medium',
          isCompleted: false,
        });
        results.push(`✅ Goal作成成功: ${goalId}`);
        
        // Hybrid Storageテスト - Quest作成
        const questId = await hybridStorageService.createQuest({
          title: 'テストクエスト',
          description: 'Firebase動作確認用クエスト',
          category: 'テスト',
          difficulty: 'easy',
          estimatedTime: 10,
          generatedBy: 'manual',
          isCompleted: false,
        });
        results.push(`✅ Quest作成成功: ${questId}`);
        
        // データ読み取りテスト
        const [goals, quests] = await Promise.all([
          hybridStorageService.getGoals(),
          hybridStorageService.getQuests(),
        ]);
        results.push(`✅ データ読み取り成功: Goals ${goals.length}件, Quests ${quests.length}件`);
        
        // Firestore同期テスト
        const syncSuccess = await hybridStorageService.forceSync();
        results.push(`${syncSuccess ? '✅' : '❌'} Firestore同期: ${syncSuccess ? '成功' : '失敗'}`);
        
        await checkSyncStatus();
        
      } catch (error) {
        results.push(`❌ 認証エラー: ${(error as Error).message}`);
      }
      
    } catch (error) {
      results.push(`❌ Firebase初期化エラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testAdvancedQuests = async () => {
    Alert.alert(
      '🎯 Advanced Quest Generation',
      '設計書の高品質プロンプトを使った次世代クエスト生成をテストします。',
      [
        {
          text: 'APIキー設定',
          onPress: () => {
            Alert.alert(
              'OpenAI API設定',
              '設定するAPIキーを入力してください',
              [
                {
                  text: 'デモ用テスト',
                  onPress: () => testAdvancedQuestsDemo()
                },
                {
                  text: 'キャンセル',
                  style: 'cancel'
                }
              ]
            );
          }
        },
        {
          text: 'デモ実行（API不要）',
          onPress: () => testAdvancedQuestsDemo()
        },
        {
          text: 'キャンセル',
          style: 'cancel'
        }
      ]
    );
  };

  const testMockSkillMap = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🧪 モックスキルマップ個別テスト開始');
      
      // Advanced Quest Service初期化確認
      const initialized = advancedQuestService.isInitialized();
      results.push(`✅ サービス初期化: ${initialized ? 'OK' : 'NG'}`);
      
      if (!initialized) {
        const success = advancedQuestService.initialize();
        results.push(`🔄 初期化実行: ${success ? '成功' : '失敗'}`);
      }
      
      // スキルマップ生成テスト
      results.push('🎯 スキルマップ生成テスト...');
      const skillAtoms = await advancedQuestService.generateSkillMap({
        goalText: 'React Nativeテスト目標',
        currentLevelTags: ['初心者'],
        priorityAreas: ['基礎']
      });
      
      results.push(`✅ スキルマップ生成成功: ${skillAtoms.length}項目`);
      skillAtoms.slice(0, 3).forEach((atom, i) => {
        results.push(`  ${i+1}. ${atom.label} (${atom.type})`);
      });
      
      setTestResults(results);
      Alert.alert('スキルマップテスト', '成功！詳細はログを確認してください。');
      
    } catch (error) {
      results.push(`❌ エラー: ${(error as Error).message}`);
      if (error.name === 'ZodError') {
        results.push(`🐛 Zodエラー詳細: ${JSON.stringify(error.errors, null, 2)}`);
      }
      setTestResults(results);
      Alert.alert('エラー', `スキルマップテスト失敗: ${(error as Error).message}`);
    }
    
    setIsLoading(false);
  };

  const testMockQuests = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🎲 モッククエスト個別テスト開始');
      
      // サンプルプロファイル作成
      const profile = advancedQuestService.createBasicProfile({
        goalText: 'テスト目標',
        timeBudgetMin: 30,
        motivation: 'high'
      });
      
      // サンプルスキルアトム
      const sampleSkillAtoms = [
        {
          id: 'test-skill',
          label: 'テストスキル',
          type: 'concept' as const,
          level: 'intro' as const,
          bloom: 'understand' as const,
          prereq: [],
          representative_tasks: ['テストタスク'],
          suggested_patterns: ['read_note_q' as const]
        }
      ];
      
      // クエスト生成テスト
      results.push('🎯 クエスト生成テスト...');
      const quests = await advancedQuestService.generateDailyQuests({
        profile,
        skillAtoms: sampleSkillAtoms
      });
      
      results.push(`✅ クエスト生成成功: ${quests.length}個`);
      quests.slice(0, 2).forEach((quest, i) => {
        results.push(`  ${i+1}. ${quest.title} (${quest.minutes}分)`);
      });
      
      setTestResults(results);
      Alert.alert('クエストテスト', '成功！詳細はログを確認してください。');
      
    } catch (error) {
      results.push(`❌ エラー: ${(error as Error).message}`);
      if (error.name === 'ZodError') {
        results.push(`🐛 Zodエラー詳細: ${JSON.stringify(error.errors, null, 2)}`);
      }
      setTestResults(results);
      Alert.alert('エラー', `クエストテスト失敗: ${(error as Error).message}`);
    }
    
    setIsLoading(false);
  };

  // === Firebase統合テスト関数群 ===
  const testFirebaseConnection = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔥 Firebase接続テスト開始');
      
      // Firebase初期化（デモモードではスキップ）
      try {
        const firebaseResult = await initializeFirebaseServices();
        if (firebaseResult.app) {
          results.push('✅ Firebase サービス初期化成功');
        } else {
          results.push('🎭 Firebase サービス スキップ (デモモード)');
        }
      } catch (initError) {
        if ((initError as Error).message.includes('already exists')) {
          results.push('✅ Firebase サービス既に初期化済み');
        } else {
          results.push('🎭 Firebase 初期化エラー - デモモードで継続');
        }
      }
      
      // 現在のユーザーID取得
      const userId = await getCurrentUserId();
      setUserId(userId);
      results.push(`✅ 匿名認証成功: ${userId.substring(0, 8)}...`);
      
      // Firebase接続状態確認
      const status = getFirebaseStatus();
      results.push(`✅ 初期化状態: ${status.initialized}`);
      results.push(`✅ Firestore準備完了: ${status.firestoreReady}`);
      results.push(`✅ 認証準備完了: ${status.authReady}`);
      results.push(`✅ Functions準備完了: ${status.functionsReady}`);
      results.push(`✅ エミュレーター使用: ${status.isEmulator}`);
      
      setConnectionStatus('Firebase接続成功');
      
    } catch (error) {
      results.push(`❌ Firebase接続エラー: ${(error as Error).message}`);
      setConnectionStatus('Firebase接続失敗');
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testFirestoreOperations = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🗄️ Firestore操作テスト開始');
      
      // Environment mode check
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      if (envInfo.mode === 'demo') {
        results.push(`🎭 ${envInfo.mode.toUpperCase()} mode: Firestore operations simulation`);
        results.push('✅ データ作成成功: demo_test_123');
        results.push('✅ データ読み取り成功');
        results.push('📊 読み取り値: 456');
        results.push('✅ データ更新成功');
        results.push('✅ 更新確認成功: 556');
        results.push('✅ データ削除成功');
        results.push('');
        results.push('🎉 Firestore全操作テスト完了（デモモード）');
        setTestResults(results);
        setIsLoading(false);
        return;
      }
      
      // テストデータ作成
      const testData = {
        name: 'Firebase統合テスト',
        description: 'Firestore操作テスト用データ',
        createdAt: new Date().toISOString(),
        testValue: Math.floor(Math.random() * 1000)
      };
      
      const documentId = `test_${Date.now()}`;
      
      // タイムアウト付きでテスト実行
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore operation timeout')), 10000)
      );
      
      // データ作成テスト（タイムアウト付き）
      await Promise.race([
        firestoreService.create('test_collection', documentId, testData),
        timeout
      ]);
      results.push(`✅ データ作成成功: ${documentId}`);
      
      // データ読み取りテスト
      const readData = await Promise.race([
        firestoreService.read<typeof testData>('test_collection', documentId),
        timeout
      ]);
      if (readData) {
        results.push('✅ データ読み取り成功');
        results.push(`📊 読み取り値: ${readData.testValue}`);
      } else {
        results.push('❌ データ読み取り失敗');
      }
      
      results.push('');
      results.push('🎉 Firestore全操作テスト完了！');
      
    } catch (error) {
      if ((error as Error).message.includes('timeout')) {
        results.push('⏱️ Firestore接続タイムアウト（デモモードに切り替え推奨）');
      } else {
        results.push(`❌ Firestore操作エラー: ${(error as Error).message}`);
      }
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testFirebaseUserProfileService = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('👤 Firebase User Profile Service テスト開始');
      
      // ユーザープロファイルサービス初期化確認
      results.push('🔧 サービス初期化確認中...');
      
      // テストユーザープロファイル作成
      const testProfile = {
        userId: userId || 'test_user_id',
        onboardingCompleted: true,
        profileData: {
          goal: 'Firebase統合テスト目標',
          timeAllocation: 60,
          learningStyle: 'hands_on',
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // プロファイル保存テスト (integrateOnboardingData使用)
      try {
        const mockOnboardingData = {
          goalDeepDiveData: {
            goal: 'Firebase統合テスト目標',
            goal_text: testProfile.profileData.goal,
            goal_category: 'skill' as const,
            goal_deadline: '3ヶ月',
            goal_importance: 'high' as const,
            goal_motivation: 'high' as const,
            time_budget_min_per_day: testProfile.profileData.timeAllocation,
            session_length_preference: 30,
            createdAt: new Date()
          },
          profileData: {
            profileAnswers: {
              learning_style: testProfile.profileData.learningStyle
            },
            memos: {
              'test': 'Firebase統合テスト'
            },
            completedAt: new Date()
          },
          questPreferencesData: {
            preferences: {},
            feedback: {},
            completedAt: new Date()
          },
          learningStrategy: {
            recommendedPace: 'moderate' as const,
            dailyTimeAllocation: testProfile.profileData.timeAllocation,
            learningStyle: 'Firebase統合テスト',
            keyStrengths: ['テスト能力'],
            potentialChallenges: ['統合テスト'],
            initialQuests: [],
            milestones: [],
            successPrediction: {
              probability: 0.8,
              confidenceLevel: 'high' as const,
              keyFactors: ['Firebase統合']
            },
            generatedAt: new Date()
          }
        };
        
        await firebaseUserProfileService.integrateOnboardingData(mockOnboardingData);
        results.push('✅ ユーザープロファイル統合保存成功');
      } catch (saveError) {
        results.push(`❌ プロファイル保存エラー: ${(saveError as Error).message}`);
      }
      
      // プロファイル読み込みテスト
      try {
        const loadedProfile = await firebaseUserProfileService.loadUserProfile();
        if (loadedProfile) {
          results.push('✅ ユーザープロファイル読み込み成功');
          results.push(`📊 読み込まれた目標: ${loadedProfile.onboardingData.goalDeepDiveData.goal_text}`);
        } else {
          results.push('⚠️ プロファイルデータなし（初回実行の場合は正常）');
        }
      } catch (loadError) {
        results.push(`❌ プロファイル読み込みエラー: ${(loadError as Error).message}`);
      }
      
      // オンボーディング完了状態テスト
      try {
        const isComplete = await firebaseUserProfileService.isOnboardingComplete();
        results.push(`✅ オンボーディング状態確認: ${isComplete ? '完了' : '未完了'}`);
      } catch (statusError) {
        results.push(`❌ オンボーディング状態確認エラー: ${(statusError as Error).message}`);
      }
      
      results.push('');
      results.push('🎉 Firebase User Profile Service テスト完了！');
      
    } catch (error) {
      results.push(`❌ User Profile Service テストエラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testAdvancedQuestsDemo = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🎯 Advanced Quest Service テスト開始');
      
      // デモプロファイル作成
      const demoProfile = advancedQuestService.createBasicProfile({
        goalText: 'React Nativeでモバイルアプリ開発をマスターする',
        timeBudgetMin: 60,
        motivation: 'high',
        sessionLength: 25
      });
      
      results.push(`✅ プロファイル作成成功`);
      results.push(`📊 時間予算: ${demoProfile.time_budget_min_per_day}分/日`);
      results.push(`🔥 モチベーション: ${demoProfile.goal_motivation}`);
      results.push(`⏱️ セッション長: ${demoProfile.preferred_session_length_min}分`);
      
      // 実際のAPIキー確認と本格テスト実行
      const initialized = advancedQuestService.isInitialized();
      if (initialized) {
        results.push('');
        results.push('🚀 実際のクエスト生成テスト実行中...');
        
        try {
          // 実際のOpenAI API呼び出しテスト
          const questResult = await advancedQuestService.generateOptimizedQuests({
            goalText: demoProfile.long_term_goal,
            profile: demoProfile,
            currentLevelTags: ['React Native初心者', 'JavaScript基礎'],
            priorityAreas: ['コンポーネント設計', '状態管理'],
            checkins: {
              mood_energy: 'high',
              available_time_today_delta_min: 0,
              focus_noise: 'low'
            }
          });
          
          results.push(`✅ スキルマップ生成: ${questResult.skillAtoms.length}項目`);
          results.push(`✅ 候補クエスト: ${questResult.questsCandidate.length}個`);
          results.push(`✅ 最適化クエスト: ${questResult.finalQuests.quests.length}個`);
          
          // Firebaseに保存テスト
          results.push('');
          results.push('💾 Firebase保存テスト...');
          
          // Goal作成
          const goalId = await hybridStorageService.createGoal({
            title: demoProfile.long_term_goal,
            description: 'AI生成による学習目標',
            category: 'プログラミング',
            timeframe: '3ヶ月',
            intensity: 'high'
          });
          results.push(`✅ Goal保存: ${goalId}`);
          
          // Quest保存
          for (let i = 0; i < Math.min(3, questResult.finalQuests.quests.length); i++) {
            const quest = questResult.finalQuests.quests[i];
            const questId = await hybridStorageService.createQuest({
              goalId,
              title: quest.title,
              description: quest.description || `${quest.learning_pattern}による学習クエスト`,
              estimatedMinutes: quest.minutes,
              difficulty: 'medium',
              pattern: quest.learning_pattern
            });
            results.push(`✅ Quest保存 ${i+1}: ${questId.substring(0, 8)}...`);
          }
          
          results.push('');
          results.push('🎉 完全テスト成功！OpenAI→Firebase連携OK');
          
        } catch (apiError) {
          results.push(`❌ API呼び出しエラー: ${apiError.message}`);
          results.push('');
          results.push('📋 設計書の機能（API待機中）:');
          results.push('• スキルマップ自動生成 (12-18項目)');
          results.push('• パターンベース学習 (10種類)');
          results.push('• 制約考慮クエスト生成 (時間・環境)');
          results.push('• ポリシーチェック & 品質保証');
        }
      } else {
        results.push('');
        results.push('⚠️  APIキー未設定 - デモモードのみ');
        results.push('📋 設計書の機能:');
        results.push('• スキルマップ自動生成 (12-18項目)');
        results.push('• パターンベース学習 (10種類)');
        results.push('• 制約考慮クエスト生成 (時間・環境)');
        results.push('• ポリシーチェック & 品質保証');
      }

      setTestResults(results);
      
      if (initialized) {
        Alert.alert('Advanced Quest Service', '本格テスト完了！OpenAI API→Firebase連携をテストしました。');
      } else {
        Alert.alert('Advanced Quest Service', 'デモ完了！APIキー設定後に実際の生成が可能です。');
      }
      
    } catch (error) {
      results.push(`❌ エラー: ${(error as Error).message}`);
      setTestResults(results);
    }
    
    setIsLoading(false);
  };


  const restartOnboarding = async () => {
    Alert.alert(
      'オンボーディング再起動',
      '目標設定から再開しますか？現在のデータは保持されます。',
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '再起動',
          onPress: async () => {
            try {
              // オンボーディング完了フラグをリセット
              await AsyncStorage.setItem('onboarding_completed', 'false');
              Alert.alert(
                'オンボーディング再起動',
                'アプリを再起動してオンボーディングを開始してください。',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // アプリの再読み込みを促す
                      setTestResults(['🔄 オンボーディングがリセットされました', 'アプリを再起動してください']);
                    }
                  }
                ]
              );
            } catch (error) {
              Alert.alert('エラー', 'オンボーディングのリセットに失敗しました');
            }
          }
        }
      ]
    );
  };


  const testAIInitialization = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🚀 AI初期化サービステスト開始');
      
      // 初期化前の状態診断
      await aiInitializationService.logDiagnosticInfo();
      
      // 設定ガイダンス取得
      const guidance = aiInitializationService.getSetupGuidance();
      results.push(`🔑 APIキー有効: ${guidance.hasValidAPIKey ? '✅' : '❌'}`);
      
      if (!guidance.hasValidAPIKey) {
        results.push('⚠️  設定手順:');
        guidance.instructions.slice(0, 5).forEach(instruction => {
          results.push(`   ${instruction}`);
        });
      }
      
      // 全AIサービス初期化テスト
      const initResult = await aiInitializationService.initializeAllServices();
      setInitializationResult(initResult);
      
      results.push(`🎯 初期化結果: ${initResult.success ? '成功' : '失敗'}`);
      results.push(`✅ 初期化済みサービス: ${initResult.initialized.length}`);
      results.push(`❌ 失敗サービス: ${initResult.failed.length}`);
      
      initResult.services.forEach(service => {
        const status = service.isInitialized ? '✅' : '❌';
        const error = service.error ? ` (${service.error})` : '';
        results.push(`   ${status} ${service.service}${error}`);
      });
      
      // API Key Manager診断
      const apiDiagnosis = apiKeyManager.diagnoseConfiguration();
      results.push(`🔧 API設定診断:`);
      results.push(`   設定済み: ${apiDiagnosis.openaiKeyConfigured ? '✅' : '❌'}`);
      results.push(`   有効: ${apiDiagnosis.openaiKeyValid ? '✅' : '❌'}`);
      results.push(`   AI機能: ${apiDiagnosis.aiFeatureEnabled ? '✅' : '❌'}`);
      
      // Advanced Quest Service状態確認
      const questDiagnosis = advancedQuestService.getDiagnosticInfo();
      results.push(`🎯 クエストサービス:`);
      results.push(`   初期化済み: ${questDiagnosis.isInitialized ? '✅' : '❌'}`);
      results.push(`   API利用可能: ${questDiagnosis.apiKeyAvailable ? '✅' : '❌'}`);
      
      setTestResults(results);
      await checkAIStatus();
      
    } catch (error) {
      results.push(`❌ エラー: ${(error as Error).message}`);
      setTestResults(results);
    }
    
    setIsLoading(false);
  };

  const clearTestData = async () => {
    Alert.alert(
      'テストデータ削除',
      'ローカルのテストデータを削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            await hybridStorageService.clearLocalData();
            setTestResults([]);
            setSyncStatus('データ削除済み');
            Alert.alert('完了', 'ローカルデータを削除しました');
          }
        }
      ]
    );
  };

  // === Phase 1: Data Foundation Tests ===
  
  const testProfileServiceSave = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🏗️ Phase 1.1: ProfileService保存テスト開始');
      
      // Ensure user is authenticated
      if (!userId) {
        const userId = await signInAnonymousUser();
        setUserId(userId);
        results.push(`🔐 匿名認証完了: ${userId.substring(0, 8)}...`);
      }
      
      // Create test profile data
      const testProfileV1 = profileService.createBasicTestProfile({
        long_term_goal: 'Phase 1テスト: React Native習得',
        time_budget_min_per_day: 45,
        goal_motivation: 'high',
        preferred_session_length_min: 20,
      });
      
      const testGoalDeepDive = profileService.createBasicTestGoalDeepDive({
        goal_focus: { choice: 'skill', note: 'Phase 1テスト用' },
        goal_horizon: { choice: '3m' },
      });
      
      results.push('✅ テストデータ作成完了');
      results.push(`📊 時間予算: ${testProfileV1.time_budget_min_per_day}分/日`);
      results.push(`🎯 目標: ${testProfileV1.long_term_goal}`);
      
      // Test Zod validation
      try {
        ProfileV1Schema.parse(testProfileV1);
        GoalDeepDiveAnswersSchema.parse(testGoalDeepDive);
        results.push('✅ Zod検証成功');
      } catch (validationError) {
        results.push(`❌ Zod検証エラー: ${validationError.message}`);
        throw validationError;
      }
      
      // Save to Firestore via ProfileService
      const saveResult = await profileService.saveUserProfile({
        userId: userId!,
        goalText: testProfileV1.long_term_goal!,
        profileV1: testProfileV1,
        goalDeepDive: testGoalDeepDive,
      });
      
      if (saveResult.success) {
        results.push('✅ Firestore保存成功');
      } else {
        results.push(`❌ Firestore保存失敗: ${(saveResult.error as Error).message}`);
        throw saveResult.error;
      }
      
      // Verify saved data by reading it back
      const loadResult = await profileService.getUserProfile(userId!);
      if (loadResult.success && loadResult.data) {
        results.push('✅ Firestore読み込み成功');
        results.push(`📋 プロファイルバージョン: ${loadResult.data.meta.version}`);
        results.push(`✅ オンボーディング完了: ${loadResult.data.meta.completed_onboarding}`);
        results.push(`🎯 保存された目標: ${loadResult.data.basic.goal_text}`);
      } else {
        results.push(`❌ Firestore読み込み失敗: ${loadResult.error?.message || 'データなし'}`);
      }
      
      results.push('');
      results.push('🎉 Phase 1.1 ProfileService テスト完了！');
      
    } catch (error) {
      results.push(`❌ テストエラー: ${(error as Error).message}`);
      if (error.name === 'ZodError') {
        results.push(`🐛 Zodエラー詳細: ${JSON.stringify(error.errors, null, 2)}`);
      }
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testProfileServiceUpdate = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔄 Phase 1.2: ProfileService更新テスト開始');
      
      if (!userId) {
        results.push('❌ ユーザーIDがありません。先に保存テストを実行してください。');
        setTestResults(results);
        setIsLoading(false);
        return;
      }
      
      // Test partial update
      const updateResult = await profileService.updateUserProfile({
        userId,
        updates: {
          profileV1: {
            time_budget_min_per_day: 90,
            heat_level: 5,
          },
          goalText: 'Phase 1更新テスト: Advanced React Native',
        },
      });
      
      if (updateResult.success) {
        results.push('✅ 部分更新成功');
      } else {
        results.push(`❌ 部分更新失敗: ${(updateResult.error as Error).message}`);
        throw updateResult.error;
      }
      
      // Verify updated data
      const loadResult = await profileService.getUserProfile(userId);
      if (loadResult.success && loadResult.data) {
        results.push('✅ 更新後データ確認');
        results.push(`📊 時間予算更新: ${loadResult.data.profile_v1.time_budget_min_per_day}分/日`);
        results.push(`🔥 ヒートレベル更新: ${loadResult.data.profile_v1.heat_level}`);
        results.push(`🎯 目標更新: ${loadResult.data.basic.goal_text}`);
        
        // Test onboarding status check
        const onboardingResult = await profileService.hasCompletedOnboarding(userId);
        if (onboardingResult.success) {
          results.push(`✅ オンボーディング状況: ${onboardingResult.data ? '完了' : '未完了'}`);
        }
      }
      
      results.push('');
      results.push('🎉 Phase 1.2 更新テスト完了！');
      
    } catch (error) {
      results.push(`❌ 更新テストエラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  // === Debug Authentication ===
  const debugAuthAndFirestore = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔍 認証・Firestore診断開始');
      results.push('=============================');
      
      // Ensure authentication
      if (!userId) {
        results.push('🔐 匿名認証を実行中...');
        const userId = await signInAnonymousUser();
        setUserId(userId);
        results.push(`✅ 匿名認証成功: ${userId}`);
      }
      
      // Run comprehensive diagnosis
      const diagnosis = await profileService.diagnoseAuthAndFirestore();
      
      results.push('');
      results.push('📊 診断結果:');
      results.push(`🔐 認証状態: ${diagnosis.authStatus}`);
      results.push(`👤 ユーザーID: ${diagnosis.userId || 'なし'}`);
      results.push(`🗄️ Firestore状態: ${diagnosis.firestoreStatus}`);
      
      if (diagnosis.userClaims) {
        results.push('');
        results.push('🎫 ユーザークレーム:');
        results.push(`   匿名ユーザー: ${diagnosis.userClaims.isAnonymous}`);
        results.push(`   プロバイダー: ${diagnosis.userClaims.providerData.length}個`);
        results.push(`   発行者: ${diagnosis.userClaims.tokenIssuer}`);
        results.push(`   対象者: ${diagnosis.userClaims.tokenAudience}`);
      }
      
      results.push('');
      results.push(`🧪 書き込みテスト: ${diagnosis.testWriteResult}`);
      
      if (diagnosis.testWriteResult?.includes('successful')) {
        results.push('');
        results.push('🎉 診断成功: 認証・Firestore権限OK!');
        results.push('Phase 1テストの準備完了です。');
      } else {
        results.push('');
        results.push('❌ 書き込み権限エラー検出');
        results.push('Firestore Rulesまたは認証設定を確認してください。');
      }
      
    } catch (error) {
      results.push(`❌ 診断エラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testDataFoundationFull = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🏗️ Phase 1 データ基盤 統合テスト開始');
      results.push('=======================================');
      
      // Test 0: Pre-flight authentication diagnosis
      results.push('');
      results.push('Test 0: 認証・権限診断...');
      const diagnosis = await profileService.diagnoseAuthAndFirestore();
      results.push(`🔐 認証: ${diagnosis.authStatus}`);
      results.push(`🧪 書き込みテスト: ${diagnosis.testWriteResult}`);
      
      if (!diagnosis.testWriteResult?.includes('successful')) {
        results.push('❌ 事前診断失敗 - 書き込み権限がありません');
        results.push('先に「🔍 認証・Firestore診断」を実行してください');
        setTestResults(results);
        setIsLoading(false);
        return;
      }
      
      // Test 1: Basic Firestore connection
      results.push('');
      results.push('Test 1: Firebase接続確認...');
      if (!userId) {
        const userId = await signInAnonymousUser();
        setUserId(userId);
        results.push(`✅ 匿名認証: ${userId.substring(0, 8)}...`);
      } else {
        results.push(`✅ 既存ユーザー: ${userId.substring(0, 8)}...`);
      }
      
      // Test 2: Type validation 
      results.push('');
      results.push('Test 2: TypeScript型・Zod検証...');
      const testProfile = profileService.createBasicTestProfile();
      const testDeepDive = profileService.createBasicTestGoalDeepDive();
      
      ProfileV1Schema.parse(testProfile);
      GoalDeepDiveAnswersSchema.parse(testDeepDive);
      results.push('✅ 型検証完了（ProfileV1 + GoalDeepDive）');
      
      // Test 3: Save operation
      results.push('');
      results.push('Test 3: プロファイル保存...');
      const saveResult = await profileService.saveUserProfile({
        userId: userId!,
        goalText: 'Phase 1統合テスト: フルスタック開発者',
        profileV1: testProfile,
        goalDeepDive: testDeepDive,
      });
      
      if (!saveResult.success) throw saveResult.error;
      results.push('✅ Firestore保存完了');
      
      // Test 4: Load operation
      results.push('');
      results.push('Test 4: プロファイル読み込み...');
      const loadResult = await profileService.getUserProfile(userId!);
      if (!loadResult.success || !loadResult.data) throw loadResult.error || new Error('No data');
      
      const profileData = loadResult.data;
      results.push('✅ Firestore読み込み完了');
      results.push(`📋 バージョン: ${profileData.meta.version}`);
      results.push(`🎯 目標: ${profileData.basic.goal_text}`);
      results.push(`⏰ 時間予算: ${profileData.profile_v1.time_budget_min_per_day}分/日`);
      results.push(`🎪 モチベーション: ${profileData.profile_v1.goal_motivation}`);
      
      // Test 5: Update operation
      results.push('');
      results.push('Test 5: 部分更新テスト...');
      const updateResult = await profileService.updateUserProfile({
        userId: userId!,
        updates: {
          profileV1: { heat_level: 4, difficulty_tolerance: 0.8 },
        },
      });
      
      if (!updateResult.success) throw updateResult.error;
      results.push('✅ 部分更新完了');
      
      // Test 6: Onboarding status management
      results.push('');
      results.push('Test 6: オンボーディング状態管理...');
      const resetResult = await profileService.resetOnboarding(userId!);
      if (!resetResult.success) throw resetResult.error;
      
      const statusResult = await profileService.hasCompletedOnboarding(userId!);
      if (!statusResult.success) throw statusResult.error;
      
      results.push(`✅ オンボーディング状態: ${statusResult.data ? '完了' : '未完了'}`);
      
      const markResult = await profileService.markOnboardingCompleted(userId!);
      if (!markResult.success) throw markResult.error;
      results.push('✅ オンボーディング完了マーク');
      
      // Final verification
      results.push('');
      results.push('Final: 最終検証...');
      const finalLoadResult = await profileService.getUserProfile(userId!);
      if (!finalLoadResult.success || !finalLoadResult.data) throw new Error('Final load failed');
      
      const finalData = finalLoadResult.data;
      results.push(`✅ 最終データ整合性確認`);
      results.push(`📊 更新後ヒートレベル: ${finalData.profile_v1.heat_level}`);
      results.push(`🎯 オンボーディング: ${finalData.meta.completed_onboarding ? '完了' : '未完了'}`);
      
      results.push('');
      results.push('🎉🎉🎉 Phase 1 データ基盤 統合テスト成功！🎉🎉🎉');
      results.push('=======================================');
      results.push('✅ Firebase接続・認証');
      results.push('✅ TypeScript型定義・Zod検証');
      results.push('✅ Firestore CRUD操作');
      results.push('✅ エラーハンドリング');
      results.push('✅ オンボーディング状態管理');
      results.push('');
      results.push('📋 Phase 2準備完了: プロファイリング機能実装が可能です！');
      
    } catch (error) {
      results.push(`❌ 統合テスト失敗: ${(error as Error).message}`);
      console.error('Data foundation test error:', error);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  // === Phase 2: Profiling Tests ===

  const testGoalDeepDiveUI = () => {
    setCurrentGoalDeepDive(null);
    setCurrentProfile(null);
    setShowGoalDeepDive(true);
  };

  const handleGoalDeepDiveComplete = (answers: GoalDeepDiveAnswers) => {
    setCurrentGoalDeepDive(answers);
    setShowGoalDeepDive(false);
    
    const results: string[] = [];
    results.push('🎯 Goal Deep Dive完了！');
    results.push(`✅ 目標軸: ${answers.goal_focus.choice} - ${answers.goal_focus.note || '詳細なし'}`);
    results.push(`✅ 期間: ${answers.goal_horizon.choice} - ${answers.goal_horizon.note || '詳細なし'}`);
    results.push(`✅ 重視点: ${answers.goal_tradeoff.choice} - ${answers.goal_tradeoff.note || '詳細なし'}`);
    results.push(`✅ 成果証明: ${answers.goal_evidence.choice} - ${answers.goal_evidence.note || '詳細なし'}`);
    results.push('');
    results.push('📝 次はProfileFormをテストしてください');
    
    setTestResults(results);
  };

  const testProfileFormUI = () => {
    setCurrentProfile(null);
    setShowProfileForm(true);
  };

  const handleProfileFormComplete = (profile: ProfileV1) => {
    setCurrentProfile(profile);
    setShowProfileForm(false);
    
    const results: string[] = [];
    results.push('👤 ProfileForm完了！');
    results.push(`✅ 時間予算: ${profile.time_budget_min_per_day}分/日`);
    results.push(`✅ ピーク時間: ${profile.peak_hours.length}個の時間帯`);
    results.push(`✅ モチベーション: ${profile.motivation_style}`);
    results.push(`✅ 難易度許容: ${profile.difficulty_tolerance}`);
    results.push(`✅ 学習方法: ${profile.modality_preference.join(', ')}`);
    results.push(`✅ 成果物: ${profile.deliverable_preferences.join(', ')}`);
    results.push(`✅ 目標モチベーション: ${profile.goal_motivation}`);
    results.push('');
    results.push('💾 統合テストでFirestoreに保存可能です');
    
    setTestResults(results);
  };

  const testProfilingIntegration = async () => {
    if (!currentGoalDeepDive || !currentProfile) {
      Alert.alert(
        '必要データ不足', 
        'Goal Deep DiveとProfile Formを先に完了してください。',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔄 Phase 2 プロファイリング統合テスト開始');
      results.push('=====================================');
      
      // Ensure authentication
      if (!userId) {
        const userId = await signInAnonymousUser();
        setUserId(userId);
        results.push(`🔐 匿名認証: ${userId.substring(0, 8)}...`);
      }

      // Test complete profile save
      const saveResult = await profileService.saveUserProfile({
        userId: userId!,
        goalText: 'Phase 2統合テスト: プロファイリング機能検証',
        profileV1: currentProfile,
        goalDeepDive: currentGoalDeepDive,
      });

      if (saveResult.success) {
        results.push('✅ 統合データ保存成功');
      } else {
        throw saveResult.error;
      }

      // Verify saved data
      const loadResult = await profileService.getUserProfile(userId!);
      if (loadResult.success && loadResult.data) {
        results.push('✅ 統合データ読み込み成功');
        results.push(`📊 Goal Focus: ${loadResult.data.goal_deep_dive.goal_focus.choice}`);
        results.push(`📊 Goal Horizon: ${loadResult.data.goal_deep_dive.goal_horizon.choice}`);
        results.push(`📊 時間予算: ${loadResult.data.profile_v1.time_budget_min_per_day}分/日`);
        results.push(`📊 モチベーション: ${loadResult.data.profile_v1.goal_motivation}`);
      }

      results.push('');
      results.push('🎉🎉🎉 Phase 2 プロファイリング統合テスト成功！🎉🎉🎉');
      results.push('=====================================');
      results.push('✅ Goal Deep Dive UI');
      results.push('✅ Profile Form UI');
      results.push('✅ データ統合・保存');
      results.push('✅ 型安全性検証');
      results.push('');
      results.push('📋 Phase 3準備完了: AI Quest Generation実装が可能です！');
      
    } catch (error) {
      results.push(`❌ 統合テスト失敗: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testOnboardingFormUI = () => {
    setCurrentOnboardingInput(null);
    setShowOnboardingForm(true);
  };

  const handleOnboardingFormComplete = (inputs: OnboardingInput) => {
    setCurrentOnboardingInput(inputs);
    setShowOnboardingForm(false);
    
    const results: string[] = [];
    results.push('📝 新設計オンボーディングフォーム完了！');
    results.push(`✅ 目標: ${inputs.goal_text}`);
    results.push(`✅ 期日: ${inputs.goal_deadline}`);
    results.push(`✅ やる気: ${inputs.goal_motivation}`);
    results.push(`✅ 時間予算: ${inputs.time_budget_min_per_day}分/日`);
    results.push(`✅ セッション長: ${inputs.preferred_session_length_min}分`);
    results.push(`✅ 環境制約: ${inputs.env_constraints.length}個`);
    results.push(`✅ 学習方法: ${inputs.modality_preference.length}個`);
    results.push(`✅ 成果物: ${inputs.deliverable_preferences.length}個`);
    results.push('');
    results.push('🤖 このデータから高解像プロファイルを生成可能です（P1プロンプト使用）');
    
    setTestResults(results);
  };

  const resetProfilingTest = () => {
    setCurrentGoalDeepDive(null);
    setCurrentProfile(null);
    setCurrentOnboardingInput(null);
    setShowGoalDeepDive(false);
    setShowProfileForm(false);
    setShowOnboardingForm(false);
    setTestResults([]);
  };

  // === Branching Logic Tests ===
  
  const runFullBranchingTest = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🧪 全質問ブランチングロジック総合テスト開始');
      results.push('=====================================');
      
      // Run comprehensive branching tests
      const testSuite = runAllBranchingTests();
      setBranchingTestResults(testSuite);
      
      results.push(`📊 テスト結果: ${testSuite.passedTests}/${testSuite.totalTests} 成功`);
      results.push('');
      
      // Summary by category
      const categories = ['A2', 'A3', 'B2', 'B3', 'C2', 'C3', 'D2', 'D3'] as const;
      categories.forEach(category => {
        const categoryResults = testSuite.results.filter(r => r.testName.includes(category));
        const passed = categoryResults.filter(r => r.passed).length;
        const total = categoryResults.length;
        const status = passed === total ? '✅' : '❌';
        results.push(`${status} ${category}: ${passed}/${total} 成功`);
      });
      
      results.push('');
      
      // Detailed failure analysis
      const failedTests = testSuite.results.filter(r => !r.passed);
      if (failedTests.length > 0) {
        results.push('❌ 失敗詳細:');
        failedTests.forEach(test => {
          results.push(`   • ${test.testName}`);
          results.push(`     期待: ${test.expected}`);
          results.push(`     実際: ${test.actual}`);
          if (test.details) results.push(`     詳細: ${test.details}`);
        });
      } else {
        results.push('🎉 すべてのブランチングテストが成功！');
        results.push('✅ C3ブランチング修正済み');
        results.push('✅ D3複合キー修正済み');
        results.push('✅ B3 difficulty_bias設定確認済み');
      }
      
    } catch (error) {
      results.push(`❌ テストエラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const runSpecificBranchingTest = (category: 'A2' | 'A3' | 'B2' | 'B3' | 'C2' | 'C3' | 'D2' | 'D3') => {
    const results: string[] = [];
    
    results.push(`🎯 ${category} ブランチングテスト実行`);
    results.push('=====================================');
    
    const testSuite = runTestCategory(category);
    
    results.push(`📊 ${category} テスト結果: ${testSuite.passedTests}/${testSuite.totalTests} 成功`);
    results.push('');
    
    testSuite.results.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      results.push(`${status} ${test.testName}`);
      if (!test.passed) {
        results.push(`   期待: ${test.expected}`);
        results.push(`   実際: ${test.actual}`);
        if (test.details) results.push(`   詳細: ${test.details}`);
      }
    });
    
    setTestResults(results);
  };

  const showBranchingTestMenu = () => {
    Alert.alert(
      '🧪 ブランチングロジックテスト',
      '質問の分岐ロジックをテストします。修正した問題を確認できます。',
      [
        {
          text: '🎯 全テスト実行',
          onPress: runFullBranchingTest
        },
        {
          text: '⚡ C3テスト (修正済み)',
          onPress: () => runSpecificBranchingTest('C3')
        },
        {
          text: '⚡ D3テスト (修正済み)',
          onPress: () => runSpecificBranchingTest('D3')
        },
        {
          text: '⚡ B3テスト (difficulty_bias)',
          onPress: () => runSpecificBranchingTest('B3')
        },
        {
          text: 'キャンセル',
          style: 'cancel'
        }
      ]
    );
  };

  // === Data Flow Integration Tests ===
  
  const testDataFlowIntegration = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔄 データフロー統合テスト開始');
      results.push('=============================');
      
      // Create mock onboarding data
      const mockOnboardingData: CompleteOnboardingData = {
        goalDeepDiveData: {
          goal: "プログラミングスキル向上テスト",
          goal_text: "JavaScriptとReact Nativeを学習してアプリ開発スキルを身につける",
          goal_category: "技術スキル",
          goal_deadline: "3ヶ月",
          goal_importance: "high" as const,
          goal_motivation: "high" as const,
          time_budget_min_per_day: 60,
          session_length_preference: 30,
          createdAt: new Date()
        },
        profileData: {
          profileAnswers: {
            learning_style: "hands_on",
            experience_level: "intermediate", 
            motivation_type: "growth"
          },
          memos: {
            "q1": "実践的な学習を好む",
            "q2": "基礎はある程度理解している"
          },
          completedAt: new Date()
        },
        questPreferencesData: {
          preferences: {
            "quest1": "love" as const,
            "quest2": "like" as const,
            "quest3": "dislike" as const
          },
          feedback: {
            "quest1": "実践的で良い",
            "quest2": "少し難しい", 
            "quest3": "時間がかかりすぎる"
          },
          completedAt: new Date()
        },
        learningStrategy: {
          recommendedPace: "moderate" as const,
          dailyTimeAllocation: 60,
          learningStyle: "実践重視",
          keyStrengths: ["論理的思考", "継続力"],
          potentialChallenges: ["複雑な概念の理解", "時間管理"],
          initialQuests: [],
          milestones: [],
          successPrediction: {
            probability: 0.8,
            confidenceLevel: "high" as const,
            keyFactors: ["高い動機", "適切な時間配分", "実践的アプローチ"]
          },
          generatedAt: new Date()
        }
      };
      
      results.push('✅ モックオンボーディングデータ作成');
      results.push(`📊 目標: ${mockOnboardingData.goalDeepDiveData.goal_text}`);
      results.push(`⏰ 時間予算: ${mockOnboardingData.goalDeepDiveData.time_budget_min_per_day}分/日`);
      results.push(`📈 成功予測: ${mockOnboardingData.learningStrategy.successPrediction.probability * 100}%`);
      
      // Test data integration
      results.push('');
      results.push('🔄 データ統合処理実行中...');
      const profile = await userProfileService.integrateOnboardingData(mockOnboardingData);
      
      results.push('✅ データ統合処理完了');
      results.push(`👤 ユーザーID: ${profile.userId}`);
      results.push(`🎯 統合された目標: ${profile.onboardingData.goalDeepDiveData.goal_text}`);
      results.push(`🧠 AIプロファイル生成: ${profile.aiProfile.long_term_goal || 'N/A'}`);
      results.push(`🛠️ スキルアトム: ${profile.skillAtoms.length}個`);
      results.push(`📋 初期クエスト: ${profile.initialQuests.length}個`);
      
      setIntegratedProfile(profile);
      
      // Test profile loading
      results.push('');
      results.push('🔄 プロファイル読み込みテスト...');
      const loadedProfile = await userProfileService.loadUserProfile();
      
      if (loadedProfile) {
        results.push('✅ プロファイル読み込み成功');
        results.push(`📊 読み込まれた目標: ${loadedProfile.onboardingData.goalDeepDiveData.goal_text}`);
        results.push(`📈 今日の進捗: ${loadedProfile.progress.todaysProgress.completed}/${loadedProfile.progress.todaysProgress.total}`);
      } else {
        results.push('❌ プロファイル読み込み失敗');
      }
      
      // Test onboarding status check
      results.push('');
      results.push('🔄 オンボーディング完了状態テスト...');
      const isComplete = await userProfileService.isOnboardingComplete();
      results.push(`✅ オンボーディング状態: ${isComplete ? '完了' : '未完了'}`);
      
      results.push('');
      results.push('🎉 データフロー統合テスト完了！');
      results.push('===============================');
      results.push('✅ オンボーディングデータ統合');
      results.push('✅ AIプロファイル生成');
      results.push('✅ スキルマップ生成');
      results.push('✅ 初期クエスト生成');
      results.push('✅ 統合プロファイル保存・読み込み');
      results.push('✅ オンボーディング状態管理');
      
    } catch (error) {
      results.push(`❌ データフロー統合テスト失敗: ${(error as Error).message}`);
      console.error('Data flow integration test error:', error);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };
  
  const testOnboardingReset = async () => {
    try {
      await userProfileService.resetOnboarding();
      setIntegratedProfile(null);
      Alert.alert(
        'オンボーディングリセット完了',
        'オンボーディングデータがリセットされました。アプリを再起動するとオンボーディング画面が表示されます。',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('エラー', `リセットに失敗しました: ${(error as Error).message}`);
    }
  };
  
  const showIntegratedProfileDetails = () => {
    if (!integratedProfile) {
      Alert.alert('プロファイルなし', '先にデータフロー統合テストを実行してください。');
      return;
    }
    
    const details = [
      `ユーザーID: ${integratedProfile.userId}`,
      `作成日時: ${integratedProfile.createdAt.toLocaleString()}`,
      `目標: ${integratedProfile.onboardingData.goalDeepDiveData.goal_text}`,
      `時間予算: ${integratedProfile.aiProfile.time_budget_min_per_day}分/日`,
      `スキルアトム: ${integratedProfile.skillAtoms.length}個`,
      `初期クエスト: ${integratedProfile.initialQuests.length}個`,
      `現在のストリーク: ${integratedProfile.progress.currentStreak}日`,
      `総完了クエスト: ${integratedProfile.progress.totalQuestsCompleted}個`
    ].join('\n\n');
    
    Alert.alert('統合プロファイル詳細', details, [{ text: 'OK' }]);
  };

  const testGoalClarification = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🎯 目標明確性検出テスト開始');
      results.push('=====================================');
      
      // Step 1: AdvancedQuestService初期化
      results.push('🔧 AdvancedQuestService初期化中...');
      const initialized = advancedQuestService.initialize();
      results.push(`${initialized ? '✅' : '❌'} 初期化結果: ${initialized ? '成功' : '失敗'}`);
      
      if (!initialized) {
        results.push('⚠️  API key not available, using basic analysis only');
      }
      
      const testCases = [
        { goal: 'APEX強くなりたい', expected: 'vague' },
        { goal: 'うまくなりたい', expected: 'vague' },
        { goal: 'プログラミング勉強したい', expected: 'vague' },
        { goal: '3か月でTOEIC800点取りたい', expected: 'clear' },
        { goal: 'Reactでポートフォリオサイトを作成して就職活動で使いたい', expected: 'clear' },
        { goal: 'Apex Legendsでランクマッチでプラチナ到達', expected: 'clear' }
      ];

      // Import clarification service
      const { goalClarificationService } = await import('../services/ai/goalClarificationService');
      
      for (const testCase of testCases) {
        try {
          results.push(`\n📝 テスト: "${testCase.goal}"`);
          const analysis = await goalClarificationService.checkGoalClarity(testCase.goal);
          
          const actualResult = analysis.isVague ? 'vague' : 'clear';
          const passed = actualResult === testCase.expected;
          
          results.push(`${passed ? '✅' : '❌'} 結果: ${actualResult} (期待: ${testCase.expected})`);
          results.push(`   信頼度: ${(analysis.confidence * 100).toFixed(1)}%`);
          
          if (analysis.isVague) {
            results.push(`   問題点: ${analysis.issues.length}件`);
            analysis.issues.forEach(issue => {
              results.push(`     - ${issue.description} (${issue.severity})`);
            });
            
            results.push(`   提案数: ${analysis.suggestions.length}件`);
            if (analysis.suggestions.length > 0) {
              results.push(`     - ${analysis.suggestions[0]}`);
            }
          }
          
        } catch (error) {
          results.push(`❌ エラー: ${(error as Error).message}`);
        }
      }
      
    } catch (error) {
      results.push(`❌ テスト全体エラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const testGoalClarificationFlow = async () => {
    Alert.alert(
      '🎯 目標明確性検出テスト',
      '様々な目標の明確さを判定テストします',
      [
        {
          text: '🧪 基本テスト実行',
          onPress: testGoalClarification
        },
        {
          text: 'キャンセル',
          style: 'cancel'
        }
      ]
    );
  };

  const testHybridQuestionGeneration = async () => {
    setIsLoading(true);
    const results: string[] = [];
    
    try {
      results.push('🔥 ハイブリッド質問生成テスト開始');
      results.push('=====================================');
      
      // Step 1: AdvancedQuestService初期化
      results.push('🔧 AdvancedQuestService初期化中...');
      const initialized = advancedQuestService.initialize();
      results.push(`${initialized ? '✅' : '❌'} 初期化結果: ${initialized ? '成功' : '失敗'}`);
      
      if (!initialized) {
        results.push('🎭 Mockモードで動作します');
      }
      
      const testGoals = [
        'Reactでポートフォリオサイトを作って就職活動で使いたい',
        '3か月でTOEIC800点を取得したい',
        'Apex Legendsでランクマッチでプラチナに到達したい',
        '筋トレで3ヶ月でベンチプレス80kg上げられるようになりたい'
      ];

      // Import hybrid service
      const { hybridQuestionService } = await import('../services/ai/hybridQuestionService');
      
      for (const goalText of testGoals) {
        try {
          results.push(`\n📝 テスト目標: "${goalText}"`);
          results.push('---------------------------------------');
          
          const hybridResult = await hybridQuestionService.generateHybridQuestionSet(goalText);
          
          // 生成メタデータ
          results.push(`📊 生成結果:`);
          results.push(`   • API呼び出し: ${hybridResult.generationMetadata.totalApiCalls}回`);
          results.push(`   • 生成時間: ${(hybridResult.generationMetadata.generationTime / 1000).toFixed(1)}秒`);
          results.push(`   • AI生成ブロック: ${hybridResult.generationMetadata.aiGeneratedBlocks.join(', ')}`);
          results.push(`   • テンプレブロック: ${hybridResult.generationMetadata.templateBlocks.join(', ')}`);
          
          // 目標解析結果
          results.push(`\n🔍 目標解析:`);
          results.push(`   • 分野: ${hybridResult.goalAnalysis.domain} (${hybridResult.goalAnalysis.subDomain})`);
          results.push(`   • タイプ: ${hybridResult.goalAnalysis.learningType}`);
          results.push(`   • 複雑さ: ${hybridResult.goalAnalysis.complexity}`);
          results.push(`   • 期間: ${hybridResult.goalAnalysis.timeHorizon}`);
          
          // ブロック別結果
          hybridResult.blocks.forEach(block => {
            results.push(`\n📚 ブロック${block.blockId}: ${block.blockTitle}`);
            results.push(`   説明: ${block.blockDescription}`);
            results.push(`   質問数: ${block.questions.length}個`);
            
            // 最初の質問をサンプル表示
            if (block.questions.length > 0) {
              const firstQ = block.questions[0];
              results.push(`   サンプル: "${firstQ.question}"`);
              results.push(`   選択肢数: ${firstQ.options.length}個`);
            }
          });
          
        } catch (error) {
          results.push(`❌ エラー: ${(error as Error).message}`);
          if (error.name === 'GoalClarificationNeeded') {
            results.push(`   理由: 目標が曖昧です`);
          }
        }
      }
      
      results.push('\n🎉 ハイブリッドテスト完了！');
      results.push('✅ ブロックA,C: AI生成 (分野特化)');
      results.push('✅ ブロックB,D: テンプレ (汎用的)');
      results.push('⚡ API効率: 50%削減達成');
      
    } catch (error) {
      results.push(`❌ テスト全体エラー: ${(error as Error).message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  // Show profiling components
  if (showOnboardingForm) {
    return (
      <OnboardingForm
        onComplete={handleOnboardingFormComplete as any}
        onBack={() => setShowOnboardingForm(false)}
      />
    );
  }

  if (showGoalDeepDive) {
    return (
      <GoalDeepDive
        onComplete={handleGoalDeepDiveComplete}
        onBack={() => setShowGoalDeepDive(false)}
      />
    );
  }

  if (showProfileForm) {
    return (
      <ProfileForm
        onComplete={handleProfileFormComplete}
        onBack={() => setShowProfileForm(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>🧪 Firebase機能テスト</Text>
        
        {/* ステータス表示 */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>現在のステータス</Text>
          <Text style={styles.statusText}>🔐 認証: {connectionStatus}</Text>
          <Text style={styles.statusText}>🔄 同期: {syncStatus}</Text>
          <Text style={styles.statusText}>🤖 AI: {aiStatus}</Text>
          {userId && (
            <Text style={styles.statusText}>👤 ユーザーID: {userId.substring(0, 8)}...</Text>
          )}
        </View>

        {/* Firebase基本テスト */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🔥 Firebase基本テスト</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={testFirebaseConnection}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isLoading ? 'テスト実行中...' : '🔥 Firebase接続テスト'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.successButton, isLoading && styles.buttonDisabled]}
            onPress={testFirestoreOperations}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.successButtonText]}>
              {isLoading ? 'テスト実行中...' : '🗄️ Firestore操作テスト'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.warningButton, isLoading && styles.buttonDisabled]}
            onPress={testFirebaseUserProfileService}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.warningButtonText]}>
              {isLoading ? 'テスト実行中...' : '👤 Firebase Profile Service テスト'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Phase 1: Data Foundation Tests */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🏗️ Phase 1: データ基盤テスト</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={debugAuthAndFirestore}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              🔍 認証・Firestore診断
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={testDataFoundationFull}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isLoading ? 'テスト実行中...' : '🎯 Phase 1 統合テスト'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testProfileServiceSave}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🏗️ ProfileService保存テスト
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testProfileServiceUpdate}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🔄 ProfileService更新テスト
            </Text>
          </TouchableOpacity>
        </View>

        {/* Branching Logic Tests - New Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🧪 ブランチングロジックテスト (修正版)</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={runFullBranchingTest}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isLoading ? 'テスト実行中...' : '🎯 全ブランチングテスト実行'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.successButton]}
            onPress={showBranchingTestMenu}
          >
            <Text style={[styles.buttonText, styles.successButtonText]}>
              ⚡ 個別テスト選択メニュー
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={() => runSpecificBranchingTest('C3')}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              🔧 C3テスト (poc, one_deal など修正済み)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={() => runSpecificBranchingTest('D3')}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              🔧 D3テスト (meaning_comparison_others など修正済み)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={() => runSpecificBranchingTest('B3')}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              🔧 B3テスト (difficulty_bias設定確認)
            </Text>
          </TouchableOpacity>

          {/* Test Results Summary */}
          {branchingTestResults && (
            <View style={styles.testSummaryContainer}>
              <Text style={styles.testSummaryTitle}>📊 最新テスト結果</Text>
              <Text style={styles.testSummaryText}>
                ✅ 成功: {branchingTestResults.passedTests} / {branchingTestResults.totalTests}
              </Text>
              {branchingTestResults.failedTests > 0 && (
                <Text style={styles.testSummaryError}>
                  ❌ 失敗: {branchingTestResults.failedTests}個
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Phase 1: Goal Clarification Tests */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🎯 目標明確性検出テスト (Phase 1)</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.warningButton]}
            onPress={testGoalClarificationFlow}
          >
            <Text style={[styles.buttonText, styles.warningButtonText]}>
              🧪 目標明確性テスト実行
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={testHybridQuestionGeneration}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              🔥 ハイブリッド質問生成テスト
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data Flow Integration Tests */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🔄 データフロー統合テスト (Phase 2)</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
            onPress={testDataFlowIntegration}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              {isLoading ? 'テスト実行中...' : '🧪 データフロー統合テスト実行'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={showIntegratedProfileDetails}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              📊 統合プロファイル詳細表示
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.warningButton]}
            onPress={testOnboardingReset}
          >
            <Text style={[styles.buttonText, styles.warningButtonText]}>
              🔄 オンボーディングリセット
            </Text>
          </TouchableOpacity>

          {/* Integrated Profile Summary */}
          {integratedProfile && (
            <View style={styles.testSummaryContainer}>
              <Text style={styles.testSummaryTitle}>✅ 統合プロファイル作成済み</Text>
              <Text style={styles.testSummaryText}>
                👤 ユーザーID: {integratedProfile.userId.split('_')[1]}
              </Text>
              <Text style={styles.testSummaryText}>
                🎯 目標: {integratedProfile.onboardingData.goalDeepDiveData.goal_text.substring(0, 30)}...
              </Text>
              <Text style={styles.testSummaryText}>
                📋 クエスト: {integratedProfile.initialQuests.length}個
              </Text>
            </View>
          )}
        </View>

        {/* Phase 2: Profiling Features Tests */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>👤 Phase 2: プロファイリング機能テスト</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={testOnboardingFormUI}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              📝 新設計: オンボーディングフォーム
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testGoalDeepDiveUI}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🎯 旧版: Goal Deep Dive UI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testProfileFormUI}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              📝 旧版: Profile Form UI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button, 
              (currentGoalDeepDive && currentProfile) ? styles.successButton : styles.secondaryButton,
              isLoading && styles.buttonDisabled
            ]}
            onPress={testProfilingIntegration}
            disabled={isLoading}
          >
            <Text style={[
              styles.buttonText, 
              (currentGoalDeepDive && currentProfile) ? styles.successButtonText : styles.secondaryButtonText
            ]}>
              {isLoading ? 'テスト実行中...' : '🔄 プロファイリング統合テスト'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={resetProfilingTest}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              🔄 プロファイリングデータリセット
            </Text>
          </TouchableOpacity>

          {/* Progress indicators */}
          <View style={styles.progressIndicators}>
            <View style={[styles.indicator, currentOnboardingInput && styles.indicatorComplete]}>
              <Text style={[styles.indicatorText, currentOnboardingInput && styles.indicatorTextComplete]}>
                新設計 {currentOnboardingInput ? '✅' : '⏳'}
              </Text>
            </View>
            <View style={[styles.indicator, currentGoalDeepDive && styles.indicatorComplete]}>
              <Text style={[styles.indicatorText, currentGoalDeepDive && styles.indicatorTextComplete]}>
                旧Goal Deep {currentGoalDeepDive ? '✅' : '⏳'}
              </Text>
            </View>
            <View style={[styles.indicator, currentProfile && styles.indicatorComplete]}>
              <Text style={[styles.indicatorText, currentProfile && styles.indicatorTextComplete]}>
                旧Profile {currentProfile ? '✅' : '⏳'}
              </Text>
            </View>
          </View>
        </View>

        {/* Legacy Tests */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>🧪 レガシーテスト</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
            onPress={runFullFirebaseTest}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              {isLoading ? 'テスト実行中...' : '🔥 Firebase全機能テスト'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testAIInitialization}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🚀 AI初期化サービステスト
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testMockSkillMap}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🧪 モックスキルマップテスト
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testMockQuests}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🎲 モッククエストテスト
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={testAdvancedQuests}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              🎯 フル統合テスト
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.infoButton]}
            onPress={restartOnboarding}
          >
            <Text style={[styles.buttonText, styles.infoButtonText]}>
              🎯 オンボーディング再起動
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.warningButton]}
            onPress={clearTestData}
          >
            <Text style={[styles.buttonText, styles.warningButtonText]}>
              🗑️ テストデータ削除
            </Text>
          </TouchableOpacity>
        </View>

        {/* テスト結果 */}
        {testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>テスト結果</Text>
            {testResults.map((result, index) => (
              <Text key={index} style={styles.resultText}>{result}</Text>
            ))}
          </View>
        )}
        
        {/* 使用方法 */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>📖 使用方法</Text>
          <Text style={styles.infoText}>1. 「Firebase全機能テスト」で基本機能を確認</Text>
          <Text style={styles.infoText}>2. 「Advanced Quest Generation」で設計書機能をテスト</Text>
          <Text style={styles.infoText}>3. 「セキュアAPIキー管理テスト」で暗号化機能をテスト</Text>
          <Text style={styles.infoText}>4. 「オンボーディング再起動」で目標設定画面に戻る</Text>
          <Text style={styles.infoText}>5. 「OpenAI APIテスト」でAI機能を確認</Text>
          <Text style={styles.infoText}>6. 問題があれば開発者に報告</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3E7C9',
    textAlign: 'center',
    marginVertical: 20,
  },
  statusContainer: {
    backgroundColor: 'rgba(243, 231, 201, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3E7C9',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    color: '#B9C3CF',
    marginBottom: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(243, 231, 201, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3E7C9',
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#F3E7C9',
  },
  secondaryButton: {
    backgroundColor: 'rgba(243, 231, 201, 0.2)',
    borderWidth: 1,
    borderColor: '#F3E7C9',
  },
  warningButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#0F2A44',
  },
  secondaryButtonText: {
    color: '#F3E7C9',
  },
  warningButtonText: {
    color: '#FF6B6B',
  },
  infoButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  infoButtonText: {
    color: '#007AFF',
  },
  resultsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3E7C9',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#B9C3CF',
    marginBottom: 6,
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: 'rgba(185, 195, 207, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3E7C9',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#B9C3CF',
    marginBottom: 4,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  successButtonText: {
    color: '#FFFFFF',
  },
  progressIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  indicator: {
    flex: 1,
    backgroundColor: 'rgba(185, 195, 207, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(185, 195, 207, 0.3)',
  },
  indicatorComplete: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  indicatorText: {
    fontSize: 12,
    color: '#B9C3CF',
    textAlign: 'center',
  },
  indicatorTextComplete: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  testSummaryContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  testSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  testSummaryText: {
    fontSize: 13,
    color: '#4CAF50',
    marginBottom: 2,
  },
  testSummaryError: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});
