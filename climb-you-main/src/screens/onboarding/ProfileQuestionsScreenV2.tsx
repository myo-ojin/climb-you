import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { ProfileQuestionCard } from '../../components/ProfileQuestionCard';
import { ProfileAnswers } from '../../types/onboardingQuestions';
import { 
  getCurrentQuestion, 
  getQuestionOptions,
  getBlockInfo,
  calculateProgress,
  getNextQuestionPosition,
  getPreviousQuestionPosition,
  validateAnswers
} from '../../utils/questionBranching';

type ProfileQuestionsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'ProfileQuestions'>;
type ProfileQuestionsScreenRouteProp = RouteProp<OnboardingStackParamList, 'ProfileQuestions'>;

interface ProfileQuestionsScreenProps {
  navigation: ProfileQuestionsScreenNavigationProp;
  route: ProfileQuestionsScreenRouteProp;
}

// New question system using blocks A, B, C, D
type BlockId = 'A' | 'B' | 'C' | 'D';
type StepInBlock = 1 | 2 | 3;

export default function ProfileQuestionsScreen({ navigation, route }: ProfileQuestionsScreenProps) {
  const { goalDeepDiveData } = route.params;
  
  // New state management for block-based questions
  const [currentBlock, setCurrentBlock] = useState<BlockId>('A');
  const [currentStep, setCurrentStep] = useState<StepInBlock>(1);
  const [profileAnswers, setProfileAnswers] = useState<ProfileAnswers>({});
  const [memos, setMemos] = useState<{ [questionId: string]: string }>({});
  
  const currentQuestion = getCurrentQuestion(currentBlock, currentStep);
  const questionOptions = getQuestionOptions(currentQuestion, profileAnswers);
  const questionWithOptions = { ...currentQuestion, options: questionOptions };
  
  const blockInfo = getBlockInfo(currentBlock);
  const progress = calculateProgress(currentBlock, currentStep);
  const isLastQuestion = currentBlock === 'D' && currentStep === 3;
  
  // Get current selected option
  const getCurrentSelectedOption = () => {
    if (!questionWithOptions.options.length) return undefined;
    const firstOption = questionWithOptions.options[0];
    const dataKey = firstOption.dataKey;
    const currentValue = profileAnswers[dataKey as keyof ProfileAnswers];
    return questionWithOptions.options.find(opt => opt.value === currentValue)?.id;
  };

  const handleOptionSelect = (optionId: string, value: string | number, dataKey: string) => {
    setProfileAnswers(prev => ({
      ...prev,
      [dataKey]: value,
    }));
  };

  const handleMemoChange = (memo: string) => {
    setMemos(prev => ({
      ...prev,
      [currentQuestion.id]: memo,
    }));
  };

  const handleNext = () => {
    console.log('🔄 ProfileQuestions handleNext called', { 
      isLastQuestion, 
      currentBlock, 
      currentStep,
      profileAnswersCount: Object.keys(profileAnswers).length 
    });

    if (isLastQuestion) {
      // Validate all answers before proceeding
      const validation = validateAnswers(profileAnswers);
      console.log('✅ Validation result:', validation);
      
      if (!validation.isValid) {
        console.log('❌ Validation failed, missing fields:', validation.missingFields);
        Alert.alert('入力エラー', `以下の質問に回答してください: ${validation.missingFields.join(', ')}`);
        return;
      }
      
      const profileData = {
        profileAnswers,
        memos
      };
      console.log('🚀 Navigating to QuestPreferences with data:', {
        goalDeepDiveData: !!goalDeepDiveData,
        profileData: !!profileData,
        profileAnswersKeys: Object.keys(profileAnswers)
      });
      navigation.navigate('QuestPreferences', { goalDeepDiveData, profileData });
    } else {
      const { nextBlock, nextStep } = getNextQuestionPosition(currentBlock, currentStep);
      console.log('➡️ Moving to next question:', { nextBlock, nextStep });
      if (nextBlock && nextStep) {
        setCurrentBlock(nextBlock);
        setCurrentStep(nextStep);
      }
    }
  };

  const handleBack = () => {
    const { prevBlock, prevStep } = getPreviousQuestionPosition(currentBlock, currentStep);
    if (prevBlock && prevStep) {
      setCurrentBlock(prevBlock);
      setCurrentStep(prevStep);
    } else {
      navigation.goBack();
    }
  };

  const isAnswered = getCurrentSelectedOption() !== undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress.overallProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>Step 2 / 3</Text>
          <Text style={styles.subProgressText}>
            {blockInfo.title} {currentStep} / 3
          </Text>
        </View>

        {/* Question Progress */}
        <View style={styles.questionProgressContainer}>
          <Text style={styles.questionProgressText}>
            質問 {progress.blockIndex * 3 + currentStep} / 12
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>プロファイリング質問</Text>
          <Text style={styles.subtitle}>より良いクエスト生成のために</Text>

          {/* Question Card */}
          <ProfileQuestionCard
            question={questionWithOptions}
            selectedOptionId={getCurrentSelectedOption()}
            memo={memos[currentQuestion.id] || ''}
            onOptionSelect={handleOptionSelect}
            onMemoChange={handleMemoChange}
          />

          {/* Navigation Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Text style={[styles.buttonText, styles.backButtonText]}>戻る</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.nextButton, isAnswered && styles.nextButtonActive]}
              onPress={handleNext}
              disabled={!isAnswered}
            >
              <Text style={[
                styles.buttonText,
                isAnswered ? styles.nextButtonTextActive : styles.nextButtonTextInactive
              ]}>
                {isLastQuestion ? '完了' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  subProgressText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 4,
  },
  questionProgressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
  },
  questionProgressText: {
    color: '#F3E7C9',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
    marginBottom: 30,
    opacity: 0.9,
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
  nextButton: {
    backgroundColor: 'rgba(243, 231, 201, 0.3)',
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3E7C9',
  },
  nextButtonActive: {
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
  nextButtonTextInactive: {
    color: '#F3E7C9',
  },
  nextButtonTextActive: {
    color: '#0F2A44',
  },
});