// Optional browser regression checks. Serve the repo on port 8000 first.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const baseURL = process.env.SPIDER_TEST_URL || 'http://127.0.0.1:8000';
const crawlerPath = '/Pages/For%20Fun/Spider/';
const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'web-crawler-'));
(async () => {
  const browser = await chromium.launch({ channel: process.env.SPIDER_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/api/rest_v1/') || response.url().includes('/w/api.php')) console.log('API', response.status(), response.url()); });
  await page.goto(`${baseURL}${crawlerPath}`);
  await page.waitForFunction(() => document.querySelector('#loading').hidden);
  assert.equal(await page.locator('#state').innerText(), 'CRAWLING');
  assert.equal(await page.locator('#article-host h1').innerText(), 'Spider');
  await page.evaluate(async () => {
    const { WebCrawler } = await import('/Pages/For%20Fun/Spider/spider.js');
    const move = WebCrawler.prototype.move;
    WebCrawler.prototype.move = function (...args) { window.testCrawler = this; return move.apply(this, args); };
    const input = document.querySelector('#speed'); input.value = 3; input.dispatchEvent(new Event('input'));
  });
  await page.waitForTimeout(5000);
  assert.ok(Number(await page.locator('#mutations').innerText()) > 0, 'Spider must infect actual article elements');
  await page.locator('#pause').click();
  assert.ok(await page.evaluate(() => testCrawler.spiders.every(s =>
    [s.x,s.y,s.angle,s.vx,s.vy].every(Number.isFinite) && s.legs.filter(l => l.target).length <= 3)), 'Gait must stay finite with at most three lifted feet');
  await page.locator('#frame').screenshot({ path: path.join(screenshots, 'crawl.png') });
  const stopped = await page.evaluate(() => ({ scroll: document.querySelector('#viewport').scrollTop, mutations: testCrawler.originals.size }));
  await page.waitForTimeout(800);
  assert.deepEqual(await page.evaluate(() => ({ scroll: document.querySelector('#viewport').scrollTop, mutations: testCrawler.originals.size })), stopped);
  await page.locator('#count').selectOption('5');
  assert.equal(await page.evaluate(() => testCrawler.spiders.length), 5);
  await page.locator('#reel').check();
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => testCrawler.spiders.every(s => s.x >= 0 && s.x <= testCrawler.width && s.y >= 0 && s.y <= testCrawler.height)), 'Spiders must stay within the resized canvas');
  const reel = await page.locator('.stage').boundingBox();
  assert.ok(Math.abs(reel.width / reel.height - 9 / 16) < .002);
  await page.screenshot({ path: path.join(screenshots, 'reel.png'), fullPage: true });
  await page.locator('#reset').click();
  assert.equal(await page.locator('#mutations').innerText(), '000');
  assert.equal(await page.evaluate(() => document.querySelector('#viewport').scrollTop), 0);
  assert.equal(await page.locator('#pause').innerText(), 'Resume');
  await page.locator('#dark').uncheck();
  assert.equal(await page.locator('#article-host').evaluate(el => el.style.filter), '');
  await page.locator('#reel').uncheck();
  await page.locator('#article-host a[href="https://en.wikipedia.org/wiki/Arachnid"]').first().click();
  await page.waitForFunction(() => document.querySelector('#article-host').shadowRoot.querySelector('h1')?.textContent === 'Arachnid');
  assert.equal(page.url(), `${baseURL}${crawlerPath}`);
  await page.locator('#home-article').click();
  await page.waitForFunction(() => document.querySelector('#article-host').shadowRoot.querySelector('h1')?.textContent === 'Spider');
  await page.evaluate(async () => {
    const { prepareHTML, wikipediaURL } = await import('/Pages/For%20Fun/Spider/app.js');
    const dirty = `<style>body{display:none}</style><script>alert(1)</script><iframe src="evil"></iframe><form><input autofocus></form><p onmouseover="alert(1)"><a href="javascript:alert(1)">bad</a><a href="./Arachnid">good</a><img src="//upload.wikimedia.org/test.jpg" onerror="alert(1)"></p>`;
    const clean = prepareHTML(dirty, new URL('https://en.wikipedia.org/wiki/Spider'));
    if (clean.querySelector('script,style,iframe,form,input,[onerror],[onmouseover]')) throw new Error('Unsafe markup survived');
    if (clean.querySelector('a[href^="javascript:"]')) throw new Error('Unsafe link survived');
    if (!clean.querySelector('a[href="https://en.wikipedia.org/wiki/Arachnid"]')) throw new Error('Relative link unresolved');
    if (wikipediaURL('https://wikipedia.org.evil.test/wiki/Foo') || wikipediaURL('https://example.com/wiki/Foo')) throw new Error('Host validation failed');
  });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: 'reduce' });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(`${baseURL}${crawlerPath}`);
  await mobile.waitForFunction(() => document.querySelector('#loading').hidden);
  assert.equal(await mobile.locator('#pause').innerText(), 'Resume');
  assert.equal(await mobile.locator('#mutations').innerText(), '000');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout must not overflow');
  await mobile.screenshot({ path: path.join(screenshots, 'mobile.png'), fullPage: true });
  await mobile.locator('#reel').check();
  await mobile.screenshot({ path: path.join(screenshots, 'mobile-reel.png'), fullPage: true });
  await mobile.locator('#pause').click();
  await mobile.waitForFunction(() => Number(document.querySelector('#mutations').textContent) > 0);
  const fallback = await browser.newPage();
  await fallback.route('**/api/rest_v1/**', route => route.abort());
  await fallback.goto(`${baseURL}${crawlerPath}`);
  await fallback.waitForFunction(() => document.querySelector('#loading').hidden);
  assert.equal(await fallback.locator('#article-host h1').innerText(), 'Spider');
  const failed = await browser.newPage();
  await failed.route('https://*.wikipedia.org/**', route => route.abort());
  await failed.goto(`${baseURL}${crawlerPath}`);
  await failed.waitForFunction(() => document.querySelector('#loading').hidden);
  assert.equal(await failed.locator('#error').isVisible(), true);
  assert.equal(await failed.locator('[data-article]').count(), 3);
  await page.evaluate(async () => {
    const { WebCrawler, runBookmarklet } = await import('/Pages/For%20Fun/Spider/spider.js');
    const fixture = document.createElement('div'); fixture.style.cssText = 'height:100px;overflow:auto'; fixture.innerHTML = '<p style="color:blue"><a href="#test">A link for the spider</a></p><div style="height:600px"></div>'; document.body.append(fixture);
    const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none'; document.body.append(canvas);
    let plants = 0, endings = 0;
    const crawler = new WebCrawler({ root:fixture,canvas,viewport:fixture,paused:true,maxMutations:1,
      onPlant: () => plants++, onEnd: () => endings++ });
    const p = fixture.querySelector('p'), a = fixture.querySelector('a');
    crawler.infect({el:p,u:.5,v:.5}); crawler.infect({el:a,u:.5,v:.5});
    if (crawler.originals.size !== 1 || a.hasAttribute('style')) throw new Error('Mutation cap failed');
    crawler.bounds(); crawler.setPaused(false);
    const spider = crawler.spiders[0];
    for (const angle of [0, .7, Math.PI, -2.4]) {
      spider.angle = angle;
      for (let index = 0; index < 8; index++) {
        const pose = crawler.legPose(spider, index);
        const joint = crawler.legJoint(pose.hip, pose.ideal, pose.outward);
        const expected = crawler.reach() * .68;
        const first = Math.hypot(joint.x - pose.hip.x, joint.y - pose.hip.y);
        const second = Math.hypot(joint.x - pose.ideal.x, joint.y - pose.ideal.y);
        if (Math.abs(first - expected) > 1e-6 || Math.abs(second - expected) > 1e-6) throw new Error('Articulated leg segment lengths changed while turning');
      }
    }
    spider.legs.forEach(leg => { leg.cooldown = 999; });
    spider.goalUntil = 1000;
    spider.legs[0].target = { el:a,u:.5,v:.5 }; spider.legs[0].progress = 1;
    crawler.move(spider, 0);
    if (spider.goalUntil !== 1000) throw new Error('Blank areas must not continually restart goal selection and probing pauses');
    if (plants !== 1 || crawler.originals.size !== 1) throw new Error('Leg landings must still report after the mutation cap');
    crawler.time = 12;
    crawler.checkEnd(20);
    if (endings !== 0) throw new Error('End callback fired before reaching the bottom');
    fixture.scrollTop = fixture.scrollHeight;
    crawler.checkEnd(3);
    crawler.setPaused(true); crawler.checkEnd(20);
    if (endings !== 0 || crawler.endTime !== 3) throw new Error('Pause must stop the end-of-page dwell');
    crawler.setPaused(false); crawler.checkEnd(3); crawler.checkEnd(20);
    if (endings !== 1) throw new Error('End callback must fire once after the dwell');
    crawler.reset(); if (p.getAttribute('style') !== 'color:blue') throw new Error('Original style not restored');
    crawler.checkEnd(6);
    if (endings !== 1) throw new Error('Short pages must get an initial crawling interval');
    crawler.time = 12; crawler.checkEnd(0);
    if (endings !== 2) throw new Error('Reset must rearm the end callback');
    for (const fps of [30, 60, 144]) {
      crawler.setCount(5);
      for (let frame = 0; frame < fps * 4; frame++) {
        crawler.time += 1 / fps;
        for (const body of crawler.spiders) crawler.move(body, 1 / fps);
      }
      if (!crawler.spiders.every(body => [body.x,body.y,body.vx,body.vy,body.angle].every(Number.isFinite)
        && body.legs.filter(leg => leg.target).length <= 3)) throw new Error(`Unstable gait at ${fps} fps`);
    }
    crawler.destroy(); fixture.remove(); canvas.remove();
    runBookmarklet(); if (!window.__webCrawlerBookmarklet) throw new Error('Bookmarklet did not start');
    runBookmarklet(); if (window.__webCrawlerBookmarklet) throw new Error('Bookmarklet did not close');
  });
  // Deterministic articles and random rolls exercise detours without waiting for luck.
  const automatic = await browser.newPage({ reducedMotion: 'reduce' });
  automatic.on('pageerror', error => errors.push(error.message));
  const visits = [];
  await automatic.route('**/api/rest_v1/page/html/**', route => {
    const title = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());
    visits.push(title);
    const paragraphs = '<p>Long stretches of text give the spiders room to crawl, plant their feet, and infect the page.</p>'.repeat(80);
    const html = `<section><p><a id="first" href="/wiki/Alpha">Alpha</a> <a id="self" href="/wiki/${title}#cite_note">Footnote</a> <a id="external" href="https://example.com/">External</a> <a id="file" href="/wiki/File:Spider.jpg">File</a> <a id="red" class="new" href="/wiki/Missing">Missing</a></p>${paragraphs}<p><a href="/wiki/Omega">Omega</a> <a id="last" href="/wiki/Last">Last article</a></p><div class="navbox"><a id="hidden" href="/wiki/Hidden">Hidden</a></div></section>`;
    return route.fulfill({ status:200, contentType:'text/html', body:html });
  });
  await automatic.goto(`${baseURL}${crawlerPath}`);
  await automatic.waitForFunction(() => document.querySelector('#loading').hidden);
  await automatic.evaluate(async () => {
    const app = await import('/Pages/For%20Fun/Spider/app.js');
    const root = document.querySelector('#article-host').shadowRoot;
    for (const id of ['self', 'external', 'file', 'red', 'hidden']) {
      if (app.automaticArticleURL(root.getElementById(id))) throw new Error(`Ineligible automatic link: ${id}`);
    }
    const random = Math.random;
    try {
      Math.random = () => 0;
      if (app.followSpiderLink(root.getElementById('first'), 100) || app.followLastArticle()) throw new Error('Paused spiders navigated');
    } finally { Math.random = random; }
    const { WebCrawler } = await import('/Pages/For%20Fun/Spider/spider.js');
    const move = WebCrawler.prototype.move;
    WebCrawler.prototype.move = function (...args) { window.autoCrawler = this; return move.apply(this, args); };
  });
  await automatic.locator('#pause').click();
  await automatic.waitForFunction(() => window.autoCrawler);
  await automatic.evaluate(async () => {
    const app = await import('/Pages/For%20Fun/Spider/app.js');
    const link = document.querySelector('#article-host').shadowRoot.getElementById('first');
    const random = Math.random;
    try {
      Math.random = () => 1;
      if (app.followSpiderLink(link, 40)) throw new Error('An ordinary footstep should not navigate');
      Math.random = () => 0;
      if (app.followSpiderLink(link, 29)) throw new Error('Detours must wait for an initial crawl');
      if (!window.autoCrawler.onPlant(link, 40)) throw new Error('An eligible lucky landing should follow its link');
      if (app.followSpiderLink(link, 40)) throw new Error('Concurrent landings started another navigation');
    } finally { Math.random = random; }
  });
  await automatic.waitForFunction(() => document.querySelector('#article-host').shadowRoot.querySelector('h1')?.textContent === 'Alpha');
  assert.match(await automatic.locator('#hint').innerText(), /spider followed a link to Alpha/);
  await automatic.waitForFunction(() => window.autoCrawler.root === document.querySelector('#article-host').shadowRoot.querySelector('article'));
  await automatic.evaluate(async () => {
    const app = await import('/Pages/For%20Fun/Spider/app.js');
    const root = document.querySelector('#article-host').shadowRoot;
    if (app.automaticArticleURL(root.getElementById('first'))) throw new Error('Recently visited article must be skipped');
    const engine = window.autoCrawler;
    const scroller = document.querySelector('#viewport'); scroller.scrollTop = scroller.scrollHeight;
    engine.time = 12;
    const random = Math.random;
    try {
      Math.random = () => 0;
      engine.checkEnd(6); engine.checkEnd(6);
    } finally { Math.random = random; }
  });
  await automatic.waitForFunction(() => document.querySelector('#article-host').shadowRoot.querySelector('h1')?.textContent === 'Last');
  assert.deepEqual(visits, ['Spider', 'Alpha', 'Last']);
  assert.equal(automatic.url(), `${baseURL}${crawlerPath}`);
  await automatic.locator('#pause').click();
  await automatic.evaluate(async () => {
    const { followLastArticle } = await import('/Pages/For%20Fun/Spider/app.js');
    if (followLastArticle()) throw new Error('End navigation must respect pause');
    const root = document.querySelector('#article-host').shadowRoot;
    for (const link of root.querySelectorAll('a')) link.setAttribute('href', 'https://example.com/');
  });
  await automatic.locator('#pause').click();
  await automatic.evaluate(async () => {
    const { followLastArticle } = await import('/Pages/For%20Fun/Spider/app.js');
    if (followLastArticle()) throw new Error('End navigation must not leave Wikipedia');
  });
  assert.match(await automatic.locator('#hint').innerText(), /ran out of new Wikipedia links/);
  await page.goto(`${baseURL}/`);
  await page.locator('#pageTree a[href="Pages/For Fun/Spider/index.html"]').waitFor({state:'attached'});
  assert.equal(await page.locator('#pageTree a[href="Pages/For Fun/Spider/index.html"]').evaluate(el => el.classList.contains('page-link--parent')), false);
  assert.deepEqual(errors, []);
  console.log('PASS: live Wikipedia, infection, pause, count, reset, dark, reel, navigation, sanitizer, mobile, reduced motion, API fallback, friendly failure, mutation cap, bookmarklet, homepage link, rare detours, end-of-page continuation, navigation guards.');
  console.log('Visual checks:', screenshots);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
