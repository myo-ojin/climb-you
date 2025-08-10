import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth/react-native';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2GVOSGDWYQuAUDSHfyfR7FW0wajAOHbE",
  authDomain: "climb-you.firebaseapp.com",
  projectId: "climb-you",
  storageBucket: "climb-you.firebasestorage.app",
  messagingSenderId: "930082383478",
  appId: "1:930082383478:web:5e4768471582e9a698a157",
  measurementId: "G-83VHYGJN35"
};

// Initialize Firebase App (ensure singleton)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const getFirebaseAuth = (): Auth => {
  return auth;
};

// Lazy initialization for Firestore
let _db: Firestore | null = null;
export const getFirebaseFirestore = (): Firestore => {
  if (!_db) {
    _db = getFirestore(app);
  }
  return _db;
};

// Initialize Analytics (only for web/production)
let analytics: any;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Export lazy getters - don't alias to avoid immediate execution
export { getFirebaseAuth };
export { getFirebaseFirestore };
export { analytics };
export default app;