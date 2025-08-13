import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Secure Storage Keys
const OPENAI_API_KEY = 'openai_api_key';
const USAGE_STATS_KEY = 'openai_usage_stats';

export class SecureStorageService {
  /**
   * Store OpenAI API key securely
   */
  static async setOpenAIApiKey(apiKey: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(OPENAI_API_KEY, apiKey);
    } catch (error) {
      throw new Error(`Failed to store API key: ${error}`);
    }
  }

  /**
   * Retrieve OpenAI API key from secure storage or environment
   */
  static async getOpenAIApiKey(): Promise<string> {
    try {
      // First try to get from secure storage
      const storedKey = await SecureStore.getItemAsync(OPENAI_API_KEY);
      if (storedKey) {
        return storedKey;
      }

      // Fallback to environment variable for development
      const envKey = Constants.expoConfig?.extra?.openaiApiKey;
      if (envKey) {
        return envKey;
      }

      throw new Error('OpenAI API key not found');
    } catch (error) {
      throw new Error(`Failed to retrieve API key: ${error}`);
    }
  }

  /**
   * Check if OpenAI API key exists
   */
  static async hasOpenAIApiKey(): Promise<boolean> {
    try {
      const apiKey = await this.getOpenAIApiKey();
      return Boolean(apiKey);
    } catch {
      return false;
    }
  }

  /**
   * Remove OpenAI API key from secure storage
   */
  static async removeOpenAIApiKey(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(OPENAI_API_KEY);
    } catch (error) {
      throw new Error(`Failed to remove API key: ${error}`);
    }
  }

  /**
   * Validate API key format
   */
  static validateApiKey(apiKey: string): boolean {
    // OpenAI API keys start with 'sk-' and are typically 51 characters long
    return /^sk-[A-Za-z0-9]{48}$/.test(apiKey);
  }

  /**
   * Store OpenAI usage stats securely
   */
  static async setUsageStats(stats: {
    requestCount: number;
    tokenCount: number;
    lastResetDate: string;
  }): Promise<void> {
    try {
      await SecureStore.setItemAsync(USAGE_STATS_KEY, JSON.stringify(stats));
    } catch (error) {
      throw new Error(`Failed to store usage stats: ${error}`);
    }
  }

  /**
   * Retrieve OpenAI usage stats from secure storage
   */
  static async getUsageStats(): Promise<{
    requestCount: number;
    tokenCount: number;
    lastResetDate: string;
  } | null> {
    try {
      const statsJson = await SecureStore.getItemAsync(USAGE_STATS_KEY);
      if (statsJson) {
        return JSON.parse(statsJson);
      }
      return null;
    } catch (error) {
      console.warn('Failed to retrieve usage stats:', error);
      return null;
    }
  }
}