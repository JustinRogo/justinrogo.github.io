import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { normalizeRequest, spamSignal, clientAddress, clientHash, allowedOrigins } from '../lib/requests.mjs';
import handler from '../api/requests.mjs';

const valid = { name: '  Ada  Lovelace ', email: 'Ada@Example.com', subject: 'A\tquestion', details: 'Line one\r\nLine two\u0007', website: '', elapsed: 9000 };

test('requests are normalized and validated', () => {
  assert.deepEqual(normalizeRequest(valid), { name: 'Ada Lovelace', email: 'ada@example.com', subject: 'A question', details: 'Line one\nLine two' });
  assert.throws(() => normalizeRequest({ ...valid, name: '   ' }), /Enter your name/);
  assert.throws(() => normalizeRequest({ ...valid, email: 'not-an-email' }), /valid email/);
  assert.throws(() => normalizeRequest({ ...valid, details: 'x'.repeat(5001) }), /up to 5,000/);
  assert.throws(() => normalizeRequest({ ...valid, details: 'https://a.example https://b.example www.c.example http://d.example' }), /no more than 3 links/);
  assert.throws(() => normalizeRequest(null), /could not be read/);
});

test('spam signals, client hashing and allowed origins', () => {
  assert.equal(spamSignal(valid), null);
  assert.equal(spamSignal({ ...valid, website: 'http://spam.example' }), 'honeypot');
  assert.equal(spamSignal({ ...valid, elapsed: 500 }), 'too-fast');
  assert.equal(spamSignal({ ...valid, elapsed: undefined }), 'too-fast');
  assert.equal(clientAddress({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }), '203.0.113.9');
  assert.equal(clientAddress({ 'x-real-ip': '198.51.100.2', 'x-forwarded-for': '203.0.113.9' }), '198.51.100.2');
  assert.match(clientHash('203.0.113.9', 'salt'), /^[0-9a-f]{64}$/);
  assert.notEqual(clientHash('203.0.113.9', 'salt'), clientHash('203.0.113.9', 'other'));
  assert.equal(clientHash(null, 'salt'), null);
  const origins = allowedOrigins({ REQUESTS_ALLOWED_ORIGINS: 'https://preview.example/' });
  assert.ok(origins.has('https://justinrogo.github.io'));
  assert.ok(origins.has('https://preview.example'));
  assert.ok(!origins.has('https://evil.example'));
});

function call({ method = 'POST', origin = 'https://justinrogo.github.io', body = valid, type = 'application/json' } = {}) {
  return new Promise(resolve => {
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader: (name, value) => { headers[name.toLowerCase()] = value; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, headers, body: payload }); return this; },
      send(payload) { resolve({ status: this.statusCode, headers, body: payload }); return this; },
    };
    const reqHeaders = { 'content-type': type, ...(origin ? { origin } : {}) };
    handler({ method, headers: reqHeaders, body: JSON.stringify(body), url: '/api/requests' }, res);
  });
}

test('the API route enforces origin, method, spam checks and validation before touching Supabase', async () => {
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY };
  delete process.env.SUPABASE_URL; delete process.env.SUPABASE_PUBLISHABLE_KEY;
  try {
    const preflight = await call({ method: 'OPTIONS' });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], 'https://justinrogo.github.io');
    assert.equal((await call({ method: 'OPTIONS', origin: 'https://evil.example' })).status, 403);
    assert.equal((await call({ origin: 'https://evil.example' })).status, 403);
    assert.equal((await call({ origin: null })).status, 403);
    assert.equal((await call({ method: 'GET' })).status, 405);
    assert.equal((await call({ type: 'text/plain' })).status, 415);
    assert.deepEqual(await call({ body: { ...valid, website: 'spam' } }).then(r => [r.status, r.body]), [201, { ok: true }]);
    assert.equal((await call({ body: { ...valid, elapsed: 100 } })).status, 400);
    assert.match((await call({ body: { ...valid, email: 'nope' } })).body.error, /valid email/);
    // A valid request without Supabase configuration fails clearly instead of pretending to succeed.
    assert.equal((await call()).status, 503);
  } finally {
    if (saved.url !== undefined) process.env.SUPABASE_URL = saved.url;
    if (saved.key !== undefined) process.env.SUPABASE_PUBLISHABLE_KEY = saved.key;
  }
});

test('PostgreSQL lets anonymous visitors insert requests but never read, change or delete them', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      grant usage on schema public to anon, authenticated;
      -- Supabase grants these by default; the migration must revoke them.
      alter default privileges in schema public grant all on tables to anon, authenticated;
    `);
    const migration = await readFile(new URL('../supabase/migrations/20261109_site_requests.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // Rerunning is safe.
    const insert = (hash = null, extra = '') => db.query(
      `insert into public.site_requests (name,email,subject,details,client_hash${extra ? ',status' : ''}) values ('Ada','ada@example.com','Hello','Details',$1${extra ? `,'${extra}'` : ''})`, [hash]);
    const sender = 'a'.repeat(64);

    await db.exec('set role anon');
    await insert(sender);
    await assert.rejects(db.query('select * from public.site_requests'), /permission denied/i);
    await assert.rejects(db.query("update public.site_requests set status='done'"), /permission denied/i);
    await assert.rejects(db.query('delete from public.site_requests'), /permission denied/i);
    await assert.rejects(insert(null, 'done'), /permission denied/i, 'Visitors cannot set the status');
    await assert.rejects(db.query("insert into public.site_requests (name,email,subject,details) values ('','ada@example.com','Hi','x')"), /check constraint/i);
    await assert.rejects(db.query("insert into public.site_requests (name,email,subject,details) values ('Ada','nope','Hi','x')"), /check constraint/i);
    await assert.rejects(db.query(`insert into public.site_requests (name,email,subject,details) values ('Ada','a@b.co','Hi','${'x'.repeat(5001)}')`), /check constraint/i);
    await assert.rejects(insert('not-a-hash'), /check constraint/i);
    await db.exec('set role authenticated');
    await insert(sender);
    await assert.rejects(db.query('select * from public.site_requests'), /permission denied/i);
    await db.exec('set role anon');
    await insert(sender);
    await assert.rejects(insert(sender), /site_requests_rate_limited/, 'Three per sender per 10 minutes');
    await insert('b'.repeat(64)); // A different sender is unaffected.

    await db.exec('reset role');
    const rows = (await db.query('select status, created_at from public.site_requests')).rows;
    assert.equal(rows.length, 4);
    assert.ok(rows.every(row => row.status === 'new'));
    // Fill the hourly global cap from many senders, then confirm the next one is refused.
    await db.exec(`insert into public.site_requests (name,email,subject,details)
      select 'Bulk','bulk@example.com','Bulk','Bulk' from generate_series(1, 26)`);
    await db.exec('set role anon');
    await assert.rejects(insert('c'.repeat(64)), /site_requests_rate_limited: global/);
  } finally {
    await db.close();
  }
});
