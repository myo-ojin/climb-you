import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingForm } from '../../components/OnboardingForm';

type GoalDeepDiveScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'GoalDeepDive'>;
type GoalDeepDiveScreenRouteProp = RouteProp<OnboardingStackParamList, 'GoalDeepDive'>;

interface GoalDeepDiveScreenProps {
  navigation: GoalDeepDiveScreenNavigationProp;
  route: GoalDeepDiveScreenRouteProp;
}

export default function GoalDeepDiveScreen({ navigation, route }: GoalDeepDiveScreenProps) {
  const handleComplete = (inputs: any) => {
    // Navigate to GoalCategory with the goal deep dive data
    navigation.navigate('GoalCategory', {
      goalDeepDiveData: inputs
    });
  };

  const handleBack = () => {
    // This is now the first screen, so back should exit onboarding
    // You can implement onboarding exit logic here if needed
    console.log('Back pressed on first screen - implement exit logic if needed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingForm
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F2A44',
  },
});