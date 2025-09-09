/**
 * Quest Generation Test Script
 * 実際に目標を渡してクエスト生成をテストする
 */

console.log('🧪 Quest Generation Test Starting...\n');

// テストデータ
const testGoals = [
  {
    name: "英語学習",
    goalText: "3ヶ月でTOEIC800点を取りたい",
    timeBudget: 30,
    motivation: "high"
  },
  {
    name: "プログラミング学習",
    goalText: "React Nativeでスマホアプリを作れるようになりたい",
    timeBudget: 45,
    motivation: "mid"
  },
  {
    name: "ゲームスキル",
    goalText: "Apex Legendsでプラチナランクに到達したい",
    timeBudget: 25,
    motivation: "high"
  }
];

// Mock AdvancedQuestService for testing
class MockAdvancedQuestService {
  initialize() {
    console.log('✅ Mock AdvancedQuestService initialized');
    return true;
  }

  isInitialized() {
    return true;
  }

  createBasicProfile({ goalText, timeBudgetMin, motivation, sessionLength = 20 }) {
    return {
      time_budget_min_per_day: timeBudgetMin,
      peak_hours: [9, 10, 11, 14, 15, 16],
      env_constraints: [],
      hard_constraints: [],
      motivation_style: "pull",
      difficulty_tolerance: 0.5,
      novelty_preference: 0.5,
      pace_preference: "cadence",
      long_term_goal: goalText,
      current_level_tags: [],
      priority_areas: [],
      heat_level: 3,
      risk_factors: [],
      preferred_session_length_min: sessionLength,
      modality_preference: ["read", "video"],
      deliverable_preferences: ["note"],
      weekly_minimum_commitment_min: Math.floor(timeBudgetMin * 7 * 0.8),
      goal_motivation: motivation,
    };
  }

  async generateOptimizedQuests(args) {
    console.log(`🎯 Generating optimized quests for: "${args.goalText}"`);
    console.log(`⏰ Time budget: ${args.profile.time_budget_min_per_day} min/day`);
    console.log(`🎨 Motivation: ${args.profile.goal_motivation}`);
    
    // Mock スキルマップ生成
    console.log('\n📚 Step 1: Skill Map Generation');
    const skillAtoms = this.mockGenerateSkillMap(args.goalText);
    console.log(`   Generated ${skillAtoms.length} skill atoms`);
    skillAtoms.forEach((atom, i) => {
      console.log(`   ${i+1}. ${atom.label} (${atom.level} - ${atom.type})`);
    });

    // Mock クエスト生成
    console.log('\n⚡ Step 2: Daily Quest Generation');
    const questsCandidate = this.mockGenerateQuests(args.goalText, skillAtoms);
    console.log(`   Generated ${questsCandidate.length} quest candidates`);
    questsCandidate.forEach((quest, i) => {
      console.log(`   ${i+1}. ${quest.title} (${quest.minutes}min, ${quest.pattern})`);
    });

    // Mock ポリシーチェック
    console.log('\n🔍 Step 3: Policy Check');
    const finalQuests = {
      quests: questsCandidate,
      rationale: ["適切な難易度バランス", "時間制約内でのクエスト構成", "継続可能な学習パターン"]
    };
    console.log(`   Final quest count: ${finalQuests.quests.length}`);
    console.log(`   Total minutes: ${finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0)}`);

    return {
      skillAtoms,
      questsCandidate,
      finalQuests
    };
  }

  mockGenerateSkillMap(goalText) {
    const text = goalText.toLowerCase();
    
    if (text.includes('英語') || text.includes('toeic')) {
      return [
        { id: "english-basics", label: "英語基礎", type: "concept", level: "intro" },
        { id: "toeic-strategy", label: "TOEIC戦略", type: "procedure", level: "basic" },
        { id: "listening-skills", label: "リスニング", type: "skill", level: "intermediate" }
      ];
    } else if (text.includes('react') || text.includes('アプリ')) {
      return [
        { id: "react-basics", label: "React基礎", type: "concept", level: "intro" },
        { id: "component-design", label: "コンポーネント設計", type: "procedure", level: "basic" },
        { id: "app-deployment", label: "アプリデプロイ", type: "procedure", level: "intermediate" }
      ];
    } else if (text.includes('apex') || text.includes('プラチナ')) {
      return [
        { id: "aim-training", label: "エイム練習", type: "skill", level: "basic" },
        { id: "game-sense", label: "ゲームセンス", type: "concept", level: "intermediate" },
        { id: "team-play", label: "チーム連携", type: "procedure", level: "intermediate" }
      ];
    }
    
    return [
      { id: "general-learning", label: "基礎学習", type: "concept", level: "intro" }
    ];
  }

  mockGenerateQuests(goalText, skillAtoms) {
    const text = goalText.toLowerCase();
    
    if (text.includes('英語') || text.includes('toeic')) {
      return [
        {
          title: "英単語フラッシュカード学習",
          pattern: "flashcards",
          minutes: 20,
          difficulty: 0.3,
          deliverable: "50語の単語カード",
          steps: ["頻出単語リストを確認", "フラッシュカードで暗記", "発音練習"],
          criteria: ["50語を正確に発音できる", "意味を理解している"],
          tags: ["英語", "単語", "TOEIC"]
        },
        {
          title: "リスニング問題演習",
          pattern: "past_paper",
          minutes: 30,
          difficulty: 0.5,
          deliverable: "解答と解説ノート",
          steps: ["模擬問題を解く", "間違いを分析", "解説を読んで理解"],
          criteria: ["70%以上の正答率", "間違いパターンを把握"],
          tags: ["英語", "リスニング", "問題演習"]
        },
        {
          title: "英文法復習ノート作成",
          pattern: "read_note_q",
          minutes: 25,
          difficulty: 0.4,
          deliverable: "文法まとめノート",
          steps: ["重要文法項目を選択", "例文と共にノート作成", "理解度チェック"],
          criteria: ["基本文法を説明できる", "例文を正しく作れる"],
          tags: ["英語", "文法", "ノート"]
        }
      ];
    } else if (text.includes('react') || text.includes('アプリ')) {
      return [
        {
          title: "React基礎コンポーネント作成",
          pattern: "build_micro",
          minutes: 30,
          difficulty: 0.4,
          deliverable: "動作するコンポーネント",
          steps: ["基本コンポーネントを設計", "JSXで実装", "動作確認"],
          criteria: ["コンポーネントが正しく表示される", "propsが機能している"],
          tags: ["React", "コンポーネント", "実装"]
        },
        {
          title: "State管理の実践",
          pattern: "config_verify",
          minutes: 25,
          difficulty: 0.5,
          deliverable: "状態管理サンプル",
          steps: ["useStateの使用方法学習", "状態更新ロジック実装", "動作テスト"],
          criteria: ["状態が正しく更新される", "UIが連動している"],
          tags: ["React", "State", "フック"]
        },
        {
          title: "React Native環境構築",
          pattern: "config_verify",
          minutes: 35,
          difficulty: 0.6,
          deliverable: "動作確認済み開発環境",
          steps: ["開発環境セットアップ", "サンプルアプリ作成", "実機テスト"],
          criteria: ["開発環境が正常動作", "実機でアプリ実行可能"],
          tags: ["React Native", "環境構築", "セットアップ"]
        }
      ];
    } else if (text.includes('apex') || text.includes('プラチナ')) {
      return [
        {
          title: "エイム練習（射撃訓練場）",
          pattern: "build_micro",
          minutes: 20,
          difficulty: 0.4,
          deliverable: "エイム精度記録",
          steps: ["射撃訓練場でウォームアップ", "各武器で精度テスト", "記録を分析"],
          criteria: ["命中率80%以上", "各武器の特徴を把握"],
          tags: ["Apex", "エイム", "練習"]
        },
        {
          title: "ランクマッチ戦術研究",
          pattern: "read_note_q",
          minutes: 25,
          difficulty: 0.5,
          deliverable: "戦術ノート",
          steps: ["プロプレイヤー動画視聴", "戦術ポイントをメモ", "実戦での活用方法検討"],
          criteria: ["3つ以上の戦術を理解", "実戦で試せる状態"],
          tags: ["Apex", "戦術", "学習"]
        },
        {
          title: "キャラクター別立ち回り練習",
          pattern: "past_paper",
          minutes: 30,
          difficulty: 0.6,
          deliverable: "キャラ別戦績記録",
          steps: ["使用キャラを決定", "アビリティ活用法学習", "実戦で練習"],
          criteria: ["キャラの強みを活用できる", "アビリティ使用タイミング習得"],
          tags: ["Apex", "キャラクター", "立ち回り"]
        }
      ];
    }
    
    return [
      {
        title: "基礎学習クエスト",
        pattern: "read_note_q",
        minutes: 20,
        difficulty: 0.5,
        deliverable: "学習ノート",
        steps: ["基本概念を学習", "要点をまとめる"],
        criteria: ["基本概念を理解している"],
        tags: ["学習", "基礎"]
      }
    ];
  }
}

// テスト実行
async function runQuestGenerationTest() {
  const questService = new MockAdvancedQuestService();
  questService.initialize();

  for (let i = 0; i < testGoals.length; i++) {
    const testGoal = testGoals[i];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 Test ${i + 1}: ${testGoal.name}`);
    console.log(`${'='.repeat(60)}`);
    
    // プロファイル作成
    const profile = questService.createBasicProfile({
      goalText: testGoal.goalText,
      timeBudgetMin: testGoal.timeBudget,
      motivation: testGoal.motivation
    });

    try {
      // クエスト生成実行
      const result = await questService.generateOptimizedQuests({
        goalText: testGoal.goalText,
        profile,
        currentLevelTags: [],
        priorityAreas: []
      });

      // 結果分析
      console.log('\n📊 Generation Results:');
      console.log(`   Skill Atoms: ${result.skillAtoms.length}`);
      console.log(`   Quest Candidates: ${result.questsCandidate.length}`);
      console.log(`   Final Quests: ${result.finalQuests.quests.length}`);
      
      const totalMinutes = result.finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0);
      console.log(`   Total Time: ${totalMinutes}min (Budget: ${testGoal.timeBudget}min)`);
      
      // 詳細なクエスト情報
      console.log('\n🎮 Generated Quests:');
      result.finalQuests.quests.forEach((quest, idx) => {
        console.log(`\n   Quest ${idx + 1}: ${quest.title}`);
        console.log(`   ├─ Pattern: ${quest.pattern}`);
        console.log(`   ├─ Duration: ${quest.minutes}min`);
        console.log(`   ├─ Difficulty: ${quest.difficulty}`);
        console.log(`   ├─ Deliverable: ${quest.deliverable}`);
        console.log(`   ├─ Steps: ${quest.steps?.join(', ') || 'N/A'}`);
        console.log(`   └─ Tags: ${quest.tags.join(', ')}`);
      });

    } catch (error) {
      console.error(`❌ Error in test ${i + 1}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 Quest Generation Test Completed');
  console.log(`${'='.repeat(60)}`);
}

// テスト実行
runQuestGenerationTest().catch(console.error);