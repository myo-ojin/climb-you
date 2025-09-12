import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList, OnboardingData } from '../../navigation/OnboardingNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  generatePersonalizedQuests, 
  generateDefaultPreferences, 
  PersonalizedQuest,
  testFallbackGeneration
} from '../../utils/questPersonalization';
import { GoalDeepDiveAnswers } from '../../types/questGeneration';

type QuestPreferencesScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'QuestPreferences'>;
type QuestPreferencesScreenRouteProp = RouteProp<OnboardingStackParamList, 'QuestPreferences'>;

interface QuestPreferencesScreenProps {
  navigation: QuestPreferencesScreenNavigationProp;
  route: QuestPreferencesScreenRouteProp;
  onComplete: () => void;
}

type PreferenceRating = 'love' | 'like' | 'dislike' | null;

export default function QuestPreferencesScreen({ navigation, route, onComplete }: QuestPreferencesScreenProps) {
  const { goalDeepDiveData, profileData } = route.params;
  const [personalizedQuests, setPersonalizedQuests] = useState<PersonalizedQuest[]>([]);
  const [preferences, setPreferences] = useState<{ [key: string]: PreferenceRating }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // AIパーソナライズドクエストの生成
  useEffect(() => {
    const generateQuests = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🎯 Starting AI quest generation from profile data:', profileData);
        console.log('📋 goalDeepDiveData received:', goalDeepDiveData);
        console.log('🎯 Goal text from goalDeepDiveData:', goalDeepDiveData?.goal_text);
        
        // Debug: Test fallback generation first
        console.log('🧪 Testing fallback generation before AI attempt...');
        testFallbackGeneration();
        
        // AIシステムでパーソナライズドクエストを生成
        const forceMock = retryCount >= 2;
        const quests = await generatePersonalizedQuests(
          profileData.profileAnswers || {},
          goalDeepDiveData as GoalDeepDiveAnswers,
          goalDeepDiveData?.goal_text,  // OnboardingInputsの目標テキスト
          forceMock
        );
        
        console.log('✅ Generated', quests.length, 'personalized quests');
        
        // QP-03: Validate and enforce caps (≤45 min per quest, ≤90 total)
        const validatedQuests = validateAndCapQuests(quests);
        
        if (validatedQuests.length === 0) {
          throw new Error('No valid quests generated');
        }
        
        // デフォルトの推定評価を生成
        const defaultPrefs = generateDefaultPreferences(validatedQuests, profileData.profileAnswers || {});
        console.log('⚡ Generated default preferences:', defaultPrefs);
        
        setPersonalizedQuests(validatedQuests);
        setPreferences(defaultPrefs);
        setError(null);
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Error generating personalized quests:', error);
        setError('クエストの生成に失敗しました。もう一度お試しください。');
        setPersonalizedQuests([]);
        setIsLoading(false);
      }
    };

    generateQuests();
  }, [profileData, goalDeepDiveData, retryCount]);

  // QP-03: Validate and cap quests (≤45 min per quest, ≤90 total)
  const validateAndCapQuests = (quests: PersonalizedQuest[]): PersonalizedQuest[] => {
    if (!quests || quests.length === 0) return [];
    
    // Cap individual quest minutes to ≤45
    const cappedQuests = quests.map(quest => ({
      ...quest,
      minutes: Math.min(quest.minutes || 30, 45), // Default 30min if missing, cap at 45
      title: quest.title || 'Untitled Quest',
      description: quest.description || 'Quest description unavailable',
    }));
    
    // Ensure total time ≤90 minutes for onboarding preview
    let totalMinutes = 0;
    const validQuests: PersonalizedQuest[] = [];
    
    for (const quest of cappedQuests) {
      if (totalMinutes + quest.minutes <= 90) {
        validQuests.push(quest);
        totalMinutes += quest.minutes;
      } else {
        // Try to fit a smaller version
        const remainingTime = 90 - totalMinutes;
        if (remainingTime >= 15) { // Minimum 15 minutes
          validQuests.push({
            ...quest,
            minutes: remainingTime
          });
          break;
        }
      }
    }
    
    return validQuests;
  };

  // QP-05: Retry functionality
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handlePreferenceSelect = (questId: string, rating: PreferenceRating) => {
    setPreferences(prev => ({
      ...prev,
      [questId]: rating
    }));
  };

  const answeredCount = Object.keys(preferences).length;
  const isComplete = answeredCount === personalizedQuests.length;

  const handleComplete = async () => {
    if (isComplete) {
      try {
        // Navigate to AI Analysis Result Screen
        const questPreferencesData = {
          preferences,
          personalizedQuests,
          answeredCount,
          completedAt: Date.now(),
        };
        
        navigation.navigate('AIAnalysisResult', {
          goalDeepDiveData,
          profileData,
          questPreferencesData,
        });
      } catch (error) {
        console.error('Navigation error:', error);
        Alert.alert('エラー', 'システムエラーが発生しました。', [
          { text: 'OK' }
        ]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 3 / 3</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>あなたにおすすめのクエスト</Text>
          <Text style={styles.subtitle}>
            以下のクエストがどの程度好みに合うか教えてください
          </Text>
          <Text style={styles.progressText}>
            回答済み: {answeredCount} / {personalizedQuests.length}
          </Text>
        </View>

        {/* Loading State */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🤖 AIがあなた専用のクエストを生成中...</Text>
            <Text style={styles.loadingSubText}>プロファイル情報を分析しています</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <Text style={styles.errorSubText}>
              {retryCount < 2 ? 'AI生成を再試行できます' : 'モックモードで続行できます'}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>
                {retryCount < 2 ? '再試行' : 'モックモードで続行'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Quest Cards
          <View style={styles.content}>
            {personalizedQuests.map((quest) => (
            <View key={quest.id} style={styles.questCard}>
              {/* Quest Header */}
              <View style={styles.questHeader}>
                <View style={styles.questInfo}>
                  <View style={styles.questTitleContainer}>
                    <Text style={styles.questTitle}>{quest.title}</Text>
                    <Text style={styles.questCategory}>{quest.category}</Text>
                  </View>
                </View>
              </View>

              {/* Quest Description */}
              <Text style={styles.questDescription}>{quest.description}</Text>
              
              {/* Quest Time Info */}
              {quest.minutes && (
                <View style={styles.questMeta}>
                  <Text style={styles.questTime}>⏱️ 約{quest.minutes}分</Text>
                </View>
              )}

              {/* Trail Selection Bar */}
              <View style={styles.trailContainer}>
                <View style={styles.trailPill}>
                  {/* Background Segments */}
                  <View style={styles.trailSegments}>
                    <View style={[styles.segment, styles.loveSegment]} />
                    <View style={[styles.segment, styles.likeSegment]} />
                    <View style={[styles.segment, styles.dislikeSegment]} />
                  </View>
                  
                  {/* Hiker (Active Indicator) */}
                  {preferences[quest.id] && (
                    <View style={[
                      styles.hiker,
                      preferences[quest.id] === 'love' && styles.hikerLeft,
                      preferences[quest.id] === 'like' && styles.hikerCenter,
                      preferences[quest.id] === 'dislike' && styles.hikerRight
                    ]}>
                      <Text style={styles.hikerIcon}>🥾</Text>
                    </View>
                  )}
                  
                  {/* Touch Areas */}
                  <TouchableOpacity 
                    style={[styles.touchArea, { left: 0 }]}
                    onPress={() => handlePreferenceSelect(quest.id, 'love')}
                  />
                  <TouchableOpacity 
                    style={[styles.touchArea, { left: '33.33%' }]}
                    onPress={() => handlePreferenceSelect(quest.id, 'like')}
                  />
                  <TouchableOpacity 
                    style={[styles.touchArea, { left: '66.66%' }]}
                    onPress={() => handlePreferenceSelect(quest.id, 'dislike')}
                  />
                </View>
                
                {/* Labels */}
                <View style={styles.trailLabels}>
                  <Text style={[
                    styles.labelText,
                    preferences[quest.id] === 'love' && styles.activeLabelText
                  ]}>好き</Text>
                  <Text style={[
                    styles.labelText,
                    preferences[quest.id] === 'like' && styles.activeLabelText
                  ]}>様子見</Text>
                  <Text style={[
                    styles.labelText,
                    preferences[quest.id] === 'dislike' && styles.activeLabelText
                  ]}>パス</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.navigate('ProfileQuestions', { goalDeepDiveData })}
            >
              <Text style={[styles.buttonText, styles.backButtonText]}>戻る</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.completeButton, isComplete && styles.completeButtonActive]}
              onPress={handleComplete}
              disabled={!isComplete}
            >
              <Text style={[
                styles.buttonText,
                isComplete ? styles.completeButtonTextActive : styles.completeButtonTextInactive
              ]}>完了</Text>
            </TouchableOpacity>
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
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F3E7C9',
    borderRadius: 4,
  },
  progressText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  questCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  questInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questTitleContainer: {
    flex: 1,
  },
  questTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  questCategory: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  questDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  trailContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  trailPill: {
    width: '100%',
    height: 44,
    position: 'relative',
  },
  trailSegments: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(243, 231, 201, 0.2)',
  },
  segment: {
    flex: 1,
    height: '100%',
  },
  loveSegment: {
    backgroundColor: '#F3E7C9',
    opacity: 0.3,
  },
  likeSegment: {
    backgroundColor: 'rgba(185, 195, 207, 0.1)',
  },
  dislikeSegment: {
    backgroundColor: '#B9C3CF',
    opacity: 0.3,
  },
  hiker: {
    position: 'absolute',
    top: 8,
    width: 28,
    height: 28,
    backgroundColor: '#F3E7C9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#0F2A44',
  },
  hikerLeft: {
    left: 8,
  },
  hikerCenter: {
    left: '50%',
    marginLeft: -14,
  },
  hikerRight: {
    right: 8,
  },
  hikerIcon: {
    fontSize: 14,
  },
  touchArea: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '33.33%',
    left: 0,
  },
  trailLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E3A4B',
    textAlign: 'center',
    flex: 1,
  },
  activeLabelText: {
    color: '#0F2A44',
    fontWeight: '700',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  backButton: {
    backgroundColor: '#1E3A4B',
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B9C3CF',
  },
  completeButton: {
    backgroundColor: 'rgba(243, 231, 201, 0.3)',
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3E7C9',
  },
  completeButtonActive: {
    backgroundColor: '#F3E7C9',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButtonText: {
    color: '#F3E7C9',
  },
  completeButtonTextInactive: {
    color: '#F3E7C9',
  },
  completeButtonTextActive: {
    color: '#0F2A44',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#F3E7C9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#0F2A44',
    fontSize: 14,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: 'rgba(243, 231, 201, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F3E7C9',
  },
  successText: {
    color: '#F3E7C9',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  questMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  questPattern: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  questTime: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
});