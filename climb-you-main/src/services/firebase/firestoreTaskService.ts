/**
 * Firestore Task Service
 * Firebase Firestore操作でタスクデータの永続化を管理
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnvironmentConfig } from '../../config/environmentConfig';
import { getCurrentUserId, getFirebaseFirestore } from '../../config/firebaseConfig';
import { Task } from '../../types';

const COLLECTION_NAME = 'tasks';
const LOCAL_STORAGE_KEY = 'climb_you_tasks';

interface FirestoreTask {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Timestamp | Date;
  completedAt?: Timestamp | Date | null;
  userId: string;
  isDummy?: boolean;
}

class FirestoreTaskService {
  private listeners: { [key: string]: () => void } = {};

  /**
   * タスクを作成
   */
  async createTask(title: string, description: string = ''): Promise<Task> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      // デモモードの場合はローカルストレージを使用
      if (envInfo.mode === 'demo') {
        return this.createTaskLocal(title, description);
      }

      const userId = await getCurrentUserId();
      const firestore = getFirebaseFirestore();
      
      const taskData: Omit<FirestoreTask, 'id'> = {
        title: title.trim(),
        description: description.trim(),
        completed: false,
        createdAt: serverTimestamp(),
        userId,
      };

      const docRef = await addDoc(collection(firestore, COLLECTION_NAME), taskData);
      
      const newTask: Task = {
        id: docRef.id,
        title: taskData.title,
        description: taskData.description,
        completed: taskData.completed,
        createdAt: new Date(),
      };

      console.log('🔥 Task created in Firestore:', newTask.id);
      return newTask;
    } catch (error) {
      console.error('❌ Error creating task:', error);
      // フォールバックとしてローカルストレージを使用
      return this.createTaskLocal(title, description);
    }
  }

  /**
   * タスクを更新
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      // デモモードの場合はローカルストレージを使用
      if (envInfo.mode === 'demo') {
        return this.updateTaskLocal(taskId, updates);
      }

      const firestore = getFirebaseFirestore();
      const taskRef = doc(firestore, COLLECTION_NAME, taskId);
      
      const firestoreUpdates: Partial<FirestoreTask> = {
        ...updates,
        completedAt: updates.completed ? serverTimestamp() : null,
      };

      await updateDoc(taskRef, firestoreUpdates);
      console.log('🔥 Task updated in Firestore:', taskId);
    } catch (error) {
      console.error('❌ Error updating task:', error);
      // フォールバックとしてローカルストレージを使用
      await this.updateTaskLocal(taskId, updates);
    }
  }

  /**
   * タスクを削除
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      // デモモードの場合はローカルストレージを使用
      if (envInfo.mode === 'demo') {
        return this.deleteTaskLocal(taskId);
      }

      const firestore = getFirebaseFirestore();
      const taskRef = doc(firestore, COLLECTION_NAME, taskId);
      
      await deleteDoc(taskRef);
      console.log('🔥 Task deleted from Firestore:', taskId);
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      // フォールバックとしてローカルストレージを使用
      await this.deleteTaskLocal(taskId);
    }
  }

  /**
   * 全タスクを取得
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      // デモモードの場合はローカルストレージを使用
      if (envInfo.mode === 'demo') {
        return this.getAllTasksLocal();
      }

      const userId = await getCurrentUserId();
      const firestore = getFirebaseFirestore();
      
      const q = query(
        collection(firestore, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const tasks: Task[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreTask;
        tasks.push(this.convertFirestoreToTask(doc.id, data));
      });

      console.log('🔥 Loaded tasks from Firestore:', tasks.length);
      return tasks;
    } catch (error) {
      console.error('❌ Error loading tasks:', error);
      // フォールバックとしてローカルストレージを使用
      return this.getAllTasksLocal();
    }
  }

  /**
   * タスクの変更をリアルタイムで監視
   */
  async subscribeToTasks(callback: (tasks: Task[]) => void): Promise<() => void> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      
      // デモモードの場合はローカルストレージを使用
      if (envInfo.mode === 'demo') {
        const tasks = await this.getAllTasksLocal();
        callback(tasks);
        return () => {}; // 空の unsubscribe 関数を返す
      }

      const userId = await getCurrentUserId();
      const firestore = getFirebaseFirestore();
      
      const q = query(
        collection(firestore, COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirestoreTask;
          tasks.push(this.convertFirestoreToTask(doc.id, data));
        });
        
        console.log('🔥 Real-time task update:', tasks.length);
        callback(tasks);
      });

      return unsubscribe;
    } catch (error) {
      console.error('❌ Error subscribing to tasks:', error);
      // フォールバックとしてローカルストレージからタスクを取得
      const tasks = await this.getAllTasksLocal();
      callback(tasks);
      return () => {};
    }
  }

  // ==========================================
  // ローカルストレージ用のフォールバック関数
  // ==========================================

  private async createTaskLocal(title: string, description: string): Promise<Task> {
    const tasks = await this.getAllTasksLocal();
    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      completed: false,
      createdAt: new Date(),
    };
    
    tasks.unshift(newTask);
    await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    
    console.log('💾 Task created locally:', newTask.id);
    return newTask;
  }

  private async updateTaskLocal(taskId: string, updates: Partial<Task>): Promise<void> {
    const tasks = await this.getAllTasksLocal();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      if (updates.completed !== undefined) {
        tasks[taskIndex].completedAt = updates.completed ? new Date() : undefined;
      }
      await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
      console.log('💾 Task updated locally:', taskId);
    }
  }

  private async deleteTaskLocal(taskId: string): Promise<void> {
    const tasks = await this.getAllTasksLocal();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    await AsyncStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filteredTasks));
    console.log('💾 Task deleted locally:', taskId);
  }

  private async getAllTasksLocal(): Promise<Task[]> {
    try {
      const savedTasks = await AsyncStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        return parsedTasks.map((task: any) => ({
          ...task,
          createdAt: new Date(task.createdAt),
          completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ Error loading local tasks:', error);
      return [];
    }
  }

  // ==========================================
  // ユーティリティ関数
  // ==========================================

  private convertFirestoreToTask(id: string, data: FirestoreTask): Task {
    return {
      id,
      title: data.title,
      description: data.description,
      completed: data.completed,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
      completedAt: data.completedAt 
        ? (data.completedAt instanceof Timestamp ? data.completedAt.toDate() : new Date(data.completedAt))
        : undefined,
      isDummy: data.isDummy,
    };
  }

  /**
   * サービスの健康状態チェック
   */
  async getHealthStatus(): Promise<{
    mode: string;
    canConnect: boolean;
    totalTasks: number;
  }> {
    try {
      const envInfo = EnvironmentConfig.getEnvironmentInfo();
      const tasks = await this.getAllTasks();
      
      return {
        mode: envInfo.mode,
        canConnect: envInfo.mode !== 'demo',
        totalTasks: tasks.length,
      };
    } catch (error) {
      const tasks = await this.getAllTasksLocal();
      return {
        mode: 'fallback',
        canConnect: false,
        totalTasks: tasks.length,
      };
    }
  }
}

export const firestoreTaskService = new FirestoreTaskService();
export default firestoreTaskService;