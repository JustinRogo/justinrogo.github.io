import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { isPublicAddress, previewUrl, publicDestination, youtubeVideo, normalizeEmbed, serializeEmbeds, parseLinkMetadata, readPreviewResource, fetchLinkPreview } from '../lib/link-previews.mjs';
import { cleanBody, normalizePost, publicPost, makeFeed } from '../lib/updates.mjs';

const publicDns = async () => [{ address:'8.8.8.8', family:4 }];
const link = { kind:'link', url:'https://example.com/article', title:'A useful article', description:'A short summary.', image:'https://example.com/image.png' };

test('preview destinations exclude local, private, reserved and disguised addresses', async () => {
  for (const address of ['0.0.0.0','10.0.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','198.18.0.1','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::']) assert.equal(isPublicAddress(address), false, address);
  for (const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111']) assert.equal(isPublicAddress(address), true, address);
  for (const url of ['http://example.com','file:///etc/passwd','https://127.1/','https://2130706433/','https://[::1]/','https://user:pass@example.com/','https://example.com:8443','https://localhost/','https://private.local/']) assert.throws(() => previewUrl(url), undefined, url);
  await assert.rejects(publicDestination('https://example.com', async () => [{ address:'8.8.8.8', family:4 }, { address:'10.0.0.1', family:4 }]), /public HTTPS/);
});

test('YouTube links recognize known URL forms and preserve a bounded start position', () => {
  for (const url of ['https://www.youtube.com/watch?v=M7lc1UVf-VE','https://youtu.be/M7lc1UVf-VE','https://youtube.com/shorts/M7lc1UVf-VE','https://youtube.com/live/M7lc1UVf-VE','https://www.youtube-nocookie.com/embed/M7lc1UVf-VE']) assert.equal(youtubeVideo(url)?.id, 'M7lc1UVf-VE');
  assert.equal(youtubeVideo('https://youtu.be/M7lc1UVf-VE?t=1m30s').start, 90);
  assert.equal(youtubeVideo('https://youtu.be/M7lc1UVf-VE?start=999999').start, 86400);
  for (const url of ['https://youtube.com.evil.com/watch?v=M7lc1UVf-VE','https://evil.com/embed/M7lc1UVf-VE','https://youtube.com/watch?v=bad','javascript:alert(1)']) assert.equal(youtubeVideo(url), null);
});

test('preview metadata prefers Open Graph, decodes text and resolves safe relative images', () => {
  const meta = parseLinkMetadata(`<html><head><title>Fallback &amp; title</title><meta content="Preferred &amp; title" property="og:title"><meta name="description" content="A description."><meta property="og:image" content="/thumb.png"></head></html>`, 'https://example.com/article');
  assert.equal(meta.title, 'Preferred & title');
  assert.equal(meta.description, 'A description.');
  assert.equal(meta.image, 'https://example.com/thumb.png');
  assert.equal(parseLinkMetadata('<title>Fallback &amp; title</title>', 'https://example.com').title, 'Fallback & title');
  assert.equal(parseLinkMetadata('<meta property="og:image" content="javascript:alert(1)">', 'https://example.com').image, '');
});

function transport(responseFor, observe = () => {}) {
  return (url, options, callback) => {
    observe(url, options);
    const req = new EventEmitter();
    req.destroy = () => {};
    req.end = () => queueMicrotask(() => {
      const data = responseFor(url);
      const response = Readable.from([Buffer.from(data.body || '')]);
      response.statusCode = data.status || 200;
      response.headers = { 'content-type':'text/html; charset=utf-8', ...data.headers };
      callback(response);
    });
    return req;
  };
}
test('metadata requests pin validated DNS and reject private redirects before connecting', async () => {
  let requests = 0;
  const options = { resolve:publicDns, request:transport(() => ({ status:302, headers:{ location:'https://127.0.0.1/private' } }), (_url, config) => {
    requests++;
    config.lookup('example.com', { all:true }, (error, addresses) => { assert.equal(error, null); assert.equal(addresses[0].address, '8.8.8.8'); });
  }) };
  await assert.rejects(readPreviewResource('https://example.com', options), /public HTTPS/);
  assert.equal(requests, 1);
  const result = await readPreviewResource('https://example.com', { resolve:publicDns, request:transport(() => ({ body:'<title>Public page</title>' })) });
  assert.equal(result.body, '<title>Public page</title>');
});
test('metadata requests enforce response type and size bounds', async () => {
  for (const data of [{ headers:{ 'content-type':'application/octet-stream' }, body:'binary' }, { body:'x'.repeat(512*1024+1) }]) {
    await assert.rejects(readPreviewResource('https://example.com', { resolve:publicDns, request:transport(() => data) }));
  }
});
test('blocked or unavailable metadata becomes a simple card, while YouTube uses oEmbed', async () => {
  const fallback = await fetchLinkPreview('https://example.com', async () => { throw new Error('Blocked'); }, publicDns);
  assert.equal(fallback.fallback, true); assert.equal(fallback.preview.title, 'example.com');
  const video = await fetchLinkPreview('https://youtu.be/M7lc1UVf-VE', async url => {
    assert.match(url, /^https:\/\/www\.youtube\.com\/oembed\?/);
    return { body:JSON.stringify({ title:'Video title', author_name:'Video creator' }) };
  }, publicDns);
  assert.equal(video.preview.kind, 'youtube'); assert.equal(video.preview.title, 'Video title');
  assert.match(video.preview.image, /^https:\/\/i\.ytimg\.com\//);
});
test('saved previews survive sanitization and RSS without allowing arbitrary iframe HTML', () => {
  const video = { kind:'youtube', url:'https://youtu.be/M7lc1UVf-VE?t=90', title:'A video', image:'' };
  const post = normalizePost({ title:'An update', body:'<p>Text before previews.</p><iframe src="https://evil.com"></iframe>', embeds:[link,video], status:'published' });
  assert.match(post.body, /data-update-embed="link"/);
  assert.match(post.body, /data-update-embed="youtube"/);
  assert.doesNotMatch(post.body, /iframe|evil\.com/);
  assert.equal(publicPost(post).body, post.body);
  const feed = makeFeed([{ ...post, id:'example', published_at:'2026-10-23T12:00:00Z' }], 'https://justinrogo.vercel.app');
  assert.match(feed, /https:\/\/youtu.be\/M7lc1UVf-VE\?t=90/);
  assert.doesNotMatch(feed, /<iframe/);
  assert.throws(() => serializeEmbeds(Array(5).fill(link)), /up to 4/);
  assert.throws(() => normalizeEmbed({ kind:'youtube', url:'https://evil.com/watch?v=M7lc1UVf-VE' }), /YouTube/);
  assert.doesNotMatch(cleanBody('<figure data-update-embed="youtube" data-url="https://evil.com"><a href="https://evil.com">Fake player</a></figure>'), /figure/);
});
test('preview metadata is stored as escaped text rather than executable markup', () => {
  const html = cleanBody(serializeEmbeds([{ ...link, title:'"><img src=x onerror=alert(1)>', image:'javascript:alert(1)' }]));
  assert.doesNotMatch(html, /<img|javascript:/);
  assert.match(html, /&lt;img/);
  assert.equal(normalizeEmbed({ ...link, image:'https://127.0.0.1/image' }).image, '');
});
