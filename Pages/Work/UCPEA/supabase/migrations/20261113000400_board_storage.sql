-- UCPEA: storage for bulletin board flyers.
--
-- board-public   public bucket: files load by URL for anyone (public posts)
-- board-members  private bucket: files load only through signed URLs, which
--                Storage issues only to people allowed to read that board
--
-- File paths start with the board they belong to:
--   union/<uuid>.webp    union-wide board
--   7/<uuid>.webp        Area 7 board
-- Shrink images in the browser before upload; the 10 MB cap is a backstop.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('board-public', 'board-public', true, 10485760,
   array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']),
  ('board-members', 'board-members', false, 10485760,
   array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Folder name -> may this user post there? Unknown folders are refused.
create or replace function private.can_post_to_folder(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_folder = 'union' then private.can_post_to(null)
    when p_folder ~ '^[0-9]{1,4}$' then private.can_post_to(p_folder::smallint)
    else false
  end;
$$;

-- Folder name -> may this user read a members-only file there?
create or replace function private.can_read_folder(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select case
    when p_folder = 'union' then private.is_active()
    when p_folder ~ '^[0-9]{1,4}$' then
      private.is_staff()
      or private.is_member_of(p_folder::smallint)
    else false
  end;
$$;

revoke all on function private.can_post_to_folder(text), private.can_read_folder(text) from public;
grant execute on function private.can_post_to_folder(text), private.can_read_folder(text) to authenticated;

-- Uploading, replacing and deleting: same rights as posting to that board.
create policy "Board posters upload flyers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('board-public', 'board-members')
    and private.can_post_to_folder((storage.foldername(name))[1])
  );

create policy "Board posters replace flyers"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('board-public', 'board-members')
    and private.can_post_to_folder((storage.foldername(name))[1])
  )
  with check (
    bucket_id in ('board-public', 'board-members')
    and private.can_post_to_folder((storage.foldername(name))[1])
  );

create policy "Board posters delete flyers"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('board-public', 'board-members')
    and private.can_post_to_folder((storage.foldername(name))[1])
  );

-- Reading members-only flyers (needed to create signed URLs). Public-bucket
-- files need no read policy: they are served by URL, and leaving this policy
-- off board-public stops anyone from listing that bucket's contents.
create policy "Members read their boards' flyers"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'board-members'
    and private.can_read_folder((storage.foldername(name))[1])
  );

-- Posters also need to see files in the public bucket they manage, so the
-- dashboard and upsert uploads work.
create policy "Board posters see public flyers they manage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'board-public'
    and private.can_post_to_folder((storage.foldername(name))[1])
  );
