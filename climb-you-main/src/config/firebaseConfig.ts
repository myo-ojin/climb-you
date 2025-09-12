/**
 * Firebase Configuration for Climb You App
 * Comprehensive setup for Firestore, Auth, and Functions
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  connectFirestoreEmulator, 
  initializeFirestore,
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  connectAuthEmulator,
  signInAnonymously,
  Auth
} from 'firebase/auth';
import { 
  getFunctions, 
  connectFunctionsEmulator,
  Functions
} from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnvironmentConfig } from './environmentConfig';

// Firebase configuration
const firebaseConfig = {
  // TODO: Replace with actual Firebase project configuration
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "climb-you-demo.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "climb-you-demo",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "climb-you-demo.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abc123def456"
};

// Environment settings
const isDevelopment = EnvironmentConfig.isDemoMode();
const FIRESTORE_HOST = 'localhost';
const FIRESTORE_PORT = 8080;
const AUTH_HOST = 'localhost';
const AUTH_PORT = 9099;
const FUNCTIONS_HOST = 'localhost';
const FUNCTIONS_PORT = 5001;

// Global Firebase service instances
let app: any;
let firestore: Firestore;
let auth: Auth;
let functions: Functions;

/**
 * Initialize Firebase services with proper error handling
 */
export const initializeFirebaseServices = async (): Promise<{
  app: any;
  firestore: Firestore | null;
  auth: Auth | null;
  functions: Functions | null;
}> => {
  try {
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    
    // デモモード時は完全にFirebase初期化をスキップ
    if (envInfo.mode === 'demo') {
      console.log('🎭 Demo mode: Firebase initialization completely skipped');
      return {
        app: null,
        firestore: null,
        auth: null,
        functions: null
      };
    }
    // Initialize Firebase App - check if already initialized
    if (!app) {
      try {
        if (getApps().length === 0) {
          app = initializeApp(firebaseConfig);
          console.log('🔥 Firebase App initialized');
        } else {
          app = getApp();
          console.log('🔥 Firebase App already initialized');
        }
      } catch (error) {
        console.log('🔥 Firebase App initialization error, using existing instance');
        app = getApp();
      }
    }

    // Initialize Firestore
    if (!firestore) {
      try {
        if (isDevelopment) {
          // Use emulator in development
          firestore = initializeFirestore(app, {
            host: `${FIRESTORE_HOST}:${FIRESTORE_PORT}`,
            ssl: false,
            experimentalForceLongPolling: true,
          });
          console.log(`🔥 Firestore connected to emulator at ${FIRESTORE_HOST}:${FIRESTORE_PORT}`);
        } else {
          // Use production Firestore
          firestore = getFirestore(app);
          console.log('🔥 Firestore connected to production');
        }
      } catch (firestoreError) {
        // If Firestore already initialized, get the existing instance
        console.log('🔥 Firestore already initialized, using existing instance');
        firestore = getFirestore(app);
      }
    }

    // Initialize Auth
    if (!auth) {
      try {
        auth = getAuth(app);
        
        if (isDevelopment) {
          connectAuthEmulator(auth, `http://${AUTH_HOST}:${AUTH_PORT}`, { disableWarnings: true });
          console.log(`🔥 Auth connected to emulator at ${AUTH_HOST}:${AUTH_PORT}`);
        } else {
          console.log('🔥 Auth connected to production');
        }
      } catch (authError) {
        console.log('🔥 Auth already initialized, using existing instance');
        auth = getAuth(app);
      }
    }

    // Initialize Functions
    if (!functions) {
      try {
        functions = getFunctions(app, 'asia-northeast1'); // Tokyo region
        
        if (isDevelopment) {
          connectFunctionsEmulator(functions, FUNCTIONS_HOST, FUNCTIONS_PORT);
          console.log(`🔥 Functions connected to emulator at ${FUNCTIONS_HOST}:${FUNCTIONS_PORT}`);
        } else {
          console.log('🔥 Functions connected to production');
        }
      } catch (functionsError) {
        console.log('🔥 Functions already initialized, using existing instance');
        functions = getFunctions(app, 'asia-northeast1');
      }
    }

    return { app, firestore, auth, functions };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
};

/**
 * Anonymous authentication for user tracking
 * Uses local storage in demo mode to avoid Firebase auth issues
 */
export const signInAnonymousUser = async (): Promise<string> => {
  try {
    // In demo mode, use local storage-based authentication
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    if (envInfo.mode === 'demo') {
      console.log('🎭 Using demo mode authentication');
      
      // Check for stored demo user ID
      let storedUserId = await AsyncStorage.getItem('firebase_user_id');
      if (storedUserId) {
        console.log('👤 Using stored demo user ID:', storedUserId);
        return storedUserId;
      }
      
      // Generate demo user ID
      const demoUserId = `demo_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('firebase_user_id', demoUserId);
      console.log('👤 Generated demo user ID:', demoUserId);
      return demoUserId;
    }

    // Production Firebase authentication
    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    // Check if user is already signed in
    if (auth.currentUser) {
      console.log('👤 User already authenticated:', auth.currentUser.uid);
      return auth.currentUser.uid;
    }

    // Check for stored user ID
    const storedUserId = await AsyncStorage.getItem('firebase_user_id');
    if (storedUserId && auth && auth.currentUser && auth.currentUser.uid === storedUserId) {
      console.log('👤 Using stored user ID:', storedUserId);
      return storedUserId;
    }

    // Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    const userId = userCredential.user.uid;
    
    // Store user ID for persistence
    await AsyncStorage.setItem('firebase_user_id', userId);
    
    console.log('👤 Anonymous user signed in:', userId);
    return userId;
  } catch (error) {
    console.error('❌ Anonymous sign-in error:', error);
    
    // Fallback to demo mode on error
    console.log('🎭 Falling back to demo mode authentication');
    const fallbackUserId = `fallback_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem('firebase_user_id', fallbackUserId);
    console.log('👤 Generated fallback user ID:', fallbackUserId);
    return fallbackUserId;
  }
};

/**
 * Get current user ID (create if doesn't exist)
 */
export const getCurrentUserId = async (): Promise<string> => {
  try {
    // In demo mode, always use signInAnonymousUser which handles demo logic
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    if (envInfo.mode === 'demo') {
      return await signInAnonymousUser();
    }
    
    // Production mode
    if (auth && auth.currentUser) {
      return auth.currentUser.uid;
    }
    
    // Sign in anonymously if no current user
    return await signInAnonymousUser();
  } catch (error) {
    console.error('❌ Error getting current user ID:', error);
    // Always fallback to demo authentication
    return await signInAnonymousUser();
  }
};

/**
 * Firebase service getters with lazy initialization
 */
export const getFirebaseApp = () => {
  if (!app) {
    throw new Error('Firebase not initialized. Call initializeFirebaseServices first.');
  }
  return app;
};

export const getFirebaseFirestore = () => {
  if (!firestore) {
    throw new Error('Firestore not initialized. Call initializeFirebaseServices first.');
  }
  return firestore;
};

export const getFirebaseAuth = () => {
  if (!auth) {
    throw new Error('Firebase Auth not initialized. Call initializeFirebaseServices first.');
  }
  return auth;
};

export const getFirebaseFunctions = () => {
  if (!functions) {
    throw new Error('Firebase Functions not initialized. Call initializeFirebaseServices first.');
  }
  return functions;
};

/**
 * Environment utilities
 */
export const isFirebaseEmulator = () => EnvironmentConfig.useFirebaseEmulator();
export const getFirebaseConfig = () => firebaseConfig;

/**
 * Firebase connection status
 */
export const getFirebaseStatus = () => ({
  initialized: !!app,
  firestoreReady: !!firestore,
  authReady: !!auth,
  functionsReady: !!functions,
  userId: auth?.currentUser?.uid || null,
  isEmulator: isDevelopment,
});

export default {
  initialize: initializeFirebaseServices,
  signInAnonymous: signInAnonymousUser,
  getCurrentUserId,
  getApp: getFirebaseApp,
  getFirestore: getFirebaseFirestore,
  getAuth: getFirebaseAuth,
  getFunctions: getFirebaseFunctions,
  isEmulator: isFirebaseEmulator,
  getConfig: getFirebaseConfig,
  getStatus: getFirebaseStatus,
};