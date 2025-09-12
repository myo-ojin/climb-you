import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseUserProfileService } from '../services/firebase/firebaseUserProfileService';
import { IntegratedUserProfile } from '../types/userProfile';
import { getCurrentUserId } from '../config/firebaseConfig';

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<IntegratedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      const currentUserId = await getCurrentUserId();
      setUserId(currentUserId);
      
      const profile = await firebaseUserProfileService.loadUserProfile();
      setUserProfile(profile);
    } catch (error) {
      console.error('Profile load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProfile = () => {
    Alert.alert(
      'プロファイルをリセット',
      'すべてのデータがリセットされ、オンボーディングから再開されます。この操作は元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'リセット',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await loadUserProfile();
              Alert.alert('完了', 'プロファイルがリセットされました');
            } catch (error) {
              Alert.alert('エラー', 'リセットに失敗しました');
            }
          }
        }
      ]
    );
  };

  const StatCard = ({ title, value, subtitle, icon }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
  }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <View style={styles.statContent}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🔄 プロファイルを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>マイプロファイル</Text>
          <Text style={styles.subtitle}>あなたの学習の進捗と目標</Text>
        </View>

        {/* Goal Section */}
        {userProfile?.onboardingData?.goalDeepDiveData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 現在の目標</Text>
            <View style={styles.goalCard}>
              <Text style={styles.goalText}>
                {userProfile.onboardingData.goalDeepDiveData.goal_text}
              </Text>
              <View style={styles.goalMeta}>
                <Text style={styles.goalMetaText}>
                  期間: {userProfile.onboardingData.goalData?.period || 'N/A'}ヶ月
                </Text>
                <Text style={styles.goalMetaText}>
                  強度: {userProfile.onboardingData.goalData?.intensity || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Progress Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 学習統計</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="🔥"
              title="継続日数"
              value={userProfile?.progress?.currentStreak || 0}
              subtitle="日連続"
            />
            <StatCard
              icon="✅"
              title="今日の進捗"
              value={`${userProfile?.progress?.todaysProgress?.completed || 0}/${userProfile?.progress?.todaysProgress?.total || 0}`}
              subtitle="完了"
            />
            <StatCard
              icon="⏰"
              title="1日の予算"
              value={userProfile?.aiProfile?.time_budget_min_per_day || 0}
              subtitle="分"
            />
            <StatCard
              icon="🎯"
              title="総クエスト"
              value={userProfile?.initialQuests?.length || 0}
              subtitle="作成済み"
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ 設定</Text>
          <View style={styles.settingsCard}>
            <Text style={styles.userIdText}>
              ユーザーID: {userId ? userId.substring(0, 8) + '...' : 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleResetProfile}
            >
              <Text style={styles.resetButtonText}>プロファイルをリセット</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Learning Preferences */}
        {userProfile?.aiProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧠 学習スタイル</Text>
            <View style={styles.preferencesCard}>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>学習レベル</Text>
                <Text style={styles.preferenceValue}>
                  {userProfile.aiProfile.learning_level || '未設定'}
                </Text>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>好きな時間帯</Text>
                <Text style={styles.preferenceValue}>
                  {userProfile.aiProfile.preferred_study_times?.join(', ') || '未設定'}
                </Text>
              </View>
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>学習環境</Text>
                <Text style={styles.preferenceValue}>
                  {userProfile.aiProfile.learning_environment || '未設定'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#F3E7C9',
    fontSize: 18,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F3E7C9',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#B9C3CF',
    opacity: 0.9,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3E7C9',
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.3)',
  },
  goalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A4B',
    marginBottom: 12,
    lineHeight: 26,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalMetaText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  statIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A4B',
  },
  statSubtitle: {
    fontSize: 10,
    color: '#999',
  },
  settingsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  userIdText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontFamily: 'monospace',
  },
  resetButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  preferencesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(185, 195, 207, 0.2)',
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  preferenceValue: {
    fontSize: 14,
    color: '#1E3A4B',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});