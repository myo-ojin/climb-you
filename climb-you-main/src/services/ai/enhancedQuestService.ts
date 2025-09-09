/**
 * Enhanced Quest Service - 時間制約対応改善版
 * 
 * advancedQuestServiceを継承し、時間制約調整機能を強化
 */

import { advancedQuestService } from './advancedQuestService.fixed';
import { 
  ProfileV1, 
  Quest, 
  QuestList, 
  DailyCheckins, 
  SkillAtom,
  Pattern
} from './promptEngine';
import { InputSanitizer } from '../../utils/inputSanitizer';

class EnhancedQuestService {
  
  /**
   * 時間制約を考慮したクエスト生成（改善版）
   */
  async generateOptimizedQuestsWithTimeConstraints(args: {
    goalText: string;
    profile: ProfileV1;
    currentLevelTags?: string[];
    priorityAreas?: string[];
    checkins?: DailyCheckins;
  }): Promise<{
    skillAtoms: SkillAtom[];
    questsCandidate: Quest[];
    finalQuests: QuestList;
    timeAdjustmentLog: string[];
  }> {
    const timeAdjustmentLog: string[] = [];
    const startTime = Date.now();
    
    // Input validation and sanitization
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments provided to quest generation');
    }
    
    if (!args.goalText || typeof args.goalText !== 'string') {
      throw new Error('Goal text is required and must be a valid string');
    }
    
    if (!args.profile || typeof args.profile !== 'object') {
      throw new Error('Profile is required and must be a valid object');
    }
    
    // Sanitize inputs
    const sanitizedGoalText = InputSanitizer.sanitizeGoalText(args.goalText);
    const sanitizedProfile = InputSanitizer.sanitizeProfileData(args.profile);
    
    timeAdjustmentLog.push(`🎯 Starting quest generation for goal: "${sanitizedGoalText}"`);
    timeAdjustmentLog.push(`⏰ Available time budget: ${sanitizedProfile.time_budget_min_per_day || args.profile.time_budget_min_per_day} min/day`);
    
    try {
      // Step 1: スキルマップ生成
      console.log('🎯 Step 1: Generating skill map...');
      timeAdjustmentLog.push('📚 Step 1: Generating skill map...');
      
      const skillAtoms = await advancedQuestService.generateSkillMap({
        goalText: sanitizedGoalText,
        currentLevelTags: args.currentLevelTags,
        priorityAreas: args.priorityAreas,
      });
      
      timeAdjustmentLog.push(`   Generated ${skillAtoms.length} skill atoms`);

      // Step 2: 時間制約を考慮したクエスト生成
      console.log('⚡ Step 2: Generating time-constrained quests...');
      timeAdjustmentLog.push('⚡ Step 2: Generating time-constrained daily quests...');
      
      const questsCandidate = await advancedQuestService.generateDailyQuests({
        profile: { ...args.profile, ...sanitizedProfile },
        skillAtoms,
        checkins: args.checkins,
      });
      
      // Validate and sanitize generated quests
      const validatedQuests = questsCandidate.map(quest => {
        if (!InputSanitizer.validateQuestData(quest)) {
          timeAdjustmentLog.push(`   ⚠️  Invalid quest detected, applying sanitization`);
          return InputSanitizer.sanitizeQuestData(quest);
        }
        return quest;
      }).filter(quest => quest && quest.title); // Remove invalid quests
      
      const initialTotalTime = validatedQuests.reduce((sum, q) => sum + q.minutes, 0);
      timeAdjustmentLog.push(`   Initial total time: ${initialTotalTime}min`);

      // Step 3: 事前時間調整
      const preAdjustedQuests = this.preAdjustQuestTimes(
        validatedQuests, 
        sanitizedProfile.time_budget_min_per_day || args.profile.time_budget_min_per_day,
        timeAdjustmentLog
      );

      // Step 4: 強化されたポリシーチェック
      console.log('🔍 Step 3: Enhanced policy check...');
      timeAdjustmentLog.push('🔍 Step 3: Enhanced policy check and optimization...');
      
      const finalQuests = await advancedQuestService.policyCheck({
        quests: preAdjustedQuests,
        profile: { ...args.profile, ...sanitizedProfile },
        checkins: args.checkins,
      });

      // Step 5: 最終調整
      const enhancedFinalQuests = this.applyFinalEnhancements(
        finalQuests.quests,
        sanitizedProfile.time_budget_min_per_day || args.profile.time_budget_min_per_day,
        timeAdjustmentLog
      );

      const endTime = Date.now();
      const totalTime = Math.round((endTime - startTime) / 1000 * 10) / 10;
      timeAdjustmentLog.push(`✅ Quest generation completed in ${totalTime}s`);
      
      const finalTotalTime = enhancedFinalQuests.reduce((sum, q) => sum + q.minutes, 0);
      timeAdjustmentLog.push(`🎯 Final result: ${enhancedFinalQuests.length} quests, ${finalTotalTime}min total`);

      return {
        skillAtoms,
        questsCandidate: validatedQuests,
        finalQuests: {
          quests: enhancedFinalQuests,
          rationale: [
            ...finalQuests.rationale,
            "時間制約を考慮した最適化済み",
            `実行可能な${finalTotalTime}分構成`
          ]
        },
        timeAdjustmentLog
      };
    } catch (error) {
      console.error('Enhanced quest generation failed:', error);
      timeAdjustmentLog.push(`❌ Error: ${error.message}`);
      
      // Check for specific goal text validation errors
      if (error.message.includes('Goal text must be at least')) {
        throw new Error('目標をもう少し詳しく入力してください。例：「英語を話せるようになりたい」「プログラミングスキルを身につけたい」など、具体的な内容をお書きください。');
      }
      
      // Generic error handling
      throw new Error(`学習プラン生成でエラーが発生しました。入力内容を確認してもう一度お試しください: ${error.message}`);
    }
  }

  /**
   * クエストの事前時間調整（改善版）
   */
  private preAdjustQuestTimes(
    quests: Quest[], 
    maxTotalMinutes: number,
    log: string[]
  ): Quest[] {
    const totalMinutes = quests.reduce((sum, q) => sum + q.minutes, 0);
    
    if (totalMinutes <= maxTotalMinutes) {
      log.push(`   ✅ No time adjustment needed (${totalMinutes}min <= ${maxTotalMinutes}min)`);
      return quests;
    }

    log.push(`   ⚠️  Time adjustment needed: ${totalMinutes}min → ${maxTotalMinutes}min`);
    
    let adjustedQuests = [...quests];
    
    // Strategy 1: Remove excessive quests if too many
    const minMinutesPerQuest = 15;
    const maxReasonableQuests = Math.floor(maxTotalMinutes / minMinutesPerQuest);
    
    if (adjustedQuests.length > maxReasonableQuests) {
      // Prioritize earlier quests (usually foundational)
      adjustedQuests = adjustedQuests.slice(0, maxReasonableQuests);
      log.push(`   🔄 Reduced quest count to ${maxReasonableQuests} (max reasonable for time budget)`);
    }
    
    // Strategy 2: Proportional scaling with minimum constraints
    const currentTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
    const scale = maxTotalMinutes / currentTotal;
    
    if (scale < 1) {
      adjustedQuests = adjustedQuests.map((quest, index) => {
        const newMinutes = Math.max(minMinutesPerQuest, Math.round(quest.minutes * scale));
        
        // Give slightly more time to first quest (foundational)
        const bonusTime = index === 0 ? Math.min(5, maxTotalMinutes - adjustedQuests.length * minMinutesPerQuest) : 0;
        
        return {
          ...quest,
          minutes: newMinutes + bonusTime
        };
      });
      
      // Final adjustment to exactly match budget
      const finalTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
      if (finalTotal !== maxTotalMinutes) {
        const diff = maxTotalMinutes - finalTotal;
        // Distribute the difference across quests
        adjustedQuests[0].minutes += diff;
      }
      
      log.push(`   📊 Applied proportional scaling (${scale.toFixed(2)}x) with ${minMinutesPerQuest}min minimum`);
    }
    
    const adjustedTotal = adjustedQuests.reduce((sum, q) => sum + q.minutes, 0);
    log.push(`   ✅ Adjusted to ${adjustedTotal}min (target: ${maxTotalMinutes}min)`);
    
    return adjustedQuests;
  }

  /**
   * 最終的な品質向上調整
   */
  private applyFinalEnhancements(
    quests: Quest[], 
    maxTotalMinutes: number,
    log: string[]
  ): Quest[] {
    let enhancedQuests = [...quests];
    
    // 1. 難易度バランスの調整
    enhancedQuests = this.balanceDifficulty(enhancedQuests, log);
    
    // 2. パターンの多様性確保
    enhancedQuests = this.ensurePatternDiversity(enhancedQuests, log);
    
    // 3. 最終時間チェック
    const finalTotal = enhancedQuests.reduce((sum, q) => sum + q.minutes, 0);
    if (finalTotal > maxTotalMinutes) {
      log.push(`   ⚠️  Final time adjustment: ${finalTotal}min → ${maxTotalMinutes}min`);
      enhancedQuests = this.preAdjustQuestTimes(enhancedQuests, maxTotalMinutes, log);
    }
    
    return enhancedQuests;
  }

  /**
   * 難易度バランス調整
   */
  private balanceDifficulty(quests: Quest[], log: string[]): Quest[] {
    if (quests.length <= 1) return quests;
    
    const avgDifficulty = quests.reduce((sum, q) => sum + q.difficulty, 0) / quests.length;
    const targetRange = { min: 0.2, max: 0.7 };
    let adjustmentCount = 0;
    
    const balancedQuests = quests.map((quest, index) => {
      let newDifficulty = quest.difficulty;
      
      // First quest should be easier to build confidence
      if (index === 0 && quest.difficulty > 0.5) {
        newDifficulty = Math.max(0.3, quest.difficulty - 0.15);
        adjustmentCount++;
      }
      
      // Ensure no quest is too extreme
      if (quest.difficulty < targetRange.min) {
        newDifficulty = targetRange.min;
        adjustmentCount++;
      } else if (quest.difficulty > targetRange.max) {
        newDifficulty = targetRange.max;
        adjustmentCount++;
      }
      
      // Progressive difficulty (slight increase)
      if (index > 0 && newDifficulty <= quests[index - 1].difficulty - 0.1) {
        newDifficulty = Math.min(targetRange.max, quests[index - 1].difficulty + 0.05);
        adjustmentCount++;
      }
      
      return newDifficulty !== quest.difficulty 
        ? { ...quest, difficulty: newDifficulty }
        : quest;
    });
    
    if (adjustmentCount > 0) {
      log.push(`   🎯 Balanced difficulty for ${adjustmentCount} quests`);
    }
    
    return balancedQuests;
  }

  /**
   * パターンの多様性確保
   */
  private ensurePatternDiversity(quests: Quest[], log: string[]): Quest[] {
    if (quests.length <= 1) return quests;
    
    const patternCounts: Record<Pattern, number> = {} as Record<Pattern, number>;
    let changesCount = 0;
    
    // Count pattern usage
    quests.forEach(q => {
      patternCounts[q.pattern] = (patternCounts[q.pattern] || 0) + 1;
    });
    
    // Alternative patterns for diversity
    const patternAlternatives: Record<Pattern, Pattern[]> = {
      "read_note_q": ["flashcards", "feynman"],
      "flashcards": ["read_note_q", "build_micro"],
      "build_micro": ["config_verify", "debug_explain"],
      "config_verify": ["build_micro", "past_paper"],
      "debug_explain": ["feynman", "socratic"],
      "feynman": ["socratic", "read_note_q"],
      "past_paper": ["flashcards", "config_verify"],
      "socratic": ["feynman", "debug_explain"],
      "shadowing": ["build_micro", "flashcards"],
      "retrospective": ["read_note_q", "feynman"]
    };
    
    // Fix consecutive duplicates
    const diverseQuests = quests.map((quest, index) => {
      if (index === 0) return quest;
      
      const prevQuest = quests[index - 1];
      if (quest.pattern === prevQuest.pattern) {
        const alternatives = patternAlternatives[quest.pattern] || ["read_note_q"];
        const newPattern = alternatives.find(alt => 
          index === quests.length - 1 || alt !== quests[index + 1]?.pattern
        ) || alternatives[0];
        
        changesCount++;
        return { ...quest, pattern: newPattern };
      }
      
      return quest;
    });
    
    if (changesCount > 0) {
      log.push(`   🌈 Enhanced pattern diversity (${changesCount} changes)`);
    }
    
    return diverseQuests;
  }

  /**
   * テスト実行とログ出力
   */
  async testQuestGeneration(
    goalText: string, 
    timeBudget: number, 
    motivation: "low" | "mid" | "high" = "mid"
  ): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Enhanced Quest Generation Test`);
    console.log(`Goal: ${goalText}`);
    console.log(`Time Budget: ${timeBudget}min`);
    console.log(`${'='.repeat(60)}`);

    // Initialize service if needed
    if (!advancedQuestService.isInitialized()) {
      const initialized = advancedQuestService.initialize();
      if (!initialized) {
        console.log('❌ Service initialization failed');
        return;
      }
    }

    // Create profile
    const profile = advancedQuestService.createBasicProfile({
      goalText,
      timeBudgetMin: timeBudget,
      motivation
    });

    try {
      const result = await this.generateOptimizedQuestsWithTimeConstraints({
        goalText,
        profile,
        currentLevelTags: [],
        priorityAreas: []
      });

      // Display results
      console.log('\n📊 Generation Results:');
      result.timeAdjustmentLog.forEach(log => console.log(log));

      console.log('\n🎮 Final Quests:');
      result.finalQuests.quests.forEach((quest, idx) => {
        console.log(`\n   Quest ${idx + 1}: ${quest.title}`);
        console.log(`   ├─ Pattern: ${quest.pattern}`);
        console.log(`   ├─ Duration: ${quest.minutes}min`);
        console.log(`   ├─ Difficulty: ${quest.difficulty}`);
        console.log(`   ├─ Deliverable: ${quest.deliverable}`);
        console.log(`   └─ Tags: ${quest.tags.join(', ')}`);
      });

      const totalTime = result.finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0);
      const efficiency = (totalTime / timeBudget * 100).toFixed(1);
      
      console.log(`\n✅ Success: ${result.finalQuests.quests.length} quests, ${totalTime}min (${efficiency}% of budget)`);

    } catch (error) {
      console.error(`❌ Test failed:`, error.message);
    }
  }
}

export const enhancedQuestService = new EnhancedQuestService();
export { EnhancedQuestService };
