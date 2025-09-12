import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Dimensions, SafeAreaView, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EnhancedMountainAnimation from '../components/EnhancedMountainAnimation';
import { Task } from '../types';
import { IntegratedUserProfile } from '../types/userProfile';
import { firebaseUserProfileService } from '../services/firebase/firebaseUserProfileService';
import { useTask } from '../contexts/TaskContext';
import { dailyQuestService, UserProfile, LearningPattern } from '../services/ai/dailyQuestService';

const { height: screenHeight } = Dimensions.get('window');

export default function MainScreen() {
  // TaskContext からタスク管理
  const { tasks, toggleTask, deleteTask, updateTasks } = useTask();
  const [progress, setProgress] = useState(0);
  
  // 統合ユーザープロファイル
  const [userProfile, setUserProfile] = useState<IntegratedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [questsLoading, setQuestsLoading] = useState(false);

  // IntegratedUserProfileをUserProfileに変換
  const convertToUserProfile = (integratedProfile: IntegratedUserProfile): UserProfile => {
    // デフォルトのLearningPatternを作成
    const defaultLearningPattern: LearningPattern = {
      averageCompletionRate: 0.7,
      bestTimeSlots: [9, 10, 14, 15, 19, 20], // 朝、昼、夜
      preferredDifficulty: 0.5,
      weeklyTrends: {
        Mon: 0.8, Tue: 0.8, Wed: 0.7, Thu: 0.7, 
        Fri: 0.6, Sat: 0.5, Sun: 0.6
      },
      improvementAreas: ['Time management', 'Consistency'],
      lastAnalyzed: Date.now()
    };

    return {
      userId: integratedProfile.userId,
      goalData: integratedProfile.onboardingData.goalDeepDiveData,
      profileV1: integratedProfile.aiProfile,
      learningPatterns: defaultLearningPattern,
      milestones: integratedProfile.milestones || [],
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
  };

  // 初期化: ユーザープロファイル読み込み
  useEffect(() => {
    initializeUserProfile();
  }, []);

  // プログレス計算（リアルタイム更新対応）
  useEffect(() => {
    // 常にリアルタイムのタスク状態を使用
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const calculatedProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    console.log('📊 進捗計算:', {
      完了タスク: completedTasks,
      総タスク数: totalTasks,
      進捗率: calculatedProgress + '%',
      'EnhancedMountainAnimation値': (calculatedProgress / 100).toFixed(2)
    });
    
    setProgress(calculatedProgress);
  }, [tasks]); // userProfileではなくtasksの変化のみを監視

  // ユーザープロファイル初期化
  const initializeUserProfile = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 MainScreen: Starting profile initialization...');
      
      // デバッグ: 現在のキャッシュ状況を確認
      const cacheKeys = await AsyncStorage.getAllKeys();
      console.log('🔍 MainScreen: Current cache keys:', cacheKeys.filter(key => 
        key.includes('firebase') || key.includes('task') || key.includes('profile')
      ));
      const profile = await firebaseUserProfileService.loadUserProfile();
      
      console.log('🔍 MainScreen: Profile load result:', {
        hasProfile: !!profile,
        profileType: profile ? typeof profile : 'null'
      });
      
      if (profile) {
        console.log('👤 User profile loaded:', {
          userId: profile.userId,
          goal: profile.onboardingData?.goalDeepDiveData?.goal_text || 'No goal',
          questCount: profile.initialQuests?.length || 0,
          todayQuests: profile.progress?.todaysQuests?.length || 0,
          todayQuestsDetails: profile.progress?.todaysQuests || []
        });
        
        setUserProfile(profile);
        
        // 今日のクエストをタスクとして設定（常にプロフィールのクエストを優先）
        if (profile.progress?.todaysQuests?.length > 0) {
          console.log('🔍 MainScreen: Converting quests to tasks...', {
            todaysQuests: profile.progress.todaysQuests,
            questCount: profile.progress.todaysQuests.length,
            existingTasksLength: tasks.length
          });
          
          const todayTasks: Task[] = profile.progress.todaysQuests.map((quest, index) => ({
            id: `quest_${Date.now()}_${index}`, // より信頼性の高いID生成
            title: quest.title,
            description: quest.deliverable || '',
            completed: quest.completed || false,
            createdAt: new Date(),
          }));
          
          console.log('🔍 MainScreen: Created tasks from quests:', todayTasks);
          updateTasks(todayTasks);
          console.log('🔍 MainScreen: Tasks updated successfully');
        } else {
          console.log('⚠️ No today quests found in profile, using fallback tasks');
          // フォールバック: デフォルトタスク（クエストが存在しない場合のみ）
          if (tasks.length === 0) {
            updateTasks([
              { id: '1', title: '朝のジョギング', description: '朝のジョギング', completed: false, createdAt: new Date() },
              { id: '2', title: '英語の勉強', description: '英語の勉強', completed: true, createdAt: new Date() },
              { id: '3', title: 'プロジェクト作業', description: 'プロジェクト作業', completed: false, createdAt: new Date() },
            ]);
          }
        }
      } else {
        console.log('📭 No user profile found, using default tasks');
        // フォールバック: デフォルトタスク（Contextが空の場合のみ）
        if (tasks.length === 0) {
          updateTasks([
            { id: '1', title: '朝のジョギング', description: '朝のジョギング', completed: false, createdAt: new Date() },
            { id: '2', title: '英語の勉強', description: '英語の勉強', completed: true, createdAt: new Date() },
            { id: '3', title: 'プロジェクト作業', description: 'プロジェクト作業', completed: false, createdAt: new Date() },
          ]);
        }
      }
      
      // UI1: Generate today's quests if profile exists
      if (profile) {
        await generateTodaysQuests(profile);
      }
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // UI1: Generate today's quests using DailyQuestService
  const generateTodaysQuests = async (profile: IntegratedUserProfile) => {
    try {
      setQuestsLoading(true);
      console.log('🎯 Generating today\'s quests...');
      
      const today = new Date().toISOString().split('T')[0];
      const userProfileForQuests = convertToUserProfile(profile);
      const questResult = await dailyQuestService.generateTodaysQuests(userProfileForQuests);
      
      if (questResult.success && questResult.quests.length > 0) {
        console.log('✅ Generated quests:', questResult.quests);
        
        // Convert quests to tasks
        const questTasks: Task[] = questResult.quests.map((quest, index) => ({
          id: `quest_${Date.now()}_${index}`,
          title: quest.title,
          description: quest.deliverable || quest.description || '',
          completed: false,
          createdAt: new Date(),
        }));
        
        updateTasks(questTasks);
        console.log('🎯 Today\'s quests loaded as tasks:', questTasks.length);
      } else {
        console.log('⚠️ No quests generated, using fallback tasks');
        // Use fallback tasks if quest generation fails
        if (tasks.length === 0) {
          updateTasks([
            { id: '1', title: '朝のジョギング', description: '朝のジョギング', completed: false, createdAt: new Date() },
            { id: '2', title: '英語の勉強', description: '英語の勉強', completed: true, createdAt: new Date() },
            { id: '3', title: 'プロジェクト作業', description: 'プロジェクト作業', completed: false, createdAt: new Date() },
          ]);
        }
      }
    } catch (error) {
      console.error('❌ Failed to generate today\'s quests:', error);
      // Use fallback tasks on error
      if (tasks.length === 0) {
        updateTasks([
          { id: '1', title: '朝のジョギング', description: '朝のジョギング', completed: false, createdAt: new Date() },
          { id: '2', title: '英語の勉強', description: '英語の勉強', completed: true, createdAt: new Date() },
          { id: '3', title: 'プロジェクト作業', description: 'プロジェクト作業', completed: false, createdAt: new Date() },
        ]);
      }
    } finally {
      setQuestsLoading(false);
    }
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert(
      'タスクを削除',
      'このクエストを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => deleteTask(id) },
      ]
    );
  };

  const renderTask = ({ item }: { item: Task }) => {
    if (item.isDummy) {
      return (
        <View style={styles.dummyTask} />
      );
    }

    return (
      <TouchableOpacity 
        style={styles.taskItem}
        onPress={() => toggleTask(item.id)}
        onLongPress={() => handleDeleteTask(item.id)}
      >
        <View style={styles.taskCardHeader}>
          <TouchableOpacity
            style={[styles.taskCheckbox, item.completed && styles.taskCheckboxCompleted]}
            onPress={() => toggleTask(item.id)}
          >
            {item.completed && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        </View>
        
        <View style={styles.taskContent}>
          <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const completedTasksCount = tasks.filter(task => task.completed).length;

  // Add invisible dummy task if odd number of tasks
  const tasksWithDummy = [...tasks];
  if (tasks.length % 2 === 1) {
    tasksWithDummy.push({
      id: 'dummy',
      title: '',
      description: '',
      completed: false,
      createdAt: new Date(),
      isDummy: true
    });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <Text style={styles.loadingIcon}>🎯</Text>
            <Text style={styles.loadingTitle}>クエストを準備中...</Text>
            <Text style={styles.loadingSubtitle}>少々お待ちください</Text>
            <View style={styles.loadingDots}>
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Mountain Animation Section */}
      <View style={styles.fixedMountainSection}>
        <View style={styles.mountainCard}>
          <EnhancedMountainAnimation 
            progress={progress / 100} 
            checkpoints={[0.25, 0.5, 0.75, 1.0]}
          />
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* User Profile Header */}
        {userProfile && userProfile.onboardingData?.goalDeepDiveData && (
          <View style={styles.profileHeader}>
            <View style={styles.profileGoalContainer}>
              <View style={styles.goalIcon}>
                <Text style={styles.goalIconText}>🎯</Text>
              </View>
              <Text style={styles.profileGoal}>
                {userProfile.onboardingData.goalDeepDiveData.goal_text || 'Goal not set'}
              </Text>
            </View>
            <View style={styles.profileStatsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>今日の進捗</Text>
                <Text style={styles.statValue}>
                  {userProfile.progress?.todaysProgress?.completed || 0}/{userProfile.progress?.todaysProgress?.total || 0}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>時間予算</Text>
                <Text style={styles.statValue}>
                  {userProfile.aiProfile?.time_budget_min_per_day || 0}分
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>継続日数</Text>
                <Text style={styles.statValue}>
                  {userProfile.progress?.currentStreak || 0}日
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Task Management Section */}
        <View style={styles.taskSection}>
          <View style={styles.taskHeader}>
            <View style={styles.taskHeaderTop}>
              <Text style={styles.taskHeaderTitle}>今日のクエスト</Text>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>
                  {completedTasksCount}/{tasks.length}
                </Text>
              </View>
            </View>
            <Text style={styles.taskHeaderSubtitle}>
              目標に向かって一歩ずつ進みましょう 🚀
            </Text>
          </View>
          
          {/* Quest Regeneration Button */}
          <TouchableOpacity 
            style={[styles.regenerateButton, questsLoading && styles.regenerateButtonDisabled]} 
            onPress={() => userProfile && generateTodaysQuests(userProfile)}
            disabled={questsLoading}
          >
            <Text style={styles.regenerateButtonIcon}>
              {questsLoading ? '⏳' : '🔄'}
            </Text>
            <Text style={styles.regenerateButtonText}>
              {questsLoading ? '生成中...' : '新しいクエストを生成'}
            </Text>
          </TouchableOpacity>
          
          {/* Task Grid */}
          <View style={styles.taskGrid}>
            {tasksWithDummy.map((item, index) => (
              <View key={item.id} style={styles.taskGridItem}>
                {renderTask({ item })}
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Spacing for safe scrolling */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  // Fixed Mountain Animation Section
  fixedMountainSection: {
    height: screenHeight * 0.35, // Fixed height for animation
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Scrollable Content Area
  scrollableContent: {
    flex: 1,
  },
  mountainCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.3)',
  },
  statusOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentStationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF5722',
    textAlign: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  taskSection: {
    paddingTop: 20,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingBottom: 20,
  },
  taskHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 231, 201, 0.2)',
    backgroundColor: '#0F2A44',
  },
  taskHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F3E7C9',
  },
  progressBadge: {
    backgroundColor: '#F3E7C9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2A44',
  },
  taskHeaderSubtitle: {
    fontSize: 16,
    color: '#B9C3CF',
    opacity: 0.9,
    lineHeight: 22,
  },

  // Task Grid Layout (replacing FlatList)
  taskGrid: {
    paddingHorizontal: 20,
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  taskGridItem: {
    width: '48%',
    marginBottom: 12,
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    aspectRatio: 1,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  // Bottom spacing for scroll safety
  bottomSpacing: {
    height: 100,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  taskContent: {
    flex: 1,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#B9C3CF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#F3E7C9',
    borderColor: '#F3E7C9',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  checkmark: {
    color: '#0F2A44',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    color: '#1E3A4B',
    fontWeight: '500',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#B9C3CF',
  },
  animationToggleButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(243, 231, 201, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 10,
  },
  animationToggleText: {
    color: '#0F2A44',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Enhanced Profile Header Styles
  profileHeader: {
    backgroundColor: 'rgba(243, 231, 201, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 20,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  profileGoalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E7C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalIconText: {
    fontSize: 20,
  },
  profileGoal: {
    color: '#F3E7C9',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    lineHeight: 24,
  },
  profileStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#B9C3CF',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.8,
  },
  statValue: {
    color: '#F3E7C9',
    fontSize: 16,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(243, 231, 201, 0.3)',
    marginHorizontal: 8,
  },
  // Loading State Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.3)',
  },
  loadingIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A4B',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F3E7C9',
    marginHorizontal: 4,
  },
  
  // Quest Regeneration Button Styles
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 42, 68, 0.9)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.3)',
  },
  regenerateButtonDisabled: {
    backgroundColor: 'rgba(15, 42, 68, 0.5)',
    opacity: 0.7,
  },
  regenerateButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  regenerateButtonText: {
    color: '#F3E7C9',
    fontSize: 16,
    fontWeight: '600',
  },
});