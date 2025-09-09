# Climb You – オンボーディング 質問設計（3×4固定・分岐あり）
最終更新: 2025-09-03

> 本ドキュメントは **質問部分のみ**（UI文言・選択肢・保存キー）を抜粋。  
> 日付・やる気・時間は「目標入力」で取得済みのため **再質問しない**。  
> 形式は **3ブロック×4スロット=12問**（各 4択＋任意メモ）。分岐は同ブロック内で次スロットを消費。

---

## ブロックA：ゴールの像（A → A’ → A’’）

### A（核）いま目指したいのは、どんな感じ？
- ① まずは**知る・わかる**を増やしたい → `goal_focus=knowledge`
- ② **できること**を増やしたい → `goal_focus=skill`
- ③ **結果（合格/数字/順位）**を出したい → `goal_focus=outcome`
- ④ **続ける習慣**をつくりたい → `goal_focus=habit`
- 任意メモ（例）：一言で「こうなったらOK」

#### A’（深掘り1｜Aの答えで分岐）達成像の具体は？
- A=outcome → ① 資格/スコア ② 売上/成約 ③ 順位/タイム ④ 公開/納品 → `goal_evidence`
- A=skill → ① 業務で使える ② 作品として形にする ③ 人に説明できる ④ トラブル対処 → `domain_scenes[]`
- A=habit → ① 毎日 ② 平日 ③ 週3 ④ 週末集約 → `habit_target`
- A=knowledge → ① 試験あり ② 試験なし ③ 過去問で測る ④ 自分でまとめる → `evidence_hint`

#### A’’（深掘り2）どの範囲感が近い？
- ① 広く浅く（全体像） → `scope_style=broad`
- ② 優先テーマをしぼる → `scope_style=prioritized`（メモで第1優先→`priority_areas[0]`）
- ③ 一点突破で深く → `scope_style=deep`（同上）
- ④ まだ決めない → `scope_style=undecided`
- 任意メモ（例）：使う場面（仕事/試験/日常 など） → `usage_scene` 補助

---

## ブロックB：道筋と負荷（B → B’ → B’’）

### B（核）新しいことと、反復。どっち寄り？
- ① 新規多め → `novelty_preference≈0.75`
- ② やや新規 → `≈0.60`
- ③ やや反復 → `≈0.40`
- ④ 反復多め → `≈0.25`

### B’（深掘り1）反復のリズムは？
- ① 毎日 ② 隔日 ③ 週次 ④ マイルストン時 → `review_cadence`

### B’’（深掘り2）チャレンジの強さは？
- ① やさしめ → `difficulty_bias=-0.1`
- ② ふつう → `0`
- ③ 少し攻めたい → `+0.1`
- ④ けっこう攻めたい → `+0.2`

---

## ブロックC：証拠と“仕上げ”（C → C’ → C’’）

### C（核）「できた！」を何で確かめたい？
- ① **テスト/スコア** → `goal_evidence=credential_score`
- ② **作ったもの**（デモ/ポートフォリオ） → `goal_evidence=portfolio_demo`
- ③ **実績**（成約/納品/本番） → `goal_evidence=realworld_result`
- ④ **発表/レビュー** → `goal_evidence=presentation_review`

### C’（深掘り1｜KPIの形：Cの答えで分岐）
- score：① 合格点±5% ② 正答率70% ③ 模試A判定 ④ タイム最適化 → `kpi_shape`
- portfolio：① 作品1 ② 作品2 ③ 作品3 ④ 1点を高品質 → `kpi_shape`
- realworld：① 成約1 ② 成約3 ③ デプロイ1 ④ PoC → `kpi_shape`
- presentation：① LT1 ② LT2 ③ レビュー1回 ④ レビュー2回 → `kpi_shape`

### C’’（深掘り2）仕上げ（キャップストーン）は？
- ① 模試/本番試験 ② デモ/公開 ③ 本番運用/納品 ④ 発表/レビュー会 → `capstone_type`
- 任意メモ（例）：実施タイミング（序盤/中盤/終盤/直前） → `capstone_phase` 補助

---

## ブロックD：挫折・失敗要因とリカバリ（D → D’ → D’’）

### D（核）挫折しやすいパターンは？
- ① **時間が足りない**（予定が押す/隙間がない） → `dropoff_type=time`
- ② **難しすぎて詰まる**（入口が固い） → `dropoff_type=difficulty`
- ③ **集中が切れがち**（気が散る/疲れ） → `dropoff_type=focus`
- ④ **意味を見失う**（目的がぼやける） → `dropoff_type=meaning`

### D’（深掘り1）崩れやすい“きっかけ”は？
- ① 仕事終わりで**疲れている** → `dropoff_trigger=fatigue`
- ② **予定が押す/帰りが遅い** → `dropoff_trigger=schedule_slip`
- ③ **通知/雑音で中断** → `dropoff_trigger=notification_noise`
- ④ **タスクが長い/重い** → `dropoff_trigger=task_too_long`

### D’’（深掘り2）崩れそうな時の“切替ルール”は？
- ① **5〜10分のミニ版に切替** → `fallback_strategy=micro_switch`
- ② **今日の1本を明日に繰越** → `fallback_strategy=defer`
- ③ **別の軽いクエストに差替** → `fallback_strategy=substitute`
- ④ **人に宣言/報告する** → `fallback_strategy=announce`
- 任意メモ（例）：具体ルール「金曜はミニ版」「移動中は1本だけ」

---

## 分岐・スロット運用ルール（簡潔）
- 各ブロックは **3スロット固定**（A/B/C/D 合計12問）。
- A’/C’ は **親の答えに応じて文言/選択肢を切替**。分岐は同ブロック内で次スロットを消費。
- 目標入力で取得済みの **日付・やる気・時間は質問しない**。

