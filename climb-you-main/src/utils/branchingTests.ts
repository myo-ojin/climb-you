/**
 * Comprehensive Branching Logic Test Suite
 * Tests all question branching scenarios to ensure proper functionality
 */

import { ProfileAnswers } from '../types/onboardingQuestions';
import { getQuestionOptions, getCurrentQuestion } from './questionBranching';

export interface TestResult {
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
}

/**
 * Test scenarios covering all branching logic
 */
export const TEST_SCENARIOS = {
  // A2 Branching Tests (based on A1 goal_focus)
  A2_OUTCOME: {
    answers: { goal_focus: 'outcome' } as ProfileAnswers,
    expectedBranches: ['certification', 'sales', 'ranking', 'publication']
  },
  A2_SKILL: {
    answers: { goal_focus: 'skill' } as ProfileAnswers,
    expectedBranches: ['work_applicable', 'portfolio_creation', 'teaching_capable']
  },
  A2_HABIT: {
    answers: { goal_focus: 'habit' } as ProfileAnswers,
    expectedBranches: ['daily', 'three_times_week', 'weekend_intensive']
  },

  // A3 Branching Tests (based on A2 responses)
  A3_CERTIFICATION: {
    answers: { goal_focus: 'outcome', goal_evidence: 'certification' } as ProfileAnswers,
    expectedBranches: ['exam_focused', 'weak_areas', 'practice_intensive', 'flexible_exam']
  },
  A3_PORTFOLIO_CREATION: {
    answers: { goal_focus: 'skill', domain_scenes: ['portfolio_creation'] } as ProfileAnswers,
    expectedBranches: ['diverse_portfolio', 'theme_focused', 'masterpiece_one', 'flexible_portfolio']
  },

  // B2 Branching Tests (based on B1 novelty_preference)
  B2_LOW_NOVELTY: {
    answers: { novelty_preference: 0.25 } as ProfileAnswers,
    expectedBranches: ['daily', 'every_other_day']
  },
  B2_HIGH_NOVELTY: {
    answers: { novelty_preference: 0.75 } as ProfileAnswers,
    expectedBranches: ['weekly', 'milestone']
  },

  // B3 Branching Tests (based on B2 review_cadence) - Critical for difficulty_bias
  B3_DAILY: {
    answers: { review_cadence: 'daily' } as ProfileAnswers,
    expectedDifficulty: 'difficulty_bias should be set',
    expectedBranches: ['steady_challenge', 'consistent_normal', 'ambitious_daily', 'comfortable_daily']
  },
  B3_MILESTONE: {
    answers: { review_cadence: 'milestone' } as ProfileAnswers,
    expectedDifficulty: 'difficulty_bias should be set',
    expectedBranches: ['milestone_jump', 'milestone_review', 'milestone_gradual', 'milestone_safe']
  },

  // C2 Branching Tests (based on C1 goal_evidence)
  C2_CREDENTIAL_SCORE: {
    answers: { goal_evidence: 'credential_score' } as ProfileAnswers,
    expectedBranches: ['pass_margin', 'accuracy_70', 'mock_grade_a', 'time_optimization']
  },
  C2_REALWORLD_RESULT: {
    answers: { goal_evidence: 'realworld_result' } as ProfileAnswers,
    expectedBranches: ['one_deal', 'three_deals', 'one_deployment', 'poc']
  },

  // C3 Branching Tests (based on C2 kpi_shape) - Previously failing
  C3_TIME_OPTIMIZATION: {
    answers: { goal_evidence: 'credential_score', kpi_shape: 'time_optimization' } as ProfileAnswers,
    expectedBranches: ['speed_test', 'efficiency_demo', 'method_presentation', 'real_application']
  },
  C3_POC: {
    answers: { goal_evidence: 'realworld_result', kpi_shape: 'poc' } as ProfileAnswers,
    expectedBranches: ['concept_test', 'prototype_demo', 'poc_presentation', 'proof_delivery']
  },
  C3_ONE_DEAL: {
    answers: { goal_evidence: 'realworld_result', kpi_shape: 'one_deal' } as ProfileAnswers,
    expectedBranches: ['client_research', 'pitch_demo', 'case_study', 'real_negotiation']
  },

  // D2 Branching Tests (based on D1 dropoff_type)
  D2_TIME: {
    answers: { dropoff_type: 'time' } as ProfileAnswers,
    expectedBranches: ['schedule_slip', 'overtime_work', 'urgent_tasks', 'time_management']
  },
  D2_MEANING: {
    answers: { dropoff_type: 'meaning' } as ProfileAnswers,
    expectedBranches: ['goal_unclear', 'progress_invisible', 'relevance_doubt', 'comparison_others']
  },

  // D3 Branching Tests (based on D1+D2 compound keys) - Previously failing
  D3_MEANING_COMPARISON_OTHERS: {
    answers: { dropoff_type: 'meaning', dropoff_trigger: 'comparison_others' } as ProfileAnswers,
    expectedBranches: ['self_confidence', 'positive_affirmation', 'supportive_community', 'comparison_detox']
  },
  D3_TIME_SCHEDULE_SLIP: {
    answers: { dropoff_type: 'time', dropoff_trigger: 'schedule_slip' } as ProfileAnswers,
    expectedBranches: ['flexible_scheduling', 'micro_tasks', 'buffer_time', 'accountability_partner']
  },
  D3_FOCUS_ENVIRONMENT: {
    answers: { dropoff_type: 'focus', dropoff_trigger: 'environment' } as ProfileAnswers,
    expectedBranches: ['location_change', 'noise_canceling', 'family_cooperation', 'optimal_time']
  }
};

/**
 * Run a single test scenario
 */
export function runSingleTest(scenarioName: string, scenario: any): TestResult {
  try {
    const testName = `${scenarioName} Branching Test`;
    
    // Determine which question to test based on scenario
    let questionId: string;
    if (scenarioName.startsWith('A2')) questionId = 'A2';
    else if (scenarioName.startsWith('A3')) questionId = 'A3';
    else if (scenarioName.startsWith('B2')) questionId = 'B2';
    else if (scenarioName.startsWith('B3')) questionId = 'B3';
    else if (scenarioName.startsWith('C2')) questionId = 'C2';
    else if (scenarioName.startsWith('C3')) questionId = 'C3';
    else if (scenarioName.startsWith('D2')) questionId = 'D2';
    else if (scenarioName.startsWith('D3')) questionId = 'D3';
    else throw new Error(`Unknown scenario type: ${scenarioName}`);

    // Get question based on block and step
    const blockId = questionId.charAt(0) as 'A' | 'B' | 'C' | 'D';
    const stepInBlock = parseInt(questionId.charAt(1)) as 1 | 2 | 3;
    
    const question = getCurrentQuestion(blockId, stepInBlock);
    const options = getQuestionOptions(question, scenario.answers);
    
    // Extract option IDs for comparison
    const actualBranches = options.map(opt => opt.id);
    const expectedBranches = scenario.expectedBranches;
    
    // Check if we got the expected branches
    const branchesMatch = expectedBranches.every((expected: string) => 
      actualBranches.includes(expected)
    );
    
    // Special check for B3 difficulty_bias setting
    if (scenarioName.startsWith('B3')) {
      const hasDifficultyBias = options.some(opt => opt.dataKey === 'difficulty_bias');
      if (!hasDifficultyBias) {
        return {
          testName,
          passed: false,
          expected: 'Options with difficulty_bias dataKey',
          actual: 'No difficulty_bias options found',
          details: `Options: ${JSON.stringify(actualBranches)}`
        };
      }
    }

    return {
      testName,
      passed: branchesMatch && options.length > 0,
      expected: `Branches: [${expectedBranches.join(', ')}]`,
      actual: `Branches: [${actualBranches.join(', ')}]`,
      details: options.length === 0 ? 'No options returned' : undefined
    };

  } catch (error) {
    return {
      testName: `${scenarioName} Branching Test`,
      passed: false,
      expected: 'Test execution',
      actual: 'Error occurred',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run all test scenarios
 */
export function runAllBranchingTests(): TestSuite {
  console.log('🧪 Starting Comprehensive Branching Logic Tests...');
  
  const results: TestResult[] = [];
  
  Object.entries(TEST_SCENARIOS).forEach(([scenarioName, scenario]) => {
    const result = runSingleTest(scenarioName, scenario);
    results.push(result);
    
    // Log individual test results
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}`);
    if (!result.passed) {
      console.log(`   Expected: ${result.expected}`);
      console.log(`   Actual: ${result.actual}`);
      if (result.details) console.log(`   Details: ${result.details}`);
    }
  });

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;

  const suite: TestSuite = {
    name: 'Branching Logic Test Suite',
    results,
    totalTests: results.length,
    passedTests,
    failedTests
  };

  console.log(`\n📊 Test Results: ${passedTests}/${results.length} passed`);
  if (failedTests > 0) {
    console.log(`❌ ${failedTests} tests failed`);
  } else {
    console.log('🎉 All tests passed!');
  }

  return suite;
}

/**
 * Run specific test categories
 */
export function runTestCategory(category: 'A2' | 'A3' | 'B2' | 'B3' | 'C2' | 'C3' | 'D2' | 'D3'): TestSuite {
  const filteredScenarios = Object.entries(TEST_SCENARIOS)
    .filter(([name]) => name.startsWith(category));
  
  const results: TestResult[] = [];
  
  filteredScenarios.forEach(([scenarioName, scenario]) => {
    const result = runSingleTest(scenarioName, scenario);
    results.push(result);
  });

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.length - passedTests;

  return {
    name: `${category} Branching Tests`,
    results,
    totalTests: results.length,
    passedTests,
    failedTests
  };
}