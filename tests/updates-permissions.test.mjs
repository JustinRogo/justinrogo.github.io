import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

for (const upgrade of [false, true]) test(`PostgreSQL policies publish comments and protect drafts, author permissions and throttling (${upgrade ? 'migrated project' : 'new project'})`, async () => {
  const db = new PGlite();
  try {
    // The actual migration runs unchanged. These stubs model Supabase's existing schemas.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth; create schema storage;
      create table auth.users (id uuid primary key, email text);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, storage to anon, authenticated;
      create table storage.buckets (id text primary key, name text, public boolean,
        file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
      alter table storage.objects enable row level security;
      grant select,insert,delete on storage.objects to anon,authenticated;
    `);
    await db.exec(await readFile(new URL(upgrade ? './fixtures/updates-moderated.sql' : '../supabase/updates.sql', import.meta.url), 'utf8'));
    if (upgrade) {
      const migration = await readFile(new URL('../supabase/migrations/20261029_publish_comments_immediately.sql', import.meta.url), 'utf8');
      await db.exec(migration);
      await db.exec(migration); // Retrying the migration is safe.
    }
    const author = '20000000-0000-4000-8000-000000000001';
    const reader = '20000000-0000-4000-8000-000000000002';
    const other = '20000000-0000-4000-8000-000000000003';
    await db.query('insert into auth.users values ($1,$2),($3,$4),($5,$6)', [author, 'author@example.com', reader, 'reader@example.com', other, 'other@example.com']);
    await db.query('insert into public.updates_authors values ($1)', [author]);
    async function as(role, user = '') {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
      await db.exec(`set role ${role}`);
    }
    await as('authenticated', author);
    const draft = (await db.query("insert into public.updates_posts (title,body,status) values ('Private draft','<p>Private</p>','draft') returning id")).rows[0].id;
    const post = (await db.query("insert into public.updates_posts (title,body,status) values ('Public update','<p>Public</p>','published') returning id,published_at")).rows[0];
    assert.ok(post.published_at, 'Publishing assigns a date in the database');
    await as('anon');
    assert.equal((await db.query('select id from public.updates_posts')).rows.length, 1);
    assert.equal((await db.query('select id from public.updates_posts where id=$1', [draft])).rows.length, 0);
    await assert.rejects(db.query("insert into public.updates_posts (title,body) values ('Attack','x')"), /permission denied/i);

    await as('authenticated', reader);
    assert.equal((await db.query('select updates_is_author() as author')).rows[0].author, false);
    await assert.rejects(db.query("insert into public.updates_posts (title,body) values ('Attack','x')"), /row.level security/i);
    await assert.rejects(db.query('insert into public.updates_authors values ($1)', [reader]), /permission denied/i);
    await assert.rejects(db.query("insert into public.updates_comments (post_id,user_id,author_name,body) values ($1,$2,'Reader','Spoofed user')", [post.id, author]), /row.level security/i);
    await assert.rejects(db.query("insert into public.updates_comments (post_id,author_name,body) values ($1,'Reader','Draft attack')", [draft]), /row.level security/i);
    const comment = (await db.query("insert into public.updates_comments (post_id,author_name,body) values ($1,'Reader','A real comment') returning id,status", [post.id])).rows[0];
    assert.equal(comment.status, 'approved');
    assert.equal((await db.query('select id from public.updates_comments')).rows.length, 1, 'Readers can see their published comment');
    assert.equal((await db.query("update public.updates_comments set body='Changed' where id=$1 returning id", [comment.id])).rows.length, 0, 'Readers cannot update comments');
    await assert.rejects(db.query("insert into public.updates_comments (post_id,author_name,body) values ($1,'Reader','Too soon')", [post.id]), /wait 30 seconds/i);

    await as('authenticated', other);
    assert.equal((await db.query('select id from public.updates_comments')).rows.length, 1, 'Other readers see the comment immediately');
    assert.equal((await db.query('delete from public.updates_comments where id=$1 returning id', [comment.id])).rows.length, 0, 'Other readers cannot delete it');
    await as('anon');
    assert.equal((await db.query('select id from public.updates_comments')).rows.length, 1, 'Signed-out visitors see the comment immediately');
    await assert.rejects(db.query("insert into public.updates_comments (post_id,author_name,body) values ($1,'Anonymous','Attack')", [post.id]), /permission denied/i);
    await as('authenticated', author);
    assert.equal((await db.query('select id from public.updates_comments')).rows.length, 1);
    await as('anon');
    assert.equal((await db.query('select id from public.updates_comments')).rows.length, 1);

    await as('authenticated', author);
    await db.query('update public.updates_posts set comments_enabled=false where id=$1', [post.id]);
    await as('authenticated', other);
    await assert.rejects(db.query("insert into public.updates_comments (post_id,author_name,body) values ($1,'Other','Closed comments attack')", [post.id]), /row.level security/i);
    await assert.rejects(db.query("insert into storage.objects (bucket_id,name) values ('updates-images','reader-upload.png')"), /row.level security/i);
    await as('authenticated', author);
    await db.query("insert into storage.objects (bucket_id,name) values ('updates-images','author-upload.png')");
    await as('anon');
    assert.equal((await db.query('select name from storage.objects')).rows.length, 1);

    // Requests from the older app also publish immediately after the database upgrade.
    await as('authenticated', author);
    await db.query('update public.updates_posts set comments_enabled=true where id=$1', [post.id]);
    await as('authenticated', other);
    const legacy = (await db.query("insert into public.updates_comments (post_id,author_name,body,status) values ($1,'Other','Older app submission','pending') returning status", [post.id])).rows[0];
    assert.equal(legacy.status, 'approved');

    // Stored pending comments from before the upgrade retain their visibility rules.
    await as('authenticated', author);
    await db.query("update public.updates_comments set status='pending' where id=$1", [comment.id]);
    await as('anon');
    assert.equal((await db.query('select id from public.updates_comments where id=$1', [comment.id])).rows.length, 0);
    await as('authenticated', reader);
    assert.equal((await db.query('select id from public.updates_comments where id=$1', [comment.id])).rows.length, 1);
    await db.query('delete from public.updates_comments where id=$1', [comment.id]);
    assert.equal((await db.query('select id from public.updates_comments where id=$1', [comment.id])).rows.length, 0, 'Commenters can still delete their own comments');
  } finally { await db.close(); }
});
