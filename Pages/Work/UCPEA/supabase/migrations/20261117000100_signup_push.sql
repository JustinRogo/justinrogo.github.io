-- Sign-up alerts: tell staff, admins, and the stewards of the requested area
-- when someone asks to join, so they know to open the dashboard and approve or
-- decline the request.
--
-- The new member's dashboard asks the ucpea-signup-push Edge Function to send
-- the alert once their email is confirmed. Sign-ups come from the public, so:
--   * each account can trigger one alert, ever;
--   * at most 10 sign-up alerts go out per hour across the union, so a flood of
--     fake accounts cannot flood staff phones (the requests still show up in
--     the Members view);
--   * the alert carries no name or email (see sw.js).

create table private.signup_push_sends (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  -- false when the hourly limit was reached and no alert went out.
  alerted boolean not null default true
);

create index signup_push_sends_recent_idx on private.signup_push_sends (requested_at)
  where alerted;

alter table private.signup_push_sends enable row level security;
revoke all on private.signup_push_sends from public, anon, authenticated;

-- Only the Edge Function can call this. It passes the account id from a verified
-- access token. Returns the devices to alert (staff, admins, and stewards of the
-- area the person asked to join, all active), or why none.
create function public.claim_signup_push(p_user uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  requested timestamptz := statement_timestamp();
  area smallint;
  devices jsonb;
begin
  select requested_area_id into area from public.profiles where id = p_user and status = 'pending';
  if not found then
    return jsonb_build_object('status', 'not_pending');
  end if;

  -- Serialize claims so concurrent sign-ups cannot slip past the hourly limit.
  perform pg_advisory_xact_lock(hashtext('ucpea-signup-push'));

  insert into private.signup_push_sends (user_id, requested_at)
  values (p_user, requested)
  on conflict (user_id) do nothing;
  if not found then
    return jsonb_build_object('status', 'already_sent');
  end if;

  if (select count(*) from private.signup_push_sends
      where alerted and user_id <> p_user and requested_at > requested - interval '1 hour') >= 10 then
    update private.signup_push_sends set alerted = false where user_id = p_user;
    return jsonb_build_object('status', 'limited');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'user_id', s.user_id, 'endpoint', s.endpoint,
    'p256dh', s.p256dh, 'auth_secret', s.auth_secret
  ) order by s.id), '[]'::jsonb)
  into devices
  from public.push_subscriptions s
  join public.profiles p on p.id = s.user_id
  where p.status = 'active' and (
    p.role in ('staff', 'admin') or exists (
      -- Stewards can approve sign-ups into their own areas only. A sign-up
      -- with no area chosen goes to staff and admins alone.
      select 1 from public.area_roles ar
      where ar.user_id = p.id and ar.area_id = area and ar.role = 'steward'
    )
  );

  return jsonb_build_object('status', 'send', 'devices', devices);
end;
$$;

revoke all on function public.claim_signup_push(uuid) from public, anon, authenticated;
grant execute on function public.claim_signup_push(uuid) to service_role;
