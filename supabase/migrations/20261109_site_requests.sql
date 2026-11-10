-- Website request form (Tools → Request on the V2 homepage).
-- Run once in the SQL editor of the existing Updates Supabase project. Safe to rerun.
-- Visitors submit without signing in: anonymous users may INSERT, never SELECT, UPDATE or DELETE.
-- Read requests in the Supabase dashboard (Table Editor → site_requests).
begin;

create table if not exists public.site_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  subject text not null check (char_length(btrim(subject)) between 1 and 150),
  details text not null check (char_length(btrim(details)) between 1 and 5000),
  -- HMAC of the sender's IP address from the API route, used only for throttling.
  client_hash text check (client_hash is null or client_hash ~ '^[0-9a-f]{64}$'),
  -- For your own tracking in the dashboard; submissions always start as 'new'.
  status text not null default 'new' check (status in ('new', 'in_progress', 'done', 'archived')),
  created_at timestamptz not null default now()
);
create index if not exists site_requests_created on public.site_requests (created_at desc);
create index if not exists site_requests_client on public.site_requests (client_hash, created_at desc) where client_hash is not null;
alter table public.site_requests enable row level security;

drop policy if exists "Anyone can submit a request" on public.site_requests;
create policy "Anyone can submit a request" on public.site_requests
  for insert to anon, authenticated with check (status = 'new');
-- No select, update or delete policies: only the dashboard (postgres/service role) can read or change rows.

-- Throttle in the database so it also applies to direct API calls with the public key.
create or replace function public.site_requests_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Serialize submissions so concurrent requests cannot exceed the limits.
  perform pg_advisory_xact_lock(hashtextextended('public.site_requests', 0));
  new.created_at := now();
  new.status := 'new';
  if new.client_hash is not null and (select count(*) from public.site_requests
      where client_hash = new.client_hash and created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'site_requests_rate_limited: sender' using errcode = 'P0001';
  end if;
  if (select count(*) from public.site_requests where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'site_requests_rate_limited: global' using errcode = 'P0001';
  end if;
  return new;
end; $$;
revoke all on function public.site_requests_guard() from public, anon, authenticated;
drop trigger if exists site_requests_guard on public.site_requests;
create trigger site_requests_guard before insert on public.site_requests
  for each row execute function public.site_requests_guard();

-- Column-level grant: visitors can supply only the form fields (not id, status or created_at).
revoke all on public.site_requests from anon, authenticated;
grant insert (name, email, subject, details, client_hash) on public.site_requests to anon, authenticated;
commit;
