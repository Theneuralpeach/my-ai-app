import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// 日記の構造化項目
export type DiaryDetails = {
  sleep?: string; // 睡眠時間
  meals?: string; // 食べたもの
  whoWhat?: string; // 誰と何したか
  condition?: string; // 体調
  meds?: string; // 服薬（イソトレチノイン）: "飲んだ" | "忘れた" | ""
};

// メモ・日記の1件
export type Entry = {
  id: string;
  entry_date: string; // 朝5時境界で判定した論理日 (YYYY-MM-DD)
  kind: "memo" | "diary";
  body: string | null;
  details: DiaryDetails | null;
  created_at: string;
};
