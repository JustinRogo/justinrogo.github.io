const mount = document.getElementById('blogFeed');
const feedUrl = 'https://library.law.uconn.edu/category/blog/feed/';
const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

async function loadBlogFeed() {
  if (!mount) return;
  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Feed request failed (${response.status})`);
    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items.slice(0, 3) : [];
    if (!items.length) throw new Error('No feed items');
    mount.replaceChildren(...items.map(item => {
      const link = document.createElement('a');
      link.className = 'feed-item';
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const title = document.createElement('strong');
      title.textContent = item.title || 'The Pocket Part';
      const meta = document.createElement('small');
      meta.textContent = formatDate(item.pubDate);
      link.append(title, meta);
      return link;
    }));
  } catch (error) {
    mount.innerHTML = '<p class="feed-error">Recent posts are temporarily unavailable. <a href="https://library.law.uconn.edu/the-pocket-part/" target="_blank" rel="noopener noreferrer">Open The Pocket Part ↗</a></p>';
  }
}

loadBlogFeed();
