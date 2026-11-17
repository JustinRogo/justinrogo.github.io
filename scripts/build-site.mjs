import { cp, mkdir, copyFile, access, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSanitizer } from './build-sanitizer.mjs';
import { refreshPocketPart } from './update-pocket-part.mjs';
import { refreshAiCorner } from './update-ai-corner.mjs';
import { refreshOutlookAvailability } from './update-outlook-availability.mjs';
import { buildHomepage } from './build-homepage.mjs';
import { buildV2 } from '../v2/build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function vendorUpdates() {
  const output = path.join(root, 'Pages/Updates/vendor');
  await mkdir(output, { recursive: true });
  for (const [source, target] of [
    ['quill/dist/quill.js', 'quill.js'],
    ['quill/dist/quill.snow.css', 'quill.snow.css'],
    ['quill/LICENSE', 'quill-LICENSE'],
    ['dompurify/dist/purify.min.js', 'purify.js'],
    ['dompurify/LICENSE', 'dompurify-LICENSE'],
    ['@supabase/supabase-js/dist/umd/supabase.js', 'supabase.js'],
    ['@supabase/supabase-js/LICENSE', 'supabase-LICENSE']
  ]) await copyFile(path.join(root, 'node_modules', source), path.join(output, target));
}

const siteOrigin = 'https://justinrogo.github.io';
const sitemapExclusions = new Set(['Pages/Work/Library/Desk Planner/index.html']);
// Hash routes share one URL, so the sitemap is the homepage plus same-site project pages.
export async function writeDiscoveryFiles(output) {
  const { pages } = JSON.parse(await readFile(path.join(root, 'data/pages.json'), 'utf8'));
  const listed = pages.filter(page => !page.href && !sitemapExclusions.has(page.path));
  const urls = ['/', ...listed.map(page => `/${page.path.split('/').map(encodeURIComponent).join('/')}`)];
  await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${siteOrigin}${url}</loc></url>`).join('\n')}
</urlset>
`);
  await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // Local/reproducible builds can retain the existing feed without modifying it.
  if (!process.argv.includes('--skip-feed')) {
    await Promise.all([refreshPocketPart(), refreshAiCorner(), refreshOutlookAvailability()]);
  }
  await buildHomepage();
  await buildV2();
  await buildSanitizer();
  await vendorUpdates();
  const dist = path.join(root, 'dist');
  if (path.relative(root, dist) !== 'dist') throw new Error('Unexpected build output path.');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  // Match the existing site's public roots, without exposing source, SQL, or env files.
  const excluded = new Set(['node_modules', '.git', '.claude', '.agents', '.codex', '.openai', '.impeccable']);
  for (const entry of ['assets', 'data', 'Maps', 'Pages', 'favicon.svg', 'index.html', '404.html', 'original.html', 'main.js', 'style.css']) {
    await access(path.join(root, entry));
    await cp(path.join(root, entry), path.join(dist, entry), {
      recursive: true,
      filter: source => {
        const name = path.basename(source);
        return !excluded.has(name) && !/\.(?:bak(?:\.html)?|sql|md|mjs)$/i.test(name);
      }
    });
  }
  // Keep /v2/ working from the same entry point as the primary homepage.
  await mkdir(path.join(dist, 'v2'), { recursive: true });
  await copyFile(path.join(dist, 'index.html'), path.join(dist, 'v2/index.html'));
  await cp(path.join(root, 'v2/assets'), path.join(dist, 'v2/assets'), {
    recursive: true,
    filter: source => !source.endsWith('.json'),
  });
  await writeDiscoveryFiles(dist);
  console.log('Static site and Updates assets prepared in dist/.');
}
