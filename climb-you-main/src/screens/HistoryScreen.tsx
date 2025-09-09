import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { QuestHistory, LearningPattern } from '../services/ai/dailyQuestService';
import { DetailedLearningAnalysis } from '../services/ai/learningAnalyzer';

const { width: screenWidth } = Dimensions.get('window');

interface HistoryScreenProps {
  userId?: string;
}

interface WeeklyStats {
  week: string;
  completedQuests: number;
  totalQuests: number;
  averageDifficulty: number;
  totalMinutes: number;
}

interface HistoryTabType {
  id: 'overview' | 'detailed' | 'insights';
  label: string;
}

const colors = {
  NightSky: '#0F2A44',
  Moonlight: '#F3E7C9',
  white: '#fff',
  text: '#333',
  textSecondary: '#666',
  textOnNight: '#fff',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  cardBackground: 'rgba(255, 255, 255, 0.9)',
  chartPrimary: '#F3E7C9',
  chartSecondary: '#B9C3CF',
};

const TABS: HistoryTabType[] = [
  { id: 'overview', label: '概要' },
  { id: 'detailed', label: '詳細' },
  { id: 'insights', label: '分析' },
];

export default function HistoryScreen({ userId = 'default' }: HistoryScreenProps) {
  const [activeTab, setActiveTab] = useState<HistoryTabType['id']>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [questHistory, setQuestHistory] = useState<QuestHistory[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
  const [learningAnalysis, setLearningAnalysis] = useState<DetailedLearningAnalysis | null>(null);

  useEffect(() => {
    loadHistoryData();
  }, [userId]);

  const loadHistoryData = async () => {
    try {
      setIsLoading(true);
      
      // Generate mock data for demonstration
      const mockHistory = generateMockHistory(30); // 30 days of history
      const weeklyData = calculateWeeklyStats(mockHistory);
      const mockAnalysis = generateMockAnalysis();
      
      setQuestHistory(mockHistory);
      setWeeklyStats(weeklyData);
      setLearningAnalysis(mockAnalysis);
    } catch (error) {
      console.error('Failed to load history data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Overall Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statNumber}>{questHistory.filter(q => q.wasSuccessful).length}</Text>
          <Text style={styles.statLabel}>完了クエスト</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSecondary]}>
          <Text style={styles.statNumber}>{questHistory.length}</Text>
          <Text style={styles.statLabel}>総クエスト数</Text>
        </View>
        <View style={[styles.statCard, styles.statCardSuccess]}>
          <Text style={styles.statNumber}>
            {questHistory.length > 0 ? Math.round((questHistory.filter(q => q.wasSuccessful).length / questHistory.length) * 100) : 0}%
          </Text>
          <Text style={styles.statLabel}>成功率</Text>
        </View>
        <View style={[styles.statCard, styles.statCardWarning]}>
          <Text style={styles.statNumber}>
            {Math.round(questHistory.reduce((sum, q) => sum + (q.actualMinutes || 0), 0))}
          </Text>
          <Text style={styles.statLabel}>総学習時間（分）</Text>
        </View>
      </View>

      {/* Weekly Progress Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>週間進捗</Text>
        <LineChart
          data={{
            labels: weeklyStats.slice(-6).map(w => w.week),
            datasets: [{
              data: weeklyStats.slice(-6).map(w => (w.completedQuests / Math.max(w.totalQuests, 1)) * 100),
              color: () => colors.chartPrimary,
              strokeWidth: 3,
            }],
          }}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            decimalPlaces: 0,
            color: () => colors.chartPrimary,
            labelColor: () => colors.text,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: colors.chartPrimary,
            },
          }}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Recent Achievements */}
      <View style={styles.achievementsContainer}>
        <Text style={styles.sectionTitle}>最近の成果</Text>
        {questHistory
          .filter(q => q.wasSuccessful)
          .slice(0, 5)
          .map((quest, index) => (
            <View key={index} style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <Text style={styles.achievementEmoji}>🎯</Text>
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>{quest.title}</Text>
                <Text style={styles.achievementDate}>
                  {new Date(quest.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  {quest.userRating && ` • ${quest.userRating}/5 ⭐`}
                </Text>
              </View>
              <View style={styles.achievementBadge}>
                <Text style={styles.badgeText}>完了</Text>
              </View>
            </View>
          ))}
      </View>
    </ScrollView>
  );

  const renderDetailedTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Learning Time Distribution */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>学習時間分布（過去4週間）</Text>
        <BarChart
          data={{
            labels: weeklyStats.slice(-4).map(w => w.week),
            datasets: [{
              data: weeklyStats.slice(-4).map(w => w.totalMinutes),
            }],
          }}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: colors.cardBackground,
            backgroundGradientFrom: colors.white,
            backgroundGradientTo: colors.white,
            decimalPlaces: 0,
            color: () => colors.chartSecondary,
            labelColor: () => colors.text,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />
      </View>

      {/* Pattern Analysis */}
      <View style={styles.patternContainer}>
        <Text style={styles.sectionTitle}>学習パターン分析</Text>
        
        {/* Most Used Patterns */}
        <View style={styles.patternCard}>
          <Text style={styles.patternCardTitle}>よく使うパターン</Text>
          {getTopPatterns(questHistory).map((pattern, index) => (
            <View key={index} style={styles.patternItem}>
              <Text style={styles.patternName}>{pattern.pattern}</Text>
              <View style={styles.patternStats}>
                <Text style={styles.patternCount}>{pattern.count}回</Text>
                <Text style={styles.patternRate}>{Math.round(pattern.successRate * 100)}%成功</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Difficulty Progression */}
        <View style={styles.patternCard}>
          <Text style={styles.patternCardTitle}>難易度の変遷</Text>
          <LineChart
            data={{
              labels: questHistory.slice(-10).map((_, index) => `${index + 1}`),
              datasets: [{
                data: questHistory.slice(-10).map(q => q.difficulty * 100),
                color: () => colors.warning,
                strokeWidth: 2,
              }],
            }}
            width={screenWidth - 80}
            height={150}
            chartConfig={{
              backgroundColor: colors.cardBackground,
              backgroundGradientFrom: colors.white,
              backgroundGradientTo: colors.white,
              decimalPlaces: 0,
              color: () => colors.warning,
              labelColor: () => colors.textSecondary,
              style: { borderRadius: 8 },
            }}
            withDots={false}
            style={styles.smallChart}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderInsightsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {learningAnalysis && (
        <>
          {/* Strengths */}
          <View style={styles.insightSection}>
            <Text style={styles.sectionTitle}>🌟 あなたの強み</Text>
            {learningAnalysis.strengths.map((strength, index) => (
              <View key={index} style={styles.insightCard}>
                <Text style={styles.insightTitle}>{strength.category}</Text>
                <Text style={styles.insightDescription}>{strength.description}</Text>
                <Text style={styles.insightLeverage}>活用法: {strength.leverage}</Text>
              </View>
            ))}
          </View>

          {/* Improvement Opportunities */}
          <View style={styles.insightSection}>
            <Text style={styles.sectionTitle}>📈 改善のチャンス</Text>
            {learningAnalysis.improvementOpportunities.slice(0, 3).map((opportunity, index) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.opportunityHeader}>
                  <Text style={styles.insightTitle}>{opportunity.title}</Text>
                  <View style={styles.impactBadge}>
                    <Text style={styles.impactText}>{opportunity.impact}</Text>
                  </View>
                </View>
                <Text style={styles.insightDescription}>{opportunity.description}</Text>
                <Text style={styles.estimatedImprovement}>{opportunity.estimatedImprovement}</Text>
              </View>
            ))}
          </View>

          {/* Recommendations */}
          <View style={styles.insightSection}>
            <Text style={styles.sectionTitle}>💡 おすすめ</Text>
            {learningAnalysis.recommendations.slice(0, 3).map((recommendation, index) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.insightTitle}>{recommendation.title}</Text>
                  <View style={[styles.priorityBadge, styles[`priority${recommendation.priority}`]]}>
                    <Text style={styles.priorityText}>{recommendation.priority}</Text>
                  </View>
                </View>
                <Text style={styles.insightDescription}>{recommendation.rationale}</Text>
                <Text style={styles.implementationText}>実装方法: {recommendation.implementation}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'detailed': return renderDetailedTab();
      case 'insights': return renderInsightsTab();
      default: return renderOverviewTab();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>学習履歴を読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>学習履歴</Text>
        <Text style={styles.headerSubtitle}>あなたの成長の記録</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {renderTabContent()}
    </SafeAreaView>
  );
}

// Helper functions
function generateMockHistory(days: number): QuestHistory[] {
  const history: QuestHistory[] = [];
  const patterns = ['read_note_q', 'flashcards', 'build_micro', 'debug_explain', 'feynman'];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const questsPerDay = Math.floor(Math.random() * 3) + 1; // 1-3 quests per day
    
    for (let j = 0; j < questsPerDay; j++) {
      const wasSuccessful = Math.random() > 0.25; // 75% success rate
      history.push({
        questId: `quest_${i}_${j}`,
        title: `Day ${i + 1} Quest ${j + 1}`,
        pattern: patterns[Math.floor(Math.random() * patterns.length)],
        completedAt: wasSuccessful ? date.getTime() : undefined,
        actualMinutes: wasSuccessful ? Math.floor(Math.random() * 30) + 15 : undefined,
        difficulty: Math.random() * 0.8 + 0.2,
        wasSuccessful,
        userRating: wasSuccessful ? Math.floor(Math.random() * 3) + 3 : undefined, // 3-5 rating
        date: date.toISOString().split('T')[0],
      });
    }
  }
  
  return history.reverse(); // Oldest first
}

function calculateWeeklyStats(history: QuestHistory[]): WeeklyStats[] {
  const weeklyMap = new Map<string, QuestHistory[]>();
  
  history.forEach(quest => {
    const date = new Date(quest.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, []);
    }
    weeklyMap.get(weekKey)!.push(quest);
  });

  return Array.from(weeklyMap.entries()).map(([week, quests]) => {
    const completedQuests = quests.filter(q => q.wasSuccessful).length;
    const totalMinutes = quests.reduce((sum, q) => sum + (q.actualMinutes || 0), 0);
    const averageDifficulty = quests.reduce((sum, q) => sum + q.difficulty, 0) / quests.length;
    
    const weekDate = new Date(week);
    const weekLabel = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
    
    return {
      week: weekLabel,
      completedQuests,
      totalQuests: quests.length,
      averageDifficulty,
      totalMinutes,
    };
  }).sort((a, b) => a.week.localeCompare(b.week));
}

function getTopPatterns(history: QuestHistory[]) {
  const patternMap = new Map<string, { count: number; successes: number }>();
  
  history.forEach(quest => {
    if (!patternMap.has(quest.pattern)) {
      patternMap.set(quest.pattern, { count: 0, successes: 0 });
    }
    const stats = patternMap.get(quest.pattern)!;
    stats.count++;
    if (quest.wasSuccessful) stats.successes++;
  });

  return Array.from(patternMap.entries())
    .map(([pattern, stats]) => ({
      pattern,
      count: stats.count,
      successRate: stats.count > 0 ? stats.successes / stats.count : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function generateMockAnalysis(): DetailedLearningAnalysis {
  return {
    completionPatterns: {
      overallRate: 0.78,
      streakData: { currentStreak: 5, longestStreak: 12, averageStreak: 6 },
      consistencyScore: 0.82,
      completionTimePatterns: { averageTimeToComplete: 23, fastestCompletion: 15, slowestCompletion: 45 },
    },
    timeEfficiency: {
      actualVsPlannedTime: { ratio: 0.92, variance: 0.15 },
      optimalSessionLength: 25,
      productiveHours: [{ hour: 9, efficiency: 0.9 }, { hour: 14, efficiency: 0.85 }, { hour: 19, efficiency: 0.7 }],
      timeWastageIndicators: [],
      focusPatterns: { averageFocusTime: 22, distractionPoints: [] },
    },
    difficultyProgression: {
      comfortZone: { min: 0.4, max: 0.7 },
      growthRate: 0.08,
      challengeResponse: 'adaptive',
      skillProgression: { beginnerSkills: 85, intermediateSkills: 45, advancedSkills: 15 },
      plateauRisk: 0.25,
    },
    weeklyTrends: {
      bestDay: 'Monday',
      worstDay: 'Friday',
      weekendVsWeekday: { weekend: 0.72, weekday: 0.81 },
      monthlyTrends: [],
      seasonalFactors: [],
    },
    improvementOpportunities: [
      {
        category: 'consistency',
        title: '週末の学習習慣改善',
        description: '週末の成功率が平日より低くなっています',
        impact: 'medium',
        effort: 'easy',
        actionItems: ['週末用の軽めのクエスト設定', '短時間セッションの活用'],
        estimatedImprovement: '全体成功率5-8%向上',
      },
    ],
    strengths: [
      {
        category: 'consistency',
        description: '高い継続性と学習習慣',
        evidence: ['連続学習記録', '高い完了率'],
        leverage: '現在のペースを維持しながら難易度を徐々に上げる',
      },
    ],
    riskFactors: [],
    recommendations: [
      {
        category: 'schedule',
        priority: 'medium',
        title: '週末学習時間の調整',
        rationale: '週末のパフォーマンス向上のため',
        implementation: '土日は平日より短時間のセッションに変更',
        expectedOutcome: '週末成功率の改善',
        timeFrame: 'short_term',
      },
    ],
    confidenceScore: 0.85,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.NightSky,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textOnNight,
    fontSize: 16,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 231, 201, 0.2)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textOnNight,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.textOnNight,
    opacity: 0.8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.Moonlight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textOnNight,
    opacity: 0.7,
  },
  activeTabText: {
    color: colors.NightSky,
    opacity: 1,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: colors.Moonlight,
  },
  statCardSecondary: {
    borderLeftWidth: 4,
    borderLeftColor: colors.chartSecondary,
  },
  statCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  statCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  smallChart: {
    borderRadius: 8,
    marginTop: 8,
  },
  achievementsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textOnNight,
    marginBottom: 16,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementEmoji: {
    fontSize: 20,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  achievementDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  achievementBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '600',
  },
  patternContainer: {
    marginBottom: 24,
  },
  patternCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  patternCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  patternItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  patternName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  patternStats: {
    alignItems: 'flex-end',
  },
  patternCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  patternRate: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '500',
  },
  insightSection: {
    marginBottom: 32,
  },
  insightCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  insightLeverage: {
    fontSize: 13,
    color: colors.success,
    fontStyle: 'italic',
  },
  opportunityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  impactBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  impactText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  estimatedImprovement: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityhigh: {
    backgroundColor: colors.danger,
  },
  prioritymedium: {
    backgroundColor: colors.warning,
  },
  prioritylow: {
    backgroundColor: colors.success,
  },
  priorityText: {
    fontSize: 10,
    color: colors.white,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  implementationText: {
    fontSize: 13,
    color: colors.success,
    fontStyle: 'italic',
  },
});