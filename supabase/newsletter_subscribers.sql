-- Run this in Supabase → SQL Editor (once).
-- Stores newsletter signups from the site footer (via /api/subscribe).

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now(),
  constraint newsletter_subscribers_email_key unique (email)
);

-- Optional: help the planner
create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

comment on table public.newsletter_subscribers is 'Footer newsletter signups; written only by Vercel API using service role.';

-- RLS on, no policies: the public anon key cannot read/write this table.
-- Your /api/subscribe route uses the service role key, which bypasses RLS.
alter table public.newsletter_subscribers enable row level security;
