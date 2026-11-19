// Paints the homepage's saved site style and light/dark choice before the page
// renders: Botanical (the default), Original (this page's own blue design) or
// Risograph. The site shell (/v2/assets/shell.js) then takes over: it owns
// later changes, from its toggle, its Settings sheet or another tab, and fires
// `site-style-change` so the charts redraw.
(function () {
  var root = document.documentElement;
  var styles = ['botanical', 'original', 'riso'];
  var fonts = {
    botanical: 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,0..100;1,9..144,300..700,0..100&display=swap',
    riso: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap',
  };
  // Same browser colours as the homepage (themeColors in v2/src/botanical/siteStyle.js).
  var chrome = {
    botanical: { light: '#efe8d8', dark: '#0c1b14' },
    original: { light: '#e6efff', dark: '#060f23' },
    riso: { light: '#f2e9d4', dark: '#1c1a18' },
  };
  var preferences = {};
  try {
    preferences = JSON.parse(localStorage.getItem('jr-v2-preferences') || 'null') || {};
  } catch (error) {}
  var style = styles.indexOf(preferences.style) !== -1 ? preferences.style : 'botanical';
  var dark = preferences.theme === 'dark' ||
    (preferences.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  var theme = dark ? 'dark' : 'light';
  root.dataset.style = style;
  root.dataset.theme = theme;
  // The shell replaces the fallback masthead; shell.js removes this if it fails to load.
  root.classList.add('has-shell');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = chrome[style][theme];
  if (fonts[style]) {
    var link = document.createElement('link');
    link.id = style + '-fonts';
    link.rel = 'stylesheet';
    link.href = fonts[style];
    document.head.append(link);
  }
})();
