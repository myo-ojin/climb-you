import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { Quest, OnboardingInput } from '../../types/questGeneration';
import { ProfileAnswers } from '../../types/onboardingQuestions';
import { CompleteOnboardingData } from '../../types/userProfile';
import { EnhancedQuestService } from '../../services/ai/enhancedQuestService';
import { MilestoneService, Milestone } from '../../services/ai/milestoneService';
import { firebaseUserProfileService } from '../../services/firebase/firebaseUserProfileService';

type AIAnalysisResultScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'AIAnalysisResult'>;
type AIAnalysisResultScreenRouteProp = RouteProp<OnboardingStackParamList, 'AIAnalysisResult'>;

interface AIAnalysisResultScreenProps {
  navigation: AIAnalysisResultScreenNavigationProp;
  route: AIAnalysisResultScreenRouteProp;
  onComplete: () => void;
}

interface LearningStrategy {
  recommendedPace: 'slow' | 'moderate' | 'intensive';
  dailyTimeAllocation: number;
  learningStyle: string;
  keyStrengths: string[];
  potentialChallenges: string[];
  initialQuests: Quest[];
  milestones: Milestone[];
  successPrediction: {
    probability: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    keyFactors: string[];
  };
}

const colors = {
  NightSky: '#0F2A44',
  Moonlight: '#F3E7C9',
  white: '#fff',
  text: '#333',
  textSecondary: '#666',
  textOnNight: '#fff',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  cardBackground: 'rgba(255, 255, 255, 0.9)',
};

export default function AIAnalysisResultScreen({ navigation, route, onComplete }: AIAnalysisResultScreenProps) {
  const { goalDeepDiveData, profileData, questPreferencesData } = route.params;
  
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [learningStrategy, setLearningStrategy] = useState<LearningStrategy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const questService = new EnhancedQuestService();
  const milestoneService = new MilestoneService();

  useEffect(() => {
    generateLearningStrategy();
  }, []);

  const generateLearningStrategy = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);

      // Generate initial quests
      const questResult = await questService.generateOptimizedQuestsWithTimeConstraints({
        goalText: goalDeepDiveData.goal_text,
        profile: convertToProfileV1(goalDeepDiveData, profileData.profileAnswers),
        currentLevelTags: [],
        priorityAreas: [],
      });

      // Generate milestones
      const milestones = await milestoneService.generateMilestones({
        goalText: goalDeepDiveData.goal_text,
        goalCategory: goalDeepDiveData.goal_category,
        timeframe: goalDeepDiveData.goal_deadline,
        importance: goalDeepDiveData.goal_importance,
        timeBudgetPerDay: goalDeepDiveData.time_budget_min_per_day,
      });

      // Analyze feasibility
      const feasibilityAnalysis = await milestoneService.analyzeFeasibility(
        goalDeepDiveData.goal_text,
        goalDeepDiveData.goal_deadline,
        goalDeepDiveData.time_budget_min_per_day
      );

      const strategy: LearningStrategy = {
        recommendedPace: getPaceRecommendation(goalDeepDiveData.goal_motivation, goalDeepDiveData.goal_importance),
        dailyTimeAllocation: goalDeepDiveData.time_budget_min_per_day,
        learningStyle: analyzeLearningStyle(profileData.profileAnswers),
        keyStrengths: [],
        potentialChallenges: identifyChallenges(profileData.profileAnswers, goalDeepDiveData),
        initialQuests: questResult.finalQuests.quests || [],
        milestones: milestones,
        successPrediction: {
          probability: feasibilityAnalysis.confidence,
          confidenceLevel: getConfidenceLevel(feasibilityAnalysis.confidence),
          keyFactors: [...feasibilityAnalysis.recommendations, ...feasibilityAnalysis.riskFactors].slice(0, 3),
        },
      };

      setLearningStrategy(strategy);
    } catch (error: any) {
      console.error('Learning strategy generation error:', error);
      setError('AI分析中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinue = async () => {
    try {
      // オンボーディング完了データを統合
      const completeOnboardingData: CompleteOnboardingData = {
        goalDeepDiveData,
        profileData,
        questPreferencesData,
        learningStrategy: learningStrategy!,
      };
      
      console.log('🔄 Integrating onboarding data...');
      
      // Firebase統合版ユーザープロファイルサービスでデータ統合
      const integratedProfile = await firebaseUserProfileService.integrateOnboardingData(completeOnboardingData);
      
      console.log('✅ Onboarding data integration completed:', {
        userId: integratedProfile.userId,
        questCount: integratedProfile.initialQuests.length,
        skillCount: integratedProfile.skillAtoms.length,
      });
      
      // Complete onboarding and navigate to main app
      onComplete();
      
    } catch (error) {
      console.error('❌ Onboarding integration failed:', error);
      Alert.alert(
        'エラーが発生しました',
        'データの統合処理でエラーが発生しました。もう一度お試しください。',
        [
          { text: 'OK' }
        ]
      );
    }
  };

  const handleRetry = () => {
    generateLearningStrategy();
  };

  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.Moonlight} />
          <Text style={styles.loadingTitle}>AI分析中...</Text>
          <Text style={styles.loadingSubtitle}>
            あなた専用の学習戦略を生成しています
          </Text>
          <View style={styles.loadingSteps}>
            <Text style={styles.loadingStep}>✓ プロファイル分析完了</Text>
            <Text style={styles.loadingStep}>⏳ 最適クエスト生成中...</Text>
            <Text style={styles.loadingStep}>⏳ マイルストーン設定中...</Text>
            <Text style={styles.loadingStep}>⏳ 成功予測計算中...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>分析エラー</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!learningStrategy) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Header */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Step 3 / 3</Text>
          <Text style={styles.subProgressText}>AI分析結果</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>あなた専用学習戦略</Text>
          <Text style={styles.subtitle}>AI分析が完了しました！</Text>

          {/* Success Prediction */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 成功予測</Text>
            <View style={styles.successPrediction}>
              <View style={styles.successMeter}>
                <View 
                  style={[
                    styles.successMeterFill, 
                    { 
                      width: `${learningStrategy.successPrediction.probability * 100}%`,
                      backgroundColor: getSuccessColor(learningStrategy.successPrediction.probability)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.successPercentage}>
                {(learningStrategy.successPrediction.probability * 100).toFixed(0)}% 成功確率
              </Text>
              <Text style={styles.confidenceLevel}>
                信頼度: {getConfidenceLevelText(learningStrategy.successPrediction.confidenceLevel)}
              </Text>
            </View>
          </View>

          {/* Learning Strategy */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 推奨学習戦略</Text>
            <View style={styles.strategyItem}>
              <Text style={styles.strategyLabel}>学習ペース</Text>
              <Text style={styles.strategyValue}>{getPaceText(learningStrategy.recommendedPace)}</Text>
            </View>
            <View style={styles.strategyItem}>
              <Text style={styles.strategyLabel}>1日の学習時間</Text>
              <Text style={styles.strategyValue}>{learningStrategy.dailyTimeAllocation}分</Text>
            </View>
            <View style={styles.strategyItem}>
              <Text style={styles.strategyLabel}>学習スタイル</Text>
              <Text style={styles.strategyValue}>{learningStrategy.learningStyle}</Text>
            </View>
          </View>

          {/* Initial Quests Preview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎮 初回クエスト（3個）</Text>
            {learningStrategy.initialQuests.map((quest, index) => (
              <View key={index} style={styles.questPreview}>
                <Text style={styles.questTitle}>{quest.title}</Text>
                <Text style={styles.questDetails}>
                  {quest.minutes}分
                </Text>
                <Text style={styles.questDeliverable}>{quest.deliverable}</Text>
              </View>
            ))}
          </View>

          {/* Milestones */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏔️ マイルストーン</Text>
            {learningStrategy.milestones.slice(0, 3).map((milestone, index) => (
              <View key={milestone.id} style={styles.milestoneItem}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  <Text style={styles.milestoneDate}>
                    {milestone.targetDate.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.milestoneDescription}>{milestone.description}</Text>
              </View>
            ))}
            {learningStrategy.milestones.length > 3 && (
              <Text style={styles.moreMessage}>
                他 {learningStrategy.milestones.length - 3} 個のマイルストーン
              </Text>
            )}
          </View>


          {/* Continue Button */}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>学習を開始する！</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper functions
function convertToProfileV1(goalData: OnboardingInput, profileAnswers: ProfileAnswers): any {
  // Convert onboarding data to ProfileV1 format for quest generation
  return {
    time_budget_min_per_day: goalData.time_budget_min_per_day,
    peak_hours: [9, 14, 19], // Default peak hours
    env_constraints: goalData.env_constraints,
    hard_constraints: [],
    motivation_style: 'push',
    difficulty_tolerance: goalData.goal_motivation === 'high' ? 0.8 : 0.5,
    novelty_preference: 0.6,
    pace_preference: goalData.goal_motivation === 'high' ? 'sprint' : 'cadence',
    long_term_goal: goalData.goal_text,
    milestone_granularity: 0.5,
    current_level_tags: [],
    priority_areas: [goalData.goal_category],
    heat_level: goalData.goal_importance,
    risk_factors: [],
    preferred_session_length_min: goalData.preferred_session_length_min,
    modality_preference: goalData.modality_preference,
    deliverable_preferences: ['note'],
    weekly_minimum_commitment_min: goalData.time_budget_min_per_day * 7,
    goal_motivation: goalData.goal_motivation,
  };
}

function getPaceRecommendation(motivation: string, importance: number): 'slow' | 'moderate' | 'intensive' {
  if (motivation === 'high' && importance >= 4) return 'intensive';
  if (motivation === 'low' || importance <= 2) return 'slow';
  return 'moderate';
}

function analyzeLearningStyle(profileAnswers: ProfileAnswers): string {
  // Simple heuristic based on profile answers
  return '段階的・実践重視型';
}


function identifyChallenges(profileAnswers: ProfileAnswers, goalData: OnboardingInput): string[] {
  const challenges = [];
  
  if (goalData.time_budget_min_per_day < 30) {
    challenges.push('限られた学習時間の効率的活用');
  }
  
  if (goalData.goal_deadline === '1m') {
    challenges.push('短期間での目標達成プレッシャー');
  }
  
  return challenges;
}

function getConfidenceLevel(probability: number): 'high' | 'medium' | 'low' {
  if (probability >= 0.8) return 'high';
  if (probability >= 0.6) return 'medium';
  return 'low';
}

function getSuccessColor(probability: number): string {
  if (probability >= 0.8) return colors.success;
  if (probability >= 0.6) return colors.warning;
  return colors.danger;
}

function getConfidenceLevelText(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
  }
}

function getPaceText(pace: 'slow' | 'moderate' | 'intensive'): string {
  switch (pace) {
    case 'slow': return 'ゆっくり着実';
    case 'moderate': return 'バランス重視';
    case 'intensive': return '集中的';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.NightSky,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textOnNight,
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: colors.textOnNight,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingSteps: {
    alignSelf: 'stretch',
  },
  loadingStep: {
    fontSize: 14,
    color: colors.textOnNight,
    opacity: 0.7,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.danger,
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: colors.textOnNight,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: colors.Moonlight,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.NightSky,
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
    backgroundColor: colors.Moonlight,
    borderRadius: 4,
  },
  progressText: {
    color: colors.textOnNight,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  subProgressText: {
    color: colors.textOnNight,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textOnNight,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textOnNight,
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  successPrediction: {
    alignItems: 'center',
  },
  successMeter: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 6,
    marginBottom: 12,
  },
  successMeterFill: {
    height: '100%',
    borderRadius: 6,
  },
  successPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  confidenceLevel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  strategyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  strategyLabel: {
    fontSize: 16,
    color: colors.text,
  },
  strategyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  questPreview: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  questTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  questDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  questDeliverable: {
    fontSize: 14,
    color: colors.text,
  },
  milestoneItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.Moonlight,
    paddingLeft: 12,
    marginBottom: 16,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  milestoneDate: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  milestoneDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  moreMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: colors.Moonlight,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.NightSky,
    textAlign: 'center',
  },
});