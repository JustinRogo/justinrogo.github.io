import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { PGlite } from '@electric-sql/pglite';

const fixtureId = number => `20000000-0000-4000-8000-${String(number).padStart(12, '0')}`;

test('sign-up alerts go once per pending account to active staff, admins, and stewards of the requested area, with an hourly cap', async () => {
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
      '20261113000300_push_subscriptions.sql',
      '20261117000100_signup_push.sql',
    ]) await db.exec(await readFile(new URL(name, migrations), 'utf8'));

    const { rows: [table] } = await db.query(`
      select relrowsecurity from pg_class where oid = 'private.signup_push_sends'::regclass
    `);
    assert.equal(table.relrowsecurity, true);

    async function addAccount(number, role, status, area = null, areaRole = null) {
      const id = fixtureId(number);
      await db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [
        id, `account-${number}@example.net`, { requested_area_id: status === 'pending' && area ? String(area) : '' },
      ]);
      await db.query('update public.profiles set role = $2, status = $3 where id = $1', [id, role, status]);
      if (areaRole) await db.query('insert into public.area_roles (user_id, area_id, role) values ($1, $2, $3)', [id, area, areaRole]);
      return id;
    }
    const addDevice = (number, user) => db.query(`
      insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth_secret)
      values ($1, $2, $3, 'test-public', 'test-secret')
    `, [fixtureId(number), user, `https://fcm.googleapis.com/wp/example-${number}`]);

    const staff = await addAccount(1, 'staff', 'active');
    const admin = await addAccount(2, 'admin', 'active');
    const member = await addAccount(3, 'member', 'active');
    const pausedStaff = await addAccount(4, 'staff', 'suspended');
    const applicant = await addAccount(5, 'member', 'pending', 7);
    const steward = await addAccount(6, 'member', 'active', 7, 'steward');
    const otherSteward = await addAccount(7, 'member', 'active', 12, 'steward');
    const areaMember = await addAccount(8, 'member', 'active', 7, 'member');
    const pausedSteward = await addAccount(9, 'member', 'suspended', 7, 'steward');
    const stewardingStaff = await addAccount(20, 'staff', 'active', 7, 'steward');
    const noAreaApplicant = await addAccount(21, 'member', 'pending');
    await addDevice(101, staff);
    await addDevice(102, staff);
    await addDevice(103, admin);
    await addDevice(104, member);
    await addDevice(105, pausedStaff);
    await addDevice(106, applicant);
    await addDevice(107, steward);
    await addDevice(108, otherSteward);
    await addDevice(109, areaMember);
    await addDevice(110, pausedSteward);
    await addDevice(111, stewardingStaff);

    // Signed-in members cannot call it, or read the send log.
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${applicant}'`);
    await assert.rejects(db.query('select public.claim_signup_push($1)', [applicant]), /permission denied/);
    await assert.rejects(db.query('select * from private.signup_push_sends'), /permission denied/);
    await db.exec('reset role');

    await db.exec('set role service_role');
    const claim = async user => (await db.query('select public.claim_signup_push($1) as result', [user])).rows[0].result;

    const first = await claim(applicant);
    assert.equal(first.status, 'send');
    // Staff, admins, and active stewards of area 7 only; a staff steward appears once.
    assert.deepEqual(first.devices.map(device => device.id),
      [101, 102, 103, 107, 111].map(fixtureId));
    // With no area chosen, only staff and admins hear about it.
    assert.deepEqual((await claim(noAreaApplicant)).devices.map(device => device.id),
      [101, 102, 103, 111].map(fixtureId));
    assert.deepEqual(Object.keys(first.devices[0]).sort(), ['auth_secret', 'endpoint', 'id', 'p256dh', 'user_id']);
    assert.deepEqual(await claim(applicant), { status: 'already_sent' });
    assert.deepEqual(await claim(member), { status: 'not_pending' });
    assert.deepEqual(await claim(fixtureId(999)), { status: 'not_pending' });

    // Ten alerts per hour across all sign-ups (two sent above); the eleventh is recorded but not sent.
    await db.exec('reset role');
    const flood = [];
    for (let number = 10; number < 20; ++number) flood.push(await addAccount(number, 'member', 'pending'));
    await db.exec('set role service_role');
    for (const id of flood.slice(0, 8)) assert.equal((await claim(id)).status, 'send');
    assert.deepEqual(await claim(flood[8]), { status: 'limited' });
    assert.deepEqual(await claim(flood[8]), { status: 'already_sent' });

    // Older alerts stop counting after an hour.
    await db.exec('reset role');
    await db.exec("update private.signup_push_sends set requested_at = requested_at - interval '61 minutes'");
    const later = await addAccount(30, 'member', 'pending');
    await db.exec('set role service_role');
    assert.equal((await claim(later)).status, 'send');
  } finally {
    await db.close();
  }
});

test('sign-up notification text is generic and opens the Members view', async () => {
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

  await dispatch('push', { data: { json: () => ({ type: 'signup', name: 'Pat Example', email: 'pat@example.net' }) } });
  const alert = notifications.pop();
  assert.equal(alert.body, 'New member sign-up waiting for approval. Tap to review it.');
  assert.equal(alert.tag, 'ucpea-signup');
  assert.equal(alert.renotify, true);
  assert.deepEqual({ ...alert.data }, { type: 'signup' });
  await dispatch('notificationclick', { notification: { ...alert, close() {} } });
  assert.equal(opened.pop(), scope + 'index.html?view=members');
});
