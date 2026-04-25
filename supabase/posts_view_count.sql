-- Run in Supabase SQL editor before deploying view tracking.
-- Starts counts from now by adding a zero-based counter on each post.

alter table public.posts
add column if not exists view_count integer not null default 0;

