# Newsletter (footer signup)

Emails from **Join the AMC list** are saved to Supabase table `newsletter_subscribers` via `POST /api/newsletter` (legacy `POST /api/subscribe` still works).

## One-time setup (Supabase)

1. Open **Supabase** → **SQL Editor**.
2. Paste and run the script in `supabase/newsletter_subscribers.sql`.

## Viewing subscribers

- **Supabase** → **Table Editor** → `newsletter_subscribers`
- Export CSV from there when you want to mail a blast (Mailchimp, Buttondown, etc.).

## Vercel routing

Vercel applies **rewrites before** serverless routes. A catch‑all `/(.*)` → `index.html` will swallow **`/api/*`** too (newsletter never runs). This project uses **only explicit SPA rewrites** (`/`, `/about`, `/favorites`, `/contact`, `/article/:slug*`) so **`/api/*` is never rewritten** and hits your functions. If you add new client-side URL paths, add a matching rewrite in `vercel.json`.

## Env vars

Uses the same Vercel env vars as the rest of the site:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No extra secrets required.

## Sending actual emails

This flow **collects** addresses; it does not send campaigns. When you pick a provider (Buttondown, Beehiiv, Mailchimp, etc.), you can import the CSV or we can wire their API next.
