/**
 * Few-shot RAG Retriever - Phase 4
 * 
 * Retrieves 3 most relevant exemplars by category for consistent AI generation
 * Improves prompt consistency and quality through example-based guidance
 */

import { z } from 'zod';

// Import fewshot examples (these would normally be loaded dynamically)
import programmingExamples from './fewshots/programming_examples.json';
import languageExamples from './fewshots/language_examples.json';
import creativeExamples from './fewshots/creative_examples.json';

// Schema for fewshot examples
const FewshotExampleSchema = z.object({
  id: z.string(),
  goal_text: z.string(),
  user_profile: z.object({
    learning_level: z.string(),
    time_budget_min_per_day: z.number(),
    preferred_study_times: z.array(z.string())
  }),
  generated_quests: z.array(z.object({
    title: z.string(),
    pattern: z.string(),
    minutes: z.number(),
    difficulty: z.number(),
    deliverable: z.string(),
    tags: z.array(z.string()),
    done_definition: z.string(),
    evidence: z.array(z.string()),
    alt_plan: z.string(),
    stop_rule: z.string()
  })),
  rationale: z.string()
});

const FewshotCategorySchema = z.object({
  category: z.string(),
  examples: z.array(FewshotExampleSchema)
});

type FewshotExample = z.infer<typeof FewshotExampleSchema>;
type FewshotCategory = z.infer<typeof FewshotCategorySchema>;

interface RetrievalContext {
  goalText: string;
  goalCategory: string;
  learningLevel?: string;
  timeBudget?: number;
  userPreferences?: Record<string, any>;
}

interface RetrievalResult {
  examples: FewshotExample[];
  categoryMatch: string;
  retrievalMetrics: {
    totalExamples: number;
    selectedCount: number;
    relevanceScores: number[];
    categoryFound: boolean;
  };
}

export class FewshotRetriever {
  private static categories: FewshotCategory[] = [
    programmingExamples as FewshotCategory,
    languageExamples as FewshotCategory,
    creativeExamples as FewshotCategory
  ];

  /**
   * Retrieve 3 most relevant examples for the given context
   */
  static retrieveExamples(context: RetrievalContext): RetrievalResult {
    console.log('🔍 Retrieving fewshot examples for:', context);

    // Step 1: Find category match
    const categoryMatches = this.findCategoryMatches(context.goalText, context.goalCategory);
    const selectedCategory = categoryMatches[0]; // Best match

    if (!selectedCategory) {
      console.warn('No category match found, using fallback');
      return this.getFallbackExamples(context);
    }

    console.log(`📚 Found category: ${selectedCategory.category}`);

    // Step 2: Score examples by relevance
    const scoredExamples = selectedCategory.examples.map(example => ({
      example,
      score: this.calculateRelevanceScore(example, context)
    }));

    // Step 3: Sort by score and take top 3
    scoredExamples.sort((a, b) => b.score - a.score);
    const topExamples = scoredExamples.slice(0, 3);

    const result: RetrievalResult = {
      examples: topExamples.map(item => item.example),
      categoryMatch: selectedCategory.category,
      retrievalMetrics: {
        totalExamples: selectedCategory.examples.length,
        selectedCount: topExamples.length,
        relevanceScores: topExamples.map(item => item.score),
        categoryFound: true
      }
    };

    console.log('✅ Retrieved examples:', {
      category: result.categoryMatch,
      count: result.examples.length,
      avgScore: result.retrievalMetrics.relevanceScores.reduce((a, b) => a + b, 0) / result.retrievalMetrics.relevanceScores.length
    });

    return result;
  }

  /**
   * Find matching categories based on goal text and category
   */
  private static findCategoryMatches(goalText: string, goalCategory: string): FewshotCategory[] {
    const matches: Array<{ category: FewshotCategory; score: number }> = [];

    for (const category of this.categories) {
      let score = 0;

      // Direct category match
      if (category.category === goalCategory) {
        score += 1.0;
      }

      // Goal text keyword matching
      const keywords = this.getKeywordsForCategory(category.category);
      const goalLower = goalText.toLowerCase();
      
      for (const keyword of keywords) {
        if (goalLower.includes(keyword)) {
          score += 0.3;
        }
      }

      if (score > 0) {
        matches.push({ category, score });
      }
    }

    // Sort by score and return categories
    matches.sort((a, b) => b.score - a.score);
    return matches.map(m => m.category);
  }

  /**
   * Calculate relevance score for an example
   */
  private static calculateRelevanceScore(example: FewshotExample, context: RetrievalContext): number {
    let score = 0;

    // Goal text similarity (basic keyword matching)
    const exampleKeywords = this.extractKeywords(example.goal_text);
    const contextKeywords = this.extractKeywords(context.goalText);
    const keywordOverlap = this.calculateKeywordOverlap(exampleKeywords, contextKeywords);
    score += keywordOverlap * 0.4;

    // Learning level match
    if (context.learningLevel && example.user_profile.learning_level === context.learningLevel) {
      score += 0.3;
    }

    // Time budget similarity
    if (context.timeBudget) {
      const timeDiff = Math.abs(example.user_profile.time_budget_min_per_day - context.timeBudget);
      const timeScore = Math.max(0, 1 - (timeDiff / 120)); // Penalize >2h difference
      score += timeScore * 0.2;
    }

    // Pattern diversity bonus (variety of learning patterns)
    const uniquePatterns = new Set(example.generated_quests.map(q => q.pattern)).size;
    const diversityBonus = Math.min(0.1, uniquePatterns * 0.02);
    score += diversityBonus;

    return Math.min(1.0, score);
  }

  /**
   * Extract keywords from text for matching
   */
  private static extractKeywords(text: string): string[] {
    const stopwords = new Set(['を', 'に', 'が', 'の', 'で', 'と', 'も', 'は', 'から', 'まで']);
    
    return text
      .toLowerCase()
      .split(/[\s、。！？]+/)
      .filter(word => word.length > 1 && !stopwords.has(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Calculate keyword overlap between two keyword sets
   */
  private static calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(k => set2.has(k)));
    
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get relevant keywords for a category
   */
  private static getKeywordsForCategory(category: string): string[] {
    const categoryKeywords: Record<string, string[]> = {
      programming: ['プログラミング', 'コード', 'アプリ', 'システム', 'web', 'api', 'react', 'python', 'javascript', 'node'],
      language: ['英語', '英会話', '言語', 'toeic', 'toefl', 'speaking', 'listening', 'reading', 'writing'],
      creative: ['イラスト', '写真', 'デザイン', '音楽', '作詞', '作曲', 'アート', '創作', '芸術'],
      business: ['ビジネス', '営業', '経営', 'マーケティング', '経営', '企画'],
      academic: ['資格', '試験', '学習', '勉強', '研究', '論文'],
      health: ['健康', 'フィットネス', '筋トレ', 'ダイエット', '運動', 'トレーニング'],
      skill: ['スキル', '技術', '能力', '技能', '習得']
    };

    return categoryKeywords[category] || [];
  }

  /**
   * Get fallback examples when no category match found
   */
  private static getFallbackExamples(context: RetrievalContext): RetrievalResult {
    // Use the first example from each category as fallback
    const fallbackExamples: FewshotExample[] = this.categories
      .map(cat => cat.examples[0])
      .filter(Boolean)
      .slice(0, 3);

    return {
      examples: fallbackExamples,
      categoryMatch: 'fallback',
      retrievalMetrics: {
        totalExamples: this.categories.reduce((sum, cat) => sum + cat.examples.length, 0),
        selectedCount: fallbackExamples.length,
        relevanceScores: [0.5, 0.5, 0.5], // Default relevance
        categoryFound: false
      }
    };
  }

  /**
   * Format examples for use in prompts
   */
  static formatExamplesForPrompt(examples: FewshotExample[]): string {
    return examples.map((example, index) => {
      const questsFormatted = example.generated_quests.map(quest => 
        `  - ${quest.title} (${quest.pattern}, ${quest.minutes}min, ${quest.deliverable})`
      ).join('\n');

      return `【例${index + 1}】
目標: "${example.goal_text}"
学習レベル: ${example.user_profile.learning_level}
時間予算: ${example.user_profile.time_budget_min_per_day}分/日

生成されたクエスト:
${questsFormatted}

理由: ${example.rationale}`;
    }).join('\n\n');
  }

  /**
   * Get template structure from examples
   */
  static extractTemplateStructure(examples: FewshotExample[]): {
    commonPatterns: string[];
    typicalQuestCount: number;
    averageSessionLength: number;
    requiredFields: string[];
  } {
    const allQuests = examples.flatMap(ex => ex.generated_quests);
    
    // Count pattern frequency
    const patternCounts = allQuests.reduce((counts, quest) => {
      counts[quest.pattern] = (counts[quest.pattern] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const commonPatterns = Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    const avgQuestCount = examples.reduce((sum, ex) => sum + ex.generated_quests.length, 0) / examples.length;
    const avgSessionLength = allQuests.reduce((sum, q) => sum + q.minutes, 0) / allQuests.length;

    return {
      commonPatterns,
      typicalQuestCount: Math.round(avgQuestCount),
      averageSessionLength: Math.round(avgSessionLength),
      requiredFields: ['done_definition', 'evidence', 'alt_plan', 'stop_rule']
    };
  }

  /**
   * Get all available categories
   */
  static getAvailableCategories(): string[] {
    return this.categories.map(cat => cat.category);
  }

  /**
   * Get category statistics
   */
  static getCategoryStats(): Record<string, { exampleCount: number; avgTimeBudget: number; commonLevels: string[] }> {
    const stats: Record<string, { exampleCount: number; avgTimeBudget: number; commonLevels: string[] }> = {};

    for (const category of this.categories) {
      const examples = category.examples;
      const avgTime = examples.reduce((sum, ex) => sum + ex.user_profile.time_budget_min_per_day, 0) / examples.length;
      const levels = [...new Set(examples.map(ex => ex.user_profile.learning_level))];

      stats[category.category] = {
        exampleCount: examples.length,
        avgTimeBudget: Math.round(avgTime),
        commonLevels: levels
      };
    }

    return stats;
  }
}