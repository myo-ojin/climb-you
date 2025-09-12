/**
 * Environment Configuration - 環境切替設定
 * EXPO_PUBLIC_DEMO_MODE=true/false で簡単に切り替え
 */

export class EnvironmentConfig {
  private static _isDemoMode?: boolean;

  /**
   * デモモードかどうかを判定
   */
  static isDemoMode(): boolean {
    if (this._isDemoMode === undefined) {
      // 環境変数から判定
      const demoModeEnv = process.env.EXPO_PUBLIC_DEMO_MODE;
      const useMockAI = process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true';
      const aiEnabled = process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true';
      const useEmulator = process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATOR === 'true';
      const isDemoKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY === 'demo-api-key';

      // DEMO_MODE環境変数が設定されている場合はそれを優先
      if (demoModeEnv !== undefined) {
        this._isDemoMode = demoModeEnv === 'true';
      } else {
        // 他の設定からデモモードを推測
        this._isDemoMode = useMockAI || !aiEnabled || useEmulator || isDemoKey;
      }
    }
    return this._isDemoMode;
  }

  /**
   * 本番モードかどうかを判定
   */
  static isProductionMode(): boolean {
    return !this.isDemoMode();
  }

  /**
   * AI機能が有効かどうかを判定
   */
  static isAIEnabled(): boolean {
    if (this.isDemoMode()) {
      return false; // デモモードではAI無効
    }
    return process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true';
  }

  /**
   * Firebase エミュレーター使用かどうかを判定
   */
  static useFirebaseEmulator(): boolean {
    if (this.isDemoMode()) {
      return true; // デモモードではエミュレーター使用
    }
    return process.env.EXPO_PUBLIC_FIREBASE_USE_EMULATOR === 'true';
  }

  /**
   * Firebase 書き込みが有効かどうかを判定 - PR2: Demo write policy
   */
  static isFirebaseWriteEnabled(): boolean {
    // EXPO_PUBLIC_FIREBASE_WRITE_ENABLED環境変数で制御
    const writeEnabled = process.env.EXPO_PUBLIC_FIREBASE_WRITE_ENABLED;
    
    // 明示的にfalseに設定されている場合のみ無効
    if (writeEnabled === 'false') {
      return false;
    }
    
    // デフォルトは有効（書き込みを行う）
    return true;
  }

  /**
   * データの永続化先を決定 - PR2: Demo write policy
   * @returns 'firestore' | 'emulator' | 'local'
   */
  static getPersistenceTarget(): 'firestore' | 'emulator' | 'local' {
    if (!this.isFirebaseWriteEnabled()) {
      return 'local'; // 書き込み無効の場合はローカル保存
    }
    
    if (this.isDemoMode() || this.useFirebaseEmulator()) {
      return 'emulator'; // デモ/エミュレーターモード
    }
    
    return 'firestore'; // 本番Firestore
  }

  /**
   * 現在の環境設定を表示 - PR2: Demo write policy updated
   */
  static getEnvironmentInfo(): {
    mode: 'demo' | 'production';
    aiEnabled: boolean;
    firebaseEmulator: boolean;
    firebaseWriteEnabled: boolean;
    persistenceTarget: 'firestore' | 'emulator' | 'local';
    mockAI: boolean;
    debugMode: boolean;
  } {
    return {
      mode: this.isDemoMode() ? 'demo' : 'production',
      aiEnabled: this.isAIEnabled(),
      firebaseEmulator: this.useFirebaseEmulator(),
      firebaseWriteEnabled: this.isFirebaseWriteEnabled(),
      persistenceTarget: this.getPersistenceTarget(),
      mockAI: this.isDemoMode() || process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true',
      debugMode: process.env.EXPO_PUBLIC_DEBUG_API_CALLS === 'true'
    };
  }

  /**
   * 強制的にデモモードに設定（テスト用）
   */
  static forceDemo(): void {
    this._isDemoMode = true;
  }

  /**
   * 強制的に本番モードに設定（テスト用）
   */
  static forceProduction(): void {
    this._isDemoMode = false;
  }

  /**
   * キャッシュをリセット
   */
  static reset(): void {
    this._isDemoMode = undefined;
  }
}

// デフォルトエクスポート
export default EnvironmentConfig;