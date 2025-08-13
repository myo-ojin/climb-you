import OpenAI from 'openai';
import { 
  OpenAIError, 
  OpenAIServiceConfig, 
  OpenAIMessage,
  OpenAICompletion,
  OpenAICompletionSchema 
} from '../types/openai';
import { SecureStorageService } from './secureStorage';

export class OpenAIService {
  private client: OpenAI | null = null;
  private config: OpenAIServiceConfig;
  private usageStats: {
    requestCount: number;
    tokenCount: number;
    lastResetDate: string;
  };

  constructor() {
    this.config = {
      apiKey: '',
      model: 'gpt-4o-mini', // Cost-effective model for MVP
      maxTokens: 1000,
      temperature: 0.7,
    };
    
    // Initialize usage stats
    this.usageStats = {
      requestCount: 0,
      tokenCount: 0,
      lastResetDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    };
    
    // Load saved stats
    this.loadUsageStats();
  }

  /**
   * Initialize OpenAI client with API key
   */
  async initialize(): Promise<void> {
    try {
      const apiKey = await SecureStorageService.getOpenAIApiKey();
      this.config.apiKey = apiKey;
      
      this.client = new OpenAI({
        apiKey: apiKey,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.client !== null && Boolean(this.config.apiKey);
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'user', content: 'Hello! Please respond with "OK" to test the connection.' }
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const result = OpenAICompletionSchema.parse(response);
      const content = result.choices[0]?.message?.content?.toLowerCase();
      
      return content?.includes('ok') ?? false;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send chat completion request
   */
  async chatCompletion(
    messages: OpenAIMessage[], 
    options?: Partial<OpenAIServiceConfig>
  ): Promise<string> {
    try {
      if (!this.isInitialized()) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const requestConfig = { ...this.config, ...options };

      const response = await this.client.chat.completions.create({
        model: requestConfig.model,
        messages: messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content || ''
        })),
        max_tokens: requestConfig.maxTokens,
        temperature: requestConfig.temperature,
      });

      const result = OpenAICompletionSchema.parse(response);
      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Record usage stats
      if (result.usage) {
        this.recordUsage(result.usage.total_tokens);
      }

      return content;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate structured response with retry logic
   */
  async generateStructuredResponse<T>(
    messages: OpenAIMessage[],
    schema: any,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: OpenAIError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.chatCompletion(messages);
        
        // Try to parse JSON response
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(response);
        } catch {
          // If not JSON, wrap in object
          parsedResponse = { response };
        }

        // Validate against schema
        return schema.parse(parsedResponse);
      } catch (error) {
        lastError = this.handleError(error);
        
        // Don't retry for certain error types
        if (lastError.type === 'rate_limit' || lastError.type === 'api') {
          throw lastError;
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(1000 * (attempt + 1));
        }
      }
    }

    throw lastError || new Error('Unknown error in structured response generation');
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): { requestCount: number; tokenCount: number; lastResetDate: string } {
    // Reset daily stats if new day
    this.resetDailyStatsIfNeeded();
    return {
      requestCount: this.usageStats.requestCount,
      tokenCount: this.usageStats.tokenCount,
      lastResetDate: this.usageStats.lastResetDate
    };
  }

  /**
   * Load usage stats from storage
   */
  private async loadUsageStats(): Promise<void> {
    try {
      const savedStats = await SecureStorageService.getUsageStats();
      if (savedStats) {
        this.usageStats = {
          ...savedStats,
          lastResetDate: savedStats.lastResetDate || new Date().toISOString().split('T')[0]
        };
        this.resetDailyStatsIfNeeded();
      }
    } catch (error) {
      console.warn('Failed to load usage stats:', error);
    }
  }

  /**
   * Save usage stats to storage
   */
  private async saveUsageStats(): Promise<void> {
    try {
      await SecureStorageService.setUsageStats(this.usageStats);
    } catch (error) {
      console.warn('Failed to save usage stats:', error);
    }
  }

  /**
   * Reset daily stats if it's a new day
   */
  private resetDailyStatsIfNeeded(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.usageStats.lastResetDate !== today) {
      this.usageStats.requestCount = 0;
      this.usageStats.tokenCount = 0;
      this.usageStats.lastResetDate = today;
      this.saveUsageStats(); // Don't await to avoid blocking
    }
  }

  /**
   * Record API usage
   */
  private recordUsage(tokenCount: number): void {
    this.usageStats.requestCount += 1;
    this.usageStats.tokenCount += tokenCount;
    this.saveUsageStats(); // Don't await to avoid blocking
  }

  /**
   * Update service configuration
   */
  updateConfig(newConfig: Partial<OpenAIServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: any): OpenAIError {
    if (error instanceof Error) {
      // OpenAI API specific errors
      if ('status' in error) {
        const status = error.status as number;
        
        if (status === 429) {
          return {
            type: 'rate_limit',
            message: 'Rate limit exceeded',
            statusCode: status,
            retryAfter: this.extractRetryAfter(error),
          };
        }
        
        if (status >= 400 && status < 500) {
          return {
            type: 'api',
            message: `API error: ${error.message}`,
            statusCode: status,
          };
        }
        
        if (status >= 500) {
          return {
            type: 'network',
            message: `Server error: ${error.message}`,
            statusCode: status,
          };
        }
      }

      // Network errors
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return {
          type: 'network',
          message: 'Network connection error',
        };
      }

      // Validation errors
      if (error.name === 'ZodError') {
        return {
          type: 'validation',
          message: 'Response validation failed',
        };
      }

      return {
        type: 'unknown',
        message: error.message,
      };
    }

    return {
      type: 'unknown',
      message: 'Unknown error occurred',
    };
  }

  /**
   * Extract retry-after header from rate limit error
   */
  private extractRetryAfter(error: any): number | undefined {
    try {
      if (error.headers && error.headers['retry-after']) {
        return parseInt(error.headers['retry-after'], 10);
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}