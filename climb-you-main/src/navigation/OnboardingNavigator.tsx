import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import GoalDeepDiveScreen from '../screens/onboarding/GoalDeepDiveScreen';
import GoalCategoryScreen from '../screens/onboarding/GoalCategoryScreen';
import GoalImportanceScreen from '../screens/onboarding/GoalImportanceScreen';
import ProfileQuestionsScreen from '../screens/onboarding/ProfileQuestionsScreen';
import QuestPreferencesScreen from '../screens/onboarding/QuestPreferencesScreen';
import AIAnalysisResultScreen from '../screens/onboarding/AIAnalysisResultScreen';

export interface OnboardingData {
  goal: string;
  period: number;
  intensity: string;
  goalDeepDiveData?: any;
  // Legacy format support
  answers: { [key: number]: string };
  freeTextAnswers: { [key: number]: string };
  // New format
  profileAnswers?: any; // ProfileAnswers
  preferences: { [key: number]: 'love' | 'like' | 'dislike' };
}

export type OnboardingStackParamList = {
  GoalDeepDive: undefined;
  GoalCategory: {
    goalDeepDiveData: any;
  };
  GoalImportance: {
    goalDeepDiveData: any;
  };
  ProfileQuestions: {
    goalDeepDiveData: any;
  };
  QuestPreferences: {
    goalDeepDiveData: any;
    profileData: {
      profileAnswers: any; // ProfileAnswers from new system
      memos: { [questionId: string]: string };
    };
  };
  AIAnalysisResult: {
    goalDeepDiveData: any;
    profileData: {
      profileAnswers: any;
      memos: { [questionId: string]: string };
    };
    questPreferencesData: any;
  };
};

const Stack = createStackNavigator<OnboardingStackParamList>();

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

export default function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="GoalDeepDive" component={GoalDeepDiveScreen} />
        <Stack.Screen name="GoalCategory" component={GoalCategoryScreen} />
        <Stack.Screen name="GoalImportance" component={GoalImportanceScreen} />
        <Stack.Screen name="ProfileQuestions" component={ProfileQuestionsScreen} />
        <Stack.Screen name="QuestPreferences">
          {(props) => <QuestPreferencesScreen {...props} onComplete={onComplete} />}
        </Stack.Screen>
        <Stack.Screen name="AIAnalysisResult">
          {(props) => <AIAnalysisResultScreen {...props} onComplete={onComplete} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}