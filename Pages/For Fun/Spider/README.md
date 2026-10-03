# Web Crawler — Wikipedia edition

Open **https://justinrogo.github.io/Pages/For%20Fun/Spider/** after the site is deployed. This first version automatically loads [Wikipedia’s Spider article](https://en.wikipedia.org/wiki/Spider). Follow Wikipedia links inside the article to crawl another article; citations scroll to their footnotes. “Back to Spider” returns to the starting article. External links stay in the experiment and show a short explanation.

## Setup

Plain HTML, CSS, and ES modules; no build step, keys, or proxy. DOMPurify 3.3.0 loads from jsDelivr; the UI fonts load from Google Fonts. Serve the repository over HTTP to preview (opening `index.html` as `file://` will block modules):

```sh
python -m http.server 8000
```

Visit http://localhost:8000/Pages/For%20Fun/Spider/. The existing GitHub Pages workflow includes this folder through its `Pages/` directory in the published artifact. The homepage lists this experiment under For Fun → Spider.

## Controls

Spiders occasionally follow a Wikipedia article link when a leg lands on it. Each article gets at least 30 seconds of animation time before a random detour becomes possible, with a 0.4% chance per eligible footstep divided by the spider count. Speed changes how quickly animation time passes. After the view reaches the bottom, spiders linger for six animation seconds, then choose among the last eight distinct eligible Wikipedia article links. Short articles get at least twelve animation seconds before this fallback. Automatic navigation avoids the six most recently loaded articles, same-page footnotes, red links, hidden links, and namespace pages such as files and categories. Pause stops both kinds of automatic navigation. The bookmarklet continues to crawl its current live page.

- Speed: 0.25×–3×. Spiders: 1–5.
- Intensity: 0–100%, from subtle outlines and color shifts to enlarged type, stronger rotations, highlights, and debris. Changes apply to new mutations independently of speed. Reset gives the selected intensity a clean page to work on.
- Article trail: Back and the visited-page menu revisit up to 30 successful loads. Revisiting starts a fresh crawler at the saved reading position. New exploration from an older entry replaces the forward branch, like browser history. The trail lasts for the current page session.
- Pause stops movement, mutations, and automatic scrolling. Manual scrolling still works. Reduced-motion visitors start paused; Resume explicitly starts the animation.
- Reset restores a clean, cached copy of the current article and scrolls to its beginning, preserving the controls and pause state.
- Dark page applies `invert(1) hue-rotate(180deg)` to the article alone. Infected colors are also inverted; the neon canvas stays unchanged.
- 9:16 reel frames the article and animation in a vertical view with a small watermark. Record the article area, excluding the browser bar and telemetry, for an exact 9:16 clip.

Tab reaches all controls and the scrollable article. Arrow/Page Up/Page Down keys scroll the article when its region is focused. Wikipedia links support keyboard activation.

Hover over article text to attract the spiders. Keyboard focus on an article link does the same. The camera holds still while a target is active, so you can guide the next footsteps. Moving away or focusing a control releases the attraction. Touch scrolling and link clicks keep their normal behavior.

Occasional silk threads connect recent footholds. They stay attached to the text, fade over twelve animation seconds, and are limited to 36 threads. Pausing freezes the fade; Reset clears the threads and text mutations.

## Loading and isolation

`app.js` requests `https://{language}.wikipedia.org/api/rest_v1/page/html/{title}` with no credentials. If REST fails or times out, it retries Wikipedia’s Action API (`action=parse&prop=text&origin=*`) directly. Each request times out after 12 seconds. An interrupted article load is aborted, preventing old responses from overwriting newer navigation. Up to six sanitized articles are cached in memory.

Automatic detours leave the current article and its mutations visible while fetching. If a destination fails, the crawler tries up to two other eligible links from the current page. Only a successful load replaces the article and enters the trail. If all attempts fail, crawling resumes on the existing page; failed automatic destinations are excluded until the article is reset or replaced, with a brief cooldown before another detour. Pause cancels an in-flight automatic detour. Manual navigation or history selection also cancels any older request.

DOMPurify strips scripts, handlers, frames, forms, embeds, and fetched CSS. Relative image, `srcset`, and link URLs are resolved against the article URL. Small text spans become individual footholds. Content renders in a shadow root with a local Wikipedia-like stylesheet. Remote styles and inline styles are deliberately replaced by this stylesheet in this Wikipedia-only edition: article typography and infoboxes remain readable without importing Wikipedia’s application chrome or arbitrary CSS. Text is attributed to Wikipedia and CC BY-SA 4.0 below the view; images retain their article captions and links to their individual licensing information.

Only HTTPS Wikipedia article URLs are accepted. There is no address input, `PROXY_URL`, or Cloudflare Worker in this edition. A proxy and arbitrary-site loading are deferred until that feature is requested.

## Shared animation

`spider.js` exports `WebCrawler` and `runBookmarklet`. Inspired by the supplied procedural-crawler video, the engine draws a small triangulated body mesh and eight long articulated legs in a device-pixel-ratio-aware canvas. The body turns into its direction of travel, alternates probing pauses with short scuttles, and responds to tension from planted feet. Leg fans turn with the body; knees use two-segment geometry and up to three feet lift at once. New footholds favor nearby links and untouched text, using individual line boxes for wrapped text. Feet retain an element plus a fractional point in its bounding rectangle, so scrolling, font changes, and resizing keep planted feet attached. Visible candidates refresh on a throttled scan; only planted feet and debris need per-frame geometry. Occasional larger fonts and more dramatic rotations join the highlights and outlines, with scattered text fragments. Autoscroll follows the leading spider and carries its body with the document.

Each touched element is mutated once, with a maximum of 420 mutations and 48 floating text fragments per session. Styles are recorded before mutation and restored by the core’s `reset()`/`destroy()`. The page reset additionally recreates the pristine article. Animations use `requestAnimationFrame`, clamp elapsed time, suspend while the tab is hidden, and keep the canvas pointer-transparent. Autoscroll follows the speed control; at the end of the article, the page uses the shared core’s `onEnd` callback to continue to another article. The `onPlant` callback reports actual leg landings, even after the mutation cap is reached.

## Browser checks

`tests/spider.browser.cjs` verifies the live Spider article, controls, link loading, sanitization, mobile and reel layout, reduced motion, REST fallback, fetch errors, mutation limits, style restoration, the bookmarklet, and the homepage link. Deterministic checks cover rare spider detours, end-of-page continuation, pause and reset, link eligibility, and prevention of concurrent navigation. These optional development checks use Playwright; the site itself has no Node dependency. With Playwright available to Node and the preview server running, run:

```sh
node tests/spider.browser.cjs
node tests/spider-enhancements.browser.cjs
```

On Windows it uses installed Edge; elsewhere it uses Playwright Chromium. Set `SPIDER_BROWSER_CHANNEL` to select another installed browser channel, and `SPIDER_TEST_URL` to change the preview origin. Screenshots are saved to a temporary directory printed by the test. The live API checks require network access to Wikipedia and jsDelivr.

The focused enhancement checks cover history and saved reading positions, intensity, hover and keyboard attraction, thread budgets and expiry, cleanup, deterministic detour failures, preserved content, cancellation, and mobile layout.

## Bookmarklet

Drag **“Take the spider with you”** to the bookmarks bar. On a normal live page, click that bookmark. It imports the shared `spider.js` from the site and adds a small Pause/Resume, Reset, and Close toolbar. Close, Escape, or invoking the bookmark again removes the crawler and restores the styles it changed. It operates on the accessible main document; cross-origin frames and existing closed shadow roots cannot be crawled. Reset and Close preserve page changes made outside touched elements, but restore the entire original inline style attribute of each touched element.

For a bookmark created manually, use:

```js
javascript:(()=>{import('https://justinrogo.github.io/Pages/For%20Fun/Spider/spider.js').then(m=>m.runBookmarklet()).catch(()=>alert('This page blocked the spider. Try another page.'));})();
```

GitHub Pages must serve the module before the public bookmarklet works. A bookmarklet dragged from a local preview imports from that local server instead. Some pages’ Content Security Policies block JavaScript bookmarks or external module imports; browser internal pages also prohibit them. No bookmarklet can bypass those restrictions.
