/**
 * User Profile Integration Types
 * オンボーディング完了後のユーザーデータ統合管理
 */

import { ProfileAnswers } from './onboardingQuestions';
import { ProfileV1, Quest, SkillAtom } from '../services/ai/promptEngine';

/**
 * オンボーディングで収集される目標詳細データ
 */
export interface GoalDeepDiveData {
  goal: string;
  goal_text: string;
  goal_category: string;
  goal_deadline: string;
  goal_importance: 'low' | 'mid' | 'high';
  goal_motivation: 'low' | 'mid' | 'high';
  time_budget_min_per_day: number;
  session_length_preference: number;
  createdAt?: Date;
}

/**
 * プロファイル質問への回答データ
 */
export interface ProfileData {
  profileAnswers: ProfileAnswers;
  memos: { [questionId: string]: string };
  completedAt?: Date;
}

/**
 * クエスト評価データ
 */
export interface QuestPreferencesData {
  preferences: { [questId: string]: 'love' | 'like' | 'dislike' };
  feedback: { [questId: string]: string };
  completedAt?: Date;
}

/**
 * AI分析結果による学習戦略
 */
export interface LearningStrategy {
  recommendedPace: 'slow' | 'moderate' | 'intensive';
  dailyTimeAllocation: number;
  learningStyle: string;
  keyStrengths: string[];
  potentialChallenges: string[];
  initialQuests: Quest[];
  milestones: any[];
  successPrediction: {
    probability: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    keyFactors: string[];
  };
  generatedAt?: Date;
}

/**
 * 完全なオンボーディング完了データ
 */
export interface CompleteOnboardingData {
  goalDeepDiveData: GoalDeepDiveData;
  profileData: ProfileData;
  questPreferencesData: QuestPreferencesData;
  learningStrategy: LearningStrategy;
}

/**
 * 統合ユーザープロファイル（メインアプリで使用）
 */
export interface IntegratedUserProfile {
  // 基本識別情報
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  
  // オンボーディング完了データ
  onboardingData: CompleteOnboardingData;
  
  // AI生成されたプロファイル
  aiProfile: ProfileV1;
  
  // 生成されたスキルマップ
  skillAtoms: SkillAtom[];
  
  // 初期クエスト
  initialQuests: Quest[];
  
  // アプリ設定
  appSettings: AppSettings;
  
  // 進捗データ
  progress: UserProgress;
}

/**
 * アプリケーション設定
 */
export interface AppSettings {
  // AI機能設定
  aiEnabled: boolean;
  useMockAI: boolean;
  
  // 通知設定
  dailyReminders: boolean;
  reminderTime: string; // "09:00" format
  
  // UI設定
  theme: 'light' | 'dark' | 'system';
  language: 'ja' | 'en';
  
  // プライバシー設定
  dataSharing: boolean;
  analytics: boolean;
}

/**
 * ユーザー進捗データ
 */
export interface UserProgress {
  // 全体統計
  totalQuestsCompleted: number;
  totalTimeSpent: number; // minutes
  currentStreak: number; // days
  
  // 今日の進捗
  todaysQuests: Quest[];
  todaysProgress: {
    completed: number;
    total: number;
    timeSpent: number;
  };
  
  // 今週の進捗
  weeklyProgress: {
    questsCompleted: number;
    timeSpent: number;
    daysActive: number;
  };
  
  // マイルストーン達成
  milestonesReached: string[];
  
  // 最終活動
  lastActiveAt: Date;
}

/**
 * 日次クエスト完了データ
 */
export interface DailyQuestCompletion {
  questId: string;
  completedAt: Date;
  timeSpent: number;
  feedback?: 'love' | 'like' | 'dislike';
  notes?: string;
}