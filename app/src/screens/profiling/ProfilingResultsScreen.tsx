import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity 
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DetailedProfileAnalysis, ProfilingData } from '../../types/profiling';

interface RouteParams {
  profilingData: ProfilingData;
  analysis: DetailedProfileAnalysis;
}

export const ProfilingResultsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { profilingData, analysis } = route.params as RouteParams;

  const handleContinue = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' as never }],
    });
  };

  const handleRetakeProfile = () => {
    navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl mb-4">🎯</Text>
          <Text className="text-2xl font-bold text-gray-900 text-center">
            分析完了！
          </Text>
          <Text className="text-base text-gray-600 text-center mt-2">
            あなた専用の学習戦略を作成しました
          </Text>
        </View>

        {/* AI Message */}
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <View className="flex-row items-start">
            <Text className="text-2xl mr-3">🤖</Text>
            <View className="flex-1">
              <Text className="text-base text-blue-900 font-semibold mb-2">
                AIからのメッセージ
              </Text>
              <Text className="text-base text-blue-800 leading-6">
                {analysis.personalizedMessage}
              </Text>
            </View>
          </View>
        </View>

        {/* Learning Strategy */}
        <View className="bg-gray-50 rounded-lg p-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            📚 あなたの学習戦略
          </Text>
          <Text className="text-base text-gray-700 leading-6">
            {analysis.learningStrategy}
          </Text>
        </View>

        {/* Strengths */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            💪 あなたの強み
          </Text>
          {analysis.strengths.map((strength, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text className="text-green-500 mr-2">✓</Text>
              <Text className="text-base text-gray-700 flex-1">{strength}</Text>
            </View>
          ))}
        </View>

        {/* Areas for Improvement */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            🎯 改善ポイント
          </Text>
          {analysis.improvements.map((improvement, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text className="text-blue-500 mr-2">→</Text>
              <Text className="text-base text-gray-700 flex-1">{improvement}</Text>
            </View>
          ))}
        </View>

        {/* Time Management */}
        <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            ⏰ 時間管理の提案
          </Text>
          <View className="mb-3">
            <Text className="text-sm font-semibold text-gray-700">推奨セッション時間</Text>
            <Text className="text-base text-gray-900">{analysis.timeManagement.sessionLength}分</Text>
          </View>
          <View className="mb-3">
            <Text className="text-sm font-semibold text-gray-700">週の頻度</Text>
            <Text className="text-base text-gray-900">週{analysis.timeManagement.frequencyPerWeek}回</Text>
          </View>
          {analysis.timeManagement.optimalTimeSlots.length > 0 && (
            <View>
              <Text className="text-sm font-semibold text-gray-700 mb-2">最適な時間帯</Text>
              {analysis.timeManagement.optimalTimeSlots.map((timeSlot, index) => (
                <Text key={index} className="text-base text-gray-900">• {timeSlot}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Goal Breakdown */}
        {analysis.goalBreakdown.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              🎯 目標の分解
            </Text>
            {analysis.goalBreakdown.map((goal, index) => (
              <View key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                <View className="flex-row items-center mb-2">
                  <Text className="text-base font-semibold text-gray-900 flex-1">
                    {goal.goalTitle}
                  </Text>
                  <View className="bg-blue-100 px-2 py-1 rounded">
                    <Text className="text-xs font-semibold text-blue-700">
                      優先度 {goal.priority}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm text-gray-600 mb-2">
                  予想期間: {goal.estimatedTimeframe}
                </Text>
                <Text className="text-sm font-medium text-gray-700 mb-1">マイルストーン:</Text>
                {goal.milestones.map((milestone, mIndex) => (
                  <Text key={mIndex} className="text-sm text-gray-600 ml-2">
                    • {milestone}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Learning Path */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            🗺️ 学習ロードマップ
          </Text>
          
          {/* Phase 1 */}
          <View className="border-l-4 border-green-500 pl-4 mb-4">
            <Text className="text-base font-semibold text-green-700 mb-1">
              フェーズ1: {analysis.learningPath.phase1.focus}
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              期間: {analysis.learningPath.phase1.duration}
            </Text>
            {analysis.learningPath.phase1.keyActivities.map((activity, index) => (
              <Text key={index} className="text-sm text-gray-700">• {activity}</Text>
            ))}
          </View>

          {/* Phase 2 */}
          <View className="border-l-4 border-blue-500 pl-4 mb-4">
            <Text className="text-base font-semibold text-blue-700 mb-1">
              フェーズ2: {analysis.learningPath.phase2.focus}
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              期間: {analysis.learningPath.phase2.duration}
            </Text>
            {analysis.learningPath.phase2.keyActivities.map((activity, index) => (
              <Text key={index} className="text-sm text-gray-700">• {activity}</Text>
            ))}
          </View>

          {/* Phase 3 */}
          <View className="border-l-4 border-purple-500 pl-4 mb-4">
            <Text className="text-base font-semibold text-purple-700 mb-1">
              フェーズ3: {analysis.learningPath.phase3.focus}
            </Text>
            <Text className="text-sm text-gray-600 mb-2">
              期間: {analysis.learningPath.phase3.duration}
            </Text>
            {analysis.learningPath.phase3.keyActivities.map((activity, index) => (
              <Text key={index} className="text-sm text-gray-700">• {activity}</Text>
            ))}
          </View>
        </View>

        {/* Motivation Insights */}
        <View className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            🚀 モチベーション維持のコツ
          </Text>
          <Text className="text-base text-green-800 mb-3">
            {analysis.motivationInsights.primaryDriver}
          </Text>
          {analysis.motivationInsights.recommendations.map((rec, index) => (
            <View key={index} className="flex-row items-start mb-2">
              <Text className="text-green-500 mr-2">💡</Text>
              <Text className="text-base text-green-700 flex-1">{rec}</Text>
            </View>
          ))}
        </View>

        {/* Analysis Info */}
        <View className="bg-gray-100 rounded-lg p-4 mb-8">
          <Text className="text-sm font-semibold text-gray-700 mb-2">分析情報</Text>
          <Text className="text-xs text-gray-600">
            分析日時: {new Date(analysis.analysisDate).toLocaleString('ja-JP')}
          </Text>
          <Text className="text-xs text-gray-600">
            信頼度: {Math.round(analysis.confidence * 100)}%
          </Text>
          <Text className="text-xs text-gray-600">
            モデル: {analysis.modelVersion}
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="p-6 border-t border-gray-200">
        <TouchableOpacity
          onPress={handleContinue}
          className="bg-blue-500 py-4 rounded-lg items-center mb-3"
        >
          <Text className="text-white text-lg font-semibold">
            学習を始める！
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={handleRetakeProfile}
          className="bg-gray-200 py-3 rounded-lg items-center"
        >
          <Text className="text-gray-700 font-semibold">
            プロファイリングをやり直す
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};