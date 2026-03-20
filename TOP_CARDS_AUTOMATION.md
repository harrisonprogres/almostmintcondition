# Top Cards Ticker (Manual Mode)

## 1) Create table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
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
```

If you already created this table with `product_id NOT NULL`, run:

```sql
alter table public.top_cards alter column product_id drop not null;
```

## 2) Update cards from your dashboard

- Sign in to admin
- Open `Top Cards Ticker` in the left menu
- Add or remove cards manually
- Set rank `1` through `7` to control order
- Optional price field is displayed as `$XX.XX` in the ticker

## 3) API routes used

- Public read: `GET /api/top-cards`
- Admin write: `POST /api/admin/top-cards`
- Admin delete: `DELETE /api/admin/top-cards?id=...`

