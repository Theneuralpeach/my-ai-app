"use server";

import { supabase, type Article } from "@/lib/supabase";

type NewsItem = { title: string; url: string; content: string };

export type AppError = {
  userMessage: string;
  code: string;
};

// HTTP ステータスやエラー種別を人間向けメッセージに変換
function classifyError(source: "n8n" | "tavily", err: unknown, status?: number): AppError {
  // ネットワーク到達不能（fetch 自体が throw）
  if (err instanceof TypeError && err.message.includes("fetch")) {
    console.error(`[${source}] ネットワークエラー:`, err.message);
    return {
      code: "NETWORK_ERROR",
      userMessage: "ネットワークに接続できません。インターネット接続を確認してください。",
    };
  }

  // タイムアウト
  if (err instanceof Error && err.name === "AbortError") {
    console.error(`[${source}] タイムアウト`);
    return {
      code: "TIMEOUT",
      userMessage: "リクエストがタイムアウトしました。しばらくしてから再試行してください。",
    };
  }

  // HTTP ステータスコード別
  if (status === 401 || status === 403) {
    console.error(`[${source}] 認証エラー: status=${status}`);
    return {
      code: "AUTH_ERROR",
      userMessage: "APIキーが無効です。設定を確認してください。",
    };
  }
  if (status === 429) {
    console.error(`[${source}] レート制限: status=429`);
    return {
      code: "RATE_LIMIT",
      userMessage: "リクエストが多すぎます。しばらく待ってから再試行してください。",
    };
  }
  if (status && status >= 500) {
    console.error(`[${source}] サーバーエラー: status=${status}`);
    return {
      code: "SERVER_ERROR",
      userMessage: "サービスが一時的に利用できません。しばらくしてから再試行してください。",
    };
  }

  // その他
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${source}] 不明なエラー: status=${status ?? "-"} message=${message}`);
  return {
    code: "UNKNOWN_ERROR",
    userMessage: "現在検索できません。しばらくしてから再試行してください。",
  };
}

// n8n Webhook 経由で Tavily 検索 → 結果を Supabase に自動保存
export async function sendToN8n(query: string): Promise<{ results: NewsItem[] }> {
  const n8nUrl =
    process.env.N8N_WEBHOOK_URL ?? "http://localhost:5678/webhook/ai-news-search";

  let res: Response;
  try {
    res = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000), // 15秒タイムアウト
    });
  } catch (err) {
    const appErr = classifyError("n8n", err);
    throw new Error(JSON.stringify(appErr));
  }

  if (!res.ok) {
    const appErr = classifyError("n8n", new Error(`status ${res.status}`), res.status);
    throw new Error(JSON.stringify(appErr));
  }

  const data: { results: NewsItem[] } = await res.json();
  await saveArticles(query, data.results);
  return data;
}

// Supabase に記事を upsert（url が重複したら searched_at を更新）
export async function saveArticles(query: string, results: NewsItem[]) {
  const rows = results.map((r) => ({
    query,
    title: r.title,
    url: r.url,
    content: r.content,
    searched_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("articles")
    .upsert(rows, { onConflict: "url" });

  if (error) console.error("Supabase save error:", error.message);
}

// 過去の検索結果を新しい順に 20 件取得
export async function getRecentArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("searched_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

// 今日取得した記事のうち、昨日保存されていなかった記事だけを返す
export async function getNewArticlesVsYesterday(query: string): Promise<Article[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  // 昨日保存済みの url を取得
  const { data: yesterday } = await supabase
    .from("articles")
    .select("url")
    .eq("query", query)
    .gte("searched_at", yesterdayStart.toISOString())
    .lt("searched_at", todayStart.toISOString());

  const yesterdayUrls = new Set((yesterday ?? []).map((r) => r.url));

  // 今日取得した記事のうち昨日にない url だけ返す
  const { data: today, error } = await supabase
    .from("articles")
    .select("*")
    .eq("query", query)
    .gte("searched_at", todayStart.toISOString())
    .order("searched_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (today ?? []).filter((a) => !yesterdayUrls.has(a.url));
}

// 直接 Tavily を呼ぶ旧関数（後方互換用）
export async function searchNews(query: string): Promise<NewsItem[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: `${query} AI news`,
      search_depth: "basic",
      max_results: 3,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily API error: ${res.status}`);
  const data = await res.json();
  return data.results as NewsItem[];
}
