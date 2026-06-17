"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  sendToN8n,
  getRecentArticles,
  getNewArticlesVsYesterday,
  type AppError,
} from "./actions";
import type { Article } from "@/lib/supabase";

type NewsItem = { title: string; url: string; content: string };
type ViewMode = "all" | "new-only";

function parseAppError(e: unknown): AppError {
  if (e instanceof Error) {
    try {
      return JSON.parse(e.message) as AppError;
    } catch {
      return { code: "UNKNOWN_ERROR", userMessage: e.message };
    }
  }
  return { code: "UNKNOWN_ERROR", userMessage: "検索に失敗しました" };
}

const ERROR_ICONS: Record<string, string> = {
  NETWORK_ERROR: "📡",
  TIMEOUT: "⏱",
  AUTH_ERROR: "🔑",
  RATE_LIMIT: "🚦",
  SERVER_ERROR: "🔧",
  UNKNOWN_ERROR: "⚠️",
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NewsItem[]>([]);
  const [newOnly, setNewOnly] = useState<Article[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [history, setHistory] = useState<Article[]>([]);
  const [appError, setAppError] = useState<AppError | null>(null);

  useEffect(() => {
    getRecentArticles().then(setHistory).catch(() => {});
  }, []);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setAppError(null);
    setResults([]);
    setNewOnly([]);
    setViewMode("all");
    try {
      const data = await sendToN8n(query);
      setResults(data.results ?? []);
      const diff = await getNewArticlesVsYesterday(query);
      setNewOnly(diff);
      const updated = await getRecentArticles();
      setHistory(updated);
    } catch (e) {
      setAppError(parseAppError(e));
    } finally {
      setLoading(false);
    }
  }

  const displayResults =
    viewMode === "new-only"
      ? newOnly
      : results.map((r) => ({ ...r, id: "", query, searched_at: "" }));

  return (
    <div className="flex min-h-screen flex-col items-center bg-white px-4 py-16">
      {/* 検索フォーム */}
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">AIニュース検索</CardTitle>
          <CardDescription>
            n8n + Tavily で検索 → Supabase に自動保存
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="例: 生成AI、量子コンピュータ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <div className="flex gap-2 flex-wrap">
            {["最新AI", "スタートアップ", "テック規制"].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600 cursor-pointer hover:bg-gray-200"
                onClick={() => setQuery(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setResults([]);
              setNewOnly([]);
              setAppError(null);
            }}
          >
            クリア
          </Button>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "検索中..." : "検索する"}
          </Button>
        </CardFooter>
      </Card>

      {/* エラーバナー */}
      {appError && (
        <div className="mt-6 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">{ERROR_ICONS[appError.code] ?? "⚠️"}</span>
            <div>
              <p className="text-sm font-medium text-red-800">{appError.userMessage}</p>
              <p className="text-xs text-red-500 mt-0.5">コード: {appError.code}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleSearch} disabled={loading}>
            再試行
          </Button>
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div className="mt-8 w-full max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {viewMode === "new-only"
                ? `昨日と比較して新着 ${newOnly.length} 件`
                : `${results.length} 件の結果（via n8n + Tavily）`}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === "all" ? "default" : "outline"}
                onClick={() => setViewMode("all")}
              >
                全件
              </Button>
              <Button
                size="sm"
                variant={viewMode === "new-only" ? "default" : "outline"}
                onClick={() => setViewMode("new-only")}
                disabled={newOnly.length === 0}
              >
                🆕 昨日と比較
                {newOnly.length > 0 && (
                  <span className="ml-1 rounded-full bg-blue-500 text-white text-xs px-1.5">
                    {newOnly.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {displayResults.length === 0 && viewMode === "new-only" && (
            <p className="text-sm text-gray-400 text-center py-4">
              昨日と同じ記事のみです。新着はありません。
            </p>
          )}

          {displayResults.map((item, i) => (
            <ArticleCard key={item.url ?? i} item={item} />
          ))}
        </div>
      )}

      {/* 過去の検索履歴 */}
      {history.length > 0 && (
        <div className="mt-12 w-full max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">過去の検索履歴</h2>
          <div className="space-y-3">
            {history.map((item) => (
              <ArticleCard key={item.id} item={item} showMeta />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleCard({
  item,
  showMeta = false,
}: {
  item: Partial<Article> & { title: string; url: string; content: string };
  showMeta?: boolean;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base leading-snug">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-blue-700"
          >
            {item.title}
          </a>
        </CardTitle>
        <CardDescription className="text-xs truncate">{item.url}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 leading-relaxed">
          {item.content.slice(0, 200)}
          {item.content.length > 200 ? "..." : ""}
        </p>
        {showMeta && item.searched_at && (
          <p className="mt-2 text-xs text-gray-400">
            キーワード: <span className="font-medium">{item.query}</span>
            {"　"}
            {new Date(item.searched_at).toLocaleString("ja-JP")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
