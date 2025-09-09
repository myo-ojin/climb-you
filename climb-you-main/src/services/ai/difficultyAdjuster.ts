/**
 * Dynamic Difficulty Adjustment System
 * Automatically adjusts quest difficulty based on user performance and learning patterns
 */

import { LearningAnalyzer, DetailedLearningAnalysis } from './learningAnalyzer';
import { QuestHistory } from './dailyQuestService';
import { Quest } from '../../types/questGeneration';

export interface DifficultyAdjustmentResult {
  originalDifficulty: number;
  adjustedDifficulty: number;
  adjustmentReason: string;
  adjustmentType: 'increase' | 'decrease' | 'maintain';
  adjustmentMagnitude: 'minor' | 'moderate' | 'significant';
  confidence: number; // 0-1
  expectedImpact: string;
  rollbackTriggers: string[]; // Conditions under which to reverse this adjustment
}

export interface AdaptiveQuestModification {
  questId: string;
  originalQuest: Quest;
  modifiedQuest: Quest;
  modifications: QuestModification[];
  reasoning: string;
}

export interface QuestModification {
  type: 'difficulty' | 'time' | 'complexity' | 'support' | 'pattern';
  change: string;
  impact: string;
}

export interface DifficultyContext {
  timeOfDay: number; // 0-23
  dayOfWeek: string; // Mon-Sun
  consecutiveDays: number; // Days in current streak
  recentMoodIndicators: ('frustrated' | 'confident' | 'motivated' | 'tired' | 'focused')[];
  upcomingDeadlines: boolean;
  availableTime: number; // minutes
}

export class DifficultyAdjuster {
  private learningAnalyzer: LearningAnalyzer;
  private adjustmentHistory: Map<string, DifficultyAdjustmentResult[]> = new Map();

  constructor() {
    this.learningAnalyzer = new LearningAnalyzer();
  }

  /**
   * Analyze and adjust difficulty for upcoming quests
   */
  async adjustDifficultyForQuests(
    userId: string,
    upcomingQuests: Quest[],
    questHistory: QuestHistory[],
    context: DifficultyContext
  ): Promise<AdaptiveQuestModification[]> {
    try {
      // Get comprehensive learning analysis
      const analysis = await this.learningAnalyzer.analyzeLearningPatterns(
        userId,
        questHistory,
        30 // 30-day analysis window
      );

      const modifications: AdaptiveQuestModification[] = [];

      for (const quest of upcomingQuests) {
        const adjustmentResult = await this.calculateOptimalDifficulty(
          quest,
          analysis,
          questHistory,
          context
        );

        if (adjustmentResult.adjustmentType !== 'maintain') {
          const modifiedQuest = await this.applyDifficultyAdjustment(
            quest,
            adjustmentResult,
            context
          );

          const questModifications = this.generateQuestModifications(
            quest,
            modifiedQuest,
            adjustmentResult
          );

          modifications.push({
            questId: quest.title, // Using title as ID for now
            originalQuest: quest,
            modifiedQuest: modifiedQuest,
            modifications: questModifications,
            reasoning: adjustmentResult.adjustmentReason,
          });

          // Store adjustment history
          this.storeAdjustmentHistory(userId, adjustmentResult);
        }
      }

      return modifications;
    } catch (error) {
      console.error('Difficulty adjustment failed:', error);
      throw error;
    }
  }

  /**
   * Calculate optimal difficulty for a specific quest
   */
  private async calculateOptimalDifficulty(
    quest: Quest,
    analysis: DetailedLearningAnalysis,
    history: QuestHistory[],
    context: DifficultyContext
  ): Promise<DifficultyAdjustmentResult> {
    let adjustmentFactor = 0;
    let reasoning: string[] = [];
    let confidence = 0.7;

    // Analyze recent performance
    const recentQuests = history.slice(-7); // Last 7 quests
    const recentSuccessRate = recentQuests.filter(q => q.wasSuccessful).length / recentQuests.length;
    
    // Performance-based adjustments
    if (recentSuccessRate > 0.85) {
      adjustmentFactor += 0.15;
      reasoning.push('High recent success rate suggests readiness for increased challenge');
      confidence += 0.1;
    } else if (recentSuccessRate < 0.4) {
      adjustmentFactor -= 0.2;
      reasoning.push('Low success rate indicates need for easier content to rebuild confidence');
      confidence += 0.15;
    }

    // Pattern-specific adjustments
    const similarPatternQuests = history.filter(q => q.pattern === quest.pattern);
    if (similarPatternQuests.length > 0) {
      const patternSuccessRate = similarPatternQuests.filter(q => q.wasSuccessful).length / similarPatternQuests.length;
      if (patternSuccessRate > 0.8) {
        adjustmentFactor += 0.1;
        reasoning.push(`Strong performance with ${quest.pattern} pattern allows for increased difficulty`);
      } else if (patternSuccessRate < 0.5) {
        adjustmentFactor -= 0.15;
        reasoning.push(`Struggles with ${quest.pattern} pattern suggest easier approach needed`);
      }
      confidence += 0.1;
    }

    // Context-based adjustments
    if (context.consecutiveDays > 5) {
      adjustmentFactor -= 0.05;
      reasoning.push('Long streak suggests possible fatigue, slightly reducing difficulty');
    }

    if (context.availableTime < 20) {
      adjustmentFactor -= 0.1;
      reasoning.push('Limited time available, reducing complexity for better completion likelihood');
    }

    // Mood-based adjustments
    if (context.recentMoodIndicators.includes('frustrated')) {
      adjustmentFactor -= 0.15;
      reasoning.push('Recent frustration indicators suggest need for confidence-building content');
    } else if (context.recentMoodIndicators.includes('confident')) {
      adjustmentFactor += 0.1;
      reasoning.push('High confidence allows for additional challenge');
    }

    // Risk factor adjustments
    const highRiskFactors = analysis.riskFactors.filter(r => r.severity === 'high');
    if (highRiskFactors.length > 0) {
      adjustmentFactor -= 0.2;
      reasoning.push('High risk factors detected, prioritizing engagement over challenge');
    }

    // Apply plateau detection
    if (analysis.difficultyProgression.plateauRisk > 0.7) {
      adjustmentFactor += 0.1;
      reasoning.push('Plateau risk detected, introducing varied challenge to stimulate growth');
    }

    // Calculate final difficulty
    const originalDifficulty = quest.difficulty;
    const adjustedDifficulty = Math.max(0.1, Math.min(0.9, originalDifficulty + adjustmentFactor));
    
    // Determine adjustment type and magnitude
    const adjustmentType = this.determineAdjustmentType(originalDifficulty, adjustedDifficulty);
    const adjustmentMagnitude = this.determineAdjustmentMagnitude(Math.abs(adjustmentFactor));

    // Generate rollback triggers
    const rollbackTriggers = this.generateRollbackTriggers(adjustmentType, context);

    return {
      originalDifficulty,
      adjustedDifficulty,
      adjustmentReason: reasoning.join('. '),
      adjustmentType,
      adjustmentMagnitude,
      confidence: Math.min(0.95, confidence),
      expectedImpact: this.generateExpectedImpact(adjustmentType, adjustmentMagnitude),
      rollbackTriggers,
    };
  }

  /**
   * Apply difficulty adjustment to quest
   */
  private async applyDifficultyAdjustment(
    quest: Quest,
    adjustment: DifficultyAdjustmentResult,
    context: DifficultyContext
  ): Promise<Quest> {
    const modifiedQuest: Quest = { ...quest };
    
    // Primary adjustment: difficulty
    modifiedQuest.difficulty = adjustment.adjustedDifficulty;

    // Secondary adjustments based on difficulty change
    if (adjustment.adjustmentType === 'decrease') {
      // Make quest more approachable
      modifiedQuest.minutes = Math.max(10, Math.round(quest.minutes * 0.9));
      
      // Simplify success criteria
      if (quest.criteria.length > 2) {
        modifiedQuest.criteria = quest.criteria.slice(0, 2);
        modifiedQuest.criteria.push('基本的な理解を示すことができる');
      }

      // Add supportive elements
      if (!modifiedQuest.steps) {
        modifiedQuest.steps = [];
      }
      modifiedQuest.steps.unshift('まず基本概念を確認する');
      
    } else if (adjustment.adjustmentType === 'increase') {
      // Make quest more challenging
      modifiedQuest.minutes = Math.min(60, Math.round(quest.minutes * 1.1));
      
      // Add complexity to criteria
      modifiedQuest.criteria.push('応用的な理解を示すことができる');
      modifiedQuest.criteria.push('他の概念との関連を説明できる');

      // Add stretch goals
      modifiedQuest.tags = [...(quest.tags || []), 'challenge', 'advanced'];
    }

    // Context-specific adjustments
    if (context.availableTime < quest.minutes) {
      modifiedQuest.minutes = Math.round(context.availableTime * 0.8);
      modifiedQuest.deliverable = `${modifiedQuest.deliverable} (時間短縮版)`;
    }

    return modifiedQuest;
  }

  /**
   * Generate specific modifications made to the quest
   */
  private generateQuestModifications(
    original: Quest,
    modified: Quest,
    adjustment: DifficultyAdjustmentResult
  ): QuestModification[] {
    const modifications: QuestModification[] = [];

    if (original.difficulty !== modified.difficulty) {
      modifications.push({
        type: 'difficulty',
        change: `Difficulty adjusted from ${original.difficulty.toFixed(2)} to ${modified.difficulty.toFixed(2)}`,
        impact: adjustment.adjustmentType === 'increase' 
          ? 'More challenging content for growth' 
          : 'Easier content for confidence building',
      });
    }

    if (original.minutes !== modified.minutes) {
      modifications.push({
        type: 'time',
        change: `Time adjusted from ${original.minutes} to ${modified.minutes} minutes`,
        impact: modified.minutes > original.minutes 
          ? 'More time for thorough learning' 
          : 'Shorter session for better focus',
      });
    }

    if (original.criteria.length !== modified.criteria.length) {
      modifications.push({
        type: 'complexity',
        change: `Success criteria ${modified.criteria.length > original.criteria.length ? 'expanded' : 'simplified'}`,
        impact: modified.criteria.length > original.criteria.length 
          ? 'Higher standards for mastery' 
          : 'Clear, achievable goals',
      });
    }

    if (original.steps?.length !== modified.steps?.length) {
      modifications.push({
        type: 'support',
        change: 'Guidance steps modified',
        impact: 'Better scaffolding for success',
      });
    }

    return modifications;
  }

  /**
   * Monitor performance and trigger rollbacks if needed
   */
  async monitorAndAdjust(
    userId: string,
    recentCompletions: QuestHistory[]
  ): Promise<{
    triggeredRollbacks: string[];
    newAdjustments: DifficultyAdjustmentResult[];
    recommendations: string[];
  }> {
    const userHistory = this.adjustmentHistory.get(userId) || [];
    const triggeredRollbacks: string[] = [];
    const newAdjustments: DifficultyAdjustmentResult[] = [];
    const recommendations: string[] = [];

    // Check recent adjustments for rollback triggers
    const recentAdjustments = userHistory.slice(-5); // Last 5 adjustments
    
    for (const adjustment of recentAdjustments) {
      if (this.shouldTriggerRollback(adjustment, recentCompletions)) {
        triggeredRollbacks.push(adjustment.adjustmentReason);
        
        // Create reverse adjustment
        const rollbackAdjustment: DifficultyAdjustmentResult = {
          originalDifficulty: adjustment.adjustedDifficulty,
          adjustedDifficulty: adjustment.originalDifficulty,
          adjustmentReason: `Rollback: ${adjustment.adjustmentReason}`,
          adjustmentType: adjustment.adjustmentType === 'increase' ? 'decrease' : 'increase',
          adjustmentMagnitude: adjustment.adjustmentMagnitude,
          confidence: 0.8,
          expectedImpact: 'Reverting previous adjustment due to poor performance',
          rollbackTriggers: [],
        };
        
        newAdjustments.push(rollbackAdjustment);
      }
    }

    // Generate proactive recommendations
    if (recentCompletions.length > 0) {
      const recentSuccessRate = recentCompletions.filter(q => q.wasSuccessful).length / recentCompletions.length;
      
      if (recentSuccessRate < 0.3) {
        recommendations.push('Consider taking a break or focusing on review content');
        recommendations.push('Difficulty may need significant reduction');
      } else if (recentSuccessRate > 0.9) {
        recommendations.push('Ready for increased challenge and complexity');
        recommendations.push('Consider introducing new learning patterns');
      }
    }

    return {
      triggeredRollbacks,
      newAdjustments,
      recommendations,
    };
  }

  // Private helper methods

  private determineAdjustmentType(original: number, adjusted: number): 'increase' | 'decrease' | 'maintain' {
    const difference = adjusted - original;
    if (Math.abs(difference) < 0.05) return 'maintain';
    return difference > 0 ? 'increase' : 'decrease';
  }

  private determineAdjustmentMagnitude(adjustmentFactor: number): 'minor' | 'moderate' | 'significant' {
    if (adjustmentFactor < 0.1) return 'minor';
    if (adjustmentFactor < 0.2) return 'moderate';
    return 'significant';
  }

  private generateExpectedImpact(type: 'increase' | 'decrease' | 'maintain', magnitude: 'minor' | 'moderate' | 'significant'): string {
    if (type === 'maintain') return 'No significant change in challenge level';
    
    const intensityMap = {
      minor: type === 'increase' ? 'Slightly more engaging' : 'Slightly less overwhelming',
      moderate: type === 'increase' ? 'Noticeably more challenging' : 'More manageable and achievable',
      significant: type === 'increase' ? 'Substantially more demanding' : 'Much easier and confidence-building',
    };

    return intensityMap[magnitude];
  }

  private generateRollbackTriggers(type: 'increase' | 'decrease' | 'maintain', context: DifficultyContext): string[] {
    const triggers: string[] = [];
    
    if (type === 'increase') {
      triggers.push('Success rate drops below 40% over next 3 quests');
      triggers.push('User ratings consistently below 3/5');
      triggers.push('Completion time increases significantly');
    } else if (type === 'decrease') {
      triggers.push('Success rate exceeds 90% over next 5 quests');
      triggers.push('User ratings consistently above 4/5');
      triggers.push('Completion time significantly faster than expected');
    }

    triggers.push('User explicitly requests difficulty change');
    
    return triggers;
  }

  private shouldTriggerRollback(adjustment: DifficultyAdjustmentResult, recentCompletions: QuestHistory[]): boolean {
    if (recentCompletions.length < 3) return false; // Need sufficient data
    
    const recentSuccessRate = recentCompletions.filter(q => q.wasSuccessful).length / recentCompletions.length;
    const recentRatings = recentCompletions.filter(q => q.userRating).map(q => q.userRating!);
    const avgRating = recentRatings.length > 0 ? recentRatings.reduce((sum, rating) => sum + rating, 0) / recentRatings.length : 3;

    // Check rollback triggers
    if (adjustment.adjustmentType === 'increase') {
      return recentSuccessRate < 0.4 || avgRating < 3;
    } else if (adjustment.adjustmentType === 'decrease') {
      return recentSuccessRate > 0.9 || avgRating > 4;
    }

    return false;
  }

  private storeAdjustmentHistory(userId: string, adjustment: DifficultyAdjustmentResult): void {
    if (!this.adjustmentHistory.has(userId)) {
      this.adjustmentHistory.set(userId, []);
    }
    
    const userHistory = this.adjustmentHistory.get(userId)!;
    userHistory.push({
      ...adjustment,
      // Add timestamp for tracking
    });
    
    // Keep only last 20 adjustments
    if (userHistory.length > 20) {
      userHistory.splice(0, userHistory.length - 20);
    }
  }

  /**
   * Get adjustment statistics for a user
   */
  getAdjustmentStats(userId: string): {
    totalAdjustments: number;
    increaseCount: number;
    decreaseCount: number;
    averageConfidence: number;
    rollbackRate: number;
  } {
    const userHistory = this.adjustmentHistory.get(userId) || [];
    
    const totalAdjustments = userHistory.length;
    const increaseCount = userHistory.filter(adj => adj.adjustmentType === 'increase').length;
    const decreaseCount = userHistory.filter(adj => adj.adjustmentType === 'decrease').length;
    const averageConfidence = userHistory.length > 0 
      ? userHistory.reduce((sum, adj) => sum + adj.confidence, 0) / userHistory.length 
      : 0;
    
    const rollbacks = userHistory.filter(adj => adj.adjustmentReason.startsWith('Rollback:')).length;
    const rollbackRate = totalAdjustments > 0 ? rollbacks / totalAdjustments : 0;

    return {
      totalAdjustments,
      increaseCount,
      decreaseCount,
      averageConfidence,
      rollbackRate,
    };
  }
}