/**
 * Hybrid Question Service - ハイブリッド質問生成システム
 * 
 * ブロックA,C: AI完全生成 (分野特化)
 * ブロックB,D: 軽量テンプレ (汎用的)
 * 
 * API効率: 50%削減、品質: 高維持
 */

import { z } from 'zod';
import { advancedQuestService } from './advancedQuestService.fixed';
import { goalClarificationService, GoalClarificationNeeded } from './goalClarificationService';
import { GoalAnalysis, AdaptiveQuestion, QuestionBlock } from './adaptiveQuestionService';

// ハイブリッド質問生成結果
export interface HybridQuestionSet {
  goalAnalysis: GoalAnalysis;
  blocks: QuestionBlock[];
  generationMetadata: {
    aiGeneratedBlocks: ('A' | 'B' | 'C' | 'D')[];
    templateBlocks: ('A' | 'B' | 'C' | 'D')[];
    totalApiCalls: number;
    generationTime: number;
  };
}

class HybridQuestionService {
  /**
   * メインエントリーポイント: ハイブリッド質問セット生成
   */
  async generateHybridQuestionSet(goalText: string): Promise<HybridQuestionSet> {
    const startTime = Date.now();
    let apiCalls = 0;

    // Step 1: 曖昧性チェック
    await goalClarificationService.validateGoalOrThrow(goalText);
    apiCalls++;

    // Step 2: 目標解析
    const goalAnalysis = await this.analyzeGoal(goalText);
    apiCalls++;

    // Step 3: 各ブロック生成 (ハイブリッド戦略)
    const blocks: QuestionBlock[] = [];

    // ブロックA: AI生成 (目標焦点 - 分野特化必須)
    blocks.push(await this.generateBlockA_AI(goalAnalysis));
    apiCalls++;

    // ブロックB: テンプレ (学習方針 - 汎用的)
    blocks.push(this.generateBlockB_Template(goalAnalysis));

    // ブロックC: AI生成 (成果確認 - 評価方法は分野依存)
    blocks.push(await this.generateBlockC_AI(goalAnalysis));
    apiCalls++;

    // ブロックD: テンプレ (継続対策 - 挫折は汎用的)
    blocks.push(this.generateBlockD_Template(goalAnalysis));

    const generationTime = Date.now() - startTime;

    return {
      goalAnalysis,
      blocks,
      generationMetadata: {
        aiGeneratedBlocks: ['A', 'C'],
        templateBlocks: ['B', 'D'],
        totalApiCalls: apiCalls,
        generationTime
      }
    };
  }

  /**
   * 目標解析 (Phase 1から改良)
   */
  private async analyzeGoal(goalText: string): Promise<GoalAnalysis> {
    if (!advancedQuestService.isInitialized()) {
      throw new Error('AdvancedQuestService not initialized');
    }

    const analysisPrompt = `以下の学習目標を分析して、JSON形式で返してください。

目標: "${goalText}"

以下の形式で回答してください:
{
  "domain": "language|programming|business|creative|academic|fitness|general",
  "subDomain": "具体的なサブドメイン",
  "learningType": "knowledge|skill|habit|outcome",
  "complexity": "beginner|intermediate|advanced", 
  "timeHorizon": "short|medium|long",
  "keyTerms": ["重要なキーワード1", "キーワード2"]
}

分析観点:
- domain: 主要な学習分野 (creative=デザイン・音楽・芸術, academic=学問・資格, fitness=運動・健康を含む)
- subDomain: より具体的な専門領域
- learningType: knowledge(知識習得)/skill(スキル向上)/habit(習慣形成)/outcome(結果達成)
- complexity: beginner/intermediate/advanced
- timeHorizon: short(1-3月)/medium(3-6月)/long(6月+)
- keyTerms: 目標に含まれる重要な用語`;

    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: goalText,
        timeConstraintMinutes: 30,
        userPreferences: { difficulty: 'medium' },
        customPrompt: analysisPrompt
      });

      // レスポンスからJSONを抽出
      const jsonMatch = response.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const analysisData = JSON.parse(jsonMatch[0]);
      
      // データ検証
      const validatedAnalysis: GoalAnalysis = {
        domain: this.validateDomain(analysisData.domain),
        subDomain: analysisData.subDomain || 'general_learning',
        learningType: this.validateLearningType(analysisData.learningType),
        complexity: this.validateComplexity(analysisData.complexity),
        timeHorizon: this.validateTimeHorizon(analysisData.timeHorizon),
        keyTerms: Array.isArray(analysisData.keyTerms) ? analysisData.keyTerms.slice(0, 5) : []
      };

      console.log('🔍 Hybrid Goal Analysis:', validatedAnalysis);
      return validatedAnalysis;

    } catch (error) {
      console.error('AI goal analysis failed, using fallback:', error);
      return this.basicGoalAnalysis(goalText);
    }
  }

  /**
   * ブロックA: AI生成版 (目標焦点)
   */
  private async generateBlockA_AI(goalAnalysis: GoalAnalysis): Promise<QuestionBlock> {
    const prompt = `学習目標の焦点を明確にする質問を3つ生成してください。

目標分野: ${goalAnalysis.domain} (${goalAnalysis.subDomain})
学習タイプ: ${goalAnalysis.learningType}
複雑さ: ${goalAnalysis.complexity}

以下のJSON形式で回答してください:
{
  "blockTitle": "目標の焦点",
  "blockDescription": "目標設定を具体化します",
  "questions": [
    {
      "id": "A1",
      "question": "この分野で最も重視したいのはどの側面ですか？",
      "options": [
        {"id": "opt1", "label": "選択肢1", "value": "value1", "dataKey": "goal_focus"},
        {"id": "opt2", "label": "選択肢2", "value": "value2", "dataKey": "goal_focus"},
        {"id": "opt3", "label": "選択肢3", "value": "value3", "dataKey": "goal_focus"},
        {"id": "opt4", "label": "選択肢4", "value": "value4", "dataKey": "goal_focus"}
      ]
    },
    {
      "id": "A2", 
      "question": "より具体的にはどのような能力ですか？",
      "options": [
        {"id": "opt1", "label": "選択肢1", "value": "value1", "dataKey": "domain_scenes"},
        {"id": "opt2", "label": "選択肢2", "value": "value2", "dataKey": "domain_scenes"},
        {"id": "opt3", "label": "選択肢3", "value": "value3", "dataKey": "domain_scenes"},
        {"id": "opt4", "label": "選択肢4", "value": "value4", "dataKey": "domain_scenes"}
      ]
    },
    {
      "id": "A3",
      "question": "どのような学習範囲で取り組みますか？", 
      "options": [
        {"id": "broad", "label": "幅広く学んで全体像を把握", "value": "broad", "dataKey": "scope_style"},
        {"id": "prioritized", "label": "重要なテーマに絞って学習", "value": "prioritized", "dataKey": "scope_style"},
        {"id": "deep", "label": "ひとつのことを深く追求", "value": "deep", "dataKey": "scope_style"},
        {"id": "undecided", "label": "進めながら決めたい", "value": "undecided", "dataKey": "scope_style"}
      ]
    }
  ]
}

必須要件:
- 各質問は4択で、${goalAnalysis.domain}分野に特化した内容
- 選択肢は具体的で分かりやすく
- dataKeyは指定されたものを使用`;

    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: `${goalAnalysis.domain} - ${goalAnalysis.subDomain}`,
        timeConstraintMinutes: 30,
        userPreferences: { difficulty: 'medium' },
        customPrompt: prompt
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in BlockA AI response');
      }

      const blockData = JSON.parse(jsonMatch[0]);
      
      return {
        blockId: 'A',
        blockTitle: blockData.blockTitle || '目標の焦点',
        blockDescription: blockData.blockDescription || `${goalAnalysis.domain}の目標設定を具体化します`,
        questions: blockData.questions.map((q: any, index: number) => ({
          id: `A${index + 1}`,
          blockId: 'A' as const,
          stepInBlock: (index + 1) as 1 | 2 | 3,
          question: q.question,
          options: q.options,
          hasOptionalMemo: true,
          goalContext: `${goalAnalysis.domain}分野での質問${index + 1}`
        }))
      };

    } catch (error) {
      console.error('BlockA AI generation failed, using fallback:', error);
      return this.generateBlockA_Fallback(goalAnalysis);
    }
  }

  /**
   * ブロックB: テンプレ版 (学習方針) - 汎用的
   */
  private generateBlockB_Template(goalAnalysis: GoalAnalysis): QuestionBlock {
    return {
      blockId: 'B',
      blockTitle: '学習の進め方',
      blockDescription: '新しいことと復習のバランス、頻度、難易度を設定します',
      questions: [
        {
          id: 'B1',
          blockId: 'B',
          stepInBlock: 1,
          question: '新しいことを学ぶのと復習、どちらが多めがいいですか？',
          options: [
            { id: 'new_heavy', label: '新しいことをたくさん学びたい', value: 0.75, dataKey: 'novelty_preference' },
            { id: 'new_some', label: '新しいことを少し多めに', value: 0.60, dataKey: 'novelty_preference' },
            { id: 'repeat_some', label: '復習を少し多めに', value: 0.40, dataKey: 'novelty_preference' },
            { id: 'repeat_heavy', label: '復習をしっかりやりたい', value: 0.25, dataKey: 'novelty_preference' }
          ],
          hasOptionalMemo: true,
          goalContext: '学習における新規vs復習のバランス設定'
        },
        {
          id: 'B2',
          blockId: 'B',
          stepInBlock: 2,
          question: '復習はどのくらいの頻度がいいですか？',
          options: [
            { id: 'daily', label: '毎日コツコツと', value: 'daily', dataKey: 'review_cadence' },
            { id: 'every_other_day', label: '２日に１回程度', value: 'every_other_day', dataKey: 'review_cadence' },
            { id: 'weekly', label: '１週間に１回程度', value: 'weekly', dataKey: 'review_cadence' },
            { id: 'milestone', label: '区切りのタイミングで', value: 'milestone', dataKey: 'review_cadence' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'B1',
          goalContext: '復習頻度の設定'
        },
        {
          id: 'B3',
          blockId: 'B',
          stepInBlock: 3,
          question: 'どのくらいチャレンジしたいですか？',
          options: [
            { id: 'easy', label: '無理のない範囲で', value: -0.1, dataKey: 'difficulty_bias' },
            { id: 'normal', label: '適度なチャレンジで', value: 0, dataKey: 'difficulty_bias' },
            { id: 'challenge_some', label: '少し背伸びしたい', value: 0.1, dataKey: 'difficulty_bias' },
            { id: 'challenge_much', label: 'どんどんチャレンジしたい', value: 0.2, dataKey: 'difficulty_bias' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'B2',
          goalContext: 'チャレンジレベルの設定'
        }
      ]
    };
  }

  /**
   * ブロックC: AI生成版 (成果確認)
   */
  private async generateBlockC_AI(goalAnalysis: GoalAnalysis): Promise<QuestionBlock> {
    const prompt = `成果の確認方法を設定する質問を3つ生成してください。

目標分野: ${goalAnalysis.domain} (${goalAnalysis.subDomain})
学習タイプ: ${goalAnalysis.learningType}

以下のJSON形式で回答してください:
{
  "blockTitle": "成果の確認方法",
  "blockDescription": "学習成果をどう確認するかを設定します", 
  "questions": [
    {
      "id": "C1",
      "question": "「できた！」をどうやって確認したいですか？",
      "options": [
        {"id": "opt1", "label": "選択肢1", "value": "value1", "dataKey": "goal_evidence"},
        {"id": "opt2", "label": "選択肢2", "value": "value2", "dataKey": "goal_evidence"},
        {"id": "opt3", "label": "選択肢3", "value": "value3", "dataKey": "goal_evidence"},
        {"id": "opt4", "label": "選択肢4", "value": "value4", "dataKey": "goal_evidence"}
      ]
    },
    {
      "id": "C2",
      "question": "どんな目標設定にしますか？",
      "options": [
        {"id": "opt1", "label": "選択肢1", "value": "value1", "dataKey": "kpi_shape"},
        {"id": "opt2", "label": "選択肢2", "value": "value2", "dataKey": "kpi_shape"},
        {"id": "opt3", "label": "選択肢3", "value": "value3", "dataKey": "kpi_shape"},
        {"id": "opt4", "label": "選択肢4", "value": "value4", "dataKey": "kpi_shape"}
      ]
    },
    {
      "id": "C3",
      "question": "最終的にどんな形で仕上げたいですか？",
      "options": [
        {"id": "opt1", "label": "選択肢1", "value": "value1", "dataKey": "capstone_type"},
        {"id": "opt2", "label": "選択肢2", "value": "value2", "dataKey": "capstone_type"},
        {"id": "opt3", "label": "選択肢3", "value": "value3", "dataKey": "capstone_type"},
        {"id": "opt4", "label": "選択肢4", "value": "value4", "dataKey": "capstone_type"}
      ]
    }
  ]
}

必須要件:
- ${goalAnalysis.domain}分野に特化した評価方法
- 選択肢は実現可能で具体的なもの
- dataKeyは指定されたものを使用`;

    try {
      const response = await advancedQuestService.generateCustom({
        userGoal: `${goalAnalysis.domain} - ${goalAnalysis.subDomain}`,
        timeConstraintMinutes: 30,
        userPreferences: { difficulty: 'medium' },
        customPrompt: prompt
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in BlockC AI response');
      }

      const blockData = JSON.parse(jsonMatch[0]);
      
      return {
        blockId: 'C',
        blockTitle: blockData.blockTitle || '成果の確認方法',
        blockDescription: blockData.blockDescription || `${goalAnalysis.domain}の成果確認方法を設定します`,
        questions: blockData.questions.map((q: any, index: number) => ({
          id: `C${index + 1}`,
          blockId: 'C' as const,
          stepInBlock: (index + 1) as 1 | 2 | 3,
          question: q.question,
          options: q.options,
          hasOptionalMemo: true,
          goalContext: `${goalAnalysis.domain}分野での成果確認${index + 1}`
        }))
      };

    } catch (error) {
      console.error('BlockC AI generation failed, using fallback:', error);
      return this.generateBlockC_Fallback(goalAnalysis);
    }
  }

  /**
   * ブロックD: テンプレ版 (継続対策) - 汎用的
   */
  private generateBlockD_Template(goalAnalysis: GoalAnalysis): QuestionBlock {
    return {
      blockId: 'D',
      blockTitle: '継続のための対策',
      blockDescription: '挫折しやすいパターンと対処法を設定します',
      questions: [
        {
          id: 'D1',
          blockId: 'D',
          stepInBlock: 1,
          question: 'どんな時につまずきやすいですか？',
          options: [
            { id: 'time', label: '時間がなくて継続できない', value: 'time', dataKey: 'dropoff_type' },
            { id: 'difficulty', label: '内容が難しくて進まない', value: 'difficulty', dataKey: 'dropoff_type' },
            { id: 'focus', label: '集中が続かず気が散ってしまう', value: 'focus', dataKey: 'dropoff_type' },
            { id: 'meaning', label: 'なんのためにやっているか分からない', value: 'meaning', dataKey: 'dropoff_type' }
          ],
          hasOptionalMemo: true,
          goalContext: '典型的な挫折パターンの特定'
        },
        {
          id: 'D2',
          blockId: 'D',
          stepInBlock: 2,
          question: 'どんなきっかけでやめてしまいがちですか？',
          options: [
            { id: 'fatigue', label: '仕事で疲れてやる気が起きない', value: 'fatigue', dataKey: 'dropoff_trigger' },
            { id: 'schedule_slip', label: '予定がズレて時間がなくなる', value: 'schedule_slip', dataKey: 'dropoff_trigger' },
            { id: 'notification_noise', label: 'スマホや雑音で集中が途切れる', value: 'notification_noise', dataKey: 'dropoff_trigger' },
            { id: 'task_too_long', label: 'やることが多くて面倒になる', value: 'task_too_long', dataKey: 'dropoff_trigger' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'D1',
          goalContext: '挫折のきっかけとなる具体的なトリガー'
        },
        {
          id: 'D3',
          blockId: 'D',
          stepInBlock: 3,
          question: 'うまくいかない時はどうしたいですか？',
          options: [
            { id: 'micro_switch', label: '短時間でできることに切り替える', value: 'micro_switch', dataKey: 'fallback_strategy' },
            { id: 'defer', label: '明日に繰り越してリセットする', value: 'defer', dataKey: 'fallback_strategy' },
            { id: 'substitute', label: 'もっと簡単なことに変更する', value: 'substitute', dataKey: 'fallback_strategy' },
            { id: 'announce', label: '誰かに報告してサポートを求める', value: 'announce', dataKey: 'fallback_strategy' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'D1_D2',
          goalContext: '挫折時の回復戦略'
        }
      ]
    };
  }

  // =====================
  // ユーティリティ関数
  // =====================

  private validateDomain(domain: string): GoalAnalysis['domain'] {
    const validDomains = ['language', 'programming', 'business', 'creative', 'academic', 'fitness', 'general'];
    return validDomains.includes(domain) ? domain as GoalAnalysis['domain'] : 'general';
  }

  private validateLearningType(type: string): GoalAnalysis['learningType'] {
    const validTypes = ['knowledge', 'skill', 'habit', 'outcome'];
    return validTypes.includes(type) ? type as GoalAnalysis['learningType'] : 'skill';
  }

  private validateComplexity(complexity: string): GoalAnalysis['complexity'] {
    const validComplexities = ['beginner', 'intermediate', 'advanced'];
    return validComplexities.includes(complexity) ? complexity as GoalAnalysis['complexity'] : 'intermediate';
  }

  private validateTimeHorizon(horizon: string): GoalAnalysis['timeHorizon'] {
    const validHorizons = ['short', 'medium', 'long'];
    return validHorizons.includes(horizon) ? horizon as GoalAnalysis['timeHorizon'] : 'medium';
  }

  private basicGoalAnalysis(goalText: string): GoalAnalysis {
    const text = goalText.toLowerCase();
    
    // 基本的なドメイン判定
    let domain: GoalAnalysis['domain'] = 'general';
    let subDomain = 'general_learning';
    
    if (text.includes('英語') || text.includes('english')) {
      domain = 'language'; subDomain = 'english_learning';
    } else if (text.includes('プログラミング') || text.includes('react')) {
      domain = 'programming'; subDomain = 'web_development';
    } else if (text.includes('ビジネス') || text.includes('営業')) {
      domain = 'business'; subDomain = 'business_skills';
    } else if (text.includes('デザイン') || text.includes('音楽')) {
      domain = 'creative'; subDomain = 'creative_skills';
    } else if (text.includes('資格') || text.includes('試験')) {
      domain = 'academic'; subDomain = 'certification';
    } else if (text.includes('筋トレ') || text.includes('ダイエット')) {
      domain = 'fitness'; subDomain = 'fitness_training';
    }

    return {
      domain,
      subDomain,
      learningType: 'skill',
      complexity: 'intermediate',
      timeHorizon: 'medium',
      keyTerms: goalText.split(/\s|、/).filter(term => term.length > 1).slice(0, 3)
    };
  }

  private generateBlockA_Fallback(goalAnalysis: GoalAnalysis): QuestionBlock {
    return {
      blockId: 'A',
      blockTitle: '目標の焦点',
      blockDescription: `${goalAnalysis.domain}の目標設定を具体化します`,
      questions: [
        {
          id: 'A1',
          blockId: 'A',
          stepInBlock: 1,
          question: 'この学習でどのような側面を重視したいですか？',
          options: [
            { id: 'knowledge', label: 'まずは知る・わかるを増やしたい', value: 'knowledge', dataKey: 'goal_focus' },
            { id: 'skill', label: 'できることを増やしたい', value: 'skill', dataKey: 'goal_focus' },
            { id: 'outcome', label: '結果（合格/数字/順位）を出したい', value: 'outcome', dataKey: 'goal_focus' },
            { id: 'habit', label: '続ける習慣をつくりたい', value: 'habit', dataKey: 'goal_focus' }
          ],
          hasOptionalMemo: true,
          goalContext: '基本的な学習目的の確認'
        },
        {
          id: 'A2',
          blockId: 'A',
          stepInBlock: 2,
          question: 'より具体的にはどのような能力ですか？',
          options: [
            { id: 'general', label: '全般的な能力向上', value: 'general', dataKey: 'domain_scenes' },
            { id: 'practical', label: '実践的なスキル', value: 'practical', dataKey: 'domain_scenes' },
            { id: 'foundational', label: '基礎固め', value: 'foundational', dataKey: 'domain_scenes' },
            { id: 'specialized', label: '専門性を高める', value: 'specialized', dataKey: 'domain_scenes' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'A1',
          goalContext: '能力の具体化'
        },
        {
          id: 'A3',
          blockId: 'A',
          stepInBlock: 3,
          question: 'どのような学習範囲で取り組みますか？',
          options: [
            { id: 'broad', label: '幅広く学んで全体像を把握', value: 'broad', dataKey: 'scope_style' },
            { id: 'prioritized', label: '重要なテーマに絞って学習', value: 'prioritized', dataKey: 'scope_style' },
            { id: 'deep', label: 'ひとつのことを深く追求', value: 'deep', dataKey: 'scope_style' },
            { id: 'undecided', label: '進めながら決めたい', value: 'undecided', dataKey: 'scope_style' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'A2',
          goalContext: '学習範囲の設定'
        }
      ]
    };
  }

  private generateBlockC_Fallback(goalAnalysis: GoalAnalysis): QuestionBlock {
    return {
      blockId: 'C',
      blockTitle: '成果の確認方法',
      blockDescription: `${goalAnalysis.domain}の成果確認方法を設定します`,
      questions: [
        {
          id: 'C1',
          blockId: 'C',
          stepInBlock: 1,
          question: '「できた！」をどうやって確認したいですか？',
          options: [
            { id: 'credential_score', label: 'テストや試験の点数で', value: 'credential_score', dataKey: 'goal_evidence' },
            { id: 'portfolio_demo', label: '作品やポートフォリオで', value: 'portfolio_demo', dataKey: 'goal_evidence' },
            { id: 'realworld_result', label: '実際の仕事や実績で', value: 'realworld_result', dataKey: 'goal_evidence' },
            { id: 'presentation_review', label: '発表やレビューで', value: 'presentation_review', dataKey: 'goal_evidence' }
          ],
          hasOptionalMemo: true,
          goalContext: '成果の確認方法'
        },
        {
          id: 'C2',
          blockId: 'C',
          stepInBlock: 2,
          question: 'どんな目標設定にしますか？',
          options: [
            { id: 'kpi_1', label: 'まずは1つの目標達成', value: 'kpi_1', dataKey: 'kpi_shape' },
            { id: 'kpi_2', label: '2つの目標を並行', value: 'kpi_2', dataKey: 'kpi_shape' },
            { id: 'kpi_quality', label: '質重視で1つを徹底', value: 'kpi_quality', dataKey: 'kpi_shape' },
            { id: 'kpi_flexible', label: '状況に応じて調整', value: 'kpi_flexible', dataKey: 'kpi_shape' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'C1',
          goalContext: '目標設定の方針'
        },
        {
          id: 'C3',
          blockId: 'C',
          stepInBlock: 3,
          question: '最終的にどんな形で仕上げたいですか？',
          options: [
            { id: 'test', label: '模試や本番試験で', value: 'test', dataKey: 'capstone_type' },
            { id: 'demo', label: 'デモや作品公開で', value: 'demo', dataKey: 'capstone_type' },
            { id: 'production', label: '実際の運用や納品で', value: 'production', dataKey: 'capstone_type' },
            { id: 'presentation', label: '発表やレビュー会で', value: 'presentation', dataKey: 'capstone_type' }
          ],
          hasOptionalMemo: true,
          parentDependency: 'C2',
          goalContext: '最終成果物の形式'
        }
      ]
    };
  }
}

export const hybridQuestionService = new HybridQuestionService();
export type { HybridQuestionSet };
