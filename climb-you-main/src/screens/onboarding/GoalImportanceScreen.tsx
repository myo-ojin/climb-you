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

type GoalImportanceScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'GoalImportance'>;
type GoalImportanceScreenRouteProp = RouteProp<OnboardingStackParamList, 'GoalImportance'>;

interface GoalImportanceScreenProps {
  navigation: GoalImportanceScreenNavigationProp;
  route: GoalImportanceScreenRouteProp;
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

const IMPORTANCE_OPTIONS = [
  { level: 1, label: '興味程度', subtitle: '時間があるときに', color: '#9CA3AF' },
  { level: 2, label: '低い', subtitle: 'できれば達成したい', color: '#6B7280' },
  { level: 3, label: '普通', subtitle: 'しっかり取り組みたい', color: '#F59E0B' },
  { level: 4, label: '高い', subtitle: '必ず達成したい', color: '#EF4444' },
  { level: 5, label: '最重要', subtitle: '人生を変える目標', color: '#DC2626' },
] as const;

export default function GoalImportanceScreen({ navigation, route }: GoalImportanceScreenProps) {
  const { goalDeepDiveData } = route.params;
  const [selectedImportance, setSelectedImportance] = useState<number>(3);

  const handleNext = () => {
    const updatedGoalData = {
      ...goalDeepDiveData,
      goal_importance: selectedImportance
    };

    // Continue to ProfileQuestions with the updated data
    navigation.navigate('ProfileQuestions', {
      goalDeepDiveData: updatedGoalData
    });
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const isStepValid = () => {
    return !!selectedImportance;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(3 / 5) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Step 1 / 3</Text>
          <Text style={styles.subProgressText}>
            目標設定 3 / 5
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.title}>重要度レベル</Text>
          <Text style={styles.subtitle}>この目標はどのくらい重要ですか？</Text>

          <View style={styles.inputContainer}>
            <View style={styles.importanceContainer}>
              {IMPORTANCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.level}
                  style={[
                    styles.importanceOption,
                    selectedImportance === option.level && styles.importanceOptionSelected,
                    { borderColor: option.color }
                  ]}
                  onPress={() => setSelectedImportance(option.level)}
                >
                  <View style={styles.importanceLevelContainer}>
                    <Text style={[
                      styles.importanceLevel,
                      { color: option.color },
                      selectedImportance === option.level && styles.importanceLevelSelected,
                    ]}>
                      {option.level}
                    </Text>
                  </View>
                  <Text style={[
                    styles.importanceLabel,
                    selectedImportance === option.level && styles.importanceLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[
                    styles.importanceSubtitle,
                    selectedImportance === option.level && styles.importanceSubtitleSelected,
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