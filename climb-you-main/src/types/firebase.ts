/**
 * Firebase Types and Firestore Collection Structure
 * Comprehensive type definitions for Climb You Firebase integration
 */

import { Timestamp } from 'firebase/firestore';
import { Quest, SkillAtom, ProfileV1 } from './questGeneration';
import { CompleteOnboardingData } from './userProfile';
import { ProfileAnswers } from './onboardingQuestions';

// ============================================================================
// FIRESTORE COLLECTION STRUCTURE
// ============================================================================

/**
 * Main Collections:
 * - users/{userId} - User profile and settings
 * - users/{userId}/goals/{goalId} - User's learning goals
 * - users/{userId}/profileQuestions/{questionId} - AI-generated profile questions
 * - users/{userId}/profileResponses/{responseId} - User answers to questions
 * - users/{userId}/quests/{questId} - AI-generated quests/tasks
 * - users/{userId}/questPreferences/{preferenceId} - User's quest ratings
 * - users/{userId}/progress/{progressId} - Learning progress tracking
 * - users/{userId}/milestones/{milestoneId} - Achievement milestones
 * - analytics/{userId} - Anonymous usage analytics
 */

// ============================================================================
// USER PROFILE DOCUMENT
// ============================================================================

export interface FirebaseUserProfile {
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Onboarding data
  onboardingCompleted: boolean;
  onboardingCompletedAt?: Timestamp;
  onboardingVersion: string; // Track which version of onboarding was completed
  
  // Core profile information
  aiProfile: ProfileV1;
  skillAtoms: SkillAtom[];
  
  // App settings
  appSettings: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: 'ja' | 'en';
    timezone: string;
  };
  
  // Privacy settings
  dataRetentionDays: number;
  analyticsOptIn: boolean;
  
  // Computed statistics (updated by cloud functions)
  stats: {
    totalQuests: number;
    completedQuests: number;
    currentStreak: number;
    longestStreak: number;
    totalLearningMinutes: number;
    averageSessionLength: number;
    completionRate: number;
    lastActiveDate: Timestamp;
  };
}

// ============================================================================
// GOAL DOCUMENTS
// ============================================================================

export interface FirebaseGoal {
  id: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Goal details from onboarding
  goalText: string;
  goalCategory: 'learning' | 'career' | 'health' | 'skill' | 'creative' | 'other';
  goalDeadline: string; // YYYY-MM-DD or preset
  goalImportance: 1 | 2 | 3 | 4 | 5;
  timeBudgetPerDay: number;
  preferredSessionLength: number;
  
  // Environment constraints
  envConstraints: string[];
  modalityPreference: ('dialog' | 'read' | 'audio' | 'video')[];
  avoidModality: ('dialog' | 'read' | 'audio' | 'video')[];
  
  // Status
  status: 'active' | 'paused' | 'completed' | 'archived';
  completedAt?: Timestamp;
  
  // Progress tracking
  progress: {
    currentLevel: number;
    totalMilestones: number;
    completedMilestones: number;
    nextMilestoneDate?: Timestamp;
    progressPercentage: number;
  };
}

// ============================================================================
// PROFILE QUESTIONS & RESPONSES
// ============================================================================

export interface FirebaseProfileQuestion {
  id: string;
  userId: string;
  goalId: string;
  createdAt: Timestamp;
  
  // Question content (AI generated)
  questionText: string;
  questionType: 'multiple_choice' | 'scale' | 'text' | 'binary';
  options?: string[];
  metadata: {
    generationModel: string;
    generationVersion: string;
    parentDependency?: string;
  };
}

export interface FirebaseProfileResponse {
  id: string;
  userId: string;
  questionId: string;
  goalId: string;
  createdAt: Timestamp;
  
  // User's answer
  response: string | number | string[];
  confidence: number; // 0-1, how confident the user is in their answer
  timeSpentSeconds: number;
  
  // Optional memo
  memo?: string;
}

// ============================================================================
// QUESTS & PREFERENCES  
// ============================================================================

export interface FirebaseQuest {
  id: string;
  userId: string;
  goalId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Quest content (AI generated)
  title: string;
  description?: string;
  deliverable: string;
  minutes: number;
  difficulty: number; // 0-1
  pattern: string;
  
  // Quest metadata
  skillAtomIds: string[];
  dependencies: string[]; // Other quest IDs
  tags: string[];
  
  // User interaction
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'failed';
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  skippedAt?: Timestamp;
  
  // Quest outcome
  outcome?: {
    completionQuality: number; // 0-1
    timeSpent: number; // actual minutes
    userNotes?: string;
    difficulty_rating?: number; // User's difficulty rating 0-1
  };
  
  // Generation metadata
  generationContext: {
    model: string;
    version: string;
    parentQuests: string[];
    personalizationFactors: string[];
  };
}

export interface FirebaseQuestPreference {
  id: string;
  userId: string;
  questId: string;
  createdAt: Timestamp;
  
  // User's preference rating
  rating: 'love' | 'like' | 'dislike';
  reason?: string;
  
  // Context when rating was given
  context: {
    questStatus: string;
    sessionContext: string;
    timeOfDay: string;
  };
}

// ============================================================================
// PROGRESS & MILESTONES
// ============================================================================

export interface FirebaseProgress {
  id: string;
  userId: string;
  goalId: string;
  date: string; // YYYY-MM-DD
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Daily progress
  dailyStats: {
    questsCompleted: number;
    totalMinutes: number;
    sessionCount: number;
    averageQuality: number;
    skillAtomsProgressed: string[];
  };
  
  // Streaks and patterns
  streakDays: number;
  weeklyPattern: number[]; // 7 numbers, 0-1 completion rate per weekday
  
  // Mountain climbing progress
  mountainProgress: {
    currentAltitude: number; // 0-1, overall goal progress
    todayClimb: number; // meters climbed today
    totalDistance: number; // total distance climbed
    flagsCollected: string[]; // milestone achievement IDs
  };
}

export interface FirebaseMilestone {
  id: string;
  userId: string;
  goalId: string;
  createdAt: Timestamp;
  
  // Milestone definition
  title: string;
  description: string;
  targetDate: Timestamp;
  requiredProgress: number; // 0-1
  
  // Achievement
  status: 'pending' | 'achieved' | 'missed' | 'extended';
  achievedAt?: Timestamp;
  
  // Rewards and recognition
  reward?: {
    type: 'badge' | 'message' | 'unlock';
    content: string;
  };
}

// ============================================================================
// ANALYTICS & USAGE TRACKING
// ============================================================================

export interface FirebaseAnalytics {
  userId: string;
  date: string; // YYYY-MM-DD
  createdAt: Timestamp;
  
  // Anonymous usage patterns
  sessionData: {
    totalSessions: number;
    totalDuration: number;
    screenViews: { [screenName: string]: number };
    actionCounts: { [actionName: string]: number };
  };
  
  // Learning effectiveness
  learningMetrics: {
    questCompletionRate: number;
    averageQuestQuality: number;
    preferredTimeOfDay: string;
    preferredSessionLength: number;
    mostEffectiveQuestTypes: string[];
  };
  
  // AI personalization data
  personalizationEffectiveness: {
    questionAccuracy: number;
    questRelevance: number;
    userSatisfactionScore: number;
    adaptationSpeed: number;
  };
}

// ============================================================================
// FIRESTORE HELPER TYPES
// ============================================================================

export interface FirestoreCollectionPaths {
  users: (userId: string) => string;
  goals: (userId: string) => string;
  profileQuestions: (userId: string) => string;
  profileResponses: (userId: string) => string;
  quests: (userId: string) => string;
  questPreferences: (userId: string) => string;
  progress: (userId: string) => string;
  milestones: (userId: string) => string;
  analytics: (userId: string) => string;
}

export const FIRESTORE_COLLECTIONS: FirestoreCollectionPaths = {
  users: (userId: string) => `users/${userId}`,
  goals: (userId: string) => `users/${userId}/goals`,
  profileQuestions: (userId: string) => `users/${userId}/profileQuestions`,
  profileResponses: (userId: string) => `users/${userId}/profileResponses`,
  quests: (userId: string) => `users/${userId}/quests`,
  questPreferences: (userId: string) => `users/${userId}/questPreferences`,
  progress: (userId: string) => `users/${userId}/progress`,
  milestones: (userId: string) => `users/${userId}/milestones`,
  analytics: (userId: string) => `analytics/${userId}`,
};

// ============================================================================
// INTEGRATION HELPERS
// ============================================================================

/**
 * Convert CompleteOnboardingData to Firebase format
 */
export interface OnboardingToFirebaseData {
  userProfile: Partial<FirebaseUserProfile>;
  goal: Partial<FirebaseGoal>;
  profileResponses: FirebaseProfileResponse[];
  questPreferences: FirebaseQuestPreference[];
  initialQuests: FirebaseQuest[];
  initialProgress: FirebaseProgress;
}

/**
 * Firebase security rules structure
 */
export interface FirebaseSecurityContext {
  userId: string;
  isOwner: boolean;
  isAnonymous: boolean;
  createdWithin: (days: number) => boolean;
  hasValidProfile: boolean;
}

/**
 * Cloud Functions callable data structures
 */
export interface CloudFunctionRequest<T = any> {
  userId: string;
  data: T;
  context: {
    timestamp: Timestamp;
    version: string;
  };
}

export interface CloudFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    executionTime: number;
    version: string;
    timestamp: Timestamp;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  FirebaseUserProfile as UserProfile,
  FirebaseGoal as Goal,
  FirebaseQuest as Quest,
  FirebaseProgress as Progress,
  FirebaseMilestone as Milestone,
  FirebaseAnalytics as Analytics,
};

export default {
  COLLECTIONS: FIRESTORE_COLLECTIONS,
};