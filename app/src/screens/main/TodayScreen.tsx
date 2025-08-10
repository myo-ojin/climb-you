import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { QuestService } from '../../services/questService';
import { Quest, DailyQuestCollection, QuestStatus } from '../../types/quest';
import { generateMockDailyQuests } from '../../utils/mockQuestData';
import { MountainProgressCard } from '../../components/progress/MountainProgressCard';
import { DetailedStatsCard } from '../../components/progress/DetailedStatsCard';
import { NotificationService } from '../../services/notificationService';

// Quest Card Component
const QuestCard: React.FC<{
  quest: Quest;
  onToggleComplete: (questId: string, completed: boolean) => void;
  loading?: boolean;
}> = ({ quest, onToggleComplete, loading }) => {
  const isCompleted = quest.status === 'completed';
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'learning': return '📚';
      case 'practice': return '🏃‍♂️';
      case 'reflection': return '🤔';
      case 'action': return '⚡';
      case 'research': return '🔍';
      default: return '📋';
    }
  };

  return (
    <View className={`bg-white rounded-xl p-4 mb-4 border ${isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200'} shadow-sm`}>
      {/* Quest Header */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-2">
            <Text className="text-lg mr-2">{getCategoryIcon(quest.category)}</Text>
            <Text className={`text-lg font-bold ${isCompleted ? 'text-green-800 line-through' : 'text-gray-900'}`}>
              {quest.title}
            </Text>
          </View>
          
          <View className="flex-row items-center mb-2">
            <View className={`px-2 py-1 rounded-full mr-2 ${getDifficultyColor(quest.difficulty)}`}>
              <Text className="text-xs font-semibold">{quest.difficulty.toUpperCase()}</Text>
            </View>
            <Text className="text-sm text-gray-600">
              ⏱️ {quest.estimatedTimeMinutes}分
            </Text>
          </View>
        </View>

        {/* Completion Toggle */}
        <TouchableOpacity
          className={`w-12 h-12 rounded-full items-center justify-center ${
            isCompleted ? 'bg-green-500' : 'bg-gray-200'
          }`}
          onPress={() => onToggleComplete(quest.id, !isCompleted)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text className="text-xl">{isCompleted ? '✓' : '○'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Quest Description */}
      <Text className={`text-gray-700 mb-3 ${isCompleted ? 'line-through opacity-60' : ''}`}>
        {quest.description}
      </Text>

      {/* Instructions Preview */}
      {quest.instructions.length > 0 && (
        <View className="mb-3">
          <Text className="text-sm font-semibold text-gray-900 mb-1">実行手順:</Text>
          <Text className={`text-sm text-gray-600 ${isCompleted ? 'line-through opacity-60' : ''}`}>
            1. {quest.instructions[0]}
            {quest.instructions.length > 1 && ` (他${quest.instructions.length - 1}件...)`}
          </Text>
        </View>
      )}

      {/* Goal Contribution */}
      <View className="bg-blue-50 p-3 rounded-lg">
        <Text className="text-xs font-semibold text-blue-800 mb-1">🎯 目標への貢献</Text>
        <Text className="text-sm text-blue-700">{quest.goalContribution}</Text>
      </View>

      {/* Motivation Message */}
      {quest.motivationMessage && (
        <View className="mt-3 bg-purple-50 p-3 rounded-lg">
          <Text className="text-xs font-semibold text-purple-800 mb-1">💪 AI からの応援</Text>
          <Text className="text-sm text-purple-700">{quest.motivationMessage}</Text>
        </View>
      )}
    </View>
  );
};


// Today Screen Main Component
export const TodayScreen: React.FC = () => {
  const { user } = useAuth();
  const [questCollection, setQuestCollection] = useState<DailyQuestCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingQuest, setUpdatingQuest] = useState<string | null>(null);
  const [notificationPermissionChecked, setNotificationPermissionChecked] = useState(false);

  const questService = new QuestService();

  // Load today's quests (with mock data for MVP)
  const loadTodaysQuests = async (isRefresh = false) => {
    if (!user) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Try to get real data first
      let collection = await questService.getDailyQuests(user.id);
      
      // If no real data, generate mock data for MVP testing
      if (!collection) {
        console.log('No quest data found, generating mock data for MVP');
        collection = generateMockDailyQuests(user.id);
        
        // Save mock data to Firestore for consistency
        try {
          await questService.saveDailyQuests(collection);
        } catch (saveError) {
          console.log('Could not save mock data, continuing with local data');
        }
      }
      
      setQuestCollection(collection);
    } catch (error) {
      console.error('Error loading today\'s quests:', error);
      
      // Fallback to mock data even on error for MVP
      try {
        const mockCollection = generateMockDailyQuests(user.id);
        setQuestCollection(mockCollection);
        console.log('Using fallback mock data');
      } catch (mockError) {
        Alert.alert(
          'エラー',
          'クエストの読み込みに失敗しました。もう一度お試しください。'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Toggle quest completion
  const handleToggleComplete = async (questId: string, completed: boolean) => {
    if (!user || !questCollection) return;

    setUpdatingQuest(questId);
    
    try {
      const newStatus: QuestStatus = completed ? 'completed' : 'pending';
      await questService.updateQuestStatus(user.id, questId, newStatus);
      
      // Update local state
      setQuestCollection(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          quests: prev.quests.map(quest => 
            quest.id === questId 
              ? { ...quest, status: newStatus, completedAt: completed ? new Date() : undefined }
              : quest
          ),
          updatedAt: new Date(),
        };
      });

      // Show success message for completion and send celebration notification
      if (completed) {
        Alert.alert('🎉 完了！', 'クエストを完了しました！素晴らしいです！');
        
        // Send celebration notification
        try {
          const quest = questCollection.quests.find(q => q.id === questId);
          if (quest && NotificationService.isInitialized()) {
            await NotificationService.scheduleQuestCompletionCelebration(quest.title);
          }
        } catch (error) {
          console.log('Failed to send celebration notification:', error);
        }
      }
    } catch (error) {
      console.error('Error updating quest status:', error);
      Alert.alert(
        'エラー',
        'クエストの更新に失敗しました。もう一度お試しください。'
      );
    } finally {
      setUpdatingQuest(null);
    }
  };

  // Generate new quests (MVP implementation with mock data)
  const handleRegenerateQuests = async () => {
    if (!user) return;

    Alert.alert(
      '🔄 クエスト再生成',
      '新しいクエストを生成しますか？現在のクエストは置き換えられます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '生成する',
          onPress: async () => {
            setLoading(true);
            try {
              // Generate new mock quests
              const newCollection = generateMockDailyQuests(user.id);
              
              // Try to save to Firestore
              try {
                await questService.saveDailyQuests(newCollection);
              } catch (saveError) {
                console.log('Could not save regenerated quests, using local data');
              }
              
              setQuestCollection(newCollection);
              Alert.alert('✨ 完了！', '新しいクエストを生成しました！');
            } catch (error) {
              console.error('Error regenerating quests:', error);
              Alert.alert('エラー', 'クエストの再生成に失敗しました。');
             } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Initialize notification service
  const initializeNotifications = async () => {
    if (!notificationPermissionChecked) {
      try {
        const initialized = await NotificationService.initialize();
        if (initialized) {
          console.log('Notifications initialized successfully');
          
          // Set up daily reminder if not already set
          try {
            await NotificationService.scheduleDailyReminder('09:00');
            console.log('Daily reminder scheduled for 9:00 AM');
          } catch (error) {
            console.log('Daily reminder scheduling failed:', error);
          }
        }
      } catch (error) {
        console.log('Notification initialization failed:', error);
      } finally {
        setNotificationPermissionChecked(true);
      }
    }
  };

  useEffect(() => {
    loadTodaysQuests();
    initializeNotifications();
  }, [user, notificationPermissionChecked]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-gray-600 mt-4">今日のクエストを読み込み中...</Text>
      </View>
    );
  }

  if (!questCollection || questCollection.quests.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1 px-4 pt-6"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadTodaysQuests(true)} />
          }
        >
          {/* Empty State */}
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-6xl mb-4">🏔️</Text>
            <Text className="text-xl font-bold text-gray-900 mb-2">今日のクエストがありません</Text>
            <Text className="text-gray-600 text-center mb-6 leading-relaxed">
              AIがあなた専用のクエストを{'\n'}
              生成する準備ができています
            </Text>
            
            <TouchableOpacity
              className="bg-blue-500 px-6 py-3 rounded-xl"
              onPress={handleRegenerateQuests}
            >
              <Text className="text-white font-semibold">クエストを生成</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  const completedQuests = questCollection.quests.filter(q => q.status === 'completed');
  const completionRate = questCollection.quests.length > 0 
    ? (completedQuests.length / questCollection.quests.length) * 100 
    : 0;

  // Calculate estimated time spent on completed quests
  const timeSpentOnCompleted = completedQuests.reduce((total, quest) => 
    total + quest.estimatedTimeMinutes, 0
  );

  // Calculate average time per quest for completed ones
  const averageTimePerQuest = completedQuests.length > 0 
    ? timeSpentOnCompleted / completedQuests.length 
    : 0;

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1 px-4 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTodaysQuests(true)} />
        }
      >
        {/* Mountain Progress Card */}
        <MountainProgressCard
          completed={completedQuests.length}
          total={questCollection.quests.length}
          completionRate={completionRate}
          totalTimeSpent={timeSpentOnCompleted}
          targetTime={questCollection.totalEstimatedTime}
        />

        {/* Detailed Stats Card */}
        <DetailedStatsCard
          todayStats={{
            completed: completedQuests.length,
            total: questCollection.quests.length,
            completionRate,
            totalTimeSpent: timeSpentOnCompleted,
            averageTimePerQuest,
          }}
          // weeklyStats will be added later when we have historical data
        />

        {/* AI Message */}
        {questCollection.aiGeneratedMessage && (
          <View className="bg-white rounded-xl p-4 mb-6 border border-purple-200">
            <View className="flex-row items-center mb-2">
              <Text className="text-lg mr-2">🤖</Text>
              <Text className="text-lg font-bold text-purple-800">今日のAIメッセージ</Text>
            </View>
            <Text className="text-purple-700 leading-relaxed">
              {questCollection.aiGeneratedMessage}
            </Text>
          </View>
        )}

        {/* Quest List */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">今日のクエスト</Text>
            <View className="flex-row">
              {/* Test Notification Button */}
              <TouchableOpacity
                className="bg-purple-100 px-3 py-2 rounded-lg mr-2"
                onPress={async () => {
                  try {
                    await NotificationService.testNotification();
                    Alert.alert('テスト通知送信', 'テスト通知を送信しました！');
                  } catch (error) {
                    Alert.alert('エラー', '通知の送信に失敗しました。設定を確認してください。');
                  }
                }}
              >
                <Text className="text-purple-700 font-medium">🔔 テスト</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                className="bg-gray-100 px-3 py-2 rounded-lg"
                onPress={handleRegenerateQuests}
              >
                <Text className="text-gray-700 font-medium">🔄 再生成</Text>
              </TouchableOpacity>
            </View>
          </View>

          {questCollection.quests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              onToggleComplete={handleToggleComplete}
              loading={updatingQuest === quest.id}
            />
          ))}
        </View>

        {/* Bottom Padding */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
};