/**
 * Onboarding Orchestration Service - Pre-Goal Analysis Integration
 * 
 * This service orchestrates the complete onboarding flow with Pre-Goal Analysis integration.
 * Triggered after OnboardingForm completion (goal input → Next button flow).
 */

import { PreGoalAnalysisService, PreGoalAnalysisResult } from './preGoalAnalysisService';
import { ProfileQuestionEngine } from './profileQuestionEngine';
import { MilestoneEngine } from './milestoneEngine';
import { enhancedQuestService } from './enhancedQuestService';
import { z } from 'zod';

// Onboarding data from OnboardingForm
interface OnboardingInputs {
  goal_text: string;
  goal_category: 'learning' | 'career' | 'health' | 'skill' | 'creative' | 'other';
  goal_deadline: string;
  goal_importance: 1 | 2 | 3 | 4 | 5;
  goal_motivation: 'low' | 'mid' | 'high';
  time_budget_min_per_day: number;
  preferred_session_length_min: number;
  env_constraints: string[];
  modality_preference: ('dialog' | 'read' | 'audio' | 'video')[];
  avoid_modality: ('dialog' | 'read' | 'audio' | 'video')[];
}

// Complete onboarding analysis result
interface OnboardingAnalysisResult {
  preGoalAnalysis: PreGoalAnalysisResult;
  enhancedProfileQuestions: {
    questions: any[];
    skipped: any[];
    rationale: string[];
    preGoalHints: any[];
  };
  initialMilestones: {
    milestones: {
      Now: any[];
      Next: any[];
      Later: any[];
    };
    rationale: string[];
    preGoalAnalysis: PreGoalAnalysisResult;
  };
  firstDayQuests: {
    quests: any[];
    rationale: string[];
    guarantees: any;
    preGoalSeeds: any[];
  };
  onboardingMetadata: {
    processingTime: number;
    aiCallsCount: number;
    confidence: {
      goal_analysis: number;
      profile_questions: number;
      milestones: number;
      quests: number;
    };
  };
}

export class OnboardingOrchestrationService {
  /**
   * Execute complete Pre-Goal Analysis enhanced onboarding flow
   */
  static async executeEnhancedOnboarding(
    inputs: OnboardingInputs
  ): Promise<OnboardingAnalysisResult> {
    const startTime = new Date().getTime();
    let aiCallsCount = 0;
    
    console.log('🚀 Starting enhanced onboarding orchestration...');
    
    try {
      // Step 1: Execute Pre-Goal Analysis (as specified in plan)
      console.log('🎯 Step 1: Executing Pre-Goal Analysis...');
      const preGoalAnalysis = await PreGoalAnalysisService.analyze(
        inputs.goal_text,
        this.mapGoalDeadlineToTimeframe(inputs.goal_deadline),
        this.buildKnownProfileFromInputs(inputs)
      );
      aiCallsCount++;
      
      console.log('✅ Pre-Goal Analysis completed:', {
        domain: preGoalAnalysis.classification.domain,
        complexity: preGoalAnalysis.classification.complexity,
        prerequisites: preGoalAnalysis.prerequisites.length,
        questionHints: preGoalAnalysis.question_hints.length
      });
      
      // Step 2: Generate enhanced profile questions using Pre-Goal hints
      console.log('🎯 Step 2: Generating enhanced profile questions...');
      const knownProfile = this.buildKnownProfileFromInputs(inputs);
      const enhancedProfileQuestions = await ProfileQuestionEngine.generateEnhancedQuestionPlan(
        inputs.goal_text,
        knownProfile,
        preGoalAnalysis,
        { maxQuestions: 5, allowRefine: true, scoreThreshold: 0.25 }
      );
      aiCallsCount++;
      
      console.log('✅ Enhanced profile questions generated:', {
        questionCount: enhancedProfileQuestions.questions.length,
        skippedCount: enhancedProfileQuestions.skipped.length,
        preGoalHints: enhancedProfileQuestions.preGoalHints.length
      });
      
      // Step 3: Generate initial milestones with Pre-Goal integration
      console.log('🎯 Step 3: Generating initial milestones...');
      const milestoneInput = this.buildMilestoneInputFromOnboarding(inputs, preGoalAnalysis);
      const initialMilestones = await MilestoneEngine.generateEnhancedMilestonePlan(
        milestoneInput,
        preGoalAnalysis,
        knownProfile
      );
      aiCallsCount++;
      
      console.log('✅ Initial milestones generated:', {
        totalMilestones: initialMilestones.milestones.Now.length + 
                        initialMilestones.milestones.Next.length + 
                        initialMilestones.milestones.Later.length,
        domain: preGoalAnalysis.classification.domain
      });
      
      // Step 4: Generate first-day quests using Pre-Goal seeds
      console.log('🎯 Step 4: Generating first-day quests...');
      const firstDayQuests = await enhancedQuestService.generateEnhancedOneDayQuests({
        goalText: inputs.goal_text,
        profile: this.buildProfileV1FromInputs(inputs),
        preGoalAnalysis,
        checkins: { day_type: 'normal' }, // Default for first day
        skillAtoms: [] // Will be generated internally
      });
      aiCallsCount++;
      
      console.log('✅ First-day quests generated:', {
        questCount: firstDayQuests.quests.length,
        totalTime: firstDayQuests.guarantees.totalTime,
        preGoalSeeds: firstDayQuests.preGoalSeeds.length
      });
      
      // Step 5: Calculate confidence scores
      const confidence = this.calculateConfidenceScores(
        preGoalAnalysis,
        enhancedProfileQuestions,
        initialMilestones,
        firstDayQuests
      );
      
      const processingTime = new Date().getTime() - startTime;
      
      console.log('🎉 Enhanced onboarding orchestration completed in', processingTime, 'ms');
      
      return {
        preGoalAnalysis,
        enhancedProfileQuestions,
        initialMilestones,
        firstDayQuests,
        onboardingMetadata: {
          processingTime,
          aiCallsCount,
          confidence
        }
      };
      
    } catch (error) {
      console.error('❌ Enhanced onboarding orchestration failed:', error);
      
      // Fallback: Return basic analysis with error indicators
      const processingTime = new Date().getTime() - startTime;
      
      return {
        preGoalAnalysis: await this.generateFallbackPreGoalAnalysis(inputs),
        enhancedProfileQuestions: this.generateFallbackProfileQuestions(inputs),
        initialMilestones: this.generateFallbackMilestones(inputs),
        firstDayQuests: this.generateFallbackQuests(inputs),
        onboardingMetadata: {
          processingTime,
          aiCallsCount,
          confidence: { goal_analysis: 0.5, profile_questions: 0.5, milestones: 0.5, quests: 0.5 }
        }
      };
    }
  }

  /**
   * Build known profile from onboarding inputs
   */
  private static buildKnownProfileFromInputs(inputs: OnboardingInputs): { 
    fields: Record<string, any>; 
    confidence: Record<string, number>; 
  } {
    return {
      fields: {
        goal_category: inputs.goal_category,
        goal_importance: inputs.goal_importance,
        goal_motivation: inputs.goal_motivation,
        time_budget_min_per_day: inputs.time_budget_min_per_day,
        preferred_session_length_min: inputs.preferred_session_length_min,
        weekly_hours: Math.round(inputs.time_budget_min_per_day * 7 / 60), // Convert to hours per week
        env_constraints: inputs.env_constraints,
        modality_preference: inputs.modality_preference,
        avoid_modality: inputs.avoid_modality,
        resources: [], // To be filled by profile questions
        constraints: inputs.env_constraints
      },
      confidence: {
        goal_category: 0.95,
        goal_importance: 0.9,
        goal_motivation: 0.85,
        time_budget_min_per_day: 0.9,
        preferred_session_length_min: 0.8,
        weekly_hours: 0.85,
        env_constraints: 0.7,
        modality_preference: 0.8,
        avoid_modality: 0.8,
        resources: 0.0,
        constraints: 0.7
      }
    };
  }

  /**
   * Map goal deadline to timeframe hint for Pre-Goal Analysis
   */
  private static mapGoalDeadlineToTimeframe(deadline: string): string {
    const deadlineMapping: Record<string, string> = {
      '1m': '1m',
      '3m': '3m', 
      '6m': '6m',
      '12m+': '12m+',
      'custom': '6m' // Default fallback
    };
    
    return deadlineMapping[deadline] || '6m';
  }

  /**
   * Build milestone input from onboarding data
   */
  private static buildMilestoneInputFromOnboarding(
    inputs: OnboardingInputs, 
    preGoalAnalysis: PreGoalAnalysisResult
  ): any {
    return {
      goal_text: preGoalAnalysis.normalized_goal,
      category: this.mapGoalCategoryToMilestone(inputs.goal_category),
      outcome_metric: {
        name: preGoalAnalysis.outcome_metric.name,
        target: preGoalAnalysis.outcome_metric.target.toString()
      },
      weekly_hours: Math.round(inputs.time_budget_min_per_day * 7 / 60),
      resources: [],
      constraints: inputs.env_constraints,
      horizon_weeks: preGoalAnalysis.classification.horizon_weeks
    };
  }

  /**
   * Map goal category to milestone category
   */
  private static mapGoalCategoryToMilestone(goalCategory: string): string {
    const mapping: Record<string, string> = {
      'learning': 'learning',
      'career': 'career', 
      'health': 'health',
      'skill': 'skill',
      'creative': 'creative',
      'other': 'other'
    };
    return mapping[goalCategory] || 'other';
  }

  /**
   * Build ProfileV1 from onboarding inputs
   */
  private static buildProfileV1FromInputs(inputs: OnboardingInputs): any {
    return {
      goal_text: inputs.goal_text,
      time_budget_min_per_day: inputs.time_budget_min_per_day,
      goal_category: inputs.goal_category,
      goal_motivation: inputs.goal_motivation,
      learning_pace: inputs.goal_motivation === 'high' ? 'fast' : 
                     inputs.goal_motivation === 'low' ? 'slow' : 'medium',
      preferred_session_length_min: inputs.preferred_session_length_min,
      env_constraints: inputs.env_constraints,
      modality_preference: inputs.modality_preference,
      avoid_modality: inputs.avoid_modality
    };
  }

  /**
   * Calculate confidence scores for each component
   */
  private static calculateConfidenceScores(
    preGoalAnalysis: PreGoalAnalysisResult,
    profileQuestions: any,
    milestones: any,
    quests: any
  ): { goal_analysis: number; profile_questions: number; milestones: number; quests: number; } {
    return {
      goal_analysis: (preGoalAnalysis.confidence.classification + 
                      preGoalAnalysis.confidence.outcome_metric + 
                      preGoalAnalysis.confidence.backcast) / 3,
      profile_questions: profileQuestions.questions.length > 0 ? 0.85 : 0.5,
      milestones: milestones.milestones.Now.length + 
                  milestones.milestones.Next.length + 
                  milestones.milestones.Later.length > 0 ? 0.8 : 0.5,
      quests: quests.guarantees.completionRate || 0.75
    };
  }

  // ========== Fallback Methods ==========

  /**
   * Generate fallback Pre-Goal Analysis if AI fails
   */
  private static async generateFallbackPreGoalAnalysis(inputs: OnboardingInputs): Promise<PreGoalAnalysisResult> {
    return PreGoalAnalysisService.generateFallback(
      inputs.goal_text,
      this.mapGoalDeadlineToTimeframe(inputs.goal_deadline),
      this.buildKnownProfileFromInputs(inputs)
    );
  }

  /**
   * Generate fallback profile questions
   */
  private static generateFallbackProfileQuestions(inputs: OnboardingInputs): any {
    return {
      questions: [
        { id: 'fallback_1', question: '学習スタイルについて教えてください', category: 'learning_style' },
        { id: 'fallback_2', question: '時間管理について教えてください', category: 'time_management' }
      ],
      skipped: [],
      rationale: ['AI生成失敗によるフォールバック質問'],
      preGoalHints: []
    };
  }

  /**
   * Generate fallback milestones
   */
  private static generateFallbackMilestones(inputs: OnboardingInputs): any {
    return {
      milestones: {
        Now: [{ title: '基礎準備', description: '目標達成に向けた基礎準備' }],
        Next: [{ title: '実践開始', description: '本格的な実践を開始' }],
        Later: [{ title: '目標達成', description: '設定した目標を達成' }]
      },
      rationale: ['AI生成失敗によるフォールバックマイルストーン'],
      preGoalAnalysis: null
    };
  }

  /**
   * Generate fallback quests
   */
  private static generateFallbackQuests(inputs: OnboardingInputs): any {
    return {
      quests: [
        {
          title: '目標の詳細化',
          pattern: 'read_note_q',
          minutes: Math.min(inputs.preferred_session_length_min, 30),
          difficulty: 0.3,
          deliverable: '目標の詳細メモ',
          steps: ['目標を詳しく考える', '具体的な内容を書き出す', '達成方法を検討'],
          tags: [inputs.goal_category, 'planning'],
          done_definition: '目標の詳細が明確になった状態',
          evidence: ['詳細メモ'],
          alt_plan: '15分で基本的な内容のみ整理',
          stop_rule: `${Math.min(inputs.preferred_session_length_min, 30)}分経過で終了`
        }
      ],
      rationale: ['AI生成失敗によるフォールバッククエスト'],
      guarantees: { questCount: 1, totalTime: Math.min(inputs.preferred_session_length_min, 30), completionRate: 0.8 },
      preGoalSeeds: []
    };
  }

  /**
   * Validate onboarding analysis result
   */
  static validateOnboardingResult(result: OnboardingAnalysisResult): {
    isValid: boolean;
    issues: string[];
    metrics: {
      completeness: number;
      confidence_avg: number;
      processing_efficiency: number;
    };
  } {
    const issues: string[] = [];
    
    // Check completeness
    let completenessCount = 0;
    if (result.preGoalAnalysis && result.preGoalAnalysis.normalized_goal) completenessCount++;
    if (result.enhancedProfileQuestions.questions.length > 0) completenessCount++;
    if (result.initialMilestones.milestones.Now.length > 0) completenessCount++;
    if (result.firstDayQuests.quests.length > 0) completenessCount++;
    
    const completeness = completenessCount / 4;
    if (completeness < 0.75) {
      issues.push(`Onboarding completeness too low: ${(completeness * 100).toFixed(0)}% < 75%`);
    }
    
    // Check confidence levels
    const avgConfidence = Object.values(result.onboardingMetadata.confidence)
      .reduce((sum, conf) => sum + conf, 0) / 4;
    if (avgConfidence < 0.7) {
      issues.push(`Average confidence too low: ${avgConfidence.toFixed(2)} < 0.7`);
    }
    
    // Check processing efficiency (should complete within reasonable time)
    const processingEfficiency = result.onboardingMetadata.processingTime < 15000 ? 1.0 : 
                                15000 / result.onboardingMetadata.processingTime;
    if (processingEfficiency < 0.5) {
      issues.push(`Processing too slow: ${result.onboardingMetadata.processingTime}ms > 30s`);
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      metrics: {
        completeness,
        confidence_avg: avgConfidence,
        processing_efficiency: processingEfficiency
      }
    };
  }
}