# Climb You - AI Learning Assistant

AI駆動のパーソナライズ学習支援アプリ

## 技術スタック

- **フロントエンド**: React Native (Expo SDK 52) + TypeScript
- **スタイリング**: NativeWind (Tailwind CSS)
- **AI機能**: OpenAI API (GPT-4o)
- **バックエンド**: Firebase (Auth + Firestore)
- **状態管理**: React Query + Context API

## 開発環境セットアップ

### 必須要件
- Node.js 18+
- Expo CLI
- Git

### インストール
```bash
npm install
```

### 開発サーバー起動
```bash
npm start
```

### その他のコマンド
```bash
npm run android    # Android エミュレータで起動
npm run ios        # iOS シミュレータで起動
npm run web        # Web ブラウザで起動
npm run lint       # ESLint チェック
npm run type-check # TypeScript 型チェック
npm test           # テスト実行
```

## プロジェクト構造

```
src/
├── ai/          # AI機能 (OpenAI API, プロンプト等)
├── components/  # 再利用可能なUIコンポーネント
├── screens/     # 画面コンポーネント
├── services/    # API通信、データ処理
├── types/       # TypeScript型定義
└── utils/       # ユーティリティ関数
```

## MVP 機能

### Sprint 1: 基盤構築
- [x] プロジェクト初期設定
- [ ] Firebase 認証システム
- [ ] OpenAI API 基盤
- [ ] 認証UI実装

### Sprint 2: AI機能
- [ ] プロファイリング機能
- [ ] AI クエスト生成エンジン
- [ ] ホーム画面（Today）

### Sprint 3: 統合・リリース
- [ ] 履歴画面
- [ ] 設定機能
- [ ] 統合テスト
- [ ] リリース準備

## 開発ガイドライン

- TypeScript Strict モード使用
- ESLint + Prettier によるコード品質維持
- Git Flow ブランチ戦略
- Conventional Commits 準拠