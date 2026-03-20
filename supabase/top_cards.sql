-- Run in Supabase → SQL Editor (manual Top Cards ticker)

create table if not exists public.top_cards (
  id text primary key,
  rank integer not null,
  card_name text not null,
  set_name text,
  image_url text,
  product_id integer,
  market_price numeric,
  low_price numeric,
  mid_price numeric,
  high_price numeric,
  updated_at timestamptz not null default now()
);

alter table public.top_cards enable row level security;

drop policy if exists "public read top cards" on public.top_cards;
create policy "public read top cards"
on public.top_cards
for select
to anon
using (true);

-- If you created an older version with NOT NULL product_id:
-- alter table public.top_cards alter column product_id drop not null;
