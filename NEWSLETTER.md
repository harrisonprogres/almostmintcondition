# Newsletter (footer signup)

Emails from **Join the AMC list** are saved to Supabase table `newsletter_subscribers` via `POST /api/newsletter` (legacy `POST /api/subscribe` still works).

## One-time setup (Supabase)

1. Open **Supabase** → **SQL Editor**.
2. Paste and run the script in `supabase/newsletter_subscribers.sql`.

## Viewing subscribers

- **Supabase** → **Table Editor** → `newsletter_subscribers`
- Export CSV from there when you want to mail a blast (Mailchimp, Buttondown, etc.).

## Vercel routing

The SPA fallback must **not** send `/api/*` to `index.html`, or newsletter (and other API `POST`s) will fail. `vercel.json` uses a rewrite that matches all paths **except** those starting with `api/` (negative lookahead), so `/api/newsletter` hits the serverless function.

## Env vars

Uses the same Vercel env vars as the rest of the site:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No extra secrets required.

## Sending actual emails

This flow **collects** addresses; it does not send campaigns. When you pick a provider (Buttondown, Beehiiv, Mailchimp, etc.), you can import the CSV or we can wire their API next.
