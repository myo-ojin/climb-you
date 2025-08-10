import { 
  OpenAIMessage, 
  ProfileAnalysis, 
  DailyQuests,
  Quest 
} from '../types/openai';

/**
 * Mock OpenAI Service for development and testing
 */
export class MockOpenAIService {
  private mockDelay = 1500; // Simulate API delay

  async initialize(): Promise<void> {
    await this.delay(500);
    // Mock initialization always succeeds
  }

  isInitialized(): boolean {
    return true;
  }

  async testConnection(): Promise<boolean> {
    await this.delay(1000);
    return true;
  }

  async chatCompletion(messages: OpenAIMessage[]): Promise<string> {
    await this.delay(this.mockDelay);
    
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    // Mock different responses based on content
    if (content.includes('profile') || content.includes('analyze')) {
      return this.getMockProfileAnalysis();
    }
    
    if (content.includes('quest') || content.includes('daily')) {
      return this.getMockQuestGeneration();
    }

    return 'Mock response from OpenAI service';
  }

  async generateStructuredResponse<T>(
    messages: OpenAIMessage[],
    schema: any
  ): Promise<T> {
    const response = await this.chatCompletion(messages);
    
    try {
      const parsed = JSON.parse(response);
      return schema.parse(parsed);
    } catch {
      // Return default mock data if parsing fails
      return this.getDefaultMockData(schema) as T;
    }
  }

  getUsageStats() {
    return { requestCount: 42, tokenCount: 1337 };
  }

  updateConfig(): void {
    // Mock implementation
  }

  /**
   * Mock profile analysis response
   */
  private getMockProfileAnalysis(): string {
    const mockAnalysis: ProfileAnalysis = {
      learningStrategy: "あなたの学習スタイルは「達成重視型」で、明確な目標に向かって着実に進歩することにモチベーションを感じるタイプです。短期間で成果を実感できる学習方法が効果的です。",
      recommendedPace: "daily_moderate",
      strengths: [
        "目標設定が明確で具体的",
        "継続的な学習意欲が高い",
        "成果を数値で把握することを好む"
      ],
      improvements: [
        "完璧主義になりすぎないよう注意",
        "休息日も計画に組み込む",
        "小さな成功を積み重ねることを意識"
      ],
      personalizedMessage: "あなたなら必ず目標を達成できます！毎日少しずつでも継続することで、大きな山を登りきることができるでしょう。一歩一歩、着実に進んでいきましょう。"
    };

    return JSON.stringify(mockAnalysis);
  }

  /**
   * Mock quest generation response
   */
  private getMockQuestGeneration(): string {
    const mockQuests: DailyQuests = {
      date: new Date().toISOString().split('T')[0],
      quests: [
        {
          id: 'quest_1',
          title: 'TOEIC単語20個を覚える',
          description: '今日のTOEIC頻出単語20個を学習し、正しい発音とスペルを覚えましょう。',
          difficulty: 'easy',
          estimatedTime: 15,
          steps: [
            '単語帳または単語アプリを開く',
            '今日の20個の単語をリストアップ',
            '各単語の意味と発音を確認',
            '例文を読んで使い方を理解',
            '覚えたかテストで確認'
          ],
          successCriteria: '20個の単語の意味を思い出せる',
          goalContribution: 'TOEIC800点達成に向けた語彙力向上'
        },
        {
          id: 'quest_2',
          title: 'リスニング練習10分',
          description: 'TOEIC Part1形式の問題を使ってリスニング力を鍛えましょう。',
          difficulty: 'medium',
          estimatedTime: 10,
          steps: [
            'TOEIC練習アプリまたは教材を準備',
            'Part1の写真描写問題を5問選択',
            '音声を集中して聞く',
            '答えを選択し、解説を確認',
            '聞き取れなかった部分を復習'
          ],
          successCriteria: '5問中4問以上正解する',
          goalContribution: 'リスニングスコア向上とPart1攻略'
        },
        {
          id: 'quest_3',
          title: '学習の振り返りと明日の計画',
          description: '今日の学習を振り返り、明日の学習計画を立てましょう。',
          difficulty: 'easy',
          estimatedTime: 5,
          steps: [
            '今日学んだ内容をノートに書き出す',
            'うまくいった点と改善点を整理',
            '明日学習したい内容を決める',
            '学習時間を確保する時間帯を決める'
          ],
          successCriteria: '振り返りノートと明日の計画が完成',
          goalContribution: '継続的な学習習慣の確立'
        }
      ],
      aiMessage: "今日も学習お疲れ様です！今日のクエストは基礎固めを重視しました。特に単語学習は毎日の積み重ねが重要です。リスニングも短時間で集中して取り組むことで効果的に力が付きます。一つひとつのクエストを丁寧にこなして、山頂に向かって着実に進んでいきましょう！",
      totalEstimatedTime: 30
    };

    return JSON.stringify(mockQuests);
  }

  /**
   * Get default mock data based on schema
   */
  private getDefaultMockData(schema: any): any {
    // This is a simplified approach - in reality, you'd want more sophisticated mock data generation
    if (schema.shape?.learningStrategy) {
      return {
        learningStrategy: "Mock learning strategy",
        recommendedPace: "daily_light",
        strengths: ["Mock strength"],
        improvements: ["Mock improvement"],
        personalizedMessage: "Mock personalized message"
      };
    }

    if (schema.shape?.quests) {
      return {
        date: new Date().toISOString().split('T')[0],
        quests: [],
        aiMessage: "Mock AI message",
        totalEstimatedTime: 0
      };
    }

    return {};
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create appropriate service based on environment
 */
export function createOpenAIService(): MockOpenAIService {
  // Always return mock for now - will be updated to check environment
  return new MockOpenAIService();
}