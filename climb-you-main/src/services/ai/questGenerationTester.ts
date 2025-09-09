/**
 * Quest Generation Tester - AIクエスト生成機能の包括テスト
 * 
 * 開発・デバッグ・品質保証のためのテストスイート
 */

import { advancedQuestService, ProfileV1, DailyCheckins } from './advancedQuestService.fixed';

export interface QuestGenerationTestResult {
  testName: string;
  success: boolean;
  duration: number;
  usedAI: boolean;
  questCount: number;
  totalMinutes: number;
  averageDifficulty: number;
  errors?: string[];
  warnings?: string[];
  details?: any;
}

export class QuestGenerationTester {
  private testResults: QuestGenerationTestResult[] = [];

  /**
   * 基本的なクエスト生成テスト
   */
  async testBasicGeneration(): Promise<QuestGenerationTestResult> {
    const testName = '基本クエスト生成テスト';
    const startTime = Date.now();
    
    try {
      const profile: ProfileV1 = advancedQuestService.createBasicProfile({
        goalText: 'React Nativeアプリ開発をマスターする',
        timeBudgetMin: 60,
        motivation: 'high',
        sessionLength: 20,
      });

      const { result, metrics } = await advancedQuestService.generateQuestsWithMetrics({
        goalText: profile.long_term_goal!,
        profile,
      });

      return {
        testName,
        success: result.success,
        duration: metrics.duration,
        usedAI: result.usedAI,
        questCount: metrics.questCount,
        totalMinutes: metrics.totalMinutes,
        averageDifficulty: metrics.averageDifficulty,
        warnings: result.warnings,
        details: {
          quests: result.finalQuests.quests.map(q => ({
            title: q.title,
            pattern: q.pattern,
            minutes: q.minutes,
            difficulty: q.difficulty,
          })),
        },
      };
      
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        usedAI: false,
        questCount: 0,
        totalMinutes: 0,
        averageDifficulty: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * 異なるプロファイルでのテスト
   */
  async testMultipleProfiles(): Promise<QuestGenerationTestResult[]> {
    const profiles = [
      {
        name: '初心者プログラマー',
        profile: advancedQuestService.createBasicProfile({
          goalText: 'プログラミング基礎を学ぶ',
          timeBudgetMin: 30,
          motivation: 'mid',
          sessionLength: 15,
        }),
      },
      {
        name: 'アドバンスド学習者',
        profile: {
          ...advancedQuestService.createBasicProfile({
            goalText: 'AI・機械学習の実装スキル向上',
            timeBudgetMin: 90,
            motivation: 'high',
            sessionLength: 30,
          }),
          difficulty_tolerance: 0.8,
          current_level_tags: ['intermediate', 'python', 'tensorflow'],
        },
      },
      {
        name: '忙しい社会人',
        profile: advancedQuestService.createBasicProfile({
          goalText: 'キャリアアップのためのスキル習得',
          timeBudgetMin: 20,
          motivation: 'low',
          sessionLength: 10,
        }),
      },
    ];

    const results: QuestGenerationTestResult[] = [];
    
    for (const { name, profile } of profiles) {
      const testName = `複数プロファイルテスト: ${name}`;
      const startTime = Date.now();
      
      try {
        const { result, metrics } = await advancedQuestService.generateQuestsWithMetrics({
          goalText: profile.long_term_goal!,
          profile,
        });

        results.push({
          testName,
          success: result.success,
          duration: metrics.duration,
          usedAI: result.usedAI,
          questCount: metrics.questCount,
          totalMinutes: metrics.totalMinutes,
          averageDifficulty: metrics.averageDifficulty,
          warnings: result.warnings,
          details: {
            profileName: name,
            timeBudget: profile.time_budget_min_per_day,
            sessionLength: profile.preferred_session_length_min,
            difficultyTolerance: profile.difficulty_tolerance,
          },
        });
        
      } catch (error) {
        results.push({
          testName,
          success: false,
          duration: Date.now() - startTime,
          usedAI: false,
          questCount: 0,
          totalMinutes: 0,
          averageDifficulty: 0,
          errors: [(error as Error).message],
        });
      }
    }
    
    return results;
  }

  /**
   * デイリーチェックインでのテスト
   */
  async testWithDailyCheckins(): Promise<QuestGenerationTestResult> {
    const testName = 'デイリーチェックイン考慮テスト';
    const startTime = Date.now();
    
    try {
      const profile = advancedQuestService.createBasicProfile({
        goalText: 'Web開発フルスタックエンジニアになる',
        timeBudgetMin: 45,
        motivation: 'high',
      });

      const checkins: DailyCheckins = {
        mood_energy: 'low',
        available_time_today_delta_min: -15, // 15分少ない
        focus_noise: 'high',
      };

      const { result, metrics } = await advancedQuestService.generateQuestsWithMetrics({
        goalText: profile.long_term_goal!,
        profile,
        checkins,
      });

      return {
        testName,
        success: result.success,
        duration: metrics.duration,
        usedAI: result.usedAI,
        questCount: metrics.questCount,
        totalMinutes: metrics.totalMinutes,
        averageDifficulty: metrics.averageDifficulty,
        warnings: result.warnings,
        details: {
          checkins,
          adjustedTime: profile.time_budget_min_per_day + checkins.available_time_today_delta_min,
        },
      };
      
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        usedAI: false,
        questCount: 0,
        totalMinutes: 0,
        averageDifficulty: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * パフォーマンステスト
   */
  async testPerformance(): Promise<QuestGenerationTestResult> {
    const testName = 'パフォーマンステスト（連続生成）';
    const startTime = Date.now();
    const iterations = 5;
    const results: any[] = [];
    
    try {
      const profile = advancedQuestService.createBasicProfile({
        goalText: 'データサイエンスプロフェッショナル',
        timeBudgetMin: 60,
        motivation: 'high',
      });

      for (let i = 0; i < iterations; i++) {
        const iterStartTime = Date.now();
        const { result, metrics } = await advancedQuestService.generateQuestsWithMetrics({
          goalText: `${profile.long_term_goal!} - 反復${i + 1}`,
          profile,
        });
        
        results.push({
          iteration: i + 1,
          duration: Date.now() - iterStartTime,
          success: result.success,
          questCount: metrics.questCount,
          usedAI: result.usedAI,
        });
      }

      const totalDuration = Date.now() - startTime;
      const avgDuration = totalDuration / iterations;
      const successRate = results.filter(r => r.success).length / iterations;
      
      return {
        testName,
        success: successRate > 0.8, // 80%以上の成功率
        duration: totalDuration,
        usedAI: results[0]?.usedAI || false,
        questCount: results.reduce((sum, r) => sum + r.questCount, 0),
        totalMinutes: 0,
        averageDifficulty: 0,
        details: {
          iterations,
          avgDuration,
          successRate,
          results,
        },
      };
      
    } catch (error) {
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        usedAI: false,
        questCount: 0,
        totalMinutes: 0,
        averageDifficulty: 0,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * 全テストスイートの実行
   */
  async runAllTests(): Promise<{
    summary: {
      totalTests: number;
      passed: number;
      failed: number;
      totalDuration: number;
      aiUsageRate: number;
    };
    results: QuestGenerationTestResult[];
  }> {
    console.log('🧪 Quest Generation Test Suite 開始...');
    const allResults: QuestGenerationTestResult[] = [];
    
    // 基本テスト
    const basicTest = await this.testBasicGeneration();
    allResults.push(basicTest);
    console.log(`✅ ${basicTest.testName}: ${basicTest.success ? 'PASS' : 'FAIL'}`);
    
    // 複数プロファイルテスト
    const multipleProfileTests = await this.testMultipleProfiles();
    allResults.push(...multipleProfileTests);
    multipleProfileTests.forEach(test => {
      console.log(`✅ ${test.testName}: ${test.success ? 'PASS' : 'FAIL'}`);
    });
    
    // デイリーチェックインテスト
    const checkinTest = await this.testWithDailyCheckins();
    allResults.push(checkinTest);
    console.log(`✅ ${checkinTest.testName}: ${checkinTest.success ? 'PASS' : 'FAIL'}`);
    
    // パフォーマンステスト
    const perfTest = await this.testPerformance();
    allResults.push(perfTest);
    console.log(`✅ ${perfTest.testName}: ${perfTest.success ? 'PASS' : 'FAIL'}`);
    
    // サマリー計算
    const totalTests = allResults.length;
    const passed = allResults.filter(r => r.success).length;
    const failed = totalTests - passed;
    const totalDuration = allResults.reduce((sum, r) => sum + r.duration, 0);
    const aiUsageRate = allResults.filter(r => r.usedAI).length / totalTests;
    
    const summary = {
      totalTests,
      passed,
      failed,
      totalDuration,
      aiUsageRate,
    };
    
    console.log('🎉 テストスイート完了');
    console.log(`📊 結果: ${passed}/${totalTests} テスト合格`);
    console.log(`⏱️  総時間: ${totalDuration}ms`);
    console.log(`🤖 AI使用率: ${Math.round(aiUsageRate * 100)}%`);
    
    return { summary, results: allResults };
  }

  /**
   * 診断情報の取得
   */
  getDiagnosticInfo() {
    return advancedQuestService.getDiagnosticInfo();
  }
}

export const questGenerationTester = new QuestGenerationTester();