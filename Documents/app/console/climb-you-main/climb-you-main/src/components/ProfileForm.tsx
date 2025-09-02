/**
 * Profile Form Component - Phase 2: Profiling Features
 * ProfileV1 data collection with comprehensive UI
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
  Switch,
} from 'react-native';
import { ProfileV1, ProfileV1Schema } from '../types/questGeneration';

const { width } = Dimensions.get('window');

interface ProfileFormProps {
  onComplete: (profile: ProfileV1) => void;
  onBack?: () => void;
  initialData?: Partial<ProfileV1>;
}

const colors = {
  NightSky: '#0F2A44',
  DeepPine: '#1E3A4B', 
  Moonlight: '#F3E7C9',
  Mist: '#B9C3CF',
  accent: '#4A90E2',
  success: '#4CAF50',
  warning: '#FF9500',
};

const profileSections = {
  time_management: {
    title: '時間管理',
    fields: ['time_budget_min_per_day', 'peak_hours', 'preferred_session_length_min', 'weekly_minimum_commitment_min'],
  },
  learning_style: {
    title: '学習スタイル',
    fields: ['motivation_style', 'difficulty_tolerance', 'novelty_preference', 'pace_preference'],
  },
  preferences: {
    title: '学習環境設定',
    fields: ['modality_preference', 'deliverable_preferences'],
  },
  goals_and_level: {
    title: '目標とレベル',
    fields: ['long_term_goal', 'current_level_tags', 'priority_areas', 'goal_motivation'],
  },
  constraints: {
    title: '制約条件',
    fields: ['env_constraints', 'hard_constraints', 'risk_factors'],
  },
  misc: {
    title: 'その他',
    fields: ['heat_level'],
  },
};

const fieldConfig = {
  time_budget_min_per_day: {
    label: '1日の学習時間（分）',
    type: 'number',
    min: 15,
    max: 240,
    placeholder: '60',
  },
  peak_hours: {
    label: '集中できる時間帯',
    type: 'multi_select',
    options: Array.from({ length: 24 }, (_, i) => ({ id: i, label: `${i}:00` })),
  },
  preferred_session_length_min: {
    label: '理想のセッション長（分）',
    type: 'number',
    min: 10,
    max: 60,
    placeholder: '25',
  },
  weekly_minimum_commitment_min: {
    label: '週間最小学習時間（分）',
    type: 'number',
    min: 60,
    max: 600,
    placeholder: '180',
  },
  motivation_style: {
    label: 'モチベーションスタイル',
    type: 'single_select',
    options: [
      { id: 'push', label: 'プッシュ型', subtitle: '積極的に挑戦する' },
      { id: 'pull', label: 'プル型', subtitle: '興味に引かれて学ぶ' },
      { id: 'social', label: 'ソーシャル型', subtitle: '仲間と一緒に学ぶ' },
    ],
  },
  difficulty_tolerance: {
    label: '難易度許容度（0-1）',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.1,
    default: 0.6,
  },
  novelty_preference: {
    label: '新規性選好度（0-1）',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.1,
    default: 0.5,
  },
  pace_preference: {
    label: '学習ペース',
    type: 'single_select',
    options: [
      { id: 'sprint', label: 'スプリント', subtitle: '短期集中型' },
      { id: 'cadence', label: 'ケイデンス', subtitle: '継続安定型' },
    ],
  },
  modality_preference: {
    label: '学習方法の選好',
    type: 'multi_select',
    options: [
      { id: 'read', label: '読書' },
      { id: 'video', label: '動画' },
      { id: 'audio', label: '音声' },
      { id: 'dialog', label: '対話' },
      { id: 'mimesis', label: '実践' },
    ],
  },
  deliverable_preferences: {
    label: '成果物の選好',
    type: 'multi_select',
    options: [
      { id: 'note', label: 'ノート' },
      { id: 'flashcards', label: 'フラッシュカード' },
      { id: 'snippet', label: 'コードスニペット' },
      { id: 'mini_task', label: 'ミニタスク' },
      { id: 'past_paper', label: '過去問題' },
    ],
  },
  long_term_goal: {
    label: '長期目標（任意）',
    type: 'text',
    maxLength: 240,
    placeholder: '1年後の目標を記入してください',
  },
  current_level_tags: {
    label: '現在のレベルタグ',
    type: 'tags_input',
    placeholder: '初心者, 中級者など',
  },
  priority_areas: {
    label: '優先学習分野',
    type: 'tags_input',
    placeholder: '基礎学習, 実践演習など',
  },
  goal_motivation: {
    label: '目標へのモチベーション',
    type: 'single_select',
    options: [
      { id: 'low', label: '低', subtitle: 'ゆっくりと進めたい' },
      { id: 'mid', label: '中', subtitle: 'バランスよく進めたい' },
      { id: 'high', label: '高', subtitle: '積極的に進めたい' },
    ],
  },
  env_constraints: {
    label: '環境制約',
    type: 'tags_input',
    placeholder: '騒音, 時間制限など',
  },
  hard_constraints: {
    label: '厳格な制約',
    type: 'tags_input',
    placeholder: '絶対に避けたいこと',
  },
  risk_factors: {
    label: 'リスク要因',
    type: 'tags_input',
    placeholder: '挫折要因, 障害など',
  },
  heat_level: {
    label: '学習強度（1-5）',
    type: 'number',
    min: 1,
    max: 5,
    default: 3,
  },
};

export const ProfileForm: React.FC<ProfileFormProps> = ({
  onComplete,
  onBack,
  initialData = {},
}) => {
  const [profile, setProfile] = useState<Partial<ProfileV1>>({
    time_budget_min_per_day: 60,
    peak_hours: [],
    env_constraints: [],
    hard_constraints: [],
    motivation_style: 'pull',
    difficulty_tolerance: 0.6,
    novelty_preference: 0.5,
    pace_preference: 'cadence',
    current_level_tags: [],
    priority_areas: [],
    heat_level: 3,
    risk_factors: [],
    preferred_session_length_min: 25,
    modality_preference: ['read'],
    deliverable_preferences: ['note'],
    weekly_minimum_commitment_min: 180,
    goal_motivation: 'mid',
    ...initialData,
  });

  const [currentSection, setCurrentSection] = useState(0);
  const sections = Object.entries(profileSections);
  const totalSections = sections.length;
  const progress = ((currentSection + 1) / totalSections) * 100;

  const updateField = (fieldName: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleNext = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      try {
        const validatedProfile = ProfileV1Schema.parse(profile);
        onComplete(validatedProfile);
      } catch (error) {
        Alert.alert('入力エラー', '必須項目を確認してください。');
        console.log('Validation error:', error);
      }
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    } else {
      onBack?.();
    }
  };

  const renderField = (fieldName: string) => {
    const config = fieldConfig[fieldName as keyof typeof fieldConfig];
    const value = profile[fieldName as keyof ProfileV1];

    if (!config) return null;

    switch (config.type) {
      case 'number':
        return (
          <View key={fieldName} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{config.label}</Text>
            <TextInput
              style={styles.numberInput}
              value={value?.toString() || ''}
              onChangeText={(text) => {
                const num = parseInt(text) || ((config as any).default as number) || 0;
                updateField(fieldName, Math.max((config as any).min || 0, Math.min((config as any).max || 999, num)));
              }}
              keyboardType="numeric"
              placeholder={(config as any).placeholder}
              placeholderTextColor={colors.Mist}
            />
          </View>
        );

      case 'text':
        return (
          <View key={fieldName} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{config.label}</Text>
            <TextInput
              style={styles.textInput}
              value={(value as string) || ''}
              onChangeText={(text) => updateField(fieldName, text)}
              placeholder={(config as any).placeholder}
              placeholderTextColor={colors.Mist}
              maxLength={(config as any).maxLength}
              multiline
            />
          </View>
        );

      case 'single_select':
        return (
          <View key={fieldName} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{config.label}</Text>
            <View style={styles.optionsContainer}>
              {(config as any).options?.map((option: any) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    value === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => updateField(fieldName, option.id)}
                >
                  <Text style={[
                    styles.optionLabel,
                    value === option.id && styles.optionLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                  {option.subtitle && (
                    <Text style={[
                      styles.optionSubtitle,
                      value === option.id && styles.optionSubtitleSelected,
                    ]}>
                      {option.subtitle}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 'multi_select':
        const selectedValues = (value as any[]) || [];
        return (
          <View key={fieldName} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{config.label}</Text>
            <View style={styles.multiSelectContainer}>
              {(config as any).options?.map((option: any) => {
                const isSelected = selectedValues.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.multiSelectOption,
                      isSelected && styles.multiSelectOptionSelected,
                    ]}
                    onPress={() => {
                      const newSelection = isSelected
                        ? selectedValues.filter(id => id !== option.id)
                        : [...selectedValues, option.id];
                      updateField(fieldName, newSelection);
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
        );

      case 'tags_input':
        const tags = (value as string[]) || [];
        return (
          <View key={fieldName} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>{config.label}</Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.tag}
                  onPress={() => {
                    const newTags = tags.filter((_, i) => i !== index);
                    updateField(fieldName, newTags);
                  }}
                >
                  <Text style={styles.tagText}>{tag} ×</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={(config as any).placeholder}
              placeholderTextColor={colors.Mist}
              onSubmitEditing={(e) => {
                const newTag = e.nativeEvent.text.trim();
                if (newTag && !tags.includes(newTag)) {
                  updateField(fieldName, [...tags, newTag]);
                  (e.target as any).clear();
                }
              }}
              blurOnSubmit={false}
            />
          </View>
        );

      case 'slider':
        return (
          <View key={fieldName} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {config.label}: {((value as number) || (config as any).default || 0).toFixed(1)}
            </Text>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const current = (value as number) || (config as any).default || 0;
                  const newValue = Math.max((config as any).min || 0, current - ((config as any).step || 0.1));
                  updateField(fieldName, newValue);
                }}
              >
                <Text style={styles.sliderButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    {
                      width: `${(((value as number) || (config as any).default || 0) / ((config as any).max || 1)) * 100}%`,
                    },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => {
                  const current = (value as number) || (config as any).default || 0;
                  const newValue = Math.min((config as any).max || 1, current + ((config as any).step || 0.1));
                  updateField(fieldName, newValue);
                }}
              >
                <Text style={styles.sliderButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const [sectionKey, sectionData] = sections[currentSection];
  const isValidSection = sectionData.fields.every(field => {
    const value = profile[field as keyof ProfileV1];
    const config = fieldConfig[field as keyof typeof fieldConfig];
    
    if (!config) return true;
    if (field === 'long_term_goal') return true; // Optional field
    
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Header */}
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.stepText}>
            {sectionData.title} ({currentSection + 1} / {totalSections})
          </Text>
        </View>

        {/* Fields */}
        <View style={styles.fieldsContainer}>
          {sectionData.fields.map(field => renderField(field))}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.prevButton]}
          onPress={handlePrevious}
        >
          <Text style={styles.navButtonText}>
            {currentSection === 0 ? '戻る' : '前へ'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            isValidSection && styles.nextButtonEnabled,
          ]}
          onPress={handleNext}
          disabled={!isValidSection}
        >
          <Text
            style={[
              styles.navButtonText,
              styles.nextButtonText,
              isValidSection && styles.nextButtonTextEnabled,
            ]}
          >
            {currentSection === totalSections - 1 ? '完了' : '次へ'}
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
    marginBottom: 32,
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
    fontSize: 16,
    color: colors.Moonlight,
    textAlign: 'center',
    fontWeight: '600',
  },
  fieldsContainer: {
    gap: 24,
  },
  fieldContainer: {
    gap: 12,
  },
  fieldLabel: {
    fontSize: 16,
    color: colors.Moonlight,
    fontWeight: '500',
  },
  numberInput: {
    backgroundColor: colors.DeepPine,
    borderRadius: 8,
    padding: 16,
    color: colors.Moonlight,
    fontSize: 16,
  },
  textInput: {
    backgroundColor: colors.DeepPine,
    borderRadius: 8,
    padding: 16,
    color: colors.Moonlight,
    fontSize: 16,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  optionsContainer: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: colors.DeepPine,
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: `${colors.accent}20`,
    borderColor: colors.accent,
  },
  optionLabel: {
    fontSize: 16,
    color: colors.Moonlight,
    fontWeight: '500',
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  optionSubtitle: {
    fontSize: 14,
    color: colors.Mist,
    marginTop: 4,
  },
  optionSubtitleSelected: {
    color: colors.Moonlight,
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiSelectOption: {
    backgroundColor: colors.DeepPine,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  multiSelectOptionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  multiSelectLabel: {
    fontSize: 14,
    color: colors.Mist,
  },
  multiSelectLabelSelected: {
    color: colors.Moonlight,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: colors.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: colors.Moonlight,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sliderButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.DeepPine,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 20,
    color: colors.Moonlight,
    fontWeight: '600',
  },
  sliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.DeepPine,
    borderRadius: 4,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
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
    color: colors.Moonlight,
  },
  nextButtonText: {
    color: colors.DeepPine,
  },
  nextButtonTextEnabled: {
    color: colors.Moonlight,
  },
});