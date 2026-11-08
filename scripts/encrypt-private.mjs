// Encrypts the git-ignored private/ folder into Pages/Private/ so the public repo only holds ciphertext.
// Usage: npm run private            (password from PRIVATE_PASSWORD, .env.local, or a prompt)
//        npm run private -- --change-password
import { webcrypto as crypto } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

process.on('uncaughtException', error => { console.error(`\n${error.message}`); process.exit(1); });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const sourceDir = path.resolve(root, option('--src') ?? 'private');
const outputDir = path.resolve(root, option('--out') ?? 'Pages/Private');
const changePassword = args.includes('--change-password');
const ITERATIONS = 600_000;
const CHECK_TEXT = 'jr-private-vault';
const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.avif': 'image/avif' };

const b64 = bytes => Buffer.from(bytes).toString('base64');
const unb64 = text => new Uint8Array(Buffer.from(text, 'base64'));
const escapeHtml = text => text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encrypt(key, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return { iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

async function decrypt(key, { iv, ct }) {
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(ct)));
}

function ask(question, hidden) {
  if (!process.stdin.isTTY || !hidden) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer); }));
  }
  return new Promise(resolve => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let value = '';
    const onData = chunk => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\r' || char === '\n') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off('data', onData);
          process.stdout.write('\n');
          return resolve(value);
        }
        if (char === '\u0003') process.exit(130);
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

async function getPassword(isNew) {
  if (process.env.PRIVATE_PASSWORD) return process.env.PRIVATE_PASSWORD;
  const envFile = path.join(root, '.env.local');
  if (existsSync(envFile)) {
    const match = (await readFile(envFile, 'utf8')).match(/^\s*PRIVATE_PASSWORD\s*=\s*(.*)\s*$/m);
    if (match) return match[1].replace(/^(['"])(.*)\1$/, '$2');
  }
  const password = await ask(isNew ? 'New password for the private section: ' : 'Private section password: ', true);
  if (isNew && password !== await ask('Type it again: ', true)) throw new Error('Passwords did not match.');
  return password;
}

async function listHtml(dir, base = dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listHtml(full, base));
    else if (entry.name.toLowerCase().endsWith('.html')) files.push(path.relative(base, full));
  }
  return files;
}

// Images referenced with relative paths are embedded so they are encrypted along with the page.
async function inlineImages(html, fileDir) {
  const pattern = /(<img\b[^>]*?\bsrc=)(["'])([^"']+)\2/gi;
  let result = '';
  let last = 0;
  for (const match of html.matchAll(pattern)) {
    const [whole, prefix, quote, src] = match;
    result += html.slice(last, match.index);
    last = match.index + whole.length;
    const type = IMAGE_TYPES[path.extname(src.split(/[?#]/)[0]).toLowerCase()];
    const file = path.resolve(fileDir, decodeURI(src.split(/[?#]/)[0]));
    if (/^(?:[a-z]+:|\/\/|\/)/i.test(src) || !type || !existsSync(file)) {
      if (!/^(?:[a-z]+:|\/\/)/i.test(src)) console.warn(`  ! Left image as-is (not found or unsupported): ${src}`);
      result += whole;
      continue;
    }
    result += `${prefix}${quote}data:${type};base64,${(await readFile(file)).toString('base64')}${quote}`;
  }
  return result + html.slice(last);
}

function wrapFragment(body, depth) {
  const title = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]+>/g, '').trim() || 'Private';
  const home = '../'.repeat(depth + 2);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${sharedStyles}
  main { width: min(720px, 100%); margin: 0 auto; padding: 24px 16px 64px; line-height: 1.6; }
  .bar { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 28px; font-size: 0.9rem; color: var(--muted); }
  .bar button { font: inherit; color: var(--blue); background: none; border: 1px solid var(--line); border-radius: 999px; padding: 4px 14px; cursor: pointer; }
  .bar button:hover { background: var(--tint); }
  h1, h2, h3 { line-height: 1.2; letter-spacing: -0.01em; }
  img, video { max-width: 100%; height: auto; border-radius: 10px; }
  pre { overflow-x: auto; background: var(--tint); padding: 12px; border-radius: 8px; }
</style>
</head>
<body>
<main>
  <div class="bar"><a href="${home}">← justinrogo.github.io</a><button type="button" onclick="try{localStorage.removeItem('jr-private-key');sessionStorage.removeItem('jr-private-key')}catch(e){}location.reload()">Lock</button></div>
${body}
</main>
</body>
</html>`;
}

const sharedStyles = `
  @font-face { font-family: Geist; src: url("/v2/assets/fonts/Geist.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
  :root { --bg: #e6efff; --surface: #f1f6ff; --ink: #112847; --muted: #425875; --line: #a9bfdf; --blue: #125cd4; --tint: #d7e6ff; --error: #b42318; color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { :root { --bg: #060f23; --surface: #0e203b; --ink: #eef5ff; --muted: #b4c9e5; --line: #334f75; --blue: #75b4ff; --tint: #17385f; --error: #ff9b8f; } }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink); font-family: Geist, system-ui, sans-serif; }
  a { color: var(--blue); }`;

function lockPage(payload) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Private</title>
<style>${sharedStyles}
  body { display: grid; place-items: center; padding: 16px; }
  form { width: min(360px, 100%); background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 28px 24px; }
  h1 { margin: 0 0 6px; font-size: 1.35rem; }
  p { margin: 0 0 20px; color: var(--muted); font-size: 0.95rem; }
  input[type=password] { width: 100%; font: inherit; font-size: 1rem; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); }
  input[type=password]:focus { outline: 2px solid var(--blue); outline-offset: 1px; }
  label.remember { display: flex; align-items: center; gap: 8px; margin: 14px 0 18px; font-size: 0.9rem; color: var(--muted); }
  button { width: 100%; font: inherit; font-weight: 600; padding: 10px; border: 0; border-radius: 10px; background: var(--blue); color: var(--surface); cursor: pointer; }
  button:disabled { opacity: 0.6; cursor: progress; }
  .error { min-height: 1.4em; margin: 12px 0 0; color: var(--error); font-size: 0.9rem; }
  noscript { display: block; margin-top: 12px; color: var(--error); }
  .checking form { visibility: hidden; }
</style>
</head>
<body>
<form id="unlock" autocomplete="off">
  <h1>Private page</h1>
  <p>Enter the password to view this page.</p>
  <input id="password" type="password" aria-label="Password" autocomplete="current-password" autofocus required>
  <label class="remember"><input id="remember" type="checkbox" checked> Remember me on this device</label>
  <button id="submit" type="submit">Unlock</button>
  <div class="error" id="error" role="alert"></div>
  <noscript>JavaScript is needed to unlock this page.</noscript>
</form>
<script id="payload" type="application/json">${JSON.stringify(payload)}</script>
<script>
(() => {
  const STORE = 'jr-private-key';
  const data = JSON.parse(document.getElementById('payload').textContent);
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const text = b => btoa(String.fromCharCode(...new Uint8Array(b)));
  const store = (kind) => { try { return window[kind]; } catch (e) { return null; } };
  const form = document.getElementById('unlock');
  const error = document.getElementById('error');
  const submit = document.getElementById('submit');

  async function open(key) {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(data.iv) }, key, bytes(data.ct));
    const html = new TextDecoder().decode(plain);
    // document.open() is ignored while this page is still parsing, which would append instead of replace.
    if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    document.open();
    document.write(html);
    document.close();
  }

  async function fromSaved() {
    for (const kind of ['sessionStorage', 'localStorage']) {
      try {
        const saved = JSON.parse(store(kind)?.getItem(STORE) || 'null');
        if (!saved || saved.salt !== data.salt) continue;
        const key = await crypto.subtle.importKey('raw', bytes(saved.key), 'AES-GCM', false, ['decrypt']);
        await open(key);
        return true;
      } catch (e) { try { store(kind)?.removeItem(STORE); } catch (_) {} }
    }
    return false;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.textContent = '';
    submit.disabled = true;
    submit.textContent = 'Unlocking…';
    try {
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(document.getElementById('password').value), 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(data.salt), iterations: data.iterations }, material, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
      let raw;
      try { raw = text(await crypto.subtle.exportKey('raw', key)); } catch (e) {}
      await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(data.iv) }, key, bytes(data.ct));
      if (raw) {
        const saved = JSON.stringify({ salt: data.salt, key: raw });
        try { store('sessionStorage')?.setItem(STORE, saved); } catch (e) {}
        if (document.getElementById('remember').checked) { try { store('localStorage')?.setItem(STORE, saved); } catch (e) {} }
      }
      await open(key);
    } catch (e) {
      error.textContent = window.crypto?.subtle ? 'That password didn’t work.' : 'This browser can’t unlock the page.';
      submit.disabled = false;
      submit.textContent = 'Unlock';
    }
  });

  if (window.crypto?.subtle) {
    document.documentElement.classList.add('checking');
    fromSaved().then(opened => { if (!opened) document.documentElement.classList.remove('checking'); });
  }
})();
</script>
</body>
</html>
`;
}

const starter = `<h1>Private notes</h1>
<p>This is the private section. Edit <code>private/index.html</code>, then run <code>npm run private</code> to re-encrypt it.</p>
<p>Add more <code>.html</code> files to the <code>private/</code> folder to add more pages, and link between them with relative links like <code>&lt;a href="other.html"&gt;</code>. Images next to these files are embedded and encrypted too.</p>
`;

if (!existsSync(sourceDir)) {
  await mkdir(sourceDir, { recursive: true });
  await writeFile(path.join(sourceDir, 'index.html'), starter);
  console.log(`Created ${path.relative(root, sourceDir)}/index.html as a starting point.`);
}

const files = await listHtml(sourceDir);
if (!files.length) throw new Error(`No .html files in ${path.relative(root, sourceDir)}/.`);

// Keep the same salt while the password is unchanged, so "Remember me" survives content updates.
const vaultFile = path.join(outputDir, 'vault.json');
const existing = existsSync(vaultFile) ? JSON.parse(await readFile(vaultFile, 'utf8')) : null;
const isNew = !existing || changePassword;
const password = await getPassword(isNew);
if (password.length < 8) throw new Error('Use a password of at least 8 characters.');

let salt, iterations, key, vault;
if (isNew) {
  salt = crypto.getRandomValues(new Uint8Array(16));
  iterations = ITERATIONS;
  key = await deriveKey(password, salt, iterations);
  vault = { salt: b64(salt), iterations, check: await encrypt(key, CHECK_TEXT) };
} else {
  salt = unb64(existing.salt);
  iterations = existing.iterations;
  key = await deriveKey(password, salt, iterations);
  try {
    if (await decrypt(key, existing.check) !== CHECK_TEXT) throw new Error();
  } catch {
    throw new Error('That password does not match the one already used for Pages/Private. To switch passwords, run: npm run private -- --change-password');
  }
  vault = existing;
}

await mkdir(outputDir, { recursive: true });
const written = new Set(['vault.json']);
for (const file of files) {
  const source = await readFile(path.join(sourceDir, file), 'utf8');
  const depth = file.split(path.sep).length - 1;
  const inlined = await inlineImages(source, path.dirname(path.join(sourceDir, file)));
  const doc = /<html[\s>]/i.test(inlined) ? inlined : wrapFragment(inlined, depth);
  const target = path.join(outputDir, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, lockPage({ v: 1, salt: vault.salt, iterations, ...await encrypt(key, doc) }));
  written.add(file.split(path.sep).join('/'));
  console.log(`  ✓ ${file}`);
}

// Remove encrypted pages whose source file was deleted.
for (const file of await listHtml(outputDir)) {
  if (!written.has(file.split(path.sep).join('/'))) {
    await rm(path.join(outputDir, file));
    console.log(`  – removed ${file}`);
  }
}
await writeFile(vaultFile, JSON.stringify(vault, null, 2) + '\n');
console.log(`Encrypted ${files.length} page(s) into ${path.relative(root, outputDir)}/. Commit that folder; never commit private/.`);
