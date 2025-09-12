/**
 * Enhanced Quest Service - 時間制約対応改善版
 * 
 * advancedQuestServiceを継承し、時間制約調整機能を強化
 */

import { advancedQuestService } from './advancedQuestService.fixed';
import { 
  ProfileV1, 
  Quest, 
  QuestList, 
  DailyCheckins, 
  SkillAtom,
  Pattern
} from './promptEngine';
import { PreGoalAnalysisResult } from './preGoalAnalysisService';
import { InputSanitizer } from '../../utils/inputSanitizer';
import { apiKeyManager } from '../../config/apiKeys';

class EnhancedQuestService {
  private useRealAI: boolean = false;

  constructor() {
    this.initializeAIMode();
  }

  /**
   * CFG_ai_switch: Initialize AI mode based on API key availability
   */
  private initializeAIMode(): void {
    const apiKey = apiKeyManager.getOpenAIKey();
    this.useRealAI = apiKeyManager.shouldUseRealAI();
    
    if (this.useRealAI) {
      console.log('🤖 Enhanced Quest Service: REAL AI mode enabled');
    } else {
      console.log('🎭 Enhanced Quest Service: MOCK mode (fallback)');
    }
  }

  /**
   * CFG_ai_switch: Get AI mode diagnosis
   */
  getAIModeStatus() {
    return {
      useRealAI: this.useRealAI,
      apiKeyAvailable: !!apiKeyManager.getOpenAIKey(),
      aiEnabled: apiKeyManager.isAIEnabled(),
      shouldUseRealAI: apiKeyManager.shouldUseRealAI(),
    };
  }
  
  /**
   * Enhanced One-Day Quest Builder with Pre-Goal Analysis first_day_seed integration
   * 
   * Uses Pre-Goal Analysis first_day_seed as starting point for optimized quest generation
   */
  async generateEnhancedOneDayQuests(args: {
    goalText: string;
    profile: ProfileV1;
    preGoalAnalysis: PreGoalAnalysisResult;
    checkins?: DailyCheckins;
    skillAtoms?: SkillAtom[];
  }): Promise<{
    quests: Quest[];
    rationale: string[];
    guarantees: {
      questCount: number;
      maxSessionLength: number;
      totalTime: number;
      dayType: string;
      completionRate: number;
    };
    preGoalSeeds: any[];
  }> {
    const rationale: string[] = [];
    const startTime = new Date().getTime();
    
    console.log('🌱 Starting enhanced one-day quest generation with Pre-Goal first_day_seed...');
    
    // Step 1: Extract Pre-Goal first_day_seed quests as foundation
    const firstDaySeeds = args.preGoalAnalysis.first_day_seed.quests;
    rationale.push(`🌱 Using ${firstDaySeeds.length} Pre-Goal seed quests as foundation`);
    
    // Step 2: Determine day type and capacity (enhanced with Pre-Goal total_minutes_max)
    const dayType = args.checkins?.day_type || 'normal';
    const availableTimeDelta = args.checkins?.available_time_today_delta_min || 0;
    
    // Use Pre-Goal suggested total_minutes_max as base, with day_type adjustment
    const preGoalBaseTime = args.preGoalAnalysis.first_day_seed.total_minutes_max || 90;
    const dayTypeMultiplier = { busy: 0.5, normal: 1.0, deep: 1.67 }[dayType];
    const adjustedTotalTime = Math.max(15, Math.round(preGoalBaseTime * dayTypeMultiplier) + availableTimeDelta);
    
    rationale.push(`📅 Enhanced day type: ${dayType} (Pre-Goal base: ${preGoalBaseTime}min, adjusted: ${adjustedTotalTime}min)`);
    
    // Step 3: Convert Pre-Goal seeds to Quest format with day_type adaptations
    const convertedSeedQuests = this.convertPreGoalSeedsToQuests(
      firstDaySeeds,
      dayType,
      adjustedTotalTime,
      rationale
    );
    
    // Step 4: Apply early environment constraint substitution (T-HOTFIX-04)
    const constraintAdjustedSeeds = this.applyEnvironmentConstraintSubstitution(
      convertedSeedQuests,
      args.profile.env_constraints,
      rationale
    );
    
    // Step 5: Apply enhanced one-day guarantees with Pre-Goal awareness
    const maxQuestCount = Math.min(3, constraintAdjustedSeeds.length); // Prefer Pre-Goal count but respect limit
    const maxSessionLength = 45; // Hard limit maintained
    
    const guaranteedQuests = this.applyEnhancedOneDayGuarantees(
      constraintAdjustedSeeds,
      {
        maxQuests: maxQuestCount,
        maxSessionMinutes: maxSessionLength,
        totalTimeTarget: adjustedTotalTime,
        dayType,
        preGoalOptimized: true
      },
      rationale
    );
    
    // Step 5: Self-critique and validate against Pre-Goal rubric
    const validatedQuests = await this.validateWithPreGoalCritique(
      guaranteedQuests,
      args.preGoalAnalysis,
      rationale
    );
    
    // Step 6: Calculate guarantees
    const totalActualTime = validatedQuests.reduce((sum, q) => sum + q.minutes, 0);
    const maxActualSession = Math.max(...validatedQuests.map(q => q.minutes));
    
    const guarantees = {
      questCount: validatedQuests.length,
      maxSessionLength: maxActualSession,
      totalTime: totalActualTime,
      dayType,
      completionRate: this.estimateCompletionRate(validatedQuests, dayType, adjustedTotalTime)
    };
    
    const processingTime = new Date().getTime() - startTime;
    rationale.push(`✅ Enhanced one-day quest generation completed in ${processingTime}ms`);
    
    console.log('🎯 Enhanced one-day quests generated:', {
      questCount: guarantees.questCount,
      totalTime: guarantees.totalTime,
      maxSession: guarantees.maxSessionLength,
      completionRate: guarantees.completionRate,
      preGoalSeeds: firstDaySeeds.length
    });
    
    return {
      quests: validatedQuests,
      rationale,
      guarantees,
      preGoalSeeds: firstDaySeeds
    };
  }

  /**
   * Phase 3: One-Day Quest Builder with day_type adaptation (Legacy method)
   * 
   * Guarantees:
   * - All quests finish within the day (<=3 tasks, <=45min each)
   * - Day type adaptation: busy=45min, normal=90min, deep=150min
   * - Includes done_definition, evidence, alt_plan, stop_rule
   */
  async generateGuaranteedOneDayQuests(args: {
    goalText: string;
    profile: ProfileV1;
    checkins?: DailyCheckins;
    skillAtoms?: SkillAtom[];
  }): Promise<{
    quests: Quest[];
    rationale: string[];
    guarantees: {
      questCount: number;
      maxSessionLength: number;
      totalTime: number;
      dayType: string;
      completionRate: number;
    };
  }> {
    const rationale: string[] = [];
    const startTime = new Date().getTime();
    
    // Step 1: Determine day type and capacity
    const dayType = args.checkins?.day_type || 'normal';
    const availableTimeDelta = args.checkins?.available_time_today_delta_min || 0;
    
    const dayTypeCapacity = {
      busy: 45,
      normal: 90,
      deep: 150
    };
    
    const baseTotalTime = dayTypeCapacity[dayType];
    const adjustedTotalTime = Math.max(15, baseTotalTime + availableTimeDelta); // Never go below 15min
    
    rationale.push(`📅 Day type: ${dayType} (base: ${baseTotalTime}min, adjusted: ${adjustedTotalTime}min)`);
    
    // Step 2: Calculate quest parameters
    const maxQuestCount = 3; // Hard limit for one-day completion
    const maxSessionLength = 45; // Hard limit per session
    const questCount = Math.min(maxQuestCount, Math.max(1, Math.floor(adjustedTotalTime / 20))); // Minimum 20min per quest
    const avgTimePerQuest = Math.floor(adjustedTotalTime / questCount);
    const cappedTimePerQuest = Math.min(maxSessionLength, avgTimePerQuest);
    
    rationale.push(`🎯 Planning ${questCount} quests, ~${cappedTimePerQuest}min each (max ${maxSessionLength}min)`);
    
    // Step 3: Generate skill atoms if not provided
    let skillAtoms = args.skillAtoms;
    if (!skillAtoms || skillAtoms.length === 0) {
      rationale.push('🧬 Generating skill atoms...');
      skillAtoms = await advancedQuestService.generateSkillMap({
        goalText: args.goalText,
        currentLevelTags: [],
        priorityAreas: []
      });
      rationale.push(`   Generated ${skillAtoms.length} skill atoms`);
    }
    
    // Step 4: Generate raw quests
    const rawQuests = await advancedQuestService.generateDailyQuests({
      profile: args.profile,
      skillAtoms,
      checkins: args.checkins
    });
    
    // Step 5: Apply early environment constraint substitution (T-HOTFIX-04)
    const constraintAdjustedQuests = this.applyEnvironmentConstraintSubstitution(
      rawQuests,
      args.profile.env_constraints,
      rationale
    );
    
    // Step 6: Apply one-day guarantees
    let guaranteedQuests = this.applyOneDayGuarantees(
      constraintAdjustedQuests,
      {
        maxQuests: questCount,
        maxSessionMinutes: maxSessionLength,
        totalTimeTarget: adjustedTotalTime,
        dayType
      },
      rationale
    );
    
    // Step 6: Add required fields for Phase 3
    guaranteedQuests = guaranteedQuests.map(quest => ({
      ...quest,
      done_definition: quest.done_definition || this.generateDoneDefinition(quest),
      evidence: quest.evidence || this.generateEvidence(quest),
      alt_plan: quest.alt_plan || this.generateAlternativePlan(quest, dayType),
      stop_rule: quest.stop_rule || this.generateStopRule(quest, cappedTimePerQuest)
    }));
    
    // Step 7: Self-critique validation
    const critique = this.validateOneDayQuests(guaranteedQuests, {
      maxQuests: questCount,
      maxSessionMinutes: maxSessionLength,
      totalTimeTarget: adjustedTotalTime
    });
    
    rationale.push(...critique.issues);
    
    if (critique.needsRevision) {
      rationale.push('🔄 Applying self-critique revisions...');
      guaranteedQuests = this.reviseBasedOnCritique(guaranteedQuests, critique, rationale);
    }
    
    const endTime = new Date().getTime();
    const totalTime = guaranteedQuests.reduce((sum, q) => sum + q.minutes, 0);
    const completionRate = this.calculateCompletionRate(guaranteedQuests, dayType);
    
    rationale.push(`✅ Generated in ${Math.round((endTime - startTime) / 100) / 10}s`);
    rationale.push(`🎯 Final: ${guaranteedQuests.length} quests, ${totalTime}min total`);
    rationale.push(`📊 Estimated completion rate: ${(completionRate * 100).toFixed(0)}%`);
    
    return {
      quests: guaranteedQuests,
      rationale,
      guarantees: {
        questCount: guaranteedQuests.length,
        maxSessionLength: Math.max(...guaranteedQuests.map(q => q.minutes)),
        totalTime,
        dayType,
        completionRate
      }
    };
  }
  
  /**
   * Apply one-day completion guarantees
   */
  private applyOneDayGuarantees(
    quests: Quest[],
    constraints: {
      maxQuests: number;
      maxSessionMinutes: number;
      totalTimeTarget: number;
      dayType: string;
    },
    rationale: string[]
  ): Quest[] {
    let processedQuests = [...quests];
    
    // Guarantee 1: Limit quest count (<=3)
    if (processedQuests.length > constraints.maxQuests) {
      processedQuests = processedQuests.slice(0, constraints.maxQuests);
      rationale.push(`   🔒 Limited to ${constraints.maxQuests} quests for one-day completion`);
    }
    
    // Guarantee 2: Limit session length (<=45min each)
    let sessionAdjustments = 0;
    processedQuests = processedQuests.map(quest => {
      if (quest.minutes > constraints.maxSessionMinutes) {
        sessionAdjustments++;
        return {
          ...quest,
          minutes: constraints.maxSessionMinutes
        };
      }
      return quest;
    });
    
    if (sessionAdjustments > 0) {
      rationale.push(`   ⏱️  Capped ${sessionAdjustments} sessions to ${constraints.maxSessionMinutes}min max`);
    }
    
    // Guarantee 3: Total time snap to target
    const currentTotal = processedQuests.reduce((sum, q) => sum + q.minutes, 0);
    if (Math.abs(currentTotal - constraints.totalTimeTarget) > 5) {
      const scale = constraints.totalTimeTarget / currentTotal;
      processedQuests = processedQuests.map(quest => ({
        ...quest,
        minutes: Math.min(
          constraints.maxSessionMinutes,
          Math.max(15, Math.round(quest.minutes * scale))
        )
      }));
      
      rationale.push(`   🎯 Scaled to ${constraints.totalTimeTarget}min target (${scale.toFixed(2)}x)`);
    }
    
    // Guarantee 4: Avoid consecutive identical patterns
    if (processedQuests.length > 1) {
      let patternAdjustments = 0;
      const patternAlternatives: Record<Pattern, Pattern[]> = {
        "read_note_q": ["flashcards", "feynman"],
        "flashcards": ["read_note_q", "build_micro"],
        "build_micro": ["config_verify", "debug_explain"],
        "config_verify": ["build_micro", "past_paper"],
        "debug_explain": ["feynman", "socratic"],
        "feynman": ["socratic", "read_note_q"],
        "past_paper": ["flashcards", "config_verify"],
        "socratic": ["feynman", "debug_explain"],
        "shadowing": ["build_micro", "flashcards"],
        "retrospective": ["read_note_q", "feynman"]
      };
      
      for (let i = 1; i < processedQuests.length; i++) {
        if (processedQuests[i].pattern === processedQuests[i - 1].pattern) {
          const alternatives = patternAlternatives[processedQuests[i].pattern] || ["read_note_q"];
          processedQuests[i] = {
            ...processedQuests[i],
            pattern: alternatives[0]
          };
          patternAdjustments++;
        }
      }
      
      if (patternAdjustments > 0) {
        rationale.push(`   🌈 Fixed ${patternAdjustments} consecutive pattern duplicates`);
      }
    }
    
    return processedQuests;
  }
  
  /**
   * Generate done definition for quest completion
   */
  private generateDoneDefinition(quest: Quest): string {
    const patterns = {
      read_note_q: `${quest.deliverable}を完成させ、内容を説明できる状態になる`,
      flashcards: `フラッシュカードを完成させ、80%以上正答できる`,
      build_micro: `動作する${quest.deliverable}を完成させ、デモ実行する`,
      config_verify: `設定を完了し、正常動作を確認する`,
      debug_explain: `問題を特定し、解決方法を説明できる`,
      feynman: `概念を誰かに教えられるレベルで説明できる`,
      past_paper: `問題を完了し、答え合わせと振り返りを行う`,
      socratic: `質問に答えを出し、さらなる疑問点を3つ見つける`,
      shadowing: `音声に合わせて正確にシャドーイングできる`,
      retrospective: `振り返りメモを完成させ、改善点を特定する`
    };
    
    return patterns[quest.pattern] || `${quest.title}を完了し、成果物を確認する`;
  }
  
  /**
   * Generate evidence for quest completion
   */
  private generateEvidence(quest: Quest): string[] {
    const patterns = {
      read_note_q: ["作成したノート", "理解度チェックの結果"],
      flashcards: ["完成したフラッシュカード", "正答率記録"],
      build_micro: ["動作確認スクリーンショット", "完成したコード"],
      config_verify: ["設定画面のスクリーンショット", "動作確認結果"],
      debug_explain: ["問題解決の記録", "説明メモ"],
      feynman: ["説明メモ", "理解度の自己評価"],
      past_paper: ["解答用紙", "振り返りメモ"],
      socratic: ["質問と答えのリスト", "新たな疑問点リスト"],
      shadowing: ["練習記録", "発音改善点メモ"],
      retrospective: ["振り返りレポート", "改善アクションプラン"]
    };
    
    return patterns[quest.pattern] || ["完成した成果物", "振り返りメモ"];
  }
  
  /**
   * Generate alternative plan for quest
   */
  private generateAlternativePlan(quest: Quest, dayType: string): string {
    const timeReductions = {
      busy: "より簡単な方法に変更、または翌日に延期",
      normal: "時間を半分に短縮し、重要な部分に集中",
      deep: "段階的に分割し、基礎部分から開始"
    };
    
    const baseAlt = timeReductions[dayType as keyof typeof timeReductions] || timeReductions.normal;
    
    const patternSpecific = {
      read_note_q: "重要な箇所のみをピックアップして読む",
      flashcards: "5-10枚に絞って集中的に練習",
      build_micro: "最小限の機能のみ実装する",
      config_verify: "必須設定のみを行い、詳細は後日",
      debug_explain: "問題の特定のみ行い、解決は翌日",
      feynman: "1つの概念に絞って説明練習",
      past_paper: "解ける問題のみ選んで挑戦",
      socratic: "1つの質問に深く掘り下げる",
      shadowing: "短いセクションのみ練習",
      retrospective: "今日の成果のみ振り返る"
    };
    
    return patternSpecific[quest.pattern] || baseAlt;
  }
  
  /**
   * Generate stop rule for quest
   */
  private generateStopRule(quest: Quest, maxMinutes: number): string {
    const timeRule = `${maxMinutes}分経過したら、現在の進捗で一旦終了`;
    const qualityRule = quest.pattern === 'build_micro' 
      ? "エラーが3回以上続いたら別のアプローチを検討"
      : "理解度が50%未満の場合は基礎に戻る";
    
    return `${timeRule}。${qualityRule}。`;
  }
  
  /**
   * T-HOTFIX-04: Apply deterministic environment constraint substitution
   * This ensures no infeasible patterns survive into PolicyCheck
   */
  private applyEnvironmentConstraintSubstitution(
    quests: Quest[],
    envConstraints: string[],
    rationale: string[]
  ): Quest[] {
    if (!envConstraints || envConstraints.length === 0) {
      return quests;
    }
    
    // Deterministic substitution mapping based on common constraint patterns
    const constraintSubstitutions: Record<string, Record<Pattern, Pattern[]>> = {
      'no_audio': {
        'shadowing': ['read_note_q', 'build_micro'], // No voice/audio -> avoid shadowing
        'socratic': ['feynman', 'past_paper']        // Vocal patterns -> silent alternatives
      },
      'no_voice': {
        'shadowing': ['read_note_q', 'build_micro'],
        'socratic': ['feynman', 'past_paper']
      },
      'silent_only': {
        'shadowing': ['flashcards', 'read_note_q'],
        'socratic': ['feynman', 'retrospective']
      },
      'no_coding': {
        'build_micro': ['read_note_q', 'flashcards'], // No coding -> reading/memory tasks
        'config_verify': ['past_paper', 'feynman'],
        'debug_explain': ['read_note_q', 'retrospective']
      },
      'read_only': {
        'build_micro': ['read_note_q', 'past_paper'],
        'flashcards': ['read_note_q', 'feynman'],
        'config_verify': ['read_note_q', 'retrospective']
      },
      'no_writing': {
        'read_note_q': ['feynman', 'socratic'],       // No writing -> verbal/mental
        'flashcards': ['feynman', 'socratic'],
        'past_paper': ['feynman', 'retrospective']
      },
      'time_limited': {
        'build_micro': ['flashcards', 'read_note_q'], // Long tasks -> shorter alternatives
        'past_paper': ['flashcards', 'feynman']
      }
    };
    
    let substitutionCount = 0;
    const processedQuests = quests.map((quest, index) => {
      let currentPattern = quest.pattern;
      
      // Check each constraint for applicable substitutions
      for (const constraint of envConstraints) {
        const constraintKey = constraint.toLowerCase().replace(/[\s\-_]/g, '_');
        const substitutionMap = constraintSubstitutions[constraintKey];
        
        if (substitutionMap && substitutionMap[currentPattern]) {
          const alternatives = substitutionMap[currentPattern];
          const newPattern = alternatives[0]; // Use first alternative deterministically
          
          if (newPattern !== currentPattern) {
            currentPattern = newPattern;
            substitutionCount++;
            rationale.push(`   🚫 Quest ${index + 1}: ${quest.pattern} → ${newPattern} (constraint: ${constraint})`);
          }
        }
      }
      
      return currentPattern !== quest.pattern ? { ...quest, pattern: currentPattern } : quest;
    });
    
    if (substitutionCount > 0) {
      rationale.push(`🛡️ Applied ${substitutionCount} environment constraint substitutions (T-HOTFIX-04)`);
    } else {
      rationale.push(`✅ No constraint violations found in patterns (T-HOTFIX-04)`);
    }
    
    return processedQuests;
  }
  
  /**
   * Validate one-day quest guarantees
   */
  private validateOneDayQuests(
    quests: Quest[],
    constraints: {
      maxQuests: number;
      maxSessionMinutes: number;
      totalTimeTarget: number;
    }
  ): {
    needsRevision: boolean;
    issues: string[];
    metrics: {
      relevance: number;
      feasibility: number;
      specificity: number;
      loadOver: number;
    };
  } {
    const issues: string[] = [];
    let needsRevision = false;
    
    // Check quest count
    if (quests.length > constraints.maxQuests) {
      issues.push(`❌ Quest count violation: ${quests.length} > ${constraints.maxQuests}`);
      needsRevision = true;
    }
    
    // Check session length
    const oversizedSessions = quests.filter(q => q.minutes > constraints.maxSessionMinutes);
    if (oversizedSessions.length > 0) {
      issues.push(`❌ Session length violation: ${oversizedSessions.length} quests > ${constraints.maxSessionMinutes}min`);
      needsRevision = true;
    }
    
    // Check total time
    const totalTime = quests.reduce((sum, q) => sum + q.minutes, 0);
    const loadOver = totalTime > constraints.totalTimeTarget ? 
      ((totalTime - constraints.totalTimeTarget) / constraints.totalTimeTarget) : 0;
    
    if (loadOver > 0.1) { // More than 10% over
      issues.push(`❌ Load over: ${(loadOver * 100).toFixed(1)}% > 10%`);
      needsRevision = true;
    }
    
    // Calculate metrics
    const relevance = quests.filter(q => 
      q.tags.length > 0 && q.deliverable.length > 5
    ).length / quests.length;
    
    const feasibility = quests.filter(q => 
      q.minutes >= 15 && q.minutes <= constraints.maxSessionMinutes && q.difficulty <= 0.7
    ).length / quests.length;
    
    const specificity = quests.filter(q => 
      q.done_definition && q.evidence && q.evidence.length > 0
    ).length / quests.length;
    
    // Check acceptance criteria
    if (relevance < 0.85) {
      issues.push(`⚠️  Relevance low: ${(relevance * 100).toFixed(0)}% < 85%`);
    }
    
    if (feasibility < 0.8) {
      issues.push(`⚠️  Feasibility low: ${(feasibility * 100).toFixed(0)}% < 80%`);
    }
    
    if (specificity < 0.85) {
      issues.push(`⚠️  Specificity low: ${(specificity * 100).toFixed(0)}% < 85%`);
    }
    
    if (issues.length === 0) {
      issues.push('✅ All one-day guarantees validated successfully');
    }
    
    return {
      needsRevision,
      issues,
      metrics: {
        relevance,
        feasibility,
        specificity,
        loadOver
      }
    };
  }
  
  /**
   * Revise quests based on critique
   */
  private reviseBasedOnCritique(
    quests: Quest[],
    critique: any,
    rationale: string[]
  ): Quest[] {
    let revisedQuests = [...quests];
    
    // Fix load over issue
    if (critique.metrics.loadOver > 0.1) {
      const scale = 0.9; // Reduce by 10%
      revisedQuests = revisedQuests.map(quest => ({
        ...quest,
        minutes: Math.max(15, Math.round(quest.minutes * scale))
      }));
      rationale.push(`   🔧 Reduced total time by ${((1-scale) * 100).toFixed(0)}%`);
    }
    
    // Enhance specificity
    if (critique.metrics.specificity < 0.85) {
      revisedQuests = revisedQuests.map(quest => ({
        ...quest,
        done_definition: quest.done_definition || this.generateDoneDefinition(quest),
        evidence: quest.evidence?.length > 0 ? quest.evidence : this.generateEvidence(quest)
      }));
      rationale.push(`   🔧 Enhanced specificity with done_definition and evidence`);
    }
    
    return revisedQuests;
  }
  
  /**
   * Calculate completion rate based on day type and quest complexity
   */
  private calculateCompletionRate(quests: Quest[], dayType: string): number {
    const baseRates = { busy: 0.65, normal: 0.8, deep: 0.9 };
    const baseRate = baseRates[dayType as keyof typeof baseRates] || baseRates.normal;
    
    // Adjust based on average difficulty
    const avgDifficulty = quests.reduce((sum, q) => sum + q.difficulty, 0) / quests.length;
    const difficultyPenalty = avgDifficulty > 0.5 ? (avgDifficulty - 0.5) * 0.2 : 0;
    
    // Adjust based on total time vs optimal
    const totalTime = quests.reduce((sum, q) => sum + q.minutes, 0);
    const timePenalty = totalTime > 120 ? (totalTime - 120) / 1200 : 0; // Penalty for >2h
    
    return Math.max(0.4, baseRate - difficultyPenalty - timePenalty);
  }

  /**
   * 時間制約を考慮したクエスト生成（改善版）
   */
  async generateOptimizedQuestsWithTimeConstraints(args: {
    goalText: string;
    profile: ProfileV1;
    currentLevelTags?: string[];
    priorityAreas?: string[];
    checkins?: DailyCheckins;
  }): Promise<{
    skillAtoms: SkillAtom[];
    questsCandidate: Quest[];
    finalQuests: QuestList;
    timeAdjustmentLog: string[];
  }> {
    const timeAdjustmentLog: string[] = [];
    const startTime = new Date().getTime();
    
    // Input validation and sanitization
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments provided to quest generation');
    }
    
    if (!args.goalText || typeof args.goalText !== 'string') {
      throw new Error('Goal text is required and must be a valid string');
    }
    
    if (!args.profile || typeof args.profile !== 'object') {
      throw new Error('Profile is required and must be a valid object');
    }
    
    // Sanitize inputs
    const sanitizedGoalText = InputSanitizer.sanitizeGoalText(args.goalText);
    const sanitizedProfile = InputSanitizer.sanitizeProfileData(args.profile);
    
    timeAdjustmentLog.push(`🎯 Starting quest generation for goal: "${sanitizedGoalText}"`);
    timeAdjustmentLog.push(`⏰ Available time budget: ${sanitizedProfile.time_budget_min_per_day || args.profile.time_budget_min_per_day} min/day`);
    
    try {
      // Step 1: スキルマップ生成
      console.log('🎯 Step 1: Generating skill map...');
      timeAdjustmentLog.push('📚 Step 1: Generating skill map...');
      
      const skillAtoms = await advancedQuestService.generateSkillMap({
        goalText: sanitizedGoalText,
        currentLevelTags: args.currentLevelTags,
        priorityAreas: args.priorityAreas,
      });
      
      timeAdjustmentLog.push(`   Generated ${skillAtoms.length} skill atoms`);

      // Step 2: 時間制約を考慮したクエスト生成
      console.log('⚡ Step 2: Generating time-constrained quests...');
      timeAdjustmentLog.push('⚡ Step 2: Generating time-constrained daily quests...');
      
      const questsCandidate = await advancedQuestService.generateDailyQuests({
        profile: { ...args.profile, ...sanitizedProfile },
        skillAtoms,
        checkins: args.checkins,
      });
      
      // Validate and sanitize generated quests
      const validatedQuests = questsCandidate.map(quest => {
        if (!InputSanitizer.validateQuestData(quest)) {
          timeAdjustmentLog.push(`   ⚠️  Invalid quest detected, applying sanitization`);
          return InputSanitizer.sanitizeQuestData(quest);
        }
        return quest;
      }).filter(quest => quest && quest.title); // Remove invalid quests
      
      // Apply early environment constraint substitution (T-HOTFIX-04)
      const constraintAdjustedQuests = this.applyEnvironmentConstraintSubstitution(
        validatedQuests,
        args.profile.env_constraints,
        timeAdjustmentLog
      );
      
      const initialTotalTime = constraintAdjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
      timeAdjustmentLog.push(`   Initial total time: ${initialTotalTime}min`);

      // Step 3: 事前時間調整 (with day_type scaling)
      const dayType = args.checkins?.day_type || 'normal';
      const dayTypeCapacity = { busy: 45, normal: 90, deep: 150 };
      const baseTotalTime = sanitizedProfile.time_budget_min_per_day || args.profile.time_budget_min_per_day;
      const scaledTotalTime = dayTypeCapacity[dayType] || baseTotalTime;
      
      timeAdjustmentLog.push(`📅 Day type scaling: ${dayType} (base: ${baseTotalTime}min → scaled: ${scaledTotalTime}min)`);
      
      const preAdjustedQuests = this.preAdjustQuestTimes(
        constraintAdjustedQuests, 
        scaledTotalTime,
        timeAdjustmentLog
      );

      // Step 4: 強化されたポリシーチェック
      console.log('🔍 Step 3: Enhanced policy check...');
      timeAdjustmentLog.push('🔍 Step 3: Enhanced policy check and optimization...');
      
      const finalQuests = await advancedQuestService.policyCheck({
        quests: preAdjustedQuests,
        profile: { ...args.profile, ...sanitizedProfile },
        checkins: args.checkins,
      });

      // Step 5: 最終調整 (with day_type scaling)
      const enhancedFinalQuests = this.applyFinalEnhancements(
        finalQuests.quests,
        scaledTotalTime,
        timeAdjustmentLog
      );

      const endTime = new Date().getTime();
      const totalTime = Math.round((endTime - startTime) / 1000 * 10) / 10;
      timeAdjustmentLog.push(`✅ Quest generation completed in ${totalTime}s`);
      
      const finalTotalTime = enhancedFinalQuests.reduce((sum, q) => sum + q.minutes, 0);
      timeAdjustmentLog.push(`🎯 Final result: ${enhancedFinalQuests.length} quests, ${finalTotalTime}min total`);

      return {
        skillAtoms,
        questsCandidate: validatedQuests,
        finalQuests: {
          quests: enhancedFinalQuests,
          rationale: [
            ...finalQuests.rationale,
            "時間制約を考慮した最適化済み",
            `実行可能な${finalTotalTime}分構成`
          ]
        },
        timeAdjustmentLog
      };
    } catch (error) {
      console.error('Enhanced quest generation failed:', error);
      timeAdjustmentLog.push(`❌ Error: ${error.message}`);
      
      // Check for specific goal text validation errors
      if (error.message.includes('Goal text must be at least')) {
        throw new Error('目標をもう少し詳しく入力してください。例：「英語を話せるようになりたい」「プログラミングスキルを身につけたい」など、具体的な内容をお書きください。');
      }
      
      // Generic error handling
      throw new Error(`学習プラン生成でエラーが発生しました。入力内容を確認してもう一度お試しください: ${error.message}`);
    }
  }

  /**
   * クエストの事前時間調整（改善版）
   */
  private preAdjustQuestTimes(
    quests: Quest[], 
    maxTotalMinutes: number,
    log: string[]
  ): Quest[] {
    const totalMinutes = quests.reduce((sum, q) => sum + q.minutes, 0);
    
    if (totalMinutes <= maxTotalMinutes) {
      log.push(`   ✅ No time adjustment needed (${totalMinutes}min <= ${maxTotalMinutes}min)`);
      return quests;
    }

    log.push(`   ⚠️  Time adjustment needed: ${totalMinutes}min → ${maxTotalMinutes}min`);
    
    let adjustedQuests = [...quests];
    
    // Strategy 1: Remove excessive quests if too many
    const minMinutesPerQuest = 15;
    const maxReasonableQuests = Math.floor(maxTotalMinutes / minMinutesPerQuest);
    
    if (adjustedQuests.length > maxReasonableQuests) {
      // Prioritize earlier quests (usually foundational)
      adjustedQuests = adjustedQuests.slice(0, maxReasonableQuests);
      log.push(`   🔄 Reduced quest count to ${maxReasonableQuests} (max reasonable for time budget)`);
    }
    
    // Strategy 2: Proportional scaling with minimum constraints and exact total matching
    const currentTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
    const scale = maxTotalMinutes / currentTotal;
    
    if (scale < 1) {
      adjustedQuests = adjustedQuests.map((quest, index) => {
        const newMinutes = Math.max(minMinutesPerQuest, Math.round(quest.minutes * scale));
        
        // Give slightly more time to first quest (foundational)
        const bonusTime = index === 0 ? Math.min(5, maxTotalMinutes - adjustedQuests.length * minMinutesPerQuest) : 0;
        
        return {
          ...quest,
          minutes: newMinutes + bonusTime
        };
      });
      
      // Final adjustment to exactly match budget (guaranteed compliance)
      let currentAdjustedTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
      if (currentAdjustedTotal !== maxTotalMinutes) {
        const diff = maxTotalMinutes - currentAdjustedTotal;
        
        // If over budget, reduce from largest quest first
        if (diff < 0) {
          let remaining = Math.abs(diff);
          const sortedBySize = [...adjustedQuests].sort((a, b) => b.minutes - a.minutes);
          
          for (const quest of sortedBySize) {
            if (remaining <= 0) break;
            const reduction = Math.min(remaining, quest.minutes - minMinutesPerQuest);
            quest.minutes -= reduction;
            remaining -= reduction;
          }
        } else {
          // If under budget, add to first quest
          adjustedQuests[0].minutes += diff;
        }
      }
      
      log.push(`   📊 Applied proportional scaling (${scale.toFixed(2)}x) with exact total matching`);
    }
    
    const adjustedTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
    log.push(`   ✅ Adjusted to ${adjustedTotal}min (target: ${maxTotalMinutes}min)`);
    
    return adjustedQuests;
  }

  /**
   * 最終的な品質向上調整
   */
  private applyFinalEnhancements(
    quests: Quest[], 
    maxTotalMinutes: number,
    log: string[]
  ): Quest[] {
    let enhancedQuests = [...quests];
    
    // 1. Auto-fill completion fields (T-HOTFIX-03)
    enhancedQuests = this.autoFillCompletionFields(enhancedQuests, log);
    
    // 2. 難易度バランスの調整
    enhancedQuests = this.balanceDifficulty(enhancedQuests, log);
    
    // 3. パターンの多様性確保
    enhancedQuests = this.ensurePatternDiversity(enhancedQuests, log);
    
    // 4. 最終時間チェック
    const finalTotal = enhancedQuests.reduce((sum, q) => sum + q.minutes, 0);
    if (finalTotal > maxTotalMinutes) {
      log.push(`   ⚠️  Final time adjustment: ${finalTotal}min → ${maxTotalMinutes}min`);
      enhancedQuests = this.preAdjustQuestTimes(enhancedQuests, maxTotalMinutes, log);
    }
    
    return enhancedQuests;
  }

  /**
   * Auto-fill completion fields for T-HOTFIX-03
   */
  private autoFillCompletionFields(quests: Quest[], log: string[]): Quest[] {
    let filledCount = 0;
    
    const completedQuests = quests.map(quest => {
      const needsCompletion = !quest.done_definition || !quest.evidence || quest.evidence.length === 0 || 
                              !quest.alt_plan || !quest.stop_rule;
      
      if (needsCompletion) {
        filledCount++;
      }
      
      return {
        ...quest,
        done_definition: quest.done_definition || this.generateDoneDefinition(quest),
        evidence: quest.evidence && quest.evidence.length > 0 ? quest.evidence : this.generateEvidence(quest),
        alt_plan: quest.alt_plan || this.generateAlternativePlan(quest, 'normal'),
        stop_rule: quest.stop_rule || this.generateStopRule(quest, quest.minutes)
      };
    });
    
    if (filledCount > 0) {
      log.push(`   ✅ Auto-filled completion fields for ${filledCount} quests (done_definition, evidence, alt_plan, stop_rule)`);
    }
    
    return completedQuests;
  }

  /**
   * 難易度バランス調整
   */
  private balanceDifficulty(quests: Quest[], log: string[]): Quest[] {
    if (quests.length <= 1) return quests;
    
    const avgDifficulty = quests.reduce((sum, q) => sum + q.difficulty, 0) / quests.length;
    const targetRange = { min: 0.2, max: 0.7 };
    let adjustmentCount = 0;
    
    const balancedQuests = quests.map((quest, index) => {
      let newDifficulty = quest.difficulty;
      
      // First quest should be easier to build confidence
      if (index === 0 && quest.difficulty > 0.5) {
        newDifficulty = Math.max(0.3, quest.difficulty - 0.15);
        adjustmentCount++;
      }
      
      // Ensure no quest is too extreme
      if (quest.difficulty < targetRange.min) {
        newDifficulty = targetRange.min;
        adjustmentCount++;
      } else if (quest.difficulty > targetRange.max) {
        newDifficulty = targetRange.max;
        adjustmentCount++;
      }
      
      // Progressive difficulty (slight increase)
      if (index > 0 && newDifficulty <= quests[index - 1].difficulty - 0.1) {
        newDifficulty = Math.min(targetRange.max, quests[index - 1].difficulty + 0.05);
        adjustmentCount++;
      }
      
      return newDifficulty !== quest.difficulty 
        ? { ...quest, difficulty: newDifficulty }
        : quest;
    });
    
    if (adjustmentCount > 0) {
      log.push(`   🎯 Balanced difficulty for ${adjustmentCount} quests`);
    }
    
    return balancedQuests;
  }

  /**
   * パターンの多様性確保
   */
  private ensurePatternDiversity(quests: Quest[], log: string[]): Quest[] {
    if (quests.length <= 1) return quests;
    
    const patternCounts: Record<Pattern, number> = {} as Record<Pattern, number>;
    let changesCount = 0;
    
    // Count pattern usage
    quests.forEach(q => {
      patternCounts[q.pattern] = (patternCounts[q.pattern] || 0) + 1;
    });
    
    // Alternative patterns for diversity
    const patternAlternatives: Record<Pattern, Pattern[]> = {
      "read_note_q": ["flashcards", "feynman"],
      "flashcards": ["read_note_q", "build_micro"],
      "build_micro": ["config_verify", "debug_explain"],
      "config_verify": ["build_micro", "past_paper"],
      "debug_explain": ["feynman", "socratic"],
      "feynman": ["socratic", "read_note_q"],
      "past_paper": ["flashcards", "config_verify"],
      "socratic": ["feynman", "debug_explain"],
      "shadowing": ["build_micro", "flashcards"],
      "retrospective": ["read_note_q", "feynman"]
    };
    
    // Fix consecutive duplicates
    const diverseQuests = quests.map((quest, index) => {
      if (index === 0) return quest;
      
      const prevQuest = quests[index - 1];
      if (quest.pattern === prevQuest.pattern) {
        const alternatives = patternAlternatives[quest.pattern] || ["read_note_q"];
        const newPattern = alternatives.find(alt => 
          index === quests.length - 1 || alt !== quests[index + 1]?.pattern
        ) || alternatives[0];
        
        changesCount++;
        return { ...quest, pattern: newPattern };
      }
      
      return quest;
    });
    
    if (changesCount > 0) {
      log.push(`   🌈 Enhanced pattern diversity (${changesCount} changes)`);
    }
    
    return diverseQuests;
  }

  /**
   * テスト実行とログ出力
   */
  async testQuestGeneration(
    goalText: string, 
    timeBudget: number, 
    motivation: "low" | "mid" | "high" = "mid"
  ): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Enhanced Quest Generation Test`);
    console.log(`Goal: ${goalText}`);
    console.log(`Time Budget: ${timeBudget}min`);
    console.log(`${'='.repeat(60)}`);

    // Initialize service if needed
    if (!advancedQuestService.isInitialized()) {
      const initialized = advancedQuestService.initialize();
      if (!initialized) {
        console.log('❌ Service initialization failed');
        return;
      }
    }

    // Create profile
    const profile = advancedQuestService.createBasicProfile({
      goalText,
      timeBudgetMin: timeBudget,
      motivation
    });

    try {
      const result = await this.generateOptimizedQuestsWithTimeConstraints({
        goalText,
        profile,
        currentLevelTags: [],
        priorityAreas: []
      });

      // Display results
      console.log('\n📊 Generation Results:');
      result.timeAdjustmentLog.forEach(log => console.log(log));

      console.log('\n🎮 Final Quests:');
      result.finalQuests.quests.forEach((quest, idx) => {
        console.log(`\n   Quest ${idx + 1}: ${quest.title}`);
        console.log(`   ├─ Pattern: ${quest.pattern}`);
        console.log(`   ├─ Duration: ${quest.minutes}min`);
        console.log(`   ├─ Difficulty: ${quest.difficulty}`);
        console.log(`   ├─ Deliverable: ${quest.deliverable}`);
        console.log(`   └─ Tags: ${quest.tags.join(', ')}`);
      });

      const totalTime = result.finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0);
      const efficiency = (totalTime / timeBudget * 100).toFixed(1);
      
      console.log(`\n✅ Success: ${result.finalQuests.quests.length} quests, ${totalTime}min (${efficiency}% of budget)`);

    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
    }
  }

  // ========== Pre-Goal Analysis Integration Support Methods ==========

  /**
   * Convert Pre-Goal seed quests to Quest format with day_type adaptations
   */
  private convertPreGoalSeedsToQuests(
    seedQuests: any[],
    dayType: string,
    totalTimeTarget: number,
    rationale: string[]
  ): Quest[] {
    rationale.push(`🌱 Converting ${seedQuests.length} Pre-Goal seed quests for ${dayType} day`);
    
    const dayTypeMultiplier = { busy: 0.7, normal: 1.0, deep: 1.3 };
    const multiplier = dayTypeMultiplier[dayType as keyof typeof dayTypeMultiplier] || 1.0;
    
    const convertedQuests: Quest[] = seedQuests.map((seed, index) => {
      // Adjust minutes based on day type while respecting the seed's planned duration
      const adjustedMinutes = Math.min(45, Math.max(15, Math.round(seed.minutes * multiplier)));
      
      // Map Pre-Goal pattern to Quest pattern
      const questPattern = this.mapPreGoalPatternToQuest(seed.pattern);
      
      // Ensure all required Quest fields are present
      const quest: Quest = {
        title: seed.title || `${questPattern}タスク ${index + 1}`,
        pattern: questPattern,
        minutes: adjustedMinutes,
        difficulty: seed.difficulty || 0.5,
        deliverable: seed.deliverable || seed.title || 'タスク完了',
        steps: Array.isArray(seed.steps) ? seed.steps : ['タスクを開始', '進捗を確認', 'タスクを完了'],
        tags: Array.isArray(seed.tags) ? seed.tags : ['pregoal', questPattern],
        done_definition: seed.done_definition || `${seed.title}が完了した状態`,
        evidence: Array.isArray(seed.evidence) ? seed.evidence : ['完了報告'],
        alt_plan: seed.alt_plan || `時間短縮版: ${Math.round(adjustedMinutes * 0.7)}分で基礎部分のみ実施`,
        stop_rule: seed.stop_rule || `${adjustedMinutes}分経過または理解度50%未満で中断`
      };
      
      return quest;
    });
    
    // Adjust total time to fit within target
    const currentTotal = convertedQuests.reduce((sum, q) => sum + q.minutes, 0);
    if (currentTotal > totalTimeTarget) {
      const scale = totalTimeTarget / currentTotal;
      convertedQuests.forEach(quest => {
        quest.minutes = Math.max(15, Math.round(quest.minutes * scale));
      });
      rationale.push(`   🔧 Scaled quest durations by ${scale.toFixed(2)} to fit ${totalTimeTarget}min target`);
    }
    
    rationale.push(`   ✅ Converted to ${convertedQuests.length} Quest objects (${convertedQuests.reduce((sum, q) => sum + q.minutes, 0)}min total)`);
    return convertedQuests;
  }

  /**
   * Map Pre-Goal pattern to Quest pattern
   */
  private mapPreGoalPatternToQuest(preGoalPattern: string): Pattern {
    const patternMapping: Record<string, Pattern> = {
      'read_note_q': 'read_note_q',
      'flashcards': 'flashcards',
      'build_micro': 'build_micro',
      'config_verify': 'config_verify',
      'debug_explain': 'debug_explain',
      'feynman': 'feynman',
      'past_paper': 'past_paper',
      'socratic': 'socratic',
      'shadowing': 'shadowing',
      'retrospective': 'retrospective'
    };
    
    return patternMapping[preGoalPattern] || 'read_note_q'; // Default fallback
  }

  /**
   * Apply enhanced one-day guarantees with Pre-Goal awareness
   */
  private applyEnhancedOneDayGuarantees(
    quests: Quest[],
    constraints: {
      maxQuests: number;
      maxSessionMinutes: number;
      totalTimeTarget: number;
      dayType: string;
      preGoalOptimized: boolean;
    },
    rationale: string[]
  ): Quest[] {
    rationale.push(`🎯 Applying enhanced one-day guarantees (Pre-Goal optimized: ${constraints.preGoalOptimized})`);
    
    let guaranteedQuests = [...quests];
    
    // Step 1: Respect quest count limit
    if (guaranteedQuests.length > constraints.maxQuests) {
      // Prioritize first N quests (Pre-Goal ordered by importance)
      guaranteedQuests = guaranteedQuests.slice(0, constraints.maxQuests);
      rationale.push(`   ✂️  Limited to ${constraints.maxQuests} quests (Pre-Goal priority order)`);
    }
    
    // Step 2: Enforce session length limits
    guaranteedQuests = guaranteedQuests.map(quest => ({
      ...quest,
      minutes: Math.min(quest.minutes, constraints.maxSessionMinutes)
    }));
    
    // Step 3: Adjust total time with Pre-Goal awareness
    const currentTotal = guaranteedQuests.reduce((sum, q) => sum + q.minutes, 0);
    if (currentTotal > constraints.totalTimeTarget) {
      const scale = constraints.totalTimeTarget / currentTotal;
      guaranteedQuests = guaranteedQuests.map(quest => ({
        ...quest,
        minutes: Math.max(15, Math.round(quest.minutes * scale)) // Maintain 15min minimum
      }));
      rationale.push(`   📊 Scaled by ${scale.toFixed(2)} for ${constraints.totalTimeTarget}min target`);
    }
    
    // Step 4: Ensure all required completion fields are present
    guaranteedQuests = guaranteedQuests.map(quest => ({
      ...quest,
      done_definition: quest.done_definition || this.generateDoneDefinition(quest),
      evidence: quest.evidence && quest.evidence.length > 0 ? quest.evidence : this.generateEvidence(quest),
      alt_plan: quest.alt_plan || this.generateAlternativePlan(quest, 'normal'),
      stop_rule: quest.stop_rule || this.generateStopRule(quest, quest.minutes)
    }));
    
    const finalTotal = guaranteedQuests.reduce((sum, q) => sum + q.minutes, 0);
    rationale.push(`   ✅ Enhanced guarantees applied: ${guaranteedQuests.length} quests, ${finalTotal}min total`);
    
    return guaranteedQuests;
  }

  /**
   * Validate with Pre-Goal critique and rubric
   */
  private async validateWithPreGoalCritique(
    quests: Quest[],
    preGoalAnalysis: PreGoalAnalysisResult,
    rationale: string[]
  ): Promise<Quest[]> {
    rationale.push('🔍 Validating with Pre-Goal Analysis rubric...');
    
    // Calculate Pre-Goal rubric metrics
    const rubricScores = {
      relevance: this.calculatePreGoalRelevance(quests, preGoalAnalysis),
      feasibility: this.calculatePreGoalFeasibility(quests, preGoalAnalysis),
      specificity: this.calculatePreGoalSpecificity(quests),
      load_fit: this.calculatePreGoalLoadFit(quests, preGoalAnalysis)
    };
    
    rationale.push(`   📊 Pre-Goal rubric scores: R=${rubricScores.relevance.toFixed(2)} F=${rubricScores.feasibility.toFixed(2)} S=${rubricScores.specificity.toFixed(2)} L=${rubricScores.load_fit.toFixed(2)}`);
    
    // Check thresholds from plan
    const thresholds = { relevance: 0.85, feasibility: 0.80, specificity: 0.85, load_fit: 1.0 };
    let needsRevision = false;
    const issues: string[] = [];
    
    Object.entries(rubricScores).forEach(([metric, score]) => {
      const threshold = thresholds[metric as keyof typeof thresholds];
      if (score < threshold) {
        needsRevision = true;
        issues.push(`${metric}: ${score.toFixed(2)} < ${threshold}`);
      }
    });
    
    if (needsRevision) {
      rationale.push(`   ⚠️  Revision needed: ${issues.join(', ')}`);
      // Apply targeted improvements based on Pre-Goal analysis
      const improvedQuests = this.improveQuestsWithPreGoalGuidance(quests, preGoalAnalysis, rubricScores, rationale);
      rationale.push('   ✅ Pre-Goal guided improvements applied');
      return improvedQuests;
    } else {
      rationale.push('   ✅ All Pre-Goal rubric thresholds met');
      return quests;
    }
  }

  /**
   * Calculate Pre-Goal relevance score
   */
  private calculatePreGoalRelevance(quests: Quest[], preGoalAnalysis: PreGoalAnalysisResult): number {
    const domainKeywords = this.getPreGoalDomainKeywords(preGoalAnalysis.classification.domain);
    const goalKeywords = preGoalAnalysis.normalized_goal.toLowerCase().split(/\s+/);
    
    let relevantCount = 0;
    quests.forEach(quest => {
      const questText = `${quest.title} ${quest.deliverable} ${quest.tags.join(' ')}`.toLowerCase();
      const hasRelevantKeywords = [...domainKeywords, ...goalKeywords].some(keyword => 
        questText.includes(keyword.toLowerCase())
      );
      if (hasRelevantKeywords) relevantCount++;
    });
    
    return quests.length > 0 ? relevantCount / quests.length : 0;
  }

  /**
   * Calculate Pre-Goal feasibility score
   */
  private calculatePreGoalFeasibility(quests: Quest[], preGoalAnalysis: PreGoalAnalysisResult): number {
    const complexityPenalty = { 'beginner': 0, 'intermediate': 0.1, 'advanced': 0.2 };
    const penalty = complexityPenalty[preGoalAnalysis.classification.complexity as keyof typeof complexityPenalty] || 0;
    
    let feasibleCount = 0;
    quests.forEach(quest => {
      const adjustedDifficulty = quest.difficulty + penalty;
      const timeReasonable = quest.minutes >= 15 && quest.minutes <= 45;
      const difficultyReasonable = adjustedDifficulty <= 0.7;
      
      if (timeReasonable && difficultyReasonable) feasibleCount++;
    });
    
    return quests.length > 0 ? feasibleCount / quests.length : 0;
  }

  /**
   * Calculate Pre-Goal specificity score
   */
  private calculatePreGoalSpecificity(quests: Quest[]): number {
    let specificCount = 0;
    quests.forEach(quest => {
      const hasDoneDefinition = quest.done_definition && quest.done_definition.length > 10;
      const hasEvidence = quest.evidence && quest.evidence.length > 0;
      const hasDetailedSteps = quest.steps && quest.steps.length >= 3;
      
      if (hasDoneDefinition && hasEvidence && hasDetailedSteps) specificCount++;
    });
    
    return quests.length > 0 ? specificCount / quests.length : 0;
  }

  /**
   * Calculate Pre-Goal load fit score
   */
  private calculatePreGoalLoadFit(quests: Quest[], preGoalAnalysis: PreGoalAnalysisResult): number {
    const totalTime = quests.reduce((sum, q) => sum + q.minutes, 0);
    const targetTime = preGoalAnalysis.first_day_seed.total_minutes_max || 90;
    
    return totalTime <= targetTime ? 1.0 : targetTime / totalTime;
  }

  /**
   * Get domain-specific keywords for relevance scoring
   */
  private getPreGoalDomainKeywords(domain: string): string[] {
    const domainKeywords: Record<string, string[]> = {
      'programming': ['プログラミング', 'コード', 'アプリ', '開発', 'システム'],
      'language': ['英語', '言語', '会話', 'speaking', 'listening'],
      'business': ['ビジネス', '営業', '経営', 'マーケティング'],
      'creative': ['創作', 'デザイン', 'アート', '表現'],
      'academic': ['学習', '勉強', '研究', '知識'],
      'fitness': ['健康', '運動', 'トレーニング', 'フィットネス'],
      'general': ['目標', '習慣', '改善', '成長']
    };
    
    return domainKeywords[domain] || domainKeywords['general'];
  }

  /**
   * Improve quests with Pre-Goal guidance
   */
  private improveQuestsWithPreGoalGuidance(
    quests: Quest[],
    preGoalAnalysis: PreGoalAnalysisResult,
    scores: any,
    rationale: string[]
  ): Quest[] {
    let improvedQuests = [...quests];
    
    // Improve relevance by incorporating Pre-Goal terminology
    if (scores.relevance < 0.85) {
      const domainKeywords = this.getPreGoalDomainKeywords(preGoalAnalysis.classification.domain);
      improvedQuests = improvedQuests.map(quest => ({
        ...quest,
        tags: [...quest.tags, preGoalAnalysis.classification.domain, preGoalAnalysis.classification.learning_type].slice(0, 5)
      }));
    }
    
    // Improve feasibility by adjusting difficulty based on Pre-Goal complexity
    if (scores.feasibility < 0.80) {
      const maxDifficulty = preGoalAnalysis.classification.complexity === 'beginner' ? 0.5 :
                           preGoalAnalysis.classification.complexity === 'intermediate' ? 0.6 : 0.7;
      improvedQuests = improvedQuests.map(quest => ({
        ...quest,
        difficulty: Math.min(quest.difficulty, maxDifficulty)
      }));
    }
    
    // Improve specificity with Pre-Goal structure
    if (scores.specificity < 0.85) {
      improvedQuests = improvedQuests.map(quest => ({
        ...quest,
        done_definition: quest.done_definition || `${preGoalAnalysis.classification.learning_type}における${quest.title}の完了`,
        evidence: quest.evidence?.length > 0 ? quest.evidence : [`${quest.title}の実践記録`, '進捗メモ'],
        steps: quest.steps?.length >= 3 ? quest.steps : [
          `${quest.title}の準備・確認`,
          `実際に${quest.title}を実行`,
          `結果の確認・記録`
        ]
      }));
    }
    
    return improvedQuests;
  }

  /**
   * Estimate completion rate for enhanced quests
   */
  private estimateCompletionRate(quests: Quest[], dayType: string, totalTimeTarget: number): number {
    const baseRates = { busy: 0.70, normal: 0.85, deep: 0.95 };
    const baseRate = baseRates[dayType as keyof typeof baseRates] || 0.85;
    
    // Adjust based on total time vs target
    const totalTime = quests.reduce((sum, q) => sum + q.minutes, 0);
    const timeEfficiency = totalTime <= totalTimeTarget ? 1.0 : totalTimeTarget / totalTime;
    
    // Adjust based on average difficulty
    const avgDifficulty = quests.reduce((sum, q) => sum + q.difficulty, 0) / quests.length;
    const difficultyBonus = avgDifficulty <= 0.5 ? 0.05 : 0;
    
    return Math.min(0.95, baseRate * timeEfficiency + difficultyBonus);
  }
}

export const enhancedQuestService = new EnhancedQuestService();
export { EnhancedQuestService };
