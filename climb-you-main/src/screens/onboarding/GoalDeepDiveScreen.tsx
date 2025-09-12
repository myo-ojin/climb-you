import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingForm } from '../../components/OnboardingForm';
import { OnboardingOrchestrationService } from '../../services/ai/onboardingOrchestrationService';

type GoalDeepDiveScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'GoalDeepDive'>;
type GoalDeepDiveScreenRouteProp = RouteProp<OnboardingStackParamList, 'GoalDeepDive'>;

interface GoalDeepDiveScreenProps {
  navigation: GoalDeepDiveScreenNavigationProp;
  route: GoalDeepDiveScreenRouteProp;
}

export default function GoalDeepDiveScreen({ navigation, route }: GoalDeepDiveScreenProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');

  const handleComplete = async (inputs: any) => {
    console.log('🎯 Onboarding form completed, starting Pre-Goal Analysis orchestration...');
    
    setIsAnalyzing(true);
    setAnalysisProgress('目標を分析しています...');
    
    try {
      // Execute Pre-Goal Analysis enhanced onboarding (as specified in plan)
      const analysisResult = await OnboardingOrchestrationService.executeEnhancedOnboarding(inputs);
      
      console.log('✅ Enhanced onboarding analysis completed:', {
        confidence: analysisResult.onboardingMetadata.confidence,
        processingTime: analysisResult.onboardingMetadata.processingTime,
        aiCalls: analysisResult.onboardingMetadata.aiCallsCount
      });
      
      // Validate the analysis result
      const validation = OnboardingOrchestrationService.validateOnboardingResult(analysisResult);
      
      if (!validation.isValid) {
        console.warn('⚠️ Onboarding analysis validation issues:', validation.issues);
      }
      
      // Navigate to next screen with complete analysis results
      navigation.navigate('GoalCategory', {
        goalDeepDiveData: {
          ...inputs,
          // Include all Pre-Goal Analysis enhanced results
          preGoalAnalysis: analysisResult.preGoalAnalysis,
          enhancedProfileQuestions: analysisResult.enhancedProfileQuestions,
          initialMilestones: analysisResult.initialMilestones,
          firstDayQuests: analysisResult.firstDayQuests,
          onboardingMetadata: analysisResult.onboardingMetadata,
          validationResults: validation
        }
      });
      
    } catch (error) {
      console.error('❌ Enhanced onboarding analysis failed:', error);
      
      // Fallback: Navigate with basic inputs only
      navigation.navigate('GoalCategory', {
        goalDeepDiveData: {
          ...inputs,
          analysisError: error.message,
          fallbackMode: true
        }
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const handleBack = () => {
    // This is now the first screen, so back should exit onboarding
    // You can implement onboarding exit logic here if needed
    console.log('Back pressed on first screen - implement exit logic if needed');
  };

  // Show analysis loading screen when running Pre-Goal Analysis
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analysisContainer}>
          <ActivityIndicator size="large" color="#F3E7C9" />
          <Text style={styles.analysisTitle}>AI分析中...</Text>
          <Text style={styles.analysisProgress}>{analysisProgress}</Text>
          <Text style={styles.analysisSubtext}>
            あなたの目標を詳しく分析して、最適な学習プランを作成しています
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingForm
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
  analysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0F2A44',
  },
  analysisTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F3E7C9',
    marginTop: 24,
    textAlign: 'center',
  },
  analysisProgress: {
    fontSize: 16,
    color: '#F3E7C9',
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  analysisSubtext: {
    fontSize: 14,
    color: '#B9C3CF',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});