-- UCPEA: bulletin board posts (union-wide and per-area).
--
-- area_id null      -> the union-wide board (staff and admins post)
-- area_id = N       -> Area N's board (that area's stewards, plus staff, post)
-- visibility public -> anyone, signed in or not, can read it once published
-- visibility members-> only active members of that board can read it
--
-- Every post needs a plain-text title and summary so the list view, screen
-- readers and search work even when the flyer itself is an image.

create type public.post_status as enum ('draft', 'published', 'archived');
create type public.post_visibility as enum ('public', 'members');
create type public.post_category as enum ('announcement', 'event', 'flyer', 'meeting', 'action');

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  area_id smallint references public.areas (id) on delete cascade,
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,

  title text not null check (char_length(btrim(title)) between 1 and 140),
  summary text not null check (char_length(btrim(summary)) between 1 and 600),
  body text check (char_length(body) <= 10000),
  category public.post_category not null default 'announcement',

  -- Flyer image or PDF in Supabase Storage (see the storage migration).
  image_bucket text check (image_bucket in ('board-public', 'board-members')),
  image_path text,
  image_alt text check (char_length(image_alt) <= 500),

  link_url text check (link_url ~ '^https://'),
  event_starts_at timestamptz,
  expires_at timestamptz,
  pinned boolean not null default false,

  visibility public.post_visibility not null default 'members',
  status public.post_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint image_has_bucket_and_path
    check ((image_bucket is null) = (image_path is null)),
  constraint image_has_alt_text
    check (image_path is null or char_length(btrim(coalesce(image_alt, ''))) > 0),
  constraint public_posts_use_public_images
    check (visibility = 'members' or image_bucket is distinct from 'board-members'),
  constraint expires_after_event
    check (expires_at is null or event_starts_at is null or expires_at >= event_starts_at)
);

create index posts_board_idx on public.posts (area_id, status, published_at desc);
create index posts_author_idx on public.posts (author_id);

-- Timestamps are set by the database, not the client.
create or replace function private.stamp_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger stamp_post
  before insert or update on public.posts
  for each row execute function private.stamp_post();

alter table public.posts enable row level security;

-- Public posts: readable by anyone, including people who are not signed in.
create policy "Anyone reads published public posts"
  on public.posts for select to anon, authenticated
  using (status = 'published' and visibility = 'public');

-- Members-only posts and drafts.
create policy "Members read their boards; posters read their drafts"
  on public.posts for select to authenticated
  using (
    (select private.is_staff())
    or private.can_post_to(area_id)
    or (author_id = (select auth.uid()) and (select private.is_active()))
    or (
      status = 'published'
      and (select private.is_active())
      and (area_id is null or private.is_member_of(area_id))
    )
  );

create policy "Posters create posts on boards they control"
  on public.posts for insert to authenticated
  with check (
    private.can_post_to(area_id)
    and author_id = (select auth.uid())
  );

-- Stewards control their whole area board, including other stewards' posts.
-- Moving a post to another board requires rights on both boards.
create policy "Posters edit posts on boards they control"
  on public.posts for update to authenticated
  using (private.can_post_to(area_id))
  with check (private.can_post_to(area_id));

create policy "Posters delete posts on boards they control"
  on public.posts for delete to authenticated
  using (private.can_post_to(area_id));

grant select on public.posts to anon, authenticated;
grant delete on public.posts to authenticated;
-- author_id, published_at, created_at and updated_at are set by the database,
-- so clients can neither supply them on insert nor change them later.
grant insert (
  area_id, title, summary, body, category,
  image_bucket, image_path, image_alt, link_url,
  event_starts_at, expires_at, pinned, visibility, status
) on public.posts to authenticated;
grant update (
  area_id, title, summary, body, category,
  image_bucket, image_path, image_alt, link_url,
  event_starts_at, expires_at, pinned, visibility, status
) on public.posts to authenticated;

grant all on public.posts to service_role;
