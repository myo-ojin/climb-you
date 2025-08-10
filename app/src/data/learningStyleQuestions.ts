import { LearningStyleQuestion } from '../types/profiling';

export const LEARNING_STYLE_QUESTIONS: LearningStyleQuestion[] = [
  {
    id: 'motivation_driver',
    question: 'あなたが学習を続ける最大のモチベーションは何ですか？',
    type: 'single_choice',
    options: [
      { id: 'achievement', text: '目標を達成したときの達成感', score: 1 },
      { id: 'competition', text: '他の人と競い合うこと', score: 1 },
      { id: 'improvement', text: '自分自身の成長を実感すること', score: 1 },
      { id: 'curiosity', text: '新しいことを知る楽しさ', score: 1 },
      { id: 'social', text: '周りの人に認められること', score: 1 },
      { id: 'necessity', text: '仕事や生活に必要だから', score: 1 },
    ],
  },
  {
    id: 'learning_pace_preference',
    question: 'あなたに最も合う学習ペースはどれですか？',
    type: 'single_choice',
    options: [
      { id: 'intensive', text: '短期間で集中的に学習したい', score: 1 },
      { id: 'moderate', text: '毎日コンスタントに学習したい', score: 1 },
      { id: 'light', text: 'ゆっくりでも確実に進めたい', score: 1 },
      { id: 'flexible', text: 'その時の状況に合わせて調整したい', score: 1 },
    ],
  },
  {
    id: 'biggest_obstacles',
    question: '学習を続ける上で最も大きな障害は何ですか？（複数選択可）',
    type: 'multiple_choice',
    options: [
      { id: 'time_shortage', text: '時間が足りない', score: 1 },
      { id: 'motivation_loss', text: 'モチベーションが続かない', score: 1 },
      { id: 'difficulty', text: '内容が難しすぎる', score: 1 },
      { id: 'distraction', text: '他のことが気になって集中できない', score: 1 },
      { id: 'perfectionism', text: '完璧にやろうとしてしまう', score: 1 },
      { id: 'procrastination', text: 'ついつい先延ばしにしてしまう', score: 1 },
      { id: 'resource_lack', text: '適切な教材や資料が見つからない', score: 1 },
      { id: 'support_lack', text: '周りのサポートが得られない', score: 1 },
    ],
  },
  {
    id: 'success_measure',
    question: 'あなたにとって「学習が成功している」と感じるのはどんな時ですか？',
    type: 'single_choice',
    options: [
      { id: 'score_improvement', text: 'テストの点数が上がった時', score: 1 },
      { id: 'skill_application', text: '学んだことを実際に使えた時', score: 1 },
      { id: 'understanding_depth', text: '理解が深まったと感じた時', score: 1 },
      { id: 'habit_formation', text: '継続的に学習できている時', score: 1 },
      { id: 'recognition', text: '周りの人に成果を認められた時', score: 1 },
    ],
  },
  {
    id: 'difficulty_preference',
    question: 'あなたが好む学習の難易度はどれですか？',
    type: 'single_choice',
    options: [
      { id: 'easy_start', text: '簡単なことから始めて徐々に難しくしたい', score: 1 },
      { id: 'moderate_challenge', text: '適度に挑戦的な内容が良い', score: 1 },
      { id: 'high_challenge', text: '難しい内容にチャレンジしたい', score: 1 },
      { id: 'mixed_difficulty', text: 'その時の気分や状況に合わせたい', score: 1 },
    ],
  },
];

// Helper function to analyze answers and determine characteristics
export function analyzeLearningStyle(answers: Array<{ questionId: string; selectedOptions: string[] }>): {
  motivation: string;
  pace: string;
  obstacles: string[];
  preferences: string[];
} {
  const answerMap = new Map(answers.map(a => [a.questionId, a.selectedOptions]));
  
  // Determine primary motivation
  const motivationAnswer = answerMap.get('motivation_driver')?.[0] || 'improvement';
  
  // Determine preferred pace
  const paceAnswer = answerMap.get('learning_pace_preference')?.[0] || 'moderate';
  
  // Get obstacles (can be multiple)
  const obstacleAnswers = answerMap.get('biggest_obstacles') || [];
  
  // Get additional preferences
  const successMeasure = answerMap.get('success_measure')?.[0] || 'understanding_depth';
  const difficultyPref = answerMap.get('difficulty_preference')?.[0] || 'moderate_challenge';
  
  return {
    motivation: motivationAnswer,
    pace: paceAnswer,
    obstacles: obstacleAnswers,
    preferences: [successMeasure, difficultyPref],
  };
}

// Mapping functions for display
export function getMotivationLabel(motivation: string): string {
  const labels: Record<string, string> = {
    achievement: '達成重視型',
    competition: '競争重視型',
    improvement: '成長重視型',
    curiosity: '探求重視型',
    social: '承認重視型',
    necessity: '実用重視型',
  };
  return labels[motivation] || motivation;
}

export function getPaceLabel(pace: string): string {
  const labels: Record<string, string> = {
    intensive: '集中型',
    moderate: '安定継続型',
    light: '着実型',
    flexible: '柔軟適応型',
  };
  return labels[pace] || pace;
}

export function getObstacleLabel(obstacle: string): string {
  const labels: Record<string, string> = {
    time_shortage: '時間不足',
    motivation_loss: 'モチベーション維持',
    difficulty: '難易度調整',
    distraction: '集中力維持',
    perfectionism: '完璧主義',
    procrastination: '先延ばし癖',
    resource_lack: 'リソース不足',
    support_lack: 'サポート不足',
  };
  return labels[obstacle] || obstacle;
}