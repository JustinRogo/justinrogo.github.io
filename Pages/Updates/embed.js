const params = new URLSearchParams(location.search);
const preview = params.get('preview') === '1';
const limit = Math.min(5, Math.max(1, Number.parseInt(params.get('limit'), 10) || 3));
const theme = params.get('theme') || 'light';
document.body.classList.toggle('light', theme !== 'dark' && !(theme === 'auto' && matchMedia('(prefers-color-scheme:dark)').matches));
const feed = document.querySelector('#widget-feed');
const date = value => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

async function load() {
  feed.setAttribute('aria-busy', 'true');
  feed.replaceChildren();
  try {
    let posts;
    if (preview) {
      posts = (await import('./preview.js')).previewPosts;
      document.querySelector('#preview-banner').hidden = false;
      document.querySelector('.widget-heading a').href = '/updates?preview=1';
    } else {
      const response = await fetch('/api/updates?action=posts');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Updates could not be loaded.');
      posts = data.posts;
    }
    if (!posts.length) {
      const p = document.createElement('p');
      p.className = 'widget-status';
      p.textContent = 'No updates yet. Check back soon.';
      feed.append(p);
    }
    for (const post of posts.slice(0, limit)) {
      const article = document.createElement('article');
      article.className = 'widget-post';
      const time = document.createElement('time');
      time.dateTime = post.published_at;
      time.textContent = date(post.published_at);
      const title = document.createElement('h2');
      const link = document.createElement('a');
      link.href = `/updates?${preview ? 'preview=1&' : ''}post=${encodeURIComponent(post.id)}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = post.title;
      title.append(link);
      const text = document.createElement('p');
      text.textContent = post.excerpt;
      article.append(time, title, text);
      feed.append(article);
    }
  } catch (error) {
    const p = document.createElement('p');
    p.className = 'widget-status';
    p.textContent = 'Updates are unavailable right now.';
    const retry = document.createElement('button');
    retry.className = 'outline-button';
    retry.textContent = 'Try again';
    retry.addEventListener('click', load);
    p.append(retry);
    feed.append(p);
  } finally {
    feed.setAttribute('aria-busy', 'false');
  }
}
load();
