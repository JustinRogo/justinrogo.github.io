import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://library.law.uconn.edu/category/blog/feed/';
const OUTPUT = fileURLToPath(new URL('../data/pocket-part.json', import.meta.url));
const ITEM_LIMIT = 4;

function decodeXml(value) {
  const named = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|quot);/gi, (entity, name) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()];
    const code = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
  });
}

// Read the fields in WordPress RSS items, keeping CDATA HTML intact for the
// widget's existing text/excerpt handling. CDATA is masked before reading tags.
function field(item, name) {
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

function validSnapshot(snapshot) {
  return snapshot.schemaVersion === 1 && snapshot.sourceUrl === SOURCE_URL &&
    Array.isArray(snapshot.items) && snapshot.items.length > 0 &&
    snapshot.items.every(item => item && typeof item.title === 'string' && item.title.trim() &&
      httpsUrl(item.link) && !Number.isNaN(Date.parse(item.pubDate)));
}

export async function refreshPocketPart({ output = OUTPUT, fetchImpl = fetch, now = () => new Date() } = {}) {
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
      items: parsePocketPart(await response.text()),
    };
  } catch (error) {
    let existing;
    try { existing = JSON.parse(await readFile(output, 'utf8')); } catch { /* No usable saved feed. */ }
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
