import { build, context } from 'esbuild';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
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
  for (const name of ['react', 'react-dom', 'scheduler', 'vgpu', '@vgpu/core', '@vgpu/wgsl', '@vgpu/wgsl-std']) {
    await copyFile(path.join(root, 'node_modules', name, 'LICENSE'), path.join(root, 'assets', `${name.replace('@', '').replace('/', '-')}-LICENSE.txt`));
  }
  // GSAP packages ship their license URL and copyright in source headers,
  // rather than a standalone LICENSE file. Preserve those exact notices.
  for (const [name, sourceFile] of [['gsap', 'dist/gsap.js'], ['@gsap/react', 'dist/index.js']]) {
    const directory = path.join(root, 'node_modules', name);
    const { version, license } = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    const source = await readFile(path.join(directory, sourceFile), 'utf8');
    const notice = source.match(/\/\*![\s\S]*?\*\//)?.[0];
    if (!notice) throw new Error(`Missing ${name} license notice`);
    await writeFile(path.join(root, 'assets', `${name.replace('@', '').replace('/', '-')}-LICENSE.txt`),
      `${name} ${version}\n${license}\n\n${notice}\n`);
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
