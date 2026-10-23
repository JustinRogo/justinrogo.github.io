import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function buildSanitizer() {
  const output = path.join(root, 'lib/generated');
  await mkdir(output, { recursive: true });
  // sanitize-html requires an ESM-only htmlparser2 release. Vercel's function
  // loader cannot require ESM, even on Node versions that support it locally.
  // Bundle the current patched sanitizer and its parser into one CommonJS file.
  await build({
    entryPoints: ['sanitize-html'],
    absWorkingDir: root,
    outfile: path.join(output, 'sanitize-html.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    legalComments: 'inline'
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSanitizer();
}
