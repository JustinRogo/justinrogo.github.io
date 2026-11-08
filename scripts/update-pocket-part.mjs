import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://library.law.uconn.edu/category/blog/feed/';
const OUTPUT = fileURLToPath(new URL('../data/pocket-part.json', import.meta.url));
const ITEM_LIMIT = 4;

export function decodeXml(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, name) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

// Read the fields in WordPress RSS items, keeping CDATA HTML intact for the
// widget's existing text/excerpt handling. CDATA is masked before reading tags.
export function field(item, name) {
  const cdata = [];
  const masked = item.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, value) => `\0${cdata.push(value) - 1}\0`);
  const value = masked.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}\\s*>`, 'i'))?.[1] || '';
  return value.split(/(\0\d+\0)/).map(part => /^\0\d+\0$/.test(part)
    ? cdata[Number(part.slice(1, -1))]
    : decodeXml(part)).join('').trim();
}

function httpsUrl(value, base = SOURCE_URL) {
  try {
    const url = new URL(value, base);
    return value && url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function parsePocketPart(xml) {
  if (!/<rss\b/i.test(xml) || !/<\/rss\s*>\s*(?:<!--[\s\S]*?-->\s*)*$/i.test(xml.trim())) {
    throw new Error('The Pocket Part response is not a complete RSS feed.');
  }
  // Mask CDATA so article HTML cannot be mistaken for RSS item boundaries.
  const cdata = [];
  const masked = xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, value) => `\0${cdata.push(value) - 1}\0`);
  const items = [];
  for (const match of masked.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)) {
    const item = match[1].replace(/\0(\d+)\0/g, (_, index) => `<![CDATA[${cdata[Number(index)]}]]>`);
    const title = field(item, 'title');
    const link = httpsUrl(field(item, 'link'));
    const date = new Date(field(item, 'pubDate'));
    if (!title || !link || Number.isNaN(date.getTime())) continue;
    const description = field(item, 'description');
    const content = field(item, 'content:encoded') || description;
    const image = content.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i)?.[2] || '';
    items.push({ title, link, pubDate: date.toISOString(), description, thumbnail: httpsUrl(decodeXml(image)) });
  }
  items.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  if (!items.length) throw new Error('No valid Pocket Part posts were found.');
  return items.slice(0, ITEM_LIMIT);
}

// WordPress's featured image is often absent from its RSS article body.
export function featuredImage(html, base) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = Object.fromEntries([...tag[0].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)]
      .map((match) => [match[1].toLowerCase(), decodeXml(match[3])]));
    if (/^(og:image|twitter:image)$/i.test(attributes.property || attributes.name || "")) {
      const image = httpsUrl(attributes.content, base);
      if (image) return image;
    }
  }
  return '';
}

async function withFeaturedImage(post, fetchImpl, saved) {
  // Metadata requests stay on the blog origin; the browser uses only the saved snapshot.
  if (new URL(post.link).origin !== new URL(SOURCE_URL).origin) return post;
  try {
    const response = await fetchImpl(post.link, {
      headers: { accept: 'text/html', 'user-agent': 'justinrogo.github.io Pocket Part feed/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Post request failed: ${response.status}`);
    const image = featuredImage(await response.text(), post.link);
    return { ...post, thumbnail: image || post.thumbnail };
  } catch {
    return { ...post, thumbnail: post.thumbnail || httpsUrl(saved?.thumbnail) };
  }
}

function validSnapshot(snapshot) {
  return snapshot.schemaVersion === 1 && snapshot.sourceUrl === SOURCE_URL &&
    Array.isArray(snapshot.items) && snapshot.items.length > 0 &&
    snapshot.items.every(item => item && typeof item.title === 'string' && item.title.trim() &&
      httpsUrl(item.link) && !Number.isNaN(Date.parse(item.pubDate)));
}

export async function refreshPocketPart({ output = OUTPUT, fetchImpl = fetch, now = () => new Date() } = {}) {
  let existing;
  try { existing = JSON.parse(await readFile(output, 'utf8')); } catch { /* No saved feed yet. */ }
  const savedItems = Array.isArray(existing?.items) ? existing.items : [];
  let snapshot;
  try {
    const response = await fetchImpl(SOURCE_URL, {
      headers: { accept: 'application/rss+xml, application/xml', 'user-agent': 'justinrogo.github.io Pocket Part feed/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
    snapshot = {
      schemaVersion: 1,
      generatedAt: now().toISOString(),
      sourceUrl: SOURCE_URL,
      items: await Promise.all(parsePocketPart(await response.text()).map(post =>
        withFeaturedImage(post, fetchImpl, savedItems.find(item => item?.link === post.link)))),
    };
  } catch (error) {
    if (!existing || !validSnapshot(existing)) throw error;
    console.warn(`Pocket Part refresh failed; preserving the saved posts: ${error.message}`);
    return existing;
  }

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(`${output}.tmp`, output);
  console.log(`Wrote ${snapshot.items.length} Pocket Part posts to ${output}`);
  return snapshot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await refreshPocketPart();
}
