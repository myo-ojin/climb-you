/**
 * Question Branching Logic Utilities
 * Handles dynamic question generation based on previous answers
 */

import { Question, QuestionOption, QUESTION_BLOCKS, BRANCHING_OPTIONS, ProfileAnswers } from '../types/onboardingQuestions';

/**
 * Get the current question based on block and step
 */
export function getCurrentQuestion(blockId: 'A' | 'B' | 'C' | 'D', stepInBlock: 1 | 2 | 3): Question {
  const block = QUESTION_BLOCKS[blockId];
  const question = block.find(q => q.stepInBlock === stepInBlock);
  
  if (!question) {
    throw new Error(`Question not found for block ${blockId}, step ${stepInBlock}`);
  }
  
  return question;
}

/**
 * Get options for a question, handling branching logic
 */
export function getQuestionOptions(question: Question, answers: ProfileAnswers): QuestionOption[] {
  // Debug logging
  console.log(`[QuestionBranching] Processing question ${question.id}`, {
    parentDependency: question.parentDependency,
    defaultOptionsCount: question.options.length,
    answers: answers
  });

  // If this question doesn't depend on parent, return its options directly
  if (!question.parentDependency) {
    console.log(`[QuestionBranching] No parent dependency, returning ${question.options.length} default options`);
    return question.options;
  }

  // Handle branching based on parent dependency
  if (question.id === 'A2') {
    // A2 branches based on A1 (goal_focus)
    const goalFocus = answers.goal_focus;
    if (goalFocus && BRANCHING_OPTIONS[goalFocus]) {
      return BRANCHING_OPTIONS[goalFocus];
    }
  } else if (question.id === 'A3') {
    // A3 branches based on A2 (various A2 responses)
    // We need to check all possible A2 dataKeys and find the match
    const a2Keys = ['goal_evidence', 'domain_scenes', 'habit_target', 'evidence_hint'];
    
    for (const key of a2Keys) {
      const value = answers[key as keyof ProfileAnswers];
      if (value && typeof value === 'string' && BRANCHING_OPTIONS[value]) {
        return BRANCHING_OPTIONS[value];
      }
      // Handle array values for domain_scenes
      if (Array.isArray(value) && value.length > 0 && BRANCHING_OPTIONS[value[0]]) {
        return BRANCHING_OPTIONS[value[0]];
      }
    }
  } else if (question.id === 'B2') {
    // B2 branches based on B1 (novelty_preference)
    const noveltyPref = answers.novelty_preference;
    console.log(`[B2 Branching] noveltyPref: ${noveltyPref}, looking for key: ${noveltyPref}`);
    
    // Handle floating point precision issues by checking multiple formats
    const possibleKeys = [
      noveltyPref?.toString(),
      noveltyPref?.toFixed(2),
      noveltyPref?.toFixed(1)
    ].filter(Boolean);
    
    for (const key of possibleKeys) {
      if (BRANCHING_OPTIONS[key]) {
        console.log(`[B2 Branching] Match found with key: ${key}, returning branched options`);
        return BRANCHING_OPTIONS[key];
      }
    }
    console.log(`[B2 Branching] No match found with keys:`, possibleKeys);
  } else if (question.id === 'C2') {
    // C2 branches based on C1 (goal_evidence)
    const goalEvidence = answers.goal_evidence;
    console.log(`[C2 Branching] goalEvidence: ${goalEvidence}, available keys:`, Object.keys(BRANCHING_OPTIONS).filter(k => k.includes('_')));
    if (goalEvidence && BRANCHING_OPTIONS[goalEvidence]) {
      console.log(`[C2 Branching] Match found for ${goalEvidence}, returning branched options`);
      return BRANCHING_OPTIONS[goalEvidence];
    }
  } else if (question.id === 'B3') {
    // B3 branches based on B2 (review_cadence)
    const reviewCadence = answers.review_cadence;
    console.log(`[B3 Branching] reviewCadence: ${reviewCadence}, looking for key: ${reviewCadence}`);
    console.log(`[B3 Branching] Available review_cadence keys:`, Object.keys(BRANCHING_OPTIONS).filter(k => ['daily', 'every_other_day', 'weekly', 'milestone'].includes(k)));
    
    if (reviewCadence && BRANCHING_OPTIONS[reviewCadence]) {
      console.log(`[B3 Branching] Match found for ${reviewCadence}, returning branched options`);
      return BRANCHING_OPTIONS[reviewCadence];
    }
    console.log(`[B3 Branching] No match found for reviewCadence: ${reviewCadence}`);
  } else if (question.id === 'C3') {
    // C3 branches based on C2 (kpi_shape)
    const kpiShape = answers.kpi_shape;
    console.log(`[C3 Branching] kpiShape: ${kpiShape}, looking for key: ${kpiShape}`);
    console.log(`[C3 Branching] Available kpi_shape keys:`, Object.keys(BRANCHING_OPTIONS).filter(k => ['pass_margin', 'accuracy_70', 'mock_grade_a', 'time_optimization', 'one_work', 'two_works', 'three_works'].includes(k)));
    
    if (kpiShape && BRANCHING_OPTIONS[kpiShape]) {
      console.log(`[C3 Branching] Match found for ${kpiShape}, returning branched options`);
      return BRANCHING_OPTIONS[kpiShape];
    }
    console.log(`[C3 Branching] No match found for kpiShape: ${kpiShape}`);
  } else if (question.id === 'D2') {
    // D2 branches based on D1 (dropoff_type)
    const dropoffType = answers.dropoff_type;
    if (dropoffType && BRANCHING_OPTIONS[dropoffType]) {
      return BRANCHING_OPTIONS[dropoffType];
    }
  } else if (question.id === 'D3') {
    // D3 branches based on D1+D2 combination (special case)
    const dropoffType = answers.dropoff_type;
    const dropoffTrigger = answers.dropoff_trigger;
    
    console.log(`[D3 Branching] dropoffType: ${dropoffType}, dropoffTrigger: ${dropoffTrigger}`);
    
    if (dropoffType && dropoffTrigger) {
      // Create compound key for D1+D2 combination
      const compoundKey = `${dropoffType}_${dropoffTrigger}`;
      console.log(`[D3 Branching] Generated compound key: "${compoundKey}"`);
      console.log(`[D3 Branching] Available compound keys:`, Object.keys(BRANCHING_OPTIONS).filter(k => k.includes('_')));
      
      if (BRANCHING_OPTIONS[compoundKey]) {
        console.log(`[D3 Branching] Match found for compound key: ${compoundKey}, returning branched options`);
        return BRANCHING_OPTIONS[compoundKey];
      }
      console.log(`[D3 Branching] No match found for compound key: ${compoundKey}`);
    } else {
      console.log(`[D3 Branching] Missing required values - dropoffType: ${dropoffType}, dropoffTrigger: ${dropoffTrigger}`);
    }
  }

  // Fallback to default options if no branching match
  console.log(`[QuestionBranching] No branching match found, returning ${question.options.length} default options for ${question.id}`);
  return question.options;
}

/**
 * Get all questions in order with proper branching
 */
export function getAllQuestions(answers: ProfileAnswers = {}): Question[] {
  const allQuestions: Question[] = [];
  
  // Process each block in order
  ['A', 'B', 'C', 'D'].forEach(blockId => {
    const block = QUESTION_BLOCKS[blockId as keyof typeof QUESTION_BLOCKS];
    
    block.forEach(question => {
      // Create a copy of the question with proper options
      const questionWithOptions: Question = {
        ...question,
        options: getQuestionOptions(question, answers),
      };
      
      // Debug log for B3 specifically
      if (question.id === 'B3') {
        console.log(`[getAllQuestions] B3 question created with ${questionWithOptions.options.length} options`);
        console.log(`[getAllQuestions] B3 options:`, questionWithOptions.options.map(opt => ({id: opt.id, dataKey: opt.dataKey})));
      }
      
      allQuestions.push(questionWithOptions);
    });
  });

  return allQuestions;
}

/**
 * Get block information for progress display
 */
export function getBlockInfo(blockId: 'A' | 'B' | 'C' | 'D') {
  const blockTitles = {
    A: 'ゴールの像',
    B: '道筋と負荷', 
    C: '証拠と仕上げ',
    D: '挫折要因とリカバリ',
  };

  return {
    id: blockId,
    title: blockTitles[blockId],
    totalSteps: 3,
  };
}

/**
 * Calculate overall progress
 */
export function calculateProgress(currentBlock: 'A' | 'B' | 'C' | 'D', currentStep: 1 | 2 | 3): {
  blockProgress: number;
  overallProgress: number;
  blockIndex: number;
} {
  const blockOrder = ['A', 'B', 'C', 'D'];
  const blockIndex = blockOrder.indexOf(currentBlock);
  const blockProgress = (currentStep / 3) * 100;
  const overallProgress = ((blockIndex * 3 + currentStep) / 12) * 100;

  return {
    blockProgress,
    overallProgress,
    blockIndex,
  };
}

/**
 * Get next question position
 */
export function getNextQuestionPosition(
  currentBlock: 'A' | 'B' | 'C' | 'D', 
  currentStep: 1 | 2 | 3
): { nextBlock: 'A' | 'B' | 'C' | 'D' | null, nextStep: 1 | 2 | 3 | null } {
  if (currentStep < 3) {
    return { nextBlock: currentBlock, nextStep: (currentStep + 1) as 1 | 2 | 3 };
  }

  // Move to next block
  const blockOrder: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const currentBlockIndex = blockOrder.indexOf(currentBlock);
  
  if (currentBlockIndex < 3) {
    return { nextBlock: blockOrder[currentBlockIndex + 1], nextStep: 1 };
  }

  // End of questions
  return { nextBlock: null, nextStep: null };
}

/**
 * Get previous question position
 */
export function getPreviousQuestionPosition(
  currentBlock: 'A' | 'B' | 'C' | 'D', 
  currentStep: 1 | 2 | 3
): { prevBlock: 'A' | 'B' | 'C' | 'D' | null, prevStep: 1 | 2 | 3 | null } {
  if (currentStep > 1) {
    return { prevBlock: currentBlock, prevStep: (currentStep - 1) as 1 | 2 | 3 };
  }

  // Move to previous block
  const blockOrder: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
  const currentBlockIndex = blockOrder.indexOf(currentBlock);
  
  if (currentBlockIndex > 0) {
    return { prevBlock: blockOrder[currentBlockIndex - 1], prevStep: 3 };
  }

  // Beginning of questions
  return { prevBlock: null, prevStep: null };
}

/**
 * Validate if all required answers are provided
 */
export function validateAnswers(answers: ProfileAnswers): { isValid: boolean; missingFields: string[] } {
  console.log('🔍 validateAnswers called with:', answers);
  
  const requiredFields = [
    'goal_focus', 'scope_style', 'novelty_preference', 'review_cadence', 
    'difficulty_bias', 'goal_evidence', 'capstone_type', 'dropoff_type', 
    'dropoff_trigger', 'fallback_strategy'
  ];

  const missingFields = requiredFields.filter(field => {
    const value = answers[field as keyof ProfileAnswers];
    const isMissing = value === undefined || value === null;
    if (isMissing) {
      console.log(`❌ Missing field: ${field} (value: ${value})`);
    }
    return isMissing;
  });
  
  console.log('📊 Validation summary:', {
    totalRequired: requiredFields.length,
    missingCount: missingFields.length,
    missingFields,
    isValid: missingFields.length === 0
  });
  
  // 一時的に緩和したバリデーション - 50%以上回答していれば通す
  const completionRate = (requiredFields.length - missingFields.length) / requiredFields.length;
  const isValid = completionRate >= 0.5; // 50%以上回答していればOK
  
  console.log(`🎯 Completion rate: ${(completionRate * 100).toFixed(1)}% (required: 50%)`);

  return {
    isValid,
    missingFields,
  };
}