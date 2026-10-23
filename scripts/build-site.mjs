import { cp, mkdir, copyFile, access, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSanitizer } from './build-sanitizer.mjs';

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

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSanitizer();
  await vendorUpdates();
  const dist = path.join(root, 'dist');
  if (path.relative(root, dist) !== 'dist') throw new Error('Unexpected build output path.');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  // Match the existing site's public roots, without exposing source, SQL, or env files.
  const excluded = new Set(['node_modules', '.git', '.claude', '.agents', '.codex', '.openai', '.impeccable']);
  for (const entry of ['assets', 'data', 'Maps', 'Pages', 'favicon.svg', 'index.html', 'main.js', 'style.css']) {
    await access(path.join(root, entry));
    await cp(path.join(root, entry), path.join(dist, entry), {
      recursive: true,
      filter: source => {
        const name = path.basename(source);
        return !excluded.has(name) && !/\.(?:bak(?:\.html)?|sql|md|mjs)$/i.test(name);
      }
    });
  }
  console.log('Static site and Updates assets prepared in dist/.');
}
