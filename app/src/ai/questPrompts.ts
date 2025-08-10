import { QuestGenerationRequest } from '../types/quest';

/**
 * Quest Generation Prompt Templates for OpenAI
 */
export class QuestPrompts {
  /**
   * Main system prompt for quest generation
   */
  static getSystemPrompt(): string {
    return `あなたは「Climb You」というAI学習支援アプリの専門クエスト生成AIです。

【あなたの役割】
- ユーザーの学習目標と特性を分析して、最適な日次学習クエストを生成する
- ユーザーが継続的に成長できる段階的な学習体験を設計する
- モチベーションを維持し、実行可能な具体的タスクを提案する

【クエスト生成の基本原則】
1. **段階的成長**: easy → medium → hard の適切な難易度バランス
2. **実行可能性**: ユーザーの利用可能時間内で完了可能
3. **具体性**: 曖昧でない、明確な行動指示
4. **成長実感**: 長期目標への貢献度を明示
5. **継続性**: 前日の学習を踏まえた連続性

【クエストカテゴリ】
- learning: 新しい知識やスキルの習得
- practice: 既習内容の練習・定着
- reflection: 学習の振り返りと分析
- action: 学んだことを実際に応用・実践
- research: 情報収集や調査活動

【出力形式】
必ずJSON形式で以下の構造で回答してください：
{
  "quests": [
    {
      "title": "クエストタイトル（20文字以内）",
      "description": "クエストの詳細説明（100文字以内）",
      "category": "learning|practice|reflection|action|research",
      "difficulty": "easy|medium|hard",
      "estimatedTimeMinutes": 数値,
      "instructions": ["具体的な実行手順1", "手順2", "手順3"],
      "successCriteria": ["成功基準1", "基準2"],
      "goalContribution": "長期目標への貢献説明",
      "motivationMessage": "励ましメッセージ"
    }
  ],
  "dailyMessage": "その日のモチベーション向上メッセージ",
  "totalEstimatedTime": 全クエストの合計予想時間（分）
}

【重要な注意事項】
- 必ず有効なJSONフォーマットで出力する
- estimatedTimeMinutesは5-240の範囲内
- instructionsは1-10個の配列
- successCriteriaは1-5個の配列
- 日本語で自然な表現を使用
- ユーザーの現在のレベルに適した内容にする`;
  }

  /**
   * Generate user prompt for quest generation
   */
  static getUserPrompt(request: QuestGenerationRequest): string {
    const { userProfile, questCount, difficultyDistribution, previousQuestHistory } = request;

    let prompt = `【ユーザープロファイル】
目標: ${userProfile.goals.join(', ')}
学習スタイル: ${userProfile.learningStyle}
利用可能時間: ${userProfile.availableTimeMinutes}分/日
現在のレベル: ${userProfile.currentLevel}
興味分野: ${userProfile.interests.join(', ')}`;

    if (userProfile.challenges && userProfile.challenges.length > 0) {
      prompt += `\n課題・困っていること: ${userProfile.challenges.join(', ')}`;
    }

    prompt += `\n\n【生成要求】
- クエスト数: ${questCount}個
- 総利用時間: ${userProfile.availableTimeMinutes}分以内`;

    if (difficultyDistribution) {
      prompt += `\n- 難易度分布: Easy ${Math.round(difficultyDistribution.easy * 100)}%, Medium ${Math.round(difficultyDistribution.medium * 100)}%, Hard ${Math.round(difficultyDistribution.hard * 100)}%`;
    }

    if (previousQuestHistory && previousQuestHistory.length > 0) {
      prompt += `\n\n【過去の学習履歴】`;
      previousQuestHistory.slice(0, 5).forEach((quest, index) => {
        const status = quest.completed ? '完了' : '未完了';
        const timeInfo = quest.timeSpent ? ` (${quest.timeSpent}分)` : '';
        prompt += `\n${index + 1}. ${quest.category}/${quest.difficulty} - ${status}${timeInfo}`;
      });
      
      prompt += `\n\n※過去の履歴を参考に、継続性と適切な難易度調整を行ってください。`;
    }

    prompt += `\n\n今日のユーザーに最適な学習クエストを生成してください。`;

    return prompt;
  }

  /**
   * Generate prompt for quest adaptation based on user performance
   */
  static getAdaptationPrompt(
    originalRequest: QuestGenerationRequest,
    performanceData: {
      completionRate: number;
      averageTimeSpent: number;
      strugglingCategories: string[];
      successfulCategories: string[];
    }
  ): string {
    let prompt = this.getUserPrompt(originalRequest);

    prompt += `\n\n【パフォーマンス分析】
完了率: ${Math.round(performanceData.completionRate * 100)}%
平均実行時間: ${performanceData.averageTimeSpent}分`;

    if (performanceData.strugglingCategories.length > 0) {
      prompt += `\n苦手分野: ${performanceData.strugglingCategories.join(', ')}`;
    }

    if (performanceData.successfulCategories.length > 0) {
      prompt += `\n得意分野: ${performanceData.successfulCategories.join(', ')}`;
    }

    prompt += `\n\n上記のパフォーマンス分析を踏まえて、難易度や内容を調整したクエストを生成してください。`;

    return prompt;
  }

  /**
   * Generate motivational message prompt
   */
  static getMotivationPrompt(
    userGoals: string[],
    recentProgress: {
      completedQuests: number;
      currentStreak: number;
      recentAchievements: string[];
    }
  ): string {
    return `【ユーザー目標】
${userGoals.join(', ')}

【最近の進捗】
完了クエスト数: ${recentProgress.completedQuests}
継続日数: ${recentProgress.currentStreak}日
最近の成果: ${recentProgress.recentAchievements.join(', ')}

上記の情報を基に、ユーザーのモチベーションを高める励ましのメッセージを150文字以内で生成してください。
成果を認めつつ、今日も頑張ろうという気持ちになるような内容にしてください。`;
  }

  /**
   * Generate quest refinement prompt for failed generations
   */
  static getRefinementPrompt(
    originalPrompt: string,
    errorDetails: string,
    attempt: number
  ): string {
    return `${originalPrompt}

【前回の生成エラー】
${errorDetails}

【修正指示】
- 試行回数: ${attempt}回目
- 必ず有効なJSONフォーマットで出力してください
- すべての必須フィールドを含めてください
- 文字数制限を守ってください
- 数値フィールドは適切な範囲内の数値にしてください

再度、正確なJSON形式でクエストを生成してください。`;
  }

  /**
   * Generate difficulty adjustment prompt
   */
  static getDifficultyAdjustmentPrompt(
    baseRequest: QuestGenerationRequest,
    adjustment: 'easier' | 'harder',
    reason: string
  ): string {
    const adjustmentText = adjustment === 'easier' 
      ? 'より簡単で取り組みやすい内容に調整' 
      : 'より挑戦的で成長につながる内容に調整';

    return `${this.getUserPrompt(baseRequest)}

【難易度調整要求】
調整方向: ${adjustmentText}
理由: ${reason}

上記の調整要求に基づいて、適切な難易度のクエストを生成してください。`;
  }
}