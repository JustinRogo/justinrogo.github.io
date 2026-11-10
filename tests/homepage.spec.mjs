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

async function open(page, url = '/original.html') {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(mainTabs(page).getByRole('tab')).toHaveCount(5);
  await expect(page.locator('.page-collection')).toHaveCount(3);
}

test('the primary homepage and V2 bookmarks share the same app and link to the original', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const url of ['/', '/v2/#/home']) {
    await page.goto(url);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    const portrait = page.locator('.portrait-photo img');
    await expect.poll(() => portrait.evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.selected-bento .magic-bento__card')).toHaveCount(4);
    const original = page.getByRole('link', { name: 'Original site', exact: true });
    await expect(original).toHaveAttribute('href', '/original.html');
    await original.click();
    await expect(mainTabs(page).getByRole('tab')).toHaveCount(5);
  }
  await page.goto('/#/tools?panel=request');
  await expect(page.locator('.request-panel form')).not.toHaveAttribute('action', /./);
});

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
    await page.goto('/original.html', { waitUntil: 'domcontentloaded' });
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

test('request form retains input, validates natively and posts JSON to the requests API', async ({ page }) => {
  let submission;
  await page.route('**/api/requests', async route => {
    submission = { method: route.request().method(), body: route.request().postDataJSON() };
    await route.fulfill({ status: 201, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
  });
  await open(page, '/original.html#profile');
  await page.locator('#tbtn-req').click();
  await expect(page.locator('#tab-req iframe')).toHaveCount(0);
  const form = page.locator('#requestForm');
  expect(await form.evaluate(element => element.checkValidity())).toBe(false);
  await form.getByLabel('Name', { exact: true }).fill('Local Test');
  await form.getByLabel('Email', { exact: true }).fill('test@example.com');
  await form.getByLabel('Subject', { exact: true }).fill('  Local request title  ');
  await form.getByLabel('Details', { exact: true }).fill('Local browser test only');
  await page.locator('#tbtn-cat').click();
  await page.locator('#tbtn-req').click();
  await expect(form.getByLabel('Subject', { exact: true })).toHaveValue('  Local request title  ');
  await page.waitForTimeout(2000);
  await form.getByRole('button', { name: 'Send Request' }).click();
  await expect(page.locator('#requestSent')).toBeVisible();
  expect(submission.method).toBe('POST');
  expect(submission.body).toMatchObject({ name: 'Local Test', email: 'test@example.com', subject: '  Local request title  ', details: 'Local browser test only', website: '' });
  await expect(form.getByLabel('Subject', { exact: true })).toHaveValue('');
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

for (const [theme, width] of [['dark', 1440], ['light', 320]]) {
  test(`strengths lead with Top 5 and retain the full profile in ${theme} at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await open(page);
    await page.locator('#tbtn-cs').click();
    const root = page.locator('#CS');
    await expect(root.locator('.controls [data-limit="5"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(root.locator('.item:visible .name')).toHaveText(['Ideation', 'Strategic', 'Input', 'Arranger', 'Restorative']);
    await expect(root.locator('.section:visible')).toHaveCount(2);
    await expect(root.getByRole('list', { name: 'Strength domains' }).getByRole('listitem')).toHaveCount(4);
    expect(await root.evaluate(element => Boolean(element.querySelector('.strength-domains')
      .compareDocumentPosition(element.querySelector('.strengths-reflection')) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    const overview = await root.locator('.bar').getAttribute('aria-label');
    await root.locator('[data-limit="10"]').click();
    await expect(root.locator('.item:visible')).toHaveCount(10);
    await expect(root.locator('.section:visible')).toHaveCount(3);
    await root.locator('[data-limit="all"]').click();
    await expect(root.locator('.item:visible')).toHaveCount(34);
    await expect(root.locator('.section:visible')).toHaveCount(4);
    await expect(root.locator('.bar')).toHaveAttribute('aria-label', overview);
    await root.locator('[data-limit="5"]').click();
    await page.getByRole('button', { name: 'Ideation, rank 1', exact: true }).click();
    await expect(root.locator('#strength-detail')).toContainText('finding connections between ideas');
    await root.locator('.strength-detail__close').click();
    await expect(page.getByRole('button', { name: 'Ideation, rank 1', exact: true })).toBeFocused();
    await root.getByRole('button', { name: "When I'm overextended" }).click();
    await expect(root.locator('#overextended')).toBeVisible();
    await expect(root.locator('#best')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await root.screenshot({ path: testInfo.outputPath('strengths.png') });
  });
}

test('strengths filters settle after interruption, resize, reduced motion, and tab switching', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  await page.locator('#tbtn-cs').click();
  await page.locator('#CS [data-limit="all"]').click();
  await page.getByRole('button', { name: 'Harmony, rank 33', exact: true }).click();
  await page.locator('#CS [data-limit="5"]').click();
  await expect(page.locator('#strength-detail')).toBeHidden();
  await page.locator('#CS').evaluate(async root => {
    for (const limit of ['all', '5', '10', 'all', '10']) {
      root.querySelector(`[data-limit="${limit}"]`).click();
      await new Promise(requestAnimationFrame);
    }
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#CS .item:visible')).toHaveCount(10);
  const settled = () => page.locator('#CS .item').evaluateAll(items => items.every(item =>
    getComputedStyle(item).transform === 'none' && Number(getComputedStyle(item).opacity) === 1));
  await expect.poll(settled).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#CS [data-limit="all"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(settled).toBe(true);
  await page.locator('#CS [data-limit="5"]').click();
  await page.locator('#tbtn-cat').click();
  await expect.poll(settled).toBe(true);
  await page.locator('#tbtn-cs').click();
  await expect(page.locator('#CS .item:visible')).toHaveCount(5);
  await expect(page.locator('#CS [data-limit="5"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('strength spotlights support mouse and keyboard while honoring live motion preferences and touch', async ({ page }) => {
  await open(page);
  await page.locator('#tbtn-cs').click();
  const ideation = page.getByRole('button', { name: 'Ideation, rank 1', exact: true });
  // Settle the scroll before pointing: scrolling intentionally clears lighting.
  await ideation.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.mouse.move(0, 0);
  await ideation.hover();
  await expect(ideation).toHaveClass(/is-spotlit/);
  await page.mouse.move(0, 0);
  await page.locator('#CS [data-limit="all"]').focus();
  await page.keyboard.press('Tab');
  await expect(ideation).toBeFocused();
  await expect.poll(() => ideation.locator('.strength-spotlight').evaluate(element => getComputedStyle(element).opacity)).toBe('1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ideation).not.toHaveClass(/is-spotlit/);
  await expect(ideation.locator('.strength-spotlight')).toBeHidden();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Media changes also restore the page's smooth scrolling and glass material.
  // Let those layout updates commit before testing fresh pointer input.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await ideation.dispatchEvent('pointermove', { pointerType: 'touch', clientX: 20, clientY: 20 });
  await expect(ideation).not.toHaveClass(/is-spotlit/);
  await ideation.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.mouse.move(0, 0);
  await ideation.hover();
  await expect(ideation).toHaveClass(/is-spotlit/);
  await page.locator('#tbtn-cat').click();
  await expect(page.locator('#CS .is-spotlit')).toHaveCount(0);
});

for (const theme of ['light', 'dark']) {
  for (const width of [1440, 768, 390, 320]) {
    test(`${theme} theme at ${width}px retains layout and indicator after switching and resizing`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
      await open(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Justin Rogowski', exact: true })).toBeVisible();
      await expect.poll(() => page.locator('.profile-name .split-char').evaluateAll(characters =>
        characters.every(character => Number(getComputedStyle(character).opacity) === 1))).toBe(true);
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
  await open(page);
  await page.locator('#tbtn-cal').click();
  await expect(page.locator('#tab-cal iframe')).toHaveAttribute('src', /outlook/);
  await page.locator('#tbtn-req').click();
  await expect(page.locator('#requestForm')).toBeVisible();
  await page.locator('#tbtn-cat').click();
  await expect(page.locator('#ulsw-tab-books')).toBeVisible();
});

test('production includes static assets and preserves standalone paths and Updates aliases', async ({ request }) => {
  for (const file of ['/assets/homepage.js', '/assets/homepage.css', '/assets/homepage.js.LEGAL.txt', '/assets/react-LICENSE.txt', '/assets/react-dom-LICENSE.txt', '/assets/scheduler-LICENSE.txt', '/assets/react-bits-LICENSE.txt', '/assets/gsap-LICENSE.txt', '/assets/gsap-react-LICENSE.txt', '/main.js', '/style.css']) {
    expect((await request.get(file)).ok(), file).toBe(true);
  }
  for (const entry of manifest.pages) {
    // Pages with an href live elsewhere (e.g. the CGS Explorer's own repository); their path is only an ID.
    if (entry.href) expect(entry.href, entry.path).toMatch(/^https:\/\//);
    else expect((await request.get('/' + entry.path)).ok(), entry.path).toBe(true);
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

test('profile entrance keeps one heading, finishes, and settles when reduced motion changes live', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const heading = page.getByRole('heading', { level: 1, name: 'Justin Rogowski', exact: true });
  await expect(heading).toHaveCount(1);
  await expect(page.locator('.profile-name .split-char')).toHaveCount(14);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.profile-name .split-char')).toHaveCount(0);
  await expect(heading).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(page.locator('.profile-name .split-char')).toHaveCount(0);
  await page.getByText('More about me', { exact: true }).click();
  await expect(heading).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('Teams glare responds to mouse and keyboard without intercepting the link, and stops under reduced motion', async ({ page }) => {
  await open(page);
  const link = page.getByRole('link', { name: 'Start a Teams Chat', exact: true });
  const band = link.locator('.glare-hover__band');
  await expect(band).toHaveCount(1);
  const resting = await band.getAttribute('style');
  await link.hover();
  await expect.poll(() => band.getAttribute('style')).not.toBe(resting);
  expect(await link.evaluate(element => {
    const box = element.getBoundingClientRect();
    return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest('a') === element;
  })).toBe(true);
  await page.mouse.move(0, 0);
  await expect.poll(() => band.evaluate(element => element.getBoundingClientRect().x)).toBeGreaterThan(-10000);
  // Focus by keyboard so :focus-visible takes the same path as a real visitor.
  await page.locator('#theme').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute('href', 'https://teams.microsoft.com/l/chat/0/0?users=justin.rogowski@uconn.edu');
  await expect(link).toHaveAttribute('target', '_blank');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(link.locator('.glare-hover')).toHaveCount(0);
  await expect(link).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(link.locator('.glare-hover')).toHaveCount(1);
});

test('profile and Teams contact retain their text and native behavior without scripts', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 844 } });
  const page = await context.newPage();
  await page.route('https://**/*', route => route.fulfill({ body: '' }));
  await page.goto('http://127.0.0.1:4391/original.html', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Justin Rogowski', exact: true })).toBeVisible();
  const link = page.getByRole('link', { name: 'Start a Teams Chat', exact: true });
  await expect(link).toBeVisible();
  await link.focus();
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute('href', /teams\.microsoft\.com/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await context.close();
});

test('built file previews load React and the curated directory without fetching a manifest', async ({ page }) => {
  let manifestRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/data/pages.json')) manifestRequests++; });
  await page.goto(new URL('../dist/original.html', import.meta.url).href, { waitUntil: 'domcontentloaded' });
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

test('Rogo switches to solid backgrounds, saves the choice and restores Shape Waves without losing input', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await open(page);
  const pet = page.getByRole('button', { name: 'Rogo: change page background' });
  const bubble = page.getByRole('dialog', { name: 'Pick a background.' });
  await page.locator('#tbtn-req').click();
  await page.locator('#requestForm [name="subject"]').fill('Keep this request');
  await pet.click();
  await expect(bubble).toBeVisible();
  await expect(bubble.getByRole('radio', { name: 'Shape Waves', exact: true })).toBeChecked();
  await bubble.getByRole('radio', { name: 'None', exact: true }).check();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('#site-background canvas')).toHaveCount(0);
  await expect(page.locator('.noise-overlay')).toBeHidden();
  await expect(bubble).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('rogo-picker-dark.png') });
  await expect(page.locator('#requestForm [name="subject"]')).toHaveValue('Keep this request');
  expect(await page.evaluate(() => localStorage.getItem('site-background'))).toBe('none');
  await bubble.getByRole('radio', { name: 'Shape Waves', exact: true }).check();
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
  await expect(page.locator('#requestForm [name="subject"]')).toHaveValue('Keep this request');
  await bubble.getByRole('radio', { name: 'None', exact: true }).check();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toHaveAttribute('data-background', 'none');
  await expect(page.locator('#site-background canvas')).toHaveCount(0);
  await page.locator('#theme').click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff');
  await pet.click();
  await page.screenshot({ path: testInfo.outputPath('rogo-picker-light.png') });
});

test('Rogo supports keyboard selection, Escape, close and outside dismissal', async ({ page }) => {
  await open(page);
  const pet = page.getByRole('button', { name: 'Rogo: change page background' });
  const bubble = page.getByRole('dialog', { name: 'Pick a background.' });
  await expect(pet).toBeVisible();
  await pet.focus();
  await page.keyboard.press('Enter');
  await expect(pet).toHaveAttribute('aria-expanded', 'true');
  await expect(bubble.getByRole('radio', { name: 'Shape Waves', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(bubble.getByRole('radio', { name: 'Antigravity', exact: true })).toBeChecked();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(bubble.getByRole('radio', { name: 'None', exact: true })).toBeChecked();
  await page.keyboard.press('Escape');
  await expect(bubble).toBeHidden();
  await expect(pet).toBeFocused();
  await expect(pet).toHaveAttribute('aria-expanded', 'false');
  await pet.click();
  await expect(bubble.getByRole('radio', { name: 'None', exact: true })).toBeFocused();
  await bubble.getByRole('button', { name: 'Close background picker' }).click();
  await expect(pet).toBeFocused();
  await pet.click();
  await page.getByRole('heading', { name: 'Pages & Projects', exact: true }).click();
  await expect(bubble).toBeHidden();
  await pet.click();
  await page.locator('#theme').focus();
  await expect(bubble).toBeHidden();
});

for (const width of [320, 390]) {
  test(`mobile footer gear at ${width}px opens the background picker without loading Rogo`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: { width, height: 640 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce', colorScheme: width === 320 ? 'dark' : 'light' });
    const page = await context.newPage();
    let spriteRequests = 0;
    page.on('request', request => { if (request.url().endsWith('/assets/rogo-corner.webp')) spriteRequests++; });
    await page.route('https://**/*', route => route.fulfill({ body: '' }));
    try {
      await open(page);
      await expect(page.locator('#sitePet')).toBeHidden();
      const gear = page.getByRole('button', { name: 'Change page background', exact: true });
      await expect(page.locator('footer').getByRole('button', { name: 'Change page background', exact: true })).toBeVisible();
      await gear.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath('mobile-footer-gear.png') });
      await gear.tap();
      const bubble = page.getByRole('dialog', { name: 'Pick a background.' });
      await expect(bubble).toBeVisible();
      await expect(gear).toHaveAttribute('aria-expanded', 'true');
      await expect(bubble.getByRole('radio')).toHaveCount(5);
      const bounds = await bubble.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await bubble.getByRole('radio', { name: 'None', exact: true }).tap();
      await expect(page.locator('#site-background canvas')).toHaveCount(0);
      expect(await bubble.getByRole('radio', { name: 'None', exact: true }).evaluate(input => {
        const option = input.closest('label').getBoundingClientRect();
        const note = document.getElementById('backgroundPreferenceNote').getBoundingClientRect();
        const list = document.querySelector('.rogo-settings__choices').getBoundingClientRect();
        // Scroll positions round to device pixels while layout uses fractional CSS pixels.
        return option.bottom <= note.top && option.top >= list.top - 1 && option.bottom <= list.bottom + 1;
      })).toBe(true);
      await page.screenshot({ path: testInfo.outputPath('rogo-picker.png') });
      await bubble.getByRole('radio', { name: 'Fractal', exact: true }).tap();
      await expect(page.locator('.fractal-background')).toBeVisible();
      await bubble.getByRole('radio', { name: 'Aurora', exact: true }).tap();
      await expect(page.locator('.glow-aurora')).toHaveCount(3);
      await bubble.getByRole('radio', { name: 'Shape Waves', exact: true }).tap();
      await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'static');
      await bubble.getByRole('button', { name: 'Close background picker' }).tap();
      await expect(bubble).toBeHidden();
      await expect(gear).toBeFocused();
      await expect(gear).toHaveAttribute('aria-expanded', 'false');
      await page.keyboard.press('Space');
      await expect(bubble).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(gear).toBeFocused();
      expect(spriteRequests).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally { await context.close(); }
  });
}

test('background picker switches between desktop Rogo and the mobile footer gear', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  const pet = page.getByRole('button', { name: 'Rogo: change page background' });
  const gear = page.locator('#mobileBackgroundToggle');
  const bubble = page.getByRole('dialog', { name: 'Pick a background.' });
  await expect(pet).toBeVisible();
  await expect(gear).toBeHidden();
  await pet.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(pet).toBeHidden();
  await expect(gear).toBeVisible();
  await expect(bubble).toBeVisible();
  await bubble.getByRole('button', { name: 'Close background picker' }).click();
  await expect(gear).toBeFocused();
  await gear.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(pet).toBeVisible();
  await expect(gear).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(bubble).toBeHidden();
  await expect(pet).toBeFocused();
  await expect(pet).toHaveAttribute('aria-expanded', 'false');
});

test('Rogo keeps background selection working when browser storage is blocked', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); };
  });
  await open(page);
  await page.getByRole('button', { name: 'Rogo: change page background' }).click();
  await page.getByRole('radio', { name: 'None', exact: true }).check();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(page.locator('#site-background canvas')).toHaveCount(0);
  await expect(page.locator('#backgroundPreferenceNote')).toHaveText('Applied for this visit.');
  await page.getByRole('radio', { name: 'Shape Waves', exact: true }).check();
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
  expect(errors).toEqual([]);
});

test('Rogo synchronizes background choices across tabs and handles cleared or invalid preferences', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('site-background', 'unknown-background'));
  await open(page);
  await expect(page.locator('body')).toHaveAttribute('data-background', 'shape-waves');
  const otherPage = await page.context().newPage();
  await otherPage.route('https://**/*', route => route.fulfill({ body: '' }));
  try {
    await otherPage.goto('/', { waitUntil: 'domcontentloaded' });
    await otherPage.evaluate(() => localStorage.setItem('site-background', 'none'));
    await expect(page.locator('body')).toHaveAttribute('data-background', 'none');
    await expect(page.locator('#site-background canvas')).toHaveCount(0);
    await otherPage.evaluate(() => localStorage.clear());
    await expect(page.locator('body')).toHaveAttribute('data-background', 'shape-waves');
  } finally { await otherPage.close(); }
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
});

test('restored backgrounds switch renderers without leaving animation loops behind', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.legacyFrames = { particles: 0, fractal: 0 };
    const draw = WebGL2RenderingContext.prototype.drawArraysInstanced;
    WebGL2RenderingContext.prototype.drawArraysInstanced = function (...args) {
      if (this.canvas.matches('.antigravity__canvas')) {
        window.legacyFrames.particles++;
        window.legacyParticleCount = args[3];
      }
      return draw.apply(this, args);
    };
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.matches('.fractal-background')) window.legacyFrames.fractal++;
      return clear.apply(this, args);
    };
  });
  await open(page);
  await page.getByRole('button', { name: 'Rogo: change page background' }).click();
  const choose = name => page.getByRole('radio', { name, exact: true }).check();
  await choose('Antigravity');
  await expect.poll(() => page.evaluate(() => window.legacyFrames.particles)).toBeGreaterThan(1);
  expect(await page.evaluate(() => window.legacyParticleCount)).toBe(1050);
  await expect(page.locator('.shape-waves')).toHaveCount(0);
  await choose('Aurora');
  await expect(page.locator('#site-background canvas')).toHaveCount(0);
  await expect(page.locator('.glow-aurora')).toHaveCount(3);
  const particles = await page.evaluate(() => window.legacyFrames.particles);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.legacyFrames.particles)).toBe(particles);
  await choose('Fractal');
  await expect.poll(() => page.evaluate(() => window.legacyFrames.fractal)).toBeGreaterThan(2);
  await choose('None');
  await expect(page.locator('#site-background canvas, #site-background .glow-aurora')).toHaveCount(0);
  const fractal = await page.evaluate(() => window.legacyFrames.fractal);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.legacyFrames.fractal)).toBe(fractal);
  await choose('Shape Waves');
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'active');
  await expect(page.locator('.antigravity, .fractal-background, .glow-aurora')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const [id, name, renderer] of [
  ['antigravity', 'Antigravity', '.antigravity__canvas'],
  ['fractal', 'Fractal', '.fractal-background'],
  ['aurora', 'Aurora', '.site-background__aurora'],
]) {
  test(`restored ${name} survives reload and supports both themes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.addInitScript(value => {
      localStorage.setItem('site-background', value);
      localStorage.setItem('theme', 'dark');
    }, id);
    await open(page);
    await expect(page.locator('body')).toHaveAttribute('data-background', id);
    await expect(page.locator(renderer)).toBeVisible();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator(renderer)).toBeVisible();
    await page.getByRole('button', { name: 'Rogo: change page background' }).click();
    await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
    if (id === 'fractal') {
      await expect.poll(() => page.locator(renderer).evaluate(canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels.some((value, index) => index % 4 === 3 && value > 0);
      })).toBe(true);
    }
    // Let the restored renderer's entrance settle before visual review.
    await page.waitForTimeout(1200);
    await page.screenshot({ path: testInfo.outputPath(`${id}-dark.png`) });
    await page.getByRole('button', { name: 'Close background picker' }).click();
    await page.locator('#theme').click();
    await expect(page.locator('body')).toHaveClass(/light/);
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(241, 245, 249)');
    await expect(page.locator(renderer)).toBeVisible();
    await page.getByRole('button', { name: 'Rogo: change page background' }).click();
    await page.screenshot({ path: testInfo.outputPath(`${id}-light.png`) });
  });
}

test('restored backgrounds provide still alternatives for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await page.getByRole('button', { name: 'Rogo: change page background' }).click();
  for (const name of ['Antigravity', 'Fractal', 'Aurora']) {
    await page.getByRole('radio', { name, exact: true }).check();
    await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'static');
    await expect(page.locator('.antigravity__canvas, .shape-waves__canvas')).toHaveCount(0);
    expect(await page.locator('#site-background').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    const canvas = page.locator('#site-background canvas');
    if (await canvas.count()) {
      const image = await canvas.evaluate(element => element.toDataURL());
      await page.waitForTimeout(150);
      expect(await canvas.evaluate(element => element.toDataURL())).toBe(image);
    }
  }
  await page.getByRole('radio', { name: 'Antigravity', exact: true }).check();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.antigravity__canvas')).toBeVisible();
  await page.emulateMedia({ contrast: 'more' });
  await expect(page.locator('#site-background')).toBeHidden();
  await expect(page.locator('.antigravity__canvas')).toHaveCount(0);
});

test('restored Antigravity falls back when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl2' ? null : getContext.call(this, type, ...args);
    };
  });
  await open(page);
  await page.getByRole('button', { name: 'Rogo: change page background' }).click();
  await page.getByRole('radio', { name: 'Antigravity', exact: true }).check();
  await expect(page.locator('.site-background__layers')).toHaveAttribute('data-background-state', 'fallback');
  await expect(page.locator('.background-static')).toBeVisible();
  await page.getByRole('radio', { name: 'Fractal', exact: true }).check();
  await expect(page.locator('.fractal-background')).toBeVisible();
});
