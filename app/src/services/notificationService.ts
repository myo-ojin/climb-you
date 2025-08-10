import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: string; // HH:MM format
  motivationalMessages: boolean;
  questCompletionCelebration: boolean;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  type: 'daily_reminder' | 'motivational' | 'celebration' | 'custom';
}

export class NotificationService {
  private static expoPushToken: string | null = null;
  private static hasPermission: boolean = false;

  // Initialize notification service
  static async initialize(): Promise<boolean> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('Notifications only work on physical devices');
        return false;
      }

      // Get existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        this.hasPermission = false;
        return false;
      }

      this.hasPermission = true;

      // Get push notification token
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'climb-you-beta',
        });
        this.expoPushToken = token.data;
        console.log('Expo push token:', this.expoPushToken);
      } catch (error) {
        console.log('Error getting push token:', error);
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3b82f6',
        });

        await Notifications.setNotificationChannelAsync('daily-reminders', {
          name: 'Daily Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10b981',
        });
      }

      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  // Check if notifications are available and permitted
  static async checkPermissions(): Promise<boolean> {
    if (!Device.isDevice) return false;

    const { status } = await Notifications.getPermissionsAsync();
    this.hasPermission = status === 'granted';
    return this.hasPermission;
  }

  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      throw new Error('通知機能は実機でのみ利用可能です');
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      
      if (!this.hasPermission) {
        throw new Error('通知の許可が得られませんでした');
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      throw error;
    }
  }

  // Schedule daily reminder notification
  static async scheduleDailyReminder(
    time: string = '09:00', // Default 9:00 AM
    message?: string
  ): Promise<string> {
    if (!this.hasPermission) {
      throw new Error('通知の許可が必要です');
    }

    try {
      // Cancel existing daily reminder
      await this.cancelDailyReminder();

      const [hours, minutes] = time.split(':').map(Number);
      
      const defaultMessages = [
        '🏔️ おはようございます！今日も山を登る準備はできていますか？',
        '✨ 新しい一日の始まりです！今日のクエストを確認しましょう！',
        '🚀 今日も成長する絶好のチャンス！クエストを見てみましょう！',
        '🎯 目標に向かって進む時間です！今日のタスクを確認しましょう！',
        '💪 継続は力なり！今日のクエストで一歩前進しましょう！'
      ];

      const finalMessage = message || defaultMessages[Math.floor(Math.random() * defaultMessages.length)];

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Climb You - 今日のクエスト',
          body: finalMessage,
          sound: true,
          priority: Notifications.AndroidImportance.HIGH as any,
        },
        trigger: {
          type: 'daily',
          hour: hours,
          minute: minutes,
          repeats: true,
        } as any,
      });

      console.log('Daily reminder scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling daily reminder:', error);
      throw new Error('日次リマインダーの設定に失敗しました');
    }
  }

  // Cancel daily reminder
  static async cancelDailyReminder(): Promise<void> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const dailyReminders = scheduledNotifications.filter(
        notification => notification.content.title?.includes('今日のクエスト')
      );

      for (const reminder of dailyReminders) {
        await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
      }

      console.log('Daily reminders cancelled');
    } catch (error) {
      console.error('Error cancelling daily reminder:', error);
    }
  }

  // Send immediate notification (for testing)
  static async sendImmediateNotification(
    title: string,
    body: string,
    type: 'celebration' | 'motivational' | 'custom' = 'custom'
  ): Promise<string> {
    if (!this.hasPermission) {
      throw new Error('通知の許可が必要です');
    }

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidImportance.HIGH as any,
          categoryIdentifier: type,
        },
        trigger: null, // Send immediately
      });

      console.log('Immediate notification sent:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      throw new Error('通知の送信に失敗しました');
    }
  }

  // Schedule quest completion celebration
  static async scheduleQuestCompletionCelebration(questTitle: string): Promise<string> {
    const celebrationMessages = [
      `🎉 "${questTitle}" を完了しました！素晴らしいです！`,
      `✨ クエスト達成おめでとうございます！一歩前進しました！`,
      `🏆 "${questTitle}" クリア！継続は力なりです！`,
      `🚀 また一つ成長しましたね！次のクエストも頑張りましょう！`,
      `💪 "${questTitle}" 完了！山頂に向かって着実に登っています！`
    ];

    const message = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];

    return this.sendImmediateNotification(
      'クエスト完了！',
      message,
      'celebration'
    );
  }

  // Get all scheduled notifications
  static async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      
      return notifications.map(notification => ({
        id: notification.identifier,
        title: notification.content.title || '',
        body: notification.content.body || '',
        scheduledTime: new Date(notification.trigger ? (notification.trigger as any).value || Date.now() : Date.now()),
        type: this.getNotificationType(notification.content.title || ''),
      }));
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Cancel specific notification
  static async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Notification cancelled:', identifier);
    } catch (error) {
      console.error('Error cancelling notification:', error);
      throw new Error('通知のキャンセルに失敗しました');
    }
  }

  // Cancel all notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
      throw new Error('全通知のキャンセルに失敗しました');
    }
  }

  // Test notification functionality
  static async testNotification(): Promise<void> {
    if (!this.hasPermission) {
      throw new Error('通知の許可が必要です');
    }

    await this.sendImmediateNotification(
      'Climb You - テスト通知',
      'この通知が表示されれば、通知機能が正常に動作しています！🎉',
      'custom'
    );
  }

  // Get notification settings
  static getNotificationSettings(): NotificationSettings {
    // In a real app, these would be stored in AsyncStorage or user preferences
    return {
      enabled: this.hasPermission,
      dailyReminder: true,
      reminderTime: '09:00',
      motivationalMessages: true,
      questCompletionCelebration: true,
    };
  }

  // Helper method to determine notification type
  private static getNotificationType(title: string): ScheduledNotification['type'] {
    if (title.includes('今日のクエスト')) return 'daily_reminder';
    if (title.includes('完了')) return 'celebration';
    if (title.includes('応援') || title.includes('頑張')) return 'motivational';
    return 'custom';
  }

  // Get push token for server-side notifications (future use)
  static getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Check if service is properly initialized
  static isInitialized(): boolean {
    return this.hasPermission;
  }
}