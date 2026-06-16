// 「1日の境界は朝5時」ルールに従った“論理日”を扱うヘルパー。
// タイムゾーンは Monica の生活拠点に合わせて America/Los_Angeles 固定。
// 朝5時より前の時刻は「前日」として扱う。

export const APP_TIMEZONE = "America/Los_Angeles";
export const DAY_BOUNDARY_HOUR = 5;

type YMDH = { year: number; month: number; day: number; hour: number };

function partsInTz(date: Date, tz: string): YMDH {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) map[p.type] = p.value;
  // Intl は深夜0時を "24" と返す環境があるため 0 に正規化
  const hour = Number(map.hour) % 24;
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), hour };
}

// 指定時刻（既定: 現在）の論理日を YYYY-MM-DD で返す
export function logicalDate(now: Date = new Date(), tz: string = APP_TIMEZONE): string {
  const { year, month, day, hour } = partsInTz(now, tz);
  // 正午UTC基準で日付を組み、境界前なら1日戻す（TZのずれを避ける）
  let dt = new Date(Date.UTC(year, month - 1, day, 12));
  if (hour < DAY_BOUNDARY_HOUR) dt = new Date(dt.getTime() - 24 * 60 * 60 * 1000);
  return dt.toISOString().slice(0, 10);
}

// YYYY-MM-DD を n 日ずらす
export function shiftDate(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12) + deltaDays * 24 * 60 * 60 * 1000);
  return dt.toISOString().slice(0, 10);
}

// 表示用：YYYY-MM-DD（曜）
const WEEKDAYS_JA = ["日", "月", "火", "水", "木", "金", "土"];
export function formatDateJa(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return `${ymd}（${WEEKDAYS_JA[dt.getUTCDay()]}）`;
}
