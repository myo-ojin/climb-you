/**
 * Goal Clarification Service - 目標の曖昧性検出と再入力要求
 * 
 * 曖昧で不十分な目標入力を検出し、ユーザーに具体的な入力を促す
 */

import { z } from 'zod';
import { advancedQuestService } from './advancedQuestService.fixed';

// 曖昧性検出結果の型定義
export interface ClarityAnalysis {
  isVague: boolean;
  confidence: number; // 0-1, 1が完全に明確
  issues: ClarityIssue[];
  suggestions: string[];
  examples: string[];
}

export interface ClarityIssue {
  type: 'domain_unclear' | 'scope_unclear' | 'timeline_missing' | 'goal_type_unclear' | 'abbreviation_detected';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// 目標明確化要求エラー
export class GoalClarificationNeeded extends Error {
  public readonly analysis: ClarityAnalysis;
  
  constructor(analysis: ClarityAnalysis) {
    super('Goal clarification needed');
    this.name = 'GoalClarificationNeeded';
    this.analysis = analysis;
  }
}

// 明確性判定のスキーマ
const ClarityAnalysisSchema = z.object({
  isVague: z.boolean(),
  confidence: z.number().min(0).max(1),
  issues: z.array(z.object({
    type: z.enum(['domain_unclear', 'scope_unclear', 'timeline_missing', 'goal_type_unclear', 'abbreviation_detected']),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high'])
  })),
  suggestions: z.array(z.string()).min(1).max(5),
  examples: z.array(z.string()).min(1).max(3)
});

class GoalClarificationService {
  /**
   * 目標テキストの明確性を分析
   */
  async checkGoalClarity(goalText: string): Promise<ClarityAnalysis> {
    // まず基本的な検証
    const basicAnalysis = this.performBasicClarityCheck(goalText);
    
    if (basicAnalysis.isVague) {
      return basicAnalysis;
    }

    // AI APIを使った詳細分析
    try {
      const aiAnalysis = await this.performAIClarityCheck(goalText);
      return aiAnalysis;
    } catch (error) {
      console.error('AI clarity check failed, using basic analysis:', error);
      return basicAnalysis;
    }
  }

  /**
   * 基本的な明確性チェック（AI API失敗時のフォールバック）
   */
  private performBasicClarityCheck(goalText: string): ClarityAnalysis {
    const issues: ClarityIssue[] = [];
    const suggestions: string[] = [];
    const examples: string[] = [];
    
    const text = goalText.toLowerCase().trim();
    
    // 長さチェック
    if (text.length < 10) {
      issues.push({
        type: 'scope_unclear',
        description: '目標が短すぎて具体性に欠けています',
        severity: 'high'
      });
    }
    
    // 略語・スラング検出
    const abbreviations = ['apex', 'lol', 'valo', 'pubg', 'cod', 'bf', 'ff', 'dq', 'mh'];
    const hasAbbreviation = abbreviations.some(abbr => text.includes(abbr));
    
    if (hasAbbreviation) {
      issues.push({
        type: 'abbreviation_detected',
        description: 'ゲーム名や専門用語の略語が含まれています',
        severity: 'medium'
      });
      suggestions.push('ゲーム名を正式名称で教えてください（例：APEX → Apex Legends）');
      examples.push('Apex Legendsでランクマッチでプラチナに到達したい');
    }
    
    // 曖昧な表現検出
    const vagueTerms = ['うまくなりたい', '強くなりたい', '上達したい', '勉強したい', '覚えたい'];
    const hasVagueTerms = vagueTerms.some(term => text.includes(term));
    
    if (hasVagueTerms) {
      issues.push({
        type: 'goal_type_unclear',
        description: '「うまくなりたい」では具体的な目標が不明です',
        severity: 'high'
      });
      suggestions.push('どんなスキルを、どのレベルまで向上させたいか教えてください');
      examples.push('英語で15分間の日常会話ができるようになりたい');
    }
    
    // ドメイン不明確
    const hasNoDomain = !this.detectDomain(text);
    if (hasNoDomain && text.length < 20) {
      issues.push({
        type: 'domain_unclear',
        description: '学習分野が特定できません',
        severity: 'high'
      });
      suggestions.push('何の分野で、どのような能力を身につけたいか教えてください');
      examples.push('プログラミングでReactを使ったWebアプリを作れるようになりたい');
    }
    
    // デフォルトの提案とサンプル
    if (suggestions.length === 0) {
      suggestions.push('より具体的な目標を教えてください');
    }
    
    if (examples.length === 0) {
      examples.push(
        '3か月でTOEIC800点を取りたい',
        'Reactでポートフォリオサイトを作りたい',
        '週3回のジョギングで5km走れるようになりたい'
      );
    }
    
    const isVague = issues.some(issue => issue.severity === 'high');
    const confidence = isVague ? 0.3 : 0.8;
    
    return {
      isVague,
      confidence,
      issues,
      suggestions,
      examples
    };
  }

  /**
   * AI APIを使った詳細明確性チェック
   */
  private async performAIClarityCheck(goalText: string): Promise<ClarityAnalysis> {
    if (!advancedQuestService.isInitialized()) {
      throw new Error('AdvancedQuestService not initialized');
    }

    const clarityPrompt = `以下の学習目標が具体的で明確かどうかを分析してください。

目標: "${goalText}"

以下のJSON形式で回答してください:
{
  "isVague": boolean,
  "confidence": number (0-1),
  "issues": [
    {
      "type": "domain_unclear|scope_unclear|timeline_missing|goal_type_unclear|abbreviation_detected",
      "description": "問題の具体的説明",
      "severity": "low|medium|high"
    }
  ],
  "suggestions": ["改善提案1", "改善提案2", ...],
  "examples": ["具体例1", "具体例2", ...]
}

判定基準:
- isVague: 具体的な行動、期間、成果が不明な場合true
- confidence: 判定の確実性 (1=完全に明確, 0=非常に曖昧)
- issues: 問題点の詳細
- suggestions: ユーザーへの改善提案（1-5個）
- examples: 具体的な目標例（1-3個）

目標が「〜したい」「うまくなりたい」のみの場合は必ずisVague=trueにしてください。`;

    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: goalText,
        timeConstraintMinutes: 30,
        userPreferences: { difficulty: 'medium' },
        customPrompt: clarityPrompt
      });

      // レスポンスからJSONを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      const analysis = ClarityAnalysisSchema.parse(analysisData);

      return analysis;
    } catch (error) {
      console.error('AI clarity analysis failed:', error);
      throw error;
    }
  }

  /**
   * 基本的なドメイン検出（フォールバック用）
   */
  private detectDomain(text: string): boolean {
    const domains = [
      // 言語学習
      'english', '英語', 'toeic', '会話', '英会話',
      // プログラミング
      'programming', 'プログラミング', 'react', 'python', 'javascript', 'コード', '開発',
      // ビジネス
      'business', 'ビジネス', '営業', '販売', 'マネジメント',
      // フィットネス
      'fitness', 'フィットネス', '筋トレ', 'ダイエット', 'ランニング', 'ジョギング',
      // 学習
      '勉強', '学習', '資格', '試験', '受験',
      // クリエイティブ
      'design', 'デザイン', '音楽', '写真', '動画',
      // その他
      '料理', 'cooking', 'ゲーム', 'game'
    ];
    
    return domains.some(domain => text.includes(domain));
  }

  /**
   * 目標が十分に具体的かチェック（エントリーポイント）
   */
  async validateGoalOrThrow(goalText: string): Promise<void> {
    const analysis = await this.checkGoalClarity(goalText);
    
    if (analysis.isVague) {
      throw new GoalClarificationNeeded(analysis);
    }
  }
}

export const goalClarificationService = new GoalClarificationService();
export { GoalClarificationService };
