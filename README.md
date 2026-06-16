# メモ & 日記 → 毎朝ブリーフィング

[Next.js](https://nextjs.org) + Supabase の小さなアプリ。
**メモ・日記を送るだけ**で、毎朝8時に自動でその日のブリーフィングが Notion に作られる。
「おやすみ」コマンドを手で打たなくても、送ってある内容から同じ効果が出るようにするのが目的。

## 仕組み（2ステップ）

1. **入力（このアプリ）** — メモ／日記を入力 → Supabase `entries` テーブルに保存。
   - 「1日の境界は朝5時」（America/Los_Angeles）で論理日を判定して保存（`src/lib/date.ts`）。
2. **生成（毎朝8時の自動セッション）** — 溜まったメモ・日記を読み、恒久ルールに沿って
   翌日（その日）の「📋 朝briefing」を Notion に作成＋材料ページを更新。
   - 手順は `.claude/commands/morning-briefing.md` を参照。

## セットアップ

### 1. 環境変数 `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 2. Supabase テーブル作成
`supabase-setup.sql` を Supabase SQL Editor で実行。

### 3. ローカル起動
```bash
npm install
npm run dev
# → http://localhost:3000
```

### 4. 毎朝8時の自動生成（Part B）
Claude Code on the web の定期トリガーを **毎朝8:00（America/Los_Angeles）** に設定し、
`/morning-briefing` を実行させる。詳細・書き込み先ページIDは
`.claude/commands/morning-briefing.md` に記載。

## 主なファイル

| ファイル | 役割 |
|---|---|
| `src/app/page.tsx` | メモ／日記の入力UI・今日の記録一覧 |
| `src/app/actions.ts` | 保存・取得の Server Actions |
| `src/lib/date.ts` | 朝5時境界の論理日ヘルパー |
| `src/lib/supabase.ts` | Supabase クライアント・型 |
| `supabase-setup.sql` | `entries` テーブル定義 |
| `.claude/commands/morning-briefing.md` | 毎朝8時の生成プレイブック |
