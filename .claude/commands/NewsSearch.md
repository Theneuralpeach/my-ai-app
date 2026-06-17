# NewsSearch スキル

AIニュース検索の一連のフローを実行・管理するスキル。

## 概要

ユーザーが入力したキーワードをもとに：
1. **Tavily API** でAI関連の最新ニュースを3件取得
2. **n8n Webhook** にデータを送信（受信確認・パイプライン連携）
3. **Next.js 画面** にカード形式で結果を表示

---

## ファイル構成

```
my-ai-app/
├── src/app/
│   ├── page.tsx          # 検索フォーム + 結果表示UI
│   └── actions.ts        # searchNews() / sendToN8n() Server Actions
├── .env.local            # TAVILY_API_KEY / N8N_WEBHOOK_URL
└── n8n-workflow.json     # n8n インポート用ワークフロー定義
```

---

## 各関数の役割

### `searchNews(query: string)` — `src/app/actions.ts`
- Tavily Search API (`https://api.tavily.com/search`) を POST で呼び出す
- `max_results: 3`、`search_depth: "basic"`
- `{ title, url, content }[]` を返す
- 環境変数: `TAVILY_API_KEY`

### `sendToN8n(query: string)` — `src/app/actions.ts`
- n8n の Webhook エンドポイントに `{ query }` を POST する
- n8n 側でエコーバックされたレスポンスをそのまま返す
- 環境変数: `N8N_WEBHOOK_URL`（デフォルト: `http://localhost:5678/webhook/ai-news-search`）

---

## n8n ワークフロー

| ノード | 種別 | 設定 |
|---|---|---|
| Webhook | Trigger | POST `/webhook/ai-news-search`、responseMode: responseNode |
| Respond to Webhook | Transform | 受信した JSON をそのまま返す、CORS許可 |

**インポート手順:**
1. n8n を起動: `npx n8n`
2. `http://localhost:5678` → Workflows → Import from file
3. `n8n-workflow.json` を選択してActivate

---

## 環境変数

```env
TAVILY_API_KEY=tvly-dev-xxxxxx
N8N_WEBHOOK_URL=http://localhost:5678/webhook/ai-news-search
```

---

## このスキルを使ったタスク例

- 「NewsSearch の検索結果に要約文を追加して」
- 「NewsSearch で取得したニュースを n8n 経由で Slack に通知して」
- 「NewsSearch の UI にページネーションを追加して」
- 「NewsSearch のキーワード履歴をローカルストレージに保存して」

---

## 実行手順（開発サーバー）

```bash
# Node.js v20 で起動
source ~/.nvm/nvm.sh && nvm use 20
cd my-ai-app && npm run dev
# → http://localhost:3000
```
