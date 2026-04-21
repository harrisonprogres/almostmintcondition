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

## 4) Optional: seed the ticker without the admin UI

Paste and run `supabase/seed_top_cards_movers_example.sql` in the SQL Editor. It upserts ranks 1–7 using the same `id` pattern as the dashboard (`top_rank_1` … `top_rank_7`).  
**Note:** That file uses example prices from a published market snapshot, not live data—edit or re-run from admin anytime.

## Future (not a priority right now)

**Automate the ticker** — e.g. scheduled job + market data API (TCGplayer or another source) to refresh top movers / prices weekly. Owner preference: **manual admin entry is fine for now**; revisit automation when it becomes worth the setup and ongoing API/maintenance cost.

