/**
 * Learning Pattern Analyzer
 * Analyzes user learning patterns and provides insights for optimization
 */

import { QuestHistory, LearningPattern } from './dailyQuestService';
import { Quest } from '../../types/questGeneration';

export interface DetailedLearningAnalysis {
  completionPatterns: CompletionPattern;
  timeEfficiency: TimeEfficiencyAnalysis;
  difficultyProgression: DifficultyAnalysis;
  weeklyTrends: WeeklyTrendAnalysis;
  improvementOpportunities: ImprovementOpportunity[];
  strengths: LearningStrength[];
  riskFactors: RiskFactor[];
  recommendations: PersonalizedRecommendation[];
  confidenceScore: number; // 0-1, how confident we are in the analysis
}

export interface CompletionPattern {
  overallRate: number;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    averageStreak: number;
  };
  consistencyScore: number; // 0-1, how consistent the user is
  completionTimePatterns: {
    averageTimeToComplete: number; // minutes
    fastestCompletion: number;
    slowestCompletion: number;
  };
}

export interface TimeEfficiencyAnalysis {
  actualVsPlannedTime: {
    ratio: number; // actual/planned
    variance: number;
  };
  optimalSessionLength: number; // minutes
  productiveHours: { hour: number; efficiency: number }[];
  timeWastageIndicators: string[];
  focusPatterns: {
    averageFocusTime: number;
    distractionPoints: string[];
  };
}

export interface DifficultyAnalysis {
  comfortZone: { min: number; max: number }; // difficulty range 0-1
  growthRate: number; // how quickly user adapts to harder content
  challengeResponse: 'thrives' | 'struggles' | 'adaptive' | 'unknown';
  skillProgression: {
    beginnerSkills: number; // percentage mastered
    intermediateSkills: number;
    advancedSkills: number;
  };
  plateauRisk: number; // 0-1, risk of hitting a learning plateau
}

export interface WeeklyTrendAnalysis {
  bestDay: string;
  worstDay: string;
  weekendVsWeekday: {
    weekend: number;
    weekday: number;
  };
  monthlyTrends: { week: number; performance: number }[];
  seasonalFactors: string[];
}

export interface ImprovementOpportunity {
  category: 'time_management' | 'difficulty' | 'consistency' | 'efficiency' | 'engagement';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'easy' | 'moderate' | 'challenging';
  actionItems: string[];
  estimatedImprovement: string;
}

export interface LearningStrength {
  category: string;
  description: string;
  evidence: string[];
  leverage: string; // how to leverage this strength
}

export interface RiskFactor {
  type: 'burnout' | 'plateau' | 'inconsistency' | 'overcommitment' | 'underchallenge';
  severity: 'low' | 'medium' | 'high';
  description: string;
  earlyWarnings: string[];
  mitigationStrategies: string[];
}

export interface PersonalizedRecommendation {
  category: 'schedule' | 'difficulty' | 'content' | 'motivation' | 'technique';
  priority: 'high' | 'medium' | 'low';
  title: string;
  rationale: string;
  implementation: string;
  expectedOutcome: string;
  timeFrame: 'immediate' | 'short_term' | 'long_term'; // days, weeks, months
}

export class LearningAnalyzer {
  /**
   * Perform comprehensive learning analysis
   */
  async analyzeLearningPatterns(
    userId: string,
    questHistory: QuestHistory[],
    timeframe: number = 30 // days
  ): Promise<DetailedLearningAnalysis> {
    try {
      const relevantHistory = this.filterRecentHistory(questHistory, timeframe);
      
      if (relevantHistory.length < 5) {
        return this.generateNewUserAnalysis();
      }

      const completionPatterns = this.analyzeCompletionPatterns(relevantHistory);
      const timeEfficiency = this.analyzeTimeEfficiency(relevantHistory);
      const difficultyProgression = this.analyzeDifficultyProgression(relevantHistory);
      const weeklyTrends = this.analyzeWeeklyTrends(relevantHistory);
      
      const strengths = this.identifyStrengths(completionPatterns, timeEfficiency, difficultyProgression);
      const riskFactors = this.identifyRiskFactors(completionPatterns, timeEfficiency, weeklyTrends);
      const opportunities = this.identifyImprovementOpportunities(completionPatterns, timeEfficiency, difficultyProgression, weeklyTrends);
      const recommendations = this.generatePersonalizedRecommendations(strengths, riskFactors, opportunities);
      
      const confidenceScore = this.calculateConfidenceScore(relevantHistory.length, timeframe);

      return {
        completionPatterns,
        timeEfficiency,
        difficultyProgression,
        weeklyTrends,
        improvementOpportunities: opportunities,
        strengths,
        riskFactors,
        recommendations,
        confidenceScore,
      };

    } catch (error) {
      console.error('Learning analysis failed:', error);
      throw error;
    }
  }

  /**
   * Generate dynamic difficulty adjustment recommendations
   */
  generateDifficultyAdjustment(
    currentDifficulty: number,
    recentPerformance: QuestHistory[]
  ): {
    newDifficulty: number;
    adjustment: number;
    reason: string;
    confidence: number;
  } {
    const recentSuccess = recentPerformance.filter(q => q.wasSuccessful);
    const successRate = recentSuccess.length / recentPerformance.length;
    
    let adjustment = 0;
    let reason = '';
    let confidence = 0.7;

    // High success rate - increase difficulty
    if (successRate > 0.85) {
      adjustment = 0.1;
      reason = 'High success rate suggests you\'re ready for more challenge';
      confidence = 0.9;
    }
    // Low success rate - decrease difficulty
    else if (successRate < 0.5) {
      adjustment = -0.15;
      reason = 'Lower difficulty to build confidence and maintain motivation';
      confidence = 0.8;
    }
    // Check for plateau pattern
    else if (this.detectPlateauPattern(recentPerformance)) {
      adjustment = 0.05;
      reason = 'Breaking plateau with slightly increased challenge';
      confidence = 0.6;
    }
    // Check recent ratings for engagement
    else {
      const avgRating = this.getAverageRating(recentPerformance);
      if (avgRating < 3) {
        adjustment = -0.05;
        reason = 'Lower ratings suggest need for easier, more engaging content';
        confidence = 0.7;
      } else if (avgRating > 4) {
        adjustment = 0.05;
        reason = 'High engagement suggests readiness for increased challenge';
        confidence = 0.8;
      }
    }

    const newDifficulty = Math.max(0.1, Math.min(0.9, currentDifficulty + adjustment));

    return {
      newDifficulty,
      adjustment,
      reason,
      confidence,
    };
  }

  /**
   * Predict user performance for upcoming quests
   */
  predictPerformance(
    questsToPredict: Quest[],
    historicalData: QuestHistory[],
    currentContext: {
      timeOfDay: number;
      dayOfWeek: string;
      recentPerformance: number;
    }
  ): {
    questId: string;
    predictedSuccess: number;
    confidenceLevel: number;
    recommendedAdjustments: string[];
  }[] {
    return questsToPredict.map((quest, index) => {
      const similarQuests = historicalData.filter(h => 
        h.pattern === quest.pattern && 
        Math.abs(h.difficulty - quest.difficulty) < 0.2
      );

      let predictedSuccess = 0.7; // Default baseline
      let confidenceLevel = 0.3;

      if (similarQuests.length > 0) {
        predictedSuccess = similarQuests.filter(q => q.wasSuccessful).length / similarQuests.length;
        confidenceLevel = Math.min(0.9, similarQuests.length / 10); // More data = higher confidence
      }

      // Adjust for context
      const timeAdjustment = this.getTimeOfDayAdjustment(currentContext.timeOfDay, historicalData);
      const dayAdjustment = this.getDayOfWeekAdjustment(currentContext.dayOfWeek, historicalData);
      const trendAdjustment = currentContext.recentPerformance > 0.7 ? 0.1 : -0.1;

      predictedSuccess = Math.max(0.1, Math.min(0.9, 
        predictedSuccess + timeAdjustment + dayAdjustment + trendAdjustment
      ));

      const recommendedAdjustments = this.generateQuestAdjustmentRecommendations(
        quest,
        predictedSuccess,
        currentContext
      );

      return {
        questId: `quest_${index}`,
        predictedSuccess,
        confidenceLevel,
        recommendedAdjustments,
      };
    });
  }

  // Private helper methods

  private filterRecentHistory(history: QuestHistory[], days: number): QuestHistory[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return history.filter(quest => new Date(quest.date) >= cutoff);
  }

  private analyzeCompletionPatterns(history: QuestHistory[]): CompletionPattern {
    const completedQuests = history.filter(q => q.wasSuccessful);
    const overallRate = completedQuests.length / history.length;

    // Calculate streaks
    const streaks = this.calculateStreaks(history);
    const completionTimes = completedQuests
      .filter(q => q.actualMinutes)
      .map(q => q.actualMinutes!);

    return {
      overallRate,
      streakData: {
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        averageStreak: streaks.average,
      },
      consistencyScore: this.calculateConsistencyScore(history),
      completionTimePatterns: {
        averageTimeToComplete: completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length || 0,
        fastestCompletion: Math.min(...completionTimes) || 0,
        slowestCompletion: Math.max(...completionTimes) || 0,
      },
    };
  }

  private analyzeTimeEfficiency(history: QuestHistory[]): TimeEfficiencyAnalysis {
    const completedQuests = history.filter(q => q.wasSuccessful && q.actualMinutes);
    
    // Calculate actual vs planned time (assuming 25min default planned time)
    const timeRatios = completedQuests.map(q => (q.actualMinutes || 25) / 25);
    const avgRatio = timeRatios.reduce((sum, ratio) => sum + ratio, 0) / timeRatios.length || 1;
    const variance = this.calculateVariance(timeRatios);

    // Analyze productive hours
    const hourlyPerformance = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);

    completedQuests.forEach(quest => {
      if (quest.completedAt) {
        const hour = new Date(quest.completedAt).getHours();
        hourlyCounts[hour]++;
        if (quest.wasSuccessful) {
          hourlyPerformance[hour]++;
        }
      }
    });

    const productiveHours = hourlyPerformance
      .map((performance, hour) => ({
        hour,
        efficiency: hourlyCounts[hour] > 0 ? performance / hourlyCounts[hour] : 0
      }))
      .filter(h => h.efficiency > 0)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);

    return {
      actualVsPlannedTime: {
        ratio: avgRatio,
        variance: variance,
      },
      optimalSessionLength: this.calculateOptimalSessionLength(completedQuests),
      productiveHours,
      timeWastageIndicators: this.identifyTimeWastage(avgRatio, variance),
      focusPatterns: {
        averageFocusTime: Math.min(25, Math.max(10, 25 / avgRatio)),
        distractionPoints: this.identifyDistractionPoints(history),
      },
    };
  }

  private analyzeDifficultyProgression(history: QuestHistory[]): DifficultyAnalysis {
    const difficulties = history.map(q => q.difficulty).sort((a, b) => a - b);
    const completedDifficulties = history.filter(q => q.wasSuccessful).map(q => q.difficulty);

    const comfortZone = {
      min: this.calculatePercentile(completedDifficulties, 25),
      max: this.calculatePercentile(completedDifficulties, 75),
    };

    const growthRate = this.calculateGrowthRate(history);
    const challengeResponse = this.determineChallengeResponse(history);

    return {
      comfortZone,
      growthRate,
      challengeResponse,
      skillProgression: this.calculateSkillProgression(history),
      plateauRisk: this.calculatePlateauRisk(history),
    };
  }

  private analyzeWeeklyTrends(history: QuestHistory[]): WeeklyTrendAnalysis {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyPerformance = new Array(7).fill(0);
    const dailyCounts = new Array(7).fill(0);

    history.forEach(quest => {
      const dayOfWeek = new Date(quest.date).getDay();
      dailyCounts[dayOfWeek]++;
      if (quest.wasSuccessful) {
        dailyPerformance[dayOfWeek]++;
      }
    });

    const dailyRates = dailyPerformance.map((performance, index) => 
      dailyCounts[index] > 0 ? performance / dailyCounts[index] : 0
    );

    const bestDayIndex = dailyRates.indexOf(Math.max(...dailyRates));
    const worstDayIndex = dailyRates.indexOf(Math.min(...dailyRates));

    const weekendRate = (dailyRates[0] + dailyRates[6]) / 2; // Sun + Sat
    const weekdayRate = dailyRates.slice(1, 6).reduce((sum, rate) => sum + rate, 0) / 5; // Mon-Fri

    return {
      bestDay: dayNames[bestDayIndex],
      worstDay: dayNames[worstDayIndex],
      weekendVsWeekday: {
        weekend: weekendRate,
        weekday: weekdayRate,
      },
      monthlyTrends: this.calculateMonthlyTrends(history),
      seasonalFactors: this.identifySeasonalFactors(history),
    };
  }

  // Additional helper methods would be implemented here...
  // For brevity, I'll include key methods only

  private calculateStreaks(history: QuestHistory[]): { current: number; longest: number; average: number } {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const streaks: number[] = [];

    history.reverse().forEach(quest => {
      if (quest.wasSuccessful) {
        tempStreak++;
        if (streaks.length === 0) currentStreak = tempStreak; // Most recent streak
      } else {
        if (tempStreak > 0) {
          streaks.push(tempStreak);
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      }
    });

    if (tempStreak > 0) {
      streaks.push(tempStreak);
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const averageStreak = streaks.length > 0 
      ? streaks.reduce((sum, streak) => sum + streak, 0) / streaks.length 
      : 0;

    return { current: currentStreak, longest: longestStreak, average: averageStreak };
  }

  private generateNewUserAnalysis(): DetailedLearningAnalysis {
    return {
      completionPatterns: {
        overallRate: 0.7,
        streakData: { currentStreak: 0, longestStreak: 0, averageStreak: 0 },
        consistencyScore: 0.5,
        completionTimePatterns: { averageTimeToComplete: 25, fastestCompletion: 25, slowestCompletion: 25 },
      },
      timeEfficiency: {
        actualVsPlannedTime: { ratio: 1.0, variance: 0 },
        optimalSessionLength: 25,
        productiveHours: [{ hour: 9, efficiency: 0.8 }, { hour: 14, efficiency: 0.7 }],
        timeWastageIndicators: [],
        focusPatterns: { averageFocusTime: 25, distractionPoints: [] },
      },
      difficultyProgression: {
        comfortZone: { min: 0.3, max: 0.7 },
        growthRate: 0.05,
        challengeResponse: 'unknown',
        skillProgression: { beginnerSkills: 0, intermediateSkills: 0, advancedSkills: 0 },
        plateauRisk: 0.2,
      },
      weeklyTrends: {
        bestDay: 'Mon',
        worstDay: 'Fri',
        weekendVsWeekday: { weekend: 0.7, weekday: 0.7 },
        monthlyTrends: [],
        seasonalFactors: [],
      },
      improvementOpportunities: [
        {
          category: 'consistency',
          title: 'Establish Daily Learning Habit',
          description: 'Build consistent learning routine',
          impact: 'high',
          effort: 'easy',
          actionItems: ['Set specific time for learning', 'Start with small sessions'],
          estimatedImprovement: '30% increase in consistency',
        },
      ],
      strengths: [
        {
          category: 'motivation',
          description: 'High initial motivation',
          evidence: ['Completed onboarding', 'Set clear goals'],
          leverage: 'Use motivation to build strong habits early',
        },
      ],
      riskFactors: [
        {
          type: 'inconsistency',
          severity: 'medium',
          description: 'New learner without established patterns',
          earlyWarnings: ['Skipping days', 'Declining engagement'],
          mitigationStrategies: ['Start small', 'Focus on consistency over intensity'],
        },
      ],
      recommendations: [
        {
          category: 'schedule',
          priority: 'high',
          title: 'Establish Consistent Learning Time',
          rationale: 'Consistency is key for new learners',
          implementation: 'Choose same time each day',
          expectedOutcome: 'Improved habit formation',
          timeFrame: 'immediate',
        },
      ],
      confidenceScore: 0.3,
    };
  }

  // Stub implementations for remaining helper methods
  private calculateConsistencyScore(history: QuestHistory[]): number { return 0.7; }
  private calculateVariance(numbers: number[]): number { return 0.1; }
  private calculateOptimalSessionLength(quests: QuestHistory[]): number { return 25; }
  private identifyTimeWastage(ratio: number, variance: number): string[] { return []; }
  private identifyDistractionPoints(history: QuestHistory[]): string[] { return []; }
  private calculatePercentile(numbers: number[], percentile: number): number { return 0.5; }
  private calculateGrowthRate(history: QuestHistory[]): number { return 0.05; }
  private determineChallengeResponse(history: QuestHistory[]): 'thrives' | 'struggles' | 'adaptive' | 'unknown' { return 'adaptive'; }
  private calculateSkillProgression(history: QuestHistory[]) { return { beginnerSkills: 60, intermediateSkills: 30, advancedSkills: 10 }; }
  private calculatePlateauRisk(history: QuestHistory[]): number { return 0.3; }
  private calculateMonthlyTrends(history: QuestHistory[]) { return []; }
  private identifySeasonalFactors(history: QuestHistory[]): string[] { return []; }
  private identifyStrengths(completion: CompletionPattern, time: TimeEfficiencyAnalysis, difficulty: DifficultyAnalysis): LearningStrength[] { return []; }
  private identifyRiskFactors(completion: CompletionPattern, time: TimeEfficiencyAnalysis, weekly: WeeklyTrendAnalysis): RiskFactor[] { return []; }
  private identifyImprovementOpportunities(completion: CompletionPattern, time: TimeEfficiencyAnalysis, difficulty: DifficultyAnalysis, weekly: WeeklyTrendAnalysis): ImprovementOpportunity[] { return []; }
  private generatePersonalizedRecommendations(strengths: LearningStrength[], risks: RiskFactor[], opportunities: ImprovementOpportunity[]): PersonalizedRecommendation[] { return []; }
  private calculateConfidenceScore(historyLength: number, timeframe: number): number { return Math.min(0.9, historyLength / 30); }
  private detectPlateauPattern(history: QuestHistory[]): boolean { return false; }
  private getAverageRating(history: QuestHistory[]): number { return 3.5; }
  private getTimeOfDayAdjustment(hour: number, history: QuestHistory[]): number { return 0; }
  private getDayOfWeekAdjustment(day: string, history: QuestHistory[]): number { return 0; }
  private generateQuestAdjustmentRecommendations(quest: Quest, predictedSuccess: number, context: any): string[] { return []; }
}