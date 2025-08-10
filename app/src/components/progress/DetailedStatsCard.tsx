import React from 'react';
import { View, Text } from 'react-native';

interface DetailedStatsCardProps {
  todayStats: {
    completed: number;
    total: number;
    completionRate: number;
    totalTimeSpent: number;
    averageTimePerQuest: number;
  };
  weeklyStats?: {
    totalQuests: number;
    completedQuests: number;
    averageDaily: number;
    streak: number;
  };
}

export const DetailedStatsCard: React.FC<DetailedStatsCardProps> = ({
  todayStats,
  weeklyStats,
}) => {
  const { completed, total, completionRate, totalTimeSpent, averageTimePerQuest } = todayStats;

  // Get achievement status
  const getAchievementStatus = (rate: number) => {
    if (rate >= 100) return { icon: '🏆', text: '完全達成', color: 'text-yellow-600 bg-yellow-100' };
    if (rate >= 80) return { icon: '🥇', text: '優秀', color: 'text-yellow-600 bg-yellow-100' };
    if (rate >= 60) return { icon: '🥈', text: '良好', color: 'text-gray-600 bg-gray-100' };
    if (rate >= 40) return { icon: '🥉', text: '進歩中', color: 'text-orange-600 bg-orange-100' };
    if (rate > 0) return { icon: '📈', text: '開始', color: 'text-blue-600 bg-blue-100' };
    return { icon: '⭐', text: '準備中', color: 'text-gray-500 bg-gray-50' };
  };

  const achievement = getAchievementStatus(completionRate);

  return (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900">詳細統計</Text>
        <View className={`px-3 py-1 rounded-full ${achievement.color}`}>
          <View className="flex-row items-center">
            <Text className="mr-1">{achievement.icon}</Text>
            <Text className="text-sm font-semibold">{achievement.text}</Text>
          </View>
        </View>
      </View>

      {/* Today's Stats Grid */}
      <View className="mb-4">
        <Text className="text-base font-semibold text-gray-800 mb-3">今日の実績</Text>
        
        <View className="flex-row flex-wrap">
          {/* Completion Rate */}
          <View className="w-1/2 mb-3">
            <View className="bg-blue-50 p-3 rounded-lg mr-2">
              <Text className="text-2xl font-bold text-blue-600">{completionRate.toFixed(0)}%</Text>
              <Text className="text-sm text-blue-700">達成率</Text>
            </View>
          </View>

          {/* Completed Tasks */}
          <View className="w-1/2 mb-3">
            <View className="bg-green-50 p-3 rounded-lg ml-2">
              <Text className="text-2xl font-bold text-green-600">{completed}</Text>
              <Text className="text-sm text-green-700">完了クエスト</Text>
            </View>
          </View>

          {/* Total Time */}
          <View className="w-1/2 mb-3">
            <View className="bg-purple-50 p-3 rounded-lg mr-2">
              <Text className="text-2xl font-bold text-purple-600">{totalTimeSpent}</Text>
              <Text className="text-sm text-purple-700">学習時間（分）</Text>
            </View>
          </View>

          {/* Average Time */}
          <View className="w-1/2 mb-3">
            <View className="bg-orange-50 p-3 rounded-lg ml-2">
              <Text className="text-2xl font-bold text-orange-600">
                {completed > 0 ? Math.round(averageTimePerQuest) : 0}
              </Text>
              <Text className="text-sm text-orange-700">平均時間（分）</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Today's Goal Status */}
      <View className="mb-4">
        <Text className="text-base font-semibold text-gray-800 mb-3">目標達成状況</Text>
        
        <View className="bg-gray-50 p-4 rounded-lg">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-700">今日の目標</Text>
            <Text className="font-semibold text-gray-900">{total}個のクエスト</Text>
          </View>
          
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-700">完了済み</Text>
            <Text className="font-semibold text-green-600">{completed}個</Text>
          </View>
          
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-gray-700">残り</Text>
            <Text className="font-semibold text-blue-600">{Math.max(0, total - completed)}個</Text>
          </View>

          {/* Progress Indicator */}
          <View className="bg-gray-200 rounded-full h-2">
            <View 
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-full rounded-full"
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </View>
        </View>
      </View>

      {/* Weekly Stats (if available) */}
      {weeklyStats && (
        <View>
          <Text className="text-base font-semibold text-gray-800 mb-3">週間実績</Text>
          
          <View className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-700">週間完了数</Text>
              <Text className="font-bold text-indigo-600">
                {weeklyStats.completedQuests} / {weeklyStats.totalQuests}
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-700">1日平均</Text>
              <Text className="font-bold text-purple-600">
                {weeklyStats.averageDaily.toFixed(1)}個
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700">連続達成</Text>
              <View className="flex-row items-center">
                <Text className="mr-1">🔥</Text>
                <Text className="font-bold text-orange-600">{weeklyStats.streak}日</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};