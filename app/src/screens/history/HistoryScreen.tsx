import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { HistoryService } from '../../services/historyService';
import { 
  HistoryViewData, 
  DailyCompletion,
  getDayOfWeek,
  isToday,
  isYesterday
} from '../../types/history';

const DIFFICULTY_COLORS = {
  easy: '#10b981', // green
  medium: '#f59e0b', // amber
  hard: '#ef4444', // red
};

const CATEGORY_ICONS = {
  language: '🗣️',
  skill: '💡',
  certification: '📜',
  academic: '📚',
  personal: '🌱',
  other: '🎯',
};

export const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<HistoryViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const historyService = new HistoryService();

  const loadHistoryData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // For MVP, use mock data. In production, would use:
      // const data = await historyService.getHistoryViewData(user.uid);
      const data = historyService.generateMockHistoryData();
      
      setHistoryData(data);
    } catch (error) {
      console.error('Failed to load history data:', error);
      Alert.alert('エラー', '履歴データの読み込みに失敗しました');
      
      // Fallback to mock data
      const mockData = historyService.generateMockHistoryData();
      setHistoryData(mockData);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistoryData();
    setRefreshing(false);
  }, [loadHistoryData]);

  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  const formatDateDisplay = (dateString: string): string => {
    if (isToday(dateString)) return '今日';
    if (isYesterday(dateString)) return '昨日';
    return `${getDayOfWeek(dateString)}曜日`;
  };

  const getCompletionRateColor = (rate: number): string => {
    if (rate >= 0.8) return 'text-green-600';
    if (rate >= 0.6) return 'text-blue-600';
    if (rate >= 0.4) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getCompletionRateBgColor = (rate: number): string => {
    if (rate >= 0.8) return 'bg-green-500';
    if (rate >= 0.6) return 'bg-blue-500';
    if (rate >= 0.4) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (loading && !historyData) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg text-gray-600">履歴を読み込み中...</Text>
      </View>
    );
  }

  if (!historyData) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-lg text-gray-900 text-center mb-2">
          履歴データがありません
        </Text>
        <Text className="text-base text-gray-600 text-center">
          クエストを完了すると、ここに履歴が表示されます
        </Text>
      </View>
    );
  }

  const { weeklyStats, simpleStats, recentAchievements } = historyData;

  return (
    <ScrollView 
      className="flex-1 bg-white"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View className="px-6 pt-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">学習履歴</Text>
          <Text className="text-base text-gray-600">
            あなたの成長の軌跡を振り返りましょう
          </Text>
        </View>

        {/* Overall Stats */}
        <View className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">📊 全体統計</Text>
          
          <View className="flex-row flex-wrap justify-between">
            <View className="w-1/2 mb-3">
              <Text className="text-sm text-gray-600">総完了数</Text>
              <Text className="text-2xl font-bold text-blue-600">
                {simpleStats.totalCompletedEver}
              </Text>
            </View>
            
            <View className="w-1/2 mb-3">
              <Text className="text-sm text-gray-600">総達成率</Text>
              <Text className={`text-2xl font-bold ${getCompletionRateColor(simpleStats.overallCompletionRate)}`}>
                {Math.round(simpleStats.overallCompletionRate * 100)}%
              </Text>
            </View>
            
            <View className="w-1/2">
              <Text className="text-sm text-gray-600">現在の連続記録</Text>
              <Text className="text-2xl font-bold text-orange-600">
                {simpleStats.currentStreak}日
              </Text>
            </View>
            
            <View className="w-1/2">
              <Text className="text-sm text-gray-600">最長連続記録</Text>
              <Text className="text-2xl font-bold text-purple-600">
                {simpleStats.longestStreak}日
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Summary */}
        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">📅 この1週間</Text>
          
          <View className="flex-row justify-between mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-sm text-gray-600">完了数</Text>
              <Text className="text-xl font-bold text-green-600">
                {weeklyStats.totalCompleted} / {weeklyStats.totalAssigned}
              </Text>
            </View>
            
            <View className="flex-1">
              <Text className="text-sm text-gray-600">平均達成率</Text>
              <Text className={`text-xl font-bold ${getCompletionRateColor(weeklyStats.averageCompletionRate)}`}>
                {Math.round(weeklyStats.averageCompletionRate * 100)}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View className="bg-gray-200 rounded-full h-3 mb-2">
            <View 
              className={`h-3 rounded-full ${getCompletionRateBgColor(weeklyStats.averageCompletionRate)}`}
              style={{ width: `${weeklyStats.averageCompletionRate * 100}%` }}
            />
          </View>
          <Text className="text-xs text-gray-500 text-center">
            週間達成率
          </Text>
        </View>

        {/* Daily History */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-4">📋 日別履歴</Text>
          
          {weeklyStats.dailyRecords.map((day: DailyCompletion) => (
            <View key={day.date} className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
              <View className="flex-row items-center justify-between mb-3">
                <View>
                  <Text className="text-base font-semibold text-gray-900">
                    {formatDateDisplay(day.date)}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    {day.date}
                  </Text>
                </View>
                
                <View className="items-end">
                  <Text className="text-lg font-bold text-gray-900">
                    {day.completedCount} / {day.totalCount}
                  </Text>
                  <Text className={`text-sm font-semibold ${getCompletionRateColor(day.completionRate)}`}>
                    {Math.round(day.completionRate * 100)}%
                  </Text>
                </View>
              </View>

              {/* Progress bar for the day */}
              <View className="bg-gray-200 rounded-full h-2 mb-3">
                <View 
                  className={`h-2 rounded-full ${getCompletionRateBgColor(day.completionRate)}`}
                  style={{ width: `${day.completionRate * 100}%` }}
                />
              </View>

              {/* Completed quests list */}
              {day.completedQuests.length > 0 && (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    完了したクエスト:
                  </Text>
                  {day.completedQuests.map((quest, index) => (
                    <View key={quest.id} className="flex-row items-center mb-1">
                      <Text className="mr-2">
                        {CATEGORY_ICONS[quest.category as keyof typeof CATEGORY_ICONS] || '🎯'}
                      </Text>
                      <Text className="flex-1 text-sm text-gray-700">
                        {quest.title}
                      </Text>
                      <View 
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: DIFFICULTY_COLORS[quest.difficulty] + '20' }}
                      >
                        <Text 
                          className="text-xs font-medium"
                          style={{ color: DIFFICULTY_COLORS[quest.difficulty] }}
                        >
                          {quest.difficulty.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {day.completedCount === 0 && (
                <Text className="text-sm text-gray-500 italic">
                  この日はクエストを完了していません
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Recent Achievements */}
        {recentAchievements.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-4">🏆 最近の成果</Text>
            
            {recentAchievements.map((achievement, index) => (
              <View key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                <View className="flex-row items-center">
                  <Text className="text-2xl mr-3">{achievement.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">
                      {achievement.title}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      {achievement.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Encouragement Message */}
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <View className="flex-row items-start">
            <Text className="text-2xl mr-3">🎯</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-blue-900 mb-2">
                継続は力なり！
              </Text>
              <Text className="text-sm text-blue-800">
                {simpleStats.currentStreak > 0 
                  ? `${simpleStats.currentStreak}日連続で頑張っていますね！この調子で続けていきましょう。`
                  : '今日から新しいスタートを切りましょう！小さな一歩が大きな成果につながります。'
                }
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};