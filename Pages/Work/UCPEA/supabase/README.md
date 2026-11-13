# UCPEA Supabase backend

Database setup for UCPEA member accounts, area bulletin boards, flyer storage and
push notification sign-ups. None of these files are published to the website:
the site build skips `.sql` and `.md` files.

## Files

| File | What it sets up |
|---|---|
| `migrations/20261113000100_roles_and_profiles.sql` | The 36 areas, member profiles, staff/admin roles, area member and steward roles, and the permission checks every other file relies on |
| `migrations/20261113000200_bulletin_board.sql` | Bulletin board posts (union-wide and per area, public or members-only, drafts) |
| `migrations/20261113000300_push_subscriptions.sql` | The devices each member has turned alerts on for |
| `migrations/20261113000400_board_storage.sql` | Two storage buckets for flyers (public and members-only) and who may upload or read them |
| `migrations/20261113000500_board_gifs.sql` | Lets the flyer buckets accept GIFs, which upload unchanged so they stay animated |
| `migrations/20261113000600_flyer_only_posts.sql` | Adds `flyer_only`: the corkboard shows just the flyer image, and clicking it opens the full post |
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
   `64 passed, 0 failed`.
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

## Not built yet

- The website side: sign-in screens, the board UI, the approval screens and
  the staff FYI list.
- The Edge Function that sends push notifications, with per-steward rate limits.
- Per-area alert preferences (mute an area without turning alerts off).
- A steward roster screen. The data access is in place: stewards can read the
  profiles of everyone in their areas and of pending sign-ups asking to join.
- Declining a sign-up. Today a request that should not be approved just stays
  pending; staff can suspend it.
- Area discussion or comments.
