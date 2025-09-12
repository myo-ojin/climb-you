/**
 * Advanced Quest Service - 設計書のプロンプト品質を活用
 * 
 * promptEngine.tsの高品質プロンプトとOpenAI APIを統合した
 * 次世代クエスト生成サービス
 */

import {
  BasicLLM,
  LLM,
  ProfileV1,
  Derived,
  DailyCheckins,
  SkillAtom,
  Quest,
  QuestList,
  Constraints,
  buildSkillMapPrompt,
  buildDailyQuestsPrompt,
  buildPolicyCheckPrompt,
  buildDerived,
  buildConstraints,
  clampToSession,
  avoidConsecutiveSamePattern,
  SkillAtomSchema,
  QuestListSchema,
  extractFirstJson,
} from './promptEngine';

import { z } from 'zod';
import { apiKeyManager } from '../../config/apiKeys';
import { EnvironmentConfig } from '../../config/environmentConfig';

class AdvancedQuestService {
  private llm: LLM | null = null;
  private useRealAI: boolean = false;

  /**
   * 環境設定に基づいてサービスを自動初期化
   */
  initialize(): boolean {
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    const config = apiKeyManager.getOpenAIConfig();
    
    // 🎭 デモモードまたはAI機能無効時は強制的にモック使用
    if (envInfo.mode === 'demo' || !envInfo.aiEnabled) {
      this.useRealAI = false;
      console.log(`🎭 Advanced Quest Service: ${envInfo.mode.toUpperCase()} mode - AI disabled`);
    } else if (config.apiKey && config.apiKey.startsWith('sk-')) {
      this.useRealAI = true;
      console.log('🚀 Advanced Quest Service: PRODUCTION mode - Real AI enabled');
    } else {
      this.useRealAI = false;
      console.warn('⚠️ Advanced Quest Service: API key invalid, using mock mode');
    }
    
    console.log('📊 Environment Info:', JSON.stringify(envInfo, null, 2));

    // モック機能またはOpenAI統合
    this.llm = new BasicLLM(async ({ system, prompt, temperature }) => {
      if (!this.useRealAI) {
        console.log('🎭 Using Mock AI Response (Quest Service)');
        return this.generateMockResponse(prompt);
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            system ? { role: 'system', content: system } : null,
            { role: 'user', content: prompt }
          ].filter(Boolean),
          temperature: temperature ?? config.temperature,
          max_tokens: config.maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content ?? '';
    });

    console.log(`✅ Advanced Quest Service initialized with ${this.useRealAI ? 'Real API' : 'Mock'} configuration`);
    return true;
  }

  /**
   * 手動でAPIキーを指定してサービスを初期化（開発用）
   */
  initializeWithKey(apiKey: string): void {
    const config = apiKeyManager.getOpenAIConfig();
    const envInfo = EnvironmentConfig.getEnvironmentInfo();
    
    // デモモード時は強制的にモック使用
    if (envInfo.mode === 'demo') {
      console.log('🎭 Demo mode: Ignoring manual API key, using mock mode');
      this.useRealAI = false;
      this.llm = new BasicLLM(async ({ system, prompt, temperature }) => {
        return this.generateMockResponse(prompt);
      });
      return;
    }
    
    this.useRealAI = true;
    
    // OpenAI統合（設計書のBasicLLMパターンを使用）
    this.llm = new BasicLLM(async ({ system, prompt, temperature }) => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            system ? { role: 'system', content: system } : null,
            { role: 'user', content: prompt }
          ].filter(Boolean),
          temperature: temperature ?? config.temperature,
          max_tokens: config.maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.choices[0].message.content ?? '';
    });

    console.log('✅ Advanced Quest Service initialized with manual API key');
  }

  /**
   * モックAI応答の生成
   */
  private generateMockResponse(prompt: string): string {
    console.log('🎭 Mock prompt received:', prompt.substring(0, 200));
    console.log('🎭 Prompt includes skill_map?', prompt.includes('skill_map'));
    console.log('🎭 Prompt includes スキルマップ?', prompt.includes('スキルマップ'));
    console.log('🎭 Prompt includes Skill Map?', prompt.includes('Skill Map'));
    
    // クエスト生成プロンプトをまず最初にチェック
    console.log('🎭 Checking quest conditions...');
    console.log('🎭 Includes 本日のクエスト?', prompt.includes('本日のクエスト'));
    console.log('🎭 Includes daily_quests?', prompt.includes('daily_quests'));
    console.log('🎭 Includes クエスト?', prompt.includes('クエスト'));
    console.log('🎭 Includes 学習プランナー?', prompt.includes('学習プランナー'));
    
    if (prompt.includes('本日のクエスト') || 
        prompt.includes('daily_quests') || 
        prompt.includes('クエスト') ||
        prompt.includes('学習プランナー')) {
      console.log('🎭 Detected QUEST generation prompt');
      
      // プロンプトから目標テキストを抽出
      let goalText = '学習目標';
      const goalMatch = prompt.match(/(?:目標|goal|long_term_goal)[：:\s]*["""]?([^"""，。、\n]+)/i);
      if (goalMatch) {
        goalText = goalMatch[1].trim();
      }
      
      console.log('🎯 Extracted goal from prompt:', goalText);
      
      // 目標に応じたクエストを生成
      let questData;
      if (goalText.includes('英語') || goalText.includes('English') || goalText.includes('english')) {
        questData = {
          quests: [
            {
              title: "基礎英単語学習",
              pattern: "flashcards",
              minutes: 20,
              difficulty: 0.3,
              deliverable: "英単語フラッシュカードセット",
              steps: [
                "日常会話でよく使う英単語50個を選ぶ",
                "単語の意味と発音を確認する",
                "フラッシュカードで暗記練習"
              ],
              criteria: [
                "50個の基礎単語を正しく発音できる",
                "単語の意味を理解して使える"
              ],
              tags: ["英語", "単語", "基礎"]
            },
            {
              title: "英会話フレーズ練習",
              pattern: "build_micro",
              minutes: 25,
              difficulty: 0.4,
              deliverable: "自己紹介と挨拶の録音",
              steps: [
                "基本的な挨拶と自己紹介フレーズを学ぶ",
                "発音練習を繰り返し行う",
                "実際に声に出して録音する"
              ],
              criteria: [
                "自然な発音で自己紹介ができる",
                "基本的な挨拶を適切に使える"
              ],
              tags: ["英語", "会話", "発音"]
            },
            {
              title: "リスニング基礎トレーニング",
              pattern: "read_note_q",
              minutes: 30,
              difficulty: 0.5,
              deliverable: "リスニング学習ノート",
              steps: [
                "英語学習用動画を選んで視聴する",
                "聞き取れた内容をメモする",
                "分からない単語を調べる"
              ],
              criteria: [
                "基本的な英語の音を聞き分けられる",
                "簡単な会話の内容を理解できる"
              ],
              tags: ["英語", "リスニング", "理解"]
            }
          ],
          rationale: ["英語学習の基礎から段階的にアプローチ", "話すスキルを重視した構成", "実践的な練習を取り入れた設計"]
        };
      } else if (goalText.includes('プログラミング') || goalText.includes('React') || goalText.includes('開発')) {
        questData = {
          quests: [
            {
              title: "プログラミング基礎学習",
              pattern: "read_note_q",
              minutes: 25,
              difficulty: 0.3,
              deliverable: "基礎概念学習ノート",
              steps: [
                "プログラミングの基本概念を学ぶ",
                "要点をメモにまとめる",
                "理解度確認の問題を作成して解く"
              ],
              criteria: [
                "プログラミングの基本概念を説明できる",
                "変数や関数の概念を理解している"
              ],
              tags: ["プログラミング", "基礎", "学習"]
            },
            {
              title: "実践的なコード作成",
              pattern: "build_micro",
              minutes: 30,
              difficulty: 0.5,
              deliverable: "動作するサンプルプログラム",
              steps: [
                "簡単なプログラムを設計する",
                "コードを実装して動作確認",
                "コードの見直しと改善"
              ],
              criteria: [
                "基本的な文法を使ってプログラムを書ける",
                "エラーを見つけて修正できる"
              ],
              tags: ["プログラミング", "実践", "コーディング"]
            },
            {
              title: "開発環境セットアップ",
              pattern: "config_verify",
              minutes: 20,
              difficulty: 0.4,
              deliverable: "動作確認済み開発環境",
              steps: [
                "必要なツールをインストール",
                "設定ファイルを作成",
                "動作確認テストを実行"
              ],
              criteria: [
                "開発環境が正しく動作する",
                "基本的なツールを使いこなせる"
              ],
              tags: ["開発環境", "セットアップ", "ツール"]
            }
          ],
          rationale: ["プログラミング学習の基礎から応用", "理論と実践のバランス", "環境構築から実装まで網羅"]
        };
      } else {
        // 一般的な学習目標の場合
        questData = {
          quests: [
            {
              title: `${goalText}の基礎学習`,
              pattern: "read_note_q",
              minutes: 25,
              difficulty: 0.3,
              deliverable: "学習ノートとまとめ",
              steps: [
                "基本的な概念や用語を調べる",
                "重要なポイントをメモにまとめる",
                "理解度を確認する問題を作成"
              ],
              criteria: [
                "基本的な概念を説明できる",
                "重要な用語を理解している"
              ],
              tags: [goalText, "基礎", "学習"]
            },
            {
              title: `${goalText}の実践練習`,
              pattern: "build_micro",
              minutes: 30,
              difficulty: 0.5,
              deliverable: "実践練習の成果物",
              steps: [
                "学んだ内容を実際に試してみる",
                "練習問題に取り組む",
                "結果を記録し振り返る"
              ],
              criteria: [
                "学んだ内容を実際に応用できる",
                "練習を通じて理解を深められる"
              ],
              tags: [goalText, "実践", "練習"]
            },
            {
              title: `${goalText}の復習と定着`,
              pattern: "flashcards",
              minutes: 20,
              difficulty: 0.4,
              deliverable: "復習用フラッシュカード",
              steps: [
                "重要なポイントをフラッシュカードにまとめる",
                "繰り返し復習して記憶に定着させる"
              ],
              criteria: [
                "重要なポイントを記憶している",
                "学習内容を長期的に覚えている"
              ],
              tags: [goalText, "復習", "記憶定着"]
            }
          ],
          rationale: ["基礎から応用へ段階的な学習", "理論と実践のバランス", "継続的な復習による定着"]
        };
      }
      
      const mockResponse = JSON.stringify(questData);
      console.log('🎭 Quest response generated, length:', mockResponse.length);
      return mockResponse;
      
    } else if (prompt.includes('審査し') || 
               prompt.includes('制約違反') ||
               prompt.includes('QUESTS_CANDIDATE') ||
               prompt.includes('修正案') ||
               prompt.includes('policy') ||
               prompt.includes('ポリシー')) {
      console.log('🎭 Detected POLICY CHECK prompt');
      // ポリシーチェックのモック応答（入力クエストをそのまま返す）
      const mockResponse = JSON.stringify({
        quests: [
          {
            title: "React Nativeコンポーネント基礎学習",
            pattern: "read_note_q",
            minutes: 25,
            difficulty: 0.3,
            deliverable: "コンポーネント作成サンプルとメモ",
            steps: [
              "公式ドキュメントでViewとTextコンポーネントを読む",
              "要点をメモにまとめる",
              "理解度確認の3問を自作して解く"
            ],
            criteria: [
              "ViewとTextコンポーネントの基本的な使い方を説明できる",
              "propsの概念を理解してコードで実装できる"
            ],
            tags: ["React Native", "基礎", "コンポーネント"]
          },
          {
            title: "状態管理の実践演習",
            pattern: "build_micro",
            minutes: 30,
            difficulty: 0.5,
            deliverable: "動作するカウンターアプリ",
            steps: [
              "useStateフックを使ったカウンター機能を実装",
              "ボタンでカウントの増減を制御",
              "動作確認とコード見直し"
            ],
            criteria: [
              "useStateフックを正しく使用できる",
              "状態の更新が画面に反映される",
              "コンポーネントが期待通りに動作する"
            ],
            tags: ["React Native", "状態管理", "フック"]
          },
          {
            title: "スタイリング基礎演習（最適化後）",
            pattern: "flashcards",
            minutes: 20,
            difficulty: 0.4,
            deliverable: "Flexboxレイアウト例とフラッシュカード",
            steps: [
              "Flexboxの主要プロパティをフラッシュカードに整理",
              "簡単なレイアウト例を3パターン作成"
            ],
            criteria: [
              "flexDirection、justifyContent、alignItemsを使い分けられる",
              "StyleSheetの基本的な書き方を理解している"
            ],
            tags: ["React Native", "スタイリング", "Flexbox"]
          }
        ],
        rationale: ["制約チェック完了", "パターン重複なし", "時間配分最適化済み"]
      });
      console.log('🎭 Policy check response generated, length:', mockResponse.length);
      return mockResponse;
      
    } else if (prompt.includes('skill_map') || 
               prompt.includes('スキルマップ') || 
               prompt.includes('Skill Map') ||
               prompt.includes('カリキュラム設計者')) {
      console.log('🎭 Detected SKILL MAP generation prompt');
      // スキルマップのモック応答（SkillAtomSchemaに準拠）
      const mockResponse = JSON.stringify({
        skill_atoms: [
          {
            id: "react-native-basics",
            label: "React Native基礎",
            type: "concept",
            level: "intro",
            bloom: "understand",
            prereq: [],
            representative_tasks: [
              "JSXの基本文法を理解する",
              "コンポーネントとPropsの概念を説明する",
              "基本的なViewとTextを使ったUIを作成する"
            ],
            suggested_patterns: ["read_note_q", "flashcards"]
          },
          {
            id: "component-design",
            label: "コンポーネント設計",
            type: "procedure",
            level: "basic",
            bloom: "apply",
            prereq: ["react-native-basics"],
            representative_tasks: [
              "再利用可能なボタンコンポーネントを作成する",
              "Props設計でコンポーネントをカスタマイズする",
              "StyleSheetを使った適切なスタイリングを行う"
            ],
            suggested_patterns: ["build_micro", "config_verify"]
          },
          {
            id: "state-management",
            label: "状態管理",
            type: "concept",
            level: "intermediate",
            bloom: "analyze",
            prereq: ["react-native-basics"],
            representative_tasks: [
              "useStateフックで状態を管理する",
              "Context APIを使ったグローバル状態管理を実装する",
              "状態更新のパフォーマンスを最適化する"
            ],
            suggested_patterns: ["build_micro", "debug_explain"]
          },
          {
            id: "navigation-system",
            label: "ナビゲーションシステム",
            type: "procedure",
            level: "basic",
            bloom: "apply",
            prereq: ["component-design"],
            representative_tasks: [
              "Stack Navigatorで画面遷移を実装する",
              "Tab Navigatorでタブベースのナビゲーションを作成する",
              "パラメータを使った画面間のデータ受け渡しを行う"
            ],
            suggested_patterns: ["config_verify", "build_micro"]
          },
          {
            id: "api-integration",
            label: "API統合",
            type: "procedure",
            level: "intermediate",
            bloom: "create",
            prereq: ["state-management"],
            representative_tasks: [
              "fetchを使ったREST API呼び出しを実装する",
              "非同期データフェッチのローディング状態を管理する",
              "APIエラーハンドリングとユーザーフィードバックを実装する"
            ],
            suggested_patterns: ["debug_explain", "feynman"]
          },
          {
            id: "testing-basics",
            label: "テスト基礎",
            type: "procedure",
            level: "intermediate",
            bloom: "apply",
            prereq: ["component-design"],
            representative_tasks: [
              "Jest/React Native Testing Libraryの基本を学ぶ",
              "単体テストとスナップショットテストを作成する",
              "コンポーネントテストを実装する"
            ],
            suggested_patterns: ["read_note_q", "config_verify"]
          },
          {
            id: "performance-optimization",
            label: "パフォーマンス最適化",
            type: "concept",
            level: "advanced",
            bloom: "evaluate",
            prereq: ["state-management", "api-integration"],
            representative_tasks: [
              "React.memoとuseMemoでレンダリング最適化を行う",
              "FlatListの最適化テクニックを実装する",
              "メモリリーク対策と監視を行う"
            ],
            suggested_patterns: ["debug_explain", "past_paper"]
          },
          {
            id: "deployment",
            label: "デプロイメント",
            type: "procedure",
            level: "advanced",
            bloom: "create",
            prereq: ["testing-basics"],
            representative_tasks: [
              "Expo EASでビルドとデプロイを行う",
              "App StoreとGoogle Play Storeにアプリを公開する",
              "CI/CDパイプラインを構築する"
            ],
            suggested_patterns: ["config_verify", "build_micro"]
          },
          {
            id: "advanced-patterns",
            label: "上級パターン",
            type: "concept",
            level: "advanced",
            bloom: "create",
            prereq: ["performance-optimization"],
            representative_tasks: [
              "カスタムフックとHOCパターンを実装する",
              "Context APIとReducerの組み合わせを活用する",
              "ファイル構造とアーキテクチャパターンを設計する"
            ],
            suggested_patterns: ["feynman", "socratic"]
          },
          {
            id: "native-integration",
            label: "ネイティブ統合",
            type: "procedure",
            level: "advanced",
            bloom: "create",
            prereq: ["deployment"],
            representative_tasks: [
              "ネイティブモジュールとカスタムコンポーネントを作成する",
              "プラットフォーム固有の機能を実装する",
              "サードパーティライブラリの統合を行う"
            ],
            suggested_patterns: ["build_micro", "retrospective"]
          }
        ]
      });
      console.log('🎭 Mock skill_atoms response length:', mockResponse.length);
      console.log('🎭 Mock skill_atoms response start:', mockResponse.substring(0, 100));
      console.log('🎭 Mock skill_atoms response end:', mockResponse.substring(mockResponse.length - 100));
      
      // JSONパース確認
      try {
        const parsed = JSON.parse(mockResponse);
        console.log('🎭 Parsed skill_atoms count:', parsed.skill_atoms?.length);
      } catch (parseError) {
        console.error('🎭 JSON Parse Error:', parseError);
      }
      
      return mockResponse;
    }
    
    // 目標明確性分析プロンプトの検出
    if (prompt.includes('isVague') || 
        prompt.includes('confidence') || 
        prompt.includes('明確かどうかを分析') ||
        prompt.includes('具体的で明確')) {
      console.log('🎭 Detected GOAL CLARITY analysis prompt');
      
      // プロンプトから目標テキストを抽出
      let goalText = '';
      const goalMatch = prompt.match(/目標[：:\s]*["""]([^"""]+)["""]/);
      if (goalMatch) {
        goalText = goalMatch[1].trim();
        console.log('🎯 Extracted goal from clarity prompt:', goalText);
      }
      
      // 目標の明確性を基本的な条件で判定
      const isShort = goalText.length < 15;
      const hasVagueWords = /うまくなりたい|強くなりたい|勉強したい|学びたい/.test(goalText);
      const hasSpecifics = /\d+(ヶ?月|週間|日)|点|級|レベル|ランク/.test(goalText);
      
      const isVague = isShort || hasVagueWords || !hasSpecifics;
      const confidence = isVague ? 0.7 : 0.8;
      
      const clarityResponse = JSON.stringify({
        isVague,
        confidence,
        issues: isVague ? [
          {
            type: "scope_unclear",
            description: "目標が具体的でなく、達成基準が不明確です",
            severity: "medium"
          }
        ] : [],
        suggestions: isVague ? [
          "具体的な期間を設定してください（例：3ヶ月で）",
          "達成可能な数値目標を設定してください（例：TOEIC800点）",
          "具体的な成果物を明記してください"
        ] : [
          "素晴らしい！具体的で明確な目標です"
        ],
        examples: [
          "3ヶ月でTOEIC800点を取得する",
          "React Nativeでポートフォリオアプリを完成させる",
          "プラチナランクに昇格する"
        ]
      });
      
      console.log('🎭 Goal clarity response generated');
      return clarityResponse;
    }
    
    // 目標解析プロンプトの検出
    if (prompt.includes('domain') || 
        prompt.includes('subDomain') || 
        prompt.includes('learningType') ||
        prompt.includes('学習目標を分析')) {
      console.log('🎭 Detected GOAL ANALYSIS prompt');
      
      // プロンプトから目標テキストを抽出
      let goalText = '';
      const goalMatch = prompt.match(/目標[：:\s]*["""]([^"""]+)["""]/);
      if (goalMatch) {
        goalText = goalMatch[1].trim();
        console.log('🎯 Extracted goal from analysis prompt:', goalText);
      }
      
      // 基本的なドメイン分析
      let domain = 'general';
      let subDomain = 'general_learning';
      
      if (goalText.includes('英語') || goalText.toLowerCase().includes('english')) {
        domain = 'language';
        subDomain = 'english_learning';
      } else if (goalText.includes('プログラミング') || goalText.includes('React') || goalText.includes('アプリ')) {
        domain = 'programming';
        subDomain = 'web_development';
      } else if (goalText.includes('Apex') || goalText.includes('ゲーム')) {
        domain = 'creative';
        subDomain = 'gaming_skills';
      } else if (goalText.includes('筋トレ') || goalText.includes('運動')) {
        domain = 'fitness';
        subDomain = 'strength_training';
      }
      
      const analysisResponse = JSON.stringify({
        domain,
        subDomain,
        learningType: 'skill',
        complexity: 'intermediate',
        timeHorizon: 'medium',
        keyTerms: goalText.split(/\s+/).filter(term => term.length > 2).slice(0, 3)
      });
      
      console.log('🎭 Goal analysis response generated');
      return analysisResponse;
    }
    
    // 質問ブロック生成プロンプトの検出 (BlockA, BlockC)
    if (prompt.includes('blockTitle') || 
        prompt.includes('blockDescription') || 
        prompt.includes('questions') ||
        prompt.includes('質問を3つ生成') ||
        prompt.includes('成果の確認方法')) {
      console.log('🎭 Detected QUESTION BLOCK generation prompt');
      
      // プロンプトから分野情報を抽出
      let domain = 'general';
      const domainMatch = prompt.match(/目標分野[：:\s]*(\w+)/);
      if (domainMatch) {
        domain = domainMatch[1];
        console.log('🎯 Extracted domain from block prompt:', domain);
      }
      
      // ブロックタイプを判定（AかC）
      const isBlockA = prompt.includes('目標焦点') || prompt.includes('焦点を明確');
      const isBlockC = prompt.includes('成果の確認') || prompt.includes('成果確認') || prompt.includes('評価方法');
      
      let blockData;
      if (isBlockA) {
        // ブロックA: 目標焦点 - ハイブリッドサービスが期待する形式
        blockData = {
          blockTitle: "目標の焦点設定",
          blockDescription: "学習目標の具体的な焦点を明確にします",
          questions: [
            {
              id: "A1",
              question: `${domain}において、最も重点的に取り組みたい領域はどれですか？`,
              options: [
                {
                  id: "focus_1",
                  label: "基礎スキルの習得",
                  value: "basic_skills",
                  dataKey: "focus_area"
                },
                {
                  id: "focus_2", 
                  label: "実践的な応用力",
                  value: "practical_application",
                  dataKey: "focus_area"
                },
                {
                  id: "focus_3",
                  label: "専門知識の深化",
                  value: "specialized_knowledge",
                  dataKey: "focus_area"
                },
                {
                  id: "focus_4",
                  label: "総合的なスキル向上",
                  value: "comprehensive_improvement",
                  dataKey: "focus_area"
                }
              ]
            },
            {
              id: "A2",
              question: "この目標の優先度はどの程度ですか？",
              options: [
                {
                  id: "priority_1",
                  label: "最優先（他を犠牲にしても達成）",
                  value: "highest",
                  dataKey: "priority_level"
                },
                {
                  id: "priority_2",
                  label: "高優先（重要だが他とバランス）",
                  value: "high",
                  dataKey: "priority_level"
                },
                {
                  id: "priority_3",
                  label: "中優先（時間があるときに進める）",
                  value: "medium",
                  dataKey: "priority_level"
                },
                {
                  id: "priority_4",
                  label: "低優先（余裕があるときに）",
                  value: "low",
                  dataKey: "priority_level"
                }
              ]
            },
            {
              id: "A3",
              question: "この目標に取り組む主な動機は何ですか？",
              options: [
                {
                  id: "motivation_1",
                  label: "将来のキャリアのため",
                  value: "career_advancement",
                  dataKey: "motivation_source"
                },
                {
                  id: "motivation_2",
                  label: "個人的な興味・趣味として",
                  value: "personal_interest",
                  dataKey: "motivation_source"
                },
                {
                  id: "motivation_3",
                  label: "現在の問題を解決するため",
                  value: "problem_solving",
                  dataKey: "motivation_source"
                },
                {
                  id: "motivation_4",
                  label: "他者からの期待に応えるため",
                  value: "external_expectation",
                  dataKey: "motivation_source"
                }
              ]
            }
          ]
        };
      } else {
        // ブロックC: 成果確認 - ハイブリッドサービスが期待する形式
        blockData = {
          blockTitle: "成果の確認方法",
          blockDescription: "学習成果をどう確認するかを設定します",
          questions: [
            {
              id: "C1",
              question: `${domain}での「できた！」をどうやって確認したいですか？`,
              options: [
                {
                  id: "evidence_1",
                  label: "具体的な数値で測定",
                  value: "quantitative_metrics",
                  dataKey: "goal_evidence"
                },
                {
                  id: "evidence_2",
                  label: "作品・成果物で実証",
                  value: "tangible_output",
                  dataKey: "goal_evidence"
                },
                {
                  id: "evidence_3",
                  label: "他者からの評価・認定",
                  value: "external_validation",
                  dataKey: "goal_evidence"
                },
                {
                  id: "evidence_4",
                  label: "実践での成功体験",
                  value: "practical_success",
                  dataKey: "goal_evidence"
                }
              ]
            },
            {
              id: "C2",
              question: "どんな目標設定にしますか？",
              options: [
                {
                  id: "kpi_1",
                  label: "明確な数値目標",
                  value: "numeric_target",
                  dataKey: "kpi_shape"
                },
                {
                  id: "kpi_2",
                  label: "段階的なマイルストーン",
                  value: "milestone_based",
                  dataKey: "kpi_shape"
                },
                {
                  id: "kpi_3",
                  label: "定性的な改善指標",
                  value: "qualitative_improvement",
                  dataKey: "kpi_shape"
                },
                {
                  id: "kpi_4",
                  label: "総合的な習熟度評価",
                  value: "comprehensive_assessment",
                  dataKey: "kpi_shape"
                }
              ]
            },
            {
              id: "C3",
              question: "最終的にどんな形で仕上げたいですか？",
              options: [
                {
                  id: "capstone_1",
                  label: "具体的な作品・プロジェクト",
                  value: "project_based",
                  dataKey: "capstone_type"
                },
                {
                  id: "capstone_2",
                  label: "実力証明（試験・認定）",
                  value: "certification_based",
                  dataKey: "capstone_type"
                },
                {
                  id: "capstone_3",
                  label: "実践的な成功事例",
                  value: "practical_achievement",
                  dataKey: "capstone_type"
                },
                {
                  id: "capstone_4",
                  label: "継続的な習慣化",
                  value: "habit_formation",
                  dataKey: "capstone_type"
                }
              ]
            }
          ]
        };
      }
      
      const blockResponse = JSON.stringify(blockData);
      console.log('🎭 Question block response generated');
      return blockResponse;
    }
    
    // デフォルトのモック応答
    return JSON.stringify({
      quests: [
        {
          title: "モック学習クエスト",
          pattern: "read_note_q",
          minutes: 20,
          difficulty: 0.5,
          deliverable: "学習ノート",
          criteria: ["基本概念を理解できる"],
          tags: ["テスト", "モック"]
        }
      ]
    });
  }

  /**
   * サービスの初期化状態をチェック
   */
  isInitialized(): boolean {
    return this.llm !== null;
  }

  /**
   * API設定の診断情報を取得
   */
  getDiagnosticInfo(): {
    isInitialized: boolean;
    apiKeyAvailable: boolean;
    aiEnabled: boolean;
    configuration: any;
  } {
    const apiKeyAvailable = !!apiKeyManager.getOpenAIKey();
    const diagnosis = apiKeyManager.diagnoseConfiguration();
    
    return {
      isInitialized: this.isInitialized(),
      apiKeyAvailable,
      aiEnabled: apiKeyManager.isAIEnabled(),
      configuration: diagnosis
    };
  }

  /**
   * 設計書の高品質プロンプトを使ったスキルマップ生成
   */
  async generateSkillMap(args: {
    goalText: string;
    currentLevelTags?: string[];
    priorityAreas?: string[];
  }): Promise<SkillAtom[]> {
    if (!this.llm) {
      const diagnosis = this.getDiagnosticInfo();
      throw new Error(`AdvancedQuestService not initialized. API Key available: ${diagnosis.apiKeyAvailable}. Call initialize() first.`);
    }

    const prompt = buildSkillMapPrompt(args);
    const schema = z.object({ skill_atoms: z.array(SkillAtomSchema).min(10) });
    
    try {
      const { skill_atoms } = await this.llm.completeJson({ 
        system: "You are a precise curriculum designer.", 
        prompt, 
        schema 
      });
      return skill_atoms;
    } catch (error) {
      console.error('Skill map generation failed:', error);
      throw new Error('スキルマップの生成に失敗しました');
    }
  }

  /**
   * 設計書の制約を考慮した高度なクエスト生成
   */
  async generateDailyQuests(args: {
    profile: ProfileV1;
    skillAtoms: SkillAtom[];
    checkins?: DailyCheckins;
  }): Promise<Quest[]> {
    console.log('🗡️ AdvancedQuestService.generateDailyQuests called');
    console.log('🗡️ Input args:', {
      profile: args.profile?.goal || 'No goal',
      skillAtomsCount: args.skillAtoms?.length || 0,
      checkins: args.checkins || 'Using defaults'
    });

    if (!this.llm) {
      const diagnosis = this.getDiagnosticInfo();
      console.error('🗡️ LLM not initialized:', diagnosis);
      throw new Error(`AdvancedQuestService not initialized. API Key available: ${diagnosis.apiKeyAvailable}. Call initialize() first.`);
    }

    const checkins = args.checkins ?? {
      mood_energy: "mid",
      available_time_today_delta_min: 0,
      focus_noise: "mid"
    };

    console.log('🗡️ Building derived profile data...');
    const derived = buildDerived(args.profile);
    console.log('🗡️ Derived data built:', derived);

    console.log('🗡️ Building daily quest prompt...');
    const prompt = buildDailyQuestsPrompt({
      profile: args.profile,
      derived,
      skillAtoms: args.skillAtoms,
      checkins
    });
    console.log('🗡️ Prompt length:', prompt.length, 'chars');

    try {
      console.log('🗡️ Calling LLM for quest generation...');
      const { quests } = await this.llm.completeJson({ 
        system: "You are a precise learning planner.", 
        prompt, 
        schema: QuestListSchema 
      });

      console.log('🗡️ LLM returned quests:', quests?.length || 0);
      console.log('🗡️ Generated quests:', quests);

      // 設計書の後処理を適用
      const rounded = quests.map((q) => ({
        ...q,
        minutes: clampToSession(q.minutes, args.profile.preferred_session_length_min ?? 20),
      }));

      console.log('🗡️ Final processed quests:', rounded);
      return rounded;
    } catch (error) {
      console.error('🗡️ Daily quest generation failed:', error);
      console.error('🗡️ Error details:', error.message, error.stack);
      throw new Error('本日のクエスト生成に失敗しました');
    }
  }

  /**
   * 設計書のポリシーチェックによる品質保証
   */
  async policyCheck(args: { 
    quests: Quest[]; 
    profile: ProfileV1;
    checkins?: DailyCheckins;
  }): Promise<QuestList> {
    if (!this.llm) {
      const diagnosis = this.getDiagnosticInfo();
      throw new Error(`AdvancedQuestService not initialized. API Key available: ${diagnosis.apiKeyAvailable}. Call initialize() first.`);
    }

    const checkins = args.checkins ?? {
      mood_energy: "mid",
      available_time_today_delta_min: 0,
      focus_noise: "mid"
    };

    const derived = buildDerived(args.profile);
    const constraints = buildConstraints(args.profile, derived, checkins);
    const prompt = buildPolicyCheckPrompt({ 
      questsCandidate: args.quests, 
      constraints 
    });

    try {
      const result = await this.llm.completeJson({ 
        system: "You are a careful policy checker.", 
        prompt, 
        schema: QuestListSchema 
      });

      // 設計書の制約チェックを適用
      const total = result.quests.reduce((s, q) => s + q.minutes, 0);
      if (total > constraints.total_minutes_max) {
        // naive scale-down pass
        const scale = constraints.total_minutes_max / total;
        result.quests = result.quests.map((q) => ({ 
          ...q, 
          minutes: Math.max(10, Math.round(q.minutes * scale)) 
        }));
      }

      result.quests = avoidConsecutiveSamePattern(result.quests);
      return result;
    } catch (error) {
      console.error('Policy check failed:', error);
      throw new Error('クエストの品質チェックに失敗しました');
    }
  }

  /**
   * エンドツーエンドのクエスト生成パイプライン（設計書通り）
   */
  async generateOptimizedQuests(args: {
    goalText: string;
    profile: ProfileV1;
    currentLevelTags?: string[];
    priorityAreas?: string[];
    checkins?: DailyCheckins;
  }): Promise<{
    skillAtoms: SkillAtom[];
    questsCandidate: Quest[];
    finalQuests: QuestList;
  }> {
    console.log('🎯 Step 1: Generating skill map...');
    console.log('🎯 Step 1 Input:', {
      goalText: args.goalText,
      currentLevelTags: args.currentLevelTags,
      priorityAreas: args.priorityAreas,
      useRealAI: this.useRealAI,
      isInitialized: this.isInitialized()
    });
    
    const skillAtoms = await this.generateSkillMap({
      goalText: args.goalText,
      currentLevelTags: args.currentLevelTags,
      priorityAreas: args.priorityAreas,
    });
    console.log('🎯 Step 1 Complete: Generated', skillAtoms.length, 'skill atoms');

    console.log('⚡ Step 2: Generating daily quests...');
    console.log('⚡ Step 2 Input:', {
      profileGoal: args.profile.long_term_goal,
      skillAtomsCount: skillAtoms.length,
      checkins: args.checkins,
      useRealAI: this.useRealAI
    });
    
    const questsCandidate = await this.generateDailyQuests({
      profile: args.profile,
      skillAtoms,
      checkins: args.checkins,
    });
    console.log('⚡ Step 2 Complete: Generated', questsCandidate.length, 'candidate quests');

    console.log('🔍 Step 3: Enhanced policy check...');
    console.log('🔍 Step 3 Input:', {
      candidateQuestsCount: questsCandidate.length,
      profileTimebudget: args.profile.time_budget_min_per_day,
      useRealAI: this.useRealAI
    });
    
    const finalQuests = await this.policyCheck({
      quests: questsCandidate,
      profile: args.profile,
      checkins: args.checkins,
    });
    console.log('🔍 Step 3 Complete: Final', finalQuests.quests.length, 'optimized quests');

    console.log('✅ Quest Generation Pipeline Complete:', {
      skillAtoms: skillAtoms.length,
      candidates: questsCandidate.length,
      finalQuests: finalQuests.quests.length,
      totalTime: finalQuests.quests.reduce((sum, q) => sum + q.minutes, 0)
    });

    return {
      skillAtoms,
      questsCandidate,
      finalQuests,
    };
  }

  /**
   * 汎用AI生成メソッド - カスタムプロンプトでAI生成
   * 目標明確性検出やハイブリッド質問生成で使用
   */
  async generateCustom(args: {
    userGoal: string;
    timeConstraintMinutes?: number;
    userPreferences?: { difficulty: string };
    customPrompt: string;
    temperature?: number;
  }): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('AdvancedQuestService not initialized');
    }

    try {
      const response = await this.llm!.complete({
        system: 'あなたは学習支援AIアシスタントです。与えられたプロンプトに従って、正確で有用な回答を日本語で提供してください。',
        prompt: args.customPrompt,
        temperature: args.temperature || 0.3,
      });

      console.log('🤖 Custom AI Response generated');
      return response;
    } catch (error) {
      console.error('Custom AI generation failed:', error);
      throw new Error('カスタムAI生成に失敗しました');
    }
  }

  /**
   * generateQuest のエイリアス（後方互換性のため）
   * @deprecated Use generateCustom instead
   */
  async generateQuest(args: {
    userGoal: string;
    timeConstraintMinutes?: number;
    userPreferences?: { difficulty: string };
    customPrompt: string;
  }): Promise<string> {
    console.warn('⚠️ generateQuest is deprecated. Use generateCustom instead.');
    return this.generateCustom(args);
  }

  /**
   * 簡易プロファイル作成（テスト・デモ用）
   */
  createBasicProfile(args: {
    goalText: string;
    timeBudgetMin: number;
    motivation: "low" | "mid" | "high";
    sessionLength?: number;
  }): ProfileV1 {
    return {
      time_budget_min_per_day: args.timeBudgetMin,
      peak_hours: [9, 10, 11, 14, 15, 16],
      env_constraints: [],
      hard_constraints: [],
      motivation_style: "pull",
      difficulty_tolerance: 0.5,
      novelty_preference: 0.5,
      pace_preference: "cadence",
      long_term_goal: args.goalText,
      current_level_tags: [],
      priority_areas: [],
      heat_level: 3,
      risk_factors: [],
      preferred_session_length_min: args.sessionLength ?? 20,
      modality_preference: ["read", "video"],
      deliverable_preferences: ["note"],
      weekly_minimum_commitment_min: Math.floor(args.timeBudgetMin * 7 * 0.8),
      goal_motivation: args.motivation,
    };
  }
}

export const advancedQuestService = new AdvancedQuestService();

// 型エクスポート（設計書からの完全継承）
export type {
  ProfileV1,
  Derived,
  DailyCheckins,
  SkillAtom,
  Quest,
  QuestList,
  Constraints,
  Pattern
} from './promptEngine';