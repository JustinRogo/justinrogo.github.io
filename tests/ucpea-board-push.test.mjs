import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { PGlite } from '@electric-sql/pglite';

const fixtureId = number => `20000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

test('board alerts honor posting permissions and send only once to currently eligible devices', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
    `);
    const migrations = new URL('../Pages/Work/UCPEA/supabase/migrations/', import.meta.url);
    for (const name of [
      '20261113000100_roles_and_profiles.sql',
      '20261113000200_bulletin_board.sql',
      '20261113000300_push_subscriptions.sql',
      '20261115000200_board_push.sql',
    ]) await db.exec(await readFile(new URL(name, migrations), 'utf8'));

    async function addMember(number, role, status, area, areaRole = 'member') {
      const id = fixtureId(number);
      await db.query('insert into auth.users (id, email) values ($1, $2)', [id, `member-${number}@example.net`]);
      await db.query('update public.profiles set role = $2, status = $3 where id = $1', [id, role, status]);
      if (area) await db.query('insert into public.area_roles (user_id, area_id, role) values ($1, $2, $3)', [id, area, areaRole]);
      return id;
    }
    const steward = await addMember(1, 'member', 'active', 7, 'steward');
    const staff = await addMember(2, 'staff', 'active', null);
    const member = await addMember(3, 'member', 'active', 7);
    const other = await addMember(4, 'member', 'active', 12);
    const suspended = await addMember(5, 'member', 'suspended', 7, 'steward');
    const pending = await addMember(6, 'member', 'pending', 7);
    const noArea = await addMember(7, 'member', 'active', null);

    const addDevice = (number, user) => db.query(`
      insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth_secret)
      values ($1, $2, $3, 'test-public', 'test-secret')
    `, [fixtureId(number), user, `https://fcm.googleapis.com/wp/example-${number}`]);
    for (let number = 101; number <= 123; ++number) await addDevice(number, member);
    await addDevice(130, other);
    await addDevice(131, suspended);
    await addDevice(132, pending);
    await addDevice(133, noArea);

    async function addPost(number, area, status = 'published', expires = null) {
      const { rows: [post] } = await db.query(`
        insert into public.posts (id, area_id, title, summary, status, expires_at)
        values ($1, $2, 'Board update', 'Details for this board', $3, $4)
        returning id, updated_at::text as version
      `, [fixtureId(number), area, status, expires]);
      return post;
    }
    const area = await addPost(11, 7);
    const second = await addPost(12, 7);
    const union = await addPost(13, null);
    const draft = await addPost(14, 7, 'draft');
    const expired = await addPost(15, 7, 'published', '2000-01-01');
    const empty = await addPost(16, 8);
    const prepare = async (actor, post, action = 'status', version = post.version) => {
      const { rows: [row] } = await db.query('select public.prepare_board_push($1, $2, $3, $4) as result', [
        actor, post.id, action, version,
      ]);
      return row.result;
    };
    const finish = async (post, results) => {
      const { rows: [row] } = await db.query('select public.finish_board_push($1, $2) as result', [post.id, JSON.stringify(results)]);
      return row.result;
    };

    await db.exec('set role authenticated');
    await assert.rejects(prepare(steward, area), { code: '42501' });
    await assert.rejects(finish(area, []), { code: '42501' });
    await assert.rejects(db.query('select * from private.board_push_deliveries'), { code: '42501' });

    await db.exec('reset role; set role service_role');
    await assert.rejects(prepare(steward, union), { code: 'PT403' });
    await assert.rejects(prepare(member, area, 'start'), { code: 'PT403' });
    await assert.rejects(prepare(other, area, 'start'), { code: 'PT403' });
    await assert.rejects(prepare(suspended, area, 'start'), { code: 'PT403' });
    await assert.rejects(prepare(steward, draft), { code: 'PT404' });
    await assert.rejects(prepare(staff, expired), { code: 'PT404' });
    await assert.rejects(prepare(steward, area, 'start', '2000-01-01'), { code: 'PT409' });
    assert.deepEqual(await prepare(staff, empty, 'start'), { eligible: 0 });
    assert.deepEqual(await prepare(steward, area), { eligible: 23 });

    const results = await Promise.all([prepare(steward, area, 'start'), prepare(steward, area, 'start')]);
    const [start] = results.filter(result => result.batch?.length);
    assert.equal(results.filter(result => result.batch?.length).length, 1);
    assert.equal(start.batch.length, 20);
    assert(start.batch.every(device => device.user_id === member));
    await assert.rejects(prepare(steward, second, 'start'), { code: 'PT429' });
    assert.equal((await prepare(staff, area, 'resume')).batch, undefined);

    const finished = start.batch.slice(1).map(device => ({ claim_id: device.claim_id, status: 'accepted' }));
    assert.equal((await finish(area, finished)).accepted, 19);
    assert.equal((await finish(area, finished)).accepted, 19);
    assert.equal((await prepare(staff, area)).sending, 1);

    await db.exec("reset role; update private.board_push_deliveries set claimed_at = now() - interval '2 minutes' where status = 'sending'");
    await db.query('delete from public.push_subscriptions where id = $1', [fixtureId(121)]);
    await db.query('update public.push_subscriptions set user_id = $2 where id = $1', [fixtureId(122), other]);
    await addDevice(124, member);
    await db.exec('set role service_role');
    const remaining = await prepare(staff, area, 'resume');
    assert.equal(remaining.unconfirmed, 1);
    assert.equal(remaining.skipped, 2);
    assert.deepEqual(remaining.batch.map(device => device.id), [fixtureId(123)]);
    const complete = await finish(area, remaining.batch.map(device => ({ claim_id: device.claim_id, status: 'accepted' })));
    assert.equal(complete.accepted, 20);
    assert.equal(complete.pending + complete.sending, 0);
    assert.deepEqual((await prepare(staff, area, 'start')).batch, []);

    assert.equal((await prepare(staff, second, 'start')).batch.length, 20);
    await db.exec('reset role');
    const { rows: [moved] } = await db.query('update public.posts set area_id = 12 where id = $1 returning id, updated_at::text as version', [second.id]);
    await db.exec('set role service_role');
    await assert.rejects(prepare(staff, second, 'resume'), { code: 'PT409' });
    assert.deepEqual(await prepare(staff, moved, 'resume'), { closed: true });
    assert.equal((await prepare(staff, union)).eligible, 25);
  } finally {
    await db.close();
  }
});

test('board notification text is generic and opens the correct post within the dashboard', async () => {
  const scope = 'https://example.net/Pages/Work/UCPEA/';
  const handlers = new Map();
  const notifications = [];
  const opened = [];
  const self = {
    registration: {
      scope,
      async showNotification(title, options) { notifications.push({ title, ...options }); },
    },
    clients: {
      async matchAll() { return []; },
      async openWindow(url) { opened.push(url); },
    },
    addEventListener(event, callback) { handlers.set(event, callback); },
  };
  const worker = await readFile(new URL('../Pages/Work/UCPEA/sw.js', import.meta.url), 'utf8');
  runInNewContext(worker, { self, URL });
  function dispatch(name, event) {
    let completed;
    handlers.get(name)({ ...event, waitUntil(promise) { completed = promise; } });
    return completed;
  }
  const postId = fixtureId(11);
  await dispatch('push', { data: { json: () => ({ type: 'board', postId, title: 'Private meeting' }) } });
  const board = notifications.pop();
  assert.equal(board.body, 'New UCPEA bulletin board post. Tap to open it.');
  assert.equal(board.tag, `ucpea-board-${postId}`);
  await dispatch('notificationclick', { notification: { ...board, close() {} } });
  assert.equal(opened.pop(), scope + `index.html?view=board#post-${postId}`);
  await dispatch('notificationclick', { notification: { data: { type: 'board', postId: '//other.example.net' }, close() {} } });
  assert.equal(opened.pop(), scope + 'index.html');
  await dispatch('notificationclick', { notification: { data: { type: 'test' }, close() {} } });
  assert.equal(opened.pop(), scope + 'index.html?view=account');
});
