/**
 * Milestone Generation Service - Enhanced with SMART+Backcasting Engine
 * Generates intermediate milestones for long-term goals
 * 
 * Phase 2 Enhancement: Integrates MilestoneEngine with SMART criteria and backcasting
 */
import { MilestoneEngine } from './milestoneEngine';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  isCompleted: boolean;
  importance: 'low' | 'medium' | 'high';
  estimatedDifficulty: number; // 0-1
}

export interface MilestoneGenerationInput {
  goalText: string;
  goalCategory: 'learning' | 'career' | 'health' | 'skill' | 'creative' | 'other';
  timeframe: string; // '1m', '3m', '6m', '12m+', or custom date
  importance: 1 | 2 | 3 | 4 | 5;
  timeBudgetPerDay: number;
}

export interface FeasibilityAnalysis {
  isRealistic: boolean;
  confidence: number; // 0-1
  riskFactors: string[];
  recommendations: string[];
  estimatedTimeRequired: number; // in days
}

export class MilestoneService {
  /**
   * Enhanced milestone generation using SMART+Backcasting methodology (Phase 2)
   * Generates high-quality SMART milestones with feasibility validation
   */
  async generateEnhancedMilestones(
    input: MilestoneGenerationInput,
    options: {
      weeklyHours?: number;
      resources?: string[];
      constraints?: string[];
      outcomeMetric?: { name: string; target: string };
    } = {}
  ): Promise<Milestone[]> {
    try {
      const timeframeMonths = this.parseTimeframe(input.timeframe);
      const horizonWeeks = timeframeMonths * 4;
      
      // Build input for MilestoneEngine
      const engineInput = {
        goal_text: input.goalText,
        category: input.goalCategory,
        outcome_metric: options.outcomeMetric || {
          name: 'Goal Achievement',
          target: '100% completion'
        },
        weekly_hours: options.weeklyHours || (input.timeBudgetPerDay * 7 / 60),
        resources: options.resources || [],
        constraints: options.constraints || [],
        horizon_weeks: horizonWeeks
      };

      console.log('🚀 Generating enhanced milestones with SMART+Backcasting:', engineInput);

      // Use MilestoneEngine for generation
      const milestonePlan = await MilestoneEngine.generateMilestonePlan(engineInput);

      // Convert engine milestones to service format
      const convertedMilestones: Milestone[] = [];
      let milestoneId = 1;

      for (const timeframe of ['Now', 'Next', 'Later'] as const) {
        for (const milestone of milestonePlan.milestones[timeframe]) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + (milestone.timeframe_weeks * 7));

          convertedMilestones.push({
            id: `enhanced_milestone_${milestoneId}_${new Date().getTime()}`,
            title: milestone.title,
            description: milestone.description,
            targetDate,
            isCompleted: false,
            importance: this.mapImportanceLevel(input.importance),
            estimatedDifficulty: 1 - milestone.feasibility_score, // Convert feasibility to difficulty
          });
          milestoneId++;
        }
      }

      // Validate plan quality
      const validation = MilestoneEngine.validateMilestonePlan(milestonePlan);
      if (!validation.isValid) {
        console.warn('⚠️ Milestone plan validation issues:', validation.issues);
      }

      console.log('✅ Enhanced milestones generated successfully:', {
        total: convertedMilestones.length,
        validation: validation.metrics
      });

      return convertedMilestones;

    } catch (error) {
      console.error('Enhanced milestone generation failed, falling back to template method:', error);
      return this.generateMilestones(input);
    }
  }

  /**
   * Generate milestones for a goal (Legacy method)
   * For MVP, uses template-based generation with simple AI enhancement
   */
  async generateMilestones(input: MilestoneGenerationInput): Promise<Milestone[]> {
    const timeframeMonths = this.parseTimeframe(input.timeframe);
    const milestones: Milestone[] = [];
    
    // Generate 3-5 milestones based on goal category and timeframe
    const milestoneCount = Math.min(5, Math.max(3, timeframeMonths));
    const intervalDays = (timeframeMonths * 30) / milestoneCount;
    
    for (let i = 0; i < milestoneCount; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + (intervalDays * (i + 1)));
      
      const milestone = this.generateMilestoneByCategory(
        input.goalCategory,
        input.goalText,
        i + 1,
        milestoneCount,
        targetDate,
        input.importance
      );
      
      milestones.push(milestone);
    }
    
    return milestones;
  }

  /**
   * Analyze goal feasibility with enhanced constraints, resources, and weekly hours analysis (T-HOTFIX-07)
   */
  async analyzeFeasibility(
    goalText: string, 
    timeframe: string, 
    dailyBudget: number,
    options: {
      weeklyHours?: number;
      resources?: string[];
      constraints?: string[];
    } = {}
  ): Promise<FeasibilityAnalysis> {
    const timeframeMonths = this.parseTimeframe(timeframe);
    const totalHours = (timeframeMonths * 30 * dailyBudget) / 60;
    const weeklyHours = options.weeklyHours || (dailyBudget * 7 / 60);
    
    // Enhanced heuristic-based analysis with T-HOTFIX-07 improvements
    const analysis: FeasibilityAnalysis = {
      isRealistic: true,
      confidence: 0.8,
      riskFactors: [],
      recommendations: [],
      estimatedTimeRequired: timeframeMonths * 30,
    };

    // Check time constraints
    if (totalHours < 20) {
      analysis.riskFactors.push('学習時間が不足している可能性があります');
      analysis.recommendations.push('1日の学習時間を増やすか、期間を延長することを検討してください');
      analysis.confidence = 0.6;
    }

    if (timeframeMonths < 1) {
      analysis.riskFactors.push('期間が短すぎる可能性があります');
      analysis.recommendations.push('より現実的な期間設定を検討してください');
      analysis.confidence = Math.min(analysis.confidence, 0.5);
    }

    // Check goal complexity (simple keyword-based)
    const complexKeywords = ['master', 'expert', 'fluent', 'professional', 'advanced'];
    const hasComplexGoal = complexKeywords.some(keyword => 
      goalText.toLowerCase().includes(keyword) ||
      goalText.includes('上級') ||
      goalText.includes('マスター') ||
      goalText.includes('プロ')
    );

    if (hasComplexGoal && timeframeMonths < 6) {
      analysis.riskFactors.push('高度な目標に対して期間が短い可能性があります');
      analysis.recommendations.push('段階的な目標設定を推奨します');
      analysis.confidence = Math.min(analysis.confidence, 0.7);
    }

    // T-HOTFIX-07: Enhanced analysis with weekly_hours/resources/constraints hints
    
    // Weekly hours analysis
    if (weeklyHours < 3) {
      analysis.riskFactors.push('週間学習時間が不十分です（目標: 週3時間以上）');
      analysis.recommendations.push('毎週の学習時間を増やすか、目標を調整してください');
      analysis.confidence = Math.min(analysis.confidence, 0.5);
    } else if (weeklyHours > 20) {
      analysis.riskFactors.push('週間学習時間が過度に多い可能性があります');
      analysis.recommendations.push('継続可能な学習スケジュールを検討してください');
      analysis.confidence = Math.min(analysis.confidence, 0.7);
    }

    // Resources analysis
    const resources = options.resources || [];
    if (resources.length === 0 && hasComplexGoal) {
      analysis.riskFactors.push('高度な目標に対してリソースが不足している可能性があります');
      analysis.recommendations.push('必要な学習リソース（本、コース、ツールなど）を準備してください');
      analysis.confidence = Math.min(analysis.confidence, 0.6);
    } else if (resources.length > 0) {
      analysis.recommendations.push(`活用可能なリソース: ${resources.slice(0, 3).join(', ')}${resources.length > 3 ? '他' : ''}`);
    }

    // Constraints analysis
    const constraints = options.constraints || [];
    if (constraints.length > 0) {
      const timeConstraints = constraints.filter(c => 
        c.toLowerCase().includes('time') || c.includes('時間') || c.includes('忙しい')
      );
      const resourceConstraints = constraints.filter(c => 
        c.toLowerCase().includes('budget') || c.includes('予算') || c.includes('費用')
      );
      
      if (timeConstraints.length > 0) {
        analysis.riskFactors.push('時間制約により目標達成が困難な可能性があります');
        analysis.recommendations.push('より効率的な学習方法を選択してください');
        analysis.confidence = Math.min(analysis.confidence, 0.6);
      }
      
      if (resourceConstraints.length > 0) {
        analysis.recommendations.push('予算制約を考慮した無料または低コストのリソースを活用してください');
      }
    }

    analysis.isRealistic = analysis.confidence > 0.6;
    
    return analysis;
  }

  /**
   * Parse timeframe string to months
   */
  private parseTimeframe(timeframe: string): number {
    switch (timeframe) {
      case '1m': return 1;
      case '3m': return 3;
      case '6m': return 6;
      case '12m+': return 12;
      default:
        // Try to parse custom date
        const customDate = new Date(timeframe);
        if (!isNaN(customDate.getTime())) {
          const now = new Date();
          const diffTime = Math.abs(customDate.getTime() - now.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return Math.max(1, diffDays / 30);
        }
        return 3; // Default to 3 months
    }
  }

  /**
   * Generate category-specific milestone
   */
  private generateMilestoneByCategory(
    category: string,
    goalText: string,
    step: number,
    totalSteps: number,
    targetDate: Date,
    importance: number
  ): Milestone {
    const milestoneTemplates = this.getMilestoneTemplates(category);
    const template = milestoneTemplates[Math.min(step - 1, milestoneTemplates.length - 1)];
    
    const progressPercentage = (step / totalSteps) * 100;
    
    return {
      id: `milestone_${step}_${new Date().getTime()}`,
      title: template.title.replace('{goal}', goalText).replace('{progress}', `${progressPercentage.toFixed(0)}%`),
      description: template.description.replace('{goal}', goalText),
      targetDate,
      isCompleted: false,
      importance: this.mapImportanceLevel(importance),
      estimatedDifficulty: Math.min(1, (step / totalSteps) * 0.8 + 0.2), // Progressive difficulty
    };
  }

  /**
   * Get milestone templates by category
   */
  private getMilestoneTemplates(category: string) {
    const templates = {
      learning: [
        { title: '{goal}の基礎学習完了', description: '基本概念と用語の理解' },
        { title: '{goal}の実践練習開始', description: '基礎知識を使った練習問題' },
        { title: '{goal}の応用学習', description: 'より複雑な問題への挑戦' },
        { title: '{goal}の総合演習', description: '実際の試験問題や実践課題' },
        { title: '{goal}の目標達成', description: '最終的な成果確認と評価' },
      ],
      career: [
        { title: 'キャリア分析と計画立案', description: '現状分析と目標設定の明確化' },
        { title: 'スキルアップ活動開始', description: '必要なスキルの習得開始' },
        { title: 'ネットワーキング強化', description: '人脈構築と情報収集' },
        { title: '実績作りと経験蓄積', description: '具体的成果の創出' },
        { title: '{goal}の達成', description: '目標とするポジションの獲得' },
      ],
      health: [
        { title: '健康状態の把握', description: '現在の体力・健康レベルの測定' },
        { title: '基礎トレーニング開始', description: '無理のない範囲での運動習慣' },
        { title: '中級レベルへのステップアップ', description: '強度・時間の段階的増加' },
        { title: '目標に向けた本格トレーニング', description: '具体的成果を目指した集中期間' },
        { title: '{goal}の達成', description: '目標とする健康状態・体力の獲得' },
      ],
      skill: [
        { title: '{goal}の基礎技術習得', description: '基本的な技術・ツールの理解' },
        { title: '実践的なプロジェクト開始', description: '簡単なプロジェクトでの練習' },
        { title: '中級レベルのスキル習得', description: 'より高度な技術への挑戦' },
        { title: 'ポートフォリオ作成', description: '成果物の完成と公開' },
        { title: '{goal}の専門レベル到達', description: '目標スキルの実用レベル達成' },
      ],
      creative: [
        { title: '創作の基礎練習', description: '基本技法とツールの習得' },
        { title: '作品制作の開始', description: '最初の作品づくりへの挑戦' },
        { title: '技法の向上と実験', description: 'より高度な表現技法の習得' },
        { title: '作品の完成と発表', description: '完成度の高い作品の制作' },
        { title: '{goal}の創作目標達成', description: '目指していた作品・レベルの達成' },
      ],
      other: [
        { title: '{goal}の計画立案', description: '具体的な行動計画の策定' },
        { title: '初期段階の実行', description: '基本的な取り組みの開始' },
        { title: '中間評価と調整', description: '進捗確認と必要な軌道修正' },
        { title: '最終段階への集中', description: '目標達成に向けた集中的取り組み' },
        { title: '{goal}の完全達成', description: '設定した目標の完全な実現' },
      ],
    };
    
    return templates[category as keyof typeof templates] || templates.other;
  }

  /**
   * Map numeric importance to string level
   */
  private mapImportanceLevel(importance: number): 'low' | 'medium' | 'high' {
    if (importance <= 2) return 'low';
    if (importance <= 3) return 'medium';
    return 'high';
  }
}