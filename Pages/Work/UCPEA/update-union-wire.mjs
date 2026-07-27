import { access, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const SOURCE_URL = 'https://ucpea.ct.aft.org/union-wire';
const OUTPUT = fileURLToPath(new URL('./union-wire.json', import.meta.url));
const USER_AGENT = 'justinrogo.github.io UCPEA Union Wire feed/1.0';
const ITEM_LIMIT = 9;

function decodeEntities(value = '') {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
    rsquo: '’',
    lsquo: '‘',
    rdquo: '”',
    ldquo: '“',
    ndash: '–',
    mdash: '—',
  };

  return value
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/&#(\d+);/g, (match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function textOnly(value = '') {
  return decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  );
}

function categoryFor(title, excerpt) {
  const text = `${title} ${excerpt}`.toLowerCase();
  if (/\bcontract\b|\barticle\s+\d+|\bsalary\b|\bwage\b|\bgrievance\b/.test(text)) return 'contract';
  if (/professional development|hardship|scholarship|tuition|childcare|sick bank|\bbenefit\b|\bfund\b|\bapplication\b/.test(text)) return 'benefits';
  return 'community';
}

function visualFor(title, category) {
  const article = title.match(/\bArticle\s+(\d+)/i)?.[1];
  if (article) return { label: 'Article', value: article };
  if (/professional development/i.test(title)) return { label: 'Member benefit', value: 'PD' };
  if (/book club/i.test(title)) return { label: 'Community', value: 'BOOK' };
  if (/produce|craft swap/i.test(title)) return { label: 'Community', value: 'SWAP' };
  if (/hardship/i.test(title)) return { label: 'Member support', value: 'HELP' };
  if (/award/i.test(title)) return { label: 'Recognition', value: '★' };
  return {
    label: category === 'contract' ? 'Contract' : category === 'benefits' ? 'Benefits' : 'Union Wire',
    value: 'UW',
  };
}

function parseUnionWire(html) {
  const chunks = html.split(
    /<div\b[^>]*class=["'][^"']*\bteaser\b[^"']*\bteaser--image_first\b[^"']*["'][^>]*>/i
  ).slice(1);
  const items = [];
  const seen = new Set();

  for (const chunk of chunks) {
    const linkMatch = chunk.match(
      /<a\b[^>]*class=["'][^"']*\bh2__link\b[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i
    );
    if (!linkMatch) continue;

    const url = new URL(decodeEntities(linkMatch[1]), SOURCE_URL).href;
    if (seen.has(url)) continue;

    const title = textOnly(linkMatch[2]);
    const body = chunk.match(
      /<div\b[^>]*class=["'][^"']*\bteaser__body\b[^"']*["'][^>]*>([\s\S]*?)<a\b[^>]*class=["'][^"']*\bteaser\b[^"']*["']/i
    )?.[1] ?? '';
    const excerpt = textOnly(body);
    if (!title || !excerpt) continue;

    const category = categoryFor(title, excerpt);
    const visual = visualFor(title, category);
    items.push({
      title,
      url,
      excerpt,
      category,
      label: visual.label,
      visual: visual.value,
      colorIndex: items.length % 6,
    });
    seen.add(url);

    if (items.length >= ITEM_LIMIT) break;
  }

  if (items.length < 3) {
    throw new Error(`Only ${items.length} Union Wire items were found`);
  }

  return items;
}

async function hasExistingSnapshot() {
  try {
    await access(OUTPUT);
    const existing = JSON.parse(await readFile(OUTPUT, 'utf8'));
    return Array.isArray(existing.items) && existing.items.length > 0;
  } catch {
    return false;
  }
}

try {
  const response = await fetch(SOURCE_URL, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': USER_AGENT,
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  const items = parseUnionWire(await response.text());
  const snapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    items,
  };

  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${items.length} Union Wire items to ${OUTPUT}`);
} catch (error) {
  if (await hasExistingSnapshot()) {
    console.warn(`Union Wire refresh failed; preserving the existing snapshot: ${error.message}`);
  } else {
    throw error;
  }
}
