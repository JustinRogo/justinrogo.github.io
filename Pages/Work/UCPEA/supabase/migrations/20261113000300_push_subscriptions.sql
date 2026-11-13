-- UCPEA: Web Push subscriptions (one row per device a member turned alerts on for).
--
-- Sending happens later in an Edge Function using the service_role key and the
-- VAPID private key, neither of which ever reaches the browser. That function
-- looks up subscribers by area_roles, so area targeting needs nothing extra here.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://'),
  p256dh text not null,
  auth_secret text not null,
  user_agent text check (char_length(user_agent) <= 300),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count integer not null default 0
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Read own push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Remove own push subscriptions"
  on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- Registering goes through this function rather than a plain insert: a shared
-- or handed-down device keeps the same endpoint, and the new owner must be able
-- to take it over from the previous account (which RLS would otherwise block).
create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_active() then
    raise exception 'Only approved members can turn on alerts.';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_secret, user_agent)
  values ((select auth.uid()), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth_secret = excluded.auth_secret,
        user_agent = excluded.user_agent,
        failure_count = 0;
end;
$$;

revoke all on function public.register_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;

grant select, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;
