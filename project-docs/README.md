# Climb You - プロジェクトドキュメント

AI駆動のパーソナライズド学習支援モバイルアプリ「Climb You」の包括的なプロジェクトドキュメントです。

## 📁 ドキュメント構造

### 00_project_overview - プロジェクト概要
- **01_requirements.md** - 要件定義書
- **02_product_vision.md** - プロダクトビジョン  
- **03_glossary.md** - 用語集・グロッサリー

### 01_architecture - システム設計
- **01_system_overview.md** - システム全体構成
- **02_mobile_architecture.md** - モバイルアプリアーキテクチャ
- **03_state_management_zustand.md** - 状態管理設計（Zustand）
- **04_data_flow_and_layers.md** - データフロー・レイヤー設計
- **05_navigation_design.md** - ナビゲーション設計
- **06_realtime_and_ws.md** - リアルタイム・WebSocket設計
- **07_error_handling_policy.md** - エラーハンドリング・ポリシー
- **08_security_design.md** - セキュリティ設計
- **09_performance_and_optimization.md** - パフォーマンス最適化設計
- **10_environment_and_secrets.md** - 環境設定・シークレット管理

### 02_backend_integration - バックエンド統合
*（将来の拡張用フォルダ）*

### 03_feature_specs - 機能仕様
*（将来の拡張用フォルダ）*

### 04_design_system - デザインシステム
*（将来の拡張用フォルダ）*

### 05_testing_quality - テスト・品質保証
*（将来の拡張用フォルダ）*

### 06_build_release - ビルド・リリース
*（将来の拡張用フォルダ）*

### 07_operational_runbook - 運用手順書
*（将来の拡張用フォルダ）*

### 99_appendix - 付録
*（将来の拡張用フォルダ）*

## 🎯 プロジェクト概要

「Climb You」は、AI駆動のパーソナライズされた学習支援により、長期的な夢や目標を日々の最適化されたクエストに分解し、ユーザーの学習パターンに適応しながら"山を一歩一歩登る"ように成長を実感できるモバイルアプリです。

### 核心的差別化要素
- **初期プロファイリング**: ユーザーの学習スタイル、目標、制約を詳細分析
- **AI駆動クエスト生成**: OpenAI APIを活用したパーソナライズされた日次クエスト自動生成
- **適応学習エンジン**: 学習パターン分析による動的な難易度・内容調整
- **インテリジェント進捗追跡**: 単純な達成記録を超えた成長洞察の提供

## 🛠️ 技術スタック

### フロントエンド
- React Native (Expo SDK 52) - React Native 0.77相当
- TypeScript 5.x - 型安全性の確保
- NativeWind 2.x - Tailwind CSS スタイリング
- React Navigation 7.x - 画面遷移管理

### AI・データ処理
- OpenAI API v1 (GPT-4o) - プロファイリング・クエスト生成
- axios 1.x - API通信
- @tanstack/react-query 5.x - API状態管理・キャッシング
- zod 3.x - スキーマ検証

### バックエンド・データベース
- Firebase Authentication - ユーザー認証
- Firebase Firestore - NoSQLデータベース
- Firebase Security Rules - データ保護

### セキュリティ・環境管理
- expo-secure-store - APIキー安全保存
- expo-constants - 環境変数管理

## 📋 開発ロードマップ

### Phase 1: AI基盤構築（2-3週間）
1. プロジェクト初期設定 - Expo + TypeScript + Firebase
2. OpenAI API統合 - 認証・基本通信・エラーハンドリング
3. ユーザー認証機能 - Firebase Auth実装

### Phase 2: コアAI機能開発（3-4週間）
4. プロファイリング機能 - 診断UI + AI分析 + 結果保存
5. クエスト生成エンジン - プロンプト設計 + 生成ロジック + 検証
6. 基本UI実装 - ホーム画面 + クエスト表示 + 達成チェック

### Phase 3: 適応学習・分析機能（2-3週間）
7. 学習パターン分析 - データ収集 + 分析ロジック
8. 適応調整機能 - 難易度調整 + 内容最適化
9. インサイト画面 - 成長分析 + AI レポート

### Phase 4: 統合・最適化（2週間）
10. 山登り進捗UI - アニメーション + AI連携演出
11. 履歴・目標管理 - データ可視化 + 管理機能
12. パフォーマンス最適化 - API使用量削減 + キャッシング

### Phase 5: テスト・リリース準備（1週間）
13. 包括的テスト - AI精度検証 + UXテスト + セキュリティ検証
14. リリース準備 - ストア申請 + ドキュメント + 運用準備

## 📊 成功指標・KPI

### ユーザーエンゲージメント
- **オンボーディング完了率**: 85%以上
- **日次アクティブ率**: 70%以上
- **クエスト完了率**: 65%以上（AI調整による維持）

### AI機能効果
- **プロファイリング精度**: ユーザー満足度4.5/5以上
- **クエスト関連性**: 「役立った」評価80%以上
- **適応学習効果**: 継続率の2週間後向上20%以上

### ビジネス指標
- **月次継続率**: 60%以上
- **Net Promoter Score**: 50以上
- **App Store評価**: 4.3/5以上

## 🔄 ドキュメントの更新

このドキュメントは開発進捗に応じて継続的に更新されます。各フェーズの完了時に該当セクションの詳細化を行い、実装内容との整合性を保ちます。

---

**コンセプト**: 「AIがあなたを理解し、最適な成長の道筋を毎日提案するパーソナル学習コーチ」

**キャッチコピー**: "Your AI-powered growth companion. For your next step."