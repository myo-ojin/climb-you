import { z } from 'zod';

// Age range options
export const AgeRangeSchema = z.enum(['10代', '20代', '30代', '40代', '50代以上']);

// Available time per day (in minutes)
export const AvailableTimeSchema = z.number().min(10).max(480); // 10min to 8hours

// Learning goals
export const LearningGoalSchema = z.object({
  category: z.enum(['language', 'skill', 'certification', 'academic', 'personal', 'other']),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  deadline: z.string().optional(), // ISO date string
  importance: z.enum(['low', 'medium', 'high', 'critical']),
});

// Motivation types
export const MotivationTypeSchema = z.enum([
  'achievement', // 達成重視
  'competition', // 競争重視
  'improvement', // 改善重視
  'curiosity', // 好奇心重視
  'social', // 社会的重視
  'necessity' // 必要性重視
]);

// Learning pace preferences
export const LearningPaceSchema = z.enum([
  'intensive', // 集中型
  'moderate', // 中程度
  'light', // 軽量
  'flexible' // 柔軟
]);

// Common obstacles
export const ObstacleSchema = z.enum([
  'time_shortage', // 時間不足
  'motivation_loss', // モチベーション低下
  'difficulty', // 難易度の高さ
  'distraction', // 気が散る
  'perfectionism', // 完璧主義
  'procrastination', // 先延ばし
  'resource_lack', // リソース不足
  'support_lack' // サポート不足
]);

// Learning style analysis result type  
export const LearningStyleAnalysisSchema = z.object({
  motivation: MotivationTypeSchema,
  pace: LearningPaceSchema,
  obstacles: z.array(ObstacleSchema),
});

export type LearningStyleAnalysis = z.infer<typeof LearningStyleAnalysisSchema>;

// Learning style questionnaire
export const LearningStyleQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['single_choice', 'multiple_choice', 'scale']),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    score: z.number().optional(), // For scale questions
  })),
});

export const LearningStyleAnswerSchema = z.object({
  questionId: z.string(),
  selectedOptions: z.array(z.string()),
  scaleValue: z.number().optional(),
});

// Complete profiling data
export const ProfilingDataSchema = z.object({
  // Basic information
  ageRange: AgeRangeSchema,
  availableTimePerDay: AvailableTimeSchema,
  goals: z.array(LearningGoalSchema).min(1).max(5),
  
  // Learning style answers
  learningStyleAnswers: z.array(LearningStyleAnswerSchema),
  
  // Derived from answers
  motivation: MotivationTypeSchema,
  pace: LearningPaceSchema,
  obstacles: z.array(ObstacleSchema),
  
  // Metadata
  completedAt: z.string(), // ISO date string
  version: z.string().default('1.0'), // Schema version for future compatibility
});

// AI analysis prompt context
export const AnalysisContextSchema = z.object({
  userProfile: ProfilingDataSchema,
  additionalContext: z.object({
    currentDate: z.string(),
    userTimezone: z.string().optional(),
    preferredLanguage: z.string().default('ja'),
  }),
});

// AI analysis result (extended from openai.ts)
export const DetailedProfileAnalysisSchema = z.object({
  // Core analysis
  learningStrategy: z.string(),
  recommendedPace: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  personalizedMessage: z.string(),
  
  // Detailed insights
  motivationInsights: z.object({
    primaryDriver: z.string(),
    recommendations: z.array(z.string()),
  }),
  
  timeManagement: z.object({
    optimalTimeSlots: z.array(z.string()),
    sessionLength: z.number(), // recommended minutes per session
    frequencyPerWeek: z.number(),
  }),
  
  goalBreakdown: z.array(z.object({
    goalTitle: z.string(),
    milestones: z.array(z.string()),
    estimatedTimeframe: z.string(),
    priority: z.number(), // 1-5
  })),
  
  learningPath: z.object({
    phase1: z.object({
      focus: z.string(),
      duration: z.string(),
      keyActivities: z.array(z.string()),
    }),
    phase2: z.object({
      focus: z.string(),
      duration: z.string(),
      keyActivities: z.array(z.string()),
    }),
    phase3: z.object({
      focus: z.string(),
      duration: z.string(),
      keyActivities: z.array(z.string()),
    }),
  }),
  
  // Metadata
  confidence: z.number().min(0).max(1), // AI confidence in analysis
  analysisDate: z.string(),
  modelVersion: z.string(),
});

// Type exports
export type AgeRange = z.infer<typeof AgeRangeSchema>;
export type AvailableTime = z.infer<typeof AvailableTimeSchema>;
export type LearningGoal = z.infer<typeof LearningGoalSchema>;
export type MotivationType = z.infer<typeof MotivationTypeSchema>;
export type LearningPace = z.infer<typeof LearningPaceSchema>;
export type Obstacle = z.infer<typeof ObstacleSchema>;
export type LearningStyleQuestion = z.infer<typeof LearningStyleQuestionSchema>;
export type LearningStyleAnswer = z.infer<typeof LearningStyleAnswerSchema>;
export type ProfilingData = z.infer<typeof ProfilingDataSchema>;
export type AnalysisContext = z.infer<typeof AnalysisContextSchema>;
export type DetailedProfileAnalysis = z.infer<typeof DetailedProfileAnalysisSchema>;

// Constants for UI
export const AGE_RANGE_OPTIONS: Array<{ value: AgeRange; label: string }> = [
  { value: '10代', label: '10代' },
  { value: '20代', label: '20代' },
  { value: '30代', label: '30代' },
  { value: '40代', label: '40代' },
  { value: '50代以上', label: '50代以上' },
];

export const GOAL_CATEGORY_OPTIONS = [
  { value: 'language', label: '語学・言語', icon: '🗣️' },
  { value: 'skill', label: 'スキル・技術', icon: '💡' },
  { value: 'certification', label: '資格・認定', icon: '📜' },
  { value: 'academic', label: '学術・研究', icon: '📚' },
  { value: 'personal', label: '個人的成長', icon: '🌱' },
  { value: 'other', label: 'その他', icon: '🎯' },
] as const;

export const IMPORTANCE_OPTIONS = [
  { value: 'low', label: '低', color: '#64748b' },
  { value: 'medium', label: '中', color: '#f59e0b' },
  { value: 'high', label: '高', color: '#ef4444' },
  { value: 'critical', label: '最重要', color: '#dc2626' },
] as const;