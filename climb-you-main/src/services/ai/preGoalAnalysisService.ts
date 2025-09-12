/**
 * Pre-Goal Analysis Service
 * 
 * 目標事前分析システム：ユーザーの目標を包括的に分析し、
 * 後続のフェーズ1-4で活用される構造化データを生成
 */

import { z } from 'zod';
import { advancedQuestService } from './advancedQuestService.fixed';
import { FewshotRetriever } from './retriever';
import { PatternEnum } from './promptEngine';

// Pre-Goal Analysis のスキーマ定義
export const PreGoalClassificationSchema = z.object({
  domain: z.enum(['language', 'programming', 'business', 'creative', 'academic', 'fitness', 'general']),
  subdomain: z.string(),
  learning_type: z.enum(['knowledge', 'skill', 'habit', 'outcome']),
  complexity: z.enum(['beginner', 'intermediate', 'advanced']),
  horizon_weeks: z.number().int().min(1).max(52)
});

export const PreGoalOutcomeMetricSchema = z.object({
  name: z.string(),
  target: z.union([z.string(), z.number()]),
  unit: z.string().nullable(),
  baseline: z.union([z.string(), z.number()]).nullable(),
  deadline: z.string().nullable() // YYYY-MM-DD format
});

export const PreGoalBackcastSchema = z.object({
  outcome: z.object({
    kpi: z.string(),
    why: z.string()
  }),
  intermediate: z.array(z.object({
    kpi: z.string(),
    why: z.string(),
    confidence: z.number().min(0).max(1)
  })).min(2).max(4),
  behavior: z.array(z.object({
    kpi: z.string(),
    cadence: z.string(),
    estimate_min_per_week: z.number().int().min(15).max(600)
  })).min(3).max(6)
});

export const PreGoalPrerequisiteSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['concept', 'procedure', 'habit']),
  why: z.string()
});

export const PreGoalFirstDaySeedSchema = z.object({
  total_minutes_max: z.number().int().default(90),
  quests: z.array(z.object({
    title: z.string(),
    pattern: PatternEnum,
    minutes: z.number().int().min(15).max(45),
    difficulty: z.number().min(0).max(1),
    deliverable: z.string(),
    steps: z.array(z.string()).length(3),
    done_definition: z.string(),
    evidence: z.array(z.string()).min(1),
    alt_plan: z.string(),
    stop_rule: z.string(),
    tags: z.array(z.string())
  })).min(2).max(3)
});

export const PreGoalRiskTriageSchema = z.object({
  overload: z.boolean(),
  dependency: z.boolean(),
  uncertainty: z.boolean(),
  notes: z.array(z.string())
});

export const PreGoalQuestionHintSchema = z.object({
  dataKey: z.enum(['novelty_preference', 'review_cadence', 'goal_evidence', 'capstone_type', 'scope_style', 'goal_focus', 'difficulty_bias']),
  question: z.string(),
  reason: z.string(),
  info_gain_est: z.number().min(0).max(1),
  depends_on: z.string().nullable()
});

export const PreGoalConfidenceSchema = z.object({
  classification: z.number().min(0).max(1),
  outcome_metric: z.number().min(0).max(1),
  backcast: z.number().min(0).max(1)
});

export const PreGoalRubricScoresSchema = z.object({
  relevance: z.number().min(0).max(1),
  feasibility: z.number().min(0).max(1),
  specificity: z.number().min(0).max(1),
  load_fit: z.number().min(0).max(1)
});

export const PreGoalAnalysisResultSchema = z.object({
  normalized_goal: z.string(),
  classification: PreGoalClassificationSchema,
  outcome_metric: PreGoalOutcomeMetricSchema,
  backcast: PreGoalBackcastSchema,
  prerequisites: z.array(PreGoalPrerequisiteSchema),
  first_day_seed: PreGoalFirstDaySeedSchema,
  risk_triage: PreGoalRiskTriageSchema,
  question_hints: z.array(PreGoalQuestionHintSchema),
  confidence: PreGoalConfidenceSchema,
  rubric_scores: PreGoalRubricScoresSchema,
  revise_note: z.string().nullable()
});

export type PreGoalAnalysisResult = z.infer<typeof PreGoalAnalysisResultSchema>;
export type PreGoalClassification = z.infer<typeof PreGoalClassificationSchema>;
export type PreGoalQuestionHint = z.infer<typeof PreGoalQuestionHintSchema>;

interface PreGoalAnalysisInput {
  goal_text: string;
  timeframe_hint?: string; // '1m|3m|6m|12m+|YYYY-MM-DD|null'
  known_profile?: {
    fields: Record<string, any>;
    confidence: Record<string, number>;
  };
}

export class PreGoalAnalysisService {

  /**
   * Convenience wrapper for OnboardingOrchestrationService
   */
  static async analyze(
    goalText: string, 
    timeframeHint?: string, 
    knownProfile?: { fields: Record<string, any>; confidence: Record<string, number>; }
  ): Promise<PreGoalAnalysisResult> {
    return this.analyzeGoal({
      goal_text: goalText,
      timeframe_hint: timeframeHint,
      known_profile: knownProfile
    });
  }

  /**
   * Generate fallback analysis for OnboardingOrchestrationService
   */
  static async generateFallback(
    goalText: string,
    timeframeHint: string,
    knownProfile: { fields: Record<string, any>; confidence: Record<string, number>; }
  ): Promise<PreGoalAnalysisResult> {
    return this.generateFallbackAnalysis({
      goal_text: goalText,
      timeframe_hint: timeframeHint,
      known_profile: knownProfile
    });
  }

  /**
   * メイン分析エントリーポイント
   */
  static async analyzeGoal(input: PreGoalAnalysisInput): Promise<PreGoalAnalysisResult> {
    console.log('🔍 Starting pre-goal analysis for:', input.goal_text);
    
    try {
      // Step 1: Few-shot例の取得
      const fewshotContext = {
        goalText: input.goal_text,
        goalCategory: 'general', // 初期値、後で更新
        learningLevel: input.known_profile?.fields?.learning_level,
        timeBudget: input.known_profile?.fields?.time_budget_min_per_day
      };
      
      const fewshotResult = FewshotRetriever.retrieveExamples(fewshotContext);
      const fewshotExamples = FewshotRetriever.formatExamplesForPrompt(fewshotResult.examples);
      
      // Step 2: 分析プロンプト生成
      const analysisPrompt = this.buildAnalysisPrompt(input, fewshotExamples);
      
      // Step 3: AI分析実行
      const aiResult = await this.executeAnalysis(analysisPrompt, input);
      
      // Step 4: 結果検証・補完
      const validatedResult = this.validateAndEnhance(aiResult, input);
      
      console.log('✅ Pre-goal analysis completed:', {
        domain: validatedResult.classification.domain,
        questCount: validatedResult.first_day_seed.quests.length,
        questionHints: validatedResult.question_hints.length,
        confidence: validatedResult.confidence
      });
      
      return validatedResult;
      
    } catch (error) {
      console.error('Pre-goal analysis failed, using fallback:', error);
      return this.generateFallbackAnalysis(input);
    }
  }

  /**
   * 分析プロンプトを構築
   */
  private static buildAnalysisPrompt(input: PreGoalAnalysisInput, fewshotExamples: string): string {
    const knownProfileSection = input.known_profile ? `
既知のプロファイル情報:
${JSON.stringify(input.known_profile.fields, null, 2)}
信頼度: ${JSON.stringify(input.known_profile.confidence, null, 2)}` : '';

    const fewshotSection = fewshotExamples ? `
【参考例: 類似目標での分析パターン】
${fewshotExamples}` : '';

    return `あなたは目標分解と計画設計に特化したアナリストです。
入力された目標を、測定可能なKPI・バックキャスト（中間→行動）・前提スキル・1日で踏み出す最小プランに分解し、
不確実な領域を明らかにして「次に聞くべき質問候補」を情報利得順で提案してください。

厳守事項:
- JSONのみを出力（前後の説明テキストは禁止）。
- 値は具体的・測定可能に。曖昧語は避ける。
- 既知の時間/資源/制約を尊重。実行不可な案は出さない。
- 安全領域外（医療/法務/投資）は一般情報+専門家相談ディスクレーマを risk_triage.notes に含める。
- 自己採点(rubric_scores)で不足があれば、revise_note に改善要点を記す（再出力は不要）。

【分析対象】
目標: "${input.goal_text}"
期間ヒント: ${input.timeframe_hint || 'なし'}

${knownProfileSection}

${fewshotSection}

【出力スキーマ】
{
  "normalized_goal": "標準化された目標文",
  "classification": {
    "domain": "language|programming|business|creative|academic|fitness|general",
    "subdomain": "具体的なサブドメイン",
    "learning_type": "knowledge|skill|habit|outcome",
    "complexity": "beginner|intermediate|advanced",
    "horizon_weeks": "number (1-52)"
  },
  "outcome_metric": {
    "name": "測定指標名",
    "target": "数値目標または状態",
    "unit": "単位（なければnull）",
    "baseline": "現在値（わからなければnull）",
    "deadline": "YYYY-MM-DD（なければnull）"
  },
  "backcast": {
    "outcome": {
      "kpi": "最終成果KPI",
      "why": "なぜこのKPIか"
    },
    "intermediate": [
      {
        "kpi": "中間成果KPI",
        "why": "成果への貢献理由",
        "confidence": 0.8
      }
    ],
    "behavior": [
      {
        "kpi": "行動KPI（測定可能な活動）",
        "cadence": "頻度（daily/weekly/etc）",
        "estimate_min_per_week": 120
      }
    ]
  },
  "prerequisites": [
    {
      "id": "prereq_1",
      "label": "前提スキル・知識",
      "type": "concept|procedure|habit",
      "why": "なぜ必要か"
    }
  ],
  "first_day_seed": {
    "total_minutes_max": 90,
    "quests": [
      {
        "title": "初日クエスト名",
        "pattern": "read_note_q|flashcards|build_micro|config_verify|debug_explain|feynman|past_paper|socratic|shadowing|retrospective",
        "minutes": 30,
        "difficulty": 0.3,
        "deliverable": "成果物の説明",
        "steps": ["手順1", "手順2", "手順3"],
        "done_definition": "完了条件",
        "evidence": ["証拠1"],
        "alt_plan": "代替案",
        "stop_rule": "中断ルール",
        "tags": ["タグ1", "タグ2"]
      }
    ]
  },
  "risk_triage": {
    "overload": false,
    "dependency": false,
    "uncertainty": false,
    "notes": ["リスク・注意点"]
  },
  "question_hints": [
    {
      "dataKey": "novelty_preference|review_cadence|goal_evidence|capstone_type|scope_style|goal_focus|difficulty_bias",
      "question": "次に聞くべき質問",
      "reason": "この質問が重要な理由",
      "info_gain_est": 0.7,
      "depends_on": null
    }
  ],
  "confidence": {
    "classification": 0.9,
    "outcome_metric": 0.8,
    "backcast": 0.7
  },
  "rubric_scores": {
    "relevance": 0.9,
    "feasibility": 0.8,
    "specificity": 0.85,
    "load_fit": 1.0
  },
  "revise_note": null
}

生成ルール:
- outcome_metric には name/target/unit/deadline を可能な限り含める
- intermediate は2–4件、behavior は3–6件
- first_day_seed は2–3クエスト、各<=45分、合計<=90分
- 各クエストに done_definition/evidence/alt_plan/stop_rule を必須
- question_hints の dataKey は指定されたものから選択
- 医療/法務/投資などは risk_triage.notes にディスクレーマを追加
- 出力は厳密にJSONのみ

品質基準:
- relevance >=0.85
- feasibility >=0.80
- specificity >=0.85
- load_fit ==1.0`;
  }

  /**
   * AI分析を実行
   */
  private static async executeAnalysis(prompt: string, input: PreGoalAnalysisInput): Promise<any> {
    console.log('🔍 Executing Pre-Goal Analysis prompt...');
    console.log('🔍 Prompt length:', prompt.length, 'characters');
    console.log('🔍 Input goal:', input.goal_text);
    
    // AdvancedQuestService を初期化
    if (!advancedQuestService.isInitialized()) {
      console.log('🔧 Initializing AdvancedQuestService for Pre-Goal Analysis...');
      const initialized = advancedQuestService.initialize();
      console.log('🔧 AdvancedQuestService initialization result:', initialized);
    }

    if (!advancedQuestService.isInitialized()) {
      console.error('🔧 AdvancedQuestService initialization failed - service not available');
      throw new Error('AdvancedQuestService initialization failed');
    }

    console.log('🔍 Calling AdvancedQuestService.generateCustom...');
    const response = await advancedQuestService.generateCustom({
      userGoal: input.goal_text,
      timeConstraintMinutes: 90,
      userPreferences: { difficulty: 'medium' },
      customPrompt: prompt
    });
    
    console.log('🔍 AdvancedQuestService response received:', response?.length || 'no response');

    // JSONを抽出
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in pre-goal analysis response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  /**
   * 結果を検証・補完
   */
  private static validateAndEnhance(aiResult: any, input: PreGoalAnalysisInput): PreGoalAnalysisResult {
    // 基本的な補完
    const enhanced = {
      normalized_goal: aiResult.normalized_goal || input.goal_text,
      classification: {
        domain: aiResult.classification?.domain || 'general',
        subdomain: aiResult.classification?.subdomain || 'general_learning',
        learning_type: aiResult.classification?.learning_type || 'skill',
        complexity: aiResult.classification?.complexity || 'intermediate',
        horizon_weeks: aiResult.classification?.horizon_weeks || 12
      },
      outcome_metric: {
        name: aiResult.outcome_metric?.name || 'Goal Achievement',
        target: aiResult.outcome_metric?.target || '100% completion',
        unit: aiResult.outcome_metric?.unit || null,
        baseline: aiResult.outcome_metric?.baseline || null,
        deadline: aiResult.outcome_metric?.deadline || null
      },
      backcast: {
        outcome: {
          kpi: aiResult.backcast?.outcome?.kpi || `${input.goal_text}の達成`,
          why: aiResult.backcast?.outcome?.why || '最終目標の実現'
        },
        intermediate: aiResult.backcast?.intermediate?.length >= 2 
          ? aiResult.backcast.intermediate
          : [
              { kpi: '基礎スキル習得', why: '目標達成の基盤', confidence: 0.8 },
              { kpi: '実践的応用', why: '応用力の構築', confidence: 0.7 }
            ],
        behavior: aiResult.backcast?.behavior?.length >= 3
          ? aiResult.backcast.behavior
          : [
              { kpi: '毎日の学習時間', cadence: 'daily', estimate_min_per_week: 210 },
              { kpi: '週次の進捗確認', cadence: 'weekly', estimate_min_per_week: 30 },
              { kpi: '実践課題完了', cadence: 'weekly', estimate_min_per_week: 120 }
            ]
      },
      prerequisites: Array.isArray(aiResult.prerequisites) ? aiResult.prerequisites : [],
      first_day_seed: this.validateFirstDaySeed(aiResult.first_day_seed, input),
      risk_triage: {
        overload: aiResult.risk_triage?.overload || false,
        dependency: aiResult.risk_triage?.dependency || false,
        uncertainty: aiResult.risk_triage?.uncertainty || false,
        notes: Array.isArray(aiResult.risk_triage?.notes) ? aiResult.risk_triage.notes : []
      },
      question_hints: Array.isArray(aiResult.question_hints) ? aiResult.question_hints.slice(0, 5) : [],
      confidence: {
        classification: aiResult.confidence?.classification || 0.7,
        outcome_metric: aiResult.confidence?.outcome_metric || 0.6,
        backcast: aiResult.confidence?.backcast || 0.6
      },
      rubric_scores: {
        relevance: aiResult.rubric_scores?.relevance || 0.8,
        feasibility: aiResult.rubric_scores?.feasibility || 0.8,
        specificity: aiResult.rubric_scores?.specificity || 0.8,
        load_fit: aiResult.rubric_scores?.load_fit || 1.0
      },
      revise_note: aiResult.revise_note || null
    };

    // スキーマ検証
    try {
      return PreGoalAnalysisResultSchema.parse(enhanced);
    } catch (error) {
      console.warn('Pre-goal analysis validation failed, using enhanced version:', error);
      return enhanced as PreGoalAnalysisResult;
    }
  }

  /**
   * 初日シードクエストを検証・補完
   */
  private static validateFirstDaySeed(seedData: any, input: PreGoalAnalysisInput): any {
    if (!seedData?.quests || !Array.isArray(seedData.quests)) {
      return this.generateFallbackFirstDaySeed(input);
    }

    const validQuests = seedData.quests.filter((q: any) => 
      q.title && q.pattern && q.minutes > 0 && q.minutes <= 45
    ).slice(0, 3);

    if (validQuests.length < 2) {
      return this.generateFallbackFirstDaySeed(input);
    }

    // 時間調整
    const totalTime = validQuests.reduce((sum: number, q: any) => sum + q.minutes, 0);
    if (totalTime > 90) {
      const scale = 90 / totalTime;
      validQuests.forEach((q: any) => {
        q.minutes = Math.max(15, Math.round(q.minutes * scale));
      });
    }

    return {
      total_minutes_max: 90,
      quests: validQuests.map((q: any) => ({
        title: q.title,
        pattern: q.pattern,
        minutes: q.minutes,
        difficulty: Math.max(0, Math.min(1, q.difficulty || 0.3)),
        deliverable: q.deliverable || q.title,
        steps: Array.isArray(q.steps) ? q.steps.slice(0, 3) : [`${q.title}を開始`, '手順を実行', '結果を確認'],
        done_definition: q.done_definition || `${q.title}を完了し、成果を確認する`,
        evidence: Array.isArray(q.evidence) ? q.evidence : ['完了記録'],
        alt_plan: q.alt_plan || '時間短縮版で基本部分のみ実行',
        stop_rule: q.stop_rule || '15分経過したら代替案に切り替え',
        tags: Array.isArray(q.tags) ? q.tags : ['初日', '基礎']
      }))
    };
  }

  /**
   * フォールバック分析結果を生成
   */
  private static generateFallbackAnalysis(input: PreGoalAnalysisInput): PreGoalAnalysisResult {
    const domain = this.detectDomain(input.goal_text);
    
    return {
      normalized_goal: input.goal_text,
      classification: {
        domain,
        subdomain: 'general_learning',
        learning_type: 'skill',
        complexity: 'intermediate',
        horizon_weeks: 12
      },
      outcome_metric: {
        name: 'Goal Achievement',
        target: '目標達成',
        unit: null,
        baseline: null,
        deadline: null
      },
      backcast: {
        outcome: {
          kpi: `${input.goal_text}の達成`,
          why: '設定した学習目標の完全な実現'
        },
        intermediate: [
          { kpi: '基礎知識の習得', why: '目標達成の基盤構築', confidence: 0.8 },
          { kpi: '実践スキルの向上', why: '応用力の構築', confidence: 0.7 }
        ],
        behavior: [
          { kpi: '毎日の学習実践', cadence: 'daily', estimate_min_per_week: 210 },
          { kpi: '週次進捗確認', cadence: 'weekly', estimate_min_per_week: 30 },
          { kpi: '実践課題完了', cadence: 'weekly', estimate_min_per_week: 120 }
        ]
      },
      prerequisites: [
        {
          id: 'basic_motivation',
          label: '学習への動機',
          type: 'habit',
          why: '継続的な学習に必要'
        }
      ],
      first_day_seed: this.generateFallbackFirstDaySeed(input),
      risk_triage: {
        overload: false,
        dependency: false,
        uncertainty: true,
        notes: ['フォールバック分析のため詳細確認が必要']
      },
      question_hints: [
        {
          dataKey: 'goal_focus',
          question: 'この学習でどのような側面を重視したいですか？',
          reason: '目標の焦点を明確化するため',
          info_gain_est: 0.8,
          depends_on: null
        }
      ],
      confidence: {
        classification: 0.6,
        outcome_metric: 0.5,
        backcast: 0.5
      },
      rubric_scores: {
        relevance: 0.7,
        feasibility: 0.8,
        specificity: 0.6,
        load_fit: 1.0
      },
      revise_note: 'AI分析失敗のためフォールバック分析を使用。詳細分析を推奨。'
    };
  }

  /**
   * ドメイン検出（フォールバック用）
   */
  private static detectDomain(goalText: string): PreGoalClassification['domain'] {
    const text = goalText.toLowerCase();
    
    if (text.includes('英語') || text.includes('language') || text.includes('speaking')) return 'language';
    if (text.includes('プログラミング') || text.includes('コード') || text.includes('programming')) return 'programming';
    if (text.includes('ビジネス') || text.includes('営業') || text.includes('business')) return 'business';
    if (text.includes('デザイン') || text.includes('音楽') || text.includes('アート')) return 'creative';
    if (text.includes('資格') || text.includes('試験') || text.includes('勉強')) return 'academic';
    if (text.includes('筋トレ') || text.includes('ダイエット') || text.includes('健康')) return 'fitness';
    
    return 'general';
  }

  /**
   * フォールバック初日シードクエスト生成
   */
  private static generateFallbackFirstDaySeed(input: PreGoalAnalysisInput): any {
    return {
      total_minutes_max: 90,
      quests: [
        {
          title: '目標の具体化と現状把握',
          pattern: 'read_note_q' as const,
          minutes: 30,
          difficulty: 0.2,
          deliverable: '目標分析ノート',
          steps: ['目標を詳しく書き出す', '現在のレベルを確認', '必要なスキルを洗い出す'],
          done_definition: '目標分析ノートを完成させ、内容を説明できる状態になる',
          evidence: ['作成したノート'],
          alt_plan: '重要な箇所のみをピックアップして整理する',
          stop_rule: '30分経過したら現在の進捗で一旦終了',
          tags: ['初日', '目標設定', '現状分析']
        },
        {
          title: '学習計画の基本設計',
          pattern: 'build_micro' as const,
          minutes: 45,
          difficulty: 0.3,
          deliverable: '週間学習スケジュール',
          steps: ['利用可能時間を確認', '学習項目を優先順位付け', '週間スケジュールを作成'],
          done_definition: '動作する週間学習スケジュールを完成させ、実行可能性を確認する',
          evidence: ['完成したスケジュール表'],
          alt_plan: '最小限の項目のみでシンプルなスケジュールを作成',
          stop_rule: '45分経過したら現在の進捗で一旦終了',
          tags: ['初日', '計画', 'スケジュール']
        }
      ]
    };
  }

  /**
   * 分析結果のキャッシュキー生成
   */
  static generateCacheKey(goalText: string): string {
    // 簡単なハッシュ関数（本格実装では crypto を使用）
    let hash = 0;
    for (let i = 0; i < goalText.length; i++) {
      const char = goalText.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return `pregoal_${Math.abs(hash).toString(16)}`;
  }

  /**
   * 分析結果の品質検証
   */
  static validateAnalysisQuality(result: PreGoalAnalysisResult): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 0;

    // Rubric基準チェック
    if (result.rubric_scores.relevance < 0.85) {
      issues.push(`関連性が低い: ${(result.rubric_scores.relevance * 100).toFixed(0)}% < 85%`);
    } else {
      score += 0.25;
    }

    if (result.rubric_scores.feasibility < 0.80) {
      issues.push(`実現可能性が低い: ${(result.rubric_scores.feasibility * 100).toFixed(0)}% < 80%`);
    } else {
      score += 0.25;
    }

    if (result.rubric_scores.specificity < 0.85) {
      issues.push(`具体性が不足: ${(result.rubric_scores.specificity * 100).toFixed(0)}% < 85%`);
    } else {
      score += 0.25;
    }

    if (result.rubric_scores.load_fit !== 1.0) {
      issues.push(`負荷適合度に問題: ${result.rubric_scores.load_fit} != 1.0`);
    } else {
      score += 0.25;
    }

    // 構造的要件チェック
    if (result.first_day_seed.quests.length < 2 || result.first_day_seed.quests.length > 3) {
      issues.push(`初日クエスト数が不適切: ${result.first_day_seed.quests.length}（2-3個が適切）`);
    }

    const totalTime = result.first_day_seed.quests.reduce((sum, q) => sum + q.minutes, 0);
    if (totalTime > 90) {
      issues.push(`初日クエスト時間超過: ${totalTime}分 > 90分`);
    }

    if (issues.length === 0) {
      issues.push('✅ All quality criteria met');
    }

    return {
      isValid: issues.length <= 1, // ✅メッセージのみの場合は有効
      issues,
      score
    };
  }
}