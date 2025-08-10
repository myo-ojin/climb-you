import { Quest, DailyQuestCollection, QuestCategory, QuestDifficulty } from '../types/quest';

// Mock quest templates for different categories
const mockQuestTemplates = {
  learning: [
    {
      title: '新しい単語を10個覚える',
      description: '今日の学習テーマに関連する重要な単語を選んで覚えましょう',
      instructions: [
        '学習テーマに関連する単語を10個選ぶ',
        '各単語の意味と例文を調べる',
        '単語カードを作成する',
        '5回ずつ音読練習する'
      ],
      successCriteria: [
        '10個の単語の意味を正確に覚えている',
        '各単語を使った例文を作れる'
      ],
      goalContribution: '語彙を増やすことで理解力が向上し、目標達成に近づきます',
      motivationMessage: '新しい単語は新しい世界への扉です！一歩ずつ語彙を増やしていきましょう！'
    },
    {
      title: '15分間の集中学習セッション',
      description: '今日のメインテーマについて集中的に学習する時間を設けましょう',
      instructions: [
        'タイマーを15分にセット',
        '学習資料を準備',
        '携帯電話を別の部屋に置く',
        '集中して学習に取り組む'
      ],
      successCriteria: [
        '15分間中断せずに学習できた',
        '学習した内容を3つのポイントで要約できる'
      ],
      goalContribution: '集中力を鍛えることで、効率的な学習習慣が身につきます',
      motivationMessage: '短時間でも集中すれば驚くほど多くを学べます！'
    }
  ],
  practice: [
    {
      title: '学んだことを実際に使ってみる',
      description: '今週学習したスキルを実践的に活用してみましょう',
      instructions: [
        '今週学んだスキルを1つ選ぶ',
        '実践できる簡単なタスクを決める',
        '実際に手を動かして試す',
        '結果を記録する'
      ],
      successCriteria: [
        '選んだスキルを実際に使えた',
        '実践で気づいた改善点を記録できた'
      ],
      goalContribution: '実践を通じて知識が定着し、実用的なスキルに変わります',
      motivationMessage: '知識は使ってこそ価値があります！積極的に実践していきましょう！'
    },
    {
      title: '5分間のスキル練習',
      description: '毎日少しずつでも継続的にスキルを磨いていきましょう',
      instructions: [
        '練習したいスキルを1つ選ぶ',
        'タイマーを5分にセット',
        '基本的な練習を繰り返す',
        '上達した点を記録する'
      ],
      successCriteria: [
        '5分間継続して練習できた',
        '昨日より少しでも上達を感じられた'
      ],
      goalContribution: '毎日の小さな練習が大きな成長につながります',
      motivationMessage: '継続は力なり！小さな積み重ねが大きな変化を生みます！'
    }
  ],
  reflection: [
    {
      title: '今日の学習を振り返る',
      description: '今日学んだことを整理し、明日への改善点を見つけましょう',
      instructions: [
        '今日学んだことを3つ書き出す',
        'うまくいったことを1つ特定する',
        '改善できることを1つ見つける',
        '明日の目標を設定する'
      ],
      successCriteria: [
        '学習内容を具体的に振り返れた',
        '明日の改善点が明確になった'
      ],
      goalContribution: '振り返りによって学習効率が向上し、着実に成長できます',
      motivationMessage: '振り返りは成長のコンパス！今日の経験を明日の力に変えましょう！'
    }
  ],
  action: [
    {
      title: '学習環境を整える',
      description: '集中して学習できる環境を作って、学習効率を向上させましょう',
      instructions: [
        '学習スペースを片付ける',
        '必要な教材を手の届く場所に配置',
        '集中を妨げるものを取り除く',
        '快適な温度・照明に調整'
      ],
      successCriteria: [
        '学習スペースが整理整頓されている',
        '集中しやすい環境が整った'
      ],
      goalContribution: '良い環境は学習効率を大幅に向上させます',
      motivationMessage: '環境を整えることで、学習への取り組みが格段に良くなります！'
    }
  ],
  research: [
    {
      title: '新しい学習リソースを見つける',
      description: '学習を効率化する新しいツールや資料を探してみましょう',
      instructions: [
        '現在の学習の課題を特定',
        'その課題を解決できるリソースを検索',
        '3つの候補を比較検討',
        '最も有用そうなものを1つ選ぶ'
      ],
      successCriteria: [
        '有用な新しいリソースを見つけた',
        'そのリソースの活用方法が明確'
      ],
      goalContribution: '良いリソースを見つけることで学習効率が大幅に向上します',
      motivationMessage: '新しいツールとの出会いが学習を変えるかもしれません！'
    }
  ]
};

// Generate random quest from category
const generateRandomQuestFromCategory = (
  category: QuestCategory,
  difficulty: QuestDifficulty,
  userId: string
): Quest => {
  const templates = mockQuestTemplates[category];
  const template = templates[Math.floor(Math.random() * templates.length)];
  
  const baseTime = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 30 : 45;
  const timeVariation = Math.floor(Math.random() * 10) - 5; // ±5 minutes
  
  return {
    id: `mock_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: template.title,
    description: template.description,
    category,
    difficulty,
    estimatedTimeMinutes: Math.max(5, baseTime + timeVariation),
    instructions: template.instructions,
    successCriteria: template.successCriteria,
    goalContribution: template.goalContribution,
    motivationMessage: template.motivationMessage,
    status: 'pending',
    createdAt: new Date(),
    userId,
  };
};

// Generate daily AI message
const generateDailyAIMessage = (): string => {
  const messages = [
    '今日も新しい一歩を踏み出しましょう！あなたの成長を楽しみにしています。',
    '継続は力なり。小さな積み重ねが大きな変化を生み出します！',
    '今日のクエストはあなたの目標に向けて厳選されています。一つずつ丁寧に取り組んでみてください。',
    '学習は山登りのようなもの。一歩一歩確実に登っていけば、必ず頂上に辿り着けます！',
    '今日の挑戦が明日の自信につながります。前向きに取り組んでいきましょう！',
    'あなたのペースで大丈夫。無理をせず、着実に成長していきましょう。',
    '新しいことを学ぶワクワク感を大切に。今日も充実した学習時間になりますように！'
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
};

// Generate mock daily quest collection
export const generateMockDailyQuests = (userId: string): DailyQuestCollection => {
  const today = new Date().toISOString().split('T')[0];
  
  // Generate 3-4 quests with different categories and difficulties
  const questConfigs = [
    { category: 'learning' as QuestCategory, difficulty: 'easy' as QuestDifficulty },
    { category: 'practice' as QuestCategory, difficulty: 'medium' as QuestDifficulty },
    { category: 'reflection' as QuestCategory, difficulty: 'easy' as QuestDifficulty },
    // Randomly add a 4th quest
    ...(Math.random() > 0.5 ? [{ category: 'action' as QuestCategory, difficulty: 'medium' as QuestDifficulty }] : [])
  ];
  
  const quests = questConfigs.map(config => 
    generateRandomQuestFromCategory(config.category, config.difficulty, userId)
  );
  
  const totalEstimatedTime = quests.reduce((total, quest) => total + quest.estimatedTimeMinutes, 0);
  
  return {
    id: `${userId}_${today}`,
    userId,
    date: today,
    quests,
    totalEstimatedTime,
    aiGeneratedMessage: generateDailyAIMessage(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

// Generate sample completed quests for testing
export const generateSampleCompletedQuests = (userId: string, daysBack: number = 3): DailyQuestCollection[] => {
  const collections: DailyQuestCollection[] = [];
  
  for (let i = 1; i <= daysBack; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    const collection = generateMockDailyQuests(userId);
    collection.id = `${userId}_${dateString}`;
    collection.date = dateString;
    collection.createdAt = date;
    collection.updatedAt = date;
    
    // Randomly complete some quests
    collection.quests.forEach(quest => {
      if (Math.random() > 0.3) { // 70% completion rate
        quest.status = 'completed';
        quest.completedAt = new Date(date.getTime() + Math.random() * 24 * 60 * 60 * 1000);
      }
    });
    
    collections.push(collection);
  }
  
  return collections;
};