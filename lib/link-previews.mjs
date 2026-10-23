import https from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import sanitizeHtml from './generated/sanitize-html.cjs';
import { decodeHTML } from 'entities';

export const MAX_EMBEDS = 4;
const denied = new BlockList();
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) denied.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]]) denied.addSubnet(address, prefix, 'ipv6');
const globalV6 = new BlockList(); globalV6.addSubnet('2000::', 3, 'ipv6');
export function isPublicAddress(address) {
  const family = isIP(address);
  return family === 4 ? !denied.check(address, 'ipv4') : family === 6 && globalV6.check(address, 'ipv6') && !denied.check(address, 'ipv6');
}
export function previewUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Enter a valid HTTPS link.');
  let url;
  try { url = new URL(value); } catch { throw new Error('Enter a valid HTTPS link.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !host
    || /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(host)
    || (!isIP(host) && !host.includes('.')) || (isIP(host) && !isPublicAddress(host))) {
    throw new Error('Previews support public HTTPS websites only.');
  }
  return url;
}
export async function publicDestination(value, resolve = lookup) {
  const url = previewUrl(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  let timer;
  let addresses;
  try {
    addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await Promise.race([
      resolve(host, { all:true, verbatim:true }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('The website address took too long to resolve.')), 4000); })
    ]);
  } finally { clearTimeout(timer); }
  if (!addresses.length || addresses.some(result => !isPublicAddress(result.address))) throw new Error('Previews support public HTTPS websites only.');
  return { url, address: addresses[0] };
}
export function youtubeVideo(value) {
  let url;
  try { url = previewUrl(value); } catch { return null; }
  const host = url.hostname.toLowerCase();
  let id;
  if (host === 'youtu.be') id = url.pathname.split('/')[1];
  else if (['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com','youtube-nocookie.com'].includes(host)) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(?:shorts|live|embed)\//.test(url.pathname)) id = url.pathname.split('/')[2];
  }
  if (!/^[\w-]{11}$/.test(id || '')) return null;
  const raw = url.searchParams.get('t') || url.searchParams.get('start') || '';
  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(raw);
  const start = Math.min(86400, Math.max(0, /^\d+$/.test(raw) ? Number(raw) : parts ? Number(parts[1] || 0)*3600 + Number(parts[2] || 0)*60 + Number(parts[3] || 0) : 0));
  return { id, start };
}
const text = (value, max) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
export function normalizeEmbed(value) {
  if (!value || !['link','youtube'].includes(value.kind)) throw new Error('Choose a link card or a YouTube video.');
  const url = previewUrl(value.url);
  const video = youtubeVideo(url.href);
  if (value.kind === 'youtube' && !video) throw new Error('Enter a YouTube video link.');
  let image = '';
  if (value.image) { try { image = previewUrl(value.image).href; } catch { /* An unsafe image never prevents a usable text card. */ } }
  return { kind: value.kind, url: url.href, title: text(value.title, 240) || (video ? 'YouTube video' : url.hostname), description: text(value.description, 360), image };
}
const escape = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
export function serializeEmbeds(values = []) {
  if (!Array.isArray(values) || values.length > MAX_EMBEDS) throw new Error(`Add up to ${MAX_EMBEDS} previews per post.`);
  return values.map(normalizeEmbed).map(embed => `<figure data-update-embed="${embed.kind}" data-url="${escape(embed.url)}" data-title="${escape(embed.title)}" data-description="${escape(embed.description)}" data-image="${escape(embed.image)}"><a href="${escape(embed.url)}" target="_blank" rel="noopener noreferrer"><strong>${escape(embed.title)}</strong></a></figure>`).join('');
}
export function embedAttributes(attrs) {
  try {
    const embed = normalizeEmbed({ kind: attrs['data-update-embed'], url: attrs['data-url'], title: attrs['data-title'], description: attrs['data-description'], image: attrs['data-image'] });
    return { 'data-update-embed': embed.kind, 'data-url': embed.url, 'data-title': embed.title, 'data-description': embed.description, 'data-image': embed.image };
  } catch { return {}; }
}

// Resolve and pin each connection to a validated public address. Redirect targets
// are independently checked, so neither redirects nor DNS rebinding reach private hosts.
export async function readPreviewResource(value, { resolve = lookup, request = https.request } = {}) {
  let current = value;
  for (let redirect = 0; redirect <= 3; redirect++) {
    const { url, address } = await publicDestination(current, resolve);
    const result = await new Promise((accept, reject) => {
      let settled = false; let timer;
      const finish = (error, result) => { if (settled) return; settled = true; clearTimeout(timer); error ? reject(error) : accept(result); };
      const req = request(url, {
        agent: false,
        headers: { 'User-Agent':'JustinRogowski-Updates/1.0 (link preview)', Accept:'text/html, application/xhtml+xml, application/json', 'Accept-Encoding':'identity' },
        lookup: (_host, options, done) => options.all ? done(null, [address]) : done(null, address.address, address.family)
      }, response => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume(); finish(null, { redirect: new URL(response.headers.location, url).href }); return;
        }
        if (response.statusCode !== 200 || !/^(?:text\/html|application\/(?:xhtml\+xml|json))(?:;|$)/i.test(response.headers['content-type'] || '') || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
          response.resume(); finish(new Error('This website did not provide preview information.')); return;
        }
        const chunks = []; let size = 0;
        response.on('data', chunk => {
          size += chunk.length;
          if (size > 512 * 1024) { finish(new Error('This website’s preview response was too large.')); response.destroy(); req.destroy(); return; }
          chunks.push(chunk);
        });
        response.on('error', error => finish(error));
        response.on('end', () => finish(null, { url: url.href, body: Buffer.concat(chunks).toString('utf8'), type: response.headers['content-type'] }));
      });
      timer = setTimeout(() => { finish(new Error('The website took too long to respond.')); req.destroy(); }, 6000);
      req.on('error', error => finish(error));
      req.end();
    });
    if (!result.redirect) return result;
    current = result.redirect;
  }
  throw new Error('The website redirected too many times.');
}
export function parseLinkMetadata(html, baseUrl) {
  const meta = new Map(); let pageTitle = '';
  sanitizeHtml(html, {
    allowedTags: ['title','meta'], allowedAttributes: { meta:['property','name','content'] },
    transformTags: { meta: (tag, attrs) => {
      const name = (attrs.property || attrs.name || '').toLowerCase();
      if (!meta.has(name) && attrs.content) meta.set(name, attrs.content);
      return { tagName:tag, attribs:{} };
    } },
    textFilter: (value, tag) => { if (tag === 'title') pageTitle += decodeHTML(value); return value; }
  });
  let image = '';
  try { const raw = meta.get('og:image:secure_url') || meta.get('og:image') || meta.get('twitter:image'); if (raw) image = previewUrl(new URL(raw, baseUrl).href).href; } catch { /* Text-only fallback. */ }
  return { title: meta.get('og:title') || meta.get('twitter:title') || pageTitle, description: meta.get('og:description') || meta.get('twitter:description') || meta.get('description'), image };
}
export async function fetchLinkPreview(value, read = readPreviewResource, resolve = lookup) {
  const url = previewUrl(value);
  // Validate the destination before the fallback catch: private destinations are
  // rejected, not treated as ordinary metadata failures.
  await publicDestination(url.href, resolve);
  const video = youtubeVideo(url.href);
  let details = video ? { image:`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` } : {}; let fallback = false;
  try {
    if (video) {
      const result = await read(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${video.id}`)}&format=json`, { resolve });
      const data = JSON.parse(result.body);
      details = { title:data.title, description:data.author_name ? `Video by ${data.author_name}` : '', image:`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` };
    } else {
      const result = await read(url.href, { resolve });
      details = parseLinkMetadata(result.body, result.url);
      fallback = !details.title;
    }
  } catch { fallback = true; }
  return { preview: normalizeEmbed({ kind:video ? 'youtube':'link', url:url.href, ...details }), fallback };
}
