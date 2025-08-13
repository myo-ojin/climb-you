import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, Analytics, isSupported } from 'firebase/analytics';
import Constants from 'expo-constants';

// Firebase configuration from environment variables
const getFirebaseConfig = () => {
  const config = Constants.expoConfig?.extra?.firebase;
  
  if (!config) {
    throw new Error('Firebase configuration not found in app.json');
  }
  
  return {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
    measurementId: config.measurementId
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App (ensure singleton)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth (simplified approach for React Native)
export const auth = getAuth(app);

export const getFirebaseAuth = (): Auth => {
  return auth;
};

// Initialize Firestore
export const db = getFirestore(app);

export const getFirebaseFirestore = (): Firestore => {
  return db;
};

// Initialize Analytics (with proper support check)
let analytics: Analytics | null = null;

const initializeAnalytics = async (): Promise<Analytics | null> => {
  try {
    if (await isSupported()) {
      analytics = getAnalytics(app);
      return analytics;
    }
  } catch (error) {
    console.warn('Firebase Analytics not supported in this environment:', error);
  }
  return null;
};

export const getFirebaseAnalytics = (): Analytics | null => {
  return analytics;
};

export { initializeAnalytics };
export default app;