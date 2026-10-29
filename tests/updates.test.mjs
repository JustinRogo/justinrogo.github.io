import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cleanBody, normalizePost, publicPost, makeFeed, isPublishableKey } from '../lib/updates.mjs';
import handler from '../api/updates.mjs';

const id = '10000000-0000-4000-8000-000000000001';
const published = { id, title: 'An update <&> "quoted"', body: '<h2>News</h2><p>Good <strong>text</strong> &amp; links.</p>', excerpt: 'A <short> & useful preview', status: 'published', published_at: '2026-10-23T12:00:00Z', author_id: 'private-author-id' };

test('the API starts when the runtime cannot require ES modules', () => {
  // Vercel's function loader rejects CommonJS require(ESM), even though newer
  // local Node versions allow it. Exercise startup before any request handler runs.
  const result = execFileSync(process.execPath, [
    '--no-experimental-require-module', '--input-type=module', '-e',
    `delete process.env.SUPABASE_URL;
     delete process.env.SUPABASE_PUBLISHABLE_KEY;
     const { default: handler } = await import('./api/updates.mjs');
     const response = {
       setHeader() {},
       status(code) { this.code = code; return this; },
       json(body) { console.log(JSON.stringify({ status: this.code, ...body })); }
     };
     await handler({ url: '/api/updates?action=config', method: 'GET', headers: {} }, response);`
  ], { encoding: 'utf8', cwd: new URL('..', import.meta.url) });
  assert.deepEqual(JSON.parse(result), { status: 200, configured: false });
});

test('rich text survives, active content and unsafe image/link schemes do not', () => {
  const html = cleanBody('<h2>Heading</h2><ul><li>First</li></ul><p onclick="steal()">Hi<script>steal()</script><iframe src="https://bad.example"></iframe><a href="javascript:steal()">unsafe</a><a href="https://example.com">safe</a><img src="data:image/svg+xml,bad" onerror="steal()"><img src="https://example.com/a.png" alt="Picture"></p>');
  assert.match(html, /<h2>Heading<\/h2>/);
  assert.match(html, /<ul><li>First<\/li><\/ul>/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /src="https:\/\/example.com\/a.png"/);
  assert.doesNotMatch(html, /steal|javascript:|data:|onclick|onerror|iframe|script/);
});

test('post validation rejects empty, oversized and unknown publication states', () => {
  for (const value of [
    { title: '', body: '<p>Hi</p>', status: 'published' },
    { title: 'Hello', body: '<p><br></p>', status: 'draft' },
    { title: 'Hello', body: '<script>alert(1)</script>', status: 'published' },
    { title: 'Hello', body: 'x'.repeat(100001), status: 'published' },
    { title: 'Hello', body: '<p>Hi</p>', status: 'secret' }
  ]) assert.throws(() => normalizePost(value));
  const post = normalizePost({ title: ' A title ', body: '<p>First</p><p>Second</p>', status: 'draft', author_id: 'attacker', published_at: 'yesterday' });
  assert.equal(post.title, 'A title');
  assert.match(post.excerpt, /First Second/);
  assert.equal(post.author_id, undefined);
  assert.equal(post.published_at, undefined);
  assert.equal(normalizePost({ title: 'Text', body: '<p>A&nbsp;note &amp; a &#8220;quote&#8221;.</p>', status: 'draft' }).excerpt, 'A note & a “quote”.');
});

test('public serialization removes author identity and sanitizes database content', () => {
  const post = publicPost({ ...published, body: '<img src="https://example.com/a.png" onerror="alert(1)">' });
  assert.equal(post.author_id, undefined);
  assert.doesNotMatch(post.body, /onerror/);
});

test('RSS includes published posts only, stable links, real dates and valid escaped XML', () => {
  const feed = makeFeed([
    { ...published, status: 'draft', title: 'PRIVATE DRAFT' },
    { ...published, id: 'newer', title: 'Newest', published_at: '2026-10-24T12:00:00Z' },
    published
  ], 'https://justinrogo.vercel.app/ignored');
  assert.doesNotMatch(feed, /PRIVATE DRAFT|private-author-id/);
  assert.match(feed, /https:\/\/justinrogo.vercel.app\/updates\?post=10000000/);
  assert.match(feed, /Fri, 23 Oct 2026 12:00:00 GMT/);
  assert.ok(feed.indexOf('Newest') < feed.indexOf('An update'));
  assert.match(feed, /An update &lt;&amp;&gt; &quot;quoted&quot;/);
  // Parse with the platform XML parser, independently of the serializer.
  const result = execFileSync('python', ['-c', 'import sys,xml.etree.ElementTree as E; r=E.fromstring(sys.stdin.read()); print(len(r.findall("./channel/item")))'], { input: feed, encoding: 'utf8' });
  assert.equal(result.trim(), '2');
});

test('service keys cannot be exposed by the public configuration endpoint', async () => {
  const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(isPublishableKey(jwt('anon')), true);
  assert.equal(isPublishableKey(jwt('service_role')), false);
  assert.equal(isPublishableKey('sb_secret_super-secret'), false);
  assert.equal(isPublishableKey('sb_publishable_public-key'), true);
  const response = await request('/api/updates?action=config', { key: jwt('service_role') });
  assert.deepEqual(response.body, { configured: false });
});

async function request(url, { method = 'GET', token, body, key = 'sb_publishable_test', fetcher, configured = true } = {}) {
  const saved = { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_PUBLISHABLE_KEY, fetch: globalThis.fetch };
  if (configured) { process.env.SUPABASE_URL = 'https://updates-test.supabase.co'; process.env.SUPABASE_PUBLISHABLE_KEY = key; }
  else { delete process.env.SUPABASE_URL; delete process.env.SUPABASE_PUBLISHABLE_KEY; }
  globalThis.fetch = fetcher || (() => { throw new Error('Unexpected network call'); });
  const response = { headers: {}, statusCode: 200, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, send(value) { this.body = value; return this; } };
  try { await handler({ url, method, headers: token ? { authorization: `Bearer ${token}` } : {}, body }, response); }
  finally {
    if (saved.url === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = saved.url;
    if (saved.key === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY; else process.env.SUPABASE_PUBLISHABLE_KEY = saved.key;
    globalThis.fetch = saved.fetch;
  }
  return response;
}
function mockSupabase({ author = false } = {}) {
  return async (input, options = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    if (url.pathname === '/auth/v1/user') return Response.json({ id, email: 'reader@example.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-10-01T00:00:00Z' });
    if (url.pathname === '/rest/v1/rpc/updates_is_author') return Response.json(author);
    if (url.pathname === '/rest/v1/updates_posts' && (!options.method || options.method === 'GET')) {
      assert.equal(url.searchParams.get('status'), 'eq.published');
      return Response.json([published]);
    }
    throw new Error(`Unexpected Supabase operation: ${options.method || 'GET'} ${url.pathname}`);
  };
}

test('unconfigured requests fail closed without making network calls', async () => {
  const result = await request('/api/updates', { configured: false });
  assert.equal(result.statusCode, 503);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('anonymous publishing and moderation are denied before database access', async () => {
  for (const [action, method] of [['posts', 'POST'], ['posts', 'PATCH'], ['posts', 'DELETE'], ['moderation', 'GET'], ['drafts', 'GET'], ['comments', 'POST'], ['preview', 'POST']]) {
    const result = await request(`/api/updates?action=${action}`, { method, body: {} });
    assert.equal(result.statusCode, 401, `${action} ${method}`);
  }
});
test('a signed-in reader still cannot publish or moderate', async () => {
  for (const action of ['posts', 'moderation']) {
    const result = await request(`/api/updates?action=${action}`, { method: 'POST', token: 'reader-token', body: { title: 'Unauthorized' }, fetcher: mockSupabase() });
    assert.equal(result.statusCode, action === 'moderation' ? 405 : 403);
  }
  const moderation = await request('/api/updates?action=moderation', { token: 'reader-token', fetcher: mockSupabase() });
  assert.equal(moderation.statusCode, 403);
  const preview = await request('/api/updates?action=preview', { method:'POST', token:'reader-token', body:{ url:'https://example.com/' }, fetcher:mockSupabase() });
  assert.equal(preview.statusCode, 403);
});
test('public feed requests explicitly filter drafts and return sanitized posts', async () => {
  const result = await request('/api/updates?action=posts', { fetcher: mockSupabase() });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.posts.length, 1);
  assert.equal(result.body.posts[0].author_id, undefined);
});

test('comment submissions publish immediately using the authenticated identity', async () => {
  const auth = mockSupabase();
  const result = await request('/api/updates?action=comments', {
    method: 'POST', token: 'reader-token',
    body: { post_id: id, author_name: ' Reader ', body: ' A comment ', status: 'pending', user_id: 'spoofed-user' },
    fetcher: async (input, options = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      if (url.pathname !== '/rest/v1/updates_comments') return auth(input, options);
      assert.equal(options.method, 'POST');
      const saved = JSON.parse(options.body);
      assert.deepEqual(saved, { post_id: id, user_id: id, author_name: 'Reader', body: 'A comment', status: 'approved' });
      return Response.json({ ...saved, id: 'new-comment', created_at: '2026-10-29T12:00:00Z' }, { status: 201 });
    }
  });
  assert.equal(result.statusCode, 201);
  assert.equal(result.body.comment.status, 'approved');
});
test('invalid post links and unsupported methods return clear errors', async () => {
  const invalid = await request('/api/updates?action=posts&id=not-a-uuid');
  assert.equal(invalid.statusCode, 400);
  const method = await request('/api/updates?action=feed', { method: 'DELETE' });
  assert.equal(method.statusCode, 405);
});
