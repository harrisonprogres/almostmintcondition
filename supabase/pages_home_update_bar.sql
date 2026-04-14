-- Run in Supabase SQL Editor if the Home Update Bar still does not load on the site.
-- (Normally saving from Admin once after deploy creates this row automatically.)

insert into public.pages (id, content, updated_at)
values (
  'home_update_bar',
  '',
  now()
)
on conflict (id) do nothing;
