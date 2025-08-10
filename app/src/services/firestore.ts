import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  Timestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';

// Generic Firestore service class
export class FirestoreService {
  // Create document with auto-generated ID
  static async create<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('データの作成に失敗しました');
    }
  }

  // Create/Update document with specific ID
  static async set<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: T,
    merge = true
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      await setDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now(),
        ...(merge ? {} : { createdAt: Timestamp.now() })
      }, { merge });
    } catch (error) {
      console.error('Error setting document:', error);
      throw new Error('データの保存に失敗しました');
    }
  }

  // Get document by ID
  static async get<T = DocumentData>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw new Error('データの取得に失敗しました');
    }
  }

  // Update document
  static async update<T extends Partial<DocumentData>>(
    collectionName: string,
    documentId: string,
    data: T
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw new Error('データの更新に失敗しました');
    }
  }

  // Delete document
  static async delete(
    collectionName: string,
    documentId: string
  ): Promise<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('データの削除に失敗しました');
    }
  }

  // Query documents
  static async query<T = DocumentData>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    try {
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    } catch (error) {
      console.error('Error querying documents:', error);
      throw new Error('データの検索に失敗しました');
    }
  }

  // Query documents with simplified filter interface
  static async queryDocuments<T = DocumentData>(
    collectionName: string,
    filters: Array<{
      field: string;
      operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
      value: any;
    }> = []
  ): Promise<T[]> {
    try {
      const constraints: QueryConstraint[] = filters.map(filter => 
        where(filter.field, filter.operator, filter.value)
      );
      
      return this.query<T>(collectionName, constraints);
    } catch (error) {
      console.error('Error querying documents with filters:', error);
      throw new Error('データの検索に失敗しました');
    }
  }

  // Set document (alternative interface for non-static usage)
  async setDocument<T extends DocumentData>(
    collectionName: string,
    documentId: string,
    data: T,
    merge = true
  ): Promise<void> {
    return FirestoreService.set(collectionName, documentId, data, merge);
  }

  // Get document (alternative interface for non-static usage)
  async getDocument<T = DocumentData>(
    collectionName: string,
    documentId: string
  ): Promise<T | null> {
    return FirestoreService.get<T>(collectionName, documentId);
  }

  // Add document (alternative interface for non-static usage)
  async addDocument<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    return FirestoreService.create(collectionName, data);
  }

  // Query documents (alternative interface for non-static usage)
  async queryDocuments<T = DocumentData>(
    collectionName: string,
    filters: Array<{
      field: string;
      operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
      value: any;
    }> = []
  ): Promise<T[]> {
    return FirestoreService.queryDocuments<T>(collectionName, filters);
  }

  // Get documents by user ID
  static async getByUserId<T = DocumentData>(
    collectionName: string,
    userId: string,
    limitCount?: number
  ): Promise<T[]> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ];

    if (limitCount) {
      constraints.push(limit(limitCount));
    }

    return this.query<T>(collectionName, constraints);
  }
}

// Helper functions for common Firestore operations
export const firestoreHelpers = {
  // Convert Timestamp to Date
  timestampToDate: (timestamp: Timestamp): Date => timestamp.toDate(),
  
  // Convert Date to Timestamp
  dateToTimestamp: (date: Date): Timestamp => Timestamp.fromDate(date),
  
  // Get current timestamp
  now: (): Timestamp => Timestamp.now()
};