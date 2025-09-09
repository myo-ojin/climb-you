/**
 * Profile Service - Firebase Firestore integration for user profiles
 * Phase 1: Data Foundation Implementation
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { firebaseConfig } from './config';
import {
  ProfileV1,
  ProfileV1Schema,
  GoalDeepDiveAnswers,
  GoalDeepDiveAnswersSchema,
  UserProfileDocument,
  getUserProfileDocumentPath,
} from '../../types/questGeneration';

// Result type for safe error handling
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export class ProfileService {
  
  /**
   * Debug: Diagnose authentication and Firestore status
   */
  async diagnoseAuthAndFirestore(): Promise<{
    authStatus: string;
    userId: string | null;
    firestoreStatus: string;
    userClaims?: any;
    testWriteResult?: string;
  }> {
    try {
      const firestore = firebaseConfig.getFirestore();
      const auth = firebaseConfig.getAuth();
      
      if (!firestore) {
        return {
          authStatus: 'Firestore not initialized',
          userId: null,
          firestoreStatus: 'Not initialized',
        };
      }
      
      if (!auth) {
        return {
          authStatus: 'Auth not initialized',
          userId: null,
          firestoreStatus: 'Auth required for Firestore',
        };
      }
      
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        return {
          authStatus: 'No current user',
          userId: null,
          firestoreStatus: 'No auth user for Firestore access',
        };
      }
      
      // Get ID token and claims for debugging
      const idToken = await currentUser.getIdToken();
      const idTokenResult = await currentUser.getIdTokenResult();
      
      const diagnosis = {
        authStatus: `Authenticated as ${currentUser.isAnonymous ? 'anonymous' : 'registered'} user`,
        userId: currentUser.uid,
        firestoreStatus: 'Auth user available',
        userClaims: {
          isAnonymous: currentUser.isAnonymous,
          providerData: currentUser.providerData,
          customClaims: idTokenResult.claims,
          tokenIssuer: idTokenResult.issuer,
          tokenAudience: idTokenResult.audience,
        },
        testWriteResult: 'Not tested',
      };
      
      // Test a simple write operation to diagnose Firestore permissions
      try {
        const testDocRef = doc(firestore, `users/${currentUser.uid}/debug_test/permission_check`);
        await setDoc(testDocRef, { 
          test: true, 
          timestamp: Date.now(),
          uid: currentUser.uid,
          isAnonymous: currentUser.isAnonymous,
        });
        diagnosis.testWriteResult = 'Write successful ✅';
      } catch (writeError) {
        diagnosis.testWriteResult = `Write failed: ${writeError.message} ❌`;
      }
      
      return diagnosis;
      
    } catch (error) {
      return {
        authStatus: `Diagnosis error: ${error.message}`,
        userId: null,
        firestoreStatus: 'Error during diagnosis',
      };
    }
  }
  
  /**
   * Save complete user profile (ProfileV1 + Goal Deep Dive answers)
   */
  async saveUserProfile(args: {
    userId: string;
    goalText: string;
    profileV1: ProfileV1;
    goalDeepDive: GoalDeepDiveAnswers;
  }): Promise<Result<void>> {
    try {
      const { userId, goalText, profileV1, goalDeepDive } = args;
      
      // Validate input data
      const validatedProfile = ProfileV1Schema.parse(profileV1);
      const validatedGoalDeepDive = GoalDeepDiveAnswersSchema.parse(goalDeepDive);
      
      const firestore = firebaseConfig.getFirestore();
      if (!firestore) {
        return { success: false, error: new Error('Firestore not initialized') };
      }
      
      const now = Date.now();
      const profileDocument: UserProfileDocument = {
        basic: {
          goal_text: goalText,
          created_at: now,
          updated_at: now,
        },
        profile_v1: {
          ...validatedProfile,
          createdAt: now,
          updatedAt: now,
        },
        goal_deep_dive: validatedGoalDeepDive,
        meta: {
          version: 'v1',
          completed_onboarding: true,
          onboarding_completed_at: now,
        }
      };
      
      const docRef = doc(firestore, getUserProfileDocumentPath(userId));
      await setDoc(docRef, profileDocument);
      
      return { success: true, data: void 0 };
      
    } catch (error) {
      console.error('ProfileService.saveUserProfile error:', error);
      return { success: false, error: error as Error };
    }
  }
  
  /**
   * Load user profile
   */
  async getUserProfile(userId: string): Promise<Result<UserProfileDocument | null>> {
    try {
      const firestore = firebaseConfig.getFirestore();
      if (!firestore) {
        return { success: false, error: new Error('Firestore not initialized') };
      }
      
      const docRef = doc(firestore, getUserProfileDocumentPath(userId));
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return { success: true, data: null };
      }
      
      const data = docSnap.data() as UserProfileDocument;
      return { success: true, data };
      
    } catch (error) {
      console.error('ProfileService.getUserProfile error:', error);
      return { success: false, error: error as Error };
    }
  }
  
  /**
   * Update profile fields (partial update)
   */
  async updateUserProfile(args: {
    userId: string;
    updates: Partial<{
      profileV1: Partial<ProfileV1>;
      goalDeepDive: Partial<GoalDeepDiveAnswers>;
      goalText: string;
    }>;
  }): Promise<Result<void>> {
    try {
      const { userId, updates } = args;
      
      const firestore = firebaseConfig.getFirestore();
      if (!firestore) {
        return { success: false, error: new Error('Firestore not initialized') };
      }
      
      const docRef = doc(firestore, getUserProfileDocumentPath(userId));
      
      // Build update object with timestamp
      const updateData: any = {
        'basic.updated_at': Date.now(),
      };
      
      if (updates.goalText) {
        updateData['basic.goal_text'] = updates.goalText;
      }
      
      if (updates.profileV1) {
        Object.entries(updates.profileV1).forEach(([key, value]) => {
          updateData[`profile_v1.${key}`] = value;
        });
        updateData['profile_v1.updatedAt'] = Date.now();
      }
      
      if (updates.goalDeepDive) {
        Object.entries(updates.goalDeepDive).forEach(([key, value]) => {
          updateData[`goal_deep_dive.${key}`] = value;
        });
      }
      
      await updateDoc(docRef, updateData);
      
      return { success: true, data: void 0 };
      
    } catch (error) {
      console.error('ProfileService.updateUserProfile error:', error);
      return { success: false, error: error as Error };
    }
  }
  
  /**
   * Check if user has completed onboarding
   */
  async hasCompletedOnboarding(userId: string): Promise<Result<boolean>> {
    try {
      const profileResult = await this.getUserProfile(userId);
      
      if (!profileResult.success) {
        return { success: false, error: profileResult.error };
      }
      
      const hasCompleted = profileResult.data?.meta?.completed_onboarding ?? false;
      return { success: true, data: hasCompleted };
      
    } catch (error) {
      console.error('ProfileService.hasCompletedOnboarding error:', error);
      return { success: false, error: error as Error };
    }
  }
  
  /**
   * Mark onboarding as completed
   */
  async markOnboardingCompleted(userId: string): Promise<Result<void>> {
    try {
      const firestore = firebaseConfig.getFirestore();
      if (!firestore) {
        return { success: false, error: new Error('Firestore not initialized') };
      }
      
      const docRef = doc(firestore, getUserProfileDocumentPath(userId));
      await updateDoc(docRef, {
        'meta.completed_onboarding': true,
        'meta.onboarding_completed_at': Date.now(),
        'basic.updated_at': Date.now(),
      });
      
      return { success: true, data: void 0 };
      
    } catch (error) {
      console.error('ProfileService.markOnboardingCompleted error:', error);
      return { success: false, error: error as Error };
    }
  }
  
  /**
   * Reset onboarding status (for testing/debugging)
   */
  async resetOnboarding(userId: string): Promise<Result<void>> {
    try {
      const firestore = firebaseConfig.getFirestore();
      if (!firestore) {
        return { success: false, error: new Error('Firestore not initialized') };
      }
      
      const docRef = doc(firestore, getUserProfileDocumentPath(userId));
      await updateDoc(docRef, {
        'meta.completed_onboarding': false,
        'basic.updated_at': Date.now(),
      });
      
      return { success: true, data: void 0 };
      
    } catch (error) {
      console.error('ProfileService.resetOnboarding error:', error);
      return { success: false, error: error as Error };
    }
  }
  
  /**
   * Create a basic profile for testing
   */
  createBasicTestProfile(overrides: Partial<ProfileV1> = {}): ProfileV1 {
    const defaultProfile: ProfileV1 = {
      time_budget_min_per_day: 60,
      peak_hours: [9, 10, 19, 20],
      env_constraints: [],
      hard_constraints: [],
      motivation_style: "pull",
      difficulty_tolerance: 0.6,
      novelty_preference: 0.5,
      pace_preference: "cadence",
      long_term_goal: "テスト用長期目標",
      current_level_tags: ["初心者"],
      priority_areas: ["基礎学習"],
      heat_level: 3,
      risk_factors: [],
      preferred_session_length_min: 25,
      modality_preference: ["read"],
      deliverable_preferences: ["note"],
      weekly_minimum_commitment_min: 180,
      goal_motivation: "mid",
    };
    
    return { ...defaultProfile, ...overrides };
  }
  
  /**
   * Create basic goal deep dive answers for testing
   */
  createBasicTestGoalDeepDive(overrides: Partial<GoalDeepDiveAnswers> = {}): GoalDeepDiveAnswers {
    const defaultAnswers: GoalDeepDiveAnswers = {
      goal_focus: { choice: "skill", note: "実践的なスキル習得" },
      goal_horizon: { choice: "3m", note: "3ヶ月で基礎完了" },
      goal_tradeoff: { choice: "balance", note: "バランス重視" },
      goal_evidence: { choice: "portfolio_demo", note: "成果物で実証" }
    };
    
    return { ...defaultAnswers, ...overrides };
  }
}

// Export singleton instance
export const profileService = new ProfileService();