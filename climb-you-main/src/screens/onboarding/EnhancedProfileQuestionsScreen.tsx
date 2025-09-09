import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type ProfileQuestionsScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'ProfileQuestions'>;
type ProfileQuestionsScreenRouteProp = RouteProp<OnboardingStackParamList, 'ProfileQuestions'>;

interface ProfileQuestionsScreenProps {
  navigation: ProfileQuestionsScreenNavigationProp;
  route: ProfileQuestionsScreenRouteProp;
}

// Mock question generation for demonstration
const generateMockQuestions = (goalText: string) => {
  const questions = [
    {
      id: 'A1',
      blockTitle: '目標の焦点',
      question: `${goalText}で最も重要だと思う側面はどれですか？`,
      options: [
        { value: 'knowledge', label: 'まずは知る・わかるを増やしたい' },
        { value: 'skill', label: 'できることを増やしたい' },
        { value: 'outcome', label: '結果（合格/数字/順位）を出したい' },
        { value: 'habit', label: '続ける習慣をつくりたい' }
      ],
      hasOptionalMemo: true
    },
    {
      id: 'B1', 
      blockTitle: '学習の進め方',
      question: '新しいことを学ぶのと復習、どちらが多めがいいですか？',
      options: [
        { value: '0.75', label: '新しいことをたくさん学びたい' },
        { value: '0.60', label: '新しいことを少し多めに' },
        { value: '0.40', label: '復習を少し多めに' },
        { value: '0.25', label: '復習をしっかりやりたい' }
      ],
      hasOptionalMemo: true
    },
    {
      id: 'C1',
      blockTitle: '成果の確認方法', 
      question: '「できた！」をどうやって確認したいですか？',
      options: [
        { value: 'score', label: 'テストや試験の点数で' },
        { value: 'portfolio', label: '作品やポートフォリオで' },
        { value: 'realworld', label: '実際の仕事や実績で' },
        { value: 'review', label: '発表やレビューで' }
      ],
      hasOptionalMemo: true
    },
    {
      id: 'D1',
      blockTitle: '継続のための対策',
      question: 'どんな時につまずきやすいですか？',
      options: [
        { value: 'time', label: '時間がなくて継続できない' },
        { value: 'difficulty', label: '内容が難しくて進まない' },
        { value: 'focus', label: '集中が続かず気が散ってしまう' },
        { value: 'meaning', label: 'なんのためにやっているか分からない' }
      ],
      hasOptionalMemo: true
    }
  ];
  
  return questions;
};

export default function EnhancedProfileQuestionsScreen({ navigation, route }: ProfileQuestionsScreenProps) {
  const { goalDeepDiveData } = route.params;
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [freeTextAnswers, setFreeTextAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize question generation
  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const goalText = goalDeepDiveData.goal || 'カスタム学習目標';
      console.log('📋 Generating questions for goal:', goalText);
      
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockQuestions = generateMockQuestions(goalText);
      console.log('✅ Questions generated successfully');
      
      setQuestions(mockQuestions);
    } catch (err: any) {
      console.error('❌ Question generation failed:', err);
      setError(err.message || '質問の生成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;

  const handleOptionSelect = (optionValue: string) => {
    if (!currentQuestion) return;
    
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionValue
    }));
  };

  const handleFreeTextChange = (text: string) => {
    if (!currentQuestion) return;
    
    setFreeTextAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: text
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const profileData = {
        answers,
        freeTextAnswers,
        generationMetadata: {
          aiGeneratedBlocks: ['A', 'C'],
          templateBlocks: ['B', 'D'],
          totalApiCalls: 3,
          generationTime: 2000
        }
      };
      navigation.navigate('QuestPreferences', { goalDeepDiveData, profileData });
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else {
      navigation.goBack();
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F3E7C9" />
          <Text style={styles.loadingText}>質問を生成中...</Text>
          <Text style={styles.loadingSubtext}>あなたの目標に最適な質問を作成しています</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>質問の生成に失敗しました</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generateQuestions}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={() => navigation.goBack()}>
            <Text style={styles.skipButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // No questions generated
  if (!questions || totalQuestions === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>質問が見つかりません</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generateQuestions}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '67%' }]} />
          </View>
          <Text style={styles.progressText}>Step 2 / 3</Text>
        </View>

        {/* Question Counter */}
        <View style={styles.questionCounter}>
          <Text style={styles.counterText}>
            質問 {currentQuestionIndex + 1} / {totalQuestions}
          </Text>
          <Text style={styles.purposeText}>より良いクエストのために</Text>
          <View style={styles.generationInfo}>
            <Text style={styles.generationInfoText}>
              🤖 AI生成: 2ブロック | 📋 テンプレート: 2ブロック
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>あなたのことを教えてください</Text>

          {/* Question Card */}
          {currentQuestion && (
            <View style={styles.questionCard}>
              {/* Block Info */}
              <View style={styles.blockInfo}>
                <Text style={styles.blockInfoText}>
                  {currentQuestion.blockTitle}
                </Text>
              </View>
              
              <Text style={styles.questionText}>{currentQuestion.question}</Text>
              
              <View style={styles.optionsContainer}>
                {currentQuestion.options.map((option: any, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      answers[currentQuestion.id] === option.value && styles.selectedOption
                    ]}
                    onPress={() => handleOptionSelect(option.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      answers[currentQuestion.id] === option.value && styles.selectedOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Free Text Input */}
              {currentQuestion.hasOptionalMemo && (
                <View style={styles.freeTextContainer}>
                  <Text style={styles.freeTextLabel}>補足があれば自由に記入してください（任意）</Text>
                  <TextInput
                    style={styles.freeTextInput}
                    value={freeTextAnswers[currentQuestion.id] || ''}
                    onChangeText={handleFreeTextChange}
                    placeholder="その他の理由や詳細があれば..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={200}
                  />
                </View>
              )}
            </View>
          )}

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
                {isLastQuestion ? '次へ' : '次の質問'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#F3E7C9',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#0F2A44',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#F3E7C9',
    fontSize: 16,
    fontWeight: '500',
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
  questionCounter: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  counterText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  purposeText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: 4,
  },
  generationInfo: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  generationInfoText: {
    color: '#F3E7C9',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.9,
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
    marginBottom: 30,
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  blockInfo: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  blockInfoText: {
    fontSize: 12,
    color: '#0F2A44',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#F3E7C9',
    borderColor: '#F3E7C9',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#0F2A44',
    fontWeight: '600',
  },
  freeTextContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  freeTextLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  freeTextInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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