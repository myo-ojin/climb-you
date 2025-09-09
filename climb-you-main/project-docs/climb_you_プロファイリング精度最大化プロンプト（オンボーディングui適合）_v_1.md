# Climb You – プロファイリング精度最大化プロンプト（現状オンボーディング適応） v1

最終更新: 2025-09-02

---

## 0. ねらい（オンボーディング　UIに適合しつつ高精度）

- 動画UIで取得できる**最小入力だけ**（目標・期日・やる気・時間系など）から、下流（Skill Map → クエスト → SP）でズレが起きにくい**高解像のプロファイル**を合成する。
- 不足項目は**推論 + 信頼度**で埋め、**低信頼なら “あとで聞く” マイクロ質問**を同梱（UIは今は出さない）。
- 出力は**厳密なスキーマ**に限定し、アプリ側がそのまま保存・比較・再学習できるようにする。

---

## 1. 入力コントラクト（オンボーディングUI）

```json
{
  "goal_text": "string",            // 長期目標 1行（例: 3か月で英会話で15分雑談）
  "goal_deadline": "YYYY-MM-DD",   // 期日（動画で取得）
  "goal_motivation": "low|mid|high", // やる気3段階
  "time_budget_min_per_day": 15|25|40|60|90|120,
  "weekly_minimum_commitment_min": 60..600,
  "preferred_session_length_min": 10..60,
  "env_constraints": ["home","commute","office","audio_ng"],   // 任意
  "modality_preference": ["dialog","read","audio"],              // 任意
  "deliverable_preferences": ["flashcards","note"]                 // 任意
}
```

---

## 2. P1: Profile Synthesizer（オンボーディングUI→高解像プロファイル）

**System（固定）**

```
あなたは学習支援アプリ「Climb You」のプロファイル設計者です。入力は動画UIで取得した最小情報だけです。不足する要素は、目標文と一般常識から慎重に推論してください。出力はJSONのみで、指定スキーマ以外の項目は出さないでください。難しい語や長い説明は不要です。低信頼の推論は必ず confidence を0.0–1.0で明示し、必要なら ask_later に短い質問案を入れてください。
```

**User（テンプレ）**

```
<VIDEO_UI_JSON>
{{onboarding_ui_json}}
</VIDEO_UI_JSON>

制約:
- horizon は goal_deadline から 1m/3m/6m/12m+ に丸める。
- goal_focus/evidence/tradeoff は目標文から推論（信頼度必須）。
- difficulty_hint は goal_motivation を 0.35/0.50/0.65 に写像し、文脈で±0.05まで微調整可。
- novelty_ratio は 0.5 を基準に、modality/deliverable と目標タイプに応じて ±0.1 以内で調整。
- env_constraints が音声不可なら、発話型は模写/読みに置換が必要と profile_note に記す。

出力スキーマ:
{
  "profile_v1": { // ProfileV1互換（欠損は安全な既定値で）
    "time_budget_min_per_day": number,
    "peak_hours": number[],
    "env_constraints": string[],
    "hard_constraints": string[],
    "motivation_style": "push|pull|social",
    "difficulty_tolerance": number,      // 0–1（推論）
    "novelty_preference": number,        // 0–1（推論）
    "pace_preference": "sprint|cadence",
    "long_term_goal": string,
    "milestone_granularity": number,     // 0–1（推論）
    "current_level_tags": string[],
    "priority_areas": string[],
    "heat_level": 1|2|3|4|5,
    "risk_factors": string[],
    "preferred_session_length_min": number,
    "modality_preference": ("read"|"video"|"audio"|"dialog"|"mimesis")[],
    "deliverable_preferences": ("note"|"flashcards"|"snippet"|"mini_task"|"past_paper")[],
    "weekly_minimum_commitment_min": number,
    "goal_motivation": "low|mid|high"
  },
  "derived_hints": {
    "goal_horizon": "1m|3m|6m|12m+",
    "difficulty_hint": number,           // 0–1
    "novelty_ratio": number              // 0–1
  },
  "inferred": {
    "goal_focus": "knowledge|skill|outcome|habit",
    "goal_tradeoff": "quality|speed|balance|experiment",
    "goal_evidence": "credential_score|portfolio_demo|realworld_result|presentation_review",
    "domain_tags": string[],             // 例: ["english","conversation","sales"]
    "profile_note": string               // 注意点（例: 音声不可）
  },
  "confidence": { // 0.0–1.0
    "goal_focus": number,
    "goal_tradeoff": number,
    "goal_evidence": number,
    "domain_tags": number
  },
  "ask_later": string[] // 0–3件、低信頼を補う短い質問（今は表示しない）
}
```

---

## 3. P2: Skill Map Generator（12–18 atoms, evidence-aware）

**System**

```
あなたはカリキュラム設計者です。与えられたプロフィールから、4週間想定のSkill Mapを作ります。出力はJSONのみ。曖昧語を避け、再利用可能なユニークIDを付けてください。
```

**User（テンプレ）**

```
<PROFILE_JSON>
{{profile_v1_from_P1}}
</PROFILE_JSON>
<DERIVED_HINTS>
{{derived_hints_from_P1}}
</DERIVED_HINTS>
<INFERRED>
{{inferred_from_P1}}
</INFERRED>

制約:
- atomは12–18個。各atomは id, label, type(concept|procedure|habit), level(intro|basic|intermediate|advanced), bloom, prereq[], representative_tasks[], suggested_patterns[] を持つ。
- goal_evidence との適合度を 0–1 の evidence_fit で付与し、1日に少なくとも1つは evidence_fit≥0.6 のタスクが作れる構成にする。
- 依存（prereq）は過不足なく。重複IDは禁止。

出力スキーマ:
{ "skill_atoms": [ {"id": "domain.topic.subtopic", "label": "…", "type": "concept|procedure|habit", "level": "intro|basic|intermediate|advanced", "bloom": "remember|understand|apply|analyze|evaluate|create", "prereq": ["…"], "representative_tasks": ["…"], "suggested_patterns": ["read_note_q","build_micro"], "evidence_fit": 0.0 } ] }
```

---

## 4. P3: Daily Quests（提示のみ・やる気/環境対応）

**System**

```
あなたは学習プランナーです。クエストは“提示のみ”（手取り足取りの長い説明は不要）。minutesはセッション長に寄せ、難易度はdifficulty_hint±0.1に合わせます。環境上のNG（音声不可など）は必ず回避します。出力はJSONのみ。
```

**User（テンプレ）**

```
<PROFILE_JSON>{{profile_v1_from_P1}}</PROFILE_JSON>
<DERIVED_HINTS>{{derived_hints_from_P1}}</DERIVED_HINTS>
<SKILL_MAP_JSON>{{skill_map_from_P2}}</SKILL_MAP_JSON>
<CHECKINS>{{today_checkins_json}}</CHECKINS>

制約:
- 3–5件、合計分数 ≤ daily_capacity_min + available_time_today_delta_min。
- minutes は preferred_session_length_min にスナップ（±5分）。
- 同種patternの連続回避、novelty_ratio をおおまかに満たす。
- deliverable は goal_evidence に1件以上アラインする（例: テスト/デモ/実績/発表）。
- 各クエスト: { title, pattern, minutes, difficulty, deliverable, criteria[], tags[] } のみ。

出力スキーマ:
{ "quests": [ { "title": "…", "pattern": "read_note_q|flashcards|build_micro|config_verify|debug_explain|feynman|past_paper|socratic|shadowing|retrospective", "minutes": 10..90, "difficulty": 0..1, "deliverable": "…", "criteria": ["…"], "tags": ["…"] } ] }
```

---

## 5. P4: Policy Check（自己審査・修正案）

**System**

```
あなたはポリシーチェッカーです。制約違反・重複・モード偏りを検出し、必要なら最小限の修正を加えて最終版を返します。出力はJSONのみ。
```

**User（テンプレ）**

```
<QUESTS_CANDIDATE>{{quests_from_P3}}</QUESTS_CANDIDATE>
<CONSTRAINTS>{{constraints_json}}</CONSTRAINTS>

制約:
- minutes 合計の上限、patternの連続回避、goal_evidence への最低1件のアラインを厳守。

出力スキーマ:
{ "quests": [ … ], "rationale": ["修正理由…"] }
```

---

## 6. P5: JIT Re-profile（行動ログからの当て直し）

**System**

```
あなたは適応学習の調整役です。過去7日ログから、difficulty_hint/novelty_ratio/セッション長/モード重みを更新し、必要なら短い追加質問を最大3つだけ提案します。出力はJSONのみ。
```

**User（テンプレ）**

```
<PROFILE_JSON>{{profile_v1}}</PROFILE_JSON>
<DERIVED_HINTS>{{derived_hints}}</DERIVED_HINTS>
<METRICS_7D>{
  "quests": [ {"minutes_planned": 20, "minutes_actual": 18, "difficulty": 0.55, "done": true, "satisfaction": 4, "pattern": "socratic" }, … ]
}</METRICS_7D>

出力スキーマ:
{
  "updates": { "difficulty_hint": 0..1, "novelty_ratio": 0..1, "preferred_session_length_min": 10..60, "modality_preference": ["…"] },
  "ask_later": ["…"]
}
```

---

## 7. 推奨パラメータ（モデル/温度）

- P1/Profile: **temperature 0.2–0.3**（厳密）
- P2/Skill Map: **0.3**
- P3/Quests: **0.4**
- P4/Policy: **0.1**
- P5/JIT: **0.2**

---

## 8. テスト用スニペット（英会話）

```json
{
  "goal_text": "3か月で英会話で15分雑談できるように",
  "goal_deadline": "2025-12-31",
  "goal_motivation": "high",
  "time_budget_min_per_day": 60,
  "weekly_minimum_commitment_min": 180,
  "preferred_session_length_min": 15,
  "env_constraints": ["commute"],
  "modality_preference": ["dialog","audio"],
  "deliverable_preferences": ["flashcards","note"]
}
```

---

## 9. 注意

- プロンプトは**日本語**で与え、**JSONのみ**を返させる（LLMに余計な前置きを禁止）。
- 信頼度が低い項目は P5 で優先的に補強する。
- 法律名・製品名などは "一次情報を確認" を代表タスクに必ず含め、誤情報を防ぐ。

