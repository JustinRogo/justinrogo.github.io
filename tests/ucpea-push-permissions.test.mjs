import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('personal push tests require a current subscription owned by an approved member', async () => {
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
      '20261115000100_push_test_rate_limit.sql',
    ]) await db.exec(await readFile(new URL(name, migrations), 'utf8'));

    const { rows: [cooldownTable] } = await db.query(`
      select relrowsecurity from pg_class where oid = 'private.push_test_rate_limits'::regclass
    `);
    assert.equal(cooldownTable.relrowsecurity, true);

    const member = '20000000-0000-4000-8000-000000000001';
    const other = '20000000-0000-4000-8000-000000000002';
    const device1 = '30000000-0000-4000-8000-000000000001';
    const device2 = '30000000-0000-4000-8000-000000000002';
    await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [member, 'member@example.net', other, 'other@example.net']);
    await db.exec("update public.profiles set status = 'active'");
    await db.query(`insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth_secret)
      values ($1, $3, 'https://fcm.googleapis.com/wp/example-1', 'p1', 'a1'),
             ($2, $3, 'https://fcm.googleapis.com/wp/example-2', 'p2', 'a2')`, [device1, device2, member]);

    const claim = (user, device) => db.query('select * from public.claim_push_test($1, $2)', [user, device]);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from private.push_test_rate_limits'), { code: '42501' });
    await assert.rejects(claim(member, device1), { code: '42501' });
    await db.exec('reset role; set role anon');
    await assert.rejects(claim(member, device1), { code: '42501' });

    await db.exec('reset role; set role service_role');
    await assert.rejects(claim(other, device1), { code: 'PT404' });
    const results = await Promise.allSettled([claim(member, device1), claim(member, device1)]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.code, 'PT429');
    assert.deepEqual(results.find(result => result.status === 'fulfilled').value.rows, [{
      endpoint: 'https://fcm.googleapis.com/wp/example-1', p256dh: 'p1', auth_secret: 'a1',
    }]);
    await assert.rejects(claim(member, device2), { code: 'PT429' });

    await db.exec("reset role; update private.push_test_rate_limits set requested_at = now() - interval '2 minutes'; set role service_role");
    assert.equal((await claim(member, device2)).rows[0].auth_secret, 'a2');

    await db.exec("reset role; update public.profiles set status = 'suspended'; set role service_role");
    await assert.rejects(claim(member, device1), { code: 'PT404' });
  } finally {
    await db.close();
  }
});
