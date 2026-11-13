'use strict';

(() => {
  if (typeof UCPEAUnionWireFeed === 'undefined' || !UCPEAUnionWireFeed.items.length) return;

  const pageSize = 10;
  const { generatedAt, items } = UCPEAUnionWireFeed;
  const stories = [...items].sort((left, right) =>
    (right.publishedOn ?? '').localeCompare(left.publishedOn ?? '')
  );
  const dateFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const refreshFormat = new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  });
  const list = document.getElementById('wire-news-list');
  const status = document.getElementById('wire-status');
  const more = document.getElementById('wire-more');
  const heroTitle = document.getElementById('hero-update-title');
  const heroDate = document.getElementById('hero-update-date');
  const lead = stories[0];
  let shown = 0;

  function setPublicationDate(time, publishedOn) {
    time.dateTime = publishedOn;
    time.textContent = dateFormat.format(new Date(publishedOn));
  }

  function articleLink(story) {
    const link = document.createElement('a');
    link.href = story.url;
    link.textContent = story.title;
    return link;
  }

  function appendStories({ focus = false } = {}) {
    const rows = stories.slice(shown, shown + pageSize).map(story => {
      const row = document.createElement('li');
      row.append(articleLink(story));
      if (story.publishedOn) {
        const date = document.createElement('time');
        setPublicationDate(date, story.publishedOn);
        row.append(date);
      }
      return row;
    });
    list.append(...rows);
    shown += rows.length;
    more.hidden = shown >= stories.length;
    if (focus) rows[0]?.querySelector('a').focus();
  }

  heroTitle.replaceChildren(articleLink(lead));
  if (lead.publishedOn) {
    setPublicationDate(heroDate, lead.publishedOn);
    heroDate.hidden = false;
  }
  if (generatedAt) {
    status.textContent = `Feed refreshed ${refreshFormat.format(new Date(generatedAt))}`;
    status.hidden = false;
  }
  document.getElementById('wire-empty').hidden = true;
  appendStories();
  more.addEventListener('click', () => appendStories({ focus: true }));
})();
