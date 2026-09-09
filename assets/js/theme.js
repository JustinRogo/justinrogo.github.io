const root = document.documentElement;
const button = document.getElementById('themeToggle');
const media = window.matchMedia('(prefers-color-scheme: dark)');

function currentTheme() {
  return root.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme, persist = true) {
  root.dataset.theme = theme;
  if (persist) {
    try { localStorage.setItem('theme', theme); } catch (_) {}
  }
  const dark = theme === 'dark';
  button?.setAttribute('aria-pressed', String(dark));
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute('content', dark ? '#07101f' : '#f5f7fb');
}

button?.addEventListener('click', () => {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
});

media.addEventListener?.('change', event => {
  try {
    if (!localStorage.getItem('theme')) applyTheme(event.matches ? 'dark' : 'light', false);
  } catch (_) {}
});

applyTheme(currentTheme(), false);
