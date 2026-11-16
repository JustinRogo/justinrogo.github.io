# UCPEA Supabase backend

Backend setup for UCPEA member accounts, area bulletin boards, flyer storage and
push notifications. The static site build excludes this folder.

## Files

| File | What it sets up |
|---|---|
| `migrations/20261113000100_roles_and_profiles.sql` | The 36 areas, member profiles, staff/admin roles, area member and steward roles, and the permission checks every other file relies on |
| `migrations/20261113000200_bulletin_board.sql` | Bulletin board posts (union-wide and per area, public or members-only, drafts) |
| `migrations/20261113000300_push_subscriptions.sql` | The devices each member has turned alerts on for |
| `migrations/20261113000400_board_storage.sql` | Two storage buckets for flyers (public and members-only) and who may upload or read them |
| `migrations/20261113000500_board_gifs.sql` | Lets the flyer buckets accept GIFs, which upload unchanged so they stay animated |
| `migrations/20261113000600_flyer_only_posts.sql` | Adds `flyer_only`: the corkboard shows just the flyer image, and clicking it opens the full post |
| `migrations/20261114000100_first_last_names.sql` | Stores first and last names separately (`first_name`, `last_name`). `display_name` is rebuilt from them automatically and is read-only to the app. Existing names are split at the last space |
| `migrations/20261115000100_push_test_rate_limit.sql` | Checks subscription ownership and limits each approved account to one test notification per minute |
| `functions/ucpea-push-test/index.ts` | Supplies the public VAPID key to approved members and sends a personal test to a subscription they own |
| `migrations/20261115000200_board_push.sql` | Tracks one notification send per published post and checks device eligibility before each batch |
| `functions/ucpea-board-push/index.ts` | Sends Bulletin Board notifications in batches using the same VAPID keys |
| `tests/rls_check.sql` | A permissions check that signs in as eight test accounts and tries allowed and forbidden actions |

## Who can do what

| | Signed out | Pending / suspended | Member | Area steward | Staff | Admin |
|---|---|---|---|---|---|---|
| Read public posts | Yes | Yes | Yes | Yes | Yes | Yes |
| Read union-wide member posts | | | Yes | Yes | Yes | Yes |
| Read own area's member posts | | | Yes | Yes | All areas | All areas |
| Post to own area's board | | | | Yes | All areas | All areas |
| Post to the union-wide board | | | | | Yes | Yes |
| See member profiles (name, email) | | Own | Own | Own + everyone in their areas | Everyone | Everyone |
| See pending sign-ups | | | | Those asking to join their areas | All | All |
| Edit member profiles | | Own name | Own name | Own name | Everyone's | Everyone's |
| Approve sign-ups | | | | For their areas (staff get an FYI) | Any, into any area | Any |
| Suspend members | | | | | Yes (not staff/admins) | Yes |
| Add people to areas, appoint stewards | | | | | Yes | Yes |
| Change member / staff / admin roles | | | | | | Yes (not own) |
| Turn on alerts | | | Yes | Yes | Yes | Yes |

New sign-ups start as **pending** and can see only public posts until someone
approves them.

**Approving** goes through one database function, `approve_signup`, which
activates the account and adds the person to their area in a single step:

```js
await supabase.rpc('approve_signup', { p_user: userId });              // into the area they asked for
await supabase.rpc('approve_signup', { p_user: userId, p_area: 12 });  // staff only: a different area
```

- **Stewards** can approve pending sign-ups that asked to join one of their
  areas, and only into that area.
- **Staff** can approve anyone pending, into any area.
- **Steward approvals are an FYI for staff**, not a to-do. They are marked
  `approved_via = 'steward'` and stay in staff's FYI list until a staff member
  sets `staff_acknowledged_at`. The member is fully active either way. To list them:

  ```js
  supabase.from('profiles').select('*')
    .eq('approved_via', 'steward').is('staff_acknowledged_at', null);
  ```

## Running it

1. In the Supabase dashboard, open **SQL Editor**.
2. Paste and run each file in `migrations/`, **in filename order**.
3. Paste and run `tests/rls_check.sql`. It always ends with an error message;
   that is how it undoes its test data. The message should say
   `69 passed, 0 failed`.
4. Make yourself the first admin. Sign up through the app (or **Authentication →
   Users → Add user**), then run, with your email:

   ```sql
   update public.profiles
   set role = 'admin', status = 'active'
   where email = 'you@example.com';
   ```

   Only the SQL editor (or a server using the service_role key) can do this;
   nobody can make themselves an admin from the app.

Later, these same files work with the Supabase CLI (`supabase link`, then
`supabase db push`). That is the easier route when the project moves to a
UCPEA-owned account.

## Keys

- The **project URL** and the **publishable / anon key** go in the website. They
  are public by design; the policies in these files are what protect the data.
- The **service_role / secret key** and the **VAPID private key** (for push) must
  never be committed or put in the website. They belong in Edge Function secrets.

## Deploying personal test notifications

1. Apply `20261113000300_push_subscriptions.sql` if it has not already been applied, then apply `20261115000100_push_test_rate_limit.sql` to the UCPEA Supabase project.
2. Generate a Web Push VAPID key pair once with `npx web-push@3.6.7 generate-vapid-keys`. In Supabase **Edge Functions → Secrets**, set `UCPEA_VAPID_PUBLIC_KEY`, `UCPEA_VAPID_PRIVATE_KEY`, and `UCPEA_VAPID_SUBJECT` (a `mailto:` address for the project operator). Keep using the same key pair while these subscriptions are active.
3. From `Pages/Work/UCPEA`, with the Supabase CLI signed into the UCPEA project, deploy the function:

   ```sh
   supabase functions deploy ucpea-push-test --project-ref <ucpea-project-ref> --no-verify-jwt
   ```

   The function verifies the caller’s Supabase access token itself with `auth.getUser()` and checks the member’s current status before issuing the public key or sending a test.
4. Publish the updated dashboard. Sign in as an approved test member in a supported browser, then open the header account menu, turn on **Show notifications**, and select **Send me a test**. Verify that tapping the alert opens Account, and that turning alerts off or signing out removes the device subscription. On iPhone or iPad, add the dashboard to the Home Screen and open it from its icon before enabling alerts.

## Deploying Bulletin Board notifications

1. Apply [`20261115000200_board_push.sql`](migrations/20261115000200_board_push.sql) in the UCPEA SQL Editor after the Bulletin Board and push subscription migrations. The new tables enable RLS and the sender RPCs are restricted to the service role.
2. From `Pages/Work/UCPEA`, deploy the Board function. It uses the three existing `UCPEA_VAPID_*` secrets and verifies the member's access token itself.

   ```sh
   supabase functions deploy ucpea-board-push --project-ref <ucpea-project-ref> --use-api --no-verify-jwt
   ```

3. Publish the updated dashboard to GitHub Pages. Before the first test, reopen the dashboard on the recipient devices so their service workers pick up the post link handler.
4. With subscribed test accounts in two areas, use **Notify subscribers** on a current area post. Verify that only the intended area's active subscribers receive it, that the alert contains generic text, and that tapping opens the post. Test a union-wide post with a staff or admin account.

Stewards can start one alert every five minutes. Each post has a single send history. Leave the confirmation dialog open to process all devices. If it is interrupted, reopen **Notify subscribers** and select **Resume send** for the remaining devices. An interrupted batch whose outcome is unknown is recorded as unconfirmed and excluded from retries. Counts distinguish push-service acceptance from devices that were skipped or whose send failed.

## Not built yet

- Per-area alert preferences (mute an area without turning alerts off).
- A steward roster screen. The data access is in place: stewards can read the
  profiles of everyone in their areas and of pending sign-ups asking to join.
- Declining a sign-up. Today a request that should not be approved just stays
  pending; staff can suspend it.
- Area discussion or comments.
