import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { parsePocketPart, refreshPocketPart } from '../scripts/update-pocket-part.mjs';

function item(day, extra = '') {
  return `<item><title>Post ${day} &amp; news &#8217;</title>
    <link>https://library.law.uconn.edu/post-${day}/</link>
    <pubDate>${new Date(`2026-10-${day}T12:00:00Z`).toUTCString()}</pubDate>
    <description><![CDATA[<p>Summary &amp; details.</p>]]></description>${extra}</item>`;
}
const rss = body => `<?xml version="1.0"?><rss version="2.0"><channel>${body}</channel></rss>`;
const goodResponse = body => async () => ({ ok: true, text: async () => body });

test('WordPress RSS preserves CDATA, decodes XML, extracts images and returns the four newest posts', () => {
  const xml = rss(item('20') + item('21') + item('22') + item('23') + item('24',
    `<content:encoded><![CDATA[<p>An example <item>fake</item> inside HTML.</p><img src="https://example.com/photo.jpg?a=1&amp;b=2">]]></content:encoded>`));
  const posts = parsePocketPart(`${xml}\n<!-- Performance optimized by W3 Total Cache. -->`);
  assert.equal(posts.length, 4);
  assert.equal(posts[0].title, 'Post 24 & news ’');
  assert.equal(posts[0].pubDate, '2026-10-24T12:00:00.000Z');
  assert.equal(posts[0].description, '<p>Summary &amp; details.</p>');
  assert.equal(posts[0].thumbnail, 'https://example.com/photo.jpg?a=1&b=2');
  assert.equal(posts[3].link, 'https://library.law.uconn.edu/post-21/');
  assert.equal(posts[3].thumbnail, '');
});

test('invalid feeds or posts cannot replace the saved feed', () => {
  for (const xml of ['<html>Blocked</html>', rss(''), rss(item('23')).replace('</rss>', ''),
    rss(item('23').replace('https://library.law.uconn.edu/post-23/', 'javascript:alert(1)')),
    rss(item('23').replace('Fri, 23 Oct 2026 12:00:00 GMT', 'not a date'))]) {
    assert.throws(() => parsePocketPart(xml));
  }
});

test('refresh writes current posts and preserves the exact saved file on HTTP, network and parse failures', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pocket-part-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'posts.json');
  const snapshot = await refreshPocketPart({ output, fetchImpl: goodResponse(rss(item('23'))),
    now: () => new Date('2026-10-26T12:00:00Z') });
  const saved = await readFile(output, 'utf8');
  assert.deepEqual(JSON.parse(saved), snapshot);
  assert.equal(snapshot.generatedAt, '2026-10-26T12:00:00.000Z');
  for (const fetchImpl of [async () => ({ ok: false, status: 503 }),
    async () => { throw new Error('Timed out'); }, goodResponse('<html>Challenge</html>'), goodResponse(rss(''))]) {
    assert.deepEqual(await refreshPocketPart({ output, fetchImpl }), snapshot);
    assert.equal(await readFile(output, 'utf8'), saved);
  }
});

test('refresh fails visibly when no valid saved feed exists', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pocket-part-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'posts.json');
  const fetchImpl = async () => ({ ok: false, status: 503 });
  await assert.rejects(refreshPocketPart({ output, fetchImpl }), /503/);
  for (const saved of ['not JSON', JSON.stringify({ schemaVersion: 1, sourceUrl: 'https://library.law.uconn.edu/category/blog/feed/', items: [null] })]) {
    await writeFile(output, saved);
    await assert.rejects(refreshPocketPart({ output, fetchImpl }), /503/);
  }
});

// Exercise the actual widget with a small DOM substitute, including its async
// fetch/render flow, so changing from RSS2JSON cannot silently break rendering.
test('homepage widget renders the local snapshot and retains its error fallback', async () => {
  const main = await readFile(new URL('../main.js', import.meta.url), 'utf8');
  const start = main.indexOf('(function initPocketPart()');
  const widget = main.slice(start, main.indexOf('\n})();', start) + '\n})();'.length);
  const node = () => ({ children: [], classList: { add() {} }, append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; }, setAttribute() {} });
  for (const succeeds of [true, false]) {
    const container = node();
    const posts = parsePocketPart(rss(item('23') + item('22')));
    const context = {
      document: { getElementById: () => container, createElement: node },
      DOMParser: class { parseFromString(html) { return { body: { textContent: html.replace(/<[^>]*>/g, '') }, querySelector: () => null }; } },
      fetch: async (url, options) => {
        assert.equal(url, 'data/pocket-part.json');
        assert.equal(options.cache, 'no-cache');
        return { ok: succeeds, status: succeeds ? 200 : 404, json: async () => ({ schemaVersion: 1, items: posts }) };
      },
      Intl, Date,
    };
    vm.runInNewContext(widget, context);
    await new Promise(resolve => setImmediate(resolve));
    if (succeeds) {
      assert.equal(container.children[0].className, 'pocket-part-widget__featured');
      assert.equal(container.children[1].children.length, 1);
    } else {
      assert.match(container.children[0].children[0], /temporarily unavailable/);
    }
  }
});
