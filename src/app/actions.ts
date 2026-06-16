"use server";

import { supabase, type Entry, type DiaryDetails } from "@/lib/supabase";
import { logicalDate } from "@/lib/date";

export type AppError = {
  userMessage: string;
  code: string;
};

function appError(code: string, userMessage: string): Error {
  return new Error(JSON.stringify({ code, userMessage } satisfies AppError));
}

type NewEntry = {
  kind: "memo" | "diary";
  body: string | null;
  details: DiaryDetails | null;
};

async function insertEntry(row: NewEntry): Promise<Entry> {
  const entry_date = logicalDate();
  const { data, error } = await supabase
    .from("entries")
    .insert({ entry_date, ...row })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error.message);
    throw appError("DB_ERROR", "保存できませんでした。少し時間をおいてもう一度試してください。");
  }
  return data as Entry;
}

// メモを1件保存
export async function saveMemo(body: string): Promise<Entry> {
  const text = body.trim();
  if (!text) throw appError("EMPTY", "メモが空です。");
  return insertEntry({ kind: "memo", body: text, details: null });
}

// 日記を1件保存（自由メモ＋構造化項目）
export async function saveDiary(details: DiaryDetails, body: string): Promise<Entry> {
  const cleaned: DiaryDetails = {
    sleep: details.sleep?.trim() || undefined,
    meals: details.meals?.trim() || undefined,
    whoWhat: details.whoWhat?.trim() || undefined,
    condition: details.condition?.trim() || undefined,
    meds: details.meds?.trim() || undefined,
  };
  const hasAny = Object.values(cleaned).some(Boolean) || body.trim().length > 0;
  if (!hasAny) throw appError("EMPTY", "日記が空です。どれか1つでも書いてね。");
  return insertEntry({ kind: "diary", body: body.trim() || null, details: cleaned });
}

// 指定した論理日（既定: 今日）の記録を古い順に取得
export async function getEntriesForDate(date?: string): Promise<Entry[]> {
  const entry_date = date ?? logicalDate();
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .eq("entry_date", entry_date)
    .order("created_at", { ascending: true });

  if (error) throw appError("DB_ERROR", "記録を読み込めませんでした。");
  return (data ?? []) as Entry[];
}

// 最近の記録を新しい順に取得
export async function getRecentEntries(limit = 30): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw appError("DB_ERROR", "記録を読み込めませんでした。");
  return (data ?? []) as Entry[];
}

// 今日の論理日（朝5時境界）を返す
export async function todayLogicalDate(): Promise<string> {
  return logicalDate();
}
