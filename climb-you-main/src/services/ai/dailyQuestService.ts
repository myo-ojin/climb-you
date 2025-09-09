/**
 * Daily Quest Generation Service
 * Handles automatic daily quest generation with user profile and history consideration
 */

import { EnhancedQuestService } from './enhancedQuestService';
import { Quest, ProfileV1, OnboardingInput } from '../../types/questGeneration';
import { InputSanitizer } from '../../utils/inputSanitizer';
import { MemoryManager } from '../../utils/memoryManager';
import { ConcurrencyManager } from '../../utils/concurrencyManager';

export interface UserProfile {
  userId: string;
  goalData: OnboardingInput;
  profileV1: ProfileV1;
  learningPatterns: LearningPattern;
  milestones: any[]; // Milestone[] from milestoneService
  createdAt: number;
  lastUpdated: number;
}

export interface QuestHistory {
  questId: string;
  title: string;
  pattern: string;
  completedAt?: number; // undefined if not completed
  actualMinutes?: number;
  difficulty: number;
  wasSuccessful: boolean;
  userRating?: 1 | 2 | 3 | 4 | 5; // User satisfaction rating
  date: string; // YYYY-MM-DD
}

export interface LearningPattern {
  averageCompletionRate: number; // 0-1
  bestTimeSlots: number[]; // Hours of day (0-23)
  preferredDifficulty: number; // 0-1
  weeklyTrends: { [dayOfWeek: string]: number }; // Mon-Sun completion rates
  improvementAreas: string[];
  lastAnalyzed: number;
}

export interface DailyQuestRequest {
  userId: string;
  targetDate: string; // YYYY-MM-DD
  forceRegeneration?: boolean; // Override existing quests for the day
}

export interface DailyQuestResult {
  targetDate: string;
  quests: Quest[];
  generationReason: string;
  adaptiveAdjustments: string[];
  estimatedDifficulty: number;
  totalMinutes: number;
  generatedAt: number;
}

export class DailyQuestService {
  private enhancedQuestService: EnhancedQuestService;

  constructor() {
    this.enhancedQuestService = new EnhancedQuestService();
  }

  /**
   * Generate today's quests for a user
   */
  async generateTodaysQuests(
    userProfile: UserProfile,
    recentHistory: QuestHistory[] = []
  ): Promise<DailyQuestResult> {
    const today = new Date().toISOString().split('T')[0];
    
    return this.generateQuestsForDate({
      userId: userProfile.userId,
      targetDate: today,
    }, userProfile, recentHistory);
  }

  /**
   * Generate quests for a specific date
   */
  async generateQuestsForDate(
    request: DailyQuestRequest,
    userProfile: UserProfile,
    recentHistory: QuestHistory[] = []
  ): Promise<DailyQuestResult> {
    try {
      // Analyze recent performance to adjust difficulty
      const performanceAnalysis = this.analyzeRecentPerformance(recentHistory);
      const contextualAdjustments = this.determineContextualAdjustments(
        request.targetDate,
        userProfile.learningPatterns,
        performanceAnalysis
      );

      // Calculate optimal quest count and difficulty
      const questConfig = this.calculateOptimalQuestConfig(
        userProfile,
        contextualAdjustments,
        performanceAnalysis
      );

      // Generate base quests using enhanced service
      const questResult = await this.enhancedQuestService.generateOptimizedQuestsWithTimeConstraints({
        goalText: userProfile.goalData.goal_text,
        profile: userProfile.profileV1,
        timeBudgetMinutes: questConfig.totalMinutes,
        questCount: questConfig.questCount,
        difficultyRange: questConfig.difficultyRange,
        avoidRecentPatterns: this.getRecentPatterns(recentHistory, 7), // Avoid patterns used in last 7 days
      });

      // Apply adaptive adjustments
      const adjustedQuests = this.applyAdaptiveAdjustments(
        questResult.finalQuests.quests || [],
        contextualAdjustments,
        performanceAnalysis
      );

      return {
        targetDate: request.targetDate,
        quests: adjustedQuests,
        generationReason: this.buildGenerationReason(contextualAdjustments, performanceAnalysis),
        adaptiveAdjustments: contextualAdjustments.adjustmentReasons,
        estimatedDifficulty: questConfig.averageDifficulty,
        totalMinutes: adjustedQuests.reduce((sum, quest) => sum + quest.minutes, 0),
        generatedAt: Date.now(),
      };

    } catch (error) {
      console.error('Daily quest generation error:', error);
      throw new Error(`Daily quest generation failed: ${error.message}`);
    }
  }

  /**
   * Update user learning pattern based on completed quests
   */
  async updateUserLearningPattern(
    userId: string,
    completedQuests: QuestHistory[]
  ): Promise<LearningPattern> {
    const recentHistory = completedQuests.filter(quest => {
      const questDate = new Date(quest.date);
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      return questDate >= cutoff;
    });

    const completedQuests30Days = recentHistory.filter(quest => quest.wasSuccessful);
    const totalQuests30Days = recentHistory.length;

    // Calculate completion rate
    const averageCompletionRate = totalQuests30Days > 0 
      ? completedQuests30Days.length / totalQuests30Days 
      : 0.5; // Default neutral value

    // Analyze best time slots (simplified heuristic)
    const timeSlotCounts = new Array(24).fill(0);
    const timeSlotSuccesses = new Array(24).fill(0);
    
    completedQuests30Days.forEach(quest => {
      if (quest.completedAt) {
        const hour = new Date(quest.completedAt).getHours();
        timeSlotCounts[hour]++;
        if (quest.wasSuccessful) {
          timeSlotSuccesses[hour]++;
        }
      }
    });

    const bestTimeSlots = timeSlotCounts
      .map((count, hour) => ({ hour, successRate: count > 0 ? timeSlotSuccesses[hour] / count : 0 }))
      .filter(slot => slot.successRate > 0.7)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
      .map(slot => slot.hour);

    // Calculate preferred difficulty
    const successfulDifficulties = completedQuests30Days
      .filter(quest => quest.wasSuccessful)
      .map(quest => quest.difficulty);
    
    const preferredDifficulty = successfulDifficulties.length > 0
      ? successfulDifficulties.reduce((sum, diff) => sum + diff, 0) / successfulDifficulties.length
      : 0.5;

    // Weekly trends analysis (simplified)
    const weeklyTrends: { [dayOfWeek: string]: number } = {
      Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0
    };

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyCounts = new Array(7).fill(0);
    const dailySuccesses = new Array(7).fill(0);

    recentHistory.forEach(quest => {
      const dayOfWeek = new Date(quest.date).getDay();
      dailyCounts[dayOfWeek]++;
      if (quest.wasSuccessful) {
        dailySuccesses[dayOfWeek]++;
      }
    });

    dayNames.forEach((dayName, index) => {
      weeklyTrends[dayName] = dailyCounts[index] > 0 
        ? dailySuccesses[index] / dailyCounts[index] 
        : 0.5;
    });

    // Identify improvement areas
    const improvementAreas = this.identifyImprovementAreas(recentHistory, averageCompletionRate);

    const updatedPattern: LearningPattern = {
      averageCompletionRate,
      bestTimeSlots: bestTimeSlots.length > 0 ? bestTimeSlots : [9, 14, 19], // Default peak hours
      preferredDifficulty: Math.max(0.2, Math.min(0.8, preferredDifficulty)), // Clamp between 0.2-0.8
      weeklyTrends,
      improvementAreas,
      lastAnalyzed: Date.now(),
    };

    // TODO: Save to database
    console.log('Updated learning pattern for user:', userId, updatedPattern);
    
    return updatedPattern;
  }

  /**
   * Get quests scheduled for a specific date
   */
  async getQuestsForDate(userId: string, date: string): Promise<Quest[] | null> {
    // TODO: Implement database retrieval
    // This would query Firestore for existing quests
    console.log('Getting quests for date:', userId, date);
    return null;
  }

  /**
   * Mark a quest as completed
   */
  async markQuestCompleted(
    userId: string,
    questId: string,
    completionData: {
      completedAt: number;
      actualMinutes: number;
      wasSuccessful: boolean;
      userRating?: 1 | 2 | 3 | 4 | 5;
    }
  ): Promise<void> {
    // TODO: Implement database update
    console.log('Marking quest completed:', userId, questId, completionData);
    
    // Trigger learning pattern update after completion
    // This would typically be done asynchronously
  }

  // Private helper methods

  private analyzeRecentPerformance(recentHistory: QuestHistory[]) {
    const last7Days = recentHistory.filter(quest => {
      const questDate = new Date(quest.date);
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return questDate >= cutoff;
    });

    const completionRate = last7Days.length > 0 
      ? last7Days.filter(q => q.wasSuccessful).length / last7Days.length 
      : 0.7; // Default optimistic value for new users

    const averageRating = last7Days
      .filter(q => q.userRating)
      .reduce((sum, q, _, arr) => sum + (q.userRating || 3), 0) / Math.max(last7Days.length, 1);

    return {
      completionRate,
      averageRating,
      totalQuests: last7Days.length,
      trend: this.calculateTrend(last7Days),
    };
  }

  private calculateTrend(history: QuestHistory[]): 'improving' | 'stable' | 'declining' {
    if (history.length < 4) return 'stable';
    
    const recent = history.slice(-3).filter(q => q.wasSuccessful).length;
    const previous = history.slice(-6, -3).filter(q => q.wasSuccessful).length;
    
    if (recent > previous) return 'improving';
    if (recent < previous) return 'declining';
    return 'stable';
  }

  private determineContextualAdjustments(
    targetDate: string,
    learningPatterns: LearningPattern,
    performance: any
  ) {
    const adjustments: string[] = [];
    let difficultyModifier = 0;
    let timeModifier = 1;

    // Performance-based adjustments
    if (performance.completionRate < 0.5) {
      adjustments.push('Reducing difficulty due to low completion rate');
      difficultyModifier -= 0.2;
    } else if (performance.completionRate > 0.8) {
      adjustments.push('Increasing difficulty due to high completion rate');
      difficultyModifier += 0.1;
    }

    // Day of week adjustments
    const dayOfWeek = new Date(targetDate).getDay();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[dayOfWeek];
    const dayPerformance = learningPatterns.weeklyTrends[dayName] || 0.5;

    if (dayPerformance < 0.4) {
      adjustments.push(`Reducing load for ${dayName} (historically challenging day)`);
      timeModifier *= 0.8;
    }

    // Trend-based adjustments
    if (performance.trend === 'declining') {
      adjustments.push('Providing easier quests to rebuild confidence');
      difficultyModifier -= 0.15;
    } else if (performance.trend === 'improving') {
      adjustments.push('Increasing challenge to maintain momentum');
      difficultyModifier += 0.1;
    }

    return {
      adjustmentReasons: adjustments,
      difficultyModifier,
      timeModifier,
    };
  }

  private calculateOptimalQuestConfig(
    userProfile: UserProfile,
    adjustments: any,
    performance: any
  ) {
    const baseTimeBudget = userProfile.goalData.time_budget_min_per_day;
    const adjustedTime = Math.round(baseTimeBudget * adjustments.timeModifier);
    
    // Determine quest count based on session preference and available time
    const sessionLength = userProfile.goalData.preferred_session_length_min;
    const questCount = Math.max(1, Math.min(5, Math.round(adjustedTime / sessionLength)));

    const baseDifficulty = userProfile.learningPatterns.preferredDifficulty;
    const adjustedDifficulty = Math.max(0.1, Math.min(0.9, 
      baseDifficulty + adjustments.difficultyModifier
    ));

    return {
      totalMinutes: adjustedTime,
      questCount,
      averageDifficulty: adjustedDifficulty,
      difficultyRange: [
        Math.max(0.1, adjustedDifficulty - 0.2),
        Math.min(0.9, adjustedDifficulty + 0.2),
      ] as [number, number],
    };
  }

  private getRecentPatterns(history: QuestHistory[], days: number): string[] {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return history
      .filter(quest => new Date(quest.date) >= cutoff)
      .map(quest => quest.pattern)
      .filter((pattern, index, arr) => arr.indexOf(pattern) === index); // Remove duplicates
  }

  private applyAdaptiveAdjustments(
    quests: Quest[],
    adjustments: any,
    performance: any
  ): Quest[] {
    return quests.map(quest => ({
      ...quest,
      // Apply difficulty adjustments
      difficulty: Math.max(0.1, Math.min(0.9, 
        quest.difficulty + adjustments.difficultyModifier
      )),
      // Adjust time if needed for very low performance
      minutes: performance.completionRate < 0.3 
        ? Math.round(quest.minutes * 0.8)
        : quest.minutes,
    }));
  }

  private buildGenerationReason(adjustments: any, performance: any): string {
    const reasons = ['Generated based on your learning profile and recent performance'];
    
    if (adjustments.adjustmentReasons.length > 0) {
      reasons.push(...adjustments.adjustmentReasons);
    }

    if (performance.totalQuests === 0) {
      reasons.push('Welcome! These are your first personalized quests.');
    }

    return reasons.join('. ');
  }

  private identifyImprovementAreas(
    history: QuestHistory[],
    completionRate: number
  ): string[] {
    const areas: string[] = [];

    if (completionRate < 0.5) {
      areas.push('Time management and task completion');
    }

    // Analyze failed patterns
    const failedPatterns = history
      .filter(quest => !quest.wasSuccessful)
      .map(quest => quest.pattern);

    const patternFailureCounts = failedPatterns.reduce((acc, pattern) => {
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(patternFailureCounts)
      .filter(([_, count]) => count >= 2)
      .forEach(([pattern, _]) => {
        areas.push(`${pattern} pattern mastery`);
      });

    if (areas.length === 0) {
      areas.push('Continued consistency and habit formation');
    }

    return areas.slice(0, 3); // Limit to top 3 areas
  }
}