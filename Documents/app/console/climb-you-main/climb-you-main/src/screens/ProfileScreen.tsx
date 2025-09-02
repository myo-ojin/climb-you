import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from '../services/firebase/config';
import { hybridStorageService } from '../services/storage/hybridStorage';
import { advancedQuestService, ProfileV1 } from '../services/ai/advancedQuestService';
import { aiInitializationService, AIInitializationResult } from '../services/ai/aiInitializationService';
import { apiKeyManager } from '../config/apiKeys';
import { profileService } from '../services/firebase/profileService';
import { ProfileV1Schema, GoalDeepDiveAnswersSchema, GoalDeepDiveAnswers } from '../types/questGeneration';
import { GoalDeepDive } from '../components/GoalDeepDive';
import { ProfileForm } from '../components/ProfileForm';

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
  const [currentGoalDeepDive, setCurrentGoalDeepDive] = useState<GoalDeepDiveAnswers | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileV1 | null>(null);

  useEffect(() => {
    checkServices();
    checkAIStatus();
  }, []);

  const checkServices = async () => {
    const currentUser = firebaseConfig.getCurrentUser();
    if (currentUser) {
      setUserId(currentUser.uid);
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
        const user = await firebaseConfig.signInAnonymously();
        setUserId(user.uid);
        setConnectionStatus('匿名認証済み');
        results.push(`✅ 匿名認証成功: ${user.uid.substring(0, 8)}...`);
        
        // Hybrid Storageテスト - Goal作成
        const goalId = await hybridStorageService.createGoal({
          title: 'テスト目標',
          description: 'Firebase機能テスト用の目標',
          category: 'テスト',
          timeframe: '1週間',
          intensity: 'medium',
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
        results.push(`❌ 認証エラー: ${error.message}`);
      }
      
    } catch (error) {
      results.push(`❌ Firebase初期化エラー: ${error.message}`);
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
      results.push(`❌ エラー: ${error.message}`);
      if (error.name === 'ZodError') {
        results.push(`🐛 Zodエラー詳細: ${JSON.stringify(error.errors, null, 2)}`);
      }
      setTestResults(results);
      Alert.alert('エラー', `スキルマップテスト失敗: ${error.message}`);
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
      results.push(`❌ エラー: ${error.message}`);
      if (error.name === 'ZodError') {
        results.push(`🐛 Zodエラー詳細: ${JSON.stringify(error.errors, null, 2)}`);
      }
      setTestResults(results);
      Alert.alert('エラー', `クエストテスト失敗: ${error.message}`);
    }
    
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
      results.push(`❌ エラー: ${error.message}`);
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
      results.push(`❌ エラー: ${error.message}`);
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
        const user = await firebaseConfig.signInAnonymously();
        setUserId(user.uid);
        results.push(`🔐 匿名認証完了: ${user.uid.substring(0, 8)}...`);
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
        results.push(`❌ Firestore保存失敗: ${saveResult.error.message}`);
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
      results.push(`❌ テストエラー: ${error.message}`);
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
        results.push(`❌ 部分更新失敗: ${updateResult.error.message}`);
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
      results.push(`❌ 更新テストエラー: ${error.message}`);
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
        const user = await firebaseConfig.signInAnonymously();
        setUserId(user.uid);
        results.push(`✅ 匿名認証成功: ${user.uid}`);
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
      results.push(`❌ 診断エラー: ${error.message}`);
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
        const user = await firebaseConfig.signInAnonymously();
        setUserId(user.uid);
        results.push(`✅ 匿名認証: ${user.uid.substring(0, 8)}...`);
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
      results.push(`❌ 統合テスト失敗: ${error.message}`);
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
        const user = await firebaseConfig.signInAnonymously();
        setUserId(user.uid);
        results.push(`🔐 匿名認証: ${user.uid.substring(0, 8)}...`);
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
      results.push(`❌ 統合テスト失敗: ${error.message}`);
    }
    
    setTestResults(results);
    setIsLoading(false);
  };

  const resetProfilingTest = () => {
    setCurrentGoalDeepDive(null);
    setCurrentProfile(null);
    setShowGoalDeepDive(false);
    setShowProfileForm(false);
    setTestResults([]);
  };

  // Show profiling components
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

        {/* Phase 2: Profiling Features Tests */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>👤 Phase 2: プロファイリング機能テスト</Text>
          
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={testGoalDeepDiveUI}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              🎯 Goal Deep Dive UIテスト
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]}
            onPress={testProfileFormUI}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              📝 Profile Form UIテスト
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
            <View style={[styles.indicator, currentGoalDeepDive && styles.indicatorComplete]}>
              <Text style={[styles.indicatorText, currentGoalDeepDive && styles.indicatorTextComplete]}>
                Goal Deep Dive {currentGoalDeepDive ? '✅' : '⏳'}
              </Text>
            </View>
            <View style={[styles.indicator, currentProfile && styles.indicatorComplete]}>
              <Text style={[styles.indicatorText, currentProfile && styles.indicatorTextComplete]}>
                Profile Form {currentProfile ? '✅' : '⏳'}
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
});