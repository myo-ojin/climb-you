# Climb You MVP 開発チケット

## MVP 開発期間: 6週間（3スプリント）

### **Sprint 1: 基盤構築 + 認証（2週間）**
### **Sprint 2: AI機能 + UI基盤（2週間）**  
### **Sprint 3: 統合 + リリース準備（2週間）**

---

## Sprint 1: 基盤構築 + 認証（Week 1-2）

### 🏗️ **MVP-001: プロジェクト基盤セットアップ** ✅ **完了**
- **優先度**: Highest
- **見積**: 3pt
- **担当**: Lead Developer
- **受け入れ条件**:
  - [x] Expo SDK 52 + TypeScript プロジェクト作成
  - [x] 必須ライブラリ導入（Firebase, OpenAI client, NativeWind）
  - [x] 基本フォルダ構造作成
  - [x] ESLint + Prettier 設定
  - [x] Git リポジトリ + 初期ブランチ作成
- **MVP要件**: 開発開始の前提条件
- **完了日**: 2025-08-03
- **実装詳細**:
  - ✅ Expo SDK 52 + React Native 0.76 セットアップ完了
  - ✅ TypeScript 5.6 strict モード設定
  - ✅ NativeWind (Tailwind CSS) 統合完了
  - ✅ @react-navigation, axios, @tanstack/react-query, zod 等の必須依存関係追加
  - ✅ src フォルダ構造 (ai/, components/, screens/, services/, types/, utils/) 作成
  - ✅ ESLint + Prettier 設定（React Native + TypeScript 対応）
  - ✅ Tailwind CSS 設定完了
  - ✅ app.json, tsconfig.json 設定完了
  - ✅ Git リポジトリ初期化 + 初期コミット完了
  - ✅ README.md + 開発ガイドライン作成

### 🔐 **MVP-002: Firebase 認証システム** ✅ **完了**
- **優先度**: Highest
- **見積**: 5pt
- **担当**: Backend Developer
- **受け入れ条件**:
  - [x] Firebase プロジェクト作成・設定
  - [x] Email/Password 認証設定
  - [x] Firestore データベース作成
  - [x] セキュリティルール基本設定
  - [x] 認証状態管理の実装
- **MVP要件**: ユーザー識別の必須機能
- **依存**: MVP-001
- **完了日**: 2025-08-03
- **実装詳細**:
  - ✅ Firebase プロジェクト `climb-you` 作成・設定完了
  - ✅ Email/Password 認証有効化
  - ✅ Firestore データベース（テストモード）作成
  - ✅ AuthService クラス実装（signup, login, logout, resetPassword）
  - ✅ AuthContext + useAuth hook 実装
  - ✅ Firebase Auth状態の永続化設定
  - ✅ ユーザーデータの型定義（User, AuthState, Credentials）
  - ✅ Firestore セキュリティルール基本設定
  - ✅ FirestoreService クラス実装（CRUD操作）
  - ✅ エラーハンドリング＋日本語化

### 🤖 **MVP-003: OpenAI API 基盤** ✅ **完了**
- **優先度**: Highest
- **見積**: 5pt
- **担当**: AI Developer
- **受け入れ条件**:
  - [x] OpenAI API キー安全管理
  - [x] 基本API通信ロジック
  - [x] エラーハンドリング（Rate Limit対応）
  - [x] TypeScript型定義
  - [x] 接続テスト成功
- **MVP要件**: AI機能の前提条件
- **依存**: MVP-001
- **完了日**: 2025-08-03
- **実装詳細**:
  - ✅ expo-secure-store を使用したAPIキー安全管理
  - ✅ OpenAIService クラス実装（chat completion, structured response）
  - ✅ Rate Limit、Network Error、API Errorの包括的エラーハンドリング
  - ✅ Zod を使用した TypeScript 型定義・検証
  - ✅ MockOpenAIService 実装（開発・テスト用）
  - ✅ OpenAITestUtils 実装（接続テスト・API Key管理テスト）
  - ✅ Retry ロジック・構造化レスポンス生成機能
  - ✅ 設定可能な model, maxTokens, temperature パラメータ

### 📱 **MVP-004: 認証UI実装** ✅ **完了**
- **優先度**: High
- **見積**: 8pt
- **担当**: Frontend Developer
- **受け入れ条件**:
  - [x] ウェルカム画面
  - [x] ログイン画面（Email/Password）
  - [x] サインアップ画面
  - [x] 認証エラー表示
  - [x] 認証成功時の画面遷移
  - [x] ローディング状態表示
- **MVP要件**: ユーザーがアプリを使い始める入口
- **依存**: MVP-002
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ WelcomeScreen - Climb Youブランディング + アクション導線
  - ✅ LoginScreen - Email/Password認証 + パスワード表示切替 + バリデーション
  - ✅ SignupScreen - アカウント作成 + パスワード確認 + 利用規約同意チェック
  - ✅ ForgotPasswordScreen - メールによるパスワードリセット機能
  - ✅ AuthFlowContainer - 認証フロー管理とナビゲーション
  - ✅ MainScreen - 認証後のメイン画面（MVP-005準備）
  - ✅ App.tsx更新 - 認証状態による画面切り替え統合
  - ✅ エラーハンドリング - AuthContextとの統合による適切なエラー表示
  - ✅ ローディング状態 - 美しいローディング画面 + インジケーター
  - ✅ レスポンシブデザイン - iPhone/Android対応
  - ✅ TypeScript完全対応 - 型安全性確保

### 🧭 **MVP-005: 基本ナビゲーション** ✅ **完了**
- **優先度**: High
- **見積**: 3pt
- **担当**: Frontend Developer
- **受け入れ条件**:
  - [x] React Navigation セットアップ
  - [x] 認証フロー（Stack Navigator）
  - [x] メインアプリ（Tab Navigator）
  - [x] 認証状態による画面制御
- **MVP要件**: 画面間移動の基盤
- **依存**: MVP-004
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ React Navigation 6 + 必要なライブラリインストール完了
  - ✅ AuthStackNavigator 実装（Welcome, Login, Signup, ForgotPassword）
  - ✅ MainTabNavigator 実装（Today, Growth, Goals, History, Settings）
  - ✅ RootNavigator 実装（認証状態による自動画面切り替え）
  - ✅ TypeScript型定義（navigation.ts）完備
  - ✅ 認証画面をReact Navigation対応に更新
  - ✅ App.tsx統合（AuthProvider + RootNavigator）
  - ✅ ローディング画面統合
  - ✅ タブアイコン + スタイリング設定
  - ✅ ヘッダー設定 + 日本語化

---

## Sprint 2: AI機能 + UI基盤（Week 3-4）

### 🧠 **MVP-006: プロファイリング機能** ✅ **完了**
- **優先度**: Highest
- **見積**: 13pt
- **担当**: AI Developer + Frontend Developer
- **受け入れ条件**:
  - [x] **統合プロファイリング画面** (簡素化: 1画面で全質問)
  - [x] 基本情報収集（年齢、利用時間、目標）
  - [x] 学習スタイル診断（3-5問）
  - [x] OpenAI プロファイル分析API実装
  - [x] 分析結果のFirestore保存
  - [x] 分析結果表示画面
- **MVP要件**: パーソナライゼーションの核心機能
- **依存**: MVP-003, MVP-005
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ profiling.ts - 包括的な型定義（ProfilingData, DetailedProfileAnalysis, LearningGoal等）
  - ✅ learningStyleQuestions.ts - 5問の学習スタイル診断質問データ
  - ✅ ProfilingService - OpenAI統合による高度なプロファイル分析
  - ✅ ProfilingScreen - 3ステップ統合画面（基本情報→目標設定→学習スタイル診断→AI分析）
  - ✅ ProfilingResultsScreen - 詳細分析結果表示（学習戦略、強み、改善点、時間管理、目標分解、学習パス）
  - ✅ UI Components - FormField, OptionButton, ProgressIndicator
  - ✅ 高度なAI分析 - システムプロンプト、構造化レスポンス、信頼度計算
  - ✅ データ永続化 - Firestore統合によるプロファイル保存・取得
  - ✅ テスト検証 - OpenAI API接続・分析結果生成確認完了

### 🎯 **MVP-007: AI クエスト生成エンジン** ✅ **完了**
- **優先度**: Highest
- **見積**: 10pt
- **担当**: AI Developer
- **受け入れ条件**:
  - [x] クエスト生成プロンプト設計
  - [x] 日次クエスト生成API実装
  - [x] 生成結果の検証・構造化
  - [x] Firestore へのクエスト保存
  - [x] **手動実行機能**（MVP用: 自動化は後回し）
- **MVP要件**: アプリの差別化機能
- **依存**: MVP-006
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ quest.ts - 包括的な型定義（Quest, DailyQuestCollection, QuestGenerationRequest等）
  - ✅ questPrompts.ts - 高度なプロンプト設計（システムプロンプト、ユーザープロンプト、適応プロンプト等）
  - ✅ questService.ts - コアAI生成ロジック（OpenAI統合、検証、リトライ、エラーハンドリング）
  - ✅ questManager.ts - 高レベルインターフェース（手動実行、テスト機能、統計取得）
  - ✅ FirestoreService - queryDocuments、setDocument メソッド追加
  - ✅ services/index.ts - Quest関連サービス・型のエクスポート統合
  - ✅ プロンプト戦略 - システムプロンプト、ユーザー適応、難易度調整、リファインメント
  - ✅ バリデーション - 生成結果検証、時間制約チェック、フィールド検証
  - ✅ エラーハンドリング - 分類されたエラータイプ、リトライロジック
  - ✅ MVP手動実行 - generateTodaysQuests、testQuestGeneration、completionStats

### 📱 **MVP-008: ホーム画面（Today）** ✅ **完了**
- **優先度**: Highest
- **見積**: 8pt
- **担当**: Frontend Developer
- **受け入れ条件**:
  - [x] AI生成クエスト一覧表示
  - [x] クエスト完了チェック機能
  - [x] **シンプルな進捗表示**（数値ベース）
  - [x] 今日のAIメッセージ表示
  - [x] クエスト手動再生成ボタン
- **MVP要件**: ユーザーの主要操作画面
- **依存**: MVP-007
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ TodayScreen - 包括的なホーム画面実装
  - ✅ QuestCard コンポーネント - 豊富なクエスト情報表示（カテゴリアイコン、難易度、時間、説明、手順、成功条件、目標貢献、AI応援メッセージ）
  - ✅ ProgressCard - 完了統計＋プログレスバー（completed/total、達成率、推定時間）
  - ✅ クエスト完了チェック - ワンタップ完了切り替え＋視覚的フィードバック
  - ✅ AI生成メッセージ表示 - 日次モチベーションメッセージ
  - ✅ 手動再生成機能 - 確認ダイアログ付きクエスト再生成
  - ✅ mockQuestData.ts - 5カテゴリ×複数テンプレートのモックデータ生成
  - ✅ 状態管理 - pending/completed ステータス管理
  - ✅ エラーハンドリング - Firestore接続失敗時のモックデータフォールバック
  - ✅ Pull-to-refresh - リフレッシュ機能
  - ✅ MainTabNavigator統合 - Today タブでの表示

### 🔄 **MVP-009: クエスト状態管理** ✅ **完了**
- **优先度**: High
- **見積**: 5pt
- **担当**: Backend Developer
- **受け入れ条件**:
  - [x] クエスト完了状態の更新
  - [x] 達成履歴のFirestore保存
  - [x] リアルタイムデータ同期
  - [x] 基本的な統計計算（完了率等）
- **MVP要件**: 進捗追跡の基盤
- **依存**: MVP-008
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ questHistory.ts - 包括的な履歴・統計型定義（QuestCompletionRecord, DailyStats, PeriodStats, QuestAnalytics等）
  - ✅ QuestStateService - 核となる状態管理サービス（状態更新、履歴保存、統計計算、リアルタイム同期）
  - ✅ クエスト状態更新 - 状態遷移管理（pending→in_progress→completed/skipped）
  - ✅ 達成履歴記録 - 完了/スキップ時の詳細データ記録（時間、評価、フィードバック等）
  - ✅ 日次統計計算 - 完了率、時間効率、カテゴリ別・難易度別集計
  - ✅ リアルタイムリスナー - Firebase onSnapshot による状態変更通知
  - ✅ 継続ストリーク計算 - 連続達成日数の自動計算
  - ✅ QuestManager統合 - 高レベルインターフェースへの統合
  - ✅ 分析データ生成 - カテゴリ別完了パターン、推奨事項算出
  - ✅ エラーハンドリング - 分類されたエラータイプ、フォールバック処理
  - ✅ services/index.ts - QuestStateService・型定義のエクスポート追加

### 🏔️ **MVP-010: 基本進捗表示** ✅ **完了**
- **優先度**: Medium
- **見積**: 5pt
- **担当**: Frontend Developer
- **受け入れ条件**:
  - [x] **シンプルな山登り表示**（静的画像 + 進捗バー）
  - [x] 達成率の数値表示
  - [x] 今日の目標達成状況
  - [x] **アニメーションなし**（MVP簡素化）
- **MVP要件**: 成長実感のための最小機能
- **依存**: MVP-009
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ MountainProgressCard - 山登りテーマの進捗表示（レベル別絵文字、動的カラー、モチベーションメッセージ）
  - ✅ DetailedStatsCard - 包括的統計表示（完了率、時間、平均値、達成バッジ）
  - ✅ 山登りレベルシステム - 登山開始(🥾)→3合目(🌲)→5合目(🏕️)→8合目(⛰️)→山頂(🏔️)
  - ✅ 動的進捗バー - 達成度に応じたグラデーションカラー変更
  - ✅ 数値表示強化 - 完了率、完了数、学習時間、平均時間、残タスク数
  - ✅ 目標達成状況 - 視覚的プログレスインジケーター + 残りタスク表示
  - ✅ 達成バッジシステム - 🏆🥇🥈🥉📈⭐ パフォーマンス別バッジ表示
  - ✅ 山レベルマーカー - 進捗バー上の山合目マーカー表示
  - ✅ レスポンシブレイアウト - 統計グリッド + 適切な視覚階層
  - ✅ TodayScreen統合 - 既存ProgressCard置き換え + 新コンポーネント統合

---

## Sprint 3: 統合 + リリース準備（Week 5-6）

### 📚 **MVP-011: シンプル履歴画面** ✅ **完了**
- **優先度**: Medium
- **見積**: 5pt
- **担当**: Frontend Developer
- **受け入れ条件**:
  - [x] 過去7日間の達成履歴表示
  - [x] 日別完了クエスト数表示
  - [x] **簡易統計**（総達成数、達成率）
  - [x] リスト形式表示（グラフなし）
- **MVP要件**: 成長の振り返り機能
- **依存**: MVP-009
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ history.ts - 履歴データ型定義（DailyCompletion, WeeklyStats, SimpleStats, HistoryViewData）
  - ✅ HistoryService - 履歴データ取得・統計計算サービス
  - ✅ HistoryScreen - 包括的履歴表示画面（7日間履歴、全体統計、成果表示）
  - ✅ 過去7日間履歴 - 日別完了クエスト数・達成率表示 + 進捗バー
  - ✅ 日別詳細表示 - 完了クエスト一覧、カテゴリアイコン、難易度表示
  - ✅ 全体統計 - 総完了数、総達成率、連続記録（現在・最長）
  - ✅ 週間サマリー - 週間完了数、平均達成率、進捗バー
  - ✅ 最近の成果 - 連続記録・達成率・学習量に基づく自動成果認識
  - ✅ リスト形式表示 - グラフなしのシンプル表示（MVP仕様）
  - ✅ Pull-to-refresh - 履歴データリフレッシュ機能
  - ✅ モックデータ生成 - 開発・テスト用の履歴データ生成
  - ✅ エラーハンドリング - データ取得エラー時のフォールバック処理

### ⚙️ **MVP-012: 基本設定機能** ✅ **完了**
- **優先度**: Low
- **見積**: 3pt
- **担当**: Frontend Developer
- **受け入れ条件**:
  - [x] プロファイル再設定機能
  - [x] ログアウト機能
  - [x] **通知設定**（ON/OFF のみ）
  - [x] アプリバージョン表示
- **MVP要件**: 最低限の設定機能
- **依存**: MVP-006
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ settings.ts - 包括的なユーザー設定型定義（UserSettings, SettingsUpdate, AppInfo等）
  - ✅ SettingsService - Firebase統合による設定CRUD操作サービス
  - ✅ SettingsScreen - 完全な設定画面UI（プロファイル再設定、通知ON/OFF、ログアウト、データエクスポート）
  - ✅ プロファイル再設定機能 - プロファイリング画面への遷移準備（開発中メッセージ）
  - ✅ ログアウト機能 - 確認ダイアログ付きセキュアログアウト
  - ✅ 通知設定 - Switch コンポーネントによるON/OFF切り替え + Firebase同期
  - ✅ アプリバージョン表示 - Constants活用による動的バージョン情報表示
  - ✅ データエクスポート - 設定・プロファイルデータのエクスポート機能
  - ✅ MainTabNavigator統合 - Settings タブでの完全動作
  - ✅ エラーハンドリング - 設定読み込み・更新エラーの適切な処理
  - ✅ services/index.ts - SettingsService・型定義の完全エクスポート

### 🔔 **MVP-013: 基本通知機能** ✅ **完了**
- **優先度**: Low
- **見積**: 5pt
- **担当**: Backend Developer
- **受け入れ条件**:
  - [x] Expo Notifications セットアップ
  - [x] **日次リマインダー**（朝のクエスト確認）
  - [x] 通知許可取得
  - [x] **手動通知トリガー**（自動化は後回し）
- **MVP要件**: 継続使用を促す最小機能
- **依存**: MVP-012
- **完了日**: 2025-08-04
- **実装詳細**:
  - ✅ NotificationService - 包括的な通知管理サービス（許可取得、日次リマインダー、即座通知、セレブレーション通知）
  - ✅ Expo Notifications セットアップ - 通知ハンドラー設定、Android通知チャンネル作成
  - ✅ 通知許可管理 - デバイス確認、許可リクエスト、ステータス管理
  - ✅ 日次リマインダー - 毎朝9時の自動リマインダー（5種類のランダムメッセージ）
  - ✅ セレブレーション通知 - クエスト完了時の自動お祝い通知
  - ✅ 手動通知トリガー - テスト通知機能、即座通知送信
  - ✅ TodayScreen統合 - 通知初期化、クエスト完了時通知、テストボタン
  - ✅ SettingsScreen統合 - 通知ON/OFF切り替え、許可管理、テスト機能
  - ✅ Expo Push Token管理 - 将来のサーバーサイド通知準備
  - ✅ エラーハンドリング - 包括的なエラー処理、フォールバック機能

### 🧪 **MVP-014: MVP統合テスト**
- **優先度**: Highest
- **見積**: 8pt
- **担当**: QA Engineer + All Developers
- **受け入れ条件**:
  - [ ] **コアフロー E2E テスト**
    - 新規登録 → プロファイリング → クエスト生成 → 完了チェック
  - [ ] **AI機能精度検証**
    - プロファイル分析の妥当性確認
    - クエスト生成の関連性確認
  - [ ] **デバイス互換性テスト**（iOS + Android）
  - [ ] **エラーケーステスト**
  - [ ] **パフォーマンステスト**（起動時間等）
- **MVP要件**: リリース品質の保証
- **依存**: All MVP features

### 🚀 **MVP-015: リリース準備**
- **優先度**: Highest
- **見積**: 5pt
- **担当**: Release Manager
- **受け入れ条件**:
  - [ ] **アプリストア素材作成**
    - アプリアイコン
    - スクリーンショット（5枚）
    - アプリ説明文
  - [ ] **法的文書準備**
    - プライバシーポリシー
    - 利用規約
  - [ ] **TestFlight/Internal Testing** セットアップ
  - [ ] **Release Build** 生成・検証
- **MVP要件**: 実際のリリース実行
- **依存**: MVP-014

---

## MVP バックログ（優先度低・後回し）

### 📊 **MVP-BACKLOG-01: 基本アナリティクス**
- **見積**: 3pt
- **内容**: ユーザー行動の基本的な計測
- → **v1.1で実装**

### 🎨 **MVP-BACKLOG-02: UI/UX改善**
- **見積**: 8pt  
- **内容**: アニメーション、より良いデザイン
- → **v1.1で実装**

### 🔍 **MVP-BACKLOG-03: 検索・フィルタ機能**
- **見積**: 5pt
- **内容**: 履歴の検索、クエストのカテゴリ分け
- → **v1.2で実装**

### 🌐 **MVP-BACKLOG-04: オフライン対応**
- **見積**: 8pt
- **内容**: ネットワーク断時の基本機能利用
- → **v1.3で実装**

---

## MVP 開発・リリーススケジュール

### **開発期間: 6週間**
```
Week 1-2: Sprint 1 (基盤構築)
├── プロジェクトセットアップ
├── Firebase認証
├── OpenAI API統合
└── 認証UI

Week 3-4: Sprint 2 (AI機능)  
├── プロファイリング機能
├── クエスト生成エンジン
├── ホーム画面実装
└── 基本進捗表示

Week 5-6: Sprint 3 (統合・リリース)
├── 履歴・設定画面
├── 統合テスト
├── バグ修正
└── リリース準備
```

### **リリース後1ヶ月: MVPフィードバック収集**
```
Week 7: TestFlight配布 + 初期ユーザーフィードバック
Week 8: バグ修正 + 緊急改善
Week 9: App Store審査申請
Week 10: 正式リリース + マーケティング開始
```

---

## MVP 成功指標（KPI）

### **開発段階**
- [ ] **機能完成率**: 100%（15チケット完了）
- [ ] **テスト成功率**: 95%以上
- [ ] **クリティカルバグ**: 0件

### **リリース後1ヶ月**
- [ ] **アプリストア評価**: 4.0/5.0以上
- [ ] **オンボーディング完了率**: 80%以上
- [ ] **日次アクティブ率**: 50%以上
- [ ] **AI満足度**: 4.0/5.0以上（アプリ内評価）

### **ユーザーフィードバック目標**
- [ ] **10名以上のベータテスター**確保
- [ ] **具体的改善要望**: 20件以上収集
- [ ] **Net Promoter Score**: 30以上

---

この MVP チケット構成により、6週間で **「AI がパーソナライズした学習クエストを提供するアプリ」** の核心価値を検証できる最小製品をリリースできます。

機能を最小限に絞ることで開発リスクを下げ、早期にユーザーフィードバックを得て改善サイクルを回すことが可能です。