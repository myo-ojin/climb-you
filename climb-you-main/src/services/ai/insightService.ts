/**
 * Insight and Weekly Report Service
 * Generates personalized insights and weekly progress reports
 */

import { QuestHistory, LearningPattern } from './dailyQuestService';
import { DetailedLearningAnalysis, LearningAnalyzer } from './learningAnalyzer';

export interface WeeklyReport {
  weekRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string;   // YYYY-MM-DD
  };
  overallSummary: WeeklySummary;
  achievements: Achievement[];
  challenges: Challenge[];
  insights: Insight[];
  recommendations: WeeklyRecommendation[];
  nextWeekGoals: NextWeekGoal[];
  celebrationMessage: string;
  improvementFocus: string;
  confidenceScore: number; // 0-1, how reliable this report is
  generatedAt: number;
}

export interface WeeklySummary {
  totalQuests: number;
  completedQuests: number;
  completionRate: number; // 0-1
  totalLearningMinutes: number;
  averageDifficulty: number;
  streakDays: number;
  consistencyScore: number; // 0-1
  comparedToPreviousWeek: {
    completionRateDelta: number; // change in completion rate
    learningTimeDelta: number;   // change in minutes
    trend: 'improving' | 'stable' | 'declining';
  };
}

export interface Achievement {
  type: 'streak' | 'completion' | 'difficulty' | 'consistency' | 'efficiency' | 'pattern_mastery';
  title: string;
  description: string;
  impact: string;
  celebrationEmoji: string;
  shareableText?: string; // Text for social sharing
}

export interface Challenge {
  type: 'time_management' | 'difficulty' | 'consistency' | 'motivation' | 'comprehension';
  title: string;
  description: string;
  impact: 'minor' | 'moderate' | 'significant';
  suggestedActions: string[];
  rootCause?: string;
}

export interface Insight {
  category: 'performance' | 'pattern' | 'timing' | 'difficulty' | 'motivation';
  title: string;
  observation: string;
  significance: 'high' | 'medium' | 'low';
  actionable: boolean;
  evidence: string[];
  implication: string;
}

export interface WeeklyRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: 'schedule' | 'difficulty' | 'content' | 'technique' | 'motivation';
  title: string;
  rationale: string;
  specificActions: string[];
  expectedBenefit: string;
  implementationDifficulty: 'easy' | 'moderate' | 'challenging';
  timeToSeeResults: 'immediate' | 'short_term' | 'long_term';
}

export interface NextWeekGoal {
  type: 'completion_rate' | 'learning_time' | 'difficulty_progression' | 'consistency' | 'new_pattern';
  title: string;
  target: string; // Specific, measurable target
  motivation: string;
  successCriteria: string[];
  supportingActions: string[];
}

export interface PersonalizedInsight {
  userId: string;
  insightType: 'achievement' | 'improvement' | 'warning' | 'encouragement' | 'milestone';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionItems?: string[];
  relevantData: any;
  generatedAt: number;
  expiresAt?: number; // When this insight becomes irrelevant
}

export class InsightService {
  private learningAnalyzer: LearningAnalyzer;

  constructor() {
    this.learningAnalyzer = new LearningAnalyzer();
  }

  /**
   * Generate comprehensive weekly report
   */
  async generateWeeklyReport(
    userId: string,
    questHistory: QuestHistory[],
    weekStartDate: string // YYYY-MM-DD (Monday)
  ): Promise<WeeklyReport> {
    try {
      const weekRange = this.calculateWeekRange(weekStartDate);
      const weekHistory = this.filterWeekHistory(questHistory, weekRange);
      const previousWeekHistory = this.getPreviousWeekHistory(questHistory, weekRange);
      
      // Get comprehensive analysis
      const learningAnalysis = await this.learningAnalyzer.analyzeLearningPatterns(
        userId,
        questHistory,
        14 // 2-week analysis for better context
      );

      const overallSummary = this.generateWeeklySummary(weekHistory, previousWeekHistory);
      const achievements = this.identifyWeeklyAchievements(weekHistory, previousWeekHistory, learningAnalysis);
      const challenges = this.identifyChallenges(weekHistory, learningAnalysis);
      const insights = this.generateWeeklyInsights(weekHistory, previousWeekHistory, learningAnalysis);
      const recommendations = this.generateWeeklyRecommendations(weekHistory, learningAnalysis);
      const nextWeekGoals = this.generateNextWeekGoals(overallSummary, learningAnalysis);
      
      const celebrationMessage = this.generateCelebrationMessage(achievements, overallSummary);
      const improvementFocus = this.determineImprovementFocus(challenges, learningAnalysis);
      
      const confidenceScore = this.calculateReportConfidence(weekHistory.length, questHistory.length);

      return {
        weekRange,
        overallSummary,
        achievements,
        challenges,
        insights,
        recommendations,
        nextWeekGoals,
        celebrationMessage,
        improvementFocus,
        confidenceScore,
        generatedAt: Date.now(),
      };
    } catch (error) {
      console.error('Weekly report generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate real-time personalized insights
   */
  async generatePersonalizedInsights(
    userId: string,
    recentHistory: QuestHistory[],
    context: {
      currentStreak: number;
      recentCompletionRate: number;
      timeOfDay: number;
      lastQuestRating?: number;
    }
  ): Promise<PersonalizedInsight[]> {
    const insights: PersonalizedInsight[] = [];
    const now = Date.now();

    // Achievement insights
    if (context.currentStreak >= 7) {
      insights.push({
        userId,
        insightType: 'milestone',
        title: `${context.currentStreak}日連続達成！`,
        message: `素晴らしい継続力です！この調子で学習習慣を続けていきましょう。`,
        priority: 'high',
        actionItems: ['今日も1つでもクエストを完了して記録を延ばしましょう'],
        relevantData: { streak: context.currentStreak },
        generatedAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    // Performance insights
    if (context.recentCompletionRate < 0.5 && recentHistory.length >= 5) {
      insights.push({
        userId,
        insightType: 'warning',
        title: '最近の完了率が低下しています',
        message: '学習内容が難しすぎるか、時間配分に問題があるかもしれません。',
        priority: 'high',
        actionItems: [
          '今日は簡単なクエストから始めてみましょう',
          '学習時間を短めに設定してみてください'
        ],
        relevantData: { completionRate: context.recentCompletionRate },
        generatedAt: now,
        expiresAt: now + 3 * 24 * 60 * 60 * 1000, // 3 days
      });
    } else if (context.recentCompletionRate > 0.9) {
      insights.push({
        userId,
        insightType: 'achievement',
        title: '高い完了率を維持中！',
        message: 'より高度な内容にチャレンジする準備ができているかもしれません。',
        priority: 'medium',
        actionItems: ['難易度を上げたクエストに挑戦してみましょう'],
        relevantData: { completionRate: context.recentCompletionRate },
        generatedAt: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 1 week
      });
    }

    // Time-based insights
    if (context.timeOfDay >= 22) { // Late night
      insights.push({
        userId,
        insightType: 'encouragement',
        title: '夜遅くまでお疲れさまです',
        message: '今日の学習もここまでにして、明日に備えて休息を取りましょう。',
        priority: 'medium',
        relevantData: { timeOfDay: context.timeOfDay },
        generatedAt: now,
        expiresAt: now + 2 * 60 * 60 * 1000, // 2 hours
      });
    }

    // Rating-based insights
    if (context.lastQuestRating && context.lastQuestRating <= 2) {
      insights.push({
        userId,
        insightType: 'improvement',
        title: 'より良い学習体験のために',
        message: '前回のクエストが満足いかなかったようですね。内容や難易度を調整しましょう。',
        priority: 'high',
        actionItems: [
          '今日は異なるパターンのクエストを試してみましょう',
          'フィードバックをお聞かせください'
        ],
        relevantData: { rating: context.lastQuestRating },
        generatedAt: now,
        expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate motivational messages based on progress
   */
  generateMotivationalMessage(
    completionRate: number,
    streak: number,
    recentPerformance: 'improving' | 'stable' | 'declining'
  ): string {
    if (completionRate >= 0.8 && streak >= 5) {
      return "🌟 素晴らしい継続力とパフォーマンスです！あなたの努力が確実に成果に繋がっています。";
    } else if (recentPerformance === 'improving') {
      return "📈 最近の上向きトレンドが素晴らしいですね！この調子で頑張りましょう。";
    } else if (completionRate >= 0.6) {
      return "💪 着実に成長を続けています。コツコツと積み重ねることが大切です。";
    } else if (recentPerformance === 'declining') {
      return "🤗 最近少し苦戦されているようですが、学習の波は自然なものです。無理をせず、自分のペースで進みましょう。";
    } else {
      return "🎯 新しい挑戦の始まりです！小さな一歩から始めて、徐々にペースを作っていきましょう。";
    }
  }

  // Private helper methods

  private calculateWeekRange(weekStartDate: string): { startDate: string; endDate: string } {
    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Sunday

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  private filterWeekHistory(history: QuestHistory[], weekRange: { startDate: string; endDate: string }): QuestHistory[] {
    return history.filter(quest => {
      return quest.date >= weekRange.startDate && quest.date <= weekRange.endDate;
    });
  }

  private getPreviousWeekHistory(history: QuestHistory[], currentWeekRange: { startDate: string; endDate: string }): QuestHistory[] {
    const prevWeekStart = new Date(currentWeekRange.startDate);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    
    const prevWeekEnd = new Date(currentWeekRange.endDate);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

    const prevWeekRange = {
      startDate: prevWeekStart.toISOString().split('T')[0],
      endDate: prevWeekEnd.toISOString().split('T')[0],
    };

    return this.filterWeekHistory(history, prevWeekRange);
  }

  private generateWeeklySummary(
    weekHistory: QuestHistory[],
    previousWeekHistory: QuestHistory[]
  ): WeeklySummary {
    const totalQuests = weekHistory.length;
    const completedQuests = weekHistory.filter(q => q.wasSuccessful).length;
    const completionRate = totalQuests > 0 ? completedQuests / totalQuests : 0;
    const totalLearningMinutes = weekHistory.reduce((sum, q) => sum + (q.actualMinutes || 0), 0);
    const averageDifficulty = totalQuests > 0 
      ? weekHistory.reduce((sum, q) => sum + q.difficulty, 0) / totalQuests 
      : 0;

    // Calculate streak days (consecutive days with at least one completed quest)
    const streakDays = this.calculateWeeklyStreak(weekHistory);
    const consistencyScore = Math.min(1, streakDays / 7);

    // Compare with previous week
    const prevCompletionRate = previousWeekHistory.length > 0 
      ? previousWeekHistory.filter(q => q.wasSuccessful).length / previousWeekHistory.length 
      : 0;
    const prevLearningMinutes = previousWeekHistory.reduce((sum, q) => sum + (q.actualMinutes || 0), 0);
    
    const completionRateDelta = completionRate - prevCompletionRate;
    const learningTimeDelta = totalLearningMinutes - prevLearningMinutes;
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (completionRateDelta > 0.1 || learningTimeDelta > 60) {
      trend = 'improving';
    } else if (completionRateDelta < -0.1 || learningTimeDelta < -60) {
      trend = 'declining';
    }

    return {
      totalQuests,
      completedQuests,
      completionRate,
      totalLearningMinutes,
      averageDifficulty,
      streakDays,
      consistencyScore,
      comparedToPreviousWeek: {
        completionRateDelta,
        learningTimeDelta,
        trend,
      },
    };
  }

  private identifyWeeklyAchievements(
    weekHistory: QuestHistory[],
    previousWeekHistory: QuestHistory[],
    analysis: DetailedLearningAnalysis
  ): Achievement[] {
    const achievements: Achievement[] = [];

    // High completion rate achievement
    const completionRate = weekHistory.filter(q => q.wasSuccessful).length / Math.max(weekHistory.length, 1);
    if (completionRate >= 0.8) {
      achievements.push({
        type: 'completion',
        title: '高い完了率を達成！',
        description: `今週は${Math.round(completionRate * 100)}%の高い完了率を記録しました`,
        impact: '学習習慣の定着と自信の向上',
        celebrationEmoji: '🎯',
        shareableText: `今週は学習クエストの${Math.round(completionRate * 100)}%を完了しました！ #学習継続 #成長記録`,
      });
    }

    // Consistency achievement
    if (analysis.completionPatterns.consistencyScore >= 0.8) {
      achievements.push({
        type: 'consistency',
        title: '継続性の向上',
        description: '安定したペースで学習を続けています',
        impact: '長期的な学習成果の基盤構築',
        celebrationEmoji: '📈',
      });
    }

    // Difficulty progression achievement
    const avgDifficulty = weekHistory.reduce((sum, q) => sum + q.difficulty, 0) / Math.max(weekHistory.length, 1);
    if (avgDifficulty > 0.7) {
      achievements.push({
        type: 'difficulty',
        title: '高難易度クエストに挑戦',
        description: 'challenging なコンテンツに積極的に取り組みました',
        impact: 'スキルレベルの向上と成長加速',
        celebrationEmoji: '🚀',
      });
    }

    return achievements;
  }

  private identifyChallenges(
    weekHistory: QuestHistory[],
    analysis: DetailedLearningAnalysis
  ): Challenge[] {
    const challenges: Challenge[] = [];

    const completionRate = weekHistory.filter(q => q.wasSuccessful).length / Math.max(weekHistory.length, 1);
    
    // Low completion rate challenge
    if (completionRate < 0.5) {
      challenges.push({
        type: 'completion',
        title: '完了率の低下',
        description: '今週は思うようにクエストを完了できませんでした',
        impact: 'moderate',
        suggestedActions: [
          '難易度を少し下げてみる',
          'セッション時間を短くする',
          '異なる学習パターンを試す'
        ],
        rootCause: 'コンテンツの難易度や時間配分の調整が必要',
      });
    }

    // Time management issues
    if (analysis.timeEfficiency.actualVsPlannedTime.ratio > 1.3) {
      challenges.push({
        type: 'time_management',
        title: '時間管理の改善余地',
        description: '予定よりも長い時間がかかる傾向があります',
        impact: 'moderate',
        suggestedActions: [
          '集中できる時間帯を見つける',
          '学習環境を整える',
          'ポモドーロテクニックを試す'
        ],
      });
    }

    return challenges;
  }

  private generateWeeklyInsights(
    weekHistory: QuestHistory[],
    previousWeekHistory: QuestHistory[],
    analysis: DetailedLearningAnalysis
  ): Insight[] {
    const insights: Insight[] = [];

    // Performance pattern insight
    const bestDay = this.findBestPerformanceDay(weekHistory);
    if (bestDay) {
      insights.push({
        category: 'timing',
        title: `${bestDay}が最も生産的でした`,
        observation: `${bestDay}に最高のパフォーマンスを記録しました`,
        significance: 'medium',
        actionable: true,
        evidence: ['完了率データ', 'ユーザー評価'],
        implication: 'この曜日のスケジュールパターンを他の日にも適用できるかもしれません',
      });
    }

    return insights;
  }

  private generateWeeklyRecommendations(
    weekHistory: QuestHistory[],
    analysis: DetailedLearningAnalysis
  ): WeeklyRecommendation[] {
    const recommendations: WeeklyRecommendation[] = [];

    // Based on completion patterns
    if (analysis.completionPatterns.overallRate < 0.6) {
      recommendations.push({
        priority: 'high',
        category: 'difficulty',
        title: '学習内容の調整',
        rationale: '現在の難易度が高すぎる可能性があります',
        specificActions: [
          '基礎的な内容から再開する',
          'セッション時間を短くする',
          'サポート資料を活用する'
        ],
        expectedBenefit: '完了率の向上と自信の回復',
        implementationDifficulty: 'easy',
        timeToSeeResults: 'short_term',
      });
    }

    return recommendations;
  }

  private generateNextWeekGoals(
    summary: WeeklySummary,
    analysis: DetailedLearningAnalysis
  ): NextWeekGoal[] {
    const goals: NextWeekGoal[] = [];

    // Completion rate goal
    const targetRate = Math.min(0.9, summary.completionRate + 0.1);
    goals.push({
      type: 'completion_rate',
      title: '完了率の向上',
      target: `${Math.round(targetRate * 100)}%の完了率を目指す`,
      motivation: '継続的な成長と学習習慣の強化',
      successCriteria: [`週間完了率${Math.round(targetRate * 100)}%以上`],
      supportingActions: ['適切な難易度設定', '集中できる時間の確保'],
    });

    return goals;
  }

  private generateCelebrationMessage(achievements: Achievement[], summary: WeeklySummary): string {
    if (achievements.length === 0) {
      return "新しい週も一緒に頑張りましょう！小さな前進も大切な成長です。";
    }

    const primaryAchievement = achievements[0];
    return `${primaryAchievement.celebrationEmoji} ${primaryAchievement.title} 素晴らしい一週間でした！`;
  }

  private determineImprovementFocus(challenges: Challenge[], analysis: DetailedLearningAnalysis): string {
    if (challenges.length === 0) {
      return "現在のペースを維持しながら、新しいチャレンジに取り組んでみましょう。";
    }

    const primaryChallenge = challenges[0];
    return `来週は「${primaryChallenge.title}」に焦点を当てて改善していきましょう。`;
  }

  // Additional helper methods
  private calculateWeeklyStreak(weekHistory: QuestHistory[]): number {
    const daysWithCompletion = new Set(
      weekHistory
        .filter(q => q.wasSuccessful)
        .map(q => q.date)
    );
    return daysWithCompletion.size;
  }

  private calculateReportConfidence(weekDataPoints: number, totalDataPoints: number): number {
    const weekConfidence = Math.min(1, weekDataPoints / 10); // Need at least 10 data points for full confidence
    const totalConfidence = Math.min(1, totalDataPoints / 50);
    return (weekConfidence + totalConfidence) / 2;
  }

  private findBestPerformanceDay(weekHistory: QuestHistory[]): string | null {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayPerformance = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    weekHistory.forEach(quest => {
      const dayOfWeek = new Date(quest.date).getDay();
      dayCounts[dayOfWeek]++;
      if (quest.wasSuccessful) {
        dayPerformance[dayOfWeek]++;
      }
    });

    let bestDay = -1;
    let bestRate = 0;

    for (let i = 0; i < 7; i++) {
      if (dayCounts[i] > 0) {
        const rate = dayPerformance[i] / dayCounts[i];
        if (rate > bestRate) {
          bestRate = rate;
          bestDay = i;
        }
      }
    }

    return bestDay >= 0 ? dayNames[bestDay] + '曜日' : null;
  }
}