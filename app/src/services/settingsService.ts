import { 
  UserSettings, 
  SettingsUpdate, 
  SettingsError,
  UserSettingsSchema,
  DEFAULT_USER_SETTINGS 
} from '../types/settings';
import { FirestoreService } from './firestore';

export class SettingsService {
  
  /**
   * Get user settings, create default if not exists
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const settingsPath = `users/${userId}/settings`;
      const settingsDoc = await FirestoreService.get(settingsPath, 'preferences');
      
      if (!settingsDoc) {
        // Create default settings
        const defaultSettings: UserSettings = {
          id: 'preferences',
          userId,
          ...DEFAULT_USER_SETTINGS,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await this.saveUserSettings(userId, defaultSettings);
        return defaultSettings;
      }

      // Validate and return existing settings
      const settings = {
        ...settingsDoc,
        createdAt: new Date(settingsDoc.createdAt),
        updatedAt: new Date(settingsDoc.updatedAt),
      };

      return UserSettingsSchema.parse(settings);
    } catch (error) {
      throw this.handleError(error, 'getUserSettings');
    }
  }

  /**
   * Save user settings
   */
  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      const settingsPath = `users/${userId}/settings`;
      const settingsToSave = {
        ...settings,
        updatedAt: new Date().toISOString(),
        createdAt: settings.createdAt.toISOString(),
      };

      await FirestoreService.set(settingsPath, 'preferences', settingsToSave);
    } catch (error) {
      throw this.handleError(error, 'saveUserSettings');
    }
  }

  /**
   * Update specific settings
   */
  async updateSettings(userId: string, updates: SettingsUpdate): Promise<UserSettings> {
    try {
      const currentSettings = await this.getUserSettings(userId);
      
      // Deep merge updates
      const updatedSettings: UserSettings = {
        ...currentSettings,
        ...updates,
        notifications: {
          ...currentSettings.notifications,
          ...updates.notifications,
          dailyReminder: {
            ...currentSettings.notifications.dailyReminder,
            ...updates.notifications?.dailyReminder,
          },
          questCompletion: {
            ...currentSettings.notifications.questCompletion,
            ...updates.notifications?.questCompletion,
          },
          weeklyReport: {
            ...currentSettings.notifications.weeklyReport,
            ...updates.notifications?.weeklyReport,
          },
        },
        appearance: {
          ...currentSettings.appearance,
          ...updates.appearance,
        },
        privacy: {
          ...currentSettings.privacy,
          ...updates.privacy,
        },
        updatedAt: new Date(),
      };

      await this.saveUserSettings(userId, updatedSettings);
      return updatedSettings;
    } catch (error) {
      throw this.handleError(error, 'updateSettings');
    }
  }

  /**
   * Toggle notification settings
   */
  async toggleNotifications(userId: string, enabled: boolean): Promise<UserSettings> {
    return this.updateSettings(userId, {
      notifications: { enabled }
    });
  }

  /**
   * Update daily reminder settings
   */
  async updateDailyReminder(
    userId: string, 
    enabled: boolean, 
    time?: string
  ): Promise<UserSettings> {
    const updates: SettingsUpdate = {
      notifications: {
        dailyReminder: { enabled, ...(time && { time }) }
      }
    };
    
    return this.updateSettings(userId, updates);
  }

  /**
   * Update theme setting
   */
  async updateTheme(
    userId: string, 
    theme: 'light' | 'dark' | 'system'
  ): Promise<UserSettings> {
    return this.updateSettings(userId, {
      appearance: { theme }
    });
  }

  /**
   * Update language setting
   */
  async updateLanguage(
    userId: string, 
    language: 'ja' | 'en'
  ): Promise<UserSettings> {
    return this.updateSettings(userId, {
      appearance: { language }
    });
  }

  /**
   * Reset settings to default
   */
  async resetToDefaults(userId: string): Promise<UserSettings> {
    try {
      const defaultSettings: UserSettings = {
        id: 'preferences',
        userId,
        ...DEFAULT_USER_SETTINGS,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await this.saveUserSettings(userId, defaultSettings);
      return defaultSettings;
    } catch (error) {
      throw this.handleError(error, 'resetToDefaults');
    }
  }

  /**
   * Delete user settings (for account deletion)
   */
  async deleteUserSettings(userId: string): Promise<void> {
    try {
      const settingsPath = `users/${userId}/settings`;
      await FirestoreService.delete(settingsPath, 'preferences');
    } catch (error) {
      throw this.handleError(error, 'deleteUserSettings');
    }
  }

  /**
   * Export user settings for backup
   */
  async exportSettings(userId: string): Promise<string> {
    try {
      const settings = await this.getUserSettings(userId);
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      throw this.handleError(error, 'exportSettings');
    }
  }

  /**
   * Import user settings from backup
   */
  async importSettings(userId: string, settingsJson: string): Promise<UserSettings> {
    try {
      const parsedSettings = JSON.parse(settingsJson);
      
      // Validate imported settings
      const settings = UserSettingsSchema.parse({
        ...parsedSettings,
        id: 'preferences',
        userId,
        updatedAt: new Date(),
        createdAt: new Date(parsedSettings.createdAt || new Date()),
      });

      await this.saveUserSettings(userId, settings);
      return settings;
    } catch (error) {
      throw this.handleError(error, 'importSettings');
    }
  }

  /**
   * Get notification permission status (placeholder for native implementation)
   */
  async getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'default'> {
    try {
      // In a real app, this would check native permissions
      // For MVP, we'll simulate permission status
      return 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return 'default';
    }
  }

  /**
   * Request notification permissions (placeholder for native implementation)
   */
  async requestNotificationPermissions(): Promise<boolean> {
    try {
      // In a real app, this would request native permissions
      // For MVP, we'll simulate permission request
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Handle and categorize errors
   */
  private handleError(error: any, operation: string): SettingsError {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return {
          type: 'load',
          message: `Settings not found: ${error.message}`,
        };
      }

      if (error.message.includes('Firestore') || error.message.includes('Firebase')) {
        return {
          type: 'network',
          message: `Database error in ${operation}: ${error.message}`,
        };
      }

      if (error.message.includes('validation') || error.message.includes('schema')) {
        return {
          type: 'validation',
          message: `Settings validation error: ${error.message}`,
        };
      }

      if (error.message.includes('permission')) {
        return {
          type: 'save',
          message: `Permission error in ${operation}: ${error.message}`,
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