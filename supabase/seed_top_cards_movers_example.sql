-- OPTIONAL: One-time seed for homepage ticker (Top Cards).
-- Based on a published Feb 2026 TCGPlayer movers snapshot (NOT live data).
-- Run in Supabase → SQL Editor when you want these rows without using the admin UI.
-- Safe to re-run: upserts by id (top_rank_1 … top_rank_7).

insert into public.top_cards (id, rank, card_name, set_name, market_price, updated_at)
values
  ('top_rank_1', 1, 'Mega Charizard X ex (125/094)', 'Mega Evolution', 641.87, now()),
  ('top_rank_2', 2, 'Umbreon ex (161/131)', 'Prismatic Evolutions', 944.20, now()),
  ('top_rank_3', 3, 'Gengar & Mimikyu GX (alt art)', 'Team Up', 1223.13, now()),
  ('top_rank_4', 4, 'Giratina V (alt art)', 'Lost Origin', 663.20, now()),
  ('top_rank_5', 5, 'Gengar VMAX (alt art)', 'Fusion Strike', 734.67, now()),
  ('top_rank_6', 6, 'Horsea (1st Edition)', 'Fossil', 20.04, now()),
  ('top_rank_7', 7, 'Team Rocket''s Petrel (226/182)', 'Scarlet & Violet', 14.68, now())
on conflict (id) do update set
  rank = excluded.rank,
  card_name = excluded.card_name,
  set_name = excluded.set_name,
  market_price = excluded.market_price,
  updated_at = excluded.updated_at;
