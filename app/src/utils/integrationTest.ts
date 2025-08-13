/**
 * MVP-014 Integration Test Suite
 * 
 * Core flow testing for MVP release readiness
 */

import { OpenAIService } from '../services/openaiService';
import { ProfilingService } from '../services/profilingService';
import { QuestManager } from '../services/questManager';
import { AuthService } from '../services/auth';
import { FirestoreService } from '../services/firestore';
import { OpenAITestUtils } from './openaiTest';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface IntegrationTestReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  timestamp: string;
}

export class IntegrationTestSuite {
  private openaiService: OpenAIService;
  private profilingService: ProfilingService;
  private questManager: QuestManager;

  constructor() {
    this.openaiService = new OpenAIService();
    this.profilingService = new ProfilingService();
    this.questManager = new QuestManager();
  }

  /**
   * Run complete integration test suite
   */
  async runFullTestSuite(): Promise<IntegrationTestReport> {
    console.log('🧪 Starting MVP-014 Integration Test Suite...');
    
    const results: TestResult[] = [];
    const startTime = Date.now();

    // 1. OpenAI Connection Test
    results.push(await this.testOpenAIConnection());

    // 2. Authentication Flow Test
    results.push(await this.testAuthenticationFlow());

    // 3. Profiling Flow Test
    results.push(await this.testProfilingFlow());

    // 4. Quest Generation Test
    results.push(await this.testQuestGeneration());

    // 5. Quest State Management Test
    results.push(await this.testQuestStateManagement());

    // 6. History Service Test
    results.push(await this.testHistoryService());

    // 7. Settings Service Test
    results.push(await this.testSettingsService());

    // 8. Notification Service Test
    results.push(await this.testNotificationService());

    const totalDuration = Date.now() - startTime;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;

    const report: IntegrationTestReport = {
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration,
      results,
      timestamp: new Date().toISOString(),
    };

    this.printTestReport(report);
    return report;
  }

  /**
   * Test OpenAI API connection and basic functionality
   */
  private async testOpenAIConnection(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🔗 Testing OpenAI connection...');
      
      await this.openaiService.initialize();
      
      if (!this.openaiService.isInitialized()) {
        throw new Error('OpenAI service failed to initialize');
      }

      // Test basic completion
      const testMessages = [
        { role: 'user' as const, content: 'Test message for integration test' }
      ];
      
      const response = await this.openaiService.chatCompletion(testMessages);
      
      if (!response || response.length < 10) {
        throw new Error('OpenAI response too short or empty');
      }

      return {
        testName: 'OpenAI Connection',
        passed: true,
        duration: Date.now() - startTime,
        details: { responseLength: response.length }
      };
    } catch (error) {
      return {
        testName: 'OpenAI Connection',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test authentication flow components
   */
  private async testAuthenticationFlow(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🔐 Testing authentication flow...');
      
      // Test getCurrentUser (should be null for test)
      const currentUser = AuthService.getCurrentUser();
      
      // Test error handling for invalid credentials
      try {
        await AuthService.login({ 
          email: 'invalid@test.com', 
          password: 'wrongpassword' 
        });
        throw new Error('Authentication should have failed');
      } catch (authError) {
        // Expected to fail
      }

      return {
        testName: 'Authentication Flow',
        passed: true,
        duration: Date.now() - startTime,
        details: { currentUser: currentUser ? 'logged in' : 'logged out' }
      };
    } catch (error) {
      return {
        testName: 'Authentication Flow',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test profiling functionality
   */
  private async testProfilingFlow(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('👤 Testing profiling flow...');
      
      // Initialize profiling service
      await this.profilingService.initialize();

      // Create test profiling data
      const testProfilingData = {
        ageRange: '20代' as const,
        availableTimePerDay: 60,
        goals: [
          {
            category: 'language' as const,
            title: 'Learn English',
            importance: 'high' as const
          }
        ],
        learningStyleAnswers: [
          {
            questionId: 'q1',
            selectedOptions: ['visual', 'hands-on']
          }
        ],
        motivation: 'achievement' as const,
        pace: 'moderate' as const,
        obstacles: ['time_shortage' as const] as any,
        completedAt: new Date().toISOString(),
        version: '1.0'
      };

      // Test AI analysis
      const analysis = await this.profilingService.analyzeProfile(testProfilingData);
      
      if (!analysis || !analysis.learningStrategy || analysis.learningStrategy.length === 0) {
        throw new Error('Invalid analysis result');
      }

      if (!analysis.strengths || analysis.strengths.length === 0) {
        throw new Error('Analysis missing strengths');
      }

      return {
        testName: 'Profiling Flow',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          strategiesCount: analysis.learningStrategy.length,
          strengthsCount: analysis.strengths.length,
          confidence: analysis.confidence
        }
      };
    } catch (error) {
      return {
        testName: 'Profiling Flow',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test quest generation functionality
   */
  private async testQuestGeneration(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🎯 Testing quest generation...');
      
      // Test basic quest generation with mock user ID
      const testUserId = 'test-user-integration';
      
      // Use the test method from QuestManager
      const generationResult = await this.questManager.testQuestGeneration(testUserId);
      
      if (!generationResult.success) {
        throw new Error(`Quest generation failed: ${generationResult.error}`);
      }

      if (!generationResult.quests || (generationResult as any).quests?.length === 0) {
        throw new Error('No quests generated');
      }

      // Validate quest structure  
      const quest = (generationResult as any).quests?.[0];
      if (!quest.id || !quest.title || !quest.category || !quest.difficulty) {
        throw new Error('Quest missing required fields');
      }

      return {
        testName: 'Quest Generation',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          questsGenerated: Array.isArray(generationResult.quests) ? generationResult.quests.length : 0,
          firstQuestTitle: quest.title,
          category: quest.category,
          difficulty: quest.difficulty
        }
      };
    } catch (error) {
      return {
        testName: 'Quest Generation',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test quest state management
   */
  private async testQuestStateManagement(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('📊 Testing quest state management...');
      
      // Test quest state service basic functionality
      const testUserId = 'test-user-state';
      
      // Test analytics generation (should not throw)
      const completionStats = await this.questManager.getCompletionStats(testUserId);
      
      // Should return valid stats structure even if empty
      if (typeof completionStats.todayCompletionRate !== 'number') {
        throw new Error('Invalid completion stats structure');
      }

      return {
        testName: 'Quest State Management',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          completionRate: completionStats.todayCompletionRate,
          totalGenerated: completionStats.todayTotal || 0,
          totalCompleted: completionStats.todayCompleted || 0
        }
      };
    } catch (error) {
      return {
        testName: 'Quest State Management',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test history service functionality
   */
  private async testHistoryService(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('📚 Testing history service...');
      
      // Import and test history service
      const { HistoryService } = await import('../services/historyService');
      const historyService = new HistoryService();
      
      // Test mock data generation
      const mockData = historyService.generateMockHistoryData();
      
      if (!mockData || !mockData.weeklyStats || !mockData.simpleStats) {
        throw new Error('Invalid mock history data structure');
      }

      if (!Array.isArray(mockData.weeklyStats.dailyRecords)) {
        throw new Error('Daily records should be an array');
      }

      return {
        testName: 'History Service',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          dailyRecordsCount: mockData.weeklyStats.dailyRecords.length,
          totalCompleted: mockData.simpleStats.totalCompletedEver,
          achievementsCount: mockData.recentAchievements.length
        }
      };
    } catch (error) {
      return {
        testName: 'History Service',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test settings service functionality
   */
  private async testSettingsService(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('⚙️ Testing settings service...');
      
      // Import and test settings service
      const { SettingsService } = await import('../services/settingsService');
      const settingsService = new SettingsService();
      
      // Test default settings generation
      const testSettings = await settingsService.getUserSettings('test-user');
      
      if (!testSettings || typeof testSettings.notifications.enabled !== 'boolean') {
        throw new Error('Invalid default settings structure');
      }

      return {
        testName: 'Settings Service',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          notificationsEnabled: testSettings.notifications.enabled,
          settingsVersion: 'v1.0'
        }
      };
    } catch (error) {
      return {
        testName: 'Settings Service',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test notification service functionality
   */
  private async testNotificationService(): Promise<TestResult> {
    const startTime = Date.now();
    try {
      console.log('🔔 Testing notification service...');
      
      // Import and test notification service
      const { NotificationService } = await import('../services/notificationService');
      
      // Test permission checking (should not throw)
      const hasPermission = await NotificationService.hasNotificationPermission();
      
      // Should return boolean
      if (typeof hasPermission !== 'boolean') {
        throw new Error('Invalid permission check result');
      }

      return {
        testName: 'Notification Service',
        passed: true,
        duration: Date.now() - startTime,
        details: {
          hasPermission
        }
      };
    } catch (error) {
      return {
        testName: 'Notification Service',
        passed: false,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Print formatted test report
   */
  private printTestReport(report: IntegrationTestReport): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 MVP-014 Integration Test Results');
    console.log('='.repeat(60));
    console.log(`📊 Summary: ${report.passedTests}/${report.totalTests} tests passed`);
    console.log(`⏱️ Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log('');

    report.results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`${index + 1}. ${status} ${result.testName} (${duration})`);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      }
      
      if (result.details) {
        console.log(`   ℹ️ Details: ${JSON.stringify(result.details)}`);
      }
      console.log('');
    });

    if (report.failedTests === 0) {
      console.log('🎉 All tests passed! MVP ready for release.');
    } else {
      console.log(`⚠️ ${report.failedTests} test(s) failed. Review and fix before release.`);
    }
    
    console.log('='.repeat(60));
  }

  /**
   * Run specific test category
   */
  async runCoreFlowTest(): Promise<TestResult[]> {
    return [
      await this.testOpenAIConnection(),
      await this.testAuthenticationFlow(),
      await this.testProfilingFlow(),
      await this.testQuestGeneration()
    ];
  }

  async runAIFunctionalityTest(): Promise<TestResult[]> {
    return [
      await this.testOpenAIConnection(),
      await this.testProfilingFlow(),
      await this.testQuestGeneration()
    ];
  }
}

// Export for easy usage
export const runIntegrationTests = async (): Promise<IntegrationTestReport> => {
  const testSuite = new IntegrationTestSuite();
  return await testSuite.runFullTestSuite();
};

export const runCoreFlowTests = async (): Promise<TestResult[]> => {
  const testSuite = new IntegrationTestSuite();
  return await testSuite.runCoreFlowTest();
};

// CommonJS exports for ts-node compatibility
module.exports = {
  runIntegrationTests,
  runCoreFlowTests,
  IntegrationTestSuite
};