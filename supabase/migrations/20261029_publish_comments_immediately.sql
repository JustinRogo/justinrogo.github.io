-- Existing Updates projects: run this once before deploying the updated app.
-- Existing pending comments stay in the author's queue; new comments publish immediately.
begin;

alter table public.updates_comments alter column status set default 'approved';
drop policy if exists "Signed in readers submit pending comments" on public.updates_comments;
drop policy if exists "Signed in readers publish comments" on public.updates_comments;
create policy "Signed in readers publish comments" on public.updates_comments
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'approved'
    and exists (select 1 from public.updates_posts p
      where p.id = post_id and p.status = 'published' and p.comments_enabled)
  );

create or replace function public.updates_comment_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Keep the per-account throttle, including concurrent submissions.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
  if exists (select 1 from public.updates_comments
      where user_id = auth.uid() and created_at > now() - interval '30 seconds') then
    raise exception 'Please wait 30 seconds before adding another comment.';
  end if;
  new.created_at := now();
  -- Also supports requests from an older app during deployment.
  new.status := 'approved';
  return new;
end; $$;

commit;
