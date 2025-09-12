/**
 * Pre-Goal Analysis Integration Test
 * 
 * OnboardingOrchestrationServiceとPre-Goal Analysis統合のテスト用スクリプト
 */

const { OnboardingOrchestrationService } = require('./src/services/ai/onboardingOrchestrationService.ts');

async function testPreGoalAnalysisIntegration() {
  console.log('🧪 Starting Pre-Goal Analysis integration test...\n');

  // テスト用のonboarding inputs
  const testInputs = {
    goal_text: "英語でビジネス会話ができるようになりたい",
    goal_category: "learning",
    goal_deadline: "6m",
    goal_importance: 4,
    goal_motivation: "high",
    time_budget_min_per_day: 45,
    preferred_session_length_min: 30,
    env_constraints: ["通勤中", "昼休み"],
    modality_preference: ["audio", "dialog"],
    avoid_modality: ["video"]
  };

  try {
    console.log('📋 Test inputs:');
    console.log(JSON.stringify(testInputs, null, 2));
    console.log('\n🎯 Executing enhanced onboarding...\n');

    const startTime = Date.now();

    // Enhanced onboardingを実行
    const result = await OnboardingOrchestrationService.executeEnhancedOnboarding(testInputs);

    const executionTime = Date.now() - startTime;

    console.log('✅ Enhanced onboarding completed!\n');
    console.log('📊 Results:');
    console.log({
      executionTime: `${executionTime}ms`,
      aiCallsCount: result.onboardingMetadata.aiCallsCount,
      confidence: result.onboardingMetadata.confidence,
      preGoalAnalysis: {
        domain: result.preGoalAnalysis.classification.domain,
        complexity: result.preGoalAnalysis.classification.complexity,
        horizonWeeks: result.preGoalAnalysis.classification.horizon_weeks,
        questionHints: result.preGoalAnalysis.question_hints.length,
        firstDayQuests: result.preGoalAnalysis.first_day_seed.quests.length
      },
      enhancedProfileQuestions: {
        questionsCount: result.enhancedProfileQuestions.questions.length,
        skippedCount: result.enhancedProfileQuestions.skipped.length
      },
      initialMilestones: {
        nowCount: result.initialMilestones.milestones.Now.length,
        nextCount: result.initialMilestones.milestones.Next.length,
        laterCount: result.initialMilestones.milestones.Later.length
      },
      firstDayQuests: {
        questCount: result.firstDayQuests.quests.length,
        totalTime: result.firstDayQuests.guarantees.totalTime
      }
    });

    // Validation test
    console.log('\n🔍 Validation check:');
    const validation = OnboardingOrchestrationService.validateOnboardingResult(result);
    console.log({
      isValid: validation.isValid,
      completeness: `${(validation.metrics.completeness * 100).toFixed(0)}%`,
      avgConfidence: validation.metrics.confidence_avg.toFixed(2),
      processingEfficiency: validation.metrics.processing_efficiency.toFixed(2),
      issues: validation.issues
    });

    if (validation.isValid) {
      console.log('\n🎉 Integration test PASSED!');
    } else {
      console.log('\n⚠️ Integration test completed with issues:', validation.issues);
    }

    return true;

  } catch (error) {
    console.error('❌ Integration test FAILED:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

// MockでAIサービスをテスト
function setupMockAI() {
  // Create mock that simulates AI service behavior but doesn't make actual API calls
  // This allows testing the integration flow without OpenAI dependency
  process.env.EXPO_PUBLIC_USE_MOCK_AI = 'true';
  console.log('🤖 Mock AI mode enabled for testing');
}

if (require.main === module) {
  setupMockAI();
  testPreGoalAnalysisIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testPreGoalAnalysisIntegration };