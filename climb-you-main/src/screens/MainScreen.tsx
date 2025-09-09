import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert, Dimensions, SafeAreaView } from 'react-native';
import EnhancedMountainAnimation from '../components/EnhancedMountainAnimation';
import { Task } from '../types';
import { IntegratedUserProfile } from '../types/userProfile';
import { firebaseUserProfileService } from '../services/firebase/firebaseUserProfileService';
import { useTask } from '../contexts/TaskContext';

const { height: screenHeight } = Dimensions.get('window');

export default function MainScreen() {
  // TaskContext からタスク管理
  const { tasks, toggleTask, deleteTask, updateTasks } = useTask();
  const [progress, setProgress] = useState(0);
  
  // 統合ユーザープロファイル
  const [userProfile, setUserProfile] = useState<IntegratedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        
        // 今日のクエストをタスクとして設定（Contextが空の場合のみ）
        if (tasks.length === 0) {
          console.log('🔍 MainScreen: Converting quests to tasks...', {
            todaysQuests: profile.progress.todaysQuests,
            tasksLength: tasks.length
          });
          
          const todayTasks: Task[] = profile.progress.todaysQuests.map(quest => ({
            id: quest.title, // 簡易的なID
            title: quest.title,
            description: quest.deliverable || '',
            completed: false,
            createdAt: new Date(),
          }));
          
          console.log('🔍 MainScreen: Created tasks from quests:', todayTasks);
          updateTasks(todayTasks);
          console.log('🔍 MainScreen: Tasks updated successfully');
        } else {
          console.log('🔍 MainScreen: Tasks already exist, skipping quest conversion');
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
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <SafeAreaView style={styles.container}>
      {/* User Profile Header */}
      {userProfile && (
        <View style={styles.profileHeader}>
          <Text style={styles.profileGoal}>
            🎯 {userProfile.onboardingData.goalDeepDiveData.goal_text}
          </Text>
          <Text style={styles.profileStats}>
            📚 {userProfile.progress.todaysProgress.completed}/{userProfile.progress.todaysProgress.total} 完了 • 
            ⏰ {userProfile.aiProfile.time_budget_min_per_day}分/日 •
            🔥 {userProfile.progress.currentStreak}日連続
          </Text>
        </View>
      )}

      {/* Mountain Animation Section - 1/3 of screen */}
      <View style={styles.mountainSection}>
        <View style={styles.mountainCard}>
          <EnhancedMountainAnimation 
            progress={progress / 100} 
            checkpoints={[0.25, 0.5, 0.75, 1.0]}
          />
        </View>
      </View>

      {/* Task Management Section - 2/3 of screen */}
      <View style={styles.taskSection}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskHeaderTitle}>Daily Quest</Text>
          <Text style={styles.taskHeaderSubtitle}>
            {completedTasksCount}/{tasks.length} Completed
          </Text>
        </View>
        
        {/* Task List */}
        <FlatList
          data={tasksWithDummy}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          style={styles.taskList}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  mountainSection: {
    height: screenHeight * 0.33, // 1/3 of screen
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
    flex: 1, // Takes remaining 2/3 of screen
    paddingTop: 20,
    marginHorizontal: 16,
    borderRadius: 20,
  },
  taskHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 231, 201, 0.3)',
    backgroundColor: '#0F2A44',
    color: '#F3E7C9',
  },
  taskHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3E7C9',
    marginBottom: 4,
  },
  taskHeaderSubtitle: {
    fontSize: 16,
    color: '#B9C3CF',
    opacity: 0.9,
  },

  taskList: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  row: {
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  taskItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    flex: 1,
    aspectRatio: 1,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  dummyTask: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    flex: 1,
    aspectRatio: 1,
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
  // Profile Header Styles
  profileHeader: {
    backgroundColor: 'rgba(15, 42, 68, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileGoal: {
    color: '#F3E7C9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileStats: {
    color: '#B9C3CF',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
});