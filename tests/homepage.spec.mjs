import { test, expect } from '@playwright/test';
import { readFile, stat } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../data/pages.json', import.meta.url), 'utf8'));
const mainTabs = page => page.getByRole('tablist', { name: 'Widget tabs', exact: true });

test.beforeEach(async ({ page }) => {
  // Exercise the local application without depending on external widget uptime.
  await page.route('https://**/*', route => {
    const type = route.request().resourceType();
    return route.fulfill({
      status: 200,
      contentType: type === 'script' ? 'text/javascript' : type === 'stylesheet' ? 'text/css' : 'text/html',
      body: type === 'document' ? '<!doctype html><title>External widget fixture</title><p>External widget fixture</p>' : '',
    });
  });
});

async function open(page, url = '/') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(mainTabs(page).getByRole('tab')).toHaveCount(5);
  await expect(page.locator('.page-collection')).toHaveCount(3);
}

async function assertIndicator(page) {
  await expect.poll(() => page.evaluate(() => {
    const list = document.querySelector('#widget-tabs-root .tablist');
    const active = list.querySelector('[aria-selected="true"]').getBoundingClientRect();
    const indicator = list.querySelector('.tab-indicator').getBoundingClientRect();
    return Math.max(...['x', 'y', 'width', 'height'].map(key => Math.abs(active[key] - indicator[key])));
  })).toBeLessThan(1.5);
}

test('manifest content, native disclosures and parent/child links keep their destinations', async ({ page }) => {
  await open(page);
  for (const summary of await page.locator('.page-collection summary').all()) {
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(summary.locator('..')).toHaveAttribute('open', '');
  }
  for (const entry of manifest.pages) {
    const link = page.locator('#pageTree a').filter({ hasText: entry.title }).first();
    await expect(link).toHaveAttribute('href', entry.href || entry.path);
    await expect(link).toBeVisible();
  }
  await expect(page.locator('.page-tree__parent > a')).toHaveCount(1);
  await expect(page.locator('.page-tree__parent > .page-branch__children > li')).toHaveCount(3);
  await page.locator('.page-collection summary').first().press('Space');
  await expect(page.locator('.page-collection').first()).not.toHaveAttribute('open', '');
});

for (const failure of ['http', 'invalid-json', 'empty', 'invalid-records', 'network']) {
  test(`manifest ${failure} failure uses the curated fallback`, async ({ page }) => {
    await page.route('**/data/pages.json', route => failure === 'network' ? route.abort() : route.fulfill({
      status: failure === 'http' ? 503 : 200,
      contentType: 'application/json',
      body: failure === 'invalid-json' ? '{' : JSON.stringify({ pages: failure === 'invalid-records' ? [{ path: 'bad' }, null] : [] }),
    }));
    await open(page);
    await page.locator('.page-collection summary').last().click();
    await expect(page.getByRole('link', { name: 'Midnight Tarot' })).toHaveAttribute('href', 'Pages/For Fun/Tarot/index.html');
    await expect(page.locator('#pageTree')).toHaveAttribute('aria-busy', 'false');
  });
}

test('manifest loading remains accessible and a stalled fetch times out to fallback', async ({ page }) => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  await page.route('**/data/pages.json', async route => {
    await pending;
    await route.fulfill({ json: manifest }).catch(() => {});
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#pageTree')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#pageTree').getByRole('status')).toHaveText('Loading pages...');
    // Install clock after React starts, then advance only the manifest timeout.
    await page.clock.install();
    await page.clock.fastForward(11000);
    await expect(page.locator('.page-collection')).toHaveCount(3, { timeout: 15000 });
  } finally { release(); }
});

test('main tabs support roving focus, arrows, Home/End and persistent lazy frames', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const tabs = mainTabs(page).getByRole('tab');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#widget-tabs-root iframe[src]')).toHaveCount(0);
  await tabs.last().focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.first()).toBeFocused();
  await expect(page.locator('#tab-cal iframe')).toHaveAttribute('src', /outlook\.office365\.com/);
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await expect(page.locator('#widget-tabs-root iframe[src]')).toHaveCount(2);
  await expect(page.locator('#widget-tabs-root > section > .tabpanel:not([hidden])')).toHaveCount(1);
  await expect(mainTabs(page).locator('[tabindex="0"]')).toHaveCount(1);
  // A frame's browsing context must survive repeated panel switches.
  await page.locator('#tab-cal iframe').evaluate(frame => { frame.dataset.identity = 'retained'; });
  await tabs.first().click();
  await expect(page.locator('#tab-cal iframe')).toHaveAttribute('data-identity', 'retained');
  await assertIndicator(page);
  expect(errors).toEqual([]);
});

test('request form retains input, native validation, Trello subject and redirect state', async ({ page }) => {
  await open(page, '/?sent=1&keep=yes#profile');
  await expect(page.locator('#tbtn-req')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#requestSent')).toBeVisible();
  await expect(page).toHaveURL(/\?keep=yes#profile$/);
  const form = page.locator('#requestForm');
  expect(await form.evaluate(element => element.checkValidity())).toBe(false);
  await form.getByLabel('Name', { exact: true }).fill('Local Test');
  await form.getByLabel('Email', { exact: true }).fill('test@example.com');
  await form.getByLabel('Subject', { exact: true }).fill('  Local request title  ');
  await form.getByLabel('Details', { exact: true }).fill('Local browser test only');
  await page.locator('#tbtn-cat').click();
  await page.locator('#tbtn-req').click();
  await expect(form.getByLabel('Subject', { exact: true })).toHaveValue('  Local request title  ');
  // Prevent transmission; inspect the normal submit handler's result locally.
  await form.evaluate(element => element.addEventListener('submit', event => event.preventDefault(), { once: true }));
  await form.getByRole('button', { name: 'Send Request' }).click();
  await expect(form.locator('[name="_subject"]')).toHaveValue('Local request title');
  await expect(form).toHaveAttribute('method', 'POST');
  await expect(form).toHaveAttribute('action', /formsubmit\.co\/justinrogowski1/);
  await expect(form.locator('[name="_next"]')).toHaveValue('https://justinrogo.github.io/?sent=1');
});

test('profile control, strength disclosures, filters and nested catalog tabs still work', async ({ page }) => {
  await open(page);
  await page.locator('#viewStrengthsBtn').click();
  await expect(page.locator('#tbtn-cs')).toBeFocused();
  await expect(page.locator('#tab-cs')).toBeVisible();
  await page.locator('#CS [data-limit="5"]').click();
  await expect(page.locator('#CS .item:visible')).toHaveCount(5);
  const ideation = page.getByRole('button', { name: 'Ideation, rank 1', exact: true });
  await ideation.click();
  await expect(ideation).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#strength-detail')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#strength-detail-title')).toHaveText('Ideation');
  await ideation.press('Escape');
  await expect(page.locator('#strength-detail')).toBeHidden();
  await page.locator('#tbtn-cat').click();
  await page.locator('#ulsw-tabbtn-books').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#ulsw-tabbtn-journals')).toBeFocused();
  await expect(page.locator('#tbtn-cat')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#ulsw-tab-journals [data-query-input]').fill('Library, science');
  // Stop the legacy form's native navigation and inspect query construction.
  await page.locator('#ulsw-tab-journals form').evaluate(form => {
    form.submit = () => { form.dataset.submitted = 'true'; };
  });
  await page.locator('#ulsw-tab-journals [data-submit]').click();
  await expect(page.locator('#ulsw-tab-journals [data-query-target]')).toHaveValue('any,contains,Library  science');
  await page.locator('#tbtn-cs').click();
  await expect(page.locator('#CS .item:visible')).toHaveCount(5);
  await page.locator('#tbtn-cat').click();
  await expect(page.locator('#ulsw-tab-journals [data-query-input]')).toHaveValue('Library, science');
});

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 768, 390, 320]) {
    test(`${theme} theme at ${width}px retains layout and indicator after switching and resizing`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      await open(page);
      const collection = page.locator('.page-collection summary').first();
      await collection.click();
      await expect(page.locator('.page-collection').first()).toHaveAttribute('open', '');
      await page.locator('#tbtn-req').click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await assertIndicator(page);
      await page.locator('#tbtn-cat').click();
      await assertIndicator(page);
      await page.locator('#page-directory').screenshot({ path: testInfo.outputPath('directory.png') });
      await page.locator('#widget-tabs-root').screenshot({ path: testInfo.outputPath('widgets.png') });
      await page.locator('#theme').click();
      await expect(page.locator('body')).toHaveClass(theme === 'light' ? /^(?!.*\blight\b).*$/ : /light/);
      await page.setViewportSize({ width: width === 1440 ? 390 : 1440, height: 1000 });
      await assertIndicator(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

test('rapid switching, scrolling and resizing settle on the selected tab', async ({ page }) => {
  await open(page);
  await page.evaluate(async () => {
    const buttons = [...document.querySelectorAll('#widget-tabs-root .tablist .tab')];
    for (let index = 0; index < 35; index++) {
      buttons[index % buttons.length].click();
      await new Promise(requestAnimationFrame);
    }
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await assertIndicator(page);
  await expect(page.locator('#tbtn-cat')).toHaveAttribute('aria-selected', 'true');
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.locator('#tbtn-book').click();
  await assertIndicator(page);
});

test('spotlight respects mouse, touch and live reduced-motion preferences', async ({ page }) => {
  await open(page);
  const summary = page.locator('.page-collection summary').first();
  await summary.hover();
  await expect(summary).toHaveClass(/is-spotlit/);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(summary).not.toHaveClass(/is-spotlit/);
  await page.mouse.move(0, 0);
  await summary.hover();
  await expect(summary).not.toHaveClass(/is-spotlit/);
  await page.locator('#tbtn-cal').click();
  await assertIndicator(page);
  expect(await page.locator('.tab-indicator').evaluate(element => element.getAnimations().length)).toBe(0);
  expect(await page.locator('#tab-cal').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await summary.dispatchEvent('pointermove', { pointerType: 'touch', clientX: 20, clientY: 20 });
  await expect(summary).not.toHaveClass(/is-spotlit/);
});

test('touch operates disclosures and tabs without a hover dependency', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route('https://**/*', route => route.fulfill({ body: '' }));
  await open(page);
  await page.locator('.page-collection summary').first().tap();
  await expect(page.locator('.page-collection').first()).toHaveAttribute('open', '');
  await page.locator('#tbtn-cs').tap();
  await expect(page.locator('#tab-cs')).toBeVisible();
  await page.getByRole('button', { name: 'Ideation, rank 1', exact: true }).tap();
  await expect(page.locator('#strength-detail')).toBeVisible();
  await expect(page.locator('.is-spotlit')).toHaveCount(0);
  await context.close();
});

test('an unavailable embedded service does not prevent tab navigation or the request form', async ({ page }) => {
  await page.route('https://outlook.**/*', route => route.abort());
  await page.route('https://trello.com/**', route => route.abort());
  await open(page);
  await page.locator('#tbtn-cal').click();
  await expect(page.locator('#tab-cal iframe')).toHaveAttribute('src', /outlook/);
  await page.locator('#tbtn-req').click();
  await expect(page.locator('#requestForm')).toBeVisible();
  await page.locator('#tbtn-cat').click();
  await expect(page.locator('#ulsw-tab-books')).toBeVisible();
});

test('production includes static assets and preserves standalone paths and Updates aliases', async ({ request }) => {
  for (const file of ['/assets/homepage.js', '/assets/homepage.css', '/assets/homepage.js.LEGAL.txt', '/assets/react-LICENSE.txt', '/assets/react-dom-LICENSE.txt', '/assets/scheduler-LICENSE.txt', '/assets/react-bits-LICENSE.txt', '/main.js', '/style.css']) {
    expect((await request.get(file)).ok(), file).toBe(true);
  }
  for (const entry of manifest.pages) {
    expect((await request.get('/' + entry.path)).ok(), entry.path).toBe(true);
  }
  expect((await request.get('/updates')).ok()).toBe(true);
  expect((await request.get('/updates/embed')).ok()).toBe(true);
  for (const file of ['quill.js', 'quill.snow.css', 'purify.js', 'supabase.js']) {
    expect((await request.get('/Pages/Updates/vendor/' + file)).ok()).toBe(true);
  }
  expect((await request.get('/api/updates')).status()).toBe(404);
  for (const path of ['src', 'node_modules', 'api', 'scripts', '.env.local', 'supabase']) {
    await expect(stat(new URL('../dist/' + path, import.meta.url))).rejects.toThrow();
  }
});

test('built file previews load React and the curated directory without fetching a manifest', async ({ page }) => {
  let manifestRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/data/pages.json')) manifestRequests++; });
  await page.goto(new URL('../dist/index.html', import.meta.url).href, { waitUntil: 'domcontentloaded' });
  await expect(mainTabs(page).getByRole('tab')).toHaveCount(5);
  await expect(page.locator('.page-collection')).toHaveCount(3);
  await page.locator('.page-collection summary').last().click();
  await expect(page.getByRole('link', { name: 'Midnight Tarot' })).toBeVisible();
  expect(manifestRequests).toBe(0);
});

test('Glass Surface enhances six shells without filtering content or duplicating SVG IDs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.locator('.homepage-glass')).toHaveCount(6);
  await expect(page.locator('.glass-surface--svg')).toHaveCount(6);
  await expect(page.locator('.glass-material[aria-hidden="true"][inert]')).toHaveCount(6);
  expect(await page.locator('.homepage-glass').evaluateAll(elements => elements.every(element =>
    getComputedStyle(element).backdropFilter === 'none' && getComputedStyle(element).filter === 'none'))).toBe(true);
  expect(await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
    return ids.filter((id, index) => ids.indexOf(id) !== index);
  })).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.glass-surface--fallback')).toHaveCount(6);
  await expect(page.locator('.glass-surface--svg')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator('.glass-surface--svg')).toHaveCount(6);
  await expect.poll(() => page.locator('#page-directory .glass-material .glass-surface').evaluate(element => {
    const href = element.querySelector('feImage').getAttribute('href');
    const map = decodeURIComponent(href.split(',')[1]);
    const width = Number(map.match(/<svg width="([\d.]+)"/)[1]);
    return Math.abs(width - element.getBoundingClientRect().width);
  })).toBeLessThan(1);
});

test('Glass Surface responds to reduced motion and increased contrast without animations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.locator('.glass-surface--svg')).toHaveCount(6);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.glass-surface--fallback')).toHaveCount(6);
  expect(await page.locator('.glass-material').evaluateAll(elements => elements.every(element =>
    element.getAnimations({ subtree: true }).length === 0))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'more' });
  await expect(page.locator('.glass-surface--fallback')).toHaveCount(6);
  expect(await page.locator('.glass-material > .glass-surface').evaluateAll(elements => elements.every(element => {
    const style = getComputedStyle(element);
    return style.backdropFilter === 'none' && /^rgb\(/.test(style.backgroundColor);
  }))).toBe(true);
});

test('Glass Surface selects the frosted fallback when upstream disables SVG filters', async ({ browser }) => {
  // Exercise the upstream feature branch, rather than claiming a Firefox run.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0',
  });
  const page = await context.newPage();
  await page.route('https://**/*', route => route.fulfill({ body: '' }));
  await open(page);
  await expect(page.locator('.glass-surface--fallback')).toHaveCount(6);
  await expect(page.locator('.glass-surface--svg')).toHaveCount(0);
  await page.locator('#viewStrengthsBtn').click();
  await expect(page.locator('#tab-cs')).toBeVisible();
  await context.close();
});

test('Shape Waves animates, reacts to the pointer, and survives resizing', async ({ page }) => {
  await page.addInitScript(() => {
    window.backgroundFrames = 0;
    const submit = GPUQueue.prototype.submit;
    GPUQueue.prototype.submit = function (...args) {
      window.backgroundFrames++;
      return submit.apply(this, args);
    };
  });
  await open(page);
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
  await expect.poll(() => page.evaluate(() => window.backgroundFrames)).toBeGreaterThan(1);
  await expect(page.locator('.shape-waves')).toHaveCSS('background-color', 'rgb(0, 23, 58)');
  // Let the upstream intro finish, then compare actual pixels across pointer movement.
  await page.waitForTimeout(1800);
  const before = await page.locator('#site-background').screenshot();
  await page.mouse.move(60, 120);
  await page.mouse.move(160, 160, { steps: 8 });
  const after = await page.locator('#site-background').screenshot();
  expect(before.equals(after)).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.shape-waves__canvas').evaluate(canvas => canvas.clientWidth)).toBe(390);
  expect(await page.locator('.shape-waves__canvas').evaluate(canvas => canvas.width * canvas.height)).toBeLessThan(2404000);
  expect(await page.locator('#site-background').evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Toggle Theme' }).click();
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
  await page.locator('#viewStrengthsBtn').click();
  await expect(page.locator('#tab-cs')).toBeVisible();
});

test('Shape Waves uses still shapes for reduced motion and responds to preference changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'static');
  await expect(page.locator('.shape-waves__canvas')).toHaveCount(0);
  const image = await page.locator('.background-static').evaluate(canvas => canvas.toDataURL());
  await page.waitForTimeout(200);
  expect(await page.locator('.background-static').evaluate(canvas => canvas.toDataURL())).toBe(image);
  expect(await page.locator('.background-static').evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((channel, index) => index % 4 === 0 && channel > 0);
  })).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.shape-waves__canvas')).toHaveCount(0);
});

test('Shape Waves falls back without WebGPU while the homepage stays usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  await open(page);
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'fallback');
  await expect(page.locator('.background-static')).toBeVisible();
  await page.locator('#viewStrengthsBtn').click();
  await expect(page.locator('#tab-cs')).toBeVisible();
  await page.locator('#tbtn-req').click();
  await expect(page.locator('#requestForm')).toBeVisible();
});

test('Shape Waves falls back after GPU device loss without losing widget state', async ({ page }) => {
  await page.addInitScript(() => {
    const requestDevice = GPUAdapter.prototype.requestDevice;
    GPUAdapter.prototype.requestDevice = async function (...args) {
      const device = await requestDevice.apply(this, args);
      window.loseBackgroundDevice = () => device.destroy();
      return device;
    };
  });
  await open(page);
  const background = page.locator('.site-background__layers');
  await expect(background).toHaveAttribute('data-background-state', 'active');
  await page.locator('#tbtn-req').click();
  await page.locator('#requestForm [name="subject"]').fill('Retained after device loss');
  await page.evaluate(() => window.loseBackgroundDevice());
  await expect(background).toHaveAttribute('data-background-state', 'fallback');
  await expect(page.locator('.background-static')).toBeVisible();
  await expect(page.locator('#requestForm [name="subject"]')).toHaveValue('Retained after device loss');
});
