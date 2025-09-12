# Prompt Improvement Plan: Profile Questions, Milestones, One‑Day Quests

目的: 的外れ質問を減らし、より多様な目標に即したプロファイル・マイルストーン・1日完了のクエストを安定生成する。ここに計画・仕様・型変更・実装タスク・受け入れ基準を一体化する。

---

## 0. 現状マップ（主要モジュール）
- Core schemas & prompt builders: `src/services/ai/promptEngine.ts`
- Quest orchestrator: `src/services/ai/advancedQuestService.fixed.ts`
- Time/difficulty/diversity optimizer: `src/services/ai/enhancedQuestService.ts`
- Daily generation wrapper: `src/services/ai/dailyQuestService.ts`
- Profile Qs (hybrid): `src/services/ai/hybridQuestionService.ts`, clarification: `goalClarificationService.ts`
- OpenAI gateway: `src/services/ai/openaiService.ts`
- Types: `src/types/onboardingQuestions.ts`, `src/types/questGeneration.ts`

課題（抜粋）:
- 質問生成に情報利得やゴール分類のゲーティングが無い → 的外れが混入。
- マイルストーンはテンプレ依存が強く、KPI/資源/制約/リスク連動が弱い。
- 1日完了保証（≤3タスク×≤45分、終了条件/証跡/代替案/中断ルール）が不足。
- PromptEngineとOpenAI呼び出しが二重化し、仕様の重複/乖離が発生。

---

## 1. 上位15改善案（約1000案の上位抽出）
1) [Profile] 情報利得スコア制御: `score = relevance*info_gain - 0.5*fatique` で質問出力を制限。
2) [Profile] ゴール分類ゲーティング: 事前分類でカテゴリ別質問バンクにルーティング。
3) [Profile] 既知情報の確認モード: confidence≥0.7はYes/Noで再確認。
4) [Profile] 初回5問＋任意深掘り3問: 質問予算の明確化。
5) [Profile] 多肢→自由記述の二段階: 方向付け後に1–2問だけ自由記述で精度向上。
6) [Milestone] SMART＋Now/Next/Later: バックキャストで近/中/遠期を整理。
7) [Milestone] KPIバックキャスト連鎖: outcome→intermediate→behavior。
8) [Milestone] 可用性/リスク自動チェック: 時間/資源/制約/依存を検査し再提案。
9) [Milestone] 週次時間/資源/制約の標準入力: プロファイル項目化。
10) [Quest] 1日完了テンプレ（≤45分×≤3）: `prep/steps/done/evidence`の必須化。
11) [Quest] DayType適応（busy/normal/deep）: 所要時間/難易度スケーリング。
12) [Quest] 成功判定/中断ライン: `success_check`と`stop_rule`を明記。
13) [Quest] 代替案A/B＋繰越ヒント: 時短/屋内版と`reschedule_hint`。
14) [All] 自己批評→自動改稿: 適合/具体/可行/負荷の採点→不足点のみ再生成。
15) [All] Few‑shot RAG: カテゴリ別少数ショットを検索注入し一貫性確保。

---

## 2. 仕様（AIが利用するプロンプト I/O）

### 2.1 Profile Question Engine（新規: `src/services/ai/profileQuestionEngine.ts`）
- System: "You are a goal‑aligned profiler that maximizes information gain while minimizing fatigue."
- Input (JSON):
```json
{
  "goal_text": "...",
  "known_profile": { "fields": {"novelty_preference": 0.6}, "confidence": {"novelty_preference": 0.8} },
  "question_bank": [
    {
      "id": "B1",
      "type": "multiple_choice",
      "question": "新規と復習の比率は?",
      "options": ["新規多め","やや新規","やや復習","復習多め"],
      "dataKey": "novelty_preference",
      "applicable_when": "domain in ['language','programming','academic']",
      "info_gain_hint": 0.35
    }
  ],
  "budget": { "max_questions": 5, "allow_refine": true }
}
```
- Rules:
  - Ask only if `relevance*info_gain - 0.5*fatique >= 0.25`。
  - If `known_profile.confidence[key] >= 0.7` → `confirm_yes_no`に置換。
  - Stage1: MCQで方向付け → Stage2: 1–2問の自由記述アンカー質問。
- Output (JSON):
```json
{
  "questions": [
    {
      "id": "B1",
      "type": "multiple_choice|text|scale|boolean|confirm_yes_no",
      "question": "...",
      "options": ["..."],
      "dataKey": "novelty_preference",
      "rationale": "max info gain on learning path",
      "score": 0.42
    }
  ],
  "skipped": ["A3","C2"],
  "budget": { "used": 5, "remaining": 0 }
}
```

### 2.2 Milestone Engine（新規: `src/services/ai/milestoneEngine.ts`）
- System: "You are a planner generating SMART milestones via backcasting."
- Input (JSON):
```json
{
  "goal_text": "...",
  "category": "learning|career|health|skill|creative|other",
  "outcome_metric": { "name": "CEFR", "target": "B2" },
  "weekly_hours": 6,
  "resources": ["gym","pc"],
  "constraints": ["no_audio"],
  "horizon_weeks": 12
}
```
- Rules:
  - Backcast: outcome → intermediate_KPI → behavior_KPI。
  - Group: `Now(1–2w) / Next(3–6w) / Later(>6w)`。
  - Each milestone fields:
```json
{
  "id":"ms_1",
  "title":"...",
  "description":"...",
  "due_date":"YYYY-MM-DD",
  "KPI":{"metric":"...","target":"..."},
  "evidence":["file|score|demo"],
  "resources":["..."],
  "dependencies":["..."],
  "risk_flags":["overload|dependency|uncertainty"],
  "feasibility":{"time_ok":true,"risk_score":0.2}
}
```
  - If `feasibility<0.8` → 自動修正版を1回出し直し。
- Output: `{ "milestones": { "Now": [...], "Next": [...], "Later": [...] }, "rationale": ["..."] }`

### 2.3 One‑Day Quest Builder（強化: `promptEngine.buildDailyQuestsPrompt`）
- System: "You are a day‑planner that returns only one‑day quests."
- Input (JSON):
```json
{
  "profile": { ... },
  "derived": { "daily_capacity_min": 135, "quest_count_hint": 3, "novelty_ratio": 0.5 },
  "skill_atoms": [ ... up to 24 ... ],
  "checkins": { "day_type": "busy|normal|deep", "available_time_today_delta_min": -15 },
  "constraints": { "total_minutes_max": 135, "session_length": 45, "avoid_consecutive_same_pattern": true }
}
```
- Rules:
  - 2–3クエスト、各`≤45`分、合計`≤total_minutes_max`（day_typeに応じ 45/90/150）。
  - 各クエスト:
```json
{
  "title":"...",
  "pattern":"read_note_q|flashcards|build_micro|...",
  "minutes":45,
  "difficulty":0.45,
  "deliverable":"...",
  "steps":["...","...","..."],
  "done_definition":"Measurable end state",
  "evidence":["screenshot|file|score"],
  "alt_plan":"shorter/indoor variant",
  "stop_rule":"If stuck >10min on step 2, switch to alt_plan.",
  "tags":["..."]
}
```
  - Self‑critique rubric: relevance≥0.85, feasibility≥0.8, specificity≥0.85, load overage=0%。

---

## 3. スキーマ変更（Zod/TypeScript）
- `ProfileV1` 追加: `weekly_hours?: number`, `resources?: string[]`, `constraints?: string[]`
- `DailyCheckins` 追加: `day_type?: 'busy'|'normal'|'deep'`
- `QuestSchema` 追加: `done_definition?: string`, `evidence?: string[]`, `alt_plan?: string`, `stop_rule?: string`
- `onboardingQuestions.ts` 追加: 質問 `applicable_when?: string`, `info_gain_hint?: number`; 回答 `confidence?: number`
- 新規Zod: `MilestonePlanSchema`, `ProfileQuestionPlanSchema`

---

## 4. 実装タスク（順序付き）
1. 型拡張とプロンプト分離
   - `promptEngine.ts`: `QuestSchema`/`DailyCheckins`/`ProfileV1`拡張、`buildDailyQuestsPrompt`強化。
   - `openaiService.ts`: `complete()`/`completeJson()`の薄い抽象を追加（`promptEngine.BasicLLM`互換）。
2. Profile Question Engine導入
   - 新規 `src/services/ai/questionBank.ts`（カテゴリ別質問＋`applicable_when`）。
   - 新規 `src/services/ai/profileQuestionEngine.ts`（スコアリング/ゲーティング/確認モード/JSON I/O）。
   - `hybridQuestionService.ts`をエンジン利用へ寄せ、A/C=AI few‑shot, B/D=テンプレ強化。
3. Milestone Engine導入
   - 新規 `src/services/ai/milestoneEngine.ts`（SMART/Backcast/Feasibility/Revise）。
   - `milestoneService.ts`を薄いラッパに変更し、Engine出力を返す。
4. Questの1日完了保証
   - `enhancedQuestService.ts`: `day_type`適用、合計時間スナップ、`done/evidence/alt/stop`必須化。
   - `advancedQuestService.fixed.ts`: policyCheckプロンプトに`alt_plan`/`stop_rule`検査を追加。
5. Few‑shot RAG（軽量）
   - 新規 `src/services/ai/fewshots/*.json`、新規 `src/services/ai/retriever.ts`（3件を類似度順に注入）。
6. テスト/スモーク
   - 新規 `test_profile_question_generation.js`（無関係質問率/質問数/JSON妥当性）。
   - 新規 `test_milestone_generation.js`（SMART/feasibility/時系列順序）。
   - 既存 `test_enhanced_quest_generation.js` に DayType ケースと完了条件検査を追加。

---

## 5. 受け入れ基準（計測可能KPI）
- Profile: 無関係質問率 ≤ 10%、平均質問数 ≤ 5、再質問率 ≤ 15%。
- Milestones: SMART妥当性 ≥ 0.85、`feasibility>=0.8`、Now/Next/Laterの時系列整合=100%。
- Quests: 当日完了率 ≥ 75%、総時間予算超過=0%、各クエストに `done_definition/evidence/alt_plan/stop_rule` を必須。

---

## 6. ロールアウト
- Phase 0: 型拡張＋プロンプト分離（互換維持）。
- Phase 1: Profile Engine切替（A/B監視: 的外れ率/完了率）。
- Phase 2: Milestone Engine導入（feasibilityループ）。
- Phase 3: One‑Day Quest保証（DayType/代替案/中断ルール）。
- Phase 4: Few‑shot/RAG導入→温度/長さ/閾値調整。

---

## 7. 既知リスク/整合性
- エンコード混在: 一部ファイルで文字化けが見えるため、UTF‑8統一・CIでのlint推奨。
- `dailyQuestService.ts` → `EnhancedQuestService` 引数不整合: シグネチャ統一が必要。
- `openaiService.ts` と `promptEngine` の重複: Engine側I/Oに統一する。

---

## 8. 追補: サンプルFew‑shot格納レイアウト
```
src/services/ai/fewshots/
  language.json
  programming.json
  health.json
  career.json
  creative.json
```
各JSON: 1〜3件の高品質例（input→outputの最小ペア）。Retrieverはcos類似かタグ一致で3件注入。

---

## 9. 追補: 計測/ロギング
- ログに出す指標: `question_count`, `offtopic_rate`, `quest_total_minutes`, `day_type`, `diversity_changes`, `feasibility_score`。
- 例: `console.info('[metrics]', JSON.stringify({ ... }))`（必要に応じてFirebase/Analyticsへ）。

---

## 10. 実装見積（粗）
- Phase 0–1: 1.5〜2.0日
- Phase 2: 1.0〜1.5日
- Phase 3: 1.0日
- Phase 4: 0.5日

---

## 11. 最低限のAPI/型ドラフト（抜粋）
```ts
// profileQuestionEngine.ts
export interface PQArgs {
  goal_text: string;
  known_profile?: Record<string, any> & { confidence?: Record<string, number> };
  question_bank: Array<{ id: string; type: string; question: string; options?: any[]; dataKey: string; applicable_when?: string; info_gain_hint?: number }>;
  budget?: { max_questions: number; allow_refine?: boolean };
}
export interface PQOut {
  questions: Array<{ id: string; type: string; question: string; options?: any[]; dataKey: string; rationale?: string; score?: number }>;
  skipped: string[];
  budget: { used: number; remaining: number };
}

// milestoneEngine.ts
export interface MilestoneIn { goal_text: string; category: string; outcome_metric?: { name: string; target: string }; weekly_hours?: number; resources?: string[]; constraints?: string[]; horizon_weeks?: number }
export interface MilestoneOut { milestones: { Now: any[]; Next: any[]; Later: any[] }; rationale?: string[] }
```

---

この計画に沿って作業すれば、的外れ質問の削減、目標適合マイルストーン、1日完了クエストの3点を同時に底上げできます。

