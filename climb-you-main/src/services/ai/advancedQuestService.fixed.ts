import { apiKeyManager } from '../../config/apiKeys';
import { openaiService, QuestGeneration } from './openaiService';
import { EnvironmentConfig } from '../../config/environmentConfig';
import {
  ProfileV1,
  Derived,
  DailyCheckins,
  SkillAtom,
  Quest,
  QuestList,
  Constraints,
  Pattern,
  buildDerived,
  buildConstraints,
  clampToSession,
  avoidConsecutiveSamePattern,
} from './promptEngine';

class AdvancedQuestService {
  private initialized = false;
  private useRealAI = false;

  initialize(): boolean {
    // 統一環境設定を使用
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    
    if (envInfo.mode === 'demo' || !envInfo.aiEnabled) {
      this.useRealAI = false;
      console.log(`🎭 Advanced Quest Service: ${envInfo.mode.toUpperCase()} mode - AI disabled`);
    } else {
      const apiKey = apiKeyManager.getOpenAIKey();
      if (apiKey && apiKeyManager.isAIEnabled()) {
        openaiService.initialize(apiKey);
        this.useRealAI = true;
        console.log('🤖 Advanced Quest Service: PRODUCTION mode - AI enabled');
      } else {
        this.useRealAI = false;
        console.log('🎭 Advanced Quest Service: Mock mode enabled (no API key)');
      }
    }
    
    console.log('📊 Environment Info:', JSON.stringify(envInfo, null, 2));
    this.initialized = true;
    return true;
  }

  initializeWithKey(apiKey: string): void {
    openaiService.initialize(apiKey);
    this.useRealAI = true;
    this.initialized = true;
    console.log('🤖 Advanced Quest Service: AI mode enabled with provided key');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getDiagnosticInfo(): {
    isInitialized: boolean;
    apiKeyAvailable: boolean;
    aiEnabled: boolean;
    useRealAI: boolean;
    configuration: any;
    lastError?: string;
  } {
    const diagnosis = apiKeyManager.diagnoseConfiguration();
    return {
      isInitialized: this.isInitialized(),
      apiKeyAvailable: !!apiKeyManager.getOpenAIKey(),
      aiEnabled: apiKeyManager.isAIEnabled(),
      useRealAI: this.useRealAI,
      configuration: diagnosis,
    };
  }

  /**
   * Quest generation with validation and fallback
   */
  async generateValidatedQuests(args: {
    goalText: string;
    profile: ProfileV1;
    currentLevelTags?: string[];
    priorityAreas?: string[];
    checkins?: DailyCheckins;
  }): Promise<{ 
    success: boolean; 
    skillAtoms: SkillAtom[]; 
    questsCandidate: Quest[]; 
    finalQuests: QuestList;
    usedAI: boolean;
    warnings?: string[];
  }> {
    const warnings: string[] = [];
    let usedAI = this.useRealAI;

    try {
      const result = await this.generateOptimizedQuests(args);
      
      // Validation checks
      if (result.finalQuests.quests.length === 0) {
        warnings.push('クエストが生成されませんでした');
      }
      
      const totalTime = result.finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0);
      if (totalTime > args.profile.time_budget_min_per_day * 1.2) {
        warnings.push(`総時間が予算を超過しています (${totalTime}分 > ${args.profile.time_budget_min_per_day}分)`);
      }
      
      // Check for variety in quest patterns
      const patterns = result.finalQuests.quests.map(q => q.pattern);
      const uniquePatterns = new Set(patterns);
      if (uniquePatterns.size === 1 && patterns.length > 1) {
        warnings.push('クエストのバラエティを改善できます');
      }

      return {
        success: true,
        ...result,
        usedAI,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
      
    } catch (error) {
      console.error('Quest generation failed:', error);
      
      // Fallback to mock if AI fails
      if (this.useRealAI) {
        console.log('🚨 Falling back to mock generation due to AI failure');
        this.useRealAI = false;
        const fallbackResult = await this.generateOptimizedQuests(args);
        this.useRealAI = true; // Restore AI mode
        
        return {
          success: true,
          ...fallbackResult,
          usedAI: false,
          warnings: ['AI生成が失敗し、モックデータを使用しました'],
        };
      }
      
      throw error;
    }
  }

  /**
   * Performance monitoring
   */
  async generateQuestsWithMetrics(args: {
    goalText: string;
    profile: ProfileV1;
    currentLevelTags?: string[];
    priorityAreas?: string[];
    checkins?: DailyCheckins;
  }): Promise<{
    result: { 
      success: boolean; 
      skillAtoms: SkillAtom[]; 
      questsCandidate: Quest[]; 
      finalQuests: QuestList;
      usedAI: boolean;
      warnings?: string[];
    };
    metrics: {
      duration: number;
      questCount: number;
      totalMinutes: number;
      averageDifficulty: number;
    };
  }> {
    const startTime = Date.now();
    
    const result = await this.generateValidatedQuests(args);
    
    const duration = Date.now() - startTime;
    const questCount = result.finalQuests.quests.length;
    const totalMinutes = result.finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0);
    const averageDifficulty = result.finalQuests.quests.reduce((sum, q) => sum + q.difficulty, 0) / questCount;
    
    return {
      result,
      metrics: {
        duration,
        questCount,
        totalMinutes,
        averageDifficulty: Math.round(averageDifficulty * 100) / 100,
      },
    };
  }

  async generateSkillMap(args: {
    goalText: string;
    currentLevelTags?: string[];
    priorityAreas?: string[];
  }): Promise<SkillAtom[]> {
    if (!this.useRealAI) {
      // Enhanced mock with more variety based on goal
      const goalKeywords = args.goalText.toLowerCase();
      const skillCount = goalKeywords.includes('advanced') ? 15 : goalKeywords.includes('basic') ? 8 : 12;
      
      const base: SkillAtom[] = Array.from({ length: skillCount }).map((_, i) => ({
        id: `${args.goalText.substring(0, 10).replace(/\s+/g, '_').toLowerCase()}.skill.${i + 1}`,
        label: `${args.goalText}関連スキル${i + 1}`,
        type: (i % 3 === 0 ? 'concept' : i % 3 === 1 ? 'procedure' : 'habit') as SkillAtom['type'],
        level: (i < 4 ? 'intro' : i < 8 ? 'basic' : 'intermediate') as SkillAtom['level'],
        bloom: ['understand', 'apply', 'analyze', 'create'][i % 4] as SkillAtom['bloom'],
        prereq: i > 2 ? [`${args.goalText.substring(0, 10).replace(/\s+/g, '_').toLowerCase()}.skill.${i - 2}`] : [],
        representative_tasks: [`${args.goalText}に関する実践タスク${i + 1}を完了する`],
        suggested_patterns: ['read_note_q', 'build_micro', 'flashcards', 'past_paper'][Math.floor(Math.random() * 4)] as any,
      }));
      return base;
    }

    // Real AI implementation for skill map generation
    try {
      console.log('🤖 Generating AI-powered skill map for goal:', args.goalText);
      const aiSkillAtoms = await openaiService.generateSkillMap(
        args.goalText,
        args.currentLevelTags,
        args.priorityAreas
      );
      
      // Convert AI response to SkillAtom format
      const skillAtoms: SkillAtom[] = aiSkillAtoms.map(atom => ({
        id: atom.id || `${args.goalText.substring(0, 10).replace(/\\s+/g, '_').toLowerCase()}.skill.${Math.random().toString(36).substr(2, 9)}`,
        label: atom.label,
        type: atom.type,
        level: atom.level,
        bloom: atom.bloom,
        prereq: atom.prereq || [],
        representative_tasks: Array.isArray(atom.representative_tasks) ? atom.representative_tasks : [atom.representative_tasks],
        suggested_patterns: Array.isArray(atom.suggested_patterns) ? atom.suggested_patterns : [atom.suggested_patterns],
      }));
      
      console.log(`✅ AI Skill Map generated successfully: ${skillAtoms.length} skill atoms`);
      return skillAtoms;
    } catch (error) {
      console.error('❌ AI Skill Map generation failed, falling back to enhanced mock:', error);
      // FIXED: Use direct mock generation instead of recursive call
      const goalKeywords = args.goalText.toLowerCase();
      const skillCount = goalKeywords.includes('advanced') ? 15 : goalKeywords.includes('basic') ? 8 : 12;
      
      const base: SkillAtom[] = Array.from({ length: skillCount }).map((_, i) => ({
        id: `${args.goalText.substring(0, 10).replace(/\\s+/g, '_').toLowerCase()}.skill.${i + 1}`,
        label: `${args.goalText}関連スキル${i + 1}`,
        type: (i % 3 === 0 ? 'concept' : i % 3 === 1 ? 'procedure' : 'habit') as SkillAtom['type'],
        level: (i < 4 ? 'intro' : i < 8 ? 'basic' : 'intermediate') as SkillAtom['level'],
        bloom: ['understand', 'apply', 'analyze', 'create'][i % 4] as SkillAtom['bloom'],
        prereq: i > 2 ? [`${args.goalText.substring(0, 10).replace(/\\s+/g, '_').toLowerCase()}.skill.${i - 2}`] : [],
        representative_tasks: [`${args.goalText}に関する実践タスク${i + 1}を完了する`],
        suggested_patterns: ['read_note_q', 'build_micro', 'flashcards', 'past_paper'][Math.floor(Math.random() * 4)] as any,
      }));
      return base;
    }
  }

  async generateDailyQuests(args: {
    profile: ProfileV1;
    skillAtoms: SkillAtom[];
    checkins?: DailyCheckins;
  }): Promise<Quest[]> {
    if (!this.useRealAI) {
      // Enhanced mock based on profile preferences
      const sessionLength = args.profile.preferred_session_length_min ?? 20;
      const questCount = Math.min(5, Math.max(3, Math.floor(args.profile.time_budget_min_per_day / sessionLength)));
      
      const questTemplates = [
        {
          title: `${args.profile.long_term_goal || '学習'}の基礎要点メモ`,
          pattern: 'read_note_q' as const,
          baseMinutes: 20,
          difficulty: 0.3,
          deliverable: '学習ノート',
          steps: ['重要な要点を3つ抽出', '理解した内容を簡潔にまとめる'],
          criteria: ['メインポイントを理解し説明できる'],
          tags: ['basic', 'note'],
        },
        {
          title: `${args.profile.long_term_goal || '学習'}用語集`,
          pattern: 'flashcards' as const,
          baseMinutes: 15,
          difficulty: 0.4,
          deliverable: 'フラッシュカード15果',
          steps: ['重要用語を選択', '理解しやすい定義を作成'],
          criteria: ['用語と意味を正確に答えられる'],
          tags: ['memory', 'vocabulary'],
        },
        {
          title: `${args.profile.long_term_goal || '学習'}の実践タスク`,
          pattern: 'build_micro' as const,
          baseMinutes: 25,
          difficulty: 0.5,
          deliverable: '実践成果物',
          steps: ['具体的な目標を設定', 'ステップバイステップで実行'],
          criteria: ['成果物が機能し確認できる'],
          tags: ['practice', 'application'],
        },
        {
          title: `${args.profile.long_term_goal || '学習'}の理解度テスト`,
          pattern: 'past_paper' as const,
          baseMinutes: 30,
          difficulty: 0.6,
          deliverable: '理解度確認シート',
          steps: ['理解した内容を自分でテスト', '弱点を特定し改善点を明確化'],
          criteria: ['理解度が80%以上であることを確認'],
          tags: ['assessment', 'review'],
        },
      ];

      const selectedQuests = questTemplates
        .slice(0, questCount)
        .map((template, i) => ({
          title: template.title,
          pattern: template.pattern,
          minutes: clampToSession(
            template.baseMinutes + (i * 2), // Slight variation
            sessionLength
          ),
          difficulty: Math.min(1.0, template.difficulty + (args.profile.difficulty_tolerance * 0.2)),
          deliverable: template.deliverable,
          steps: template.steps,
          criteria: template.criteria,
          knowledge_check: [],
          tags: template.tags,
        }));

      return selectedQuests;
    }

    // Real AI implementation
    try {
      const userProfile = {
        goals: [args.profile.long_term_goal || '一般的な学習'],
        responses: {
          time_budget: args.profile.time_budget_min_per_day,
          session_length: args.profile.preferred_session_length_min,
          difficulty_tolerance: args.profile.difficulty_tolerance,
          modality_preference: args.profile.modality_preference,
          deliverable_preferences: args.profile.deliverable_preferences,
          motivation_style: args.profile.motivation_style,
        },
        preferences: {
          current_level: args.profile.current_level_tags,
          priority_areas: args.profile.priority_areas,
        },
      };

      const questCount = Math.min(5, Math.max(3, Math.floor(args.profile.time_budget_min_per_day / (args.profile.preferred_session_length_min ?? 20))));
      const aiQuests = await openaiService.generateQuests(userProfile, questCount);
      
      // Convert AI quests to our Quest format
      const convertedQuests: Quest[] = aiQuests.map((aiQuest, i) => ({
        title: aiQuest.title,
        pattern: this.mapDifficultyToPattern(aiQuest.difficulty),
        minutes: clampToSession(aiQuest.estimatedTime, args.profile.preferred_session_length_min ?? 20),
        difficulty: this.mapDifficultyToNumber(aiQuest.difficulty),
        deliverable: this.extractDeliverable(aiQuest.description),
        steps: this.extractSteps(aiQuest.description),
        criteria: [`${aiQuest.title}を成功裏に完了する`],
        knowledge_check: [],
        tags: [aiQuest.category.toLowerCase(), aiQuest.difficulty],
      }));

      console.log(`🤖 Generated ${convertedQuests.length} AI-powered quests`);
      return convertedQuests;
      
    } catch (error) {
      console.error('AI Quest generation failed, falling back to direct mock:', error);
      // FIXED: Direct mock generation without recursion
      const sessionLength = args.profile.preferred_session_length_min ?? 20;
      const questCount = Math.min(5, Math.max(3, Math.floor(args.profile.time_budget_min_per_day / sessionLength)));
      
      const fallbackQuests: Quest[] = Array.from({ length: questCount }).map((_, i) => ({
        title: `${args.profile.long_term_goal || '学習'}タスク${i + 1}`,
        pattern: ['read_note_q', 'build_micro', 'flashcards', 'past_paper'][i % 4] as Pattern,
        minutes: clampToSession(20 + (i * 5), sessionLength),
        difficulty: 0.4 + (i * 0.1),
        deliverable: i % 2 === 0 ? 'メモ' : '実践物',
        steps: ['タスクを開始', '内容を確認', '完了を確認'],
        criteria: ['タスクが完了している'],
        knowledge_check: [],
        tags: ['fallback', `task${i + 1}`],
      }));
      
      return fallbackQuests;
    }
  }

  async policyCheck(args: {
    quests: Quest[];
    profile: ProfileV1;
    checkins?: DailyCheckins;
  }): Promise<QuestList> {
    const derived: Derived = buildDerived(args.profile);
    const constraints: Constraints = buildConstraints(args.profile, derived, args.checkins ?? {
      mood_energy: 'mid',
      available_time_today_delta_min: 0,
      focus_noise: 'mid',
    });

    const result: QuestList = { quests: [...args.quests], rationale: ['ポリシー適用（モック）'] };
    const total = result.quests.reduce((s, q) => s + q.minutes, 0);
    if (total > constraints.total_minutes_max) {
      const scale = constraints.total_minutes_max / total;
      result.quests = result.quests.map((q) => ({ ...q, minutes: Math.max(10, Math.round(q.minutes * scale)) }));
    }
    result.quests = avoidConsecutiveSamePattern(result.quests);
    return result;
  }

  async generateOptimizedQuests(args: {
    goalText: string;
    profile: ProfileV1;
    currentLevelTags?: string[];
    priorityAreas?: string[];
    checkins?: DailyCheckins;
  }): Promise<{ skillAtoms: SkillAtom[]; questsCandidate: Quest[]; finalQuests: QuestList }> {
    const skillAtoms = await this.generateSkillMap({
      goalText: args.goalText,
      currentLevelTags: args.currentLevelTags,
      priorityAreas: args.priorityAreas,
    });
    const questsCandidate = await this.generateDailyQuests({ profile: args.profile, skillAtoms, checkins: args.checkins });
    const finalQuests = await this.policyCheck({ quests: questsCandidate, profile: args.profile, checkins: args.checkins });
    return { skillAtoms, questsCandidate, finalQuests };
  }

  createBasicProfile(args: {
    goalText: string;
    timeBudgetMin: number;
    motivation: 'low' | 'mid' | 'high';
    sessionLength?: number;
  }): ProfileV1 {
    return {
      time_budget_min_per_day: args.timeBudgetMin,
      peak_hours: [9, 10, 11, 14, 15, 16],
      env_constraints: [],
      hard_constraints: [],
      motivation_style: 'pull',
      difficulty_tolerance: 0.5,
      novelty_preference: 0.5,
      pace_preference: 'cadence',
      long_term_goal: args.goalText,
      current_level_tags: [],
      priority_areas: [],
      heat_level: 3,
      risk_factors: [],
      preferred_session_length_min: args.sessionLength ?? 20,
      modality_preference: ['read', 'video'],
      deliverable_preferences: ['note'],
      weekly_minimum_commitment_min: Math.floor(args.timeBudgetMin * 7 * 0.8),
      goal_motivation: args.motivation,
    };
  }

  // Helper methods for AI quest conversion
  private mapDifficultyToPattern(difficulty: 'easy' | 'medium' | 'hard'): Quest['pattern'] {
    const patterns = {
      easy: 'read_note_q',
      medium: 'flashcards',
      hard: 'build_micro'
    } as const;
    return patterns[difficulty];
  }

  private mapDifficultyToNumber(difficulty: 'easy' | 'medium' | 'hard'): number {
    const mapping = { easy: 0.3, medium: 0.5, hard: 0.7 };
    return mapping[difficulty];
  }

  private extractDeliverable(description: string): string {
    // Simple extraction - look for common deliverable keywords
    const deliverablePatterns = [
      /ノート/g, /メモ/g, /カード/g, /サンプル/g, /レポート/g,
      /ファイル/g, /コード/g, /計画/g, /一覧/g
    ];
    
    for (const pattern of deliverablePatterns) {
      const match = description.match(pattern);
      if (match) return match[0];
    }
    return '学習成果物';
  }

  private extractSteps(description: string): string[] {
    // Simple step extraction from description
    const sentences = description.split(/[。、]/g).filter(s => s.trim().length > 0);
    if (sentences.length >= 2) {
      return sentences.slice(0, 3).map(s => s.trim());
    }
    return ['タスクを開始する', '内容を実行する', '結果を確認する'];
  }

  async generateCustom(args: {
    userGoal: string;
    timeConstraintMinutes?: number;
    userPreferences?: { difficulty: string };
    customPrompt: string;
    temperature?: number;
  }): Promise<string> {
    if (!this.useRealAI) {
      return `カスタムクエスト: ${args.userGoal}に関する${args.timeConstraintMinutes || 20}分のタスクを実行してください。`;
    }

    try {
      const userProfile = {
        goals: [args.userGoal],
        responses: {
          time_constraint: args.timeConstraintMinutes,
          difficulty_preference: args.userPreferences?.difficulty,
          custom_request: args.customPrompt,
        },
      };

      const quests = await openaiService.generateQuests(userProfile, 1);
      return quests[0]?.description || 'カスタムクエストが生成されました。';
    } catch (error) {
      console.error('Custom quest generation failed:', error);
      return `カスタムクエスト: ${args.userGoal}に関する${args.timeConstraintMinutes || 20}分のタスクを実行してください。`;
    }
  }

  async generateQuest(args: {
    userGoal: string;
    timeConstraintMinutes?: number;
    userPreferences?: { difficulty: string };
    customPrompt: string;
  }): Promise<string> {
    return this.generateCustom(args);
  }
}

export const advancedQuestService = new AdvancedQuestService();

export type {
  ProfileV1,
  Derived,
  DailyCheckins,
  SkillAtom,
  Quest,
  QuestList,
  Constraints,
} from './promptEngine';

