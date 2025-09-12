/**
 * Quest Generation SDK Types - Climb You Integration
 * Based on climb_you_quest_generation_sdk_ts_v_0.ts
 */

import { z } from 'zod';

// Enhanced Onboarding Input Contract with category, importance, and milestones
export const OnboardingInputSchema = z.object({
  goal_text: z.string().min(1),
  goal_category: z.enum(['learning', 'career', 'health', 'skill', 'creative', 'other']),
  goal_deadline: z.string().min(1), // Either preset (1m/3m/6m/12m+) or YYYY-MM-DD
  goal_importance: z.number().int().min(1).max(5),
  goal_motivation: z.enum(['low', 'mid', 'high']),
  time_budget_min_per_day: z.number().int().min(1), // Either preset or custom number
  preferred_session_length_min: z.number().int().min(10).max(60),
  env_constraints: z.array(z.string()).default([]),
  modality_preference: z.array(z.enum(['dialog', 'read', 'audio', 'video'])).default([]),
  avoid_modality: z.array(z.enum(['dialog', 'read', 'audio', 'video'])).default([]),
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

// Enhanced Goal Data with Milestones
export const EnhancedGoalDataSchema = OnboardingInputSchema.extend({
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    targetDate: z.date(),
    isCompleted: z.boolean(),
    importance: z.enum(['low', 'medium', 'high']),
    estimatedDifficulty: z.number().min(0).max(1),
  })).optional(),
  timeframe_months: z.number().optional(),
});
export type EnhancedGoalData = z.infer<typeof EnhancedGoalDataSchema>;

// High-resolution profile output from P1 (Section 2)
export const HighResolutionProfileSchema = z.object({
  profile_v1: z.object({
    time_budget_min_per_day: z.number(),
    peak_hours: z.array(z.number()),
    env_constraints: z.array(z.string()),
    hard_constraints: z.array(z.string()),
    motivation_style: z.enum(['push', 'pull', 'social']),
    difficulty_tolerance: z.number().min(0).max(1),
    novelty_preference: z.number().min(0).max(1),
    pace_preference: z.enum(['sprint', 'cadence']),
    long_term_goal: z.string(),
    milestone_granularity: z.number().min(0).max(1),
    current_level_tags: z.array(z.string()),
    priority_areas: z.array(z.string()),
    heat_level: z.number().int().min(1).max(5),
    risk_factors: z.array(z.string()),
    preferred_session_length_min: z.number(),
    modality_preference: z.array(z.enum(['read', 'video', 'audio', 'dialog', 'mimesis'])),
    deliverable_preferences: z.array(z.enum(['note', 'flashcards', 'snippet', 'mini_task', 'past_paper'])),
    weekly_minimum_commitment_min: z.number(),
    goal_motivation: z.enum(['low', 'mid', 'high']),
  }),
  derived_hints: z.object({
    goal_horizon: z.enum(['1m', '3m', '6m', '12m+']),
    difficulty_hint: z.number().min(0).max(1),
    novelty_ratio: z.number().min(0).max(1),
  }),
  inferred: z.object({
    goal_focus: z.enum(['knowledge', 'skill', 'outcome', 'habit']),
    goal_tradeoff: z.enum(['quality', 'speed', 'balance', 'experiment']),
    goal_evidence: z.enum(['credential_score', 'portfolio_demo', 'realworld_result', 'presentation_review']),
    domain_tags: z.array(z.string()),
    profile_note: z.string(),
  }),
  confidence: z.object({
    goal_focus: z.number().min(0).max(1),
    goal_tradeoff: z.number().min(0).max(1),
    goal_evidence: z.number().min(0).max(1),
    domain_tags: z.number().min(0).max(1),
  }),
  ask_later: z.array(z.string()),
});
export type HighResolutionProfile = z.infer<typeof HighResolutionProfileSchema>;

// Re-export core SDK schemas and types  
export const ProfileV1Schema = z.object({
  time_budget_min_per_day: z.number().int().min(15).max(240),
  peak_hours: z.array(z.number().int().min(0).max(23)).max(8),
  env_constraints: z.array(z.string()).max(10),
  hard_constraints: z.array(z.string()).max(10),
  motivation_style: z.enum(["push", "pull", "social"]),
  difficulty_tolerance: z.number().min(0).max(1),
  novelty_preference: z.number().min(0).max(1),
  pace_preference: z.enum(["sprint", "cadence"]),
  long_term_goal: z.string().min(4).max(240).optional(),
  milestone_granularity: z.number().min(0).max(1).optional(),
  current_level_tags: z.array(z.string()).max(15).default([]),
  priority_areas: z.array(z.string()).max(5).default([]),
  heat_level: z.number().int().min(1).max(5).default(3),
  risk_factors: z.array(z.string()).max(10).default([]),
  preferred_session_length_min: z.number().int().min(10).max(60).default(20),
  modality_preference: z.array(z.enum(["read", "video", "audio", "dialog", "mimesis"]))
    .min(1)
    .max(5)
    .default(["read"]),
  deliverable_preferences: z
    .array(z.enum(["note", "flashcards", "snippet", "mini_task", "past_paper"]))
    .max(2)
    .default(["note"]),
  weekly_minimum_commitment_min: z.number().int().min(60).max(600).default(120),
  goal_motivation: z.enum(["low","mid","high"]).default("mid"),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type ProfileV1 = z.infer<typeof ProfileV1Schema>;

export const GoalDeepDiveAnswersSchema = z.object({
  goal_focus: z.object({ choice: z.enum(["knowledge","skill","outcome","habit"]), note: z.string().max(120).optional() }),
  goal_horizon: z.object({ choice: z.enum(["1m","3m","6m","12m+"]), note: z.string().max(120).optional() }),
  goal_tradeoff: z.object({ choice: z.enum(["quality","speed","balance","experiment"]), note: z.string().max(120).optional() }),
  goal_evidence: z.object({ choice: z.enum(["credential_score","portfolio_demo","realworld_result","presentation_review"]), note: z.string().max(120).optional() })
});
export type GoalDeepDiveAnswers = z.infer<typeof GoalDeepDiveAnswersSchema>;

export const PatternEnum = z.enum([
  "read_note_q",
  "flashcards", 
  "build_micro",
  "config_verify",
  "debug_explain",
  "feynman",
  "past_paper",
  "socratic",
  "shadowing",
  "retrospective",
]);
export type Pattern = z.infer<typeof PatternEnum>;

export const SkillAtomSchema = z.object({
  id: z.string().min(3),
  label: z.string().min(3),
  type: z.enum(["concept", "procedure", "habit"]),
  level: z.enum(["intro", "basic", "intermediate", "advanced"]),
  bloom: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]),
  prereq: z.array(z.string()).default([]),
  representative_tasks: z.array(z.string()).min(1).max(6),
  suggested_patterns: z.array(PatternEnum).default([]),
});
export type SkillAtom = z.infer<typeof SkillAtomSchema>;

export const QuestSchema = z.object({
  title: z.string().min(4),
  pattern: PatternEnum,
  minutes: z.number().int().min(10).max(90),
  difficulty: z.number().min(0).max(1).default(0.5),
  deliverable: z.string().min(2),
  steps: z.array(z.string()).min(1).max(3).optional(),
  criteria: z.array(z.string()).min(1),
  knowledge_check: z
    .array(z.object({ q: z.string(), a: z.string() }))
    .default([]),
  tags: z.array(z.string()).min(1),
  // Phase 0 additions for one-day completion guarantees
  done_definition: z.string().min(4).optional(),
  evidence: z.array(z.string()).max(3).default([]),
  alt_plan: z.string().min(4).optional(),
  stop_rule: z.string().min(4).optional(),
});
export type Quest = z.infer<typeof QuestSchema>;

export const QuestPlannedSchema = QuestSchema.extend({
  atom_id: z.string().optional(),
  planned_sp: z.number(),
  capstone: z.boolean().optional(),
});
export type QuestPlanned = z.infer<typeof QuestPlannedSchema>;

export const QuestAwardedSchema = QuestPlannedSchema.extend({
  awarded_sp: z.number(),
});
export type QuestAwarded = z.infer<typeof QuestAwardedSchema>;

export const DailyCheckinSchema = z.object({
  mood_energy: z.enum(["low", "mid", "high"]).default("mid"),
  available_time_today_delta_min: z.number().int().min(-60).max(60).default(0),
  focus_noise: z.enum(["low", "mid", "high"]).default("mid"),
});
export type DailyCheckins = z.infer<typeof DailyCheckinSchema>;

// Firestore document interfaces
export interface UserProfileDocument {
  basic: {
    goal_text: string;
    created_at: number;
    updated_at: number;
  };
  profile_v1: ProfileV1;
  goal_deep_dive: GoalDeepDiveAnswers;
  meta: {
    version: string;
    completed_onboarding: boolean;
    onboarding_completed_at?: number;
  };
}

export interface DailyQuestDocument {
  date: string; // YYYY-MM-DD
  quests: QuestPlanned[];
  checkins: DailyCheckins;
  generated_at: number;
  total_planned_sp: number;
  user_id: string;
}

export interface CompletedQuestDocument extends QuestAwarded {
  completion_id: string;
  user_id: string;
  date: string;
  completed_at: number;
  actual_minutes: number;
  criteria_met: boolean;
  quality_rating_1to5?: number;
  user_notes?: string;
}

export interface UserProgressDocument {
  user_id: string;
  total_awarded_sp: number;
  current_level: number;
  skill_coverage: Record<string, number>; // atom_id -> completion_count
  streak_days: number;
  basecamps_reached: number[];
  last_quest_date: string; // YYYY-MM-DD
  updated_at: number;
}

// Collection paths for type-safe Firestore access
export const FIRESTORE_COLLECTIONS = {
  users: 'users',
  skillAtoms: 'skill_atoms',
  dailyQuests: 'daily_quests', 
  completedQuests: 'completed_quests',
  progress: 'progress',
} as const;

// Helper function to create collection paths
export function getUserCollectionPath(userId: string, collection: keyof typeof FIRESTORE_COLLECTIONS): string {
  return `users/${userId}/${FIRESTORE_COLLECTIONS[collection]}`;
}

export function getUserDocumentPath(userId: string): string {
  return `users/${userId}`;  // Document path should be: users/{userId}
}

export function getUserProfileCollectionPath(userId: string): string {
  return `users/${userId}/profile_data`;  // Collection path: users/{userId}/profile_data
}

export function getUserProfileDocumentPath(userId: string): string {
  return `users/${userId}/profile_data/main`;  // Document path: users/{userId}/profile_data/main
}