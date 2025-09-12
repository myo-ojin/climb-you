import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, TextInput } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { ProfileQuestionCard } from '../../components/ProfileQuestionCard';
import { ProfileAnswers, Question, QUESTION_BLOCKS } from '../../types/onboardingQuestions';
import { openaiService } from '../../services/ai/openaiService';
import { apiKeyManager } from '../../config/apiKeys';
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

// Create flattened questions array from blocks
const QUESTIONS: Question[] = [
  ...QUESTION_BLOCKS.A,
  ...QUESTION_BLOCKS.B, 
  ...QUESTION_BLOCKS.C,
  ...QUESTION_BLOCKS.D,
];

export default function ProfileQuestionsScreen({ navigation, route }: ProfileQuestionsScreenProps) {
  const { goalDeepDiveData } = route.params;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [freeTextAnswers, setFreeTextAnswers] = useState<{ [key: string]: string }>({});
  const [aiGeneratedOptions, setAiGeneratedOptions] = useState<{ [key: string]: any[] }>({});
  const [loadingAiOptions, setLoadingAiOptions] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;
  const isAnswered = answers[currentQuestion.id] !== undefined;
  
  // Get options for current question (includes AI-generated ones if available)
  const currentOptions = aiGeneratedOptions[currentQuestion.id] || currentQuestion.options;

  const handleOptionSelect = (option: string) => {
    console.log(`🔹 Option Select Debug - Question: ${currentQuestion.id}, Selected Option: ${option}`);
    console.log(`🔹 Current Answer Before: ${answers[currentQuestion.id]}`);
    
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [currentQuestion.id]: option
      };
      console.log(`🔹 New Answer After: ${newAnswers[currentQuestion.id]}`);
      console.log(`🔹 Full Answers Object:`, newAnswers);
      return newAnswers;
    });
  };

  // AI question generation for Block A and C dependent questions
  const generateAiOptions = async (question: Question, goalText?: string) => {
    console.log(`🤖 generateAiOptions called for ${question.id} with goalText: ${goalText}`);
    try {
      setLoadingAiOptions(true);
      
      // Initialize OpenAI if not already done
      const apiKey = apiKeyManager.getOpenAIKey();
      if (!apiKey) {
        console.log('OpenAI not configured, using static options');
        return;
      }
      
      openaiService.initialize(apiKey);

      let prompt = '';
      let shouldGenerate = false;

      // Block A1: Goal-specific focus options
      if (question.id === 'A1') {
        shouldGenerate = true;
        const userGoal = goalText || goalDeepDiveData.goal_text || 'general learning';
        
        prompt = `ユーザーの目標に最適化された学習フォーカスの選択肢を生成してください：

ユーザーの目標: ${userGoal}

質問: "どんなことを目指していますか？"

各選択肢は以下の4つのカテゴリに対応し、ユーザーの目標に合わせてカスタマイズしてください：
1. 知識・理解重視の選択肢 (goal_focus=knowledge)
2. スキル・実践重視の選択肢 (goal_focus=skill) 
3. 結果・成果重視の選択肢 (goal_focus=outcome)
4. 継続・習慣重視の選択肢 (goal_focus=habit)

各選択肢は：
- 30文字以内で具体的
- ユーザーの目標領域に密接に関連
- 自然な日本語表現
- 学習者の動機を適切に表現

JSON形式で回答してください：
[
  { "id": "knowledge", "label": "選択肢1", "value": "knowledge", "dataKey": "goal_focus" },
  { "id": "skill", "label": "選択肢2", "value": "skill", "dataKey": "goal_focus" },
  { "id": "outcome", "label": "選択肢3", "value": "outcome", "dataKey": "goal_focus" },
  { "id": "habit", "label": "選択肢4", "value": "habit", "dataKey": "goal_focus" }
]`;
      }

      // Block A2: Goal-specific follow-up questions
      else if (question.id === 'A2' && answers['A1']) {
        shouldGenerate = true;
        const goalFocus = answers['A1'];
        const userGoal = goalText || goalDeepDiveData.goal_text || 'general learning';
        
        prompt = `以下のユーザーの目標と志向に基づいて、より具体的な4つの選択肢を生成してください：

ユーザーの目標: ${userGoal}
選択した志向: ${goalFocus}

質問: "より具体的にはどんな感じですか？"

各選択肢は：
- 30文字以内で具体的
- ユーザーの目標と志向に密接に関連
- 実行可能で現実的
- 日本語で自然な表現

JSON形式で回答してください：
[
  { "id": "option1", "label": "選択肢1", "value": "value1", "dataKey": "goal_evidence" },
  { "id": "option2", "label": "選択肢2", "value": "value2", "dataKey": "goal_evidence" },
  { "id": "option3", "label": "選択肢3", "value": "value3", "dataKey": "goal_evidence" },
  { "id": "option4", "label": "選択肢4", "value": "value4", "dataKey": "goal_evidence" }
]`;
      }

      // Block A3: Scope-specific questions based on A2
      else if (question.id === 'A3' && answers['A2']) {
        shouldGenerate = true;
        const specificGoal = answers['A2'];
        const userGoal = goalText || goalDeepDiveData.goal_text || 'general learning';
        
        prompt = `以下のユーザーの目標と具体的なアプローチに基づいて、学習範囲に関する4つの選択肢を生成してください：

ユーザーの目標: ${userGoal}
具体的なアプローチ: ${specificGoal}

質問: "どのくらいの範囲で取り組みたいですか？"

各選択肢は：
- 30文字以内で明確
- 幅広く〜深く、まで様々なアプローチを含む
- ユーザーの具体的なアプローチに最適化
- 日本語で自然な表現

JSON形式で回答してください：
[
  { "id": "option1", "label": "選択肢1", "value": "value1", "dataKey": "scope_style" },
  { "id": "option2", "label": "選択肢2", "value": "value2", "dataKey": "scope_style" },
  { "id": "option3", "label": "選択肢3", "value": "value3", "dataKey": "scope_style" },
  { "id": "option4", "label": "選択肢4", "value": "value4", "dataKey": "scope_style" }
]`;
      }

      // Block C1: Goal-specific evidence confirmation methods
      else if (question.id === 'C1') {
        shouldGenerate = true;
        const userGoal = goalText || goalDeepDiveData.goal_text || 'general learning';
        const goalFocus = answers['A1'] || 'general';
        
        prompt = `ユーザーの目標と学習フォーカスに最適化された成果確認方法の選択肢を生成してください：

ユーザーの目標: ${userGoal}
学習フォーカス: ${goalFocus}

質問: "「できた！」をどうやって確認したいですか？"

各選択肢は以下の4つのカテゴリに対応し、ユーザーの目標に合わせてカスタマイズしてください：
1. テスト・試験・スコア重視 (goal_evidence=credential_score)
2. 作品・デモ・ポートフォリオ重視 (goal_evidence=portfolio_demo)
3. 実績・実務・本番重視 (goal_evidence=realworld_result)
4. 発表・レビュー・評価重視 (goal_evidence=presentation_review)

各選択肢は：
- 30文字以内で具体的
- ユーザーの目標と学習フォーカスに最適
- 実際に取り組める現実的な確認方法
- 達成感を感じられる表現

JSON形式で回答してください：
[
  { "id": "credential_score", "label": "選択肢1", "value": "credential_score", "dataKey": "goal_evidence" },
  { "id": "portfolio_demo", "label": "選択肢2", "value": "portfolio_demo", "dataKey": "goal_evidence" },
  { "id": "realworld_result", "label": "選択肢3", "value": "realworld_result", "dataKey": "goal_evidence" },
  { "id": "presentation_review", "label": "選択肢4", "value": "presentation_review", "dataKey": "goal_evidence" }
]`;
      }

      // Block C2: KPI shape questions based on C1
      else if (question.id === 'C2' && answers['C1']) {
        shouldGenerate = true;
        const evidenceType = answers['C1'];
        const userGoal = goalText || goalDeepDiveData.goal_text || 'general learning';
        
        prompt = `あなたは経験豊富なコーチです。ユーザーの個人的な成長目標に最適な測定・評価方法を提案してください。

【ユーザー情報】
目標: ${userGoal}
成果確認方法: ${evidenceType}

【コンテキスト】
ユーザーは「${userGoal}」という目標に向けて取り組んでおり、成果を「${evidenceType}」で確認したいと考えています。

【質問】"どのような基準・指標で成長を測定しますか？"

【要件】
各選択肢は以下の条件を満たしてください：
- ユーザーの目標に直結する具体的な測定指標
- 選択した確認方法（${evidenceType}）と整合性がある
- 短期・中期・長期の異なるアプローチを含む
- ユーザーが実際に達成感を感じられる内容
- 30文字以内で分かりやすい日本語

JSON形式で回答：
[
  { "id": "option1", "label": "選択肢1", "value": "value1", "dataKey": "kpi_shape" },
  { "id": "option2", "label": "選択肢2", "value": "value2", "dataKey": "kpi_shape" },
  { "id": "option3", "label": "選択肢3", "value": "value3", "dataKey": "kpi_shape" },
  { "id": "option4", "label": "選択肢4", "value": "value4", "dataKey": "kpi_shape" }
]`;
      }

      // Block C3: Capstone questions based on C2
      else if (question.id === 'C3' && answers['C2']) {
        shouldGenerate = true;
        const kpiShape = answers['C2'];
        const userGoal = goalText || goalDeepDiveData.goal_text || 'general learning';
        
        prompt = `あなたは成果創出の専門家です。ユーザーの目標達成を最も効果的に実感・活用できる成果物・アウトプット形式を提案してください。

【ユーザー情報】
目標: ${userGoal}  
測定基準: ${kpiShape}

【コンテキスト】
ユーザーは「${userGoal}」に取り組み、「${kpiShape}」という基準で進捗を測定しています。学習の成果を実際に活用し、達成感を味わえる形での仕上げを求めています。

【質問】"どのような形で成果を実現・活用したいですか？"

【要件】
各選択肢は以下を重視してください：
- ユーザーの目標と測定基準に最適化された成果創出方法
- 実生活・実業務で実際に活用できる具体的なアウトプット
- ユーザーが成長を実感し、自信を得られる形式
- 他者との共有や評価も考慮した現実的な選択肢
- 30文字以内で魅力的な日本語表現

JSON形式で回答：
[
  { "id": "option1", "label": "選択肢1", "value": "practical_application", "dataKey": "capstone_type" },
  { "id": "option2", "label": "選択肢2", "value": "creative_output", "dataKey": "capstone_type" },
  { "id": "option3", "label": "選択肢3", "value": "social_contribution", "dataKey": "capstone_type" },
  { "id": "option4", "label": "選択肢4", "value": "personal_milestone", "dataKey": "capstone_type" }
]`;
      }

      if (shouldGenerate) {
        // Use the lower-level OpenAI API directly
        const response = await (openaiService as any).makeRequest('/chat/completions', {
          model: process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'あなたは専門的なライフコーチです。ユーザーの目標に基づいて最適な質問選択肢を生成してください。' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500,
        });

        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[[^\]]*\]/);
        if (jsonMatch) {
          const aiOptions = JSON.parse(jsonMatch[0]);
          setAiGeneratedOptions(prev => ({
            ...prev,
            [question.id]: aiOptions
          }));
          console.log(`🤖 Generated ${aiOptions.length} AI options for ${question.id}`);
        } else {
          console.warn('Could not parse AI response, using fallback options');
        }
      }

    } catch (error) {
      console.error('AI option generation failed:', error);
      // Fall back to static options on error
    } finally {
      setLoadingAiOptions(false);
    }
  };

  // Generate AI options when question changes and requires them
  useEffect(() => {
    const question = currentQuestion;
    console.log(`🔍 AI Generation Check: questionId=${question.id}, needsAI=${['A1', 'A2', 'A3', 'C1', 'C2', 'C3'].includes(question.id)}, alreadyGenerated=${!!aiGeneratedOptions[question.id]}`);
    
    if (['A1', 'A2', 'A3', 'C1', 'C2', 'C3'].includes(question.id) && !aiGeneratedOptions[question.id]) {
      console.log(`🤖 Triggering AI generation for question ${question.id}`);
      generateAiOptions(question, goalDeepDiveData.goal_text);
    }
  }, [currentQuestionIndex, answers]);

  const handleFreeTextChange = (text: string) => {
    setFreeTextAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: text
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      const profileData = {
        answers,
        freeTextAnswers
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
            質問 {currentQuestionIndex + 1} / {QUESTIONS.length}
          </Text>
          <Text style={styles.purposeText}>より良いクエストのために</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>あなたのことを教えてください</Text>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{currentQuestion.question}</Text>
            
            <View style={styles.optionsContainer}>
              {loadingAiOptions && ['A1', 'A2', 'A3', 'C1', 'C2', 'C3'].includes(currentQuestion.id) && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>🤖 目標に応じた質問を生成中...</Text>
                </View>
              )}
              {currentOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  disabled={loadingAiOptions}
                  style={[
                    styles.optionButton,
                    answers[currentQuestion.id] === (option.value || option.label) && styles.selectedOption,
                    loadingAiOptions && styles.disabledOption
                  ]}
                  onPress={() => handleOptionSelect(option.value || option.label)}
                >
                  <Text style={[
                    styles.optionText,
                    answers[currentQuestion.id] === (option.value || option.label) && styles.selectedOptionText
                  ]}>
                    {option.label || option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Free Text Input */}
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
          </View>

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
  disabledOption: {
    opacity: 0.5,
    backgroundColor: '#e9ecef',
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 231, 201, 0.1)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3E7C9',
  },
  loadingText: {
    color: '#F3E7C9',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});