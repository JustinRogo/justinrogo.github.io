import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseAiCorner, refreshAiCorner } from '../scripts/update-ai-corner.mjs';

function item(day, title = `Post ${day} &amp; AI`, description = 'Summary &amp; details.') {
  const link = `https://justinrogo.vercel.app/updates?post=${day}`;
  return `<item><title>${title}</title><link>${link}</link><guid isPermaLink="true">${link}</guid>
    <pubDate>${new Date(`2026-10-${day}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${description}</description><content:encoded>&lt;p&gt;Body&lt;/p&gt;</content:encoded></item>`;
}
const rss = body => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>${body}</channel></rss>`;
const goodResponse = body => async () => ({ ok: true, text: async () => body });

test('Updates RSS decodes entities, drops a repeated title from the summary and keeps the three newest posts', () => {
  const posts = parseAiCorner(rss(item('20') + item('21') + item('23', 'Billable hours', 'Billable hours Nearly 90% &lt;b&gt;use&lt;/b&gt; AI') + item('22')));
  assert.equal(posts.length, 3);
  assert.equal(posts[0].title, 'Billable hours');
  assert.equal(posts[0].summary, 'Nearly 90% use AI');
  assert.equal(posts[1].title, 'Post 22 & AI');
  assert.equal(posts[1].summary, 'Summary & details.');
  assert.equal(posts[2].link, 'https://justinrogo.vercel.app/updates?post=21');
});

test('invalid feeds or posts are rejected', () => {
  for (const xml of ['<html>Blocked</html>', rss(''), rss(item('23')).replace('</rss>', ''),
    rss(item('23').replace('https://justinrogo.vercel.app/updates?post=23</link>', 'javascript:alert(1)</link>'))]) {
    assert.throws(() => parseAiCorner(xml));
  }
});

test('refresh writes the snapshot and keeps the saved file when the feed fails', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ai-corner-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'ai-corner.json');
  await assert.rejects(refreshAiCorner({ output, fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/);
  const snapshot = await refreshAiCorner({ output, fetchImpl: goodResponse(rss(item('23'))),
    now: () => new Date('2026-11-08T12:00:00Z') });
  const saved = await readFile(output, 'utf8');
  assert.deepEqual(JSON.parse(saved), snapshot);
  assert.equal(snapshot.generatedAt, '2026-11-08T12:00:00.000Z');
  for (const fetchImpl of [async () => ({ ok: false, status: 503 }),
    async () => { throw new Error('Timed out'); }, goodResponse('<html>Challenge</html>')]) {
    assert.deepEqual(await refreshAiCorner({ output, fetchImpl }), snapshot);
    assert.equal(await readFile(output, 'utf8'), saved);
  }
});
