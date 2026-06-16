-- Supabase SQL Editor で実行してください
-- メモ・日記の保存先テーブル（毎朝8時のブリーフィング生成が、ここを読みます）
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  entry_date  date not null,                          -- 「朝5時境界」で判定した論理日（America/Los_Angeles）
  kind        text not null check (kind in ('memo','diary')),
  body        text,                                   -- メモ本文 / 日記の自由メモ
  details     jsonb,                                  -- 日記の構造化項目 {sleep, meals, whoWhat, condition, meds}
  created_at  timestamptz not null default now()
);

create index if not exists entries_entry_date_idx on entries (entry_date desc);
create index if not exists entries_created_at_idx on entries (created_at desc);

-- RLS を有効化したうえで anon ロールに読み取り・追加を許可
alter table entries enable row level security;

create policy "anon can read entries"
  on entries for select
  to anon
  using (true);

create policy "anon can insert entries"
  on entries for insert
  to anon
  with check (true);

-- 旧 articles テーブル（AIニュース検索）は本アプリでは未使用。
-- 残しても害はないが、不要なら以下で削除可能:
--   drop table if exists articles;
