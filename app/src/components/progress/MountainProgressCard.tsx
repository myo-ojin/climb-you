import React from 'react';
import { View, Text } from 'react-native';

interface MountainProgressCardProps {
  completed: number;
  total: number;
  completionRate: number; // 0-100
  totalTimeSpent?: number;
  targetTime?: number;
}

export const MountainProgressCard: React.FC<MountainProgressCardProps> = ({
  completed,
  total,
  completionRate,
  totalTimeSpent = 0,
  targetTime = 60,
}) => {
  // Calculate mountain level based on completion rate
  const getMountainLevel = (rate: number) => {
    if (rate >= 100) return { level: 'summit', emoji: '🏔️', name: '山頂', color: 'from-yellow-400 to-orange-500' };
    if (rate >= 75) return { level: 'high', emoji: '⛰️', name: '8合目', color: 'from-blue-400 to-purple-500' };
    if (rate >= 50) return { level: 'middle', emoji: '🏕️', name: '5合目', color: 'from-green-400 to-blue-500' };
    if (rate >= 25) return { level: 'low', emoji: '🌲', name: '3合目', color: 'from-green-300 to-green-500' };
    return { level: 'base', emoji: '🥾', name: '登山開始', color: 'from-gray-400 to-green-400' };
  };

  const mountain = getMountainLevel(completionRate);

  // Get motivational message based on progress
  const getMotivationalMessage = (rate: number, completed: number, total: number) => {
    if (rate >= 100) return '🎉 素晴らしい！今日の目標を完全達成しました！';
    if (rate >= 75) return '🚀 もう少しで山頂です！この調子で頑張りましょう！';
    if (rate >= 50) return '💪 半分以上達成！着実に山を登っています！';
    if (rate >= 25) return '📈 良いスタートです！一歩ずつ登り続けましょう！';
    if (completed > 0) return '✨ 最初の一歩を踏み出しました！継続が力になります！';
    return '🏔️ 今日の山登りを始めましょう！最初のクエストから挑戦！';
  };

  const message = getMotivationalMessage(completionRate, completed, total);

  return (
    <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">今日の山登り進捗</Text>
        <View className="bg-blue-100 px-3 py-1 rounded-full">
          <Text className="text-blue-800 text-sm font-semibold">{mountain.name}</Text>
        </View>
      </View>

      {/* Mountain Visual */}
      <View className="items-center mb-6">
        {/* Mountain Emoji */}
        <Text className="text-6xl mb-2">{mountain.emoji}</Text>
        
        {/* Progress Info */}
        <View className="items-center">
          <Text className="text-3xl font-bold text-gray-900 mb-1">
            {completionRate.toFixed(0)}%
          </Text>
          <Text className="text-gray-600 text-sm">
            {completed} / {total} クエスト完了
          </Text>
        </View>
      </View>

      {/* Progress Bar with Mountain Theme */}
      <View className="mb-4">
        <View className="bg-gray-200 rounded-full h-3 overflow-hidden">
          <View 
            className={`bg-gradient-to-r ${mountain.color} h-full rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(completionRate, 100)}%` }}
          />
        </View>
        
        {/* Progress Markers */}
        <View className="flex-row justify-between mt-2 px-1">
          <Text className="text-xs text-gray-500">登山開始</Text>
          <Text className="text-xs text-gray-500">3合目</Text>
          <Text className="text-xs text-gray-500">5合目</Text>
          <Text className="text-xs text-gray-500">8合目</Text>
          <Text className="text-xs text-gray-500">山頂</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-1 items-center">
          <Text className="text-sm text-gray-500">完了率</Text>
          <Text className="text-lg font-bold text-blue-600">{completionRate.toFixed(0)}%</Text>
        </View>
        
        <View className="w-px bg-gray-200 h-8 mx-4" />
        
        <View className="flex-1 items-center">
          <Text className="text-sm text-gray-500">学習時間</Text>
          <Text className="text-lg font-bold text-green-600">{totalTimeSpent}分</Text>
        </View>
        
        <View className="w-px bg-gray-200 h-8 mx-4" />
        
        <View className="flex-1 items-center">
          <Text className="text-sm text-gray-500">目標まで</Text>
          <Text className="text-lg font-bold text-purple-600">
            {Math.max(0, total - completed)}個
          </Text>
        </View>
      </View>

      {/* Motivational Message */}
      <View className={`bg-gradient-to-r ${mountain.color} p-4 rounded-lg`}>
        <Text className="text-white font-medium text-center leading-relaxed">
          {message}
        </Text>
      </View>
    </View>
  );
};