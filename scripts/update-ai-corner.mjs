import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeXml, field } from './update-pocket-part.mjs';

// AI Corner posts come from the Updates app on the Vercel deployment. Its feed
// has no CORS header, so builds save a snapshot the homepage reads locally.
const SOURCE_URL = 'https://justinrogo.vercel.app/updates/feed.xml';
const OUTPUT = fileURLToPath(new URL('../data/ai-corner.json', import.meta.url));
const ITEM_LIMIT = 3;

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

const plainText = value => decodeXml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parseAiCorner(xml) {
  if (!/<rss\b/i.test(xml) || !/<\/rss\s*>\s*$/i.test(xml.trim())) {
    throw new Error('The AI Corner response is not a complete RSS feed.');
  }
  const items = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)) {
    const title = field(match[1], 'title');
    const link = httpsUrl(field(match[1], 'link'));
    const date = new Date(field(match[1], 'pubDate'));
    if (!title || !link || Number.isNaN(date.getTime())) continue;
    // Excerpts of link-first posts repeat the title, which the widget already shows.
    let summary = plainText(field(match[1], 'description'));
    if (summary.startsWith(title)) summary = summary.slice(title.length).trim();
    items.push({ title, link, pubDate: date.toISOString(), summary });
  }
  items.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  if (!items.length) throw new Error('No valid AI Corner posts were found.');
  return items.slice(0, ITEM_LIMIT);
}

function validSnapshot(snapshot) {
  return snapshot.schemaVersion === 1 && snapshot.sourceUrl === SOURCE_URL &&
    Array.isArray(snapshot.items) && snapshot.items.length > 0 &&
    snapshot.items.every(item => item && typeof item.title === 'string' && item.title.trim() &&
      httpsUrl(item.link) && !Number.isNaN(Date.parse(item.pubDate)));
}

export async function refreshAiCorner({ output = OUTPUT, fetchImpl = fetch, now = () => new Date() } = {}) {
  let existing;
  try { existing = JSON.parse(await readFile(output, 'utf8')); } catch { /* No saved feed yet. */ }
  let snapshot;
  try {
    const response = await fetchImpl(SOURCE_URL, {
      headers: { accept: 'application/rss+xml, application/xml', 'user-agent': 'justinrogo.github.io AI Corner feed/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Feed request failed: ${response.status}`);
    snapshot = { schemaVersion: 1, generatedAt: now().toISOString(), sourceUrl: SOURCE_URL, items: parseAiCorner(await response.text()) };
  } catch (error) {
    if (!existing || !validSnapshot(existing)) throw error;
    console.warn(`AI Corner refresh failed; preserving the saved posts: ${error.message}`);
    return existing;
  }

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(`${output}.tmp`, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(`${output}.tmp`, output);
  console.log(`Wrote ${snapshot.items.length} AI Corner posts to ${output}`);
  return snapshot;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await refreshAiCorner();
}
