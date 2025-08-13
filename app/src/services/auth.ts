import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  onAuthStateChanged,
  Unsubscribe
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { User, LoginCredentials, SignupCredentials } from '../types/auth';

// Convert Firebase User to our User type
export const convertFirebaseUser = (firebaseUser: FirebaseUser): User => ({
  id: firebaseUser.uid,
  email: firebaseUser.email!,
  displayName: firebaseUser.displayName || undefined,
  photoURL: firebaseUser.photoURL || undefined,
  emailVerified: firebaseUser.emailVerified,
  createdAt: firebaseUser.metadata.creationTime 
    ? new Date(firebaseUser.metadata.creationTime) 
    : new Date()
});

// Auth service functions
export class AuthService {
  // Sign up with email and password
  static async signup({ email, password, displayName }: SignupCredentials): Promise<User> {
    try {
      const auth = getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      return convertFirebaseUser(userCredential.user);
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Sign in with email and password
  static async login({ email, password }: LoginCredentials): Promise<User> {
    try {
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return convertFirebaseUser(userCredential.user);
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Sign out
  static async logout(): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
    } catch (error: any) {
      throw new Error('ログアウトに失敗しました');
    }
  }

  // Send password reset email
  static async resetPassword(email: string): Promise<void> {
    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  // Listen to auth state changes
  static onAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (firebaseUser) => {
      const user = firebaseUser ? convertFirebaseUser(firebaseUser) : null;
      callback(user);
    });
  }

  // Get current user
  static getCurrentUser(): User | null {
    const auth = getFirebaseAuth();
    const firebaseUser = auth.currentUser;
    return firebaseUser ? convertFirebaseUser(firebaseUser) : null;
  }

  // Convert Firebase auth error codes to user-friendly messages
  private static getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-disabled':
        return 'このアカウントは無効になっています';
      case 'auth/user-not-found':
        return 'ユーザーが見つかりません';
      case 'auth/wrong-password':
        return 'パスワードが間違っています';
      case 'auth/email-already-in-use':
        return 'このメールアドレスは既に使用されています';
      case 'auth/weak-password':
        return 'パスワードが弱すぎます。6文字以上入力してください';
      case 'auth/invalid-email':
        return '有効なメールアドレスを入力してください';
      case 'auth/too-many-requests':
        return 'リクエストが多すぎます。しばらく待ってから再試行してください';
      case 'auth/network-request-failed':
        return 'ネットワークエラーが発生しました';
      default:
        return '認証エラーが発生しました';
    }
  }
}