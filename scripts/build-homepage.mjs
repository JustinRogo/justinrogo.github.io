import { build, context } from 'esbuild';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function buildHomepage({ watch = false } = {}) {
  const options = {
    absWorkingDir: root,
    entryPoints: ['src/homepage/index.jsx'],
    outfile: 'assets/homepage.js',
    bundle: true,
    format: 'iife', // Also works in file:// previews without an ESM server.
    platform: 'browser',
    target: ['es2020'],
    jsx: 'automatic',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
    legalComments: 'linked',
  };
  // Include dependency licenses alongside the static bundle on both hosts.
  for (const name of ['react', 'react-dom', 'scheduler']) {
    await copyFile(path.join(root, 'node_modules', name, 'LICENSE'), path.join(root, 'assets', `${name}-LICENSE.txt`));
  }
  if (watch) {
    const watcher = await context(options);
    await watcher.rebuild();
    await watcher.watch();
    return watcher;
  }
  await build(options);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildHomepage({ watch: process.argv.includes('--watch') });
}
