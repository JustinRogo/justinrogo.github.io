-- UCPEA permissions check. Run in the Supabase SQL editor AFTER the migrations.
--
-- It creates eight throwaway accounts (admin, staff, an Area 7 steward, an Area 7
-- member, an Area 3 member, and three sign-ups), then signs in as each one
-- and tries what they should and should not be able to do.
--
-- It ALWAYS finishes by raising an error that holds the report. That is on
-- purpose: the error rolls back everything the test created, so nothing is
-- left in your database. Look for "N passed, 0 failed".

do $test$
declare
  v_admin    constant uuid := '00000000-0000-4000-a000-000000000001';
  v_staff    constant uuid := '00000000-0000-4000-a000-000000000002';
  v_steward7 constant uuid := '00000000-0000-4000-a000-000000000003';
  v_member7  constant uuid := '00000000-0000-4000-a000-000000000004';
  v_member3  constant uuid := '00000000-0000-4000-a000-000000000005';
  v_pending  constant uuid := '00000000-0000-4000-a000-000000000006';
  v_wants7   constant uuid := '00000000-0000-4000-a000-000000000007';
  v_wants3   constant uuid := '00000000-0000-4000-a000-000000000008';
  c record;
  n bigint;
  v_outcome text;
  v_pass int := 0;
  v_fail int := 0;
  v_report text := '';
begin
  -- ----- Setup (as the database owner) -----------------------------------
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (v_admin,    'authenticated', 'authenticated', 'rls-admin@ucpea.test',    '{"display_name":"Test Admin"}'),
    (v_staff,    'authenticated', 'authenticated', 'rls-staff@ucpea.test',    '{"display_name":"Test Staff"}'),
    (v_steward7, 'authenticated', 'authenticated', 'rls-steward7@ucpea.test', '{"display_name":"Test Steward"}'),
    (v_member7,  'authenticated', 'authenticated', 'rls-member7@ucpea.test',  '{"display_name":"Test Member 7"}'),
    (v_member3,  'authenticated', 'authenticated', 'rls-member3@ucpea.test',  '{"requested_area_id":"abc"}'),
    (v_pending,  'authenticated', 'authenticated', 'rls-pending@ucpea.test',  '{"display_name":"Test Pending","requested_area_id":"7"}'),
    (v_wants7,   'authenticated', 'authenticated', 'rls-wants7@ucpea.test',   '{"display_name":"Wants Area 7","requested_area_id":"7"}'),
    (v_wants3,   'authenticated', 'authenticated', 'rls-wants3@ucpea.test',   '{"display_name":"Wants Area 3","requested_area_id":"3"}');

  update public.profiles set status = 'active', role = 'admin' where id = v_admin;
  update public.profiles set status = 'active', role = 'staff' where id = v_staff;
  update public.profiles set status = 'active' where id in (v_steward7, v_member7, v_member3);

  insert into public.area_roles (user_id, area_id, role) values
    (v_steward7, 7, 'steward'),
    (v_member7, 7, 'member'),
    (v_member3, 3, 'member');

  insert into public.posts (area_id, author_id, title, summary, visibility, status) values
    (null, v_staff,    'Union public',    'Visible to everyone',        'public',  'published'),
    (null, v_staff,    'Union members',   'Visible to active members',  'members', 'published'),
    (7,    v_steward7, 'Area 7 members',  'Visible to Area 7',          'members', 'published'),
    (3,    v_staff,    'Area 3 members',  'Visible to Area 3',          'members', 'published'),
    (7,    v_steward7, 'Area 7 draft',    'Visible to Area 7 posters',  'members', 'draft');

  -- ----- Checks ----------------------------------------------------------
  -- kind: count   -> query returns a number that must equal expected
  --       rows    -> statement must affect exactly expected rows
  --       blocked -> statement must fail
  for c in
    select * from (values
      ( 1, 'Sign-up keeps a valid requested area',            'postgres', 'count',   format('select count(*) from public.profiles where id = %L and requested_area_id = 7 and status = ''pending''', v_pending), 1),
      ( 2, 'Sign-up ignores an invalid requested area',       'postgres', 'count',   format('select count(*) from public.profiles where id = %L and requested_area_id is null', v_member3), 1),
      ( 3, 'Signed out: sees only public posts',              'anon',     'count',   'select count(*) from public.posts', 1),
      ( 4, 'Signed out: can read the area list',              'anon',     'count',   'select count(*) from public.areas', 36),
      ( 5, 'Signed out: cannot read profiles',                'anon',     'blocked', 'select count(*) from public.profiles', null),
      ( 6, 'Signed out: cannot read push subscriptions',      'anon',     'blocked', 'select count(*) from public.push_subscriptions', null),
      ( 7, 'Signed out: cannot register for push',            'anon',     'blocked', 'select public.register_push_subscription(''https://push.example/anon'', ''k'', ''a'')', null),
      ( 8, 'Pending: sees only public posts',                 v_pending::text,  'count',   'select count(*) from public.posts', 1),
      ( 9, 'Pending: can change requested area',              v_pending::text,  'rows',    format('update public.profiles set requested_area_id = 3 where id = %L', v_pending), 1),
      (10, 'Pending: cannot approve self',                    v_pending::text,  'blocked', format('update public.profiles set status = ''active'' where id = %L', v_pending), null),
      (11, 'Pending: cannot turn on alerts',                  v_pending::text,  'blocked', 'select public.register_push_subscription(''https://push.example/p'', ''k'', ''a'')', null),
      (12, 'Member 7: sees public, union and Area 7 posts',   v_member7::text,  'count',   'select count(*) from public.posts', 3),
      (13, 'Member 7: sees only own profile',                 v_member7::text,  'count',   'select count(*) from public.profiles', 1),
      (14, 'Member 7: cannot make self admin',                v_member7::text,  'blocked', format('update public.profiles set role = ''admin'' where id = %L', v_member7), null),
      (15, 'Member 7: cannot rename someone else',            v_member7::text,  'rows',    format('update public.profiles set display_name = ''x'' where id = %L', v_member3), 0),
      (16, 'Member 7: cannot move self to another area',      v_member7::text,  'blocked', format('update public.profiles set requested_area_id = 3 where id = %L', v_member7), null),
      (17, 'Member 7: cannot post to Area 7',                 v_member7::text,  'blocked', 'insert into public.posts (area_id, title, summary) values (7, ''t'', ''s'')', null),
      (18, 'Member 7: cannot make self steward',              v_member7::text,  'blocked', format('insert into public.area_roles (user_id, area_id, role) values (%L, 9, ''steward'')', v_member7), null),
      (19, 'Member 7: can turn on alerts',                    v_member7::text,  'count',   'select count(*) from (select public.register_push_subscription(''https://push.example/shared'', ''k'', ''a'')) s', 1),
      (20, 'Member 3: sees public, union and Area 3 posts',   v_member3::text,  'count',   'select count(*) from public.posts', 3),
      (21, 'Member 3: can take over a shared device',         v_member3::text,  'count',   'select count(*) from (select public.register_push_subscription(''https://push.example/shared'', ''k2'', ''a2'')) s', 1),
      (22, 'Member 7: lost the shared device subscription',   v_member7::text,  'count',   'select count(*) from public.push_subscriptions', 0),
      (23, 'Member 3: owns the shared device subscription',   v_member3::text,  'count',   'select count(*) from public.push_subscriptions', 1),
      (24, 'Steward 7: also sees Area 7 drafts',              v_steward7::text, 'count',   'select count(*) from public.posts', 4),
      (25, 'Steward 7: can post to Area 7',                   v_steward7::text, 'rows',    'insert into public.posts (area_id, title, summary, status) values (7, ''Steward post'', ''Summary'', ''published'')', 1),
      (26, 'Steward 7: cannot post to Area 3',                v_steward7::text, 'blocked', 'insert into public.posts (area_id, title, summary) values (3, ''t'', ''s'')', null),
      (27, 'Steward 7: cannot post union-wide',               v_steward7::text, 'blocked', 'insert into public.posts (area_id, title, summary) values (null, ''t'', ''s'')', null),
      (28, 'Steward 7: cannot edit Area 3 posts',             v_steward7::text, 'rows',    'update public.posts set pinned = true where area_id = 3', 0),
      (29, 'Steward 7: cannot change a post''s author',       v_steward7::text, 'blocked', format('update public.posts set author_id = %L where area_id = 7', v_member7), null),
      (30, 'Steward 7: sees Area 7 roster rows only',         v_steward7::text, 'count',   'select count(*) from public.area_roles', 2),
      (31, 'Steward 7: cannot promote members',               v_steward7::text, 'rows',    format('update public.area_roles set role = ''steward'' where user_id = %L', v_member7), 0),
      (32, 'Steward 7: flyer folders 7 yes, 3 and union no',  v_steward7::text, 'count',   'select count(*) where private.can_post_to_folder(''7'') and not private.can_post_to_folder(''3'') and not private.can_post_to_folder(''union'')', 1),
      (33, 'Staff: sees every post',                          v_staff::text,    'count',   'select count(*) from public.posts', 6),
      (34, 'Staff: can approve a pending member',             v_staff::text,    'rows',    format('update public.profiles set status = ''active'' where id = %L', v_pending), 1),
      (35, 'Approval records who approved and when',          'postgres',       'count',   format('select count(*) from public.profiles where id = %L and approved_by = %L and approved_at is not null', v_pending, v_staff), 1),
      (36, 'Staff: can add someone to an area',               v_staff::text,    'rows',    format('insert into public.area_roles (user_id, area_id, role) values (%L, 7, ''member'')', v_pending), 1),
      (37, 'Staff: cannot change roles',                      v_staff::text,    'blocked', format('update public.profiles set role = ''staff'' where id = %L', v_member7), null),
      (38, 'Staff: can suspend a member',                     v_staff::text,    'rows',    format('update public.profiles set status = ''suspended'' where id = %L', v_member3), 1),
      (39, 'Suspended: sees only public posts',               v_member3::text,  'count',   'select count(*) from public.posts', 1),
      (40, 'Admin: can make a member staff',                  v_admin::text,    'rows',    format('update public.profiles set role = ''staff'' where id = %L', v_member7), 1),
      (41, 'Admin: cannot change own role',                   v_admin::text,    'blocked', format('update public.profiles set role = ''member'' where id = %L', v_admin), null),
      (42, 'New staff: cannot suspend an admin',              v_member7::text,  'blocked', format('update public.profiles set status = ''suspended'' where id = %L', v_admin), null),
      -- By now Area 7 holds the steward, member 7 and the newly approved member,
      -- and one sign-up is still waiting to join Area 7.
      (43, 'Steward 7: sees Area 7 members and sign-ups',     v_steward7::text, 'count',   'select count(*) from public.profiles', 4),
      (44, 'Steward 7: cannot see an Area 3 member',          v_steward7::text, 'count',   format('select count(*) from public.profiles where id = %L', v_member3), 0),
      (45, 'Steward 7: cannot edit Area 7 members'' profiles', v_steward7::text, 'rows',    format('update public.profiles set display_name = ''x'' where id = %L', v_pending), 0),
      (46, 'Steward 7: sees a sign-up asking for Area 7',     v_steward7::text, 'count',   format('select count(*) from public.profiles where id = %L', v_wants7), 1),
      (47, 'Steward 7: cannot see a sign-up for Area 3',      v_steward7::text, 'count',   format('select count(*) from public.profiles where id = %L', v_wants3), 0),
      (48, 'Steward 7: cannot approve a sign-up',             v_steward7::text, 'rows',    format('update public.profiles set status = ''active'' where id = %L', v_wants7), 0),
      (49, 'Staff: sees all eight accounts',                  v_staff::text,    'count',   'select count(*) from public.profiles where email like ''rls-%@ucpea.test''', 8),
      -- Approving sign-ups through approve_signup()
      (50, 'Steward 7: cannot approve an Area 3 sign-up',     v_steward7::text, 'blocked', format('select public.approve_signup(%L)', v_wants3), null),
      (51, 'Steward 7: cannot approve into another area',     v_steward7::text, 'blocked', format('select public.approve_signup(%L, 3::smallint)', v_wants7), null),
      (52, 'Member: cannot approve a sign-up',                v_pending::text,  'blocked', format('select public.approve_signup(%L)', v_wants7), null),
      (53, 'Steward 7: can approve an Area 7 sign-up',        v_steward7::text, 'count',   format('select count(*) from (select public.approve_signup(%L)) s', v_wants7), 1),
      (54, 'Steward approval adds them to Area 7',            'postgres',       'count',   format('select count(*) from public.area_roles where user_id = %L and area_id = 7 and role = ''member''', v_wants7), 1),
      (55, 'Steward approval is flagged for staff',           'postgres',       'count',   format('select count(*) from public.profiles where id = %L and status = ''active'' and approved_via = ''steward'' and approved_by = %L and staff_acknowledged_at is null', v_wants7, v_steward7), 1),
      (56, 'Steward 7: cannot approve someone twice',         v_steward7::text, 'blocked', format('select public.approve_signup(%L)', v_wants7), null),
      (57, 'Staff: sees the steward approval FYI',            v_staff::text,    'count',   'select count(*) from public.profiles where approved_via = ''steward'' and staff_acknowledged_at is null and email like ''rls-%@ucpea.test''', 1),
      (58, 'Steward 7: cannot dismiss the FYI',               v_steward7::text, 'rows',    format('update public.profiles set staff_acknowledged_at = now() where id = %L', v_wants7), 0),
      (59, 'Member: cannot change the FYI flag on self',      v_pending::text,  'blocked', format('update public.profiles set staff_acknowledged_at = null where id = %L', v_pending), null),
      (60, 'Staff: can mark the FYI as seen',                 v_staff::text,    'rows',    format('update public.profiles set staff_acknowledged_at = now() where id = %L', v_wants7), 1),
      (61, 'Staff approvals need no FYI',                     'postgres',       'count',   format('select count(*) from public.profiles where id = %L and approved_via = ''staff'' and staff_acknowledged_at is not null', v_pending), 1),
      (62, 'Staff: can approve into a chosen area',           v_staff::text,    'count',   format('select count(*) from (select public.approve_signup(%L, 9::smallint)) s', v_wants3), 1),
      (63, 'Staff approval lands in the chosen area',         'postgres',       'count',   format('select count(*) from public.area_roles where user_id = %L and area_id = 9', v_wants3), 1),
      (64, 'Signed out: cannot approve sign-ups',             'anon',           'blocked', format('select public.approve_signup(%L)', v_pending), null)
    ) as t(ord, label, actor, kind, query, expected)
    order by ord
  loop
    if c.actor = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true);
      perform set_config('role', 'anon', true);
    elsif c.actor <> 'postgres' then
      perform set_config('request.jwt.claims',
        json_build_object('sub', c.actor, 'role', 'authenticated')::text, true);
      perform set_config('role', 'authenticated', true);
    end if;

    begin
      n := null;
      if c.kind = 'count' then
        execute c.query into n;
      else
        execute c.query;
        get diagnostics n = row_count;
      end if;
      v_outcome := case
        when c.kind = 'blocked' then 'FAIL (was allowed)'
        when n = c.expected then 'ok'
        else format('FAIL (got %s, expected %s)', n, c.expected)
      end;
    exception when others then
      v_outcome := case when c.kind = 'blocked' then 'ok'
                        else 'FAIL (error: ' || sqlerrm || ')' end;
    end;

    perform set_config('role', 'none', true);
    perform set_config('request.jwt.claims', '', true);

    if v_outcome = 'ok' then v_pass := v_pass + 1; else v_fail := v_fail + 1; end if;
    v_report := v_report || format(E'\n%s. %s: %s', c.ord, c.label, v_outcome);
  end loop;

  raise exception '%', format(
    E'UCPEA permissions check: %s passed, %s failed. (Test data rolled back.)%s',
    v_pass, v_fail, v_report);
end
$test$;
