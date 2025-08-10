import { OpenAIService } from './openaiService';
import { FirestoreService } from './firestore';
import { 
  ProfilingData, 
  DetailedProfileAnalysis, 
  DetailedProfileAnalysisSchema,
  AnalysisContext
} from '../types/profiling';
import { OpenAIMessage } from '../types/openai';

export class ProfilingService {
  private openaiService: OpenAIService;
  private firestoreService: FirestoreService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.firestoreService = new FirestoreService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.openaiService.initialize();
  }

  /**
   * Analyze user profile with AI
   */
  async analyzeProfile(profilingData: ProfilingData): Promise<DetailedProfileAnalysis> {
    try {
      if (!this.openaiService.isInitialized()) {
        await this.initialize();
      }

      const analysisContext: AnalysisContext = {
        userProfile: profilingData,
        additionalContext: {
          currentDate: new Date().toISOString(),
          userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferredLanguage: 'ja',
        },
      };

      const systemPrompt = this.buildAnalysisPrompt();
      const userInput = this.formatProfilingDataForAI(analysisContext);

      const messages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput },
      ];

      const analysisResult = await this.openaiService.generateStructuredResponse<DetailedProfileAnalysis>(
        messages,
        DetailedProfileAnalysisSchema,
        3 // Max retries for important analysis
      );

      // Add metadata
      analysisResult.analysisDate = new Date().toISOString();
      analysisResult.modelVersion = 'gpt-4o-mini-v1';
      analysisResult.confidence = this.calculateConfidence(profilingData, analysisResult);

      return analysisResult;
    } catch (error) {
      throw new Error(`Profile analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save profiling data and analysis to Firestore
   */
  async saveProfileAnalysis(
    userId: string, 
    profilingData: ProfilingData, 
    analysis: DetailedProfileAnalysis
  ): Promise<void> {
    try {
      const profileDoc = {
        userId,
        profilingData,
        analysis,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
      };

      await this.firestoreService.setDocument('profiles', userId, profileDoc);
      
      // Also save to user's subcollection for history
      await this.firestoreService.addDocument(`users/${userId}/profiles`, {
        ...profileDoc,
        profileId: userId, // Reference to main profile
      });

    } catch (error) {
      throw new Error(`Failed to save profile analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve saved profile analysis
   */
  async getProfileAnalysis(userId: string): Promise<{ profilingData: ProfilingData; analysis: DetailedProfileAnalysis } | null> {
    try {
      const profileDoc = await this.firestoreService.getDocument(`profiles/${userId}`, userId);
      
      if (!profileDoc) {
        return null;
      }

      return {
        profilingData: profileDoc.profilingData,
        analysis: profileDoc.analysis,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve profile analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update existing profile analysis
   */
  async updateProfileAnalysis(
    userId: string, 
    updates: Partial<ProfilingData>
  ): Promise<DetailedProfileAnalysis> {
    try {
      const existing = await this.getProfileAnalysis(userId);
      if (!existing) {
        throw new Error('No existing profile found');
      }

      const updatedProfilingData: ProfilingData = {
        ...existing.profilingData,
        ...updates,
        completedAt: new Date().toISOString(), // Update completion time
      };

      const newAnalysis = await this.analyzeProfile(updatedProfilingData);
      await this.saveProfileAnalysis(userId, updatedProfilingData, newAnalysis);

      return newAnalysis;
    } catch (error) {
      throw new Error(`Failed to update profile analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the system prompt for AI analysis
   */
  private buildAnalysisPrompt(): string {
    return `あなたは「Climb You」という学習支援アプリの専門AIアナリストです。ユーザーのプロファイリングデータを分析し、パーソナライズされた学習戦略を提案してください。

【分析の目的】
- ユーザーの学習特性を深く理解する
- 効果的で継続可能な学習計画を提案する
- モチベーション維持のための具体的なアドバイスを提供する
- 目標達成のための段階的なロードマップを作成する

【分析の視点】
1. 学習スタイル分析：回答から読み取れる学習の傾向
2. モチベーション分析：何が学習の動機となるか
3. 時間管理分析：利用可能時間での最適な学習方法
4. 目標分析：目標の実現可能性と優先順位
5. 障害分析：学習を阻む要因とその対策

【出力要件】
- JSON形式で構造化された分析結果を返してください
- 日本語で親しみやすく、具体的なアドバイスを含めてください
- ユーザーの年齢層と目標に適した内容にしてください
- 実行可能で現実的な提案を心がけてください

【重要】
- 分析結果は必ず指定されたJSON形式で返してください
- personalizedMessageは励ましと具体的な次のステップを含めてください
- confidenceスコアは分析の確信度を0-1で表現してください`;
  }

  /**
   * Format profiling data for AI input
   */
  private formatProfilingDataForAI(context: AnalysisContext): string {
    const { userProfile, additionalContext } = context;
    
    const formattedGoals = userProfile.goals.map((goal, index) => 
      `${index + 1}. ${goal.title} (カテゴリ: ${goal.category}, 重要度: ${goal.importance}${goal.deadline ? `, 期限: ${goal.deadline}` : ''})`
    ).join('\n');

    const formattedObstacles = userProfile.obstacles.map(obstacle => 
      this.translateObstacle(obstacle)
    ).join(', ');

    return `【ユーザープロファイル】
年齢層: ${userProfile.ageRange}
1日の利用可能時間: ${userProfile.availableTimePerDay}分
学習ペース希望: ${this.translatePace(userProfile.pace)}
主なモチベーション: ${this.translateMotivation(userProfile.motivation)}
学習上の障害: ${formattedObstacles}

【学習目標】
${formattedGoals}

【学習スタイル診断結果】
${userProfile.learningStyleAnswers.map(answer => 
  `質問ID: ${answer.questionId}, 選択: ${answer.selectedOptions.join(', ')}`
).join('\n')}

【分析日時】
${additionalContext.currentDate}

上記の情報を基に、詳細な分析を行い、JSON形式で結果を返してください。`;
  }

  /**
   * Calculate confidence score based on data completeness and consistency
   */
  private calculateConfidence(profilingData: ProfilingData, analysis: DetailedProfileAnalysis): number {
    let score = 0.5; // Base score

    // Data completeness
    if (profilingData.goals.length >= 2) score += 0.1;
    if (profilingData.learningStyleAnswers.length >= 3) score += 0.1;
    if (profilingData.obstacles.length > 0) score += 0.1;

    // Analysis richness
    if (analysis.strengths.length >= 2) score += 0.1;
    if (analysis.improvements.length >= 2) score += 0.1;
    if (analysis.goalBreakdown.length > 0) score += 0.1;

    return Math.min(1.0, Math.max(0.1, score));
  }

  /**
   * Translation helpers for better AI input
   */
  private translateMotivation(motivation: string): string {
    const translations: Record<string, string> = {
      achievement: '達成感重視',
      competition: '競争心重視',
      improvement: '自己改善重視',
      curiosity: '好奇心重視',
      social: '社会的承認重視',
      necessity: '実用性重視',
    };
    return translations[motivation] || motivation;
  }

  private translatePace(pace: string): string {
    const translations: Record<string, string> = {
      intensive: '集中的・短期間',
      moderate: '適度・継続的',
      light: '軽量・長期的',
      flexible: '柔軟・状況対応',
    };
    return translations[pace] || pace;
  }

  private translateObstacle(obstacle: string): string {
    const translations: Record<string, string> = {
      time_shortage: '時間不足',
      motivation_loss: 'モチベーション維持困難',
      difficulty: '難易度の高さ',
      distraction: '集中力の問題',
      perfectionism: '完璧主義傾向',
      procrastination: '先延ばし癖',
      resource_lack: 'リソース不足',
      support_lack: 'サポート不足',
    };
    return translations[obstacle] || obstacle;
  }
}