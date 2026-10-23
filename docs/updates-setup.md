# Updates: Vercel + a separate Supabase project

The implementation adds a public rich text channel, author-only publishing, authenticated moderated comments, public image uploads by the author, an RSS feed, and a small read-only iframe for **https://uconn.atlassian.net**.

It does not use the Front Desk Planner's Supabase project. No posts or user accounts are created by the repository code. The preview uses explicitly labeled example posts and never writes to Supabase.

## 1. Create and prepare the database

1. Create a new Supabase project specifically for Updates.
2. Run the contents of `supabase/updates.sql` in that project's SQL editor once. It creates the Updates tables, row-level security rules, a private author allowlist, a per-account comment throttle, and the public `updates-images` bucket (PNG/JPEG/GIF/WebP only, 5 MB maximum).
3. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://justinrogo.vercel.app`. Allow `https://justinrogo.vercel.app/updates` and `https://justinrogo.vercel.app/updates?**` as redirect URLs. Add `http://127.0.0.1:4388/updates` and the corresponding query form only if testing local sign-in. Keep production and preview access deliberate; do not allow arbitrary domains.
4. Enable email sign-in. Configure custom SMTP for sending sign-in links to real readers. Supabase's default mail service is restricted and is for testing, so a successful author test alone does not establish that other readers can receive links.

Public posts and uploaded images are accessible outside Confluence too. Draft text stays private. Images uploaded while drafting go into the public bucket; do not upload confidential images. Closing comments preserves already approved comments.

## 2. Configure Vercel

Add these project environment variables for Production (and Preview separately if desired):

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | The URL of the new project |
| `SUPABASE_PUBLISHABLE_KEY` | Its publishable key (`sb_publishable_…`) or legacy **anon** key |
| `UPDATES_SITE_URL` | `https://justinrogo.vercel.app` |

Use a publishable/anon key, never a secret/service-role key. All writes use the signed-in user's token and database policies. The publishable key is intentionally returned to the browser for sign-in and author image uploads.

`vercel.json` configures the build command (`npm run build`), static output (`dist`), the `/updates` routes, and the embed's iframe policy. If the imported project's dashboard has explicit build/output overrides, remove those overrides or align them with this configuration. The build copies the existing public site plus locally served, version-pinned editor/client libraries. Functions stay at the root `api/` directory for Vercel to deploy.

Deploy the changes, then sign in once at `https://justinrogo.vercel.app/updates`. In the Supabase SQL editor, grant publishing rights to **your account only**:

```sql
insert into public.updates_authors (user_id)
select id from auth.users where lower(email) = lower('YOUR-ACTUAL-EMAIL@example.com')
on conflict do nothing;
```

Confirm that one row was inserted. Reload the page. You should now see **Write an update**, **Drafts**, and **Comment queue**. Regular reader accounts do not get publishing permissions. If no row was inserted, confirm the user exists in Authentication and check the email address.

## 3. Add the Confluence widget

On a page in `https://uconn.atlassian.net`:

1. Edit the page and insert the **iFrame** macro (`/iframe`).
2. Set its URL to `https://justinrogo.vercel.app/updates/embed?limit=3&theme=light`.
3. Start with width **520 px**, height **480 px**, and scrolling set to **auto**. Use the macro's full-width layout if available. The iframe height is controlled by Confluence; it does not automatically resize across origins.
4. Publish the page. Each post title opens the full post in a new tab for reading/commenting. The widget itself does not require sign-in or browser storage.

Options: `limit=1` through `limit=5`; `theme=light`, `theme=dark`, or `theme=auto`. The default is three posts and a light background. Pinning affects the widget's order, as it does the full channel.

The embed's HTTP Content-Security-Policy allows only this site's own origin and `https://uconn.atlassian.net` as frame ancestors. Do not add `X-Frame-Options: SAMEORIGIN` globally in Vercel; that would conflict with cross-origin embedding. If another ancestor frame is involved, its actual origin must also be allowed. Confluence-side restrictions may require an administrator's help.

Atlassian's instructions: https://support.atlassian.com/confluence-cloud/docs/insert-the-iframe-macro/

## RSS and permanent links

- Main channel: `https://justinrogo.vercel.app/updates`
- Widget: `https://justinrogo.vercel.app/updates/embed`
- RSS 2.0: `https://justinrogo.vercel.app/updates/feed.xml`
- Post: `https://justinrogo.vercel.app/updates?post=POST-UUID`

The feed includes the newest 50 published posts in publication order, with stable identifiers, previews, and sanitized rich text. It excludes drafts and comments. RSS can be cached for up to 60 seconds. The widget fetches current posts when loaded; reload the Confluence page to refresh it.

## Local preview and checks

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://127.0.0.1:4388/updates?preview=1` for an explicitly labeled author preview. Use `/updates/embed?preview=1` for the widget preview. Preview post edits persist only in the current tab's session storage; preview comments stay in memory. Image uploads are available only after connecting a real Supabase project.

For a real local connection, copy `.env.example` to `.env.local`, enter the new project's URL and publishable key, and restart the server. Never commit `.env.local`.

```powershell
npm.cmd run test:updates
npm.cmd run build
```

Before using it with readers, verify with two real accounts: only the allowlisted author can publish/moderate; a reader can submit but not approve comments; signed-out visitors cannot read drafts or pending comments; images upload; the production RSS is valid; and the live widget appears in Confluence. Database policies and mail delivery require verification against the configured project.

GitHub Pages continues serving the existing site. It cannot run the new API; the navigation entry points to the Vercel channel. The existing GitHub Actions feed/Trello refreshes are independent of Vercel and are not replaced by this feature.
