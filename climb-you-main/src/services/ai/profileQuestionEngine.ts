import { z } from 'zod';
import { questionBank, getApplicableQuestions, QuestionBankItem } from './questionBank';
import { ProfileQuestionPlanSchema } from './promptEngine';
import { PreGoalAnalysisService, PreGoalAnalysisResult, PreGoalQuestionHint } from './preGoalAnalysisService';

interface KnownProfile {
  fields: Record<string, any>;
  confidence: Record<string, number>;
}

interface QuestionBudget {
  max_questions: number;
  allow_refine: boolean;
  used: number;
  remaining: number;
}

interface ScoredQuestion extends QuestionBankItem {
  score: number;
  relevance: number;
  info_gain: number;
  fatigue: number;
}

interface QuestionPlan {
  questions: QuestionBankItem[];
  skipped: Array<{ question: QuestionBankItem; reason: string; score: number }>;
  budget: QuestionBudget;
  rationale: string[];
}

/**
 * Profile Question Engine - Maximizes information gain while minimizing user fatigue
 * 
 * Core algorithm: score = relevance * info_gain - 0.5 * fatigue
 * Ask only if score >= 0.25
 * 
 * Features:
 * - Information gain scoring with fatigue consideration
 * - Confirmation mode for known information (confidence >= 0.7)
 * - Budgeted flow (5 initial + 3 optional refine questions)
 * - Goal taxonomy routing via applicable_when rules
 */
export class ProfileQuestionEngine {
  
  /**
   * Pre-Goal Analysis統合版: question hintsを活用した高精度質問生成
   */
  static async generateEnhancedQuestionPlan(
    goalText: string,
    knownProfile: KnownProfile,
    preGoalAnalysis: PreGoalAnalysisResult,
    options: {
      maxQuestions?: number;
      allowRefine?: boolean;
      scoreThreshold?: number;
    } = {}
  ): Promise<QuestionPlan & { preGoalHints: PreGoalQuestionHint[] }> {
    const {
      maxQuestions = 5,
      allowRefine = true,
      scoreThreshold = 0.25,
    } = options;

    console.log('🎯 Generating enhanced question plan with pre-goal analysis integration');

    // Step 1: Pre-Goal Analysisのquestion_hintsを優先活用
    const preGoalHints = preGoalAnalysis.question_hints;
    const priorityQuestions: QuestionBankItem[] = [];
    
    for (const hint of preGoalHints) {
      const matchingQuestions = questionBank.filter(q => 
        q.profile_field === hint.dataKey || 
        q.question.includes(hint.question.slice(0, 10)) // 部分一致
      );
      
      if (matchingQuestions.length > 0) {
        // 情報ゲイン推定値でスコア調整
        const enhancedQuestion = {
          ...matchingQuestions[0],
          info_gain_hint: hint.info_gain_est
        };
        priorityQuestions.push(enhancedQuestion);
      }
    }

    console.log(`📋 Found ${priorityQuestions.length} priority questions from pre-goal hints`);

    // Step 2: 通常の質問選択プロセス（Pre-Goal優先度で調整）
    const budget: QuestionBudget = {
      max_questions: maxQuestions,
      allow_refine: allowRefine,
      used: 0,
      remaining: maxQuestions,
    };

    const rationale: string[] = [];
    const skipped: Array<{ question: QuestionBankItem; reason: string; score: number }> = [];

    // 利用可能な質問を取得（Pre-Goal分析の分類も考慮）
    const applicableQuestions = getApplicableQuestions(
      {
        ...knownProfile.fields,
        goal_domain: preGoalAnalysis.classification.domain,
        learning_type: preGoalAnalysis.classification.learning_type
      },
      goalText
    );

    rationale.push(`Found ${applicableQuestions.length} applicable questions for enhanced analysis`);

    // Step 3: Pre-Goal hintsで強化されたスコアリング
    const scoredQuestions = applicableQuestions.map(question => {
      const baseScore = this.scoreQuestion(question, knownProfile, goalText);
      
      // Pre-Goal hintsでのブースト
      const hintMatch = preGoalHints.find(hint => 
        question.profile_field === hint.dataKey
      );
      
      if (hintMatch) {
        baseScore.score += hintMatch.info_gain_est * 0.3; // 30%ブースト
        baseScore.info_gain = Math.max(baseScore.info_gain, hintMatch.info_gain_est);
      }

      return baseScore;
    });

    // Step 4: 質問選択（Pre-Goal優先度込み）
    const selectedQuestions: QuestionBankItem[] = [];
    scoredQuestions.sort((a, b) => b.score - a.score);

    for (const scoredQ of scoredQuestions) {
      if (budget.remaining <= 0) {
        skipped.push({
          question: scoredQ,
          reason: 'Budget exceeded',
          score: scoredQ.score,
        });
        continue;
      }

      if (scoredQ.score < scoreThreshold) {
        skipped.push({
          question: scoredQ,
          reason: `Score too low (${scoredQ.score.toFixed(2)} < ${scoreThreshold})`,
          score: scoredQ.score,
        });
        continue;
      }

      // Pre-Goal hintからの質問は確認モード優先
      const isPreGoalHint = preGoalHints.some(hint => 
        scoredQ.profile_field === hint.dataKey
      );

      const confidence = knownProfile.confidence[scoredQ.profile_field] || 0;
      if (confidence >= 0.7 || isPreGoalHint) {
        const confirmQuestion: QuestionBankItem = {
          ...scoredQ,
          type: 'confirm',
          question: `${scoredQ.profile_field}について「${knownProfile.fields[scoredQ.profile_field] || 'この内容'}」で正しいですか？`,
        };
        selectedQuestions.push(confirmQuestion);
        rationale.push(`Pre-Goal hint enhanced: ${scoredQ.profile_field} (confidence: ${confidence.toFixed(2)})`);
      } else {
        selectedQuestions.push(scoredQ);
        rationale.push(`Selected: ${scoredQ.id} (enhanced score: ${scoredQ.score.toFixed(2)})`);
      }

      budget.used++;
      budget.remaining--;
    }

    // Step 5: Pre-Goal分析の分類情報を活用した質問順序最適化
    const reorderedQuestions = this.optimizeQuestionOrder(selectedQuestions, preGoalAnalysis);
    rationale.push(`Optimized order based on ${preGoalAnalysis.classification.domain} domain`);

    return {
      questions: reorderedQuestions,
      skipped,
      budget,
      rationale,
      preGoalHints
    };
  }

  /**
   * Generate optimized question plan based on goal and known profile (Legacy method)
   */
  static async generateQuestionPlan(
    goalText: string,
    knownProfile: KnownProfile,
    options: {
      maxQuestions?: number;
      allowRefine?: boolean;
      scoreThreshold?: number;
    } = {}
  ): Promise<QuestionPlan> {
    const {
      maxQuestions = 5,
      allowRefine = true,
      scoreThreshold = 0.25,
    } = options;

    const budget: QuestionBudget = {
      max_questions: maxQuestions,
      allow_refine: allowRefine,
      used: 0,
      remaining: maxQuestions,
    };

    const rationale: string[] = [];
    const skipped: Array<{ question: QuestionBankItem; reason: string; score: number }> = [];

    // Step 1: Get applicable questions based on goal and profile
    const applicableQuestions = getApplicableQuestions(knownProfile.fields, goalText);
    rationale.push(`Found ${applicableQuestions.length} applicable questions for goal analysis`);

    // Step 2: Score each question
    const scoredQuestions = applicableQuestions.map(question => 
      this.scoreQuestion(question, knownProfile, goalText)
    );

    // Step 3: Apply gating rules and select questions
    const selectedQuestions: QuestionBankItem[] = [];

    // Sort by score descending
    scoredQuestions.sort((a, b) => b.score - a.score);

    for (const scoredQ of scoredQuestions) {
      if (budget.remaining <= 0) {
        skipped.push({
          question: scoredQ,
          reason: 'Budget exceeded',
          score: scoredQ.score,
        });
        continue;
      }

      // Core gating rule: score >= threshold
      if (scoredQ.score < scoreThreshold) {
        skipped.push({
          question: scoredQ,
          reason: `Score too low (${scoredQ.score.toFixed(2)} < ${scoreThreshold})`,
          score: scoredQ.score,
        });
        continue;
      }

      // Confirmation mode for high-confidence known info
      const confidence = knownProfile.confidence[scoredQ.profile_field] || 0;
      if (confidence >= 0.7) {
        // Convert to confirmation question
        const confirmQuestion: QuestionBankItem = {
          ...scoredQ,
          type: 'confirm',
          question: `${scoredQ.profile_field}は「${knownProfile.fields[scoredQ.profile_field]}」で正しいですか？`,
        };
        selectedQuestions.push(confirmQuestion);
        rationale.push(`Converted to confirmation: ${scoredQ.profile_field} (confidence: ${confidence.toFixed(2)})`);
      } else {
        selectedQuestions.push(scoredQ);
        rationale.push(`Selected: ${scoredQ.id} (score: ${scoredQ.score.toFixed(2)})`);
      }

      budget.used++;
      budget.remaining--;
    }

    // Step 4: Stage-based question selection (MCQ first, then freeform)
    const reorderedQuestions = this.reorderByStages(selectedQuestions);
    rationale.push(`Reordered questions: ${reorderedQuestions.map(q => q.type).join(' -> ')}`);

    return {
      questions: reorderedQuestions,
      skipped,
      budget,
      rationale,
    };
  }

  /**
   * Score a question based on relevance, information gain, and fatigue
   */
  private static scoreQuestion(
    question: QuestionBankItem,
    knownProfile: KnownProfile,
    goalText: string
  ): ScoredQuestion {
    // Calculate relevance (0-1) based on goal text and category
    const relevance = this.calculateRelevance(question, goalText);
    
    // Calculate information gain (0-1) based on current knowledge
    const info_gain = this.calculateInfoGain(question, knownProfile);
    
    // Use question's fatigue weight
    const fatigue = question.fatigue_weight;
    
    // Core scoring formula: score = relevance * info_gain - 0.5 * fatigue
    const score = relevance * info_gain - 0.5 * fatigue;

    return {
      ...question,
      score,
      relevance,
      info_gain,
      fatigue,
    };
  }

  /**
   * Calculate relevance of question to the goal (0-1)
   */
  private static calculateRelevance(question: QuestionBankItem, goalText: string): number {
    const goalLower = goalText.toLowerCase();
    let relevance = 0.5; // Base relevance

    // Category-based relevance
    const categoryRelevance: Record<string, number> = {
      'goal_specifics': 0.9,
      'time_management': 0.8,
      'learning_style': 0.7,
      'constraints': 0.8,
      'motivation': 0.6,
      'experience': 0.7,
    };

    relevance = categoryRelevance[question.category] || 0.5;

    // Goal content analysis
    if (goalLower.includes('学習') || goalLower.includes('勉強')) {
      if (question.category === 'learning_style') relevance += 0.1;
    }

    if (goalLower.includes('時間') || goalLower.includes('忙しい')) {
      if (question.category === 'time_management') relevance += 0.15;
    }

    if (goalLower.includes('難しい') || goalLower.includes('制約')) {
      if (question.category === 'constraints') relevance += 0.15;
    }

    if (goalLower.includes('初心者') || goalLower.includes('経験')) {
      if (question.category === 'experience') relevance += 0.1;
    }

    return Math.min(1.0, relevance);
  }

  /**
   * Calculate information gain from asking this question (0-1)
   */
  private static calculateInfoGain(question: QuestionBankItem, knownProfile: KnownProfile): number {
    const fieldValue = knownProfile.fields[question.profile_field];
    const confidence = knownProfile.confidence[question.profile_field] || 0;

    // If we don't know this field at all, high info gain
    if (!fieldValue) {
      return question.info_gain_hint;
    }

    // If we know it with high confidence, low info gain
    if (confidence >= 0.8) {
      return 0.1;
    }

    // If we know it with medium confidence, medium info gain
    if (confidence >= 0.5) {
      return 0.4;
    }

    // If we know it with low confidence, high info gain
    return 0.8;
  }

  /**
   * Optimize question order based on Pre-Goal Analysis classification
   */
  private static optimizeQuestionOrder(questions: QuestionBankItem[], preGoalAnalysis: PreGoalAnalysisResult): QuestionBankItem[] {
    const domain = preGoalAnalysis.classification.domain;
    const complexity = preGoalAnalysis.classification.complexity;
    
    // Domain-specific question priority mapping
    const domainPriorities: Record<string, string[]> = {
      'programming': ['learning_style', 'time_management', 'goal_specifics', 'experience'],
      'language': ['goal_specifics', 'learning_style', 'time_management', 'motivation'],
      'business': ['goal_specifics', 'experience', 'time_management', 'constraints'],
      'creative': ['motivation', 'learning_style', 'goal_specifics', 'time_management'],
      'academic': ['goal_specifics', 'time_management', 'learning_style', 'experience'],
      'fitness': ['goal_specifics', 'constraints', 'time_management', 'motivation'],
      'general': ['goal_specifics', 'time_management', 'learning_style', 'motivation']
    };

    // Complexity-based ordering adjustments
    const complexityAdjustments: Record<string, string[]> = {
      'beginner': ['motivation', 'learning_style', 'goal_specifics'],
      'intermediate': ['goal_specifics', 'time_management', 'experience'],
      'advanced': ['constraints', 'experience', 'goal_specifics']
    };

    const priorityOrder = domainPriorities[domain] || domainPriorities['general'];
    const complexityBoost = complexityAdjustments[complexity] || [];
    
    // Create weighted priority map
    const priorityWeights: Record<string, number> = {};
    
    // Base domain priorities
    priorityOrder.forEach((category, index) => {
      priorityWeights[category] = (priorityOrder.length - index) * 1.0;
    });
    
    // Complexity boosts
    complexityBoost.forEach(category => {
      priorityWeights[category] = (priorityWeights[category] || 0) + 0.5;
    });

    // Sort questions by priority weight, then by type (MCQ -> confirm -> freeform)
    const sortedQuestions = questions.sort((a, b) => {
      const aWeight = priorityWeights[a.category] || 0;
      const bWeight = priorityWeights[b.category] || 0;
      
      // Primary sort: priority weight
      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }
      
      // Secondary sort: question type preference
      const typeOrder = { 'mcq': 3, 'confirm': 2, 'freeform': 1 };
      const aTypeScore = typeOrder[a.type as keyof typeof typeOrder] || 0;
      const bTypeScore = typeOrder[b.type as keyof typeof typeOrder] || 0;
      
      return bTypeScore - aTypeScore;
    });

    return sortedQuestions;
  }

  /**
   * Reorder questions for optimal user experience: MCQ first, then freeform
   */
  private static reorderByStages(questions: QuestionBankItem[]): QuestionBankItem[] {
    const mcqQuestions = questions.filter(q => q.type === 'mcq');
    const confirmQuestions = questions.filter(q => q.type === 'confirm');
    const freeformQuestions = questions.filter(q => q.type === 'freeform');

    // Stage 1: MCQ and confirm (quick wins)
    // Stage 2: Freeform (more detailed but limited)
    return [...mcqQuestions, ...confirmQuestions, ...freeformQuestions.slice(0, 2)];
  }

  /**
   * Validate question plan against acceptance criteria
   */
  static validateQuestionPlan(plan: QuestionPlan): {
    isValid: boolean;
    issues: string[];
    metrics: {
      question_count: number;
      avg_score: number;
      offtopic_rate: number;
    };
  } {
    const issues: string[] = [];
    
    // Check question count (should be <= 5)
    if (plan.questions.length > 5) {
      issues.push(`Too many questions: ${plan.questions.length} > 5`);
    }

    // Calculate metrics
    const avgScore = plan.questions.reduce((sum, q) => {
      const scored = q as ScoredQuestion;
      return sum + (scored.score || 0);
    }, 0) / plan.questions.length;

    // Calculate off-topic rate (questions with low relevance)
    const offTopicCount = plan.questions.filter(q => {
      const scored = q as ScoredQuestion;
      return (scored.relevance || 0) < 0.6;
    }).length;
    const offtopicRate = offTopicCount / plan.questions.length;

    // Check acceptance criteria
    if (offtopicRate > 0.10) {
      issues.push(`Off-topic rate too high: ${(offtopicRate * 100).toFixed(1)}% > 10%`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      metrics: {
        question_count: plan.questions.length,
        avg_score: avgScore,
        offtopic_rate: offtopicRate,
      },
    };
  }
}

/**
 * Helper function to build profile from question responses
 */
export function buildProfileFromResponses(
  responses: Array<{ questionId: string; answer: string; confidence?: number }>
): KnownProfile {
  const fields: Record<string, any> = {};
  const confidence: Record<string, number> = {};

  for (const response of responses) {
    const question = questionBank.find(q => q.id === response.questionId);
    if (question) {
      fields[question.profile_field] = response.answer;
      confidence[question.profile_field] = response.confidence || 0.8;
    }
  }

  return { fields, confidence };
}