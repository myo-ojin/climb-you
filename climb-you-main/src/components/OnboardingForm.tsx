/**
 * Onboarding Form - Minimal input for high-resolution profiling
 * Based on climb_you_プロファイリング精度最大化プロンプト v1.0
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
import { InputSanitizer } from '../utils/inputSanitizer';

const { width } = Dimensions.get('window');

// Colors matching existing onboarding screens
const colors = {
  NightSky: '#0F2A44',
  Moonlight: '#F3E7C9',
  white: '#fff',
  text: '#333',
  textSecondary: '#666',
  textOnNight: '#fff',
  placeholder: '#999',
  inactive: 'rgba(243, 231, 201, 0.3)',
  cardBackground: 'rgba(255, 255, 255, 0.9)',
};

// Enhanced input contract with category, importance, and milestones
interface OnboardingInputs {
  goal_text: string;
  goal_category: 'learning' | 'career' | 'health' | 'skill' | 'creative' | 'other';
  goal_deadline: string; // Either preset (1m/3m/6m/12m+) or custom YYYY-MM-DD
  goal_importance: 1 | 2 | 3 | 4 | 5; // Importance level
  goal_motivation: 'low' | 'mid' | 'high';
  time_budget_min_per_day: number; // Either preset or custom number
  preferred_session_length_min: number; // 10..60
  env_constraints: string[]; // Optional
  modality_preference: ('dialog' | 'read' | 'audio' | 'video')[]; // Optional
  avoid_modality: ('dialog' | 'read' | 'audio' | 'video')[]; // Optional - modalities to avoid
}

// Enhanced goal data structure for internal processing
interface EnhancedGoalData extends OnboardingInputs {
  milestones?: string[]; // Auto-generated milestones
  timeframe_months?: number; // Parsed timeframe
}

interface OnboardingFormProps {
  onComplete: (inputs: OnboardingInputs) => void;
  onBack?: () => void;
  initialData?: Partial<OnboardingInputs>;
}

const GOAL_CATEGORY_OPTIONS = [
  { id: 'learning', label: '学習・勉強', subtitle: '語学、資格、知識習得など', icon: '📚' },
  { id: 'career', label: 'キャリア', subtitle: '転職、昇進、スキルアップなど', icon: '💼' },
  { id: 'health', label: '健康・運動', subtitle: 'ダイエット、筋トレ、運動習慣など', icon: '💪' },
  { id: 'skill', label: '技術・スキル', subtitle: 'プログラミング、デザイン、楽器など', icon: '🛠️' },
  { id: 'creative', label: '創作・趣味', subtitle: '絵画、音楽、ライティングなど', icon: '🎨' },
  { id: 'other', label: 'その他', subtitle: '上記以外の目標', icon: '✨' },
] as const;

const MOTIVATION_OPTIONS = [
  { id: 'low', label: 'ゆっくり', subtitle: 'マイペースで進めたい' },
  { id: 'mid', label: 'バランス', subtitle: '着実に成長したい' },
  { id: 'high', label: '積極的', subtitle: '集中して早く達成したい' },
] as const;

const IMPORTANCE_OPTIONS = [
  { level: 1, label: '興味程度', subtitle: '時間があるときに', color: '#9CA3AF' },
  { level: 2, label: '低い', subtitle: 'できれば達成したい', color: '#6B7280' },
  { level: 3, label: '普通', subtitle: 'しっかり取り組みたい', color: '#F59E0B' },
  { level: 4, label: '高い', subtitle: '必ず達成したい', color: '#EF4444' },
  { level: 5, label: '最重要', subtitle: '人生を変える目標', color: '#DC2626' },
] as const;

const DEADLINE_OPTIONS = [
  { id: '1m', label: '1ヶ月', subtitle: '短期集中' },
  { id: '3m', label: '3ヶ月', subtitle: 'バランス' },
  { id: '6m', label: '6ヶ月', subtitle: 'じっくり' },
  { id: '12m+', label: '1年以上', subtitle: '長期継続' },
  { id: 'custom', label: 'カスタム', subtitle: '具体的な日付を入力' },
] as const;

const TIME_BUDGET_OPTIONS = [
  { value: 15, label: '15分/日' },
  { value: 25, label: '25分/日' },
  { value: 40, label: '40分/日' },
  { value: 60, label: '1時間/日' },
  { value: 90, label: '1.5時間/日' },
  { value: 120, label: '2時間/日' },
] as const;

const ENV_CONSTRAINT_OPTIONS = [
  { id: 'home', label: '自宅' },
  { id: 'commute', label: '通勤中' },
  { id: 'office', label: '職場' },
  { id: 'audio_ng', label: '音声不可' },
];

const MODALITY_OPTIONS = [
  { id: 'dialog', label: '対話' },
  { id: 'read', label: '読書' },
  { id: 'audio', label: '音声' },
  { id: 'video', label: '動画' },
];


export const OnboardingForm: React.FC<OnboardingFormProps> = ({
  onComplete,
  onBack,
  initialData = {},
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [inputs, setInputs] = useState<Partial<OnboardingInputs>>({
    goal_text: '',
    goal_category: 'learning',
    goal_deadline: '3m',
    goal_importance: 3,
    goal_motivation: 'mid',
    time_budget_min_per_day: 60,
    preferred_session_length_min: 25,
    env_constraints: [],
    modality_preference: [],
    avoid_modality: [],
    ...initialData,
  });

  // Additional state for custom inputs
  const [customDeadline, setCustomDeadline] = useState('');
  const [customTimeBudget, setCustomTimeBudget] = useState('');
  
  // Goal validation state
  const [goalValidation, setGoalValidation] = useState<{
    isValid: boolean;
    errorMessage?: string;
  }>({ isValid: true });

  const steps = [
    { title: '目標を設定しましょう', subtitle: '山頂を目指して一緒に登りましょう！' },
    { title: '達成期間を選択', subtitle: 'いつまでに目標を達成したいですか？' },
    { title: '学習時間の設定', subtitle: '継続できる時間を決めましょう' },
    { title: '最終設定', subtitle: '学習環境を整えましょう（任意）' },
  ];

  const totalSteps = steps.length;
  const globalStep = currentStep + 1; // Current step within goal setting
  const progress = (globalStep / totalSteps) * 100; // Progress within goal setting phase

  const updateInput = <K extends keyof OnboardingInputs>(
    field: K,
    value: OnboardingInputs[K]
  ) => {
    setInputs(prev => ({ ...prev, [field]: value }));
    
    // Real-time validation for goal text
    if (field === 'goal_text') {
      const validation = InputSanitizer.validateAndSanitizeGoalText(value as string);
      setGoalValidation({
        isValid: validation.isValid,
        errorMessage: validation.userMessage
      });
    }
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      // Goal text validation
      const validation = InputSanitizer.validateAndSanitizeGoalText(inputs.goal_text || '');
      if (!validation.isValid) {
        setGoalValidation({
          isValid: false,
          errorMessage: validation.userMessage
        });
        return;
      }
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final validation before completion
      const goalValidation = InputSanitizer.validateAndSanitizeGoalText(inputs.goal_text || '');
      if (!goalValidation.isValid) {
        Alert.alert('入力エラー', goalValidation.userMessage);
        return;
      }
      if (!inputs.goal_category) {
        Alert.alert('入力エラー', '目標カテゴリを選択してください。');
        return;
      }
      if (!inputs.goal_importance) {
        Alert.alert('入力エラー', '重要度レベルを選択してください。');
        return;
      }
      if (!inputs.goal_deadline) {
        Alert.alert('入力エラー', '期日を設定してください。');
        return;
      }

      // Handle custom inputs
      let finalDeadline = inputs.goal_deadline!;
      if (finalDeadline === 'custom') {
        if (!customDeadline.trim()) {
          Alert.alert('入力エラー', 'カスタム期日を入力してください。');
          return;
        }
        finalDeadline = customDeadline.trim();
      }

      let finalTimeBudget = inputs.time_budget_min_per_day!;
      if (customTimeBudget) {
        const customTime = parseInt(customTimeBudget);
        if (customTime && customTime > 0) {
          finalTimeBudget = customTime;
        }
      }

      // Convert to final contract format
      const finalInputs: OnboardingInputs = {
        goal_text: inputs.goal_text!.trim(),
        goal_category: inputs.goal_category!,
        goal_deadline: finalDeadline,
        goal_importance: inputs.goal_importance!,
        goal_motivation: inputs.goal_motivation!,
        time_budget_min_per_day: finalTimeBudget,
        preferred_session_length_min: inputs.preferred_session_length_min!,
        env_constraints: inputs.env_constraints!,
        modality_preference: inputs.modality_preference!,
        avoid_modality: inputs.avoid_modality!,
      };

      onComplete(finalInputs);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      onBack?.();
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0: // Goal text + motivation (remove motivation)
        return goalValidation.isValid && !!inputs.goal_text?.trim();
      case 1: // Deadline only  
        if (inputs.goal_deadline === 'custom') {
          return !!customDeadline.trim();
        }
        return !!inputs.goal_deadline;
      case 2: // Time settings
        return !!inputs.time_budget_min_per_day && !!inputs.preferred_session_length_min;
      case 3: // Environment (optional)
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Goal Input Only
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>具体的な目標</Text>
              <TextInput
                style={[
                  styles.goalInput,
                  !goalValidation.isValid && styles.goalInputError
                ]}
                value={inputs.goal_text || ''}
                onChangeText={(text) => updateInput('goal_text', text)}
                placeholder="例：英語を話せるようになりたい、プログラミングを学習したい"
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={3}
              />
              {!goalValidation.isValid && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>
                    {goalValidation.errorMessage}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 1: // Deadline Selection
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>達成期間を選択</Text>
            <Text style={styles.stepSubtitle}>いつまでに目標を達成したいですか？</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>達成期間</Text>
              <View style={styles.optionsContainer}>
                {DEADLINE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      inputs.goal_deadline === option.id && styles.optionCardSelected,
                    ]}
                    onPress={() => updateInput('goal_deadline', option.id)}
                  >
                    <Text style={[
                      styles.optionLabel,
                      inputs.goal_deadline === option.id && styles.optionLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[
                      styles.optionSubtitle,
                      inputs.goal_deadline === option.id && styles.optionSubtitleSelected,
                    ]}>
                      {option.subtitle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {inputs.goal_deadline === 'custom' && (
                <TextInput
                  style={styles.dateInput}
                  value={customDeadline}
                  onChangeText={setCustomDeadline}
                  placeholder="YYYY-MM-DD (例: 2025-12-31)"
                  placeholderTextColor={colors.placeholder}
                />
              )}
            </View>
          </View>
        );

      case 2: // Time Settings
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepSubtitle}>{steps[currentStep].subtitle}</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>1日の学習時間</Text>
              <View style={styles.timeBudgetContainer}>
                {TIME_BUDGET_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeBudgetOption,
                      inputs.time_budget_min_per_day === option.value && styles.timeBudgetOptionSelected,
                    ]}
                    onPress={() => {
                      updateInput('time_budget_min_per_day', option.value);
                      setCustomTimeBudget(''); // Clear custom input when selecting preset
                    }}
                  >
                    <Text style={[
                      styles.timeBudgetLabel,
                      inputs.time_budget_min_per_day === option.value && styles.timeBudgetLabelSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputLabel}>または、分数を直接入力：</Text>
                <TextInput
                  style={styles.numberInput}
                  value={customTimeBudget}
                  onChangeText={(text) => {
                    setCustomTimeBudget(text);
                    // Clear preset selection when typing custom value
                    if (text) {
                      updateInput('time_budget_min_per_day', 0);
                    }
                  }}
                  keyboardType="numeric"
                  placeholder="例: 45"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>理想のセッション長（分）</Text>
              <TextInput
                style={styles.numberInput}
                value={inputs.preferred_session_length_min?.toString() || '25'}
                onChangeText={(text) => {
                  const num = Math.max(10, Math.min(60, parseInt(text) || 25));
                  updateInput('preferred_session_length_min', num);
                }}
                keyboardType="numeric"
                placeholder="25"
                placeholderTextColor={colors.placeholder}
              />
            </View>
          </View>
        );

      case 3: // Environment (Optional)
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepSubtitle}>学習環境の制約や好みを設定（すべて任意）</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>環境制約</Text>
              <View style={styles.multiSelectContainer}>
                {ENV_CONSTRAINT_OPTIONS.map((option) => {
                  const isSelected = inputs.env_constraints?.includes(option.id) || false;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.multiSelectOption,
                        isSelected && styles.multiSelectOptionSelected,
                      ]}
                      onPress={() => {
                        const current = inputs.env_constraints || [];
                        const newSelection = isSelected
                          ? current.filter(id => id !== option.id)
                          : [...current, option.id];
                        updateInput('env_constraints', newSelection);
                      }}
                    >
                      <Text style={[
                        styles.multiSelectLabel,
                        isSelected && styles.multiSelectLabelSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>学習方法の好み</Text>
              <View style={styles.multiSelectContainer}>
                {MODALITY_OPTIONS.map((option) => {
                  const isSelected = inputs.modality_preference?.includes(option.id as any) || false;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.multiSelectOption,
                        isSelected && styles.multiSelectOptionSelected,
                      ]}
                      onPress={() => {
                        const current = inputs.modality_preference || [];
                        const newSelection = isSelected
                          ? current.filter(id => id !== option.id)
                          : [...current, option.id as any];
                        updateInput('modality_preference', newSelection);
                      }}
                    >
                      <Text style={[
                        styles.multiSelectLabel,
                        isSelected && styles.multiSelectLabelSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>避けたい学習方法</Text>
              <View style={styles.multiSelectContainer}>
                {MODALITY_OPTIONS.map((option) => {
                  const isSelected = inputs.avoid_modality?.includes(option.id as any) || false;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.multiSelectOption,
                        isSelected && styles.multiSelectOptionSelected,
                      ]}
                      onPress={() => {
                        const current = inputs.avoid_modality || [];
                        const newSelection = isSelected
                          ? current.filter(id => id !== option.id)
                          : [...current, option.id as any];
                        updateInput('avoid_modality', newSelection);
                      }}
                    >
                      <Text style={[
                        styles.multiSelectLabel,
                        isSelected && styles.multiSelectLabelSelected,
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepText}>
            Step 1 / 3
          </Text>
          <Text style={styles.subStepText}>
            目標設定 {globalStep + 2} / 5
          </Text>
        </View>

        {renderStep()}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton]}
          onPress={handlePrevious}
        >
          <Text style={[styles.navButtonText, styles.prevButtonText]}>
            {currentStep === 0 ? '戻る' : '前へ'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            isStepValid() && styles.nextButtonEnabled,
          ]}
          onPress={handleNext}
          disabled={!isStepValid()}
        >
          <Text
            style={[
              styles.navButtonText,
              styles.nextButtonText,
              isStepValid() && styles.nextButtonTextEnabled,
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
    paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  progressContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.Moonlight,
    borderRadius: 4,
  },
  stepText: {
    color: colors.textOnNight,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  subStepText: {
    color: colors.textOnNight,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
    marginTop: 4,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textOnNight,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 20,
  },
  stepSubtitle: {
    fontSize: 16,
    color: colors.textOnNight,
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.9,
  },
  inputContainer: {
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textOnNight,
    marginBottom: 16,
  },
  goalInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalInputError: {
    borderColor: '#FF6B6B',
    borderWidth: 2,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.3,
  },
  errorContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  dateInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 12,
  },
  numberInput: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCardSelected: {
    backgroundColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: colors.NightSky,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionSubtitleSelected: {
    color: colors.NightSky,
    fontWeight: '600',
  },
  timeBudgetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeBudgetOption: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: width / 3.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeBudgetOptionSelected: {
    backgroundColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  timeBudgetLabel: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  timeBudgetLabelSelected: {
    color: colors.NightSky,
    fontWeight: '600',
  },
  customInputContainer: {
    marginTop: 16,
    gap: 8,
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textOnNight,
    marginBottom: 8,
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiSelectOption: {
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  multiSelectOptionSelected: {
    backgroundColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  multiSelectLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  multiSelectLabelSelected: {
    color: colors.NightSky,
    fontWeight: '600',
  },
  navigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: colors.NightSky,
  },
  navButton: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  prevButton: {
    backgroundColor: '#1E3A4B',
    borderWidth: 1,
    borderColor: '#B9C3CF',
    flex: 1,
  },
  nextButton: {
    backgroundColor: colors.inactive,
    borderWidth: 1,
    borderColor: colors.Moonlight,
    flex: 2,
  },
  nextButtonEnabled: {
    backgroundColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  prevButtonText: {
    color: colors.Moonlight,
  },
  nextButtonText: {
    color: colors.Moonlight,
  },
  nextButtonTextEnabled: {
    color: colors.NightSky,
  },
  // Category selection styles
  categoryCard: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
    minHeight: 100,
  },
  categoryCardSelected: {
    backgroundColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.NightSky,
  },
  categorySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categorySubtitleSelected: {
    color: colors.NightSky,
    fontWeight: '500',
  },
  // Importance selection styles
  importanceContainer: {
    gap: 12,
  },
  importanceOption: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  importanceOptionSelected: {
    backgroundColor: colors.Moonlight,
    borderColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  importanceLevelContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  importanceLevel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  importanceLevelSelected: {
    color: colors.NightSky,
  },
  importanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  importanceLabelSelected: {
    color: colors.NightSky,
  },
  importanceSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 2,
  },
  importanceSubtitleSelected: {
    color: colors.NightSky,
    fontWeight: '500',
  },
});