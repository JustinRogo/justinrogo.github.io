-- One send per published post. Keep delivery progress without storing a second
-- copy of browser endpoints or encryption keys.
create table private.board_push_sends (
  post_id uuid primary key references public.posts (id) on delete cascade,
  area_id smallint,
  published_at timestamptz not null,
  started_at timestamptz not null default now(),
  started_by uuid references public.profiles (id) on delete set null
);

create table private.board_push_deliveries (
  post_id uuid not null references private.board_push_sends (post_id) on delete cascade,
  subscription_id uuid not null,
  user_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'accepted', 'failed', 'skipped', 'unconfirmed')),
  claim_id uuid,
  claimed_at timestamptz,
  primary key (post_id, subscription_id)
);

create index board_push_deliveries_claim_idx on private.board_push_deliveries (claim_id)
  where claim_id is not null;

create table private.board_push_rate_limits (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  requested_at timestamptz not null
);

alter table private.board_push_sends enable row level security;
alter table private.board_push_deliveries enable row level security;
alter table private.board_push_rate_limits enable row level security;
revoke all on private.board_push_sends, private.board_push_deliveries, private.board_push_rate_limits
  from public, anon, authenticated;

create function private.board_push_devices(p_area smallint)
returns setof public.push_subscriptions
language sql stable set search_path = ''
as $$
  select s.*
  from public.push_subscriptions s
  join public.profiles p on p.id = s.user_id
  where p.status = 'active' and (
    p_area is null or exists (
      select 1 from public.area_roles ar where ar.user_id = p.id and ar.area_id = p_area
    )
  );
$$;

create function private.board_push_summary(p_post uuid)
returns jsonb
language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'startedAt', send.started_at,
    'total', count(d.subscription_id),
    'pending', count(*) filter (where d.status = 'pending'),
    'sending', count(*) filter (where d.status = 'sending'),
    'accepted', count(*) filter (where d.status = 'accepted'),
    'failed', count(*) filter (where d.status = 'failed'),
    'skipped', count(*) filter (where d.status = 'skipped'),
    'unconfirmed', count(*) filter (where d.status = 'unconfirmed')
  )
  from private.board_push_sends send
  left join private.board_push_deliveries d on d.post_id = send.post_id
  where send.post_id = p_post
  group by send.started_at;
$$;

revoke all on function private.board_push_devices(smallint), private.board_push_summary(uuid)
  from public, anon, authenticated;

-- Only the Edge Function can call this RPC. It supplies the actor from a verified
-- access token. The database locks the post so a double-click or a second steward
-- cannot start another send or claim the same devices.
create function public.prepare_board_push(
  p_actor uuid, p_post uuid, p_action text, p_version timestamptz
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  post public.posts%rowtype;
  alert private.board_push_sends%rowtype;
  actor_role public.user_role;
  batch uuid;
  recipients jsonb;
  requested timestamptz := statement_timestamp();
begin
  if p_action is null or p_action not in ('status', 'start', 'resume') then
    raise sqlstate 'PT400' using message = 'Invalid notification action.';
  end if;

  select * into post from public.posts where id = p_post for update;
  if not found or post.status <> 'published' or post.expires_at <= requested then
    raise sqlstate 'PT404' using message = 'Only published, current posts can be sent.';
  end if;

  select role into actor_role from public.profiles where id = p_actor and status = 'active';
  if actor_role is null or (actor_role = 'member' and not exists (
    select 1 from public.area_roles ar
    where ar.user_id = p_actor and ar.area_id = post.area_id and ar.role = 'steward'
  )) then
    raise sqlstate 'PT403' using message = 'You do not have permission to notify this board.';
  end if;
  if p_version is distinct from post.updated_at then
    raise sqlstate 'PT409' using message = 'The post changed. Reload it and review the audience again.';
  end if;

  select * into alert from private.board_push_sends where post_id = p_post;
  if not found then
    if p_action <> 'start' then
      return jsonb_build_object('eligible', (select count(*) from private.board_push_devices(post.area_id)));
    end if;
    insert into private.board_push_sends (post_id, area_id, published_at, started_by)
    values (p_post, post.area_id, post.published_at, p_actor)
    returning * into alert;

    insert into private.board_push_deliveries (post_id, subscription_id, user_id)
    select p_post, s.id, s.user_id from private.board_push_devices(post.area_id) s;
    if not found then
      delete from private.board_push_sends where post_id = p_post;
      return jsonb_build_object('eligible', 0);
    end if;

    if actor_role = 'member' then
      insert into private.board_push_rate_limits as limits (user_id, requested_at)
      values (p_actor, requested)
      on conflict (user_id) do update set requested_at = excluded.requested_at
      where limits.requested_at <= excluded.requested_at - interval '5 minutes';
      if not found then
        raise sqlstate 'PT429' using message = 'Stewards can start one alert every five minutes.';
      end if;
    end if;
  end if;

  -- If a worker stops after claiming devices, delivery may already have been
  -- accepted. Record it as unconfirmed and keep those devices out of retries.
  update private.board_push_deliveries
  set status = 'unconfirmed', claim_id = null
  where post_id = p_post and status = 'sending' and claimed_at < requested - interval '1 minute';

  if alert.area_id is distinct from post.area_id or alert.published_at is distinct from post.published_at then
    update private.board_push_deliveries set status = 'skipped'
    where post_id = p_post and status = 'pending';
    return jsonb_build_object('closed', true);
  end if;

  if p_action = 'status' or exists (
    select 1 from private.board_push_deliveries where post_id = p_post and status = 'sending'
  ) then
    return private.board_push_summary(p_post);
  end if;

  -- Recheck opt-out, account status, and area membership immediately before
  -- each batch. The original audience is the upper bound for the whole send.
  with eligible as materialized (
    select * from private.board_push_devices(post.area_id)
  ), skipped as (
    update private.board_push_deliveries d set status = 'skipped'
    where d.post_id = p_post and d.status = 'pending'
      and not exists (select 1 from eligible e where e.id = d.subscription_id and e.user_id = d.user_id)
  ), next_devices as (
    select e.id, e.user_id, e.endpoint, e.p256dh, e.auth_secret
    from private.board_push_deliveries d
    join eligible e on e.id = d.subscription_id and e.user_id = d.user_id
    where d.post_id = p_post and d.status = 'pending'
    order by d.subscription_id
    limit 20
  ), claimed as (
    update private.board_push_deliveries d
    set status = 'sending', claim_id = gen_random_uuid(), claimed_at = requested
    from next_devices e
    where d.post_id = p_post and d.subscription_id = e.id
    returning d.claim_id, e.*
  )
  select jsonb_agg(to_jsonb(claimed)) into recipients from claimed;

  return private.board_push_summary(p_post)
    || jsonb_build_object('batch', coalesce(recipients, '[]'::jsonb));
end;
$$;

create function public.finish_board_push(p_post uuid, p_results jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  update private.board_push_deliveries d
  set status = r.status, claim_id = null
  from jsonb_to_recordset(p_results) as r(claim_id uuid, status text)
  where d.post_id = p_post and d.status = 'sending' and d.claim_id = r.claim_id
    and r.status in ('accepted', 'failed', 'unconfirmed');

  return private.board_push_summary(p_post);
end;
$$;

revoke all on function public.prepare_board_push(uuid, uuid, text, timestamptz),
  public.finish_board_push(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.prepare_board_push(uuid, uuid, text, timestamptz),
  public.finish_board_push(uuid, jsonb) to service_role;
