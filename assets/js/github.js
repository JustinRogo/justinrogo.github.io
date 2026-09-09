const mount = document.getElementById('githubFeed');

function relativeTime(dateString) {
  const value = new Date(dateString).getTime();
  const seconds = Math.max(1, Math.round((Date.now() - value) / 1000));
  const units = [[31536000,'year'],[2592000,'month'],[604800,'week'],[86400,'day'],[3600,'hour'],[60,'minute']];
  for (const [size, label] of units) {
    if (seconds >= size) {
      const amount = Math.floor(seconds / size);
      return `${amount} ${label}${amount === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}

function render(items) {
  if (!mount) return;
  if (!items.length) {
    mount.innerHTML = '<p class="feed-error">No recent public commit activity found.</p>';
    return;
  }
  mount.replaceChildren(...items.map(item => {
    const link = document.createElement('a');
    link.className = 'feed-item';
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const title = document.createElement('strong');
    title.textContent = item.message;
    const meta = document.createElement('small');
    meta.textContent = `${item.repo} · ${relativeTime(item.createdAt)}`;
    link.append(title, meta);
    return link;
  }));
}

async function loadGitHubActivity() {
  if (!mount) return;
  try {
    const response = await fetch('https://api.github.com/users/JustinRogo/events?per_page=30', {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub request failed (${response.status})`);
    const events = await response.json();
    const items = [];
    for (const event of events) {
      if (event.type !== 'PushEvent' || !Array.isArray(event.payload?.commits)) continue;
      for (const commit of event.payload.commits) {
        items.push({
          message: String(commit.message || 'Commit').split('\n')[0],
          repo: event.repo?.name || 'GitHub',
          createdAt: event.created_at,
          url: `https://github.com/${event.repo?.name}/commit/${commit.sha}`
        });
        if (items.length >= 4) break;
      }
      if (items.length >= 4) break;
    }
    render(items);
  } catch (error) {
    mount.innerHTML = '<p class="feed-error">GitHub activity is temporarily unavailable. <a href="https://github.com/JustinRogo" target="_blank" rel="noopener noreferrer">Open profile ↗</a></p>';
  }
}

loadGitHubActivity();
