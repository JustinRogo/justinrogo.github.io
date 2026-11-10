# Requests: the website request form on Supabase

The **Request** panel on the Tools page (`#/tools?panel=request`) and the original homepage's **Submit a Request** tab save submissions to a `site_requests` table in the **same Supabase project as Updates**. Visitors do not sign in. FormSubmit and the Trello board are no longer used.

## How it works

1. The browser posts JSON to `https://justinrogo.vercel.app/api/requests` (`api/requests.mjs`). Pages served from Vercel use the same-origin `/api/requests` path. GitHub Pages cannot run API routes, so the GitHub Pages site posts across origins and the route answers CORS only for this site's origins.
2. The route rejects other origins, discards honeypot submissions (the hidden `website` field) while reporting success, asks for a retry when a form is sent in under two seconds, and validates and trims every field (`lib/requests.mjs`).
3. It inserts the row with the **publishable key**, so the database's anonymous rules apply. It sends an HMAC of the sender's IP address (`client_hash`) for throttling. It does not store the address itself.
4. In Postgres, row-level security allows `insert` for `anon` and `authenticated` users and nothing else. Visitors can supply only `name`, `email`, `subject`, `details` and `client_hash` through a column-level grant. A trigger sets `status = 'new'` and `created_at = now()` and enforces two limits:
   - 3 requests per sender (`client_hash`) per 10 minutes
   - 30 requests per hour in total. This also caps anyone who calls Supabase directly with the public key and skips the API route.

| Field | Limit |
| --- | --- |
| Name | 1–100 characters |
| Email | 3–254 characters, `something@domain.tld` |
| Subject | 1–150 characters |
| Details | 1–5,000 characters, at most 3 links (API route) |

## 1. Create the table

In the Updates project's **SQL editor**, run `supabase/migrations/20261109_site_requests.sql` once. You can safely run it again. It does not touch the Updates tables.

## 2. Configure Vercel

The route reuses the Updates variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `UPDATES_SITE_URL`). Add:

| Variable | Value |
| --- | --- |
| `REQUESTS_HASH_SALT` | A long random string, for example from `openssl rand -hex 32`. Recommended. Without it the route falls back to the publishable key, which is public. |
| `REQUESTS_ALLOWED_ORIGINS` | Optional. A comma-separated list of extra origins allowed to post, such as a custom domain. GitHub Pages, `justinrogo.vercel.app`, `UPDATES_SITE_URL` and the local preview ports are already allowed. |

Redeploy after you change variables. Requests never need a secret or service-role key.

## 3. Read and track requests

Open **Supabase → Table Editor → `site_requests`**, sorted by `created_at` descending. You can change `status` to `in_progress`, `done` or `archived` there; the form always creates `new` rows. The dashboard signs you in as the project owner, so it can read rows that visitors cannot.

Supabase doesn't send email for new rows. To be notified, add a **Database Webhook** (Database → Webhooks) on `insert` into `site_requests`, or check the table regularly.

## Local checks

```powershell
npm.cmd run test:updates
npm.cmd run test:v2
```

`tests/requests.test.mjs` runs the migration in PGlite. It confirms that anonymous users can insert but cannot select, update or delete rows or set `status`, and it checks the length rules and both throttles. It also tests the route's origin, honeypot, timing and validation checks without reaching Supabase. The Playwright tests intercept `/api/requests` and never send a real request.

`npm.cmd run dev` (port 4388) serves `/api/requests` using `.env.local`. The V2 dev server (4392) and the static preview (4391) post to that local API rather than to production. If it is not running, the form shows its error state.

After deploying, send one real request from `https://justinrogo.github.io/#/tools?panel=request` and confirm it appears in the table.
