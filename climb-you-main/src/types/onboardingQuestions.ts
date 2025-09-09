/**
 * Onboarding Questions Data Model v1
 * Based on ClimbYou_Onboarding_Questions_v1.md
 * 4 blocks × 3 questions = 12 questions with branching logic
 */

// Basic question structure
export interface Question {
  id: string;
  blockId: 'A' | 'B' | 'C' | 'D';
  stepInBlock: 1 | 2 | 3; // A, A', A''
  question: string;
  options: QuestionOption[];
  hasOptionalMemo?: boolean;
  parentDependency?: string; // For branching questions (A', C')
}

export interface QuestionOption {
  id: string;
  label: string;
  value: string | number;
  dataKey: string; // The key to store in profile data
}

// Answer data structure
export interface ProfileAnswers {
  // Block A: Goal Focus
  goal_focus?: 'knowledge' | 'skill' | 'outcome' | 'habit';
  goal_evidence?: string;
  domain_scenes?: string[];
  habit_target?: string;
  evidence_hint?: string;
  scope_style?: 'broad' | 'prioritized' | 'deep' | 'undecided';
  priority_areas?: string[];
  usage_scene?: string;

  // Block B: Path and Load  
  novelty_preference?: number; // 0.25 to 0.75
  review_cadence?: 'daily' | 'every_other_day' | 'weekly' | 'milestone';
  difficulty_bias?: number; // -0.1 to +0.2

  // Block C: Evidence and Completion
  kpi_shape?: string;
  capstone_type?: 'test' | 'demo' | 'production' | 'presentation';
  capstone_phase?: string;

  // Block D: Dropout and Recovery
  dropoff_type?: 'time' | 'difficulty' | 'focus' | 'meaning';
  dropoff_trigger?: 'fatigue' | 'schedule_slip' | 'notification_noise' | 'task_too_long';
  fallback_strategy?: 'micro_switch' | 'defer' | 'substitute' | 'announce';

  // Optional memos for each question
  memos?: { [questionId: string]: string };
}

// Question definitions for each block
export const QUESTION_BLOCKS: { [key: string]: Question[] } = {
  A: [
    {
      id: 'A1',
      blockId: 'A',
      stepInBlock: 1,
      question: 'どんなことを目指していますか？',
      options: [
        { id: 'knowledge', label: 'まずは知る・わかるを増やしたい', value: 'knowledge', dataKey: 'goal_focus' },
        { id: 'skill', label: 'できることを増やしたい', value: 'skill', dataKey: 'goal_focus' },
        { id: 'outcome', label: '結果（合格/数字/順位）を出したい', value: 'outcome', dataKey: 'goal_focus' },
        { id: 'habit', label: '続ける習慣をつくりたい', value: 'habit', dataKey: 'goal_focus' },
      ],
      hasOptionalMemo: true,
    },
    {
      id: 'A2',
      blockId: 'A',
      stepInBlock: 2,
      question: 'より具体的にはどんな感じですか？',
      options: [ // Default options as fallback
        { id: 'general_improvement', label: '全般的な向上を目指す', value: 'general_improvement', dataKey: 'goal_evidence' },
        { id: 'specific_skill', label: '特定のスキルを身につける', value: 'specific_skill', dataKey: 'domain_scenes' },
        { id: 'consistent_practice', label: '継続的な練習習慣', value: 'consistent_practice', dataKey: 'habit_target' },
        { id: 'measurable_progress', label: '測定可能な進歩', value: 'measurable_progress', dataKey: 'evidence_hint' },
      ],
      parentDependency: 'A1',
      hasOptionalMemo: true,
    },
    {
      id: 'A3',
      blockId: 'A',
      stepInBlock: 3,
      question: 'どのくらいの範囲で取り組みたいですか？',
      options: [ // Default options as fallback
        { id: 'broad', label: '幅広く学んで全体像を把握したい', value: 'broad', dataKey: 'scope_style' },
        { id: 'prioritized', label: '重要なテーマに絞って学習したい', value: 'prioritized', dataKey: 'scope_style' },
        { id: 'deep', label: 'ひとつのことを深く追求したい', value: 'deep', dataKey: 'scope_style' },
        { id: 'undecided', label: '進めながら決めたい', value: 'undecided', dataKey: 'scope_style' },
      ],
      parentDependency: 'A2',
      hasOptionalMemo: true,
    },
  ],
  B: [
    {
      id: 'B1',
      blockId: 'B',
      stepInBlock: 1,
      question: '新しいことを学ぶのと復習、どちらが多めがいいですか？',
      options: [
        { id: 'new_heavy', label: '新しいことをたくさん学びたい', value: 0.75, dataKey: 'novelty_preference' },
        { id: 'new_some', label: '新しいことを少し多めに', value: 0.60, dataKey: 'novelty_preference' },
        { id: 'repeat_some', label: '復習を少し多めに', value: 0.40, dataKey: 'novelty_preference' },
        { id: 'repeat_heavy', label: '復習をしっかりやりたい', value: 0.25, dataKey: 'novelty_preference' },
      ],
      hasOptionalMemo: true,
    },
    {
      id: 'B2',
      blockId: 'B',
      stepInBlock: 2,
      question: '復習はどのくらいの頻度がいいですか？',
      options: [ // Default options as fallback
        { id: 'daily', label: '毎日コツコツと', value: 'daily', dataKey: 'review_cadence' },
        { id: 'every_other_day', label: '２日に１回程度', value: 'every_other_day', dataKey: 'review_cadence' },
        { id: 'weekly', label: '１週間に１回程度', value: 'weekly', dataKey: 'review_cadence' },
        { id: 'milestone', label: '区切りのタイミングで', value: 'milestone', dataKey: 'review_cadence' },
      ],
      parentDependency: 'B1',
      hasOptionalMemo: true,
    },
    {
      id: 'B3',
      blockId: 'B',
      stepInBlock: 3,
      question: 'どのくらいチャレンジしたいですか？',
      options: [ // Default options as fallback
        { id: 'easy', label: '無理のない範囲で', value: -0.1, dataKey: 'difficulty_bias' },
        { id: 'normal', label: '適度なチャレンジで', value: 0, dataKey: 'difficulty_bias' },
        { id: 'challenge_some', label: '少し背伸びしたい', value: 0.1, dataKey: 'difficulty_bias' },
        { id: 'challenge_much', label: 'どんどんチャレンジしたい', value: 0.2, dataKey: 'difficulty_bias' },
      ],
      parentDependency: 'B2',
      hasOptionalMemo: true,
    },
  ],
  C: [
    {
      id: 'C1',
      blockId: 'C',
      stepInBlock: 1,
      question: '「できた！」をどうやって確認したいですか？',
      options: [
        { id: 'credential_score', label: 'テストや試験の点数で', value: 'credential_score', dataKey: 'goal_evidence' },
        { id: 'portfolio_demo', label: '作品やポートフォリオで', value: 'portfolio_demo', dataKey: 'goal_evidence' },
        { id: 'realworld_result', label: '実際の仕事や実績で', value: 'realworld_result', dataKey: 'goal_evidence' },
        { id: 'presentation_review', label: '発表やレビューで', value: 'presentation_review', dataKey: 'goal_evidence' },
      ],
      hasOptionalMemo: true,
    },
    {
      id: 'C2',
      blockId: 'C',
      stepInBlock: 2,
      question: 'どんな目標設定にしますか？',
      options: [ // Default options as fallback
        { id: 'kpi_1', label: 'まずは1つの目標達成', value: 'kpi_1', dataKey: 'kpi_shape' },
        { id: 'kpi_2', label: '2つの目標を並行', value: 'kpi_2', dataKey: 'kpi_shape' },
        { id: 'kpi_quality', label: '質重視で1つを徹底', value: 'kpi_quality', dataKey: 'kpi_shape' },
        { id: 'kpi_flexible', label: '状況に応じて調整', value: 'kpi_flexible', dataKey: 'kpi_shape' },
      ],
      parentDependency: 'C1',
      hasOptionalMemo: true,
    },
    {
      id: 'C3',
      blockId: 'C',
      stepInBlock: 3,
      question: '最終的にどんな形で仕上げたいですか？',
      options: [ // Default options as fallback
        { id: 'test', label: '模試や本番試験で', value: 'test', dataKey: 'capstone_type' },
        { id: 'demo', label: 'デモや作品公開で', value: 'demo', dataKey: 'capstone_type' },
        { id: 'production', label: '実際の運用や納品で', value: 'production', dataKey: 'capstone_type' },
        { id: 'presentation', label: '発表やレビュー会で', value: 'presentation', dataKey: 'capstone_type' },
      ],
      parentDependency: 'C2',
      hasOptionalMemo: true,
    },
  ],
  D: [
    {
      id: 'D1',
      blockId: 'D',
      stepInBlock: 1,
      question: 'どんな時につまずきやすいですか？',
      options: [
        { id: 'time', label: '時間がなくて継続できない', value: 'time', dataKey: 'dropoff_type' },
        { id: 'difficulty', label: '内容が難しくて進まない', value: 'difficulty', dataKey: 'dropoff_type' },
        { id: 'focus', label: '集中が続かず気が散ってしまう', value: 'focus', dataKey: 'dropoff_type' },
        { id: 'meaning', label: 'なんのためにやっているか分からない', value: 'meaning', dataKey: 'dropoff_type' },
      ],
      hasOptionalMemo: true,
    },
    {
      id: 'D2',
      blockId: 'D',
      stepInBlock: 2,
      question: 'どんなきっかけでやめてしまいがちですか？',
      options: [ // Default options as fallback
        { id: 'fatigue', label: '仕事で疲れてやる気が起きない', value: 'fatigue', dataKey: 'dropoff_trigger' },
        { id: 'schedule_slip', label: '予定がズレて時間がなくなる', value: 'schedule_slip', dataKey: 'dropoff_trigger' },
        { id: 'notification_noise', label: 'スマホや雑音で集中が途切れる', value: 'notification_noise', dataKey: 'dropoff_trigger' },
        { id: 'task_too_long', label: 'やることが多くて面倒になる', value: 'task_too_long', dataKey: 'dropoff_trigger' },
      ],
      parentDependency: 'D1',
      hasOptionalMemo: true,
    },
    {
      id: 'D3',
      blockId: 'D',
      stepInBlock: 3,
      question: 'うまくいかない時はどうしたいですか？',
      options: [ // Default options as fallback
        { id: 'micro_switch', label: '短時間でできることに切り替える', value: 'micro_switch', dataKey: 'fallback_strategy' },
        { id: 'defer', label: '明日に繰り越してリセットする', value: 'defer', dataKey: 'fallback_strategy' },
        { id: 'substitute', label: 'もっと簡単なことに変更する', value: 'substitute', dataKey: 'fallback_strategy' },
        { id: 'announce', label: '誰かに報告してサポートを求める', value: 'announce', dataKey: 'fallback_strategy' },
      ],
      parentDependency: 'D1_D2', // Special case: depends on both D1 and D2
      hasOptionalMemo: true,
    },
  ],
};

// Branching logic for dependent questions
export const BRANCHING_OPTIONS: { [parentAnswer: string]: QuestionOption[] } = {
  // A2 branches based on A1 (goal_focus)
  outcome: [
    { id: 'certification', label: '資格や試験のスコアで', value: 'certification', dataKey: 'goal_evidence' },
    { id: 'sales', label: '売上や成約の実績で', value: 'sales', dataKey: 'goal_evidence' },
    { id: 'ranking', label: '順位やタイムで', value: 'ranking', dataKey: 'goal_evidence' },
    { id: 'publication', label: '公開や納品で', value: 'publication', dataKey: 'goal_evidence' },
  ],
  skill: [
    { id: 'work_applicable', label: '仕事で実際に使えるように', value: 'work_applicable', dataKey: 'domain_scenes' },
    { id: 'portfolio_creation', label: '作品やポートフォリオを作る', value: 'portfolio_creation', dataKey: 'domain_scenes' },
    { id: 'teaching_capable', label: '他の人に教えられるように', value: 'teaching_capable', dataKey: 'domain_scenes' },
    { id: 'troubleshooting', label: '問題が起きた時に対処できるように', value: 'troubleshooting', dataKey: 'domain_scenes' },
  ],
  habit: [
    { id: 'daily', label: '毎日続ける習慣をつくりたい', value: 'daily', dataKey: 'habit_target' },
    { id: 'weekdays', label: '平日のみ続けたい', value: 'weekdays', dataKey: 'habit_target' },
    { id: 'three_times_week', label: '週に３回程度続けたい', value: 'three_times_week', dataKey: 'habit_target' },
    { id: 'weekend_intensive', label: '週末に集中してやりたい', value: 'weekend_intensive', dataKey: 'habit_target' },
  ],
  knowledge: [
    { id: 'exam_based', label: '最終的に試験を受ける予定', value: 'exam_based', dataKey: 'evidence_hint' },
    { id: 'no_exam', label: '特に試験は受けない', value: 'no_exam', dataKey: 'evidence_hint' },
    { id: 'past_questions', label: '過去問題で理解度を確認したい', value: 'past_questions', dataKey: 'evidence_hint' },
    { id: 'self_summary', label: '自分で内容をまとめたい', value: 'self_summary', dataKey: 'evidence_hint' },
  ],

  // B2 branches based on B1 (novelty_preference)
  // 新規重視の場合は復習は軽めに、復習重視の場合は頻繁に
  '0.75': [ // new_heavy (新しいことをたくさん学びたい)
    { id: 'weekly', label: '１週間に１回程度', value: 'weekly', dataKey: 'review_cadence' },
    { id: 'milestone', label: '区切りのタイミングで', value: 'milestone', dataKey: 'review_cadence' },
    { id: 'every_other_day', label: '２日に１回程度', value: 'every_other_day', dataKey: 'review_cadence' },
  ],
  '0.60': [ // new_some (新しいことを少し多めに)
    { id: 'every_other_day', label: '２日に１回程度', value: 'every_other_day', dataKey: 'review_cadence' },
    { id: 'weekly', label: '１週間に１回程度', value: 'weekly', dataKey: 'review_cadence' },
    { id: 'daily', label: '毎日コツコツと', value: 'daily', dataKey: 'review_cadence' },
  ],
  '0.40': [ // repeat_some (復習を少し多めに)
    { id: 'daily', label: '毎日コツコツと', value: 'daily', dataKey: 'review_cadence' },
    { id: 'every_other_day', label: '２日に１回程度', value: 'every_other_day', dataKey: 'review_cadence' },
    { id: 'weekly', label: '１週間に１回程度', value: 'weekly', dataKey: 'review_cadence' },
  ],
  '0.25': [ // repeat_heavy (復習をしっかりやりたい)
    { id: 'daily', label: '毎日コツコツと', value: 'daily', dataKey: 'review_cadence' },
    { id: 'every_other_day', label: '２日に１回程度', value: 'every_other_day', dataKey: 'review_cadence' },
    { id: 'milestone', label: '区切りのタイミングで', value: 'milestone', dataKey: 'review_cadence' },
  ],

  // B3 branches based on B2 (review_cadence)
  // 復習頻度に応じたチャレンジレベル調整
  daily: [ // 毎日コツコツと
    { id: 'steady_challenge', label: '毎日少しずつ難しくしていく', value: 0.1, dataKey: 'difficulty_bias' },
    { id: 'consistent_normal', label: '一定のレベルを維持', value: 0, dataKey: 'difficulty_bias' },
    { id: 'ambitious_daily', label: '毎日高い目標にチャレンジ', value: 0.2, dataKey: 'difficulty_bias' },
    { id: 'comfortable_daily', label: '無理せず継続重視', value: -0.1, dataKey: 'difficulty_bias' },
  ],
  every_other_day: [ // ２日に１回程度
    { id: 'moderate_challenge', label: '適度なチャレンジで着実に', value: 0.1, dataKey: 'difficulty_bias' },
    { id: 'balanced_approach', label: 'バランス良く進める', value: 0, dataKey: 'difficulty_bias' },
    { id: 'safe_progression', label: '確実に理解しながら進む', value: -0.1, dataKey: 'difficulty_bias' },
    { id: 'intensive_biweekly', label: '集中して高難度に挑戦', value: 0.2, dataKey: 'difficulty_bias' },
  ],
  weekly: [ // １週間に１回程度
    { id: 'weekly_intensive', label: '週1回の集中的なチャレンジ', value: 0.2, dataKey: 'difficulty_bias' },
    { id: 'thorough_weekly', label: '時間をかけてじっくり理解', value: 0, dataKey: 'difficulty_bias' },
    { id: 'gentle_weekly', label: '週1回でも着実に積み重ね', value: -0.1, dataKey: 'difficulty_bias' },
    { id: 'varied_weekly', label: '週によって難易度を変える', value: 0.1, dataKey: 'difficulty_bias' },
  ],
  milestone: [ // 区切りのタイミングで
    { id: 'milestone_jump', label: '区切りごとに大きくレベルアップ', value: 0.2, dataKey: 'difficulty_bias' },
    { id: 'milestone_review', label: '区切りで理解を深めて次へ', value: 0, dataKey: 'difficulty_bias' },
    { id: 'milestone_gradual', label: '区切りごとに少しずつ進歩', value: 0.1, dataKey: 'difficulty_bias' },
    { id: 'milestone_safe', label: '確実に定着してから次へ', value: -0.1, dataKey: 'difficulty_bias' },
  ],

  // D2 branches based on D1 (dropoff_type)
  // 各挫折タイプに応じた具体的なトリガー
  time: [ // 時間がなくて継続できない
    { id: 'schedule_slip', label: '予定がズレて時間がなくなる', value: 'schedule_slip', dataKey: 'dropoff_trigger' },
    { id: 'overtime_work', label: '残業で帰りが遅くなる', value: 'overtime_work', dataKey: 'dropoff_trigger' },
    { id: 'urgent_tasks', label: '急な仕事や用事が入る', value: 'urgent_tasks', dataKey: 'dropoff_trigger' },
    { id: 'time_management', label: '時間配分がうまくいかない', value: 'time_management', dataKey: 'dropoff_trigger' },
  ],
  difficulty: [ // 内容が難しくて進まない
    { id: 'complex_concepts', label: '概念が複雑で理解できない', value: 'complex_concepts', dataKey: 'dropoff_trigger' },
    { id: 'prerequisite_lack', label: '前提知識が足りない', value: 'prerequisite_lack', dataKey: 'dropoff_trigger' },
    { id: 'error_stuck', label: 'エラーや問題で詰まる', value: 'error_stuck', dataKey: 'dropoff_trigger' },
    { id: 'learning_curve', label: '習得が想像より困難', value: 'learning_curve', dataKey: 'dropoff_trigger' },
  ],
  focus: [ // 集中が続かず気が散ってしまう
    { id: 'fatigue', label: '仕事で疲れてやる気が起きない', value: 'fatigue', dataKey: 'dropoff_trigger' },
    { id: 'notification_noise', label: 'スマホや雑音で集中が途切れる', value: 'notification_noise', dataKey: 'dropoff_trigger' },
    { id: 'environment', label: '周りが騒がしい・集中できない環境', value: 'environment', dataKey: 'dropoff_trigger' },
    { id: 'mood_low', label: '気分が乗らない・モチベーション低下', value: 'mood_low', dataKey: 'dropoff_trigger' },
  ],
  meaning: [ // なんのためにやっているか分からない
    { id: 'goal_unclear', label: '目標が曖昧で方向性を見失う', value: 'goal_unclear', dataKey: 'dropoff_trigger' },
    { id: 'progress_invisible', label: '進歩が見えずやりがいを感じない', value: 'progress_invisible', dataKey: 'dropoff_trigger' },
    { id: 'relevance_doubt', label: '本当に必要なのか疑問に思う', value: 'relevance_doubt', dataKey: 'dropoff_trigger' },
    { id: 'comparison_others', label: '他の人と比べて落ち込む', value: 'comparison_others', dataKey: 'dropoff_trigger' },
  ],

  // C3 branches based on C2 (kpi_shape)
  // C2の目標設定に応じた具体的な仕上げ方法
  pass_margin: [
    { id: 'mock_test_series', label: '模試シリーズで確実性を確認', value: 'test', dataKey: 'capstone_type' },
    { id: 'practice_exam', label: '本番形式の練習試験', value: 'test', dataKey: 'capstone_type' },
    { id: 'study_presentation', label: '学習成果の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'peer_review', label: '仲間との相互レビュー', value: 'presentation', dataKey: 'capstone_type' },
  ],
  accuracy_70: [
    { id: 'accuracy_test', label: '正答率測定テスト', value: 'test', dataKey: 'capstone_type' },
    { id: 'timed_challenge', label: '時間制限チャレンジ', value: 'test', dataKey: 'capstone_type' },
    { id: 'progress_demo', label: '進歩を示すデモンストレーション', value: 'demo', dataKey: 'capstone_type' },
    { id: 'skill_presentation', label: 'スキル習得の発表', value: 'presentation', dataKey: 'capstone_type' },
  ],
  mock_grade_a: [
    { id: 'final_mock', label: '最終模試でA判定確認', value: 'test', dataKey: 'capstone_type' },
    { id: 'multiple_mocks', label: '複数の模試でA判定維持', value: 'test', dataKey: 'capstone_type' },
    { id: 'teaching_others', label: '他の人に教える', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'knowledge_demo', label: '知識の実演', value: 'demo', dataKey: 'capstone_type' },
  ],
  time_optimization: [
    { id: 'speed_test', label: '時短テストで実力確認', value: 'test', dataKey: 'capstone_type' },
    { id: 'efficiency_demo', label: '効率改善のデモ', value: 'demo', dataKey: 'capstone_type' },
    { id: 'method_presentation', label: '時短手法の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'real_application', label: '実際の業務で活用', value: 'production', dataKey: 'capstone_type' },
  ],
  one_work: [
    { id: 'portfolio_showcase', label: 'ポートフォリオとして公開', value: 'demo', dataKey: 'capstone_type' },
    { id: 'client_presentation', label: 'クライアントへのプレゼン', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'production_launch', label: '実運用でのリリース', value: 'production', dataKey: 'capstone_type' },
    { id: 'peer_review_work', label: '専門家のレビューを受ける', value: 'presentation', dataKey: 'capstone_type' },
  ],
  two_works: [
    { id: 'comparison_demo', label: '2作品の比較デモ', value: 'demo', dataKey: 'capstone_type' },
    { id: 'series_presentation', label: 'シリーズ作品として発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'dual_production', label: '両方を実運用に展開', value: 'production', dataKey: 'capstone_type' },
    { id: 'portfolio_expansion', label: 'ポートフォリオ拡充', value: 'demo', dataKey: 'capstone_type' },
  ],
  three_works: [
    { id: 'gallery_exhibition', label: '作品展示会での発表', value: 'demo', dataKey: 'capstone_type' },
    { id: 'series_launch', label: 'シリーズとして一斉公開', value: 'demo', dataKey: 'capstone_type' },
    { id: 'progressive_presentation', label: '段階的プレゼンテーション', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'selective_production', label: '選抜して実運用化', value: 'production', dataKey: 'capstone_type' },
  ],
  one_high_quality: [
    { id: 'masterpiece_demo', label: '代表作として大々的に公開', value: 'demo', dataKey: 'capstone_type' },
    { id: 'expert_presentation', label: '専門家への本格プレゼン', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'flagship_production', label: 'フラッグシップとして実運用', value: 'production', dataKey: 'capstone_type' },
    { id: 'award_submission', label: '賞への応募・コンテスト参加', value: 'presentation', dataKey: 'capstone_type' },
  ],

  // D3 branches based on D1+D2 combination (time-related triggers)
  'time_schedule_slip': [
    { id: 'flexible_scheduling', label: '柔軟なスケジュール調整', value: 'defer', dataKey: 'fallback_strategy' },
    { id: 'micro_tasks', label: '5分でできるミニタスクに切り替え', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'buffer_time', label: 'バッファ時間の設定', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'accountability_partner', label: 'スケジュール管理の相談', value: 'announce', dataKey: 'fallback_strategy' },
  ],
  'time_overtime_work': [
    { id: 'commute_learning', label: '通勤時間の活用', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'weekend_catchup', label: '週末にまとめて取り戻す', value: 'defer', dataKey: 'fallback_strategy' },
    { id: 'audio_content', label: '音声学習への切り替え', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'colleague_support', label: '同僚に学習時間確保を相談', value: 'announce', dataKey: 'fallback_strategy' },
  ],
  'time_urgent_tasks': [
    { id: 'priority_triage', label: '優先度の見直し', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'tomorrow_reset', label: '翌日に仕切り直し', value: 'defer', dataKey: 'fallback_strategy' },
    { id: 'quick_review', label: '復習だけでも短時間で', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'mentor_advice', label: 'メンターに相談', value: 'announce', dataKey: 'fallback_strategy' },
  ],
  
  // D3 branches based on D1+D2 combination (difficulty-related triggers)
  'difficulty_complex_concepts': [
    { id: 'simpler_materials', label: 'より分かりやすい教材に変更', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'step_by_step', label: '小さなステップに分割', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'study_group', label: '勉強会やグループ学習', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'concept_review', label: '基礎概念の復習から', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'difficulty_prerequisite_lack': [
    { id: 'foundation_study', label: '前提知識の学習に切り替え', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'guided_learning', label: '指導者に基礎から教わる', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'incremental_approach', label: '段階的な学習計画に変更', value: 'defer', dataKey: 'fallback_strategy' },
    { id: 'basics_practice', label: '基礎練習に集中', value: 'micro_switch', dataKey: 'fallback_strategy' },
  ],
  'difficulty_error_stuck': [
    { id: 'expert_help', label: '専門家にエラー解決を依頼', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'alternative_approach', label: '別のアプローチを試す', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'debugging_session', label: '短時間デバッグセッション', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'fresh_perspective', label: '一度離れて翌日に再挑戦', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  
  // D3 branches based on D1+D2 combination (focus-related triggers)
  'focus_fatigue': [
    { id: 'energy_management', label: '疲労時に適した軽い学習', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'power_nap', label: '短時間休憩後にリトライ', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'motivation_boost', label: '仲間と励まし合い', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'rest_and_reset', label: '十分休んで翌日に集中', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'focus_notification_noise': [
    { id: 'distraction_blocking', label: '集中モード設定', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'pomodoro_technique', label: '短時間集中テクニック', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'study_buddy', label: '集中を監視し合う仲間', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'environment_change', label: '環境を変えて再挑戦', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'focus_environment': [
    { id: 'location_change', label: '静かな場所に移動', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'noise_canceling', label: 'ノイズキャンセリング活用', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'family_cooperation', label: '家族に協力をお願い', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'optimal_time', label: '最適な時間帯に変更', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  
  // D3 branches based on D1+D2 combination (meaning-related triggers)
  'meaning_goal_unclear': [
    { id: 'goal_clarification', label: '目標の再設定', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'vision_reminder', label: '目的を思い出すセッション', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'mentor_guidance', label: 'メンターと目標を相談', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'motivation_reset', label: '初心に戻って再スタート', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'meaning_progress_invisible': [
    { id: 'progress_tracking', label: '進歩の可視化ツール', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'small_wins', label: '小さな成功体験を積む', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'progress_sharing', label: '進歩を仲間とシェア', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'milestone_celebration', label: 'マイルストンでの振り返り', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'meaning_relevance_doubt': [
    { id: 'purpose_reconnection', label: '学習の意義を再確認', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'success_stories', label: '成功事例を短時間で調べる', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'community_discussion', label: 'コミュニティで意義を議論', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'motivation_reboot', label: '動機を見つめ直す時間', value: 'defer', dataKey: 'fallback_strategy' },
  ],

  // Missing C3 keys for realworld_result options
  'one_deal': [
    { id: 'client_research', label: 'クライアント研究で実力確認', value: 'test', dataKey: 'capstone_type' },
    { id: 'pitch_demo', label: 'ピッチデモで提案力をアピール', value: 'demo', dataKey: 'capstone_type' },
    { id: 'case_study', label: '成功事例の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'real_negotiation', label: '実際の商談で成約', value: 'production', dataKey: 'capstone_type' },
  ],
  'three_deals': [
    { id: 'sales_test', label: '営業テストで多件数達成', value: 'test', dataKey: 'capstone_type' },
    { id: 'pipeline_demo', label: 'パイプライン管理のデモ', value: 'demo', dataKey: 'capstone_type' },
    { id: 'sales_presentation', label: '営業実績の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'actual_sales', label: '実際の営業活動で達成', value: 'production', dataKey: 'capstone_type' },
  ],
  'one_deployment': [
    { id: 'deployment_test', label: 'デプロイメントテスト合格', value: 'test', dataKey: 'capstone_type' },
    { id: 'system_demo', label: 'システム稼働デモ', value: 'demo', dataKey: 'capstone_type' },
    { id: 'tech_presentation', label: '技術的成果の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'production_deploy', label: '本番環境でのデプロイ', value: 'production', dataKey: 'capstone_type' },
  ],
  'poc': [
    { id: 'concept_test', label: 'コンセプト検証テスト', value: 'test', dataKey: 'capstone_type' },
    { id: 'prototype_demo', label: 'プロトタイプデモ', value: 'demo', dataKey: 'capstone_type' },
    { id: 'poc_presentation', label: 'PoC結果の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'proof_delivery', label: '実証実験の成果物納品', value: 'production', dataKey: 'capstone_type' },
  ],
  'lt_one': [
    { id: 'speech_test', label: 'プレゼンテストで準備確認', value: 'test', dataKey: 'capstone_type' },
    { id: 'lt_rehearsal', label: 'LT練習会でリハーサル', value: 'demo', dataKey: 'capstone_type' },
    { id: 'lightning_talk', label: 'ライトニングトーク発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'community_lt', label: 'コミュニティでの本格LT', value: 'production', dataKey: 'capstone_type' },
  ],
  'lt_two': [
    { id: 'double_speech_test', label: '複数テーマでのスピーチテスト', value: 'test', dataKey: 'capstone_type' },
    { id: 'series_rehearsal', label: 'シリーズ形式でのリハーサル', value: 'demo', dataKey: 'capstone_type' },
    { id: 'two_lt_sessions', label: '２回のLTセッション', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'advanced_community', label: '上級コミュニティでの連続発表', value: 'production', dataKey: 'capstone_type' },
  ],
  'review_one': [
    { id: 'expert_assessment', label: '専門家による評価テスト', value: 'test', dataKey: 'capstone_type' },
    { id: 'review_demo', label: 'レビュー向けデモ準備', value: 'demo', dataKey: 'capstone_type' },
    { id: 'expert_presentation', label: '専門家向け発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'professional_review', label: 'プロによる本格レビュー', value: 'production', dataKey: 'capstone_type' },
  ],
  'review_two': [
    { id: 'iterative_assessment', label: '反復評価テスト', value: 'test', dataKey: 'capstone_type' },
    { id: 'improvement_demo', label: '改善過程のデモ', value: 'demo', dataKey: 'capstone_type' },
    { id: 'progress_presentation', label: '改善経過の発表', value: 'presentation', dataKey: 'capstone_type' },
    { id: 'double_expert_review', label: '２回の専門家レビュー', value: 'production', dataKey: 'capstone_type' },
  ],

  // Missing D3 compound keys found in logs
  'meaning_comparison_others': [
    { id: 'self_confidence', label: '自分の進歩に集中する方法に変更', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'positive_affirmation', label: '短時間でセルフ肯定', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'supportive_community', label: '励まし合うコミュニティに参加', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'comparison_detox', label: '比較をやめて自分のペースで', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'focus_mood_low': [
    { id: 'mood_boosting', label: '気分転換できる学習法に変更', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'micro_accomplishment', label: '小さな達成で気分を上げる', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'emotional_support', label: '仲間に気持ちを共有', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'mental_rest', label: '心の回復を優先して延期', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'difficulty_learning_curve': [
    { id: 'gentler_approach', label: 'より緩やかな学習曲線に調整', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'baby_steps', label: '超小刻みなステップで進行', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'learning_buddy', label: '学習仲間と一緒に乗り越える', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'curve_patience', label: '学習曲線を受け入れて時間をかける', value: 'defer', dataKey: 'fallback_strategy' },
  ],
  'time_time_management': [
    { id: 'time_audit', label: 'タイムマネジメント手法を見直し', value: 'substitute', dataKey: 'fallback_strategy' },
    { id: 'priority_focus', label: '最優先事項に短時間集中', value: 'micro_switch', dataKey: 'fallback_strategy' },
    { id: 'time_accountability', label: '時間管理を仲間と共有', value: 'announce', dataKey: 'fallback_strategy' },
    { id: 'schedule_restructure', label: 'スケジュール全体を見直す', value: 'defer', dataKey: 'fallback_strategy' },
  ],

  // A3 branches based on A2 (various A2 responses)
  // A2 answers for outcome (result-focused goals)
  certification: [
    { id: 'exam_focused', label: '試験範囲を体系的に学習', value: 'exam_focused', dataKey: 'scope_style' },
    { id: 'weak_areas', label: '苦手分野を重点的に強化', value: 'weak_areas', dataKey: 'scope_style' },
    { id: 'practice_intensive', label: '過去問・演習中心', value: 'practice_intensive', dataKey: 'scope_style' },
    { id: 'flexible_exam', label: '進めながら調整', value: 'flexible_exam', dataKey: 'scope_style' },
  ],
  sales: [
    { id: 'sales_broad', label: '営業スキル全般を学習', value: 'sales_broad', dataKey: 'scope_style' },
    { id: 'target_customer', label: 'ターゲット顧客に特化', value: 'target_customer', dataKey: 'scope_style' },
    { id: 'closing_focus', label: 'クロージング技術を集中強化', value: 'closing_focus', dataKey: 'scope_style' },
    { id: 'flexible_sales', label: '実践しながら調整', value: 'flexible_sales', dataKey: 'scope_style' },
  ],
  ranking: [
    { id: 'comprehensive', label: '全体的なパフォーマンス向上', value: 'comprehensive', dataKey: 'scope_style' },
    { id: 'key_metrics', label: '重要指標に絞って改善', value: 'key_metrics', dataKey: 'scope_style' },
    { id: 'single_skill', label: '特定スキルを徹底強化', value: 'single_skill', dataKey: 'scope_style' },
    { id: 'flexible_performance', label: '結果を見ながら調整', value: 'flexible_performance', dataKey: 'scope_style' },
  ],
  publication: [
    { id: 'project_wide', label: 'プロジェクト全体を学習', value: 'project_wide', dataKey: 'scope_style' },
    { id: 'core_features', label: '主要機能に集中', value: 'core_features', dataKey: 'scope_style' },
    { id: 'mvp_focus', label: '最小限の成果物に特化', value: 'mvp_focus', dataKey: 'scope_style' },
    { id: 'flexible_project', label: '進捗に合わせて調整', value: 'flexible_project', dataKey: 'scope_style' },
  ],
  // A2 answers for skill (skill-focused goals)
  work_applicable: [
    { id: 'job_comprehensive', label: '業務全般で使える幅広いスキル', value: 'job_comprehensive', dataKey: 'scope_style' },
    { id: 'current_priority', label: '今の業務で最も重要な部分', value: 'current_priority', dataKey: 'scope_style' },
    { id: 'expertise_one', label: 'ひとつの専門分野を極める', value: 'expertise_one', dataKey: 'scope_style' },
    { id: 'flexible_work', label: '仕事の状況に合わせて調整', value: 'flexible_work', dataKey: 'scope_style' },
  ],
  portfolio_creation: [
    { id: 'diverse_portfolio', label: '多様な作品でポートフォリオ', value: 'diverse_portfolio', dataKey: 'scope_style' },
    { id: 'theme_focused', label: '特定テーマで一貫した作品群', value: 'theme_focused', dataKey: 'scope_style' },
    { id: 'masterpiece_one', label: '渾身の代表作ひとつ', value: 'masterpiece_one', dataKey: 'scope_style' },
    { id: 'flexible_portfolio', label: '作りながら方向性を決める', value: 'flexible_portfolio', dataKey: 'scope_style' },
  ],
  teaching_capable: [
    { id: 'teaching_broad', label: '教えられる分野を幅広く', value: 'teaching_broad', dataKey: 'scope_style' },
    { id: 'core_concepts', label: '重要な概念に絞って深く理解', value: 'core_concepts', dataKey: 'scope_style' },
    { id: 'specialty_deep', label: '特定分野の専門家レベル', value: 'specialty_deep', dataKey: 'scope_style' },
    { id: 'flexible_teaching', label: '教える相手に合わせて調整', value: 'flexible_teaching', dataKey: 'scope_style' },
  ],
  troubleshooting: [
    { id: 'problem_types', label: '様々な問題パターンを学習', value: 'problem_types', dataKey: 'scope_style' },
    { id: 'frequent_issues', label: 'よく起きる問題の対処法', value: 'frequent_issues', dataKey: 'scope_style' },
    { id: 'root_cause', label: '根本原因分析手法を深く', value: 'root_cause', dataKey: 'scope_style' },
    { id: 'flexible_trouble', label: '実際の問題に応じて学習', value: 'flexible_trouble', dataKey: 'scope_style' },
  ],
  // A2 answers for habit (habit-focused goals)
  daily_habit: [
    { id: 'habit_broad', label: '生活全般の習慣改善', value: 'habit_broad', dataKey: 'scope_style' },
    { id: 'priority_habits', label: '最も重要な習慣に絞る', value: 'priority_habits', dataKey: 'scope_style' },
    { id: 'single_habit', label: 'ひとつの習慣を確実に定着', value: 'single_habit', dataKey: 'scope_style' },
    { id: 'flexible_habit', label: '続けやすいものから始める', value: 'flexible_habit', dataKey: 'scope_style' },
  ],
  weekdays: [
    { id: 'weekday_routine', label: '平日のルーティン全般', value: 'weekday_routine', dataKey: 'scope_style' },
    { id: 'work_balance', label: '仕事とのバランス重視', value: 'work_balance', dataKey: 'scope_style' },
    { id: 'evening_focus', label: '夕方・夜の時間に集中', value: 'evening_focus', dataKey: 'scope_style' },
    { id: 'flexible_weekday', label: '平日の状況に合わせて調整', value: 'flexible_weekday', dataKey: 'scope_style' },
  ],
  three_times_week: [
    { id: 'consistent_three', label: '週3回を確実に継続', value: 'consistent_three', dataKey: 'scope_style' },
    { id: 'quality_three', label: '週3回の質を重視', value: 'quality_three', dataKey: 'scope_style' },
    { id: 'intensive_session', label: '1回の濃密な取り組み', value: 'intensive_session', dataKey: 'scope_style' },
    { id: 'flexible_three', label: '週3回を基準に柔軟調整', value: 'flexible_three', dataKey: 'scope_style' },
  ],
  weekend_intensive: [
    { id: 'weekend_full', label: '週末をフル活用', value: 'weekend_full', dataKey: 'scope_style' },
    { id: 'saturday_sunday', label: '土曜または日曜に集中', value: 'saturday_sunday', dataKey: 'scope_style' },
    { id: 'deep_weekend', label: '週末の長時間集中セッション', value: 'deep_weekend', dataKey: 'scope_style' },
    { id: 'flexible_weekend', label: '週末の予定に合わせて調整', value: 'flexible_weekend', dataKey: 'scope_style' },
  ],
  // A2 answers for knowledge (knowledge-focused goals)
  exam_based: [
    { id: 'curriculum_full', label: '試験範囲を体系的に', value: 'curriculum_full', dataKey: 'scope_style' },
    { id: 'high_weight', label: '配点の高い分野を優先', value: 'high_weight', dataKey: 'scope_style' },
    { id: 'weak_subject', label: '苦手科目を集中強化', value: 'weak_subject', dataKey: 'scope_style' },
    { id: 'flexible_exam_prep', label: '模試結果に応じて調整', value: 'flexible_exam_prep', dataKey: 'scope_style' },
  ],
  no_exam: [
    { id: 'interest_driven', label: '興味のある分野を幅広く', value: 'interest_driven', dataKey: 'scope_style' },
    { id: 'practical_focus', label: '実用的な知識に絞る', value: 'practical_focus', dataKey: 'scope_style' },
    { id: 'deep_study', label: '特定分野を深く研究', value: 'deep_study', dataKey: 'scope_style' },
    { id: 'flexible_learning', label: '学びながら方向性を決める', value: 'flexible_learning', dataKey: 'scope_style' },
  ],
  past_questions: [
    { id: 'question_patterns', label: '出題パターンを幅広く分析', value: 'question_patterns', dataKey: 'scope_style' },
    { id: 'frequent_topics', label: '頻出テーマに集中', value: 'frequent_topics', dataKey: 'scope_style' },
    { id: 'difficult_questions', label: '難問対策に特化', value: 'difficult_questions', dataKey: 'scope_style' },
    { id: 'flexible_questions', label: '正答率に応じて調整', value: 'flexible_questions', dataKey: 'scope_style' },
  ],
  self_summary: [
    { id: 'comprehensive_notes', label: '体系的なまとめノート作成', value: 'comprehensive_notes', dataKey: 'scope_style' },
    { id: 'key_concepts', label: '重要概念のまとめに集中', value: 'key_concepts', dataKey: 'scope_style' },
    { id: 'personal_method', label: '自分なりの理解法を深める', value: 'personal_method', dataKey: 'scope_style' },
    { id: 'flexible_summary', label: '理解度に応じて調整', value: 'flexible_summary', dataKey: 'scope_style' },
  ],

  // C2 branches based on C1 (goal_evidence)
  credential_score: [
    { id: 'pass_margin', label: '合格点を確実に超えたい', value: 'pass_margin', dataKey: 'kpi_shape' },
    { id: 'accuracy_70', label: '正答率70%以上を目指したい', value: 'accuracy_70', dataKey: 'kpi_shape' },
    { id: 'mock_grade_a', label: '模試でA判定を取りたい', value: 'mock_grade_a', dataKey: 'kpi_shape' },
    { id: 'time_optimization', label: '解答時間を短縮したい', value: 'time_optimization', dataKey: 'kpi_shape' },
  ],
  portfolio_demo: [
    { id: 'one_work', label: 'しっかりした作品を１つ', value: 'one_work', dataKey: 'kpi_shape' },
    { id: 'two_works', label: '違う種類の作品を２つ', value: 'two_works', dataKey: 'kpi_shape' },
    { id: 'three_works', label: 'いろいろな作品を３つ', value: 'three_works', dataKey: 'kpi_shape' },
    { id: 'one_high_quality', label: '１つの作品をとことん高品質に', value: 'one_high_quality', dataKey: 'kpi_shape' },
  ],
  realworld_result: [
    { id: 'one_deal', label: 'まずは１件成約したい', value: 'one_deal', dataKey: 'kpi_shape' },
    { id: 'three_deals', label: '３件の成約を目指したい', value: 'three_deals', dataKey: 'kpi_shape' },
    { id: 'one_deployment', label: '実際にシステムを１つ運用したい', value: 'one_deployment', dataKey: 'kpi_shape' },
    { id: 'poc', label: '概念実証（PoC）を成功させたい', value: 'poc', dataKey: 'kpi_shape' },
  ],
  presentation_review: [
    { id: 'lt_one', label: 'ライトニングトークを１回やりたい', value: 'lt_one', dataKey: 'kpi_shape' },
    { id: 'lt_two', label: 'ライトニングトークを２回やりたい', value: 'lt_two', dataKey: 'kpi_shape' },
    { id: 'review_one', label: '専門家にレビューしてもらいたい', value: 'review_one', dataKey: 'kpi_shape' },
    { id: 'review_two', label: '２回レビューを受けて改善したい', value: 'review_two', dataKey: 'kpi_shape' },
  ],
};