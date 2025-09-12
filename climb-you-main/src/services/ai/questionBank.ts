import { z } from 'zod';

const QuestionBankItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  type: z.enum(['mcq', 'freeform', 'confirm']),
  category: z.enum(['goal_specifics', 'time_management', 'learning_style', 'constraints', 'motivation', 'experience']),
  applicable_when: z.string().optional(),
  info_gain_hint: z.number().min(0).max(1).default(0.5),
  options: z.array(z.string()).optional(),
  profile_field: z.string(),
  fatigue_weight: z.number().min(0).max(1).default(0.3),
});

export type QuestionBankItem = z.infer<typeof QuestionBankItemSchema>;

export const questionBank: QuestionBankItem[] = [
  // Goal Specifics
  {
    id: 'goal_domain',
    question: 'あなたの目標はどの分野に関連していますか？',
    type: 'mcq',
    category: 'goal_specifics',
    applicable_when: 'goal_text exists but domain unclear',
    info_gain_hint: 0.8,
    options: ['学習・勉強', 'キャリア・仕事', '健康・フィットネス', 'スキル・技術', '創作・趣味', 'その他'],
    profile_field: 'goal_domain',
    fatigue_weight: 0.2,
  },
  {
    id: 'success_metrics',
    question: '成功をどのように測定しますか？具体的な指標を教えてください。',
    type: 'freeform',
    category: 'goal_specifics',
    applicable_when: 'goal_text exists but metrics unclear',
    info_gain_hint: 0.9,
    profile_field: 'success_metrics',
    fatigue_weight: 0.4,
  },

  // Time Management
  {
    id: 'weekly_hours',
    question: '週に何時間程度この目標に取り組むことができますか？',
    type: 'mcq',
    category: 'time_management',
    applicable_when: 'weekly_hours not set',
    info_gain_hint: 0.7,
    options: ['5時間未満', '5-10時間', '10-20時間', '20時間以上'],
    profile_field: 'weekly_hours',
    fatigue_weight: 0.2,
  },
  {
    id: 'preferred_session_length',
    question: '1回の学習/作業セッションはどのくらいの長さが理想的ですか？',
    type: 'mcq',
    category: 'time_management',
    info_gain_hint: 0.6,
    options: ['15-30分', '30-60分', '1-2時間', '2時間以上'],
    profile_field: 'preferred_session_length',
    fatigue_weight: 0.2,
  },

  // Learning Style
  {
    id: 'learning_preference',
    question: 'どのような学習スタイルが好みですか？',
    type: 'mcq',
    category: 'learning_style',
    applicable_when: 'learning_level exists',
    info_gain_hint: 0.7,
    options: ['実践中心', '理論中心', 'バランス型', 'プロジェクト中心'],
    profile_field: 'learning_preference',
    fatigue_weight: 0.3,
  },
  {
    id: 'difficulty_preference',
    question: '課題の難易度について、どのようなバランスがお好みですか？',
    type: 'mcq',
    category: 'learning_style',
    info_gain_hint: 0.5,
    options: ['易しめ（確実に進歩）', '標準（適度な挑戦）', '難しめ（高い成長）', '混合（様々な難易度）'],
    profile_field: 'difficulty_preference',
    fatigue_weight: 0.3,
  },

  // Constraints
  {
    id: 'main_obstacles',
    question: '目標達成の主な障害や制約は何ですか？',
    type: 'freeform',
    category: 'constraints',
    applicable_when: 'constraints empty or not set',
    info_gain_hint: 0.8,
    profile_field: 'constraints',
    fatigue_weight: 0.4,
  },
  {
    id: 'resource_limitations',
    question: '利用可能なリソース（時間、お金、道具など）に制限はありますか？',
    type: 'freeform',
    category: 'constraints',
    applicable_when: 'resources empty or constraints mentioned',
    info_gain_hint: 0.7,
    profile_field: 'resource_limitations',
    fatigue_weight: 0.4,
  },

  // Motivation
  {
    id: 'motivation_source',
    question: 'この目標に取り組む最も強いモチベーションは何ですか？',
    type: 'freeform',
    category: 'motivation',
    applicable_when: 'motivation unclear from goal_text',
    info_gain_hint: 0.6,
    profile_field: 'motivation_source',
    fatigue_weight: 0.3,
  },
  {
    id: 'accountability_preference',
    question: '進捗の管理や責任感を保つために、どのような方法が効果的だと思いますか？',
    type: 'mcq',
    category: 'motivation',
    info_gain_hint: 0.5,
    options: ['セルフチェック', '他者への報告', 'アプリでの記録', '報酬システム'],
    profile_field: 'accountability_preference',
    fatigue_weight: 0.3,
  },

  // Experience
  {
    id: 'prior_experience',
    question: 'この分野での過去の経験はどの程度ありますか？',
    type: 'mcq',
    category: 'experience',
    applicable_when: 'learning_level exists but experience unclear',
    info_gain_hint: 0.7,
    options: ['全くの初心者', '少し経験あり', 'ある程度経験あり', '上級者'],
    profile_field: 'prior_experience',
    fatigue_weight: 0.2,
  },
  {
    id: 'previous_attempts',
    question: '同様の目標に過去に取り組んだことはありますか？その結果はいかがでしたか？',
    type: 'confirm',
    category: 'experience',
    info_gain_hint: 0.6,
    profile_field: 'previous_attempts',
    fatigue_weight: 0.3,
  },
];

export function getApplicableQuestions(
  knownProfile: Record<string, any>,
  goalText?: string
): QuestionBankItem[] {
  return questionBank.filter(item => {
    if (!item.applicable_when) return true;
    
    const condition = item.applicable_when.toLowerCase();
    
    // Simple rule matching - can be enhanced with more sophisticated logic
    if (condition.includes('goal_text exists')) {
      if (!goalText) return false;
      
      if (condition.includes('domain unclear')) {
        return !knownProfile.goal_domain;
      }
      if (condition.includes('metrics unclear')) {
        return !knownProfile.success_metrics;
      }
      if (condition.includes('motivation unclear')) {
        return !goalText.includes('なぜ') && !goalText.includes('理由') && !knownProfile.motivation_source;
      }
    }
    
    if (condition.includes('weekly_hours not set')) {
      return !knownProfile.weekly_hours;
    }
    
    if (condition.includes('learning_level exists')) {
      return !!knownProfile.learning_level;
    }
    
    if (condition.includes('constraints empty')) {
      return !knownProfile.constraints || knownProfile.constraints.length === 0;
    }
    
    if (condition.includes('resources empty')) {
      return !knownProfile.resources || knownProfile.resources.length === 0;
    }
    
    if (condition.includes('constraints mentioned')) {
      return goalText?.includes('制約') || goalText?.includes('限界') || goalText?.includes('難しい');
    }
    
    if (condition.includes('experience unclear')) {
      return !knownProfile.prior_experience;
    }
    
    return true;
  });
}