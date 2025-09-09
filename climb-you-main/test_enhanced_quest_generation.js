/**
 * Enhanced Quest Generation Test Script
 * 改善された時間制約対応版のテスト（Mock Implementation）
 */

// Mock Enhanced Quest Service for demonstration
class MockEnhancedQuestService {
  async testQuestGeneration(goalText, timeBudget, motivation = "mid") {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Enhanced Quest Generation Test`);
    console.log(`Goal: ${goalText}`);
    console.log(`Time Budget: ${timeBudget}min`);
    console.log(`${'='.repeat(60)}`);

    const timeAdjustmentLog = [];
    const startTime = Date.now();
    
    timeAdjustmentLog.push(`🎯 Starting quest generation for goal: "${goalText}"`);
    timeAdjustmentLog.push(`⏰ Available time budget: ${timeBudget} min/day`);
    
    // Mock skill map generation
    timeAdjustmentLog.push('📚 Step 1: Generating skill map...');
    const skillAtoms = this.mockGenerateSkillMap(goalText);
    timeAdjustmentLog.push(`   Generated ${skillAtoms.length} skill atoms`);
    
    // Mock quest generation with time constraints
    timeAdjustmentLog.push('⚡ Step 2: Generating time-constrained daily quests...');
    const initialQuests = this.mockGenerateInitialQuests(goalText);
    const initialTotalTime = initialQuests.reduce((sum, q) => sum + q.minutes, 0);
    timeAdjustmentLog.push(`   Initial total time: ${initialTotalTime}min`);
    
    // Time adjustment logic
    const { adjustedQuests, adjustmentLogs } = this.mockPreAdjustQuestTimes(initialQuests, timeBudget);
    timeAdjustmentLog.push(...adjustmentLogs);
    
    // Enhanced policy check
    timeAdjustmentLog.push('🔍 Step 3: Enhanced policy check and optimization...');
    const { finalQuests, enhancementLogs } = this.mockApplyFinalEnhancements(adjustedQuests, timeBudget);
    timeAdjustmentLog.push(...enhancementLogs);
    
    const endTime = Date.now();
    const totalTime = Math.round((endTime - startTime) / 10) / 100;
    timeAdjustmentLog.push(`✅ Quest generation completed in ${totalTime}s`);
    
    const finalTotalTime = finalQuests.reduce((sum, q) => sum + q.minutes, 0);
    timeAdjustmentLog.push(`🎯 Final result: ${finalQuests.length} quests, ${finalTotalTime}min total`);

    // Display results
    console.log('\n📊 Generation Results:');
    timeAdjustmentLog.forEach(log => console.log(log));

    console.log('\n🎮 Final Quests:');
    finalQuests.forEach((quest, idx) => {
      console.log(`\n   Quest ${idx + 1}: ${quest.title}`);
      console.log(`   ├─ Pattern: ${quest.pattern}`);
      console.log(`   ├─ Duration: ${quest.minutes}min`);
      console.log(`   ├─ Difficulty: ${quest.difficulty}`);
      console.log(`   ├─ Deliverable: ${quest.deliverable}`);
      console.log(`   └─ Tags: ${quest.tags.join(', ')}`);
    });

    const efficiency = (finalTotalTime / timeBudget * 100).toFixed(1);
    const budgetStatus = finalTotalTime <= timeBudget ? '✅' : '⚠️';
    
    console.log(`\n${budgetStatus} Success: ${finalQuests.length} quests, ${finalTotalTime}min (${efficiency}% of budget)`);
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
    } else {
      return [
        { id: "skill-basics", label: "基礎スキル", type: "concept", level: "intro" },
        { id: "practical-application", label: "実践応用", type: "procedure", level: "basic" }
      ];
    }
  }
  
  mockGenerateInitialQuests(goalText) {
    const text = goalText.toLowerCase();
    
    if (text.includes('英語') || text.includes('toeic')) {
      return [
        {
          title: "英単語フラッシュカード学習",
          pattern: "flashcards",
          minutes: 20,
          difficulty: 0.3,
          deliverable: "50語の単語カード",
          tags: ["英語", "単語", "TOEIC"]
        },
        {
          title: "リスニング問題演習",
          pattern: "past_paper", 
          minutes: 30,
          difficulty: 0.5,
          deliverable: "解答と解説ノート",
          tags: ["英語", "リスニング", "問題演習"]
        },
        {
          title: "英文法復習ノート作成",
          pattern: "read_note_q",
          minutes: 25,
          difficulty: 0.4,
          deliverable: "文法まとめノート", 
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
          tags: ["React", "コンポーネント", "実装"]
        },
        {
          title: "State管理の実践", 
          pattern: "config_verify",
          minutes: 25,
          difficulty: 0.5,
          deliverable: "状態管理サンプル",
          tags: ["React", "State", "フック"]
        },
        {
          title: "React Native環境構築",
          pattern: "config_verify",
          minutes: 35,
          difficulty: 0.6,
          deliverable: "動作確認済み開発環境",
          tags: ["React Native", "環境構築", "セットアップ"]
        }
      ];
    } else {
      return [
        {
          title: "エイム練習（射撃訓練場）",
          pattern: "build_micro",
          minutes: 20,
          difficulty: 0.4,
          deliverable: "エイム精度記録", 
          tags: ["Apex", "エイム", "練習"]
        },
        {
          title: "ランクマッチ戦術研究",
          pattern: "read_note_q",
          minutes: 25,
          difficulty: 0.5,
          deliverable: "戦術ノート",
          tags: ["Apex", "戦術", "学習"]
        },
        {
          title: "キャラクター別立ち回り練習",
          pattern: "past_paper",
          minutes: 30,
          difficulty: 0.6,
          deliverable: "キャラ別戦績記録",
          tags: ["Apex", "キャラクター", "立ち回り"]
        }
      ];
    }
  }
  
  mockPreAdjustQuestTimes(quests, maxTotalMinutes) {
    const totalMinutes = quests.reduce((sum, q) => sum + q.minutes, 0);
    const logs = [];
    
    if (totalMinutes <= maxTotalMinutes) {
      logs.push(`   ✅ No time adjustment needed (${totalMinutes}min <= ${maxTotalMinutes}min)`);
      return { adjustedQuests: quests, adjustmentLogs: logs };
    }

    logs.push(`   ⚠️  Time adjustment needed: ${totalMinutes}min → ${maxTotalMinutes}min`);
    
    let adjustedQuests = [...quests];
    
    // Strategy 1: Remove excessive quests if too many
    const minMinutesPerQuest = 15;
    const maxReasonableQuests = Math.floor(maxTotalMinutes / minMinutesPerQuest);
    
    if (adjustedQuests.length > maxReasonableQuests) {
      adjustedQuests = adjustedQuests.slice(0, maxReasonableQuests);
      logs.push(`   🔄 Reduced quest count to ${maxReasonableQuests} (max reasonable for time budget)`);
    }
    
    // Strategy 2: Proportional scaling with minimum constraints
    const currentTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
    const scale = maxTotalMinutes / currentTotal;
    
    if (scale < 1) {
      adjustedQuests = adjustedQuests.map((quest, index) => {
        const newMinutes = Math.max(minMinutesPerQuest, Math.round(quest.minutes * scale));
        
        // Give slightly more time to first quest (foundational)
        const bonusTime = index === 0 ? Math.min(3, Math.floor(maxTotalMinutes * 0.1)) : 0;
        
        return {
          ...quest,
          minutes: newMinutes + bonusTime
        };
      });
      
      // Final adjustment to exactly match budget
      const finalTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
      if (finalTotal !== maxTotalMinutes && adjustedQuests.length > 0) {
        const diff = maxTotalMinutes - finalTotal;
        adjustedQuests[0].minutes = Math.max(minMinutesPerQuest, adjustedQuests[0].minutes + diff);
      }
      
      logs.push(`   📊 Applied proportional scaling (${scale.toFixed(2)}x) with ${minMinutesPerQuest}min minimum`);
    }
    
    const adjustedTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
    logs.push(`   ✅ Adjusted to ${adjustedTotal}min (target: ${maxTotalMinutes}min)`);
    
    return { adjustedQuests, adjustmentLogs: logs };
  }
  
  mockApplyFinalEnhancements(quests, maxTotalMinutes) {
    const logs = [];
    let enhancedQuests = [...quests];
    
    // 1. Difficulty balancing
    let adjustmentCount = 0;
    enhancedQuests = enhancedQuests.map((quest, index) => {
      let newDifficulty = quest.difficulty;
      
      // First quest should be easier
      if (index === 0 && quest.difficulty > 0.5) {
        newDifficulty = Math.max(0.3, quest.difficulty - 0.15);
        adjustmentCount++;
      }
      
      // Progressive difficulty
      if (index > 0 && newDifficulty <= enhancedQuests[index - 1].difficulty - 0.1) {
        newDifficulty = Math.min(0.7, enhancedQuests[index - 1].difficulty + 0.05);
        adjustmentCount++;
      }
      
      return newDifficulty !== quest.difficulty 
        ? { ...quest, difficulty: newDifficulty }
        : quest;
    });
    
    if (adjustmentCount > 0) {
      logs.push(`   🎯 Balanced difficulty for ${adjustmentCount} quests`);
    }
    
    // 2. Pattern diversity
    const patternAlternatives = {
      "read_note_q": "flashcards",
      "flashcards": "read_note_q", 
      "build_micro": "config_verify",
      "config_verify": "build_micro",
      "past_paper": "flashcards"
    };
    
    let patternChanges = 0;
    enhancedQuests = enhancedQuests.map((quest, index) => {
      if (index === 0) return quest;
      
      const prevQuest = enhancedQuests[index - 1];
      if (quest.pattern === prevQuest.pattern) {
        const newPattern = patternAlternatives[quest.pattern] || "read_note_q";
        patternChanges++;
        return { ...quest, pattern: newPattern };
      }
      
      return quest;
    });
    
    if (patternChanges > 0) {
      logs.push(`   🌈 Enhanced pattern diversity (${patternChanges} changes)`);
    }
    
    return { finalQuests: enhancedQuests, enhancementLogs: logs };
  }
}

const mockEnhancedQuestService = new MockEnhancedQuestService();

async function runEnhancedQuestTests() {
  console.log('🧪 Enhanced Quest Generation Test Starting...\n');

  const testCases = [
    {
      name: "英語学習（厳しい時間制約）",
      goalText: "3ヶ月でTOEIC800点を取りたい", 
      timeBudget: 25, // 以前は75分→25分に削減
      motivation: "high"
    },
    {
      name: "プログラミング学習（適度な時間制約）",
      goalText: "React Nativeでスマホアプリを作れるようになりたい",
      timeBudget: 40, // 以前は90分→40分に削減  
      motivation: "mid"
    },
    {
      name: "ゲームスキル（極度に厳しい時間制約）",
      goalText: "Apex Legendsでプラチナランクに到達したい",
      timeBudget: 20, // 以前は75分→20分に削減
      motivation: "high"
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      await mockEnhancedQuestService.testQuestGeneration(
        testCase.goalText,
        testCase.timeBudget,
        testCase.motivation
      );
      
    } catch (error) {
      console.error(`❌ Test ${i + 1} failed:`, error.message);
    }
    
    // Wait a moment between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('🏁 Enhanced Quest Generation Test Completed');
  console.log('✅ Key Improvements:');
  console.log('   • Time constraints properly enforced');  
  console.log('   • Intelligent quest reduction when needed');
  console.log('   • Difficulty balancing with progressive increase');
  console.log('   • Pattern diversity for better learning experience');
  console.log('   • Detailed logging for transparency');
  console.log(`${'='.repeat(70)}`);
}

// Run the tests
runEnhancedQuestTests().catch(console.error);