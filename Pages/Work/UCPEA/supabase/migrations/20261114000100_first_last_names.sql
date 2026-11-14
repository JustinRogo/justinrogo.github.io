-- UCPEA: first and last names are stored separately.
--
-- profiles.first_name and profiles.last_name are what people enter and edit.
-- profiles.display_name stays as the combined "First Last" that the member list
-- and account screens already read; a trigger rebuilds it from the two parts,
-- so the app no longer writes it directly.
--
-- Run after 20261113000100_roles_and_profiles.sql.

-- ---------------------------------------------------------------------------
-- Splitting one full name into two parts, for names entered before this change
-- and for sign-ups from a page that still sends one name. The last word becomes
-- the last name ("Mary Ann Smith" -> "Mary Ann" / "Smith"); a one-word name is
-- kept as the first name. Members can correct theirs on the Account page.
-- ---------------------------------------------------------------------------
create or replace function private.split_full_name(p_name text, out first_name text, out last_name text)
language plpgsql immutable set search_path = ''
as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if position(' ' in v_name) > 0 then
    first_name := left(regexp_replace(v_name, ' \S+$', ''), 50);
    last_name := left(substring(v_name from '\S+$'), 50);
  else
    first_name := left(v_name, 50);
    last_name := '';
  end if;
end;
$$;

revoke all on function private.split_full_name(text) from public;

-- ---------------------------------------------------------------------------
-- Columns, filled from the names already on file.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column first_name text not null default '' check (char_length(first_name) <= 50),
  add column last_name text not null default '' check (char_length(last_name) <= 50);

update public.profiles
   set (first_name, last_name) = (
         select s.first_name, s.last_name from private.split_full_name(display_name) s
       )
 where display_name <> '';

-- ---------------------------------------------------------------------------
-- display_name always follows the two parts. This runs before
-- guard_profile_update (triggers fire in name order), so that trigger still
-- stops anyone renaming someone else.
-- ---------------------------------------------------------------------------
create or replace function private.compose_display_name()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.first_name := left(btrim(regexp_replace(coalesce(new.first_name, ''), '\s+', ' ', 'g')), 50);
  new.last_name := left(btrim(regexp_replace(coalesce(new.last_name, ''), '\s+', ' ', 'g')), 50);
  new.display_name := left(btrim(new.first_name || ' ' || new.last_name), 80);
  return new;
end;
$$;

revoke all on function private.compose_display_name() from public;

create trigger compose_display_name
  before insert or update on public.profiles
  for each row execute function private.compose_display_name();

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

  if (new.first_name is distinct from old.first_name
      or new.last_name is distinct from old.last_name
      or new.display_name is distinct from old.display_name)
     and not v_is_self and not private.is_staff() then
    raise exception 'You cannot change someone else''s name.';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- New sign-ups: read first_name and last_name from the sign-up details. A
-- page cached from before this change sends only display_name; split that.
-- ---------------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_area smallint;
  v_first text := btrim(coalesce(new.raw_user_meta_data ->> 'first_name', ''));
  v_last text := btrim(coalesce(new.raw_user_meta_data ->> 'last_name', ''));
begin
  begin
    v_area := nullif(new.raw_user_meta_data ->> 'requested_area_id', '')::smallint;
  exception when others then
    v_area := null;
  end;
  if v_area is not null and not exists (select 1 from public.areas a where a.id = v_area) then
    v_area := null;
  end if;

  if v_first = '' and v_last = '' then
    select s.first_name, s.last_name into v_first, v_last
      from private.split_full_name(new.raw_user_meta_data ->> 'display_name') s;
  end if;

  insert into public.profiles (id, email, first_name, last_name, requested_area_id)
  values (new.id, new.email, left(v_first, 50), left(v_last, 50), v_area);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: people edit the two parts; display_name is read-only to the app.
-- ---------------------------------------------------------------------------
revoke update (display_name) on public.profiles from authenticated;
grant update (first_name, last_name) on public.profiles to authenticated;
