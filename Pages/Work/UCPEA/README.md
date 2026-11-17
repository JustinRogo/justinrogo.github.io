# UCPEA Member Dashboard

The UCPEA Member Dashboard brings together the collective bargaining agreement, union updates, benefits guides, and member tools for the University of Connecticut Professional Employees Association. Approved members can read their Area’s Bulletin Board and opt in to push notifications. Area Stewards, UCPEA staff, and administrators use the same app to publish posts and review sign-ups within their roles.

The dashboard is an independent resource based on public UCPEA information. Confirm deadlines, eligibility, and governing language with UCPEA or the collective bargaining agreement. [Open the dashboard](https://justinrogo.github.io/Pages/Work/UCPEA/index.html) · [Official UCPEA website](https://ucpea.ct.aft.org/)

## What’s in the dashboard

| Page or tool | What you can do |
| --- | --- |
| **Overview** | See upcoming events, recent Union Wire news, and public Bulletin Board posts. Jump to common tasks, Rights & Benefits, the contract, or a member tool. |
| **Current contract** | Search the 2025–2029 collective bargaining agreement, jump to individual articles, and share links to provisions. The navigation shows **Contract history** and **Compare contracts** after sign-in. |
| **Rights & Benefits** | Search guides on workplace rights and benefits, including grievances, evaluation, professional development, childcare reimbursement, and leave. Use tools such as the holiday compensatory time tracker and save calendar reminders where offered. |
| **Salary & Band Planner** | Estimate the July 2027 increase, compare it with a salary band, and model a reclassification. You can also enter an optional discretionary merit award as a dollar amount. |
| **Bulletin Board** | Read notices, events, and flyers on the Union-wide and Area boards. Switch between Board and List layouts. Approved accounts can filter by board and show past posts. |
| **Committees** | Find the Executive Board and committee rosters, read what each committee does, and open the **Join a committee** interest form. |
| **Area Explorer** | Search by building, Area, or steward. Use the map and campus filters to identify an Area and find its steward. |
| **Calendar, Union Wire, and Document Library** | Browse union events and their details, catch up on UCPEA news and member guides, and search or filter links to forms and reference documents. |
| **Account menu** | Open **Help** for a five-stop walkthrough, switch **Dark mode** on or off, or adjust **Text size** from 80% to 120%. Light mode is the default. Approved accounts can also manage push notifications here. |

## Sign in and get approved

1. Open the account menu, select **Sign in**, then **Create an account** if you’re new. Enter your name and email and choose your Area. Use **Area Explorer** to find it or select **Not sure**.
2. Enter the one-time code sent by email. Signing in verifies access to your email and opens your account profile.
3. New accounts start **Waiting for approval**. You can use the public dashboard and update your name or requested Area in **Account** while you wait. A steward for the requested Area or UCPEA staff can review the sign-up.
4. Once approved, your Area assignments determine which members-only Area posts you can see. Staff manage changes to those assignments after approval. A **Paused** account retains access to public content and its own profile.

## What each role can do

**Member**, **Staff**, and **Administrator** are dashboard-wide roles. **Area Steward** is an assignment for a specific Area. A person can belong to multiple Areas and serve as a steward in some of them. Member-only and management actions require an approved account.

| Capability | Approved member | Area Steward | Staff | Administrator |
| --- | --- | --- | --- | --- |
| Read members-only Bulletin Board posts | Union-wide and assigned Areas | Union-wide and assigned Areas | All boards | All boards |
| Create drafts, publish, edit, remove posts, and notify subscribers | | Boards they steward | All boards | All boards |
| Open the **Members** roster | | Their stewarded Areas, including pending sign-ups requesting those Areas | All accounts | All accounts |
| Approve member sign-ups | | Into the applicant’s requested Area if they steward it | Across Areas, with a choice of Area | Across Areas, with a choice of Area |
| Review steward approvals and mark them as seen | | | Yes | Yes |
| Decline pending sign-ups, pause or reactivate accounts | | | Other member accounts | Other accounts, including staff and admins |
| Add or remove Area assignments and appoint or remove stewards | | | Yes, subject to database rules | Yes |
| Change a dashboard-wide role | | | | Other accounts |

### Members

- Use **Account** to view your status, role, and Area assignments or update your name.
- Open **Bulletin Board** to read public notices and members-only posts for the Union-wide board and your Areas. You can open an individual post to read the full details or flyer.
- On each device where you want alerts, open the account menu and turn on **Show notifications**. Choose **Send me a test** to confirm the device is receiving alerts.

### Area Stewards

- Open **Members**, then review **Waiting for approval**. You can approve applicants into the Area they requested when you steward that Area. Approval activates the account and adds the Area membership together.
- Use **Members in your areas** to look up the profiles you’re authorized to see. A steward’s account-management action is approving sign-ups for their Areas. Request broader account or assignment changes through staff.
- With **Show notifications** on, you get an alert when someone confirms their email and asks to join an Area you steward. Tapping it opens **Members**. The alert never shows the applicant’s name or email.
- Use **New post** on the Bulletin Board to publish to an Area you steward. Your posting permissions cover that Area’s board, including posts by its other stewards.
- A steward approval appears under **Approved by stewards** for staff. The member’s access is active as soon as the steward approves them.

### UCPEA staff

- Review sign-ups across Areas in **Members**. Choose the appropriate Area when approving. **Decline** puts the account into a paused state, which can be reviewed later.
- With **Show notifications** on, staff and admin devices get an alert when someone confirms their email and asks to join, whatever Area they chose. Stewards of the requested Area get the same alert. Tapping it opens **Members**. The alert never shows the applicant’s name or email. Each account sends one alert, and no more than ten go out per hour; requests beyond that still appear under **Waiting for approval**. [Sign-up alert setup](supabase/README.md#deploying-sign-up-alerts)
- Use **Manage** to add or remove Area memberships and switch an Area assignment between **Member** and **Steward**. Staff can appoint others as stewards. Self-appointment as a steward requires admin authority.
- Pause or reactivate member accounts and mark steward approvals as seen. When reactivating a declined account, review its Area assignments as part of the same workflow.
- Manage posts and alerts on the Union-wide board and on any Area board.

### Administrators

- Use the staff workflows for sign-ups, Area assignments, posts, and notifications across all boards.
- In **Members → Manage → Role**, change another account’s dashboard-wide role to **Member**, **UCPEA staff**, or **Administrator**. Administrator status is required to approve, decline, pause, or reactivate staff or admin accounts.
- Account status and dashboard-wide role changes apply to other accounts. First-admin setup and backend maintenance are covered in the [Supabase setup guide](supabase/README.md).

## Publish a post and send an alert

1. Open **Bulletin Board → New post** and choose an Area or the Union-wide board from the boards you manage. Enter a title and summary. Add details, an event time, a link, or a flyer as needed.
2. Under **Who can see it**, choose **Members of this board** or **Everyone, including people who aren’t signed in**. Add a flyer description if attaching an image or PDF. You can pin the post and set a take-down date, after which it moves to past posts.
3. Select **Save as draft** to keep working or **Publish** to make it visible to the chosen audience. A draft is visible to authorized posters. The Board layout can show an image flyer on its own while List still displays the text.
4. To alert members when publishing, select **Review notification after publishing** and confirm in the dialog. For an already published, current post, open it and select **Notify subscribers**. Review the audience and select **Send notification**. Keep the dialog open while devices are processed. If interrupted, reopen it and use **Resume send** when available.

Each Area alert targets subscribed devices belonging to approved members assigned to that Area. Union-wide alerts target subscribed devices across approved accounts. The alert has generic text and opens the post when tapped. Stewards can start one alert every five minutes. Each post has one send history, and the confirmation reports push-service acceptance rather than whether someone saw the alert. [Board notification setup](supabase/README.md#deploying-bulletin-board-notifications)

### Notifications on your device

Push requires a supported browser, an approved account, and permission on that device. On iPhone or iPad, add the dashboard to your Home Screen and open it from its icon before turning on **Show notifications**. To stop receiving alerts on the device, turn off the switch. Signing out also attempts to disconnect notifications on that device. The setting covers Area and Union-wide alerts, and for stewards, staff, and admins, sign-up alerts.

Use **Install** or your browser’s **Add to Home Screen** option to open the dashboard as an app when supported. Select **Update** if the dashboard offers a newer version.

## How it works

- **Frontend.** The dashboard is a static HTML, CSS, and JavaScript app published through GitHub Pages. Navigation uses shareable URLs such as `index.html?view=board`. The dashboard opens the contract tools and Area Explorer in embedded pages. [Dashboard markup](index.html) · [Routing](app.js) · [Embedded views](tool-views.js)
- **Accounts and permissions.** Supabase Auth sends email codes. Postgres stores profiles, Area assignments, posts, and subscriptions. Row-level security and database functions enforce access independently of what the interface displays. The contract files are part of the public static build. Sign-in controls whether the history and comparison links appear in navigation. [Profiles and roles](supabase/migrations/20261113000100_roles_and_profiles.sql) · [Board policies](supabase/migrations/20261113000200_bulletin_board.sql)
- **Flyers and push.** Supabase Storage uses separate public and members-only buckets. The app requests temporary links for protected flyers. Edge Functions check account access and handle test notifications, batched board alerts, and sign-up alerts to stewards and staff. [Backend setup and function deployment](supabase/README.md)
- **Public sources.** The Pages workflow refreshes the public UCPEA calendar and Union Wire snapshots. When a refresh fails, the build can use the saved snapshot. The Area Explorer uses the published map data and can fall back to the locations bundled in its page. [Calendar refresh](update-calendar.mjs) · [Union Wire refresh](update-union-wire.mjs) · [Pages workflow](../../../.github/workflows/deploy.yml)
- **Offline and device data.** The installable web app caches the dashboard and bundled resources with a service worker. The Board can show its last saved snapshot for the same account when offline. Sign-in, account management, posting, sending alerts, and external resources require a connection. Appearance and board layout preferences stay in the browser. The holiday time tracker saves entries in the browser only when you select **Remember on this browser**. [Manifest](manifest.webmanifest) · [Service worker](sw.js) · [Holiday tracker](member-rights.js)

## Local development and deployment

Use Node.js 22 or newer. From the repository root, build from the existing feed snapshots and serve the production output locally.

```sh
npm ci
npm run build -- --skip-feed
npm run preview
```

Open the [local dashboard](http://127.0.0.1:4391/Pages/Work/UCPEA/index.html). The preview serves `dist/` and uses the Supabase project configured in `account.js` for account and Board operations. Use test accounts or a separate Supabase project for write and notification checks. [Preview server](../../../scripts/preview-site.mjs)

Run the push and permission checks from the repository root.

```sh
node --test tests/ucpea-board-push.test.mjs tests/ucpea-push-permissions.test.mjs tests/ucpea-signup-push.test.mjs
```

The GitHub Pages workflow publishes the static build from `main` and runs feed refreshes on its configured schedule. Apply Supabase migrations and deploy Edge Functions separately when the backend changes. Update the service worker’s cache version when changing cached dashboard files and list new core assets in its precache manifest. [Pages workflow](../../../.github/workflows/deploy.yml) · [Supabase setup](supabase/README.md) · [Service worker](sw.js)
