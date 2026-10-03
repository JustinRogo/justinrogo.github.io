// Focused browser coverage for history, intensity, attraction, silk, and failed detours.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const origin = process.env.SPIDER_TEST_URL || 'http://127.0.0.1:8000';
const routePath = '/Pages/For%20Fun/Spider/';
const screenshots = fs.mkdtempSync(path.join(os.tmpdir(), 'crawler-enhancements-'));

(async () => {
  const browser = await chromium.launch({ channel: process.env.SPIDER_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, reducedMotion: 'reduce' });
    const errors = [], requests = [], failures = new Set();
    let gate = null;
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://en.wikipedia.org/**', async route => {
      const url = new URL(route.request().url());
      const title = url.pathname.includes('/page/html/') ? decodeURIComponent(url.pathname.split('/').pop()) : url.searchParams.get('page');
      requests.push({ title, api: url.pathname.includes('/w/api.php') });
      if (gate?.title === title) await gate.promise;
      if (failures.has(title)) {
        await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"info":"Unavailable"}}' });
        return;
      }
      const html = `<section><p><a id="alpha" href="/wiki/Alpha">Alpha article</a> · <a id="broken" href="/wiki/Broken">Broken article</a></p>${'<p>These words make a long page with plenty of room for spiders and saved reading positions.</p>'.repeat(80)}<p><a id="omega" href="/wiki/Omega">Omega article</a> · <a id="last" href="/wiki/Last">Last article</a></p></section>`;
      await route.fulfill({ contentType: 'text/html', body: html });
    });
    const heading = title => page.waitForFunction(expected => document.querySelector('#article-host').shadowRoot.querySelector('h1')?.textContent === expected, title);
    await page.goto(origin + routePath);
    await heading('Spider');
    await page.evaluate(async () => {
      const { WebCrawler } = await import('/Pages/For%20Fun/Spider/spider.js');
      const draw = WebCrawler.prototype.draw;
      WebCrawler.prototype.draw = function () { window.engine = this; return draw.call(this); };
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(() => window.engine);
    await page.locator('#intensity').evaluate(input => { input.value = 0; input.dispatchEvent(new Event('input')); });
    assert.equal(await page.locator('#intensity-value').innerText(), '0%');
    assert.equal(await page.evaluate(() => engine.intensity), 0);
    assert.match(await page.locator('#intensity').getAttribute('aria-valuetext'), /Subtle/);
    await page.locator('#pause').click();
    await page.locator('#article-host #alpha').hover();
    await page.waitForFunction(() => engine.hoverAnchor?.el.id === 'alpha');
    const beforeHover = await page.evaluate(() => ({ d: Math.hypot(engine.spiders[0].x - engine.point(engine.hoverAnchor).x, engine.spiders[0].y - engine.point(engine.hoverAnchor).y), scroll: document.querySelector('#viewport').scrollTop }));
    await page.waitForTimeout(900);
    const afterHover = await page.evaluate(() => ({ d: Math.hypot(engine.spiders[0].x - engine.point(engine.hoverAnchor).x, engine.spiders[0].y - engine.point(engine.hoverAnchor).y), scroll: document.querySelector('#viewport').scrollTop }));
    assert.ok(afterHover.d < beforeHover.d, 'Hover must attract the spider');
    assert.equal(afterHover.scroll, beforeHover.scroll, 'Hover should hold the camera still');
    await page.mouse.move(5, 5);
    await page.waitForFunction(() => !engine.hoverAnchor);
    await page.locator('#article-host #alpha').focus();
    assert.equal(await page.evaluate(() => engine.focusAnchor?.el.id), 'alpha');
    await page.locator('#pause').click();
    await page.evaluate(() => { document.querySelector('#viewport').scrollTop = 220; document.querySelector('#article-host').shadowRoot.getElementById('alpha').click(); });
    await heading('Alpha');
    assert.deepEqual(await page.locator('#article-trail option').allTextContents(), ['1. Spider', '2. Alpha']);
    await page.locator('#article-back').click();
    await heading('Spider');
    assert.ok(Math.abs(await page.locator('#viewport').evaluate(el => el.scrollTop) - 220) < 2);
    assert.equal(await page.locator('#article-back').isDisabled(), true);
    await page.locator('#article-trail').selectOption('1');
    await heading('Alpha');
    await page.locator('#article-back').click();
    await heading('Spider');
    assert.equal(await page.locator('#intensity').inputValue(), '0');

    await page.evaluate(async () => {
      const { WebCrawler } = await import('/Pages/For%20Fun/Spider/spider.js');
      const root = document.createElement('div'); root.style.cssText = 'position:fixed;left:20px;top:20px;width:350px';
      root.innerHTML = Array.from({length:50}, (_, i) => `<span>word${i} </span>`).join(''); document.body.append(root);
      const canvas = document.createElement('canvas'); canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none'; document.body.append(canvas);
      const crawler = new WebCrawler({ root, canvas, paused:true, intensity:0 }); crawler.bounds();
      const elements = [...root.querySelectorAll('span')];
      for (const el of elements.slice(0, 40)) crawler.infect({el,u:.5,v:.5});
      if (crawler.debris.length || elements.some(el => el.style.fontSize || el.style.transform)) throw new Error('Subtle intensity changed text geometry or created debris');
      const random = Math.random;
      try {
        Math.random = () => 0;
        crawler.setIntensity(1); crawler.infect({el:elements[41],u:.5,v:.5});
        if (parseFloat(elements[41].style.fontSize) <= 1 || crawler.debris.length !== 1 || crawler.speed !== 1) throw new Error('Chaotic intensity must increase effects independently of speed');
        for (let i = 0; i < 60; i++) { crawler.time++; crawler.leaveSilk(crawler.spiders[0], {el:elements[i % 2],u:.5,v:.5}); }
        if (crawler.silk.length !== 36) throw new Error('Silk must have a bounded budget');
        const before = crawler.point(crawler.silk[0].a);
        root.style.top = '40px';
        const after = crawler.point(crawler.silk[0].a);
        if (Math.abs(after.y - before.y - 20) > 1) throw new Error('Silk must remain attached to its elements');
        crawler.time += 13; crawler.setPaused(false); crawler.tick(performance.now());
        if (crawler.silk.length) throw new Error('Expired silk must be removed');
      } finally { Math.random = random; }
      crawler.reset();
      if (crawler.originals.size || crawler.debris.length || crawler.silk.length || elements.some(el => el.style.cssText)) throw new Error('Reset must restore the clean page');
      crawler.destroy();
      elements[0].dispatchEvent(new PointerEvent('pointermove', {bubbles:true,pointerType:'mouse',clientX:30,clientY:40}));
      if (crawler.hoverAnchor) throw new Error('Destroyed crawlers must release hover listeners');
      root.remove(); canvas.remove();
    });

    const startDetour = async id => page.evaluate(async id => {
      const { followSpiderLink } = await import('/Pages/For%20Fun/Spider/app.js');
      const random = Math.random;
      try { Math.random = () => 0; return followSpiderLink(document.querySelector('#article-host').shadowRoot.getElementById(id), 100); }
      finally { Math.random = random; }
    }, id);
    failures.add('Broken'); failures.add('Last');
    let release;
    gate = { title:'Broken', promise:new Promise(resolve => { release = resolve; }) };
    await page.locator('#pause').click();
    await page.evaluate(() => { window.keptArticle = document.querySelector('#article-host').shadowRoot.querySelector('article'); });
    assert.equal(await startDetour('broken'), true);
    await page.waitForFunction(() => document.querySelector('#hint').textContent.includes('following a link to Broken'));
    assert.equal(await page.locator('#loading').isVisible(), false);
    assert.equal(await page.evaluate(() => keptArticle === document.querySelector('#article-host').shadowRoot.querySelector('article')), true);
    release(); gate = null;
    await heading('Omega');
    assert.deepEqual(requests.filter(request => !request.api).slice(-3).map(request => request.title), ['Broken','Last','Omega']);
    assert.deepEqual(await page.locator('#article-trail option').allTextContents(), ['1. Spider','2. Omega']);

    await page.evaluate(() => { window.keptArticle = document.querySelector('#article-host').shadowRoot.querySelector('article'); });
    assert.equal(await startDetour('broken'), true);
    await page.waitForFunction(() => document.querySelector('#hint').textContent.includes('staying on this page'));
    assert.equal(await page.evaluate(() => keptArticle === document.querySelector('#article-host').shadowRoot.querySelector('article')), true);
    assert.equal(await page.locator('#error').isVisible(), false);
    assert.equal(await page.locator('#pause').isEnabled(), true);

    gate = { title:'Slow', promise:new Promise(resolve => { release = resolve; }) };
    await page.evaluate(() => { const a = document.createElement('a'); a.id = 'slow'; a.href = 'https://en.wikipedia.org/wiki/Slow'; a.textContent = 'Slow article'; document.querySelector('#article-host').shadowRoot.querySelector('article').append(a); });
    assert.equal(await startDetour('slow'), true);
    await page.locator('#pause').click();
    release(); gate = null;
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#article-host h1').innerText(), 'Omega');
    assert.equal(await page.locator('#pause').innerText(), 'Resume');
    assert.match(await page.locator('#hint').innerText(), /cancelled/);
    await page.screenshot({ path:path.join(screenshots,'desktop.png'), fullPage:true });
    await page.setViewportSize({width:1000,height:900});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Controls must wrap on tablet-sized screens');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path:path.join(screenshots,'mobile.png'), fullPage:true });
    assert.deepEqual(errors, []);
    console.log('PASS: history/back/reading position, intensity, hover and keyboard attraction, silk cap/expiry/anchors, reset cleanup, detour retries, preserved article, failed-link exclusion, cancellation, mobile layout.');
    console.log('Visual checks:', screenshots);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
