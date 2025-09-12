/**
 * Quest Personalization Engine
 * AI生成システムを使用したパーソナライズドクエスト生成
 */

import { ProfileAnswers } from '../types/onboardingQuestions';
import { GoalDeepDiveAnswers } from '../types/questGeneration';
import { ProfileV1, Quest } from '../services/ai/advancedQuestService.fixed';
import { advancedQuestService } from '../services/ai/advancedQuestService.fixed';
import { apiKeyManager } from '../config/apiKeys';

export interface PersonalizedQuest {
  id: string;
  title: string;
  description: string;
  category: string;
  emoji: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  frequency: 'daily' | 'weekly' | 'milestone';
  estimatedRating: 'love' | 'like' | 'dislike';
  confidenceScore: number; // 0-1, how confident we are about this quest match
  pattern?: string; // AI生成クエストのパターン
  minutes?: number; // AI生成クエストの推定時間
  criteria?: string[]; // AI生成クエストの成功基準
}

export interface QuestPool {
  // 目標志向別クエスト
  outcome: PersonalizedQuest[];
  skill: PersonalizedQuest[];  
  habit: PersonalizedQuest[];
  // 頻度別クエスト
  daily: PersonalizedQuest[];
  weekly: PersonalizedQuest[];
  milestone: PersonalizedQuest[];
  // 難易度別クエスト  
  easy: PersonalizedQuest[];
  medium: PersonalizedQuest[];
  hard: PersonalizedQuest[];
}

// クエストプール定義
const QUEST_POOL: QuestPool = {
  // アウトカム志向クエスト
  outcome: [
    {
      id: 'cert_study_daily',
      title: '資格試験対策30分',
      description: '毎日30分の集中学習で確実な合格を目指しましょう',
      category: '資格・認定',
      emoji: '📜',
      tags: ['certification', 'study', 'outcome'],
      difficulty: 'medium',
      frequency: 'daily',
      estimatedRating: 'love',
      confidenceScore: 0.9,
      minutes: 30
    },
    {
      id: 'portfolio_project',
      title: '週末ポートフォリオ制作',
      description: '週末2時間でポートフォリオ作品を着実に進めましょう',
      category: 'スキル実証',
      emoji: '💼',
      tags: ['portfolio', 'creation', 'skill'],
      difficulty: 'medium',
      frequency: 'weekly',
      estimatedRating: 'love',
      confidenceScore: 0.85,
      minutes: 45
    }
  ],

  // スキル志向クエスト
  skill: [
    {
      id: 'coding_practice',
      title: '毎日コーディング練習',
      description: '実務で使えるスキル向上のため毎日30分のコーディング練習',
      category: 'プログラミング',
      emoji: '💻',
      tags: ['coding', 'practice', 'skill'],
      difficulty: 'medium',
      frequency: 'daily',
      estimatedRating: 'love',
      confidenceScore: 0.9,
      minutes: 30
    },
    {
      id: 'teach_others',
      title: '週1回スキルシェア',
      description: '学んだことを他の人に教えることで理解を深めましょう',
      category: '教育・共有',
      emoji: '👨‍🏫',
      tags: ['teaching', 'sharing', 'skill'],
      difficulty: 'hard',
      frequency: 'weekly',
      estimatedRating: 'like',
      confidenceScore: 0.75
    }
  ],

  // 習慣志向クエスト
  habit: [
    {
      id: 'morning_routine',
      title: '朝のルーティン確立',
      description: '毎朝同じ時間に起きて、決まったルーティンを実行する習慣作り',
      category: 'ライフスタイル',
      emoji: '🌅',
      tags: ['morning', 'routine', 'habit'],
      difficulty: 'easy',
      frequency: 'daily',
      estimatedRating: 'love',
      confidenceScore: 0.95,
      minutes: 15
    },
    {
      id: 'reflection_weekly',
      title: '週次振り返り',
      description: '週の終わりに15分間、今週の学びと次週の目標を整理',
      category: 'セルフリフレクション',
      emoji: '📝',
      tags: ['reflection', 'planning', 'habit'],
      difficulty: 'easy',
      frequency: 'weekly',
      estimatedRating: 'like',
      confidenceScore: 0.8
    }
  ],

  // 頻度別追加クエスト
  daily: [
    {
      id: 'meditation_5min',
      title: '5分間瞑想',
      description: '毎日5分の瞑想で心の安定を図りましょう',
      category: 'マインドフルネス',
      emoji: '🧘‍♀️',
      tags: ['meditation', 'mindfulness', 'daily'],
      difficulty: 'easy',
      frequency: 'daily',
      estimatedRating: 'like',
      confidenceScore: 0.7,
      minutes: 5
    }
  ],

  weekly: [
    {
      id: 'social_connection',
      title: '友人・同僚との交流',
      description: '週に1回、友人や同僚と意味のある会話の時間を持ちましょう',
      category: 'コミュニケーション',
      emoji: '🤝',
      tags: ['social', 'connection', 'weekly'],
      difficulty: 'easy',
      frequency: 'weekly',
      estimatedRating: 'love',
      confidenceScore: 0.8
    }
  ],

  milestone: [
    {
      id: 'challenge_project',
      title: '月次チャレンジプロジェクト',
      description: '毎月新しいチャレンジプロジェクトに挑戦して成長を実感',
      category: 'チャレンジ',
      emoji: '🎯',
      tags: ['challenge', 'project', 'milestone'],
      difficulty: 'hard',
      frequency: 'milestone',
      estimatedRating: 'like',
      confidenceScore: 0.9
    }
  ],

  // 難易度別クエスト
  easy: [
    {
      id: 'water_drink',
      title: '適切な水分補給',
      description: '1日8杯の水を飲んで健康管理を意識する習慣',
      category: '健康管理',
      emoji: '💧',
      tags: ['health', 'hydration', 'easy'],
      difficulty: 'easy',
      frequency: 'daily',
      estimatedRating: 'like',
      confidenceScore: 0.6
    }
  ],

  medium: [
    {
      id: 'exercise_routine',
      title: '週3回運動習慣',
      description: '週3回30分の運動で体力向上と健康維持を目指しましょう',
      category: 'フィットネス',
      emoji: '💪',
      tags: ['exercise', 'fitness', 'medium'],
      difficulty: 'medium',
      frequency: 'weekly',
      estimatedRating: 'like',
      confidenceScore: 0.75
    }
  ],

  hard: [
    {
      id: 'side_project',
      title: '個人プロジェクト開発',
      description: '本格的な個人プロジェクトを完成まで継続して開発',
      category: '個人開発',
      emoji: '🚀',
      tags: ['project', 'development', 'hard'],
      difficulty: 'hard',
      frequency: 'milestone',
      estimatedRating: 'love',
      confidenceScore: 0.85
    }
  ]
};

/**
 * AI生成システムを使用してパーソナライズドクエストを生成
 */
export async function generatePersonalizedQuests(
  profileAnswers: ProfileAnswers,
  goalDeepDive?: GoalDeepDiveAnswers,
  goalText?: string,
  forceMock: boolean = false
): Promise<PersonalizedQuest[]> {
  try {
    console.log('🎯 Starting AI quest generation...');
    console.log('🎯 Received goalText:', goalText);
    console.log('📋 Received goalDeepDive:', goalDeepDive);
    console.log('🎭 Force mock mode:', forceMock);
    
    // QP-04: Force mock mode if requested
    if (forceMock) {
      console.log('🎭 Using forced mock mode');
      return generateFallbackQuests(profileAnswers);
    }
    
    // 1. プロファイル回答をProfileV1形式に変換
    const profile = convertToProfileV1(profileAnswers, goalDeepDive);
    console.log('📊 Converted profile:', profile);
    
    // 2. AI生成サービスを強制的に初期化
    console.log('🔧 Force initializing AI service...');
    
    // Check API key availability
    const apiKey = apiKeyManager.getOpenAIKey();
    console.log('🔑 API key available:', !!apiKey);
    console.log('🤖 AI enabled:', apiKeyManager.isAIEnabled());
    console.log('🤖 Should use real AI:', apiKeyManager.shouldUseRealAI());
    
    if (apiKey && !forceMock) {
      // Force initialize with API key
      console.log('🚀 Force initializing with API key...');
      advancedQuestService.initializeWithKey(apiKey);
      console.log('✅ AI service force initialized');
    } else {
      if (!advancedQuestService.isInitialized()) {
        const initialized = advancedQuestService.initialize();
        if (!initialized) {
          console.warn('⚠️  AI service initialization failed, falling back to static quests');
          return generateFallbackQuests(profileAnswers);
        }
      }
    }
    
    // Check service status
    const diagnosis = apiKeyManager.diagnoseConfiguration();
    console.log('📊 API diagnosis:', diagnosis);
    
    // 3. AI生成クエストを取得
    const finalGoalText = goalText || goalDeepDive?.goal_focus?.note || '学習目標';
    console.log('🎯 Final goalText for AI generation:', finalGoalText);
    
    console.log('📡 Calling advancedQuestService.generateOptimizedQuests with:', {
      goalText: finalGoalText,
      profileKeys: Object.keys(profile),
      currentLevelTags: profile.current_level_tags,
      priorityAreas: profile.priority_areas
    });
    
    const result = await advancedQuestService.generateOptimizedQuests({
      goalText: finalGoalText,
      profile,
      currentLevelTags: profile.current_level_tags,
      priorityAreas: profile.priority_areas,
      checkins: {
        mood_energy: 'mid',
        available_time_today_delta_min: 0,
        focus_noise: 'mid'
      }
    });
    
    console.log('📡 advancedQuestService result:', {
      questCount: result.finalQuests?.quests?.length || 0,
      hasQuests: !!result.finalQuests?.quests,
      resultKeys: Object.keys(result || {})
    });
    
    // 4. AI生成クエストをPersonalizedQuest形式に変換
    const personalizedQuests = convertToPersonalizedQuests(result.finalQuests.quests, profileAnswers);
    
    console.log('✅ Successfully generated', personalizedQuests.length, 'AI quests');
    return personalizedQuests;
    
  } catch (error) {
    console.error('❌ AI quest generation failed:', error);
    console.log('🔄 Falling back to static quest generation...');
    return generateFallbackQuests(profileAnswers);
  }
}

/**
 * フォールバック用: 静的クエストプールから生成
 */
function generateFallbackQuests(profileAnswers: ProfileAnswers): PersonalizedQuest[] {
  console.log('🎭 Using fallback quest generation with profile:', profileAnswers);
  
  const selectedQuests: PersonalizedQuest[] = [];
  
  // Default quest pool - guaranteed to work
  const defaultQuests: PersonalizedQuest[] = [
    {
      id: 'fallback_daily_study',
      title: '毎日の学習タイム',
      description: '目標に向けて毎日30分の集中学習',
      category: '学習習慣',
      emoji: '📚',
      tags: ['study', 'daily', 'habit'],
      difficulty: 'medium',
      frequency: 'daily',
      estimatedRating: 'love',
      confidenceScore: 0.9,
      minutes: 30
    },
    {
      id: 'fallback_skill_practice',
      title: 'スキル実践',
      description: '学んだスキルを実際に使ってみる練習',
      category: 'スキル向上',
      emoji: '💻',
      tags: ['skill', 'practice'],
      difficulty: 'medium',
      frequency: 'weekly',
      estimatedRating: 'love',
      confidenceScore: 0.8,
      minutes: 45
    },
    {
      id: 'fallback_reflection',
      title: '振り返りタイム',
      description: '学習の進捗を振り返って次のステップを計画',
      category: '振り返り',
      emoji: '🤔',
      tags: ['reflection', 'planning'],
      difficulty: 'easy',
      frequency: 'weekly',
      estimatedRating: 'like',
      confidenceScore: 0.7,
      minutes: 15
    }
  ];

  // Try profile-based selection first
  try {
    // 1. 目標志向に基づくクエスト選択
    if (profileAnswers.goal_focus) {
      const goalQuests = QUEST_POOL[profileAnswers.goal_focus as keyof typeof QUEST_POOL];
      if (Array.isArray(goalQuests)) {
        selectedQuests.push(...goalQuests.slice(0, 2)); // 上位2つ選択
      }
    }

    // 2. 復習頻度に基づくクエスト選択
    if (profileAnswers.review_cadence) {
      const cadenceQuests = QUEST_POOL[profileAnswers.review_cadence as keyof typeof QUEST_POOL];
      if (Array.isArray(cadenceQuests)) {
        selectedQuests.push(...cadenceQuests.slice(0, 1)); // 1つ選択
      }
    }

    // 3. 難易度バイアスに基づくクエスト選択
    if (profileAnswers.difficulty_bias !== undefined) {
      let difficultyCategory: 'easy' | 'medium' | 'hard';
      if (profileAnswers.difficulty_bias < -0.05) {
        difficultyCategory = 'easy';
      } else if (profileAnswers.difficulty_bias > 0.1) {
        difficultyCategory = 'hard'; 
      } else {
        difficultyCategory = 'medium';
      }
      
      const difficultyQuests = QUEST_POOL[difficultyCategory];
      selectedQuests.push(...difficultyQuests.slice(0, 1));
    }

    // 4. 重複除去とスコア調整
    const uniqueQuests = selectedQuests.reduce((acc, quest) => {
      const existingQuest = acc.find(q => q.id === quest.id);
      if (!existingQuest) {
        // Ensure minutes is set
        quest.minutes = quest.minutes || 30;
        acc.push(quest);
      } else {
        // 重複した場合は信頼スコアを上げる
        existingQuest.confidenceScore = Math.min(1.0, existingQuest.confidenceScore + 0.1);
      }
      return acc;
    }, [] as PersonalizedQuest[]);

    // 5. 信頼スコア順でソート
    uniqueQuests.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // 6. If we have enough quests, return them
    if (uniqueQuests.length >= 3) {
      console.log('✅ Profile-based fallback generated', uniqueQuests.length, 'quests');
      return uniqueQuests.slice(0, 4);
    }
  } catch (error) {
    console.warn('⚠️ Profile-based fallback failed, using default quests:', error);
  }

  // Fallback to default quests if profile-based selection failed
  console.log('✅ Using default fallback quests');
  return defaultQuests;
}

/**
 * プロファイル回答をProfileV1形式に変換
 */
function convertToProfileV1(
  profileAnswers: ProfileAnswers, 
  goalDeepDive?: GoalDeepDiveAnswers
): ProfileV1 {
  return {
    time_budget_min_per_day: 60, // デフォルト1時間
    peak_hours: [9, 10, 11, 19, 20, 21], // デフォルト時間帯
    env_constraints: [],
    hard_constraints: [],
    motivation_style: goalDeepDive?.goal_focus?.choice === 'outcome' ? 'push' : 'pull',
    difficulty_tolerance: Math.max(0, Math.min(1, 0.5 + (profileAnswers.difficulty_bias || 0))),
    novelty_preference: profileAnswers.novelty_preference || 0.5,
    pace_preference: profileAnswers.review_cadence === 'daily' ? 'sprint' : 'cadence',
    long_term_goal: goalDeepDive?.goal_focus?.note,
    current_level_tags: [],
    priority_areas: [],
    heat_level: 3,
    risk_factors: profileAnswers.dropoff_type ? [profileAnswers.dropoff_type] : [],
    preferred_session_length_min: 25,
    modality_preference: ['read', 'video'],
    deliverable_preferences: ['note'],
    weekly_minimum_commitment_min: 120,
    goal_motivation: 'mid'
  };
}

/**
 * AI生成クエストをPersonalizedQuest形式に変換
 */
function convertToPersonalizedQuests(aiQuests: Quest[], profileAnswers: ProfileAnswers): PersonalizedQuest[] {
  return aiQuests.map((quest, index) => {
    const difficulty = quest.difficulty < 0.4 ? 'easy' : quest.difficulty > 0.6 ? 'hard' : 'medium';
    const frequency = quest.minutes <= 20 ? 'daily' : quest.minutes <= 45 ? 'weekly' : 'milestone';
    
    return {
      id: `ai_quest_${index + 1}`,
      title: quest.title,
      description: `${quest.deliverable} - ${quest.criteria.join(', ')}`,
      category: getQuestCategory(quest.pattern),
      emoji: getQuestEmoji(quest.pattern),
      tags: quest.tags,
      difficulty,
      frequency,
      estimatedRating: estimateAIQuestRating(quest, profileAnswers),
      confidenceScore: 0.9, // AI生成は高信頼度
      pattern: quest.pattern,
      minutes: quest.minutes,
      criteria: quest.criteria
    };
  });
}

/**
 * パターンからカテゴリを推定
 */
function getQuestCategory(pattern: string): string {
  const categoryMap: { [key: string]: string } = {
    'read_note_q': 'インプット学習',
    'flashcards': '記憶定着',
    'build_micro': 'スキル実践',
    'config_verify': 'システム設定',
    'debug_explain': '問題解決',
    'feynman': '理解深化',
    'past_paper': '試験対策',
    'socratic': '対話学習',
    'shadowing': '模倣練習',
    'retrospective': '振り返り'
  };
  
  return categoryMap[pattern] || 'その他';
}

/**
 * パターンから絵文字を推定
 */
function getQuestEmoji(pattern: string): string {
  const emojiMap: { [key: string]: string } = {
    'read_note_q': '📚',
    'flashcards': '🔤',
    'build_micro': '🔧',
    'config_verify': '⚙️',
    'debug_explain': '🐛',
    'feynman': '🧠',
    'past_paper': '📝',
    'socratic': '💬',
    'shadowing': '👥',
    'retrospective': '🔍'
  };
  
  return emojiMap[pattern] || '🎯';
}

/**
 * AI生成クエストの評価を推定
 */
function estimateAIQuestRating(quest: Quest, profileAnswers: ProfileAnswers): 'love' | 'like' | 'dislike' {
  let score = 0.5;
  
  // 難易度マッチング
  const preferredDifficulty = (profileAnswers.difficulty_bias || 0) + 0.5;
  const difficultyMatch = 1 - Math.abs(quest.difficulty - preferredDifficulty);
  score += difficultyMatch * 0.3;
  
  // 時間マッチング（25分セッションを基準）
  const timeMatch = 1 - Math.abs(quest.minutes - 25) / 25;
  score += timeMatch * 0.2;
  
  // 信頼スコア加算
  score += 0.1;
  
  if (score >= 0.7) return 'love';
  if (score >= 0.5) return 'like';
  return 'dislike';
}

/**
 * プロファイル回答に基づいて推定評価を計算
 */
export function estimateQuestRating(quest: PersonalizedQuest, profileAnswers: ProfileAnswers): 'love' | 'like' | 'dislike' {
  let score = 0.5; // 基準値

  // 目標志向マッチ
  if (quest.tags.includes(profileAnswers.goal_focus || '')) {
    score += 0.3;
  }

  // 頻度マッチ
  if (quest.frequency === profileAnswers.review_cadence) {
    score += 0.2;
  }

  // 難易度マッチ
  if (profileAnswers.difficulty_bias !== undefined) {
    const preferredDifficulty = profileAnswers.difficulty_bias > 0.1 ? 'hard' : 
                               profileAnswers.difficulty_bias < -0.05 ? 'easy' : 'medium';
    if (quest.difficulty === preferredDifficulty) {
      score += 0.2;
    }
  }

  // 信頼スコア加算
  score += quest.confidenceScore * 0.2;

  // 評価に変換
  if (score >= 0.8) return 'love';
  if (score >= 0.6) return 'like';
  return 'dislike';
}

/**
 * デフォルトの評価辞書を生成
 */
export function generateDefaultPreferences(quests: PersonalizedQuest[], profileAnswers: ProfileAnswers): { [questId: string]: 'love' | 'like' | 'dislike' } {
  const preferences: { [questId: string]: 'love' | 'like' | 'dislike' } = {};
  
  quests.forEach(quest => {
    preferences[quest.id] = estimateQuestRating(quest, profileAnswers);
  });

  return preferences;
}

/**
 * Debug: Test fallback quest generation
 */
export function testFallbackGeneration(): PersonalizedQuest[] {
  console.log('🧪 Testing fallback quest generation...');
  
  const mockProfile = {
    goal_focus: 'skill',
    review_cadence: 'daily',
    difficulty_bias: 0.1,
    novelty_preference: 0.5
  };
  
  const result = generateFallbackQuests(mockProfile);
  console.log('🧪 Test result:', result.length, 'quests generated');
  result.forEach((quest, index) => {
    console.log(`🧪 Quest ${index + 1}:`, quest.title, `(${quest.minutes}min)`);
  });
  
  return result;
}
