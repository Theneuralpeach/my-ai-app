"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  saveMemo,
  saveDiary,
  getEntriesForDate,
  todayLogicalDate,
  type AppError,
} from "./actions";
import type { Entry, DiaryDetails } from "@/lib/supabase";

type Mode = "memo" | "diary";

function parseAppError(e: unknown): AppError {
  if (e instanceof Error) {
    try {
      return JSON.parse(e.message) as AppError;
    } catch {
      return { code: "UNKNOWN_ERROR", userMessage: e.message };
    }
  }
  return { code: "UNKNOWN_ERROR", userMessage: "保存に失敗しました" };
}

function timeJa(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("memo");
  const [today, setToday] = useState<string>("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);

  // メモ
  const [memo, setMemo] = useState("");

  // 日記
  const [diary, setDiary] = useState<DiaryDetails>({});
  const [diaryNote, setDiaryNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const list = await getEntriesForDate();
      setEntries(list);
    } catch {
      /* 一覧の失敗は致命的でないので握りつぶす */
    }
  }, []);

  useEffect(() => {
    todayLogicalDate().then(setToday).catch(() => {});
    refresh();
  }, [refresh]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function submitMemo() {
    if (!memo.trim() || saving) return;
    setSaving(true);
    setAppError(null);
    try {
      await saveMemo(memo);
      setMemo("");
      flash("メモを記録したよ ✅");
      await refresh();
    } catch (e) {
      setAppError(parseAppError(e));
    } finally {
      setSaving(false);
    }
  }

  async function submitDiary() {
    if (saving) return;
    setSaving(true);
    setAppError(null);
    try {
      await saveDiary(diary, diaryNote);
      setDiary({});
      setDiaryNote("");
      flash("日記を記録したよ ✅");
      await refresh();
    } catch (e) {
      setAppError(parseAppError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 px-4 py-8">
      {/* ヘッダー */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">今日のメモ &amp; 日記</h1>
        <p className="text-sm text-gray-500">
          {today ? `${today} の記録` : "読み込み中…"}
        </p>
        <p className="rounded-md bg-indigo-50 px-3 py-2 text-xs leading-relaxed text-indigo-700">
          ここに送ったメモ・日記は、<b>毎朝8時</b>に自動でまとめられて、その日のブリーフィングになります。「おやすみ」を打たなくても大丈夫。
        </p>
      </header>

      {/* モード切替 */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={mode === "memo" ? "default" : "outline"}
          onClick={() => setMode("memo")}
        >
          📝 メモ
        </Button>
        <Button
          variant={mode === "diary" ? "default" : "outline"}
          onClick={() => setMode("diary")}
        >
          📔 日記
        </Button>
      </div>

      {/* 入力エリア */}
      {mode === "memo" ? (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-700">
            思いついたこと・タスク・連絡事項
          </label>
          <textarea
            className="min-h-28 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            placeholder="例: タノシイは8月で終了で確定。STCロゴはマップに反映済み。"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitMemo();
            }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">⌘/Ctrl + Enter で送信</span>
            <Button onClick={submitMemo} disabled={saving || !memo.trim()}>
              {saving ? "記録中…" : "記録する"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <DiaryField
            label="① 睡眠時間"
            placeholder="例: 7時間 / よく眠れた"
            value={diary.sleep ?? ""}
            onChange={(v) => setDiary((d) => ({ ...d, sleep: v }))}
          />
          <DiaryField
            label="② 食べたもの"
            placeholder="例: 朝はスムージー、夜は外食"
            value={diary.meals ?? ""}
            onChange={(v) => setDiary((d) => ({ ...d, meals: v }))}
          />
          <DiaryField
            label="③ 誰と何したか"
            placeholder="例: Sway と Pauloとポケ"
            value={diary.whoWhat ?? ""}
            onChange={(v) => setDiary((d) => ({ ...d, whoWhat: v }))}
          />
          <DiaryField
            label="④ 体調"
            placeholder="例: 少しだるい / 元気"
            value={diary.condition ?? ""}
            onChange={(v) => setDiary((d) => ({ ...d, condition: v }))}
          />

          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">
              ⑤ 薬（イソトレチノイン 20mg）
            </span>
            <div className="flex gap-2">
              {(["飲んだ", "忘れた"] as const).map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  variant={diary.meds === opt ? "default" : "outline"}
                  onClick={() =>
                    setDiary((d) => ({ ...d, meds: d.meds === opt ? "" : opt }))
                  }
                >
                  {opt === "飲んだ" ? "✅ 飲んだ" : "⚠️ 忘れた"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium text-gray-700">自由メモ</span>
            <textarea
              className="min-h-20 w-full resize-y rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              placeholder="今日感じたこと、なんでも"
              value={diaryNote}
              onChange={(e) => setDiaryNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={submitDiary} disabled={saving}>
              {saving ? "記録中…" : "日記を記録する"}
            </Button>
          </div>
        </div>
      )}

      {/* トースト */}
      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
          {toast}
        </div>
      )}

      {/* エラー */}
      {appError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {appError.userMessage}
          <span className="ml-2 text-xs text-red-400">({appError.code})</span>
        </div>
      )}

      {/* 今日の記録 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          今日の記録（{entries.length}件）
        </h2>
        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            まだ今日の記録はありません。上から送ってね。
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <EntryCard key={e.id} entry={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DiaryField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const d = entry.details;
  return (
    <li className="rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
      <div className="mb-1 flex items-center gap-2 text-xs text-gray-400">
        <span
          className={`rounded-full px-2 py-0.5 font-medium ${
            entry.kind === "diary"
              ? "bg-amber-100 text-amber-700"
              : "bg-indigo-100 text-indigo-700"
          }`}
        >
          {entry.kind === "diary" ? "📔 日記" : "📝 メモ"}
        </span>
        <span>{timeJa(entry.created_at)}</span>
      </div>
      {entry.body && <p className="whitespace-pre-wrap text-gray-800">{entry.body}</p>}
      {d && (
        <dl className="mt-1 space-y-0.5 text-gray-700">
          {d.sleep && <Row k="睡眠" v={d.sleep} />}
          {d.meals && <Row k="食事" v={d.meals} />}
          {d.whoWhat && <Row k="誰と何" v={d.whoWhat} />}
          {d.condition && <Row k="体調" v={d.condition} />}
          {d.meds && <Row k="薬" v={d.meds} />}
        </dl>
      )}
    </li>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-gray-400">{k}:</dt>
      <dd className="text-gray-800">{v}</dd>
    </div>
  );
}
