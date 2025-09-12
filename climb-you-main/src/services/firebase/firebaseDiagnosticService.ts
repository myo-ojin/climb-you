/**
 * Firebase Diagnostic Service - PR5: Startup diagnosis and logging
 * Provides comprehensive Firebase connectivity and configuration diagnostics
 */

import { getAuth } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseFirestore, getCurrentUserId } from '../../config/firebaseConfig';
import EnvironmentConfig from '../../config/environmentConfig';

export interface FirebaseDiagnosticResult {
  timestamp: string;
  authStatus: 'authenticated' | 'anonymous' | 'unauthenticated' | 'error';
  userId: string | null;
  firestoreConnectivity: 'connected' | 'emulator' | 'offline' | 'error';
  writeTarget: 'firestore' | 'emulator' | 'local';
  environment: {
    mode: 'demo' | 'production';
    aiEnabled: boolean;
    firebaseEmulator: boolean;
    firebaseWriteEnabled: boolean;
    persistenceTarget: 'firestore' | 'emulator' | 'local';
  };
  connectivity: {
    authReady: boolean;
    firestoreReady: boolean;
    testWriteSuccessful: boolean;
    testReadSuccessful: boolean;
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

class FirebaseDiagnosticService {
  
  /**
   * Comprehensive Firebase diagnosis
   */
  async diagnoseFirebaseConnection(): Promise<FirebaseDiagnosticResult> {
    const startTime = new Date().getTime();
    const result: FirebaseDiagnosticResult = {
      timestamp: new Date().toISOString(),
      authStatus: 'unauthenticated',
      userId: null,
      firestoreConnectivity: 'offline',
      writeTarget: 'local',
      environment: EnvironmentConfig.getEnvironmentInfo(),
      connectivity: {
        authReady: false,
        firestoreReady: false,
        testWriteSuccessful: false,
        testReadSuccessful: false,
      },
      errors: [],
      warnings: [],
      recommendations: [],
    };

    console.log('🔍 Starting Firebase diagnostic...');

    // 1. Check Authentication Status
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      
      if (user) {
        result.authStatus = user.isAnonymous ? 'anonymous' : 'authenticated';
        result.userId = user.uid;
        result.connectivity.authReady = true;
        console.log(`👤 Auth Status: ${result.authStatus} (${user.uid})`);
      } else {
        result.authStatus = 'unauthenticated';
        result.warnings.push('No authenticated user found');
        result.recommendations.push('Consider calling signInAnonymousUser() before Firebase operations');
      }
    } catch (authError) {
      result.authStatus = 'error';
      result.errors.push(`Authentication check failed: ${authError.message}`);
    }

    // 2. Check Firestore Connectivity
    try {
      const db = getFirebaseFirestore();
      result.connectivity.firestoreReady = true;
      
      // Determine connection type
      if (result.environment.firebaseEmulator) {
        result.firestoreConnectivity = 'emulator';
        console.log('🧪 Firestore: Connected to emulator');
      } else {
        result.firestoreConnectivity = 'connected';
        console.log('☁️ Firestore: Connected to production');
      }
    } catch (firestoreError) {
      result.firestoreConnectivity = 'error';
      result.errors.push(`Firestore initialization failed: ${firestoreError.message}`);
    }

    // 3. Test Read Operation
    if (result.connectivity.firestoreReady && result.userId) {
      try {
        const testDocRef = doc(getFirebaseFirestore(), 'diagnostics', `test_${result.userId}`);
        await getDoc(testDocRef);
        result.connectivity.testReadSuccessful = true;
        console.log('📖 Test read: Successful');
      } catch (readError) {
        result.errors.push(`Test read failed: ${readError.message}`);
        result.recommendations.push('Check Firestore security rules and network connectivity');
      }
    }

    // 4. Test Write Operation
    if (result.connectivity.firestoreReady && result.userId) {
      try {
        const testDocRef = doc(getFirebaseFirestore(), 'diagnostics', `test_${result.userId}`);
        await setDoc(testDocRef, {
          testId: `diagnostic_${startTime}`,
          timestamp: serverTimestamp(),
          environment: result.environment.mode,
          writeTarget: result.environment.persistenceTarget,
        }, { merge: true });
        
        result.connectivity.testWriteSuccessful = true;
        result.writeTarget = result.environment.persistenceTarget as any;
        console.log(`✏️ Test write: Successful to ${result.writeTarget}`);
      } catch (writeError) {
        result.errors.push(`Test write failed: ${writeError.message}`);
        
        // Determine write target based on fallback logic
        if (result.environment.persistenceTarget === 'local') {
          result.writeTarget = 'local';
          result.warnings.push('Using local storage due to write policy');
        } else {
          result.writeTarget = 'local';
          result.warnings.push('Falling back to local storage due to write failure');
          result.recommendations.push('Check Firestore security rules and network connectivity');
        }
      }
    } else {
      result.writeTarget = 'local';
      result.warnings.push('Skipping write test due to missing prerequisites');
    }

    // 5. Generate Recommendations
    this.generateRecommendations(result);

    const duration = new Date().getTime() - startTime;
    console.log(`🔍 Firebase diagnostic completed in ${duration}ms`);
    
    return result;
  }

  /**
   * Log diagnostic results in a structured format
   */
  logDiagnosticResults(result: FirebaseDiagnosticResult): void {
    console.log('📊 Firebase Diagnostic Report:');
    console.log('================================');
    console.log(`🕒 Timestamp: ${result.timestamp}`);
    console.log(`👤 Auth: ${result.authStatus} ${result.userId ? `(${result.userId})` : ''}`);
    console.log(`🔥 Firestore: ${result.firestoreConnectivity}`);
    console.log(`💾 Write Target: ${result.writeTarget}`);
    console.log(`🏗️ Environment: ${result.environment.mode}`);
    console.log(`🎯 Persistence: ${result.environment.persistenceTarget}`);
    
    console.log('\n🔌 Connectivity:');
    Object.entries(result.connectivity).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${value}`);
    });

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      result.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }

    console.log('================================');
  }

  /**
   * Quick startup diagnosis for app initialization
   */
  async quickStartupDiagnosis(): Promise<void> {
    try {
      console.log('🚀 Quick Firebase startup diagnosis...');
      
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      console.log('🏗️ Environment Configuration:', envInfo);
      
      // Quick auth check
      const auth = getAuth();
      const currentUser = auth.currentUser;
      console.log(`👤 Current User: ${currentUser ? `${currentUser.isAnonymous ? 'Anonymous' : 'Authenticated'} (${currentUser.uid})` : 'None'}`);
      
      // Quick Firestore check
      try {
        const db = getFirebaseFirestore();
        console.log(`🔥 Firestore: Initialized (${envInfo.firebaseEmulator ? 'Emulator' : 'Production'})`);
      } catch (error) {
        console.error('❌ Firestore initialization failed:', error);
      }

    } catch (error) {
      console.error('❌ Quick startup diagnosis failed:', error);
    }
  }

  /**
   * Generate contextual recommendations based on diagnostic results
   */
  private generateRecommendations(result: FirebaseDiagnosticResult): void {
    // Auth recommendations
    if (result.authStatus === 'unauthenticated') {
      result.recommendations.push('Initialize authentication with signInAnonymousUser()');
    }

    // Connectivity recommendations
    if (!result.connectivity.firestoreReady) {
      result.recommendations.push('Check Firebase configuration and network connectivity');
    }

    // Write/Read recommendations
    if (!result.connectivity.testWriteSuccessful && result.connectivity.firestoreReady) {
      result.recommendations.push('Verify Firestore security rules allow writes for authenticated users');
    }

    // Environment-specific recommendations
    if (result.environment.mode === 'demo' && result.writeTarget !== 'emulator' && result.writeTarget !== 'local') {
      result.recommendations.push('Consider using Firebase emulator for demo mode');
    }

    if (result.environment.mode === 'production' && result.writeTarget === 'local') {
      result.recommendations.push('Production mode should persist to Firestore, check configuration');
    }

    // Performance recommendations
    if (result.errors.length === 0 && result.warnings.length === 0) {
      result.recommendations.push('Firebase configuration is optimal');
    }
  }
}

// Export singleton instance
export const firebaseDiagnosticService = new FirebaseDiagnosticService();
export default firebaseDiagnosticService;