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

/**
 * Generic Firestore CRUD operations
 */
class FirestoreService {
  private db = getFirebaseFirestore;

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
      console.log(`✅ Document created: ${collectionPath}/${documentId}`);
    } catch (error) {
      console.error(`❌ Error creating document ${collectionPath}/${documentId}:`, error);
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
        console.log(`📄 Document not found: ${collectionPath}/${documentId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error reading document ${collectionPath}/${documentId}:`, error);
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
      console.log(`✅ Document updated: ${collectionPath}/${documentId}`);
    } catch (error) {
      console.error(`❌ Error updating document ${collectionPath}/${documentId}:`, error);
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
      console.log(`✅ Document deleted: ${collectionPath}/${documentId}`);
    } catch (error) {
      console.error(`❌ Error deleting document ${collectionPath}/${documentId}:`, error);
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

      console.log(`📊 Query completed: ${collectionPath} (${results.length} documents)`);
      return results;
    } catch (error) {
      console.error(`❌ Error querying ${collectionPath}:`, error);
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
      console.log(`✅ Batch write completed: ${operations.length} operations`);
    } catch (error) {
      console.error(`❌ Batch write error:`, error);
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
          console.error(`❌ Real-time listener error for ${collectionPath}/${documentId}:`, error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );

      console.log(`👂 Real-time listener started: ${collectionPath}/${documentId}`);
      return unsubscribe;
    } catch (error) {
      console.error(`❌ Error setting up real-time listener:`, error);
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
          console.error(`❌ Collection listener error for ${collectionPath}:`, error);
          if (errorCallback) {
            errorCallback(error);
          }
        }
      );

      console.log(`👂 Collection listener started: ${collectionPath}`);
      return unsubscribe;
    } catch (error) {
      console.error(`❌ Error setting up collection listener:`, error);
      throw error;
    }
  }

  // ============================================================================
  // USER PROFILE OPERATIONS
  // ============================================================================

  async createUserProfile(userId: string, profileData: Partial<FirebaseUserProfile>): Promise<void> {
    const userDocPath = FIRESTORE_COLLECTIONS.users(userId);
    await this.create(userDocPath, '', {
      userId,
      onboardingCompleted: false,
      onboardingVersion: '1.0',
      ...profileData,
    });
  }

  async getUserProfile(userId: string): Promise<FirebaseUserProfile | null> {
    const userDocPath = FIRESTORE_COLLECTIONS.users(userId);
    return await this.read<FirebaseUserProfile>(userDocPath, '');
  }

  async updateUserProfile(userId: string, updates: Partial<FirebaseUserProfile>): Promise<void> {
    const userDocPath = FIRESTORE_COLLECTIONS.users(userId);
    await this.update(userDocPath, '', updates);
  }

  // ============================================================================
  // GOAL OPERATIONS
  // ============================================================================

  async createGoal(userId: string, goalData: Partial<FirebaseGoal>): Promise<string> {
    const goalId = `goal_${Date.now()}`;
    const goalsCollectionPath = FIRESTORE_COLLECTIONS.goals(userId);
    await this.create(goalsCollectionPath, goalId, {
      id: goalId,
      userId,
      status: 'active',
      ...goalData,
    });
    return goalId;
  }

  async getUserGoals(userId: string, status?: 'active' | 'paused' | 'completed' | 'archived'): Promise<FirebaseGoal[]> {
    const goalsCollectionPath = FIRESTORE_COLLECTIONS.goals(userId);
    const conditions = status ? [{ field: 'status', operator: '==', value: status }] : [];
    return await this.query<FirebaseGoal>(goalsCollectionPath, conditions, 'createdAt', 'desc');
  }

  // ============================================================================
  // QUEST OPERATIONS
  // ============================================================================

  async createQuests(userId: string, quests: Partial<FirebaseQuest>[]): Promise<string[]> {
    const operations = quests.map((quest, index) => {
      const questId = `quest_${Date.now()}_${index}`;
      return {
        type: 'create' as const,
        collectionPath: FIRESTORE_COLLECTIONS.quests(userId),
        documentId: questId,
        data: {
          id: questId,
          userId,
          status: 'pending',
          ...quest,
        },
      };
    });

    await this.batchWrite(operations);
    return operations.map(op => op.documentId);
  }

  async getUserQuests(
    userId: string, 
    status?: 'pending' | 'active' | 'completed' | 'skipped' | 'failed'
  ): Promise<FirebaseQuest[]> {
    const questsCollectionPath = FIRESTORE_COLLECTIONS.quests(userId);
    const conditions = status ? [{ field: 'status', operator: '==', value: status }] : [];
    return await this.query<FirebaseQuest>(questsCollectionPath, conditions, 'createdAt', 'desc');
  }

  async updateQuestStatus(
    userId: string, 
    questId: string, 
    status: 'active' | 'completed' | 'skipped' | 'failed',
    outcome?: any
  ): Promise<void> {
    const questsCollectionPath = FIRESTORE_COLLECTIONS.quests(userId);
    const updateData: any = { status };
    
    if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    } else if (status === 'skipped') {
      updateData.skippedAt = serverTimestamp();
    }
    
    if (outcome) {
      updateData.outcome = outcome;
    }
    
    await this.update(questsCollectionPath, questId, updateData);
  }

  // ============================================================================
  // PROGRESS OPERATIONS
  // ============================================================================

  async updateDailyProgress(userId: string, progressData: Partial<FirebaseProgress>): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const progressId = `progress_${today}`;
    const progressCollectionPath = FIRESTORE_COLLECTIONS.progress(userId);
    
    // Try to update existing progress, create if doesn't exist
    try {
      await this.update(progressCollectionPath, progressId, progressData);
    } catch (error) {
      // If document doesn't exist, create it
      await this.create(progressCollectionPath, progressId, {
        id: progressId,
        userId,
        date: today,
        ...progressData,
      });
    }
  }

  async getUserProgress(userId: string, days: number = 30): Promise<FirebaseProgress[]> {
    const progressCollectionPath = FIRESTORE_COLLECTIONS.progress(userId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.query<FirebaseProgress>(
      progressCollectionPath,
      [{ field: 'date', operator: '>=', value: startDate.toISOString().split('T')[0] }],
      'date',
      'desc'
    );
  }

  // ============================================================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================================================

  subscribeToUserProfile(userId: string, callback: (profile: FirebaseUserProfile | null) => void): () => void {
    const userDocPath = FIRESTORE_COLLECTIONS.users(userId);
    return this.onDocumentChange<FirebaseUserProfile>(userDocPath, '', callback);
  }

  subscribeToUserQuests(
    userId: string, 
    callback: (quests: FirebaseQuest[]) => void,
    status?: string
  ): () => void {
    const questsCollectionPath = FIRESTORE_COLLECTIONS.quests(userId);
    const conditions = status ? [{ field: 'status', operator: '==', value: status }] : [];
    return this.onCollectionChange<FirebaseQuest>(questsCollectionPath, callback, conditions);
  }
}

// Create singleton instance
export const firestoreService = new FirestoreService();
export default firestoreService;