import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type GoalCategoryScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'GoalCategory'>;
type GoalCategoryScreenRouteProp = RouteProp<OnboardingStackParamList, 'GoalCategory'>;

interface GoalCategoryScreenProps {
  navigation: GoalCategoryScreenNavigationProp;
  route: GoalCategoryScreenRouteProp;
}

const colors = {
  NightSky: '#0F2A44',
  Moonlight: '#F3E7C9',
  white: '#fff',
  text: '#333',
  textSecondary: '#666',
  textOnNight: '#fff',
  cardBackground: 'rgba(255, 255, 255, 0.9)',
  inactive: 'rgba(243, 231, 201, 0.3)',
};

const GOAL_CATEGORY_OPTIONS = [
  { id: 'learning', label: '学習・勉強', subtitle: '語学、資格、知識習得など', icon: '📚' },
  { id: 'career', label: 'キャリア', subtitle: '転職、昇進、スキルアップなど', icon: '💼' },
  { id: 'health', label: '健康・運動', subtitle: 'ダイエット、筋トレ、運動習慣など', icon: '💪' },
  { id: 'skill', label: '技術・スキル', subtitle: 'プログラミング、デザイン、楽器など', icon: '🛠️' },
  { id: 'creative', label: '創作・趣味', subtitle: '絵画、音楽、ライティングなど', icon: '🎨' },
  { id: 'other', label: 'その他', subtitle: '上記以外の目標', icon: '✨' },
] as const;

export default function GoalCategoryScreen({ navigation, route }: GoalCategoryScreenProps) {
  const { goalDeepDiveData } = route.params;
  const [selectedCategory, setSelectedCategory] = useState<string>('learning');

  const handleNext = () => {
    const updatedGoalData = {
      ...goalDeepDiveData,
      goal_category: selectedCategory
    };

    navigation.navigate('GoalImportance', {
      goalDeepDiveData: updatedGoalData
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isStepValid = () => {
    return !!selectedCategory;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(2 / 5) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step 1 / 3</Text>
          <Text style={styles.subProgressText}>
            目標設定 2 / 5
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>目標のカテゴリ</Text>
          <Text style={styles.subtitle}>どのような分野の目標ですか？</Text>

          <View style={styles.inputContainer}>
            <View style={styles.optionsContainer}>
              {GOAL_CATEGORY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === option.id && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCategory(option.id)}
                >
                  <Text style={styles.categoryIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.categoryLabel,
                    selectedCategory === option.id && styles.categoryLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.categorySubtitle,
                    selectedCategory === option.id && styles.categorySubtitleSelected,
                  ]}>
                    {option.subtitle}
                  </Text>
                </TouchableOpacity>
              ))}
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
              style={[styles.nextButton, isStepValid() && styles.nextButtonActive]}
              onPress={handleNext}
              disabled={!isStepValid()}
            >
              <Text style={[
                styles.buttonText,
                isStepValid() ? styles.nextButtonTextActive : styles.nextButtonTextInactive
              ]}>
                次へ
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
    backgroundColor: colors.NightSky,
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
  inputContainer: {
    marginBottom: 30,
  },
  optionsContainer: {
    gap: 12,
  },
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
    backgroundColor: colors.inactive,
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.Moonlight,
  },
  nextButtonActive: {
    backgroundColor: colors.Moonlight,
    shadowColor: colors.Moonlight,
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
    color: colors.Moonlight,
  },
  nextButtonTextInactive: {
    color: colors.Moonlight,
  },
  nextButtonTextActive: {
    color: colors.NightSky,
  },
});