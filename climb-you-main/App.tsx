import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingNavigator from './src/navigation/OnboardingNavigator';
import { initializeFirebaseServices } from './src/config/firebaseConfig';
import { hybridStorageService } from './src/services/storage/hybridStorage';
import { firebaseUserProfileService } from './src/services/firebase/firebaseUserProfileService';
import { EnvironmentConfig } from './src/config/environmentConfig';
import { TaskProvider } from './src/contexts/TaskContext';
import { firebaseDiagnosticService } from './src/services/firebase/firebaseDiagnosticService';

const ONBOARDING_COMPLETED_KEY = 'onboarding_completed';

export default function App() {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Force environment config refresh on app restart
      EnvironmentConfig.reset();
      console.log('🔄 Environment config reset - forcing fresh read of environment variables');
      
      // Initialize Firebase services first
      try {
        const firebaseResult = await initializeFirebaseServices();
        if (firebaseResult.app) {
          console.log('🔥 Firebase services initialized successfully');
        } else {
          console.log('🎭 Firebase services skipped (demo mode)');
        }
      } catch (firebaseError) {
        console.log('⚠️ Firebase initialization failed, continuing in demo mode:', firebaseError);
      }

      // PR5: Run Firebase diagnostic after initialization
      try {
        await firebaseDiagnosticService.quickStartupDiagnosis();
      } catch (diagnosticError) {
        console.warn('⚠️ Firebase diagnostic failed:', diagnosticError);
      }

      // PR6: Attempt optional migration of local cache to Firestore
      try {
        await firebaseUserProfileService.attemptStartupMigration();
      } catch (migrationError) {
        console.warn('⚠️ Migration attempt failed:', migrationError);
      }
      
      // Initialize hybrid storage
      await hybridStorageService.initialize();
      console.log('💾 Hybrid storage initialized successfully');
      
      console.log('🚀 All services initialized successfully');
      
      // Check onboarding status
      await checkOnboardingStatus();
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      setIsOnboardingCompleted(false);
    }
  };

  // Firebase統合版: FirebaseUserProfileService で判定 (デモモード対応)
  const checkOnboardingStatus = async () => {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      // デモモード時は常にオンボーディング未完了として扱う
      if (envInfo.mode === 'demo') {
        console.log('🎭 Demo mode: Skipping Firebase onboarding status check');
        setIsOnboardingCompleted(false);
        return;
      }
      
      try {
        const completed = await firebaseUserProfileService.isOnboardingComplete();
        const profile = await firebaseUserProfileService.loadUserProfile();
        
        console.log('📊 Onboarding status check:', { 
          completed, 
          hasProfile: !!profile,
          userId: profile?.userId 
        });
        
        setIsOnboardingCompleted(completed && !!profile);
      } catch (firebaseError) {
        console.log('⚠️ Firebase onboarding check failed, defaulting to incomplete:', firebaseError);
        setIsOnboardingCompleted(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      setIsOnboardingCompleted(false);
    }
  };

  // テスト用: オンボーディングを常に表示（開発時のみ）
  // const checkOnboardingStatus = async () => {
  //   setIsOnboardingCompleted(false);
  // };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      setIsOnboardingCompleted(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  // Loading state
  if (isOnboardingCompleted === null) {
    return null; // or a loading screen
  }

  return (
    <TaskProvider>
      {isOnboardingCompleted ? (
        <AppNavigator />
      ) : (
        <OnboardingNavigator onComplete={handleOnboardingComplete} />
      )}
      <StatusBar style="auto" />
    </TaskProvider>
  );
}
