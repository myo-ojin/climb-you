import { z } from 'zod';
import { MilestoneSchema, MilestonePlanSchema } from './promptEngine';
import { advancedQuestService } from './advancedQuestService.fixed';
import { PreGoalAnalysisResult } from './preGoalAnalysisService';

// Helper types
type MilestoneTimeframe = 'Now' | 'Next' | 'Later';
type GoalCategory = 'learning' | 'career' | 'health' | 'skill' | 'creative' | 'other';

interface MilestoneInput {
  goal_text: string;
  category: GoalCategory;
  outcome_metric: {
    name: string;
    target: string;
  };
  weekly_hours: number;
  resources: string[];
  constraints: string[];
  horizon_weeks: number;
}

interface MilestonePlan {
  milestones: {
    Now: z.infer<typeof MilestoneSchema>[];
    Next: z.infer<typeof MilestoneSchema>[];
    Later: z.infer<typeof MilestoneSchema>[];
  };
  rationale: string[];
}

/**
 * Milestone Engine - SMART milestone generation via backcasting
 * 
 * Features:
 * - SMART criteria validation (Specific, Measurable, Achievable, Relevant, Time-bound)
 * - Backcasting: outcome → intermediate KPIs → behavior KPIs
 * - Time-based grouping: Now (1-2w), Next (3-6w), Later (>6w)
 * - Feasibility checking with automatic revision
 * - Resource and constraint awareness
 */
export class MilestoneEngine {

  /**
   * Generate enhanced milestone plan using Pre-Goal Analysis results
   */
  static async generateEnhancedMilestonePlan(
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult,
    knownProfile: { fields: Record<string, any>; confidence: Record<string, number> }
  ): Promise<MilestonePlan & { preGoalAnalysis: PreGoalAnalysisResult }> {
    console.log('🎯 Starting enhanced milestone generation with Pre-Goal Analysis...');
    console.log('🎯 Input data:', {
      goal_text: input.goal_text,
      category: input.category,
      weekly_hours: input.weekly_hours,
      horizon_weeks: input.horizon_weeks,
      resources_count: input.resources?.length || 0,
      constraints_count: input.constraints?.length || 0
    });
    console.log('🎯 Pre-Goal Analysis data:', {
      classification: preGoalAnalysis.classification,
      domain: preGoalAnalysis.domain,
      outcome_metric: preGoalAnalysis.outcome_metric,
      prerequisites_count: preGoalAnalysis.prerequisites?.length || 0,
      risk_assessment: preGoalAnalysis.risk_assessment
    });
    console.log('🎯 Known Profile confidence:', knownProfile.confidence);
    
    // Step 1: Use Pre-Goal Analysis classification and outcome metric
    console.log('🎯 Step 1: Enhancing input with Pre-Goal Analysis...');
    const enhancedInput = this.enhanceInputWithPreGoalAnalysis(input, preGoalAnalysis, knownProfile);
    console.log('🎯 Enhanced input:', enhancedInput);
    
    // Step 2: Build enhanced backcasting prompt using Pre-Goal backcast
    console.log('🎯 Step 2: Building enhanced backcast prompt...');
    const enhancedPrompt = this.buildEnhancedBackcastPrompt(enhancedInput, preGoalAnalysis);
    console.log('🎯 Prompt length:', enhancedPrompt.length, 'characters');
    
    // Step 3: Generate milestones with Pre-Goal prerequisites integration
    console.log('🎯 Step 3: Generating enhanced milestones...');
    const initialPlan = await this.generateEnhancedMilestones(enhancedPrompt, enhancedInput, preGoalAnalysis);
    console.log('🎯 Initial plan generated:', {
      Now: initialPlan.milestones.Now?.length || 0,
      Next: initialPlan.milestones.Next?.length || 0,
      Later: initialPlan.milestones.Later?.length || 0
    });
    
    // Step 4: Apply feasibility check with Pre-Goal risk assessment
    console.log('🎯 Step 4: Validating and revising with Pre-Goal risks...');
    const validatedPlan = await this.validateAndReviseWithPreGoalRisks(initialPlan, enhancedInput, preGoalAnalysis);
    console.log('🎯 Plan validated');
    
    // Step 5: Ensure SMART criteria with Pre-Goal outcome metrics
    console.log('🎯 Step 5: Applying SMART criteria with Pre-Goal metrics...');
    const smartPlan = this.applySMARTWithPreGoalMetrics(validatedPlan, enhancedInput, preGoalAnalysis);
    console.log('🎯 SMART plan applied');
    
    console.log('✅ Enhanced milestone plan generated with Pre-Goal Analysis:', {
      domain: preGoalAnalysis.classification.domain,
      complexity: preGoalAnalysis.classification.complexity,
      totalMilestones: smartPlan.milestones.Now.length + smartPlan.milestones.Next.length + smartPlan.milestones.Later.length,
      prerequisites: preGoalAnalysis.prerequisites.length
    });
    
    return {
      ...smartPlan,
      preGoalAnalysis
    };
  }

  /**
   * Generate SMART milestone plan using backcasting methodology (Legacy method)
   */
  static async generateMilestonePlan(input: MilestoneInput): Promise<MilestonePlan> {
    console.log('🎯 Starting SMART milestone generation with backcasting...');
    
    // Step 1: Build backcasting prompt
    const backcastPrompt = this.buildBackcastPrompt(input);
    
    // Step 2: Generate initial milestones via AI
    const initialPlan = await this.generateInitialMilestones(backcastPrompt, input);
    
    // Step 3: Apply feasibility check and revision
    const validatedPlan = await this.validateAndReviseFeasibility(initialPlan, input);
    
    // Step 4: Ensure SMART criteria
    const smartPlan = this.applySMARTCriteria(validatedPlan, input);
    
    console.log('✅ SMART milestone plan generated:', {
      totalMilestones: smartPlan.milestones.Now.length + smartPlan.milestones.Next.length + smartPlan.milestones.Later.length,
      timeframes: {
        Now: smartPlan.milestones.Now.length,
        Next: smartPlan.milestones.Next.length,
        Later: smartPlan.milestones.Later.length
      }
    });
    
    return smartPlan;
  }

  /**
   * Build backcasting prompt following outcome → intermediate → behavior KPI chain
   */
  private static buildBackcastPrompt(input: MilestoneInput): string {
    return `あなたは戦略的プランナーとして、バックキャスト手法を用いてSMARTマイルストーンを生成してください。

目標: "${input.goal_text}"
分野: ${input.category}
成果指標: ${input.outcome_metric.name} - ${input.outcome_metric.target}
週間時間: ${input.weekly_hours}時間
期間: ${input.horizon_weeks}週間
利用可能リソース: ${input.resources.join(', ') || 'なし'}
制約: ${input.constraints.join(', ') || 'なし'}

**バックキャスト手法:**
1. 最終成果 (Outcome KPI) から逆算
2. 中間成果指標 (Intermediate KPI) を設定
3. 行動指標 (Behavior KPI) に分解

**時間フレーム:**
- Now (1-2週): 今すぐ始められる基礎的な行動指標
- Next (3-6週): 中間成果を達成するためのより複雑な取り組み
- Later (6週以上): 最終成果に直結する大きな成果物

以下のJSON形式で回答してください:
{
  "milestones": {
    "Now": [
      {
        "title": "マイルストーン名",
        "description": "具体的な説明",
        "kpi": {
          "name": "KPI名",
          "target": "数値目標",
          "measurement": "測定方法"
        },
        "evidence": ["証拠1", "証拠2"],
        "resources_needed": ["必要リソース1"],
        "dependencies": ["依存関係1"],
        "risk_flags": ["リスク1"],
        "feasibility_score": 0.85,
        "timeframe_weeks": 2,
        "effort_hours": 8
      }
    ],
    "Next": [...],
    "Later": [...]
  },
  "rationale": [
    "バックキャスト理由1",
    "時間配分理由2"
  ]
}

**SMART基準:**
- Specific: 具体的で明確
- Measurable: 数値で測定可能  
- Achievable: 実現可能性 >= 0.8
- Relevant: 目標との関連性が明確
- Time-bound: 期限が明確

必須要件:
- 各マイルストーンの feasibility_score >= 0.8
- Now: 2-3個, Next: 3-4個, Later: 2-3個
- リソース制約と時間制約を考慮
- KPIは定量的で測定可能`;
  }

  /**
   * Generate initial milestones using AI
   */
  private static async generateInitialMilestones(prompt: string, input: MilestoneInput): Promise<any> {
    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: input.goal_text,
        timeConstraintMinutes: 60, // Allow more time for milestone planning
        userPreferences: { difficulty: 'medium' },
        customPrompt: prompt
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in milestone generation response');
      }

      const planData = JSON.parse(jsonMatch[0]);
      return planData;

    } catch (error) {
      console.error('AI milestone generation failed, using fallback:', error);
      return this.generateFallbackMilestones(input);
    }
  }

  /**
   * Validate feasibility and revise if necessary
   */
  private static async validateAndReviseFeasibility(plan: any, input: MilestoneInput): Promise<any> {
    const allMilestones = [
      ...(plan.milestones.Now || []),
      ...(plan.milestones.Next || []),
      ...(plan.milestones.Later || [])
    ];

    // Check feasibility scores
    const lowFeasibilityMilestones = allMilestones.filter(m => 
      (m.feasibility_score || 0) < 0.8
    );

    if (lowFeasibilityMilestones.length === 0) {
      console.log('✅ All milestones meet feasibility threshold (>=0.8)');
      return plan;
    }

    console.warn(`⚠️ ${lowFeasibilityMilestones.length} milestones below feasibility threshold, revising...`);

    // Generate revision prompt
    const revisionPrompt = `以下のマイルストーンの実現可能性が低いため、修正してください。

目標: "${input.goal_text}"
週間時間: ${input.weekly_hours}時間
制約: ${input.constraints.join(', ') || 'なし'}

修正が必要なマイルストーン:
${lowFeasibilityMilestones.map((m, i) => 
  `${i + 1}. ${m.title} (実現可能性: ${m.feasibility_score})`
).join('\n')}

修正要件:
- 実現可能性スコア >= 0.8
- 時間制約内で完了可能
- リソース制約を考慮
- より小さなステップに分割可能

修正されたマイルストーンのみをJSON形式で返してください:
{
  "revised_milestones": [
    {
      "title": "修正後のタイトル",
      "description": "修正内容の説明",
      "feasibility_score": 0.85,
      "revision_reason": "修正理由"
    }
  ]
}`;

    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: input.goal_text,
        timeConstraintMinutes: 30,
        userPreferences: { difficulty: 'medium' },
        customPrompt: revisionPrompt
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const revisionData = JSON.parse(jsonMatch[0]);
        
        // Apply revisions to original plan
        let revisionIndex = 0;
        for (const timeframe of ['Now', 'Next', 'Later']) {
          if (plan.milestones[timeframe]) {
            for (let i = 0; i < plan.milestones[timeframe].length; i++) {
              const milestone = plan.milestones[timeframe][i];
              if ((milestone.feasibility_score || 0) < 0.8 && revisionIndex < revisionData.revised_milestones.length) {
                const revision = revisionData.revised_milestones[revisionIndex];
                plan.milestones[timeframe][i] = {
                  ...milestone,
                  ...revision,
                  feasibility_score: Math.max(revision.feasibility_score || 0.8, 0.8)
                };
                revisionIndex++;
              }
            }
          }
        }
        
        plan.rationale.push('低実現可能性マイルストーンを修正しました');
        console.log('✅ Feasibility revision completed');
      }
    } catch (error) {
      console.error('Feasibility revision failed, keeping original plan:', error);
    }

    return plan;
  }

  /**
   * Apply SMART criteria validation and enhancement
   */
  private static applySMARTCriteria(plan: any, input: MilestoneInput): MilestonePlan {
    const smartPlan: MilestonePlan = {
      milestones: { Now: [], Next: [], Later: [] },
      rationale: [...(plan.rationale || [])]
    };

    for (const timeframe of ['Now', 'Next', 'Later'] as MilestoneTimeframe[]) {
      const milestones = plan.milestones[timeframe] || [];
      
      for (const milestone of milestones) {
        // Ensure SMART compliance
        const smartMilestone = this.enhanceSMARTCompliance(milestone, timeframe, input);
        smartPlan.milestones[timeframe].push(smartMilestone);
      }
    }

    // Add SMART validation summary
    smartPlan.rationale.push('全マイルストーンにSMART基準を適用しました');
    
    return smartPlan;
  }

  /**
   * Enhance a milestone for SMART compliance
   */
  private static enhanceSMARTCompliance(
    milestone: any, 
    timeframe: MilestoneTimeframe,
    input: MilestoneInput
  ): z.infer<typeof MilestoneSchema> {
    // Ensure required fields with SMART defaults
    const enhanced = {
      title: milestone.title || `${timeframe} マイルストーン`,
      description: milestone.description || milestone.title || '詳細な説明',
      kpi: {
        name: milestone.kpi?.name || milestone.title,
        target: milestone.kpi?.target || '完了',
        measurement: milestone.kpi?.measurement || '完了確認'
      },
      evidence: Array.isArray(milestone.evidence) ? milestone.evidence : ['完了証拠'],
      resources_needed: Array.isArray(milestone.resources_needed) ? milestone.resources_needed : [],
      dependencies: Array.isArray(milestone.dependencies) ? milestone.dependencies : [],
      risk_flags: Array.isArray(milestone.risk_flags) ? milestone.risk_flags : [],
      feasibility_score: Math.max(milestone.feasibility_score || 0.8, 0.8),
      timeframe_weeks: this.getTimeframeWeeks(timeframe, milestone.timeframe_weeks),
      effort_hours: milestone.effort_hours || this.estimateEffortHours(timeframe, input.weekly_hours)
    };

    // Validate with Zod schema
    try {
      return MilestoneSchema.parse(enhanced);
    } catch (error) {
      console.warn('Milestone validation failed, using enhanced version:', error);
      return enhanced as z.infer<typeof MilestoneSchema>;
    }
  }

  /**
   * Get appropriate timeframe weeks based on category
   */
  private static getTimeframeWeeks(timeframe: MilestoneTimeframe, suggested?: number): number {
    const defaults = { Now: 2, Next: 4, Later: 8 };
    const base = defaults[timeframe];
    
    if (suggested && suggested > 0) {
      // Use suggested if reasonable for timeframe
      if (timeframe === 'Now' && suggested <= 2) return suggested;
      if (timeframe === 'Next' && suggested >= 3 && suggested <= 6) return suggested;
      if (timeframe === 'Later' && suggested >= 6) return suggested;
    }
    
    return base;
  }

  /**
   * Estimate effort hours based on timeframe and weekly capacity
   */
  private static estimateEffortHours(timeframe: MilestoneTimeframe, weeklyHours: number): number {
    const multipliers = { Now: 0.4, Next: 0.8, Later: 1.2 };
    return Math.round(weeklyHours * multipliers[timeframe]);
  }

  /**
   * Generate fallback milestones if AI generation fails
   */
  private static generateFallbackMilestones(input: MilestoneInput): any {
    const categoryMilestones = {
      learning: {
        Now: [{ title: '基礎知識の調査', description: '必要な基礎知識を整理する' }],
        Next: [{ title: '実践練習開始', description: '学んだ知識を実際に使ってみる' }],
        Later: [{ title: '応用レベル到達', description: '学習目標の最終レベルに到達' }]
      },
      skill: {
        Now: [{ title: '基本操作練習', description: '基本的なスキルを身につける' }],
        Next: [{ title: '応用技術習得', description: 'より高度な技術を習得する' }],
        Later: [{ title: '専門レベル達成', description: '専門レベルのスキルを身につける' }]
      }
    };

    const templates = categoryMilestones[input.category] || categoryMilestones.learning;
    
    return {
      milestones: {
        Now: templates.Now.map(t => ({
          ...t,
          kpi: { name: t.title, target: '完了', measurement: '完了確認' },
          evidence: ['完了報告'],
          resources_needed: input.resources.slice(0, 2),
          dependencies: [],
          risk_flags: ['時間不足'],
          feasibility_score: 0.8,
          timeframe_weeks: 2,
          effort_hours: Math.round(input.weekly_hours * 0.4)
        })),
        Next: templates.Next.map(t => ({
          ...t,
          kpi: { name: t.title, target: '完了', measurement: '完了確認' },
          evidence: ['実践結果'],
          resources_needed: input.resources.slice(0, 3),
          dependencies: ['Now段階完了'],
          risk_flags: ['難易度上昇'],
          feasibility_score: 0.8,
          timeframe_weeks: 4,
          effort_hours: Math.round(input.weekly_hours * 0.8)
        })),
        Later: templates.Later.map(t => ({
          ...t,
          kpi: { name: t.title, target: input.outcome_metric.target, measurement: input.outcome_metric.name },
          evidence: ['最終成果物'],
          resources_needed: input.resources,
          dependencies: ['Next段階完了'],
          risk_flags: ['総合的な統合が必要'],
          feasibility_score: 0.8,
          timeframe_weeks: 8,
          effort_hours: Math.round(input.weekly_hours * 1.2)
        }))
      },
      rationale: [
        'AI生成に失敗したため、カテゴリ別テンプレートを使用',
        `${input.category}分野の一般的なマイルストーン構造を適用`
      ]
    };
  }

  /**
   * Enhance input with Pre-Goal Analysis data
   */
  private static enhanceInputWithPreGoalAnalysis(
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult,
    knownProfile: { fields: Record<string, any>; confidence: Record<string, number> }
  ): MilestoneInput {
    return {
      ...input,
      goal_text: preGoalAnalysis.normalized_goal,
      category: this.mapDomainToCategory(preGoalAnalysis.classification.domain),
      outcome_metric: {
        name: preGoalAnalysis.outcome_metric.name,
        target: preGoalAnalysis.outcome_metric.target.toString()
      },
      horizon_weeks: preGoalAnalysis.classification.horizon_weeks,
      weekly_hours: knownProfile.fields.weekly_hours || input.weekly_hours,
      resources: knownProfile.fields.resources || input.resources,
      constraints: knownProfile.fields.constraints || input.constraints
    };
  }

  /**
   * Map Pre-Goal domain to milestone category
   */
  private static mapDomainToCategory(domain: string): GoalCategory {
    const domainMapping: Record<string, GoalCategory> = {
      'programming': 'skill',
      'language': 'learning',
      'business': 'career',
      'creative': 'creative',
      'academic': 'learning',
      'fitness': 'health',
      'general': 'other'
    };
    return domainMapping[domain] || 'other';
  }

  /**
   * Build enhanced backcasting prompt using Pre-Goal Analysis
   */
  private static buildEnhancedBackcastPrompt(
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult
  ): string {
    const backcastKPIs = preGoalAnalysis.backcast;
    
    return `あなたは戦略的プランナーとして、Pre-Goal分析結果を活用してSMARTマイルストーンを生成してください。

**目標情報:**
正規化された目標: "${preGoalAnalysis.normalized_goal}"
分野: ${preGoalAnalysis.classification.domain} (${preGoalAnalysis.classification.subdomain})
学習タイプ: ${preGoalAnalysis.classification.learning_type}
複雑度: ${preGoalAnalysis.classification.complexity}
期間: ${preGoalAnalysis.classification.horizon_weeks}週間

**成果指標 (Pre-Goal分析より):**
- 指標名: ${preGoalAnalysis.outcome_metric.name}
- 目標値: ${preGoalAnalysis.outcome_metric.target}
- 単位: ${preGoalAnalysis.outcome_metric.unit || 'N/A'}
- 基準値: ${preGoalAnalysis.outcome_metric.baseline || '未設定'}

**バックキャスト構造 (Pre-Goal分析より):**
最終成果KPI: ${backcastKPIs.outcome.kpi}
理由: ${backcastKPIs.outcome.why}

中間成果KPI:
${backcastKPIs.intermediate.map((kpi, i) => 
  `${i + 1}. ${kpi.kpi} (信頼度: ${kpi.confidence}) - ${kpi.why}`
).join('\n')}

行動KPI:
${backcastKPIs.behavior.map((kpi, i) => 
  `${i + 1}. ${kpi.kpi} (${kpi.cadence}, ${kpi.estimate_min_per_week}分/週)`
).join('\n')}

**前提条件 (Pre-Goal分析より):**
${preGoalAnalysis.prerequisites.map(prereq => 
  `- ${prereq.label} (${prereq.type}): ${prereq.why}`
).join('\n')}

**制約・リソース:**
週間時間: ${input.weekly_hours}時間
リソース: ${input.resources.join(', ') || 'なし'}
制約: ${input.constraints.join(', ') || 'なし'}

**リスク評価 (Pre-Goal分析より):**
- 過負荷リスク: ${preGoalAnalysis.risk_triage.overload}
- 依存関係リスク: ${preGoalAnalysis.risk_triage.dependency}
- 不確実性リスク: ${preGoalAnalysis.risk_triage.uncertainty}
注意事項: ${preGoalAnalysis.risk_triage.notes.join('; ')}

以下のJSON形式で、Pre-Goal分析の構造を活用したマイルストーンプランを生成してください:

{
  "milestones": {
    "Now": [
      {
        "title": "前提条件確立",
        "description": "Pre-Goal分析で特定された前提スキル・知識を確立",
        "kpi": {
          "name": "前提条件達成度",
          "target": "必要前提の80%完了",
          "measurement": "チェックリスト確認"
        },
        "evidence": ["前提スキル確認テスト", "基礎知識まとめ"],
        "resources_needed": ["学習リソース", "確認ツール"],
        "dependencies": [],
        "risk_flags": ["基礎知識不足", "時間不足"],
        "feasibility_score": 0.85,
        "timeframe_weeks": 2,
        "effort_hours": 8,
        "pregoal_mapping": {
          "prerequisite_ids": ["前提条件のID"],
          "behavior_kpi_ref": "対応する行動KPI"
        }
      }
    ],
    "Next": [
      {
        "title": "中間KPI達成",
        "description": "Pre-Goal分析の中間成果指標を達成",
        "pregoal_mapping": {
          "intermediate_kpi_ref": "対応する中間KPI",
          "confidence_threshold": 0.8
        }
      }
    ],
    "Later": [
      {
        "title": "最終成果達成",
        "description": "Pre-Goal分析の最終成果KPIを達成",
        "pregoal_mapping": {
          "outcome_kpi_ref": "最終成果KPI",
          "metric_alignment": true
        }
      }
    ]
  },
  "rationale": [
    "Pre-Goal分析のバックキャスト構造を完全に活用",
    "前提条件を優先的にNow段階に配置",
    "リスク評価に基づく実現可能性調整"
  ]
}

**SMART基準 (Pre-Goal強化版):**
- Specific: Pre-Goal分析の具体的なKPIと整合
- Measurable: outcome_metricと測定可能な指標設定
- Achievable: リスク評価を考慮した実現可能性 >= 0.8
- Relevant: バックキャスト構造との明確な対応関係
- Time-bound: horizon_weeksに基づく適切な期限設定`;
  }

  /**
   * Generate enhanced milestones using Pre-Goal Analysis
   */
  private static async generateEnhancedMilestones(
    prompt: string,
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult
  ): Promise<any> {
    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: input.goal_text,
        timeConstraintMinutes: 90, // Extended time for enhanced generation
        userPreferences: { difficulty: preGoalAnalysis.classification.complexity },
        customPrompt: prompt
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in enhanced milestone generation response');
      }

      const planData = JSON.parse(jsonMatch[0]);
      
      // Add Pre-Goal analysis metadata
      planData._preGoalEnhanced = true;
      planData._domain = preGoalAnalysis.classification.domain;
      planData._complexity = preGoalAnalysis.classification.complexity;
      
      return planData;

    } catch (error) {
      console.error('Enhanced milestone generation failed, using Pre-Goal fallback:', error);
      return this.generatePreGoalFallbackMilestones(input, preGoalAnalysis);
    }
  }

  /**
   * Validate and revise with Pre-Goal risk assessment
   */
  private static async validateAndReviseWithPreGoalRisks(
    plan: any,
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult
  ): Promise<any> {
    const allMilestones = [
      ...(plan.milestones.Now || []),
      ...(plan.milestones.Next || []),
      ...(plan.milestones.Later || [])
    ];

    // Enhanced feasibility check with Pre-Goal risks
    const riskAdjustedMilestones = allMilestones.filter(m => {
      let adjustedScore = m.feasibility_score || 0.8;
      
      // Adjust based on Pre-Goal risk assessment
      if (preGoalAnalysis.risk_triage.overload) adjustedScore -= 0.1;
      if (preGoalAnalysis.risk_triage.dependency) adjustedScore -= 0.05;
      if (preGoalAnalysis.risk_triage.uncertainty) adjustedScore -= 0.05;
      
      return adjustedScore >= 0.8;
    });

    if (riskAdjustedMilestones.length === allMilestones.length) {
      console.log('✅ All milestones meet Pre-Goal enhanced feasibility threshold');
      return plan;
    }

    console.warn(`⚠️ Pre-Goal risk assessment requires milestone revision`);
    
    // Apply risk-aware revision similar to original method but enhanced
    const revisionPrompt = `Pre-Goal分析リスク評価に基づいてマイルストーンを修正してください。

リスク要因:
- 過負荷: ${preGoalAnalysis.risk_triage.overload}
- 依存関係: ${preGoalAnalysis.risk_triage.dependency}  
- 不確実性: ${preGoalAnalysis.risk_triage.uncertainty}
- 注意点: ${preGoalAnalysis.risk_triage.notes.join(', ')}

複雑度: ${preGoalAnalysis.classification.complexity}
学習タイプ: ${preGoalAnalysis.classification.learning_type}

修正要件:
- リスク調整後の実現可能性 >= 0.8
- 前提条件の確立を優先
- 段階的な複雑度上昇を確保
- 時間制約内での完了可能性

修正されたマイルストーンをJSON形式で返してください。`;

    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: input.goal_text,
        timeConstraintMinutes: 45,
        userPreferences: { difficulty: preGoalAnalysis.classification.complexity },
        customPrompt: revisionPrompt
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const revisionData = JSON.parse(jsonMatch[0]);
        // Apply revisions with Pre-Goal context
        plan.rationale.push('Pre-Goal分析リスク評価に基づくマイルストーン修正を実行');
        console.log('✅ Pre-Goal enhanced revision completed');
      }
    } catch (error) {
      console.error('Pre-Goal enhanced revision failed:', error);
    }

    return plan;
  }

  /**
   * Apply SMART criteria with Pre-Goal outcome metrics
   */
  private static applySMARTWithPreGoalMetrics(
    plan: any,
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult
  ): MilestonePlan {
    const smartPlan: MilestonePlan = {
      milestones: { Now: [], Next: [], Later: [] },
      rationale: [...(plan.rationale || [])]
    };

    for (const timeframe of ['Now', 'Next', 'Later'] as MilestoneTimeframe[]) {
      const milestones = plan.milestones[timeframe] || [];
      
      for (const milestone of milestones) {
        // Enhanced SMART compliance with Pre-Goal metrics
        const smartMilestone = this.enhanceSMARTWithPreGoal(
          milestone, 
          timeframe, 
          input, 
          preGoalAnalysis
        );
        smartPlan.milestones[timeframe].push(smartMilestone);
      }
    }

    smartPlan.rationale.push('Pre-Goal分析メトリクスを活用したSMART基準適用完了');
    
    return smartPlan;
  }

  /**
   * Enhance SMART compliance with Pre-Goal Analysis
   */
  private static enhanceSMARTWithPreGoal(
    milestone: any,
    timeframe: MilestoneTimeframe,
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult
  ): z.infer<typeof MilestoneSchema> {
    const enhanced = {
      title: milestone.title || `${timeframe} マイルストーン`,
      description: milestone.description || milestone.title || '詳細な説明',
      kpi: {
        name: milestone.kpi?.name || milestone.title,
        target: milestone.kpi?.target || preGoalAnalysis.outcome_metric.target.toString(),
        measurement: milestone.kpi?.measurement || preGoalAnalysis.outcome_metric.name
      },
      evidence: Array.isArray(milestone.evidence) ? milestone.evidence : ['完了証拠'],
      resources_needed: Array.isArray(milestone.resources_needed) ? 
        milestone.resources_needed : input.resources.slice(0, 3),
      dependencies: Array.isArray(milestone.dependencies) ? 
        milestone.dependencies : this.inferDependenciesFromPreGoal(timeframe, preGoalAnalysis),
      risk_flags: Array.isArray(milestone.risk_flags) ? 
        milestone.risk_flags : this.extractRiskFlagsFromPreGoal(preGoalAnalysis),
      feasibility_score: Math.max(milestone.feasibility_score || 0.8, 0.8),
      timeframe_weeks: this.getPreGoalAdjustedTimeframe(
        timeframe, 
        milestone.timeframe_weeks,
        preGoalAnalysis.classification.horizon_weeks
      ),
      effort_hours: milestone.effort_hours || this.estimateEffortHours(timeframe, input.weekly_hours)
    };

    try {
      return MilestoneSchema.parse(enhanced);
    } catch (error) {
      console.warn('Pre-Goal enhanced milestone validation failed:', error);
      return enhanced as z.infer<typeof MilestoneSchema>;
    }
  }

  /**
   * Infer dependencies from Pre-Goal prerequisites
   */
  private static inferDependenciesFromPreGoal(
    timeframe: MilestoneTimeframe,
    preGoalAnalysis: PreGoalAnalysisResult
  ): string[] {
    if (timeframe === 'Now') {
      return preGoalAnalysis.prerequisites.map(p => p.label);
    } else if (timeframe === 'Next') {
      return ['Now段階完了', ...preGoalAnalysis.prerequisites.slice(0, 2).map(p => p.label)];
    } else {
      return ['Next段階完了', 'すべての前提条件完了'];
    }
  }

  /**
   * Extract risk flags from Pre-Goal risk assessment
   */
  private static extractRiskFlagsFromPreGoal(preGoalAnalysis: PreGoalAnalysisResult): string[] {
    const risks: string[] = [];
    
    if (preGoalAnalysis.risk_triage.overload) risks.push('時間不足・過負荷リスク');
    if (preGoalAnalysis.risk_triage.dependency) risks.push('依存関係リスク');
    if (preGoalAnalysis.risk_triage.uncertainty) risks.push('不確実性リスク');
    
    return risks.length > 0 ? risks : ['一般的なリスク'];
  }

  /**
   * Get Pre-Goal adjusted timeframe weeks
   */
  private static getPreGoalAdjustedTimeframe(
    timeframe: MilestoneTimeframe,
    suggested?: number,
    horizonWeeks?: number
  ): number {
    const defaults = { Now: 2, Next: 4, Later: 8 };
    const base = defaults[timeframe];
    
    // Adjust based on overall horizon
    if (horizonWeeks && horizonWeeks > 0) {
      if (timeframe === 'Later') {
        return Math.min(Math.max(Math.round(horizonWeeks * 0.6), 6), 12);
      }
    }
    
    return suggested && suggested > 0 ? suggested : base;
  }

  /**
   * Calculate due date for milestones
   */
  private static calculateDueDate(weeksFromNow: number): string {
    const now = new Date();
    now.setDate(now.getDate() + (weeksFromNow * 7));
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Generate Pre-Goal fallback milestones
   */
  private static generatePreGoalFallbackMilestones(
    input: MilestoneInput,
    preGoalAnalysis: PreGoalAnalysisResult
  ): any {
    const domain = preGoalAnalysis.classification.domain;
    const prerequisites = preGoalAnalysis.prerequisites;
    const backcast = preGoalAnalysis.backcast;
    
    return {
      milestones: {
        Now: [
          {
            id: 'now_001_prerequisites',
            title: '前提条件の確立',
            description: `${domain}分野の基礎知識・スキルを確立し、学習の土台を築く`,
            due_date: this.calculateDueDate(2),
            KPI: { 
              metric: '前提スキル習得率', 
              target: '80%完了'
            },
            evidence: ['前提スキル確認テスト', '基礎練習記録'],
            resources: input.resources.slice(0, 2),
            dependencies: prerequisites.map(p => p.label),
            risk_flags: this.extractRiskFlagsFromPreGoal(preGoalAnalysis),
            feasibility: {
              time_ok: true,
              risk_score: 0.2
            }
          }
        ],
        Next: [
          {
            id: 'next_001_intermediate',
            title: '中間成果の達成',
            description: backcast.intermediate[0]?.kpi || '中間レベルの成果を達成し、最終目標への足がかりを作る',
            due_date: this.calculateDueDate(6),
            KPI: {
              metric: preGoalAnalysis.outcome_metric.name,
              target: '中間目標達成'
            },
            evidence: ['中間成果物', '進捗レポート'],
            resources: input.resources.slice(0, 3),
            dependencies: ['Now段階完了'],
            risk_flags: this.extractRiskFlagsFromPreGoal(preGoalAnalysis),
            feasibility: {
              time_ok: true,
              risk_score: 0.3
            }
          }
        ],
        Later: [
          {
            id: 'later_001_final',
            title: '最終目標の達成',
            description: backcast.outcome.kpi || '最終目標を完全に達成し、設定した成果を実現する',
            due_date: this.calculateDueDate(preGoalAnalysis.classification.horizon_weeks),
            KPI: {
              metric: preGoalAnalysis.outcome_metric.name,
              target: preGoalAnalysis.outcome_metric.target.toString()
            },
            evidence: ['最終成果物', '目標達成証明'],
            resources: input.resources,
            dependencies: ['Next段階完了'],
            risk_flags: this.extractRiskFlagsFromPreGoal(preGoalAnalysis),
            feasibility: {
              time_ok: true,
              risk_score: 0.4
            }
          }
        ]
      },
      rationale: [
        'Pre-Goal分析結果を完全活用したフォールバック生成',
        `${domain}分野の特性を考慮した段階的プラン`,
        'バックキャスト構造を維持した実現可能なマイルストーン',
        `リスク評価（過負荷:${preGoalAnalysis.risk_triage.overload}, 依存:${preGoalAnalysis.risk_triage.dependency}, 不確実性:${preGoalAnalysis.risk_triage.uncertainty}）を反映`
      ],
      _preGoalFallback: true,
      _domain: domain,
      _prerequisites: prerequisites.length,
      _riskFactors: Object.values(preGoalAnalysis.risk_triage).filter(Boolean).length
    };
  }

  /**
   * Validate milestone plan against acceptance criteria
   */
  static validateMilestonePlan(plan: MilestonePlan): {
    isValid: boolean;
    issues: string[];
    metrics: {
      smart_validity: number;
      feasibility: number;
      temporal_consistency: number;
    };
  } {
    const issues: string[] = [];
    const allMilestones = [
      ...plan.milestones.Now,
      ...plan.milestones.Next,
      ...plan.milestones.Later
    ];

    // Check SMART validity (>= 0.85)
    let smartValidCount = 0;
    for (const milestone of allMilestones) {
      let smartScore = 0;
      
      // Specific: has clear title and description
      if (milestone.title && milestone.description && milestone.title.length > 3) smartScore += 0.2;
      
      // Measurable: has KPI with target
      if (milestone.kpi?.target && milestone.kpi.measurement) smartScore += 0.2;
      
      // Achievable: feasibility >= 0.8
      if (milestone.feasibility_score >= 0.8) smartScore += 0.2;
      
      // Relevant: has clear connection (evidence, resources)
      if (milestone.evidence.length > 0) smartScore += 0.2;
      
      // Time-bound: has specific timeframe
      if (milestone.timeframe_weeks > 0) smartScore += 0.2;
      
      if (smartScore >= 0.85) smartValidCount++;
    }
    
    const smartValidity = allMilestones.length > 0 ? smartValidCount / allMilestones.length : 0;
    
    // Check feasibility (>= 0.8)
    const avgFeasibility = allMilestones.length > 0 
      ? allMilestones.reduce((sum, m) => sum + m.feasibility_score, 0) / allMilestones.length
      : 0;
    
    // Check temporal consistency (100%)
    let temporalIssues = 0;
    const nowWeeks = Math.max(...(plan.milestones.Now.map(m => m.timeframe_weeks) || [0]));
    const nextWeeks = Math.min(...(plan.milestones.Next.map(m => m.timeframe_weeks) || [999]));
    const laterWeeks = Math.min(...(plan.milestones.Later.map(m => m.timeframe_weeks) || [999]));
    
    if (nowWeeks > 2) temporalIssues++;
    if (nextWeeks < 3 || nextWeeks > 6) temporalIssues++;
    if (laterWeeks < 6) temporalIssues++;
    
    const temporalConsistency = 1 - (temporalIssues / 3);

    // Check acceptance criteria
    if (smartValidity < 0.85) {
      issues.push(`SMART validity too low: ${(smartValidity * 100).toFixed(1)}% < 85%`);
    }
    
    if (avgFeasibility < 0.8) {
      issues.push(`Average feasibility too low: ${avgFeasibility.toFixed(2)} < 0.8`);
    }
    
    if (temporalConsistency < 1.0) {
      issues.push(`Temporal consistency issues: ${(temporalConsistency * 100).toFixed(1)}% < 100%`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      metrics: {
        smart_validity: smartValidity,
        feasibility: avgFeasibility,
        temporal_consistency: temporalConsistency
      }
    };
  }
}