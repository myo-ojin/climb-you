/**
 * Goal Deep Dive Component - Phase 2: Profiling Features
 * NightSky/Moonlight design system integration
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { GoalDeepDiveAnswers, GoalDeepDiveAnswersSchema } from '../types/questGeneration';

const { width, height } = Dimensions.get('window');

interface GoalDeepDiveProps {
  onComplete: (answers: GoalDeepDiveAnswers) => void;
  onBack?: () => void;
  initialData?: Partial<GoalDeepDiveAnswers>;
}

// Color scheme from existing onboarding
const colors = {
  NightSky: '#0F2A44',
  DeepPine: '#1E3A4B', 
  Moonlight: '#F3E7C9',
  Mist: '#B9C3CF',
  accent: '#4A90E2',
  success: '#4CAF50',
};

const goalQuestions = {
  goal_focus: {
    title: '目標の主軸',
    question: 'この目標で最も重視するのは何ですか？',
    options: [
      { id: 'knowledge', label: '知識習得', subtitle: '理論や概念の理解' },
      { id: 'skill', label: 'スキル習得', subtitle: '実践的な能力開発' },
      { id: 'outcome', label: '成果創出', subtitle: '具体的な結果や成果物' },
      { id: 'habit', label: '習慣形成', subtitle: '継続的な行動パターン' },
    ],
  },
  goal_horizon: {
    title: '達成期間',
    question: 'どのくらいの期間で達成したいですか？',
    options: [
      { id: '1m', label: '1ヶ月', subtitle: '集中的な短期目標' },
      { id: '3m', label: '3ヶ月', subtitle: 'バランスの取れた期間' },
      { id: '6m', label: '6ヶ月', subtitle: 'じっくり深く学習' },
      { id: '12m+', label: '1年以上', subtitle: '長期的な成長目標' },
    ],
  },
  goal_tradeoff: {
    title: '重視するバランス',
    question: '学習において何を重視しますか？',
    options: [
      { id: 'quality', label: '品質重視', subtitle: '深く理解することを優先' },
      { id: 'speed', label: 'スピード重視', subtitle: '早く多くを学ぶことを優先' },
      { id: 'balance', label: 'バランス重視', subtitle: '品質と速度のバランス' },
      { id: 'experiment', label: '実験重視', subtitle: '試行錯誤を通じた学習' },
    ],
  },
  goal_evidence: {
    title: '成果の示し方',
    question: '目標達成をどのように示したいですか？',
    options: [
      { id: 'credential_score', label: '資格・スコア', subtitle: '検定や試験での証明' },
      { id: 'portfolio_demo', label: 'ポートフォリオ', subtitle: '作品や成果物で証明' },
      { id: 'realworld_result', label: '実世界での結果', subtitle: '実際の問題解決や改善' },
      { id: 'presentation_review', label: '発表・レビュー', subtitle: 'プレゼンや評価による証明' },
    ],
  },
};

export const GoalDeepDive: React.FC<GoalDeepDiveProps> = ({
  onComplete,
  onBack,
  initialData = {},
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<GoalDeepDiveAnswers>>(initialData);
  
  const questions = Object.entries(goalQuestions);
  const totalSteps = questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleAnswer = (questionKey: string, choice: string, note?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionKey]: {
        choice,
        note: note || '',
      },
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // 完了時のバリデーション
      try {
        const validatedAnswers = GoalDeepDiveAnswersSchema.parse(answers);
        onComplete(validatedAnswers);
      } catch (error) {
        Alert.alert('入力エラー', '全ての質問にお答えください。');
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack?.();
    }
  };

  const [questionKey, questionData] = questions[currentStep];
  const currentAnswer = answers[questionKey as keyof GoalDeepDiveAnswers];
  const isAnswered = !!currentAnswer?.choice;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepText}>
            ステップ {currentStep + 1} / {totalSteps}
          </Text>
        </View>

        {/* Question Section */}
        <View style={styles.questionSection}>
          <Text style={styles.questionCategory}>{questionData.title}</Text>
          <Text style={styles.questionText}>{questionData.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {questionData.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                currentAnswer?.choice === option.id && styles.optionCardSelected,
              ]}
              onPress={() => handleAnswer(questionKey, option.id)}
            >
              <View style={styles.optionContent}>
                <Text
                  style={[
                    styles.optionLabel,
                    currentAnswer?.choice === option.id && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.optionSubtitle,
                    currentAnswer?.choice === option.id && styles.optionSubtitleSelected,
                  ]}
                >
                  {option.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Note Input */}
        {isAnswered && (
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>追加コメント（任意）</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="具体的な理由や詳細があれば記入してください"
              placeholderTextColor={colors.Mist}
              value={currentAnswer?.note || ''}
              onChangeText={(text) => 
                handleAnswer(questionKey, currentAnswer!.choice, text)
              }
              maxLength={120}
              multiline
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton]}
          onPress={handlePrevious}
        >
          <Text style={styles.navButtonText}>
            {currentStep === 0 ? '戻る' : '前へ'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            isAnswered && styles.nextButtonEnabled,
          ]}
          onPress={handleNext}
          disabled={!isAnswered}
        >
          <Text
            style={[
              styles.navButtonText,
              styles.nextButtonText,
              isAnswered && styles.nextButtonTextEnabled,
            ]}
          >
            {currentStep === totalSteps - 1 ? '完了' : '次へ'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.NightSky,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.DeepPine,
    borderRadius: 2,
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  stepText: {
    fontSize: 14,
    color: colors.Mist,
    textAlign: 'center',
  },
  questionSection: {
    marginBottom: 32,
  },
  questionCategory: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 20,
    color: colors.Moonlight,
    fontWeight: '500',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.DeepPine,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
  },
  optionContent: {
    gap: 4,
  },
  optionLabel: {
    fontSize: 18,
    color: colors.Moonlight,
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.Mist,
    lineHeight: 20,
  },
  optionSubtitleSelected: {
    color: colors.Moonlight,
  },
  noteSection: {
    marginTop: 32,
  },
  noteLabel: {
    fontSize: 16,
    color: colors.Moonlight,
    fontWeight: '500',
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: colors.DeepPine,
    borderRadius: 8,
    padding: 16,
    color: colors.Moonlight,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.NightSky,
    borderTopWidth: 1,
    borderTopColor: colors.DeepPine,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
  },
  prevButton: {
    backgroundColor: colors.DeepPine,
  },
  nextButton: {
    backgroundColor: colors.Mist,
  },
  nextButtonEnabled: {
    backgroundColor: colors.accent,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  nextButtonText: {
    color: colors.DeepPine,
  },
  nextButtonTextEnabled: {
    color: colors.Moonlight,
  },
});