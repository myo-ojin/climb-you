import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsService } from '../../services/settingsService';
import { UserSettings, AppInfo } from '../../types/settings';
import { NotificationService } from '../../services/notificationService';
import Constants from 'expo-constants';

const settingsService = new SettingsService();

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // App info for version display
  const appInfo: AppInfo = {
    version: Constants.expoConfig?.version || '1.0.0',
    buildNumber: Constants.expoConfig?.extra?.buildNumber || '1',
    releaseDate: '2025-08-04',
    platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web',
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userSettings = await settingsService.getUserSettings(user.id);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('エラー', '設定の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (updateFn: () => Promise<UserSettings>) => {
    if (!user || updating) return;

    try {
      setUpdating(true);
      const updatedSettings = await updateFn();
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('エラー', '設定の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user) return;

    try {
      setUpdating(true);
      
      if (enabled) {
        // Check and request notification permissions
        const hasPermission = await NotificationService.checkPermissions();
        if (!hasPermission) {
          const permissionGranted = await NotificationService.requestPermissions();
          if (!permissionGranted) {
            Alert.alert(
              '通知許可が必要です',
              'アプリの設定から通知を許可してください。'
            );
            setUpdating(false);
            return;
          }
        }

        // Initialize notification service if enabling
        await NotificationService.initialize();
        
        // Schedule daily reminder
        try {
          await NotificationService.scheduleDailyReminder('09:00');
          console.log('Daily reminder scheduled when enabling notifications');
        } catch (error) {
          console.log('Failed to schedule daily reminder:', error);
        }
      } else {
        // Cancel all notifications when disabling
        try {
          await NotificationService.cancelAllNotifications();
          console.log('All notifications cancelled when disabling');
        } catch (error) {
          console.log('Failed to cancel notifications:', error);
        }
      }

      // Update settings in Firebase
      const updatedSettings = await settingsService.toggleNotifications(user.id, enabled);
      setSettings(updatedSettings);

      Alert.alert(
        '通知設定更新',
        enabled 
          ? '通知が有効になりました。毎朝9時にリマインダーをお送りします。' 
          : '通知が無効になりました。'
      );
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('エラー', '通知設定の更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('エラー', 'ログアウトに失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleProfileReset = () => {
    Alert.alert(
      'プロファイル再設定',
      'プロファイリングをやり直しますか？これにより現在の学習データは保持されますが、AI分析結果が更新されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '再設定する',
          onPress: () => {
            // For MVP, show a dialog with instructions to access profiling
            Alert.alert(
              'プロファイル再設定',
              '現在、プロファイル再設定は初回セットアップ時のみ利用可能です。\n\n再設定が必要な場合は、アプリを再インストールしてください。',
              [{ text: 'OK' }]
            );
            
            // TODO: Implement proper modal navigation to ProfilingScreen
            // navigation.navigate('ProfileSetup' as never);
          },
        },
      ]
    );
  };

  const handleDataExport = async () => {
    if (!user) return;

    try {
      const exportData = await settingsService.exportSettings(user.id);
      // In a real app, this would save to device or share
      Alert.alert(
        'データエクスポート',
        '設定データをエクスポートしました。\n\n（実際のアプリでは、ファイルとして保存または共有されます）',
        [{ text: 'OK' }]
      );
      console.log('Exported settings:', exportData);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('エラー', 'データのエクスポートに失敗しました');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-600">設定を読み込み中...</Text>
      </View>
    );
  }

  if (!settings || !user) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-600">設定の読み込みに失敗しました</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-8 border-b border-gray-200">
        <Text className="text-2xl font-bold text-gray-900 mb-2">設定</Text>
        <Text className="text-gray-600">
          {user.displayName || user.email}
        </Text>
      </View>

      {/* Profile Section */}
      <View className="mt-6">
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-6 mb-3">
          プロファイル
        </Text>
        
        <View className="bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={handleProfileReset}
            className="px-6 py-4 flex-row items-center justify-between"
            disabled={updating}
          >
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">🧠</Text>
              <View>
                <Text className="text-base font-medium text-gray-900">
                  プロファイル再設定
                </Text>
                <Text className="text-sm text-gray-500">
                  学習スタイル診断をやり直す
                </Text>
              </View>
            </View>
            <Text className="text-blue-500 text-sm">→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Section */}
      <View className="mt-6">
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-6 mb-3">
          通知
        </Text>
        
        <View className="bg-white border-b border-gray-200">
          <View className="px-6 py-4 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Text className="text-2xl mr-3">🔔</Text>
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">
                  プッシュ通知
                </Text>
                <Text className="text-sm text-gray-500">
                  クエストのリマインダーや完了通知
                </Text>
              </View>
            </View>
            <Switch
              value={settings.notifications.enabled}
              onValueChange={handleNotificationToggle}
              disabled={updating}
            />
          </View>

          {/* Notification Test Button - Only show when notifications are enabled */}
          {settings.notifications.enabled && (
            <View className="px-6 py-3 border-t border-gray-100">
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await NotificationService.testNotification();
                    Alert.alert('テスト通知送信', 'テスト通知を送信しました！');
                  } catch (error) {
                    Alert.alert('エラー', '通知の送信に失敗しました。');
                  }
                }}
                className="bg-purple-50 px-4 py-3 rounded-lg"
                disabled={updating}
              >
                <View className="flex-row items-center justify-center">
                  <Text className="text-purple-600 font-medium mr-2">🔔</Text>
                  <Text className="text-purple-600 font-medium">テスト通知を送信</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Account Section */}
      <View className="mt-6">
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-6 mb-3">
          アカウント
        </Text>
        
        <View className="bg-white border-b border-gray-200">
          <TouchableOpacity
            onPress={handleDataExport}
            className="px-6 py-4 flex-row items-center justify-between"
            disabled={updating}
          >
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">📦</Text>
              <View>
                <Text className="text-base font-medium text-gray-900">
                  データエクスポート
                </Text>
                <Text className="text-sm text-gray-500">
                  設定とプロファイルデータをバックアップ
                </Text>
              </View>
            </View>
            <Text className="text-blue-500 text-sm">→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="px-6 py-4 flex-row items-center justify-between border-t border-gray-100"
            disabled={updating}
          >
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">🚪</Text>
              <View>
                <Text className="text-base font-medium text-red-600">
                  ログアウト
                </Text>
                <Text className="text-sm text-gray-500">
                  アカウントからログアウトします
                </Text>
              </View>
            </View>
            <Text className="text-red-500 text-sm">→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info Section */}
      <View className="mt-6 mb-8">
        <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-6 mb-3">
          アプリ情報
        </Text>
        
        <View className="bg-white border-b border-gray-200">
          <View className="px-6 py-4">
            <View className="flex-row items-center mb-3">
              <Text className="text-2xl mr-3">🏔️</Text>
              <Text className="text-base font-medium text-gray-900">
                Climb You
              </Text>
            </View>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">バージョン</Text>
                <Text className="text-sm text-gray-900">{appInfo.version}</Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">ビルド番号</Text>
                <Text className="text-sm text-gray-900">{appInfo.buildNumber}</Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">リリース日</Text>
                <Text className="text-sm text-gray-900">{appInfo.releaseDate}</Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-sm text-gray-500">プラットフォーム</Text>
                <Text className="text-sm text-gray-900 capitalize">{appInfo.platform}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View className="px-6 pb-8">
        <Text className="text-xs text-gray-400 text-center leading-4">
          Climb You - AI-powered growth companion{'\n'}
          Your next step starts here.
        </Text>
      </View>
    </ScrollView>
  );
};