import { 
  Quest, 
  QuestInput,
  DailyQuestCollection, 
  QuestGenerationRequest, 
  AIQuestGenerationResponse, 
  QuestError,
  QuestGenerationContext,
  AIQuestGenerationResponseSchema 
} from '../types/quest';
import { OpenAIService } from './openaiService';
import { FirestoreService } from './firestore';
import { QuestPrompts } from '../ai/questPrompts';
import { OpenAIMessage } from '../types/openai';

export class QuestService {
  private openaiService: OpenAIService;
  private firestoreService: FirestoreService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.firestoreService = new FirestoreService();
  }

  /**
   * Generate daily quests for a user
   */
  async generateDailyQuests(request: QuestGenerationRequest): Promise<DailyQuestCollection> {
    try {
      // Ensure OpenAI service is initialized
      if (!this.openaiService.isInitialized()) {
        await this.openaiService.initialize();
      }

      // Generate AI response
      const aiResponse = await this.generateQuestsWithAI(request);

      // Create quest objects with IDs and metadata
      const quests: Quest[] = aiResponse.quests.map((questInput, index) => ({
        ...questInput,
        id: this.generateQuestId(request.userId, index),
        userId: request.userId,
        status: 'pending' as const,
        createdAt: new Date(),
      }));

      // Create daily quest collection
      const dailyCollection: DailyQuestCollection = {
        id: this.generateDailyCollectionId(request.userId),
        userId: request.userId,
        date: this.getTodayDateString(),
        quests,
        totalEstimatedTime: aiResponse.totalEstimatedTime,
        aiGeneratedMessage: aiResponse.dailyMessage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return dailyCollection;
    } catch (error) {
      throw this.handleError(error, 'generateDailyQuests');
    }
  }

  /**
   * Generate quests using OpenAI API
   */
  private async generateQuestsWithAI(
    request: QuestGenerationRequest, 
    retryCount: number = 0
  ): Promise<AIQuestGenerationResponse> {
    const maxRetries = 2;

    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: QuestPrompts.getSystemPrompt(),
        },
        {
          role: 'user',
          content: QuestPrompts.getUserPrompt(request),
        },
      ];

      // Use structured response generation with validation
      const response = await this.openaiService.generateStructuredResponse<AIQuestGenerationResponse>(
        messages,
        AIQuestGenerationResponseSchema,
        maxRetries
      );

      // Additional validation
      this.validateGeneratedQuests(response, request);

      return response;
    } catch (error) {
      if (retryCount < maxRetries) {
        // Generate refinement prompt for retry
        const refinementPrompt = QuestPrompts.getRefinementPrompt(
          QuestPrompts.getUserPrompt(request),
          `Attempt ${retryCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          retryCount + 1
        );

        const messages: OpenAIMessage[] = [
          {
            role: 'system',
            content: QuestPrompts.getSystemPrompt(),
          },
          {
            role: 'user',
            content: refinementPrompt,
          },
        ];

        try {
          const response = await this.openaiService.generateStructuredResponse<AIQuestGenerationResponse>(
            messages,
            AIQuestGenerationResponseSchema
          );

          this.validateGeneratedQuests(response, request);
          return response;
        } catch (retryError) {
          return this.generateQuestsWithAI(request, retryCount + 1);
        }
      }

      throw error;
    }
  }

  /**
   * Validate generated quests against requirements
   */
  private validateGeneratedQuests(
    response: AIQuestGenerationResponse, 
    request: QuestGenerationRequest
  ): void {
    const { quests, totalEstimatedTime } = response;

    // Check quest count
    if (quests.length !== request.questCount) {
      throw new Error(`Expected ${request.questCount} quests, got ${quests.length}`);
    }

    // Check total time constraint
    if (totalEstimatedTime > request.userProfile.availableTimeMinutes) {
      throw new Error(
        `Total estimated time (${totalEstimatedTime}min) exceeds available time (${request.userProfile.availableTimeMinutes}min)`
      );
    }

    // Check individual quest time constraints
    quests.forEach((quest, index) => {
      if (quest.estimatedTimeMinutes < 5 || quest.estimatedTimeMinutes > 240) {
        throw new Error(`Quest ${index + 1} has invalid estimated time: ${quest.estimatedTimeMinutes}min`);
      }

      if (quest.instructions.length === 0 || quest.instructions.length > 10) {
        throw new Error(`Quest ${index + 1} has invalid instructions count: ${quest.instructions.length}`);
      }

      if (quest.successCriteria.length === 0 || quest.successCriteria.length > 5) {
        throw new Error(`Quest ${index + 1} has invalid success criteria count: ${quest.successCriteria.length}`);
      }
    });
  }

  /**
   * Save daily quest collection to Firestore
   */
  async saveDailyQuests(collection: DailyQuestCollection): Promise<void> {
    try {
      const collectionPath = `users/${collection.userId}/dailyQuests`;
      await this.firestoreService.setDocument(collectionPath, collection.id, {
        ...collection,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
        quests: collection.quests.map(quest => ({
          ...quest,
          createdAt: quest.createdAt.toISOString(),
          completedAt: quest.completedAt?.toISOString(),
        })),
      });
    } catch (error) {
      throw this.handleError(error, 'saveDailyQuests');
    }
  }

  /**
   * Get daily quests for a specific date
   */
  async getDailyQuests(userId: string, date?: string): Promise<DailyQuestCollection | null> {
    try {
      const targetDate = date || this.getTodayDateString();
      const collectionPath = `users/${userId}/dailyQuests`;
      
      // Query by date using static method
      const results = await FirestoreService.queryDocuments(collectionPath, [
        { field: 'date', operator: '==', value: targetDate }
      ]);

      if (results.length === 0) {
        return null;
      }

      const data = results[0];
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        quests: data.quests.map((quest: any) => ({
          ...quest,
          createdAt: new Date(quest.createdAt),
          completedAt: quest.completedAt ? new Date(quest.completedAt) : undefined,
        })),
      } as DailyQuestCollection;
    } catch (error) {
      throw this.handleError(error, 'getDailyQuests');
    }
  }

  /**
   * Update quest status
   */
  async updateQuestStatus(
    userId: string, 
    questId: string, 
    status: Quest['status'],
    completionNotes?: string
  ): Promise<void> {
    try {
      const today = this.getTodayDateString();
      const collection = await this.getDailyQuests(userId, today);
      
      if (!collection) {
        throw new Error('No daily quests found for today');
      }

      const questIndex = collection.quests.findIndex(q => q.id === questId);
      if (questIndex === -1) {
        throw new Error(`Quest ${questId} not found`);
      }

      // Update quest
      collection.quests[questIndex].status = status;
      if (status === 'completed') {
        collection.quests[questIndex].completedAt = new Date();
      }

      collection.updatedAt = new Date();

      // Save updated collection
      await this.saveDailyQuests(collection);
    } catch (error) {
      throw this.handleError(error, 'updateQuestStatus');
    }
  }

  /**
   * Generate adaptive quests based on user performance
   */
  async generateAdaptiveQuests(
    baseRequest: QuestGenerationRequest,
    performanceData: {
      completionRate: number;
      averageTimeSpent: number;
      strugglingCategories: string[];
      successfulCategories: string[];
    }
  ): Promise<DailyQuestCollection> {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: QuestPrompts.getSystemPrompt(),
        },
        {
          role: 'user',
          content: QuestPrompts.getAdaptationPrompt(baseRequest, performanceData),
        },
      ];

      const aiResponse = await this.openaiService.generateStructuredResponse<AIQuestGenerationResponse>(
        messages,
        AIQuestGenerationResponseSchema
      );

      const quests: Quest[] = aiResponse.quests.map((questInput, index) => ({
        ...questInput,
        id: this.generateQuestId(baseRequest.userId, index),
        userId: baseRequest.userId,
        status: 'pending' as const,
        createdAt: new Date(),
      }));

      const dailyCollection: DailyQuestCollection = {
        id: this.generateDailyCollectionId(baseRequest.userId),
        userId: baseRequest.userId,
        date: this.getTodayDateString(),
        quests,
        totalEstimatedTime: aiResponse.totalEstimatedTime,
        aiGeneratedMessage: aiResponse.dailyMessage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return dailyCollection;
    } catch (error) {
      throw this.handleError(error, 'generateAdaptiveQuests');
    }
  }

  /**
   * Get quest statistics for a user
   */
  async getQuestStats(userId: string, days: number = 7): Promise<any> {
    try {
      // This would normally query the last N days of quest data
      // For MVP, we'll return a simplified stats object
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      // In a full implementation, we would query Firestore for this data
      return {
        totalQuests: 0,
        completedQuests: 0,
        completionRate: 0,
        averageTimeSpent: 0,
        favoriteCategory: 'learning',
        currentStreak: 0,
        longestStreak: 0,
        totalTimeSpent: 0,
      };
    } catch (error) {
      throw this.handleError(error, 'getQuestStats');
    }
  }

  /**
   * Generate quest ID
   */
  private generateQuestId(userId: string, index: number): string {
    const date = this.getTodayDateString();
    const timestamp = Date.now();
    return `${userId}_${date}_quest_${index}_${timestamp}`;
  }

  /**
   * Generate daily collection ID
   */
  private generateDailyCollectionId(userId: string): string {
    const date = this.getTodayDateString();
    return `${userId}_${date}`;
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Handle and categorize quest service errors
   */
  private handleError(error: any, operation: string): QuestError {
    if (error instanceof Error) {
      // OpenAI related errors
      if (error.message.includes('OpenAI') || error.message.includes('API')) {
        return {
          type: 'generation',
          message: `AI quest generation failed: ${error.message}`,
        };
      }

      // Validation errors
      if (error.message.includes('validation') || error.message.includes('schema') || error.message.includes('Expected')) {
        return {
          type: 'validation',
          message: `Quest validation failed: ${error.message}`,
        };
      }

      // Storage errors
      if (error.message.includes('Firestore') || error.message.includes('storage')) {
        return {
          type: 'storage',
          message: `Quest storage failed: ${error.message}`,
        };
      }

      // Network errors
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return {
          type: 'network',
          message: `Network error in ${operation}: ${error.message}`,
        };
      }

      return {
        type: 'unknown',
        message: `${operation} failed: ${error.message}`,
      };
    }

    return {
      type: 'unknown',
      message: `Unknown error in ${operation}`,
    };
  }
}