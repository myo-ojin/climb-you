// OpenAI Services
export { OpenAIService } from './openaiService';
export { MockOpenAIService, createOpenAIService } from './openaiService.mock';
export { SecureStorageService } from './secureStorage';

// Firebase Services
export { AuthService } from './auth';
export { FirestoreService } from './firestore';

// Profiling Services
export { ProfilingService } from './profilingService';

// Quest Services
export { QuestService } from './questService';
export { QuestStateService } from './questStateService';
export { QuestManager } from './questManager';

// History Services
export { HistoryService } from './historyService';

// Settings Services
export { SettingsService } from './settingsService';

// Utils
export { OpenAITestUtils } from '../utils/openaiTest';

// Types
export type {
  OpenAIError,
  OpenAIServiceConfig,
  OpenAIMessage,
  OpenAICompletion,
  UserProfile,
  ProfileAnalysis,
  Quest,
  DailyQuests
} from '../types/openai';

export type {
  Quest as QuestType,
  QuestInput,
  DailyQuestCollection,
  QuestGenerationRequest,
  QuestError,
  QuestStats,
  QuestDifficulty,
  QuestCategory,
  QuestStatus
} from '../types/quest';

export type {
  QuestCompletionRecord,
  DailyStats,
  PeriodStats,
  QuestStateUpdate,
  QuestAnalytics,
  QuestStateError,
  Achievement
} from '../types/questHistory';

export type {
  ProfilingData,
  DetailedProfileAnalysis,
  LearningGoal,
  AgeRange,
  MotivationType,
  LearningPace,
  Obstacle,
  LearningStyleQuestion,
  LearningStyleAnswer
} from '../types/profiling';

export type {
  DailyCompletion,
  WeeklyStats,
  SimpleStats,
  HistoryViewData
} from '../types/history';

export type {
  UserSettings,
  SettingsUpdate,
  SettingsSection,
  SettingsItem,
  SettingsError,
  AppInfo
} from '../types/settings';