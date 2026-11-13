-- UCPEA: areas, member profiles, roles, and the helper functions every policy uses.
--
-- Role model
--   profiles.role     member | staff | admin   (union-wide; only admins change it)
--   profiles.status   pending | active | suspended   (staff approve sign-ups)
--   area_roles.role   member | steward          (per area; a person can hold several)
--
-- Nothing is readable or writable through the Data API unless a GRANT below allows it
-- AND a row-level security policy allows it. The project has "Automatically expose
-- new tables" turned off, so every table here grants access explicitly.

-- ---------------------------------------------------------------------------
-- Private schema for helper functions. It is not exposed through the Data API,
-- so these functions can be used by policies but cannot be called as endpoints.
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('member', 'staff', 'admin');
create type public.member_status as enum ('pending', 'active', 'suspended');
create type public.area_role as enum ('member', 'steward');

-- ---------------------------------------------------------------------------
-- Areas (seeded from the UCPEA Area Explorer map data, 2026-10-27)
-- ---------------------------------------------------------------------------
create table public.areas (
  id smallint primary key,
  name text not null,
  description text,
  is_active boolean not null default true
);

insert into public.areas (id, name, description) values
  (1, 'Area 1', 'College of Agriculture, Health, and Natural Resources (CAHNR), including members on the Storrs Campus and in Extension Offices throughout the state.'),
  (2, 'Area 2', 'Austin Building and in CLAS Shared Services.'),
  (3, 'Area 3', 'Rome Building supporting IT Student Life and Enrollment.'),
  (4, 'Area 4', 'Arjona Building, Budds Building, Gulley Hall, Hall Dormitory''s Veteran and Military Programs and Services Department, Hawley Armory, Monteith Building, and Herbst Hall.'),
  (5, 'Area 5', 'Beach Hall, the Benton Museum, Hall Dormitory, Koons Hall, Manchester Hall, Storrs Hall, and Wood Hall.'),
  (6, 'Area 6', 'ITS in Babbidge Library, Mobile Office Building, Public Safety, and Monteith on the Storrs campus and two buildings on the Depot Campus.'),
  (7, 'Area 7', 'Dodd Center for Human Rights, and UConn Library employees in the Babbidge Library.'),
  (8, 'Area 8', 'Science District in the Atwater Laboratory, Bio/Physics Building, Chemistry Building, Engineering Sciences Building, Pharmacy/Biology Building, and Torrey Life Sciences.'),
  (9, 'Area 9', 'Burton Family Football Complex, Fieldhouse, Gampel Pavillion, Ice Rink, the Kinesiology department, and the Student Recreation Center.'),
  (10, 'Area 10', 'Wilbur Cross Building and the Werth Institute.'),
  (11, 'Area 11', 'Student Health and Wellness (SHaW) in the Arjona Building, Nellie Wilson Hall (South Campus Dorms), and Williams Health Services.'),
  (12, 'Area 12', 'Facilities Operations, UPDC in the Central Warehouse, 28 Professional Park Building and the Public Safety Building.'),
  (13, 'Area 13', 'Bousfield Building, Enrichment Programs, Institute for Student Success, International Student and Scholar Services Building, and the John Rowe Building.'),
  (14, 'Area 14', 'School of Social Work in Hartford and supporting the Innovations Institute.'),
  (16, 'Area 16', 'Connecticut Education Network (CEN) in East Hartford.'),
  (17, 'Area 17', 'Student Union and the Jorgensen Center for the Performing Arts.'),
  (18, 'Area 18', 'Lakeside and the Visitor Center and supporting University Communications.'),
  (19, 'Area 19', 'Family Studies Building, Human Development and Family Sciences department, and Speech Language and Hearing Sciences department.'),
  (20, 'Area 20', 'UConn Law School Campus in the Law Library, Chase Hall, and Hosmer Hall. These employees support the Law School, the Financial Aid office and the Law Library and Technology group.'),
  (21, 'Area 21', 'Hartford Campus, the Hartford Library, and the Health Center.'),
  (22, 'Area 22', 'Avery Point Campus who provide support to the campus including the Marine Sciences Building and the Sea Grant College Program.'),
  (23, 'Area 23', 'Stamford Campus.'),
  (24, 'Area 24', 'Waterbury Campus.'),
  (28, 'Area 28', 'College of Engineering at the Bronwell Building, Castleman Building, ITEB Building, and the Pratt and Whitney Building.'),
  (29, 'Area 29', 'Whetten Graduate Center.'),
  (30, 'Area 30', 'School of Business.'),
  (31, 'Area 31', 'Depot Campus supporting the Center for Open Research Resources and Equipment, Clean Energy Engineering Center, CT Transportation Institute, the Fire Marshal and Building Inspector, and Human Resources department.'),
  (33, 'Area 33', 'Residential Life with a main office in Holcomb Hall.'),
  (34, 'Area 34', 'Science 1 and Gant South supporting Material Science and Engineering, the Materials Science Institute and Physics.'),
  (35, 'Area 35', 'Tasker Building supporting Admissions.'),
  (36, 'Area 36', 'Dining Services professionals headquartered in Towers Wade Hall.'),
  (37, 'Area 37', 'Horsebarn Hill Locations including Institute of the Environment Building, the Kinesiology Building and the Environmental Health and Safety (EHS) Building and supporting Environmental Health and Safety, Environmental Science and Engineering Center, Kinesio'),
  (38, 'Area 38', 'Procurement Services at the New Central Warehouse, and those working in the Innovation Partnership Building.'),
  (39, 'Area 39', 'School of Fine Arts'),
  (40, 'Area 40', 'McMahon Hall supporting University Events and Conference Services, and in Ryan Hall supporting InCHIP.'),
  (41, 'Area 41', 'Gentry Building supporting Education Curriculum and Instruction, Education, Educational Leadership and Educational Psychology.');

-- ---------------------------------------------------------------------------
-- Profiles: one row per sign-in account, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '' check (char_length(display_name) <= 80),
  role public.user_role not null default 'member',
  status public.member_status not null default 'pending',
  -- The area a new member says they belong to. Staff confirm it by adding an
  -- area_roles row; this column alone grants nothing.
  requested_area_id smallint references public.areas (id) on delete set null,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  -- 'steward' approvals show up for staff as an FYI until a staff member
  -- marks them seen (staff_acknowledged_at). Staff approvals need no FYI.
  approved_via text check (approved_via in ('staff', 'steward')),
  staff_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_status_idx on public.profiles (status);
create index profiles_steward_fyi_idx on public.profiles (approved_at)
  where approved_via = 'steward' and staff_acknowledged_at is null;

-- ---------------------------------------------------------------------------
-- Area roles: which areas a person belongs to, and where they are a steward.
-- ---------------------------------------------------------------------------
create table public.area_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  area_id smallint not null references public.areas (id) on delete cascade,
  role public.area_role not null default 'member',
  granted_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, area_id)
);

create index area_roles_area_id_idx on public.area_roles (area_id);

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so they can read profiles/area_roles
-- without tripping those tables' own policies (which would recurse).
-- Every check requires an ACTIVE account: pending and suspended users get nothing.
-- ---------------------------------------------------------------------------
create or replace function private.is_active()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
  );
$$;

create or replace function private.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
      and p.role in ('staff', 'admin')
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
      and p.role = 'admin'
  );
$$;

create or replace function private.is_member_of(p_area smallint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.area_roles ar
    join public.profiles p on p.id = ar.user_id
    where ar.user_id = (select auth.uid()) and ar.area_id = p_area
      and p.status = 'active'
  );
$$;

create or replace function private.is_steward_of(p_area smallint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.area_roles ar
    join public.profiles p on p.id = ar.user_id
    where ar.user_id = (select auth.uid()) and ar.area_id = p_area
      and ar.role = 'steward' and p.status = 'active'
  );
$$;

-- Who may post to a board: staff/admin anywhere; stewards in their own areas.
-- A null area means the union-wide board, which is staff-only.
create or replace function private.can_post_to(p_area smallint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.is_staff()
      or (p_area is not null and private.is_steward_of(p_area));
$$;

-- Is this person in one of the current user's steward areas, or a pending
-- sign-up asking to join one? Lets stewards see the profiles (name and email)
-- of their members, and of new sign-ups they can vouch for.
create or replace function private.is_steward_for_user(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.area_roles theirs
    where theirs.user_id = p_user
      and private.is_steward_of(theirs.area_id)
  )
  or exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.status = 'pending'
      and p.requested_area_id is not null
      and private.is_steward_of(p.requested_area_id)
  );
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.is_active(),
  private.is_staff(),
  private.is_admin(),
  private.is_member_of(smallint),
  private.is_steward_of(smallint),
  private.can_post_to(smallint),
  private.is_steward_for_user(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- New sign-ups get a pending profile. raw_user_meta_data is supplied by the
-- user at sign-up, so it is only trusted for a display name and an area *request*.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_area smallint;
begin
  begin
    v_area := nullif(new.raw_user_meta_data ->> 'requested_area_id', '')::smallint;
  exception when others then
    v_area := null;
  end;
  if v_area is not null and not exists (select 1 from public.areas a where a.id = v_area) then
    v_area := null;
  end if;

  insert into public.profiles (id, email, display_name, requested_area_id)
  values (
    new.id,
    new.email,
    left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80),
    v_area
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Keep profiles.email in step when someone changes their sign-in email.
create or replace function private.sync_user_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_user_email();

-- ---------------------------------------------------------------------------
-- Profile update rules. RLS decides WHICH rows someone may update; this trigger
-- decides WHICH CHANGES they may make, so nobody can promote or approve themselves.
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user then tells us whether the update
-- came straight from the app ('authenticated') or from trusted database code.
create or replace function private.guard_profile_update()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_is_self boolean := (v_actor = old.id);
begin
  new.updated_at := now();

  -- Trusted callers: the dashboard SQL editor, a server using the service_role
  -- key (no end-user session), or this schema's own SECURITY DEFINER functions
  -- such as approve_signup(), which do their own permission checks.
  if v_actor is null or current_user not in ('authenticated', 'anon') then
    if new.status = 'active' and old.status is distinct from 'active'
       and new.approved_at is not distinct from old.approved_at then
      new.approved_at := now();
    end if;
    return new;
  end if;

  if new.staff_acknowledged_at is distinct from old.staff_acknowledged_at
     and not private.is_staff() then
    raise exception 'Only staff can mark approvals as seen.';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Email is managed by sign-in settings, not the profile.';
  end if;

  if new.role is distinct from old.role then
    if not private.is_admin() then
      raise exception 'Only admins can change roles.';
    end if;
    if v_is_self then
      raise exception 'Admins cannot change their own role.';
    end if;
  end if;

  if new.status is distinct from old.status then
    if v_is_self then
      raise exception 'You cannot change your own account status.';
    end if;
    if not private.is_staff() then
      raise exception 'Only staff can approve or suspend accounts.';
    end if;
    if old.role in ('staff', 'admin') and not private.is_admin() then
      raise exception 'Only admins can change the status of staff or admin accounts.';
    end if;
    if new.status = 'active' then
      new.approved_at := now();
      new.approved_by := v_actor;
      new.approved_via := 'staff';
      new.staff_acknowledged_at := now();
    end if;
  end if;

  if new.requested_area_id is distinct from old.requested_area_id
     and not private.is_staff()
     and not (v_is_self and old.status = 'pending') then
    raise exception 'Your area can only be changed by staff once your account is approved.';
  end if;

  if new.display_name is distinct from old.display_name
     and not v_is_self and not private.is_staff() then
    raise exception 'You cannot change someone else''s name.';
  end if;

  return new;
end;
$$;

create trigger guard_profile_update
  before update on public.profiles
  for each row execute function private.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Approving a sign-up: one call that activates the account AND adds them to
-- their area, so the two can never get out of step.
--   Stewards: only pending members who asked for one of their areas.
--             These approvals are flagged for staff as an FYI.
--   Staff:    any pending member, into any area (or none).
-- App usage: supabase.rpc('approve_signup', { p_user: id })
--            supabase.rpc('approve_signup', { p_user: id, p_area: 12 })  -- staff
-- ---------------------------------------------------------------------------
create or replace function public.approve_signup(p_user uuid, p_area smallint default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_is_staff boolean := private.is_staff();
  v_target public.profiles;
  v_area smallint;
begin
  if v_actor is null or not private.is_active() then
    raise exception 'Only approved members can approve sign-ups.';
  end if;

  select * into v_target from public.profiles where id = p_user for update;
  if not found or v_target.status <> 'pending' then
    raise exception 'That account is not waiting for approval.';
  end if;
  if p_user = v_actor then
    raise exception 'You cannot approve yourself.';
  end if;
  if v_target.role <> 'member' and not private.is_admin() then
    raise exception 'Only admins can approve staff or admin accounts.';
  end if;

  v_area := coalesce(p_area, v_target.requested_area_id);

  if not v_is_staff
     and (v_area is null
          or v_area is distinct from v_target.requested_area_id
          or not private.is_steward_of(v_area)) then
    raise exception 'Stewards can only approve sign-ups for their own areas.';
  end if;

  update public.profiles
     set status = 'active',
         requested_area_id = coalesce(v_area, requested_area_id),
         approved_at = now(),
         approved_by = v_actor,
         approved_via = case when v_is_staff then 'staff' else 'steward' end,
         staff_acknowledged_at = case when v_is_staff then now() else null end
   where id = p_user;

  if v_area is not null then
    insert into public.area_roles (user_id, area_id, role, granted_by)
    values (p_user, v_area, 'member', v_actor)
    on conflict (user_id, area_id) do nothing;
  end if;
end;
$$;

revoke all on function public.approve_signup(uuid, smallint) from public, anon;
grant execute on function public.approve_signup(uuid, smallint) to authenticated;

-- Area role changes: staff only (enforced by policy below). Stewards cannot
-- promote anyone, and nobody can grant themselves a steward role.
create or replace function private.guard_area_role_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and tg_op in ('INSERT', 'UPDATE')
     and new.user_id = (select auth.uid())
     and new.role = 'steward'
     and not private.is_admin() then
    raise exception 'Only an admin can make you a steward.';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger guard_area_role_change
  before insert or update on public.area_roles
  for each row execute function private.guard_area_role_change();

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.areas enable row level security;
alter table public.profiles enable row level security;
alter table public.area_roles enable row level security;

-- Areas: the list is public (the sign-up form needs it); admins maintain it.
create policy "Anyone can read areas"
  on public.areas for select to anon, authenticated
  using (true);

create policy "Admins manage areas"
  on public.areas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Profiles: you see yourself; stewards see everyone in their areas; staff see everyone.
-- Seeing is not editing: stewards cannot change their members' profiles.
create policy "Read own, own areas' as steward, or all as staff"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_staff())
    or private.is_steward_for_user(id)
  );

create policy "Update own profile or any as staff"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()))
  with check (id = (select auth.uid()) or (select private.is_staff()));

-- Area roles: you see your own; stewards see their area; staff see and manage all.
create policy "Read own, own area as steward, or all as staff"
  on public.area_roles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_staff())
    or private.is_steward_of(area_id)
  );

create policy "Staff add area roles"
  on public.area_roles for insert to authenticated
  with check ((select private.is_staff()));

create policy "Staff change area roles"
  on public.area_roles for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

create policy "Staff remove area roles"
  on public.area_roles for delete to authenticated
  using ((select private.is_staff()));

-- ---------------------------------------------------------------------------
-- Grants (required because new tables are not exposed automatically)
-- ---------------------------------------------------------------------------
grant select on public.areas to anon, authenticated;
grant insert, update, delete on public.areas to authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, requested_area_id, role, status, staff_acknowledged_at)
  on public.profiles to authenticated;

grant select, delete on public.area_roles to authenticated;
grant insert (user_id, area_id, role) on public.area_roles to authenticated;
grant update (role) on public.area_roles to authenticated;

grant all on public.areas, public.profiles, public.area_roles to service_role;
