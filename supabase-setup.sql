-- Supabase SQL Editor で実行してください
create table if not exists articles (
  id          uuid primary key default gen_random_uuid(),
  query       text not null,
  title       text not null,
  url         text not null unique,
  content     text not null,
  searched_at timestamptz not null default now()
);

create index if not exists articles_searched_at_idx on articles (searched_at desc);
create index if not exists articles_query_idx on articles (query);

-- RLS を有効化したうえで anon ロールに全操作を許可
alter table articles enable row level security;

create policy "anon can read articles"
  on articles for select
  to anon
  using (true);

create policy "anon can insert articles"
  on articles for insert
  to anon
  with check (true);

create policy "anon can update articles"
  on articles for update
  to anon
  using (true)
  with check (true);
