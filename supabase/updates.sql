-- Run in the SQL editor of a NEW Supabase project dedicated to Updates.
-- This schema does not use or change the Front Desk Planner tables.
begin;

create table public.updates_authors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.updates_authors enable row level security;
create policy "Authors can see their own membership" on public.updates_authors
  for select to authenticated using (user_id = auth.uid());

create function public.updates_is_author() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.updates_authors where user_id = auth.uid()); $$;
revoke all on function public.updates_is_author() from public;
grant execute on function public.updates_is_author() to anon, authenticated;

create table public.updates_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users(id),
  title text not null check (char_length(title) between 1 and 180),
  body text not null check (char_length(body) <= 100000),
  excerpt text not null default '' check (char_length(excerpt) <= 500),
  status text not null default 'draft' check (status in ('draft', 'published')),
  pinned boolean not null default false,
  comments_enabled boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_date check (status <> 'published' or published_at is not null)
);
create index updates_posts_feed on public.updates_posts (published_at desc) where status = 'published';
alter table public.updates_posts enable row level security;
create policy "Anyone can read published posts" on public.updates_posts
  for select to anon, authenticated using (status = 'published');
create policy "Author manages posts" on public.updates_posts
  for all to authenticated using (public.updates_is_author())
  with check (public.updates_is_author() and author_id = auth.uid());

create function public.updates_touch_post() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'published' and new.published_at is null then new.published_at := now(); end if;
  return new;
end; $$;
create trigger updates_touch_post before insert or update on public.updates_posts
  for each row execute function public.updates_touch_post();

create table public.updates_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.updates_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null check (char_length(author_name) between 1 and 80),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);
create index updates_comments_post on public.updates_comments (post_id, created_at);
create index updates_comments_user on public.updates_comments (user_id, created_at desc);
alter table public.updates_comments enable row level security;
create policy "Read visible comments" on public.updates_comments
  for select to anon, authenticated using (
    public.updates_is_author() or (
      exists (select 1 from public.updates_posts p where p.id = post_id and p.status = 'published')
      and (status = 'approved' or user_id = auth.uid())
    )
  );
create policy "Signed in readers submit pending comments" on public.updates_comments
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'pending'
    and exists (select 1 from public.updates_posts p
      where p.id = post_id and p.status = 'published' and p.comments_enabled)
  );
create policy "Author moderates comments" on public.updates_comments
  for update to authenticated using (public.updates_is_author()) with check (public.updates_is_author());
create policy "Author or commenter deletes comment" on public.updates_comments
  for delete to authenticated using (public.updates_is_author() or user_id = auth.uid());

create function public.updates_comment_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Serialize submissions per account so concurrent requests cannot bypass the limit.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists (select 1 from public.updates_comments
      where user_id = auth.uid() and created_at > now() - interval '30 seconds') then
    raise exception 'Please wait 30 seconds before adding another comment.';
  end if;
  new.created_at := now();
  return new;
end; $$;
create trigger updates_comment_guard before insert on public.updates_comments
  for each row execute function public.updates_comment_guard();

-- Explicit grants keep the allowlist unwritable by application users.
revoke all on public.updates_authors, public.updates_posts, public.updates_comments from anon, authenticated;
grant select on public.updates_authors to authenticated;
grant select on public.updates_posts, public.updates_comments to anon, authenticated;
grant insert, update, delete on public.updates_posts to authenticated;
grant insert, update, delete on public.updates_comments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('updates-images', 'updates-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
create policy "Anyone can read update images" on storage.objects
  for select to anon, authenticated using (bucket_id = 'updates-images');
create policy "Author uploads update images" on storage.objects
  for insert to authenticated with check (bucket_id = 'updates-images' and public.updates_is_author());
create policy "Author removes update images" on storage.objects
  for delete to authenticated using (bucket_id = 'updates-images' and public.updates_is_author());
commit;

-- AFTER signing in once on /updates, run this with your actual account email:
-- insert into public.updates_authors (user_id)
-- select id from auth.users where lower(email) = lower('YOUR-EMAIL@example.com')
-- on conflict do nothing;
