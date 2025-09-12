/**
 * Firestore Service Layer
 * Handles all Firestore database operations for Climb You App
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { 
  getFirebaseFirestore, 
  getCurrentUserId 
} from '../../config/firebaseConfig';
import { 
  FirebaseUserProfile,
  FirebaseGoal,
  FirebaseQuest,
  FirebaseProgress,
  FirebaseMilestone,
  FirebaseQuestPreference,
  FirebaseProfileResponse,
  FIRESTORE_COLLECTIONS
} from '../../types/firebase';
import EnvironmentConfig from '../../config/environmentConfig';
import localStorageService from '../localStorage/localStorageService';

/**
 * Generic Firestore CRUD operations
 */
class FirestoreService {
  private db = getFirebaseFirestore;

  // ============================================================================
  // PATH HELPERS - PR1: Fix document paths
  // ============================================================================

  /**
   * Get user document reference (users/{uid} as document)
   */
  private userDoc(userId: string) {
    return doc(this.db(), 'users', userId);
  }

  /**
   * Get user subcollection reference (users/{uid}/{collectionName})
   */
  private userSubCollection(userId: string, collectionName: string) {
    return collection(this.db(), 'users', userId, collectionName);
  }

  // ============================================================================
  // PERSISTENCE POLICY HELPERS - PR2: Demo write policy
  // ============================================================================

  /**
   * Determine where to persist data based on environment configuration
   */
  private getPersistenceTarget(): 'firestore' | 'local' {
    const target = EnvironmentConfig.getPersistenceTarget();
    // For now, treat 'emulator' as 'firestore' since we use the same API
    return target === 'local' ? 'local' : 'firestore';
  }

  /**
   * Try Firestore operation with local fallback
   */
  private async tryFirestoreWithFallback<T>(
    firestoreOperation: () => Promise<T>,
    localOperation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const target = this.getPersistenceTarget();
    
    if (target === 'local') {
      console.log(`導 Using local storage for: ${operationName}`);
      return await localOperation();
    }
    
    try {
      console.log(`笘・ｸ・Using Firestore for: ${operationName}`);
      return await firestoreOperation();
    } catch (error) {
      console.warn(`笞・・Firestore failed for ${operationName}, falling back to local storage:`, error);
      return await localOperation();
    }
  }

  // ============================================================================
  // GENERIC CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new document
   */
  async create<T>(collectionPath: string, documentId: string, data: T): Promise<void> {
    try {
      const docRef = doc(this.db(), collectionPath, documentId);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`笨・Document created: ${collectionPath}/${documentId}`);
    } catch (error) {
      console.error(`笶・Error creating document ${collectionPath}/${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Read a document by ID
   */
  async read<T>(collectionPath: string, documentId: string): Promise<T | null> {
    try {
      const docRef = doc(this.db(), collectionPath, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as T;
      } else {
        console.log(`塘 Document not found: ${collectionPath}/${documentId}`);
        return null;
      }
    } catch (error) {
      console.error(`笶・Error reading document ${collectionPath}/${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Update a document
   */
  async update<T>(collectionPath: string, documentId: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(this.db(), collectionPath, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      console.log(`笨・Document updated: ${collectionPath}/${documentId}`);
    } catch (error) {
      console.error(`笶・Error updating document ${collectionPath}/${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async delete(collectionPath: string, documentId: string): Promise<void> {
    try {
      const docRef = doc(this.db(), collectionPath, documentId);
      await deleteDoc(docRef);
      console.log(`笨・Document deleted: ${collectionPath}/${documentId}`);
    } catch (error) {
      console.error(`笶・Error deleting document ${collectionPath}/${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Query documents with conditions
   */
  async query<T>(
    collectionPath: string,
    conditions: Array<{
      field: string;
      operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
      value: any;
    }> = [],
    orderByField?: string,
    orderDirection: 'asc' | 'desc' = 'desc',
    limitCount?: number
  ): Promise<T[]> {
    try {
      const collectionRef = collection(this.db(), collectionPath);
      let q = query(collectionRef);

      // Apply where conditions
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });

      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const results: T[] = [];
      
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() } as T);
      });

      console.log(`投 Query completed: ${collectionPath} (${results.length} documents)`);
      return results;
    } catch (error) {
      console.error(`笶・Error querying ${collectionPath}:`, error);
      throw error;
    }
  }

  /**
   * Batch write operations
   */
  async batchWrite(operations: Array<{
    type: 'create' | 'update' | 'delete';
    collectionPath: string;
    documentId: string;
    data?: any;
  }>): Promise<void> {
    try {
      const batch = writeBatch(this.db());
      
      operations.forEach(operation => {
        const docRef = doc(this.db(), operation.collectionPath, operation.documentId);
        
        switch (operation.type) {
          case 'create':
            batch.set(docRef, {
              ...operation.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;
          case 'update':
            batch.update(docRef, {
              ...operation.data,
              updatedAt: serverTimestamp(),
            });
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
      console.log(`笨・Batch write completed: ${operations.length} operations`);
    } catch (error) {
      console.error(`笶・Batch write error:`, error);
      throw error;
    }
  }

  /**
   * Listen to real-time updates
   */
  onDocumentChange<T>(
    collectionPath: string, 
    documentId: string, 
    callback: (data: T | null) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    try {
      const docRef = doc(this.db(), collectionPath, documentId);
      
      const unsubscribe = onSnapshot(
        docRef,
        (doc: DocumentSnapshot) => {
          if (doc.exists()) {
            callback(doc.data() as T);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(`笶・Real-time listener error for ${collectionPath}/${documentId}:`, error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );

      console.log(`曹 Real-time listener started: ${collectionPath}/${documentId}`);
      return unsubscribe;
    } catch (error) {
      console.error(`笶・Error setting up real-time listener:`, error);
      throw error;
    }
  }

  /**
   * Listen to collection changes
   */
  onCollectionChange<T>(
    collectionPath: string,
    callback: (data: T[]) => void,
    conditions: Array<{
      field: string;
      operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any';
      value: any;
    }> = [],
    errorCallback?: (error: Error) => void
  ): () => void {
    try {
      const collectionRef = collection(this.db(), collectionPath);
      let q = query(collectionRef);

      // Apply where conditions
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot: QuerySnapshot) => {
          const results: T[] = [];
          querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() } as T);
          });
          callback(results);
        },
        (error) => {
          console.error(`笶・Collection listener error for ${collectionPath}:`, error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );

      console.log(`曹 Collection listener started: ${collectionPath}`);
      return unsubscribe;
    } catch (error) {
      console.error(`笶・Error setting up collection listener:`, error);
      throw error;
    }
  }

  // ============================================================================
  // USER PROFILE OPERATIONS
  // ============================================================================

  async createUserProfile(userId: string, profileData: Partial<FirebaseUserProfile>): Promise<void> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const docRef = this.userDoc(userId);
        await setDoc(docRef, {
          userId,
          onboardingCompleted: false,
          onboardingVersion: '1.0',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...profileData,
        });
        console.log(`笨・User profile created: users/${userId}`);
      },
      async () => {
        await localStorageService.saveUserProfile(userId, profileData);
      },
      `createUserProfile(${userId})`
    );
  }

  async getUserProfile(userId: string): Promise<FirebaseUserProfile | null> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const docRef = this.userDoc(userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return docSnap.data() as FirebaseUserProfile;
        } else {
          console.log(`塘 User profile not found: users/${userId}`);
          return null;
        }
      },
      async () => {
        return await localStorageService.getUserProfile(userId);
      },
      `getUserProfile(${userId})`
    );
  }

  async updateUserProfile(userId: string, updates: Partial<FirebaseUserProfile>): Promise<void> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const docRef = this.userDoc(userId);
        await updateDoc(docRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
        console.log(`笨・User profile updated: users/${userId}`);
      },
      async () => {
        await localStorageService.updateUserProfile(userId, updates);
      },
      `updateUserProfile(${userId})`
    );
  }

  // ============================================================================
  // GOAL OPERATIONS
  // ============================================================================

  async createGoal(userId: string, goalData: Partial<FirebaseGoal>): Promise<string> {
    const goalId = `goal_${new Date().getTime()}`;
    
    return await this.tryFirestoreWithFallback(
      async () => {
        const goalsCollection = this.userSubCollection(userId, 'goals');
        const goalDoc = doc(goalsCollection, goalId);
        await setDoc(goalDoc, {
          id: goalId,
          userId,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...goalData,
        });
        console.log(`笨・Goal created: users/${userId}/goals/${goalId}`);
        return goalId;
      },
      async () => {
        return await localStorageService.saveGoal(userId, {
          id: goalId,
          ...goalData,
        });
      },
      `createGoal(${userId})`
    );
  }

  async getUserGoals(userId: string, status?: 'active' | 'paused' | 'completed' | 'archived'): Promise<FirebaseGoal[]> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const goalsCollection = this.userSubCollection(userId, 'goals');
        let q = query(goalsCollection);
        
        if (status) {
          q = query(q, where('status', '==', status));
        }
        
        q = query(q, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const results: FirebaseGoal[] = [];
        
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as FirebaseGoal);
        });

        console.log(`搭 Query completed: users/${userId}/goals (${results.length} documents)`);
        return results;
      },
      async () => {
        return await localStorageService.getUserGoals(userId, status);
      },
      `getUserGoals(${userId})`
    );
  }

  // ============================================================================
  // QUEST OPERATIONS
  // ============================================================================

  async createQuests(userId: string, quests: Partial<FirebaseQuest>[]): Promise<string[]> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const batch = writeBatch(this.db());
        const questIds: string[] = [];
        const questsCollection = this.userSubCollection(userId, 'quests');
        
        quests.forEach((quest, index) => {
          const questId = `quest_${new Date().getTime()}_${index}`;
          const questDoc = doc(questsCollection, questId);
          
          batch.set(questDoc, {
            id: questId,
            userId,
            status: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...quest,
          });
          
          questIds.push(questId);
        });

        await batch.commit();
        console.log(`笨・Batch quest creation completed: ${questIds.length} quests created for user ${userId}`);
        return questIds;
      },
      async () => {
        return await localStorageService.saveQuests(userId, quests);
      },
      `createQuests(${userId})`
    );
  }

  async getUserQuests(
    userId: string, 
    status?: 'pending' | 'active' | 'completed' | 'skipped' | 'failed'
  ): Promise<FirebaseQuest[]> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const questsCollection = this.userSubCollection(userId, 'quests');
        let q = query(questsCollection);
        
        if (status) {
          q = query(q, where('status', '==', status));
        }
        
        q = query(q, orderBy('createdAt', 'desc'));
        
        const querySnapshot = await getDocs(q);
        const results: FirebaseQuest[] = [];
        
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as FirebaseQuest);
        });

        console.log(`搭 Query completed: users/${userId}/quests (${results.length} documents)`);
        return results;
      },
      async () => {
        return await localStorageService.getUserQuests(userId, status);
      },
      `getUserQuests(${userId})`
    );
  }

  async updateQuestStatus(
    userId: string, 
    questId: string, 
    status: 'active' | 'completed' | 'skipped' | 'failed',
    outcome?: any
  ): Promise<void> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const questsCollection = this.userSubCollection(userId, 'quests');
        const questDoc = doc(questsCollection, questId);
        const updateData: any = { status, updatedAt: serverTimestamp() };
        
        if (status === 'completed') {
          updateData.completedAt = serverTimestamp();
        } else if (status === 'skipped') {
          updateData.skippedAt = serverTimestamp();
        }
        
        if (outcome) {
          updateData.outcome = outcome;
        }
        
        await updateDoc(questDoc, updateData);
        console.log(`笨・Quest status updated: users/${userId}/quests/${questId} -> ${status}`);
      },
      async () => {
        await localStorageService.updateQuestStatus(userId, questId, status, outcome);
      },
      `updateQuestStatus(${userId}/${questId})`
    );
  }

  // ============================================================================
  // PROGRESS OPERATIONS
  // ============================================================================

  async updateDailyProgress(userId: string, progressData: Partial<FirebaseProgress>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const progressId = `progress_${today}`;
    
    return await this.tryFirestoreWithFallback(
      async () => {
        const progressCollection = this.userSubCollection(userId, 'progress');
        const progressDoc = doc(progressCollection, progressId);
        
        // Use setDoc with merge to upsert (create or update)
        await setDoc(progressDoc, {
          id: progressId,
          userId,
          date: today,
          updatedAt: serverTimestamp(),
          ...progressData,
        }, { merge: true });
        
        console.log(`笨・Daily progress updated: users/${userId}/progress/${progressId}`);
      },
      async () => {
        await localStorageService.saveDailyProgress(userId, {
          id: progressId,
          ...progressData,
        });
      },
      `updateDailyProgress(${userId})`
    );
  }

  async getUserProgress(userId: string, days: number = 30): Promise<FirebaseProgress[]> {
    return await this.tryFirestoreWithFallback(
      async () => {
        const progressCollection = this.userSubCollection(userId, 'progress');
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const q = query(
          progressCollection,
          where('date', '>=', startDate.toISOString().split('T')[0]),
          orderBy('date', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const results: FirebaseProgress[] = [];
        
        querySnapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as FirebaseProgress);
        });

        console.log(`搭 Query completed: users/${userId}/progress (${results.length} documents)`);
        return results;
      },
      async () => {
        return await localStorageService.getUserProgress(userId, days);
      },
      `getUserProgress(${userId})`
    );
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToUserProfile(userId: string, callback: (profile: FirebaseUserProfile | null) => void): () => void {
    try {
      const docRef = this.userDoc(userId);
      
      const unsubscribe = onSnapshot(
        docRef,
        (doc: DocumentSnapshot) => {
          if (doc.exists()) {
            callback(doc.data() as FirebaseUserProfile);
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(`笶・Real-time listener error for users/${userId}:`, error);
        }
      );

      console.log(`曹 Real-time listener started: users/${userId}`);
      return unsubscribe;
    } catch (error) {
      console.error(`笶・Error setting up real-time listener:`, error);
      throw error;
    }
  }

  subscribeToUserQuests(
    userId: string, 
    callback: (quests: FirebaseQuest[]) => void,
    status?: string
  ): () => void {
    try {
      const questsCollection = this.userSubCollection(userId, 'quests');
      let q = query(questsCollection);
      
      if (status) {
        q = query(q, where('status', '==', status));
      }

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot: QuerySnapshot) => {
          const results: FirebaseQuest[] = [];
          querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() } as FirebaseQuest);
          });
          callback(results);
        },
        (error) => {
          console.error(`笶・Collection listener error for users/${userId}/quests:`, error);
        }
      );

      console.log(`曹 Collection listener started: users/${userId}/quests`);
      return unsubscribe;
    } catch (error) {
      console.error(`笶・Error setting up collection listener:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const firestoreService = new FirestoreService();
export default firestoreService;

