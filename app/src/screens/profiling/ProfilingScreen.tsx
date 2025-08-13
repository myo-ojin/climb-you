import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { ProfilingService } from '../../services/profilingService';
import { 
  ProfilingData, 
  LearningGoal, 
  AgeRange, 
  AGE_RANGE_OPTIONS,
  GOAL_CATEGORY_OPTIONS,
  LearningStyleAnalysis 
} from '../../types/profiling';
import { LEARNING_STYLE_QUESTIONS, analyzeLearningStyle } from '../../data/learningStyleQuestions';
import { ProgressIndicator } from '../../components/ui/ProgressIndicator';
import { FormField } from '../../components/ui/FormField';
import { OptionButton } from '../../components/ui/OptionButton';

const STEP_TITLES = [
  '基本情報の入力',
  '学習目標の設定', 
  '学習スタイル診断',
  'AI分析中...',
  '分析結果'
];

interface ProfilingFormData {
  ageRange: AgeRange | null;
  availableTimePerDay: string;
  goals: LearningGoal[];
  learningStyleAnswers: Array<{ questionId: string; selectedOptions: string[] }>;
}

export const ProfilingScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [formData, setFormData] = useState<ProfilingFormData>({
    ageRange: null,
    availableTimePerDay: '',
    goals: [],
    learningStyleAnswers: [],
  });

  // New goal form
  const [newGoal, setNewGoal] = useState<{
    category: 'language' | 'skill' | 'certification' | 'academic' | 'personal' | 'other';
    title: string;
    description: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
  }>({
    category: 'language',
    title: '',
    description: '',
    importance: 'medium',
  });

  const profilingService = new ProfilingService();

  const handleStepNext = useCallback(() => {
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleStepBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleAddGoal = useCallback(() => {
    if (!newGoal.title.trim()) {
      Alert.alert('エラー', '目標のタイトルを入力してください');
      return;
    }

    const goal: LearningGoal = {
      category: newGoal.category,
      title: newGoal.title.trim(),
      description: newGoal.description.trim() || undefined,
      importance: newGoal.importance,
    };

    setFormData(prev => ({
      ...prev,
      goals: [...prev.goals, goal],
    }));

    // Reset form
    setNewGoal({
      category: 'language',
      title: '',
      description: '',
      importance: 'medium',
    });
  }, [newGoal]);

  const handleRemoveGoal = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }));
  }, []);

  const handleLearningStyleAnswer = useCallback((questionId: string, optionId: string, multiSelect: boolean) => {
    setFormData(prev => {
      const existingAnswer = prev.learningStyleAnswers.find(a => a.questionId === questionId);
      
      if (existingAnswer) {
        if (multiSelect) {
          // Toggle selection for multi-select
          const newOptions = existingAnswer.selectedOptions.includes(optionId)
            ? existingAnswer.selectedOptions.filter(id => id !== optionId)
            : [...existingAnswer.selectedOptions, optionId];
          
          return {
            ...prev,
            learningStyleAnswers: prev.learningStyleAnswers.map(a =>
              a.questionId === questionId ? { ...a, selectedOptions: newOptions } : a
            ),
          };
        } else {
          // Replace selection for single-select
          return {
            ...prev,
            learningStyleAnswers: prev.learningStyleAnswers.map(a =>
              a.questionId === questionId ? { ...a, selectedOptions: [optionId] } : a
            ),
          };
        }
      } else {
        // Add new answer
        return {
          ...prev,
          learningStyleAnswers: [
            ...prev.learningStyleAnswers,
            { questionId, selectedOptions: [optionId] },
          ],
        };
      }
    });
  }, []);

  const handleAnalyzeProfile = useCallback(async () => {
    if (!user) {
      Alert.alert('エラー', 'ユーザー情報が見つかりません');
      return;
    }

    try {
      setIsAnalyzing(true);
      setCurrentStep(4); // Move to analysis step

      // Analyze learning style from answers
      const styleAnalysis = analyzeLearningStyle(formData.learningStyleAnswers);

      // Create profiling data
      const profilingData: ProfilingData = {
        ageRange: formData.ageRange!,
        availableTimePerDay: parseInt(formData.availableTimePerDay),
        goals: formData.goals,
        learningStyleAnswers: formData.learningStyleAnswers.map(answer => ({
          questionId: answer.questionId,
          selectedOptions: answer.selectedOptions,
        })),
        motivation: styleAnalysis.motivation,
        pace: styleAnalysis.pace,
        obstacles: styleAnalysis.obstacles,
        completedAt: new Date().toISOString(),
        version: '1.0',
      };

      // Analyze with AI
      const analysis = await profilingService.analyzeProfile(profilingData);
      
      // Save to Firestore
      await profilingService.saveProfileAnalysis(user.id, profilingData, analysis);

      // Move to results step
      setCurrentStep(5);

    } catch (error) {
      console.error('Profile analysis failed:', error);
      Alert.alert(
        'エラー',
        'プロファイル分析に失敗しました。ネットワーク接続を確認して、もう一度お試しください。',
        [
          { text: 'OK', onPress: () => setCurrentStep(3) } // Go back to step 3
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, formData, navigation, profilingService]);

  const canProceedFromStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return formData.ageRange !== null && 
               formData.availableTimePerDay !== '' && 
               parseInt(formData.availableTimePerDay) > 0;
      case 2:
        return formData.goals.length > 0;
      case 3:
        return formData.learningStyleAnswers.length >= 3; // At least 3 questions answered
      default:
        return true;
    }
  }, [formData]);

  if (currentStep === 4 && isAnalyzing) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <View className="items-center">
          <Text className="text-2xl mb-4">🤖</Text>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            AI分析中...
          </Text>
          <Text className="text-base text-gray-600 mt-2 text-center">
            あなたの学習スタイルを分析しています{'\n'}
            少々お待ちください
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6 pt-6">
        <ProgressIndicator 
          currentStep={currentStep} 
          totalSteps={5}
          stepTitles={STEP_TITLES}
        />

        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-6">
              基本情報を教えてください
            </Text>

            {/* Age Range */}
            <Text className="text-base font-semibold text-gray-900 mb-3">
              年齢層 <Text className="text-red-500">*</Text>
            </Text>
            {AGE_RANGE_OPTIONS.map((option) => (
              <OptionButton
                key={option.value}
                label={option.label}
                selected={formData.ageRange === option.value}
                onPress={() => setFormData(prev => ({ ...prev, ageRange: option.value }))}
              />
            ))}

            {/* Available Time */}
            <FormField
              label="1日の学習可能時間"
              placeholder="例: 60"
              value={formData.availableTimePerDay}
              onChangeText={(text) => setFormData(prev => ({ ...prev, availableTimePerDay: text }))}
              keyboardType="numeric"
              required
              description="分単位で入力してください（例: 60分 → 60）"
            />
          </View>
        )}

        {/* Step 2: Goals */}
        {currentStep === 2 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-6">
              学習目標を設定してください
            </Text>

            {/* Existing Goals */}
            {formData.goals.map((goal, index) => (
              <View key={index} className="bg-gray-50 p-4 rounded-lg mb-3">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">{goal.title}</Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      {GOAL_CATEGORY_OPTIONS.find(c => c.value === goal.category)?.label} | 重要度: {goal.importance}
                    </Text>
                    {goal.description && (
                      <Text className="text-sm text-gray-600 mt-1">{goal.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveGoal(index)}
                    className="ml-3 p-1"
                  >
                    <Text className="text-red-500 text-lg">×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Add New Goal */}
            <View className="border border-gray-200 p-4 rounded-lg">
              <Text className="font-semibold text-gray-900 mb-3">新しい目標を追加</Text>
              
              {/* Category */}
              <Text className="text-sm font-medium text-gray-700 mb-2">カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                {GOAL_CATEGORY_OPTIONS.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    onPress={() => setNewGoal(prev => ({ ...prev, category: category.value }))}
                    className={`mr-3 px-3 py-2 rounded-full border ${
                      newGoal.category === category.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    <Text className={`text-sm ${
                      newGoal.category === category.value ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {category.icon} {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <FormField
                label="目標のタイトル"
                placeholder="例: TOEIC 800点を取得する"
                value={newGoal.title}
                onChangeText={(text) => setNewGoal(prev => ({ ...prev, title: text }))}
              />

              <FormField
                label="詳細（任意）"
                placeholder="目標についての詳細説明"
                value={newGoal.description}
                onChangeText={(text) => setNewGoal(prev => ({ ...prev, description: text }))}
                multiline
              />

              <TouchableOpacity
                onPress={handleAddGoal}
                className="bg-blue-500 py-3 rounded-lg items-center"
              >
                <Text className="text-white font-semibold">目標を追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Learning Style Questions */}
        {currentStep === 3 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-6">
              学習スタイル診断
            </Text>

            {LEARNING_STYLE_QUESTIONS.map((question, questionIndex) => {
              const userAnswer = formData.learningStyleAnswers.find(a => a.questionId === question.id);
              const isMultiSelect = question.type === 'multiple_choice';

              return (
                <View key={question.id} className="mb-8">
                  <Text className="text-base font-semibold text-gray-900 mb-4">
                    Q{questionIndex + 1}. {question.question}
                  </Text>

                  {question.options.map((option) => (
                    <OptionButton
                      key={option.id}
                      label={option.text}
                      selected={userAnswer?.selectedOptions.includes(option.id) || false}
                      onPress={() => handleLearningStyleAnswer(question.id, option.id, isMultiSelect)}
                      multiSelect={isMultiSelect}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      {currentStep <= 3 && (
        <View className="p-6 border-t border-gray-200">
          <View className="flex-row justify-between">
            <TouchableOpacity
              onPress={handleStepBack}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg ${
                currentStep === 1 ? 'bg-gray-200' : 'bg-gray-500'
              }`}
            >
              <Text className={`font-semibold ${
                currentStep === 1 ? 'text-gray-400' : 'text-white'
              }`}>
                戻る
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={currentStep === 3 ? handleAnalyzeProfile : handleStepNext}
              disabled={!canProceedFromStep(currentStep)}
              className={`px-6 py-3 rounded-lg ${
                canProceedFromStep(currentStep) ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <Text className={`font-semibold ${
                canProceedFromStep(currentStep) ? 'text-white' : 'text-gray-500'
              }`}>
                {currentStep === 3 ? 'AI分析開始' : '次へ'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};