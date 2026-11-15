-- A per-account cooldown still applies if someone removes and recreates a device subscription.
create table private.push_test_rate_limits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  requested_at timestamptz not null
);

alter table private.push_test_rate_limits enable row level security;
revoke all on private.push_test_rate_limits from public, anon, authenticated;

create function public.claim_push_test(p_user uuid, p_subscription uuid)
returns table (endpoint text, p256dh text, auth_secret text)
language plpgsql security definer set search_path = ''
as $$
declare
  subscription public.push_subscriptions%rowtype;
  requested timestamptz := statement_timestamp();
begin
  select s.* into subscription
  from public.push_subscriptions s
  join public.profiles p on p.id = s.user_id
  where s.id = p_subscription and s.user_id = p_user and p.status = 'active';

  if not found then
    raise sqlstate 'PT404' using message = 'No active subscription for this account.';
  end if;

  insert into private.push_test_rate_limits as limits (user_id, requested_at)
  values (p_user, requested)
  on conflict (user_id) do update
  set requested_at = excluded.requested_at
  where limits.requested_at <= excluded.requested_at - interval '1 minute';

  if not found then
    raise sqlstate 'PT429' using message = 'Wait one minute between tests.';
  end if;

  return query select subscription.endpoint, subscription.p256dh, subscription.auth_secret;
end;
$$;

revoke all on function public.claim_push_test(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_push_test(uuid, uuid) to service_role;
