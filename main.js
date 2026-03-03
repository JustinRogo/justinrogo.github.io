'use strict';

/* ===================================================================
   Language color map for GitHub Projects
   =================================================================== */
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Ruby: '#701516',
  Go: '#00ADD8',
  Java: '#b07219',
  'C#': '#178600',
  'Jupyter Notebook': '#DA5B0B',
};

/* ===================================================================
   CliftonStrengths
   =================================================================== */
(function mountCliftonStrengths() {
  const mount = document.getElementById('csMount');
  if (!mount) return;

  const html = `<h2 id="CSh2"></h2>
    <div id="CS">
      <div class="summary">
        <h3>My <strong>CliftonStrengths Themes</strong></h3>
        <div class="bar">
          <div class="green"></div>
          <div class="blue"></div>
          <div class="purple"></div>
          <div class="orange"></div>
        </div>
        <div class="controls">
          <button data-limit="5">Top 5</button>
          <button data-limit="10">Top 10</button>
          <button data-limit="all">Show All</button>
        </div>
      </div>
      </br>
      <div class="card">
        <div class="toggle-buttons">
          <button class="active" data-show-content="best" style="color:var(--text);">When I'm at my best 🌞</button>
          <button data-show-content="overextended" style="color:var(--text);">When I'm overextended 🌧️</button>
        </div>
        <div id="best" class="content active">
          <p>I thrive on connecting ideas in unexpected ways, constantly generating new concepts and creative
            approaches to problems. My mind is always in motion, scanning for patterns and possibilities. I think
            several steps ahead, intuitively sensing the most effective path forward and adjusting my plans as I go.
            I love to learn and collect information—not just for the sake of knowing, but because I see the
            potential in every detail to spark something greater. I'm energized by bringing order to chaos, juggling
            moving parts, and organizing people or projects for maximum impact. Challenges don't intimidate me—in
            fact, I'm driven to fix what's broken, improve systems, and restore what isn't working to a better
            state. I'm at my best when I'm solving complex problems with flexibility, insight, and a deep toolbox of
            ideas and resources.</p>
        </div>
        <div id="overextended" class="content">
          <p>I sometimes get so caught up in chasing new ideas that I lose focus or leave others behind who need
            more structure. My mind is constantly running through possibilities, which can make me seem scattered or
            hard to follow. I gather information endlessly, but I don't always pause to use or share what I've
            collected—and I can become a bottleneck, hoarding ideas or over-researching. My desire to optimize and
            rearrange everything can come across as controlling or impatient, especially when others prefer
            consistency. And while I'm driven to solve problems, I can focus so heavily on what's broken that I
            overlook what's already working, or become critical instead of constructive. I want things to be
            better—but if I'm not careful, I might overwhelm others or myself in the process.</p>
        </div>
      </div>
      </br>
      <!-- Strategic Thinking -->
      <section class="section">
        <h2>Strategic Thinking <span style="background:var(--green)"></span></h2>
        <div class="list">
          <div class="item top10" data-domain="thinking" data-desc="Ideation: You generate novel connections and angles, turning disparate dots into fresh concepts and creative options."><span class="rank">1</span><span class="name">Ideation</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Strategic: You scan the landscape, play out scenarios, and choose the path with the strongest leverage and least regret."><span class="rank">2</span><span class="name">Strategic</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Input: You collect information, examples, and resources, building a well you draw from to solve problems and spark ideas."><span class="rank">3</span><span class="name">Input</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Intellection: You relish thinking deeply, turning issues over privately and in dialogue until the ideas are clear and precise."><span class="rank">7</span><span class="name">Intellection</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Analytical: You test assumptions with data, look for patterns and drivers, and explain decisions with evidence."><span class="rank">8</span><span class="name">Analytical</span></div>
          <div class="item" data-domain="thinking" data-desc="Futuristic: You paint compelling pictures of what could be and backcast steps that make the future feel reachable."><span class="rank">11</span><span class="name">Futuristic</span></div>
          <div class="item" data-domain="thinking" data-desc="Learner: You are energized by the learning curve, acquiring skills fast and sharing discoveries as you go."><span class="rank">13</span><span class="name">Learner</span></div>
          <div class="item" data-domain="thinking" data-desc="Context: You anchor decisions in history and precedent, using what happened before to avoid repeating mistakes."><span class="rank">29</span><span class="name">Context</span></div>
        </div>
      </section>
      <!-- Executing -->
      <section class="section">
        <h2>Executing <span style="background:var(--purple)"></span></h2>
        <div class="list">
          <div class="item top10" data-domain="executing" data-desc="Arranger: You orchestrate moving parts and people in real time, reconfiguring plans to improve flow and outcomes without dropping the ball."><span class="rank">4</span><span class="name">Arranger</span></div>
          <div class="item top10" data-domain="executing" data-desc="Restorative: You zero in on what's broken, diagnose root causes, and methodically apply fixes until performance is restored and better than before."><span class="rank">5</span><span class="name">Restorative</span></div>
          <div class="item" data-domain="executing" data-desc="Belief: Clear core values drive your choices; you bring purpose and steadiness when priorities drift or pressure tempts shortcuts."><span class="rank">17</span><span class="name">Belief</span></div>
          <div class="item" data-domain="executing" data-desc="Responsibility: You make ownership visible by following through, clarifying expectations, and cleaning up messes others leave behind."><span class="rank">24</span><span class="name">Responsibility</span></div>
          <div class="item" data-domain="executing" data-desc="Focus: You narrow attention to the critical path, set milestones, reject distractions, and keep momentum until the goal is finished."><span class="rank">26</span><span class="name">Focus</span></div>
          <div class="item" data-domain="executing" data-desc="Achiever: A steady internal motor pushes you to complete tasks daily; you measure progress by tangible outputs and productive days."><span class="rank">28</span><span class="name">Achiever</span></div>
          <div class="item" data-domain="executing" data-desc="Discipline: You build structure, routines, and checklists so work is predictable; ambiguity shrinks as you impose order and cadence."><span class="rank">31</span><span class="name">Discipline</span></div>
          <div class="item" data-domain="executing" data-desc="Deliberative: You surface risks, weigh trade-offs, and choose the safest viable route; speed increases only after hazards are removed."><span class="rank">32</span><span class="name">Deliberative</span></div>
          <div class="item" data-domain="executing" data-desc="Consistency: You create clear rules and equal standards so people know what's fair; stability and repeatability are your quality controls."><span class="rank">34</span><span class="name">Consistency</span></div>
        </div>
      </section>
      <!-- Relationship Building -->
      <section class="section">
        <h2>Relationship Building <span style="background:var(--blue)"></span></h2>
        <div class="list">
          <div class="item top10" data-domain="relationship" data-desc="Adaptability: You pivot gracefully as realities change, absorbing shocks and adjusting plans without drama."><span class="rank">6</span><span class="name">Adaptability</span></div>
          <div class="item top10" data-domain="relationship" data-desc="Individualization: You notice unique patterns in people and tailor roles, recognition, and communication to fit each person."><span class="rank">9</span><span class="name">Individualization</span></div>
          <div class="item top10" data-domain="relationship" data-desc="Developer: You spot nascent potential and design experiences, feedback, and stretch assignments that accelerate growth."><span class="rank">10</span><span class="name">Developer</span></div>
          <div class="item" data-domain="relationship" data-desc="Connectedness: You see patterns and interdependence, reminding teams of the bigger picture and shared impact of choices."><span class="rank">12</span><span class="name">Connectedness</span></div>
          <div class="item" data-domain="relationship" data-desc="Positivity: You lift the emotional climate with optimism, celebrations, and reframes that keep people moving through setbacks."><span class="rank">14</span><span class="name">Positivity</span></div>
          <div class="item" data-domain="relationship" data-desc="Empathy: You read emotional cues and name what others feel, creating safety and shaping responses that meet people where they are."><span class="rank">18</span><span class="name">Empathy</span></div>
          <div class="item" data-domain="relationship" data-desc="Includer: You expand the circle, remove social barriers, and ensure voices on the margins are invited and heard."><span class="rank">21</span><span class="name">Includer</span></div>
          <div class="item" data-domain="relationship" data-desc="Relator: You invest in a few deep, trusting relationships and do your best work with people you truly know."><span class="rank">22</span><span class="name">Relator</span></div>
          <div class="item" data-domain="relationship" data-desc="Harmony: You lower friction by finding common ground, steering conversations toward practical agreement and away from unproductive conflict."><span class="rank">33</span><span class="name">Harmony</span></div>
        </div>
      </section>
      <!-- Influencing -->
      <section class="section">
        <h2>Influencing <span style="background:var(--orange)"></span></h2>
        <div class="list">
          <div class="item" data-domain="influencing" data-desc="Communication: You translate ideas into vivid stories, examples, and images so others understand, remember, and act."><span class="rank">15</span><span class="name">Communication</span></div>
          <div class="item" data-domain="influencing" data-desc="Activator: You convert talk into motion, launching experiments and learning by doing rather than waiting for perfect plans."><span class="rank">16</span><span class="name">Activator</span></div>
          <div class="item" data-domain="influencing" data-desc="Woo: You energize first meetings, disarm strangers with charm, and expand networks that make collaboration easier later."><span class="rank">19</span><span class="name">Woo</span></div>
          <div class="item" data-domain="influencing" data-desc="Command: You project presence, cut through ambiguity, and state positions plainly so groups can decide and move."><span class="rank">20</span><span class="name">Command</span></div>
          <div class="item" data-domain="influencing" data-desc="Self-Assurance: You trust your internal compass, make bold calls under uncertainty, and lend confidence to wobbly teams."><span class="rank">23</span><span class="name">Self-Assurance</span></div>
          <div class="item" data-domain="influencing" data-desc="Competition: Scoreboards motivate you; you benchmark, set stretch targets, and use rivals as fuel to raise performance."><span class="rank">25</span><span class="name">Competition</span></div>
          <div class="item" data-domain="influencing" data-desc="Maximizer: You invest where strengths already exist, polishing good into excellent and reallocating effort away from mediocrity."><span class="rank">27</span><span class="name">Maximizer</span></div>
          <div class="item" data-domain="influencing" data-desc="Significance: You aim for work that matters and is noticed; visibility and high stakes bring out your best contribution."><span class="rank">30</span><span class="name">Significance</span></div>
        </div>
      </section>

      <!-- Modal -->
      <div id="modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-content">
          <button class="close" aria-label="Close">&times;</button>
          <h3 id="modal-title"></h3>
          <p id="modal-desc"></p>
        </div>
      </div>
    </div>`;

  mount.innerHTML = html;

  // Strengths filter controls
  const controlBtns = mount.querySelectorAll('.controls button');

  function filterStrengths(limit) {
    mount.querySelectorAll('.item').forEach(item => {
      const rank = parseInt(item.querySelector('.rank').textContent, 10);
      item.style.display = (limit === 'all' || rank <= limit) ? '' : 'none';
    });
  }

  if (controlBtns.length) {
    controlBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const limit = btn.dataset.limit === 'all' ? 'all' : parseInt(btn.dataset.limit, 10);
        filterStrengths(limit);
        controlBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    const allBtn = mount.querySelector('.controls button[data-limit="all"]');
    if (allBtn) { allBtn.classList.add('active'); filterStrengths('all'); }
  }

  // Modal
  const modal = mount.querySelector('#modal');
  const modalTitle = mount.querySelector('#modal-title');
  const modalDesc = mount.querySelector('#modal-desc');

  if (modal && modalTitle && modalDesc) {
    mount.querySelectorAll('.item').forEach(item => {
      item.addEventListener('click', () => {
        modalTitle.textContent = item.querySelector('.name').textContent;
        modalDesc.textContent = item.dataset.desc;
        modal.style.display = 'flex';
      });
    });

    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.style.display === 'flex') modal.style.display = 'none';
    });
  }

  // Content toggle (event delegation, replaces window.showContent)
  mount.addEventListener('click', e => {
    const btn = e.target.closest('[data-show-content]');
    if (!btn) return;
    const id = btn.dataset.showContent;
    mount.querySelectorAll('.content').forEach(div => div.classList.remove('active'));
    mount.querySelectorAll('.toggle-buttons button').forEach(b => b.classList.remove('active'));
    const panel = mount.querySelector('#' + id);
    if (panel) panel.classList.add('active');
    btn.classList.add('active');
  });
})();

/* ===================================================================
   Trello Card Counts
   =================================================================== */
fetch('https://justinrogo.github.io/data/cards_count.json')
  .then(r => r.json())
  .then(({ total_count, completed_count }) => {
    const tot = document.getElementById('trelloTotal');
    const done = document.getElementById('trelloDone');
    if (tot) tot.textContent = total_count;
    if (done) done.textContent = completed_count;
  })
  .catch(() => {
    const tot = document.getElementById('trelloTotal');
    if (tot) tot.textContent = '—';
  });

/* ===================================================================
   Theme Toggle
   =================================================================== */
(function initTheme() {
  const body = document.body;
  const btn = document.getElementById('theme');
  if (localStorage.getItem('theme') === 'light') body.classList.add('light');
  if (btn) {
    btn.addEventListener('click', () => {
      body.classList.toggle('light');
      localStorage.setItem('theme', body.classList.contains('light') ? 'light' : 'dark');
    });
  }
})();

/* ===================================================================
   Share Button
   =================================================================== */
(function initShare() {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await navigator.share?.({ title: document.title, url: location.href });
    } catch {
      try {
        await navigator.clipboard?.writeText(location.href);
        const orig = btn.innerHTML;
        btn.textContent = 'Link copied!';
        setTimeout(() => { btn.innerHTML = orig; }, 1400);
      } catch {
        /* clipboard blocked — silently ignore */
      }
    }
  });
})();

/* ===================================================================
   Clock + Year
   =================================================================== */
(function initClock() {
  const el = document.getElementById('time');
  const yr = document.getElementById('year');

  if (yr) yr.textContent = new Date().getFullYear();

  if (el) {
    function tick() {
      el.textContent = new Date().toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        weekday: 'short', month: 'short', day: '2-digit',
      });
    }
    tick();
    setInterval(tick, 1000);
  }
})();

/* ===================================================================
   Weather — Hartford, CT via Open-Meteo
   =================================================================== */
(function initWeather() {
  const wxEl = document.getElementById('wx');
  const note = document.getElementById('wxNote');
  if (!wxEl || !note) return;

  const WMAP = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Rime fog',
    51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle',
    61: 'Rain', 63: 'Rain', 65: 'Rain', 66: 'Freezing rain', 67: 'Freezing rain',
    71: 'Snow', 73: 'Snow', 75: 'Snow',
    80: 'Rain showers', 81: 'Rain showers', 82: 'Rain showers',
    95: 'Thunderstorm',
  };
  const WEMOJI = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️',
    80: '🌧️', 81: '🌧️', 82: '🌧️',
    95: '⛈️',
  };

  fetch('https://api.open-meteo.com/v1/forecast?latitude=41.76&longitude=-72.67&current=temperature_2m,apparent_temperature,weather_code&temperature_unit=fahrenheit&timezone=America%2FNew_York')
    .then(r => r.json())
    .then(d => {
      const c = d.current || d.current_weather || {};
      const code = (c.weather_code ?? c.weathercode) || 0;
      const temp = Math.round(c.temperature_2m ?? c.temperature ?? 0);
      wxEl.textContent = `${WEMOJI[code] || ''} ${WMAP[code] || 'Weather'} · ${temp}°F`;
      note.textContent = '';
    })
    .catch(() => {
      wxEl.textContent = 'Weather unavailable';
      note.textContent = '';
    });
})();

/* ===================================================================
   Tabs + Lazy Iframe Load
   =================================================================== */
(function initTabs() {
  const tabs = [...document.querySelectorAll('.tab')];
  const panels = [...document.querySelectorAll('.tabpanel')];

  function showPanel(id, btn) {
    panels.forEach(p => {
      const active = p.id === id;
      p.classList.toggle('active', active);
      if (active) {
        const iframe = p.querySelector('iframe[data-src]');
        if (iframe && !iframe.src) iframe.src = iframe.dataset.src;
      }
    });
    tabs.forEach(b => {
      const on = b === btn;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => showPanel(btn.getAttribute('aria-controls'), btn));
    btn.addEventListener('keydown', e => {
      const idx = tabs.indexOf(btn);
      if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx + 1) % tabs.length].click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(idx - 1 + tabs.length) % tabs.length].click(); }
      if (e.key === 'Home')       { e.preventDefault(); tabs[0].click(); }
      if (e.key === 'End')        { e.preventDefault(); tabs[tabs.length - 1].click(); }
    });
  });

  // Prime the initially-active tab's iframe
  const firstActive = document.querySelector('.tabpanel.active iframe[data-src]');
  if (firstActive && !firstActive.src) firstActive.src = firstActive.dataset.src;
})();

/* ===================================================================
   Link Search / Filter
   =================================================================== */
(function initLinkSearch() {
  const q = document.getElementById('search');
  const grid = document.getElementById('links');
  if (!q || !grid) return;
  q.addEventListener('input', e => {
    const v = e.target.value.toLowerCase();
    [...grid.querySelectorAll('.link')].forEach(a => {
      a.style.display = a.textContent.toLowerCase().includes(v) ? 'flex' : 'none';
    });
  });
})();

/* ===================================================================
   Events RSS — UConn Law
   =================================================================== */
(function initEvents() {
  const list = document.getElementById('eventsList');
  if (!list) return;
  const FEED = 'https://events.uconn.edu/live/rss/events/group/Law%20School/categories_campus/UConn%20Law/header/All%20Events';

  fetch(FEED)
    .then(r => r.text())
    .then(xml => {
      const doc = new DOMParser().parseFromString(xml, 'text/xml');
      const items = [...doc.querySelectorAll('item')].slice(0, 5).map(n => ({
        title: n.querySelector('title')?.textContent?.trim(),
        link: n.querySelector('link')?.textContent?.trim(),
        date: new Date(n.querySelector('pubDate')?.textContent || Date.now()),
        desc: (n.querySelector('description')?.textContent || '').replace(/<[^>]+>/g, '').trim(),
      }));
      if (!items.length) throw new Error('No items');
      list.innerHTML = items.map(i =>
        `<div style="margin:.4rem 0">
          <a href="${i.link}" target="_blank" rel="noopener noreferrer">${i.title}</a>
          <div class="info-note">${i.date.toLocaleDateString()} · ${i.desc?.slice(0, 90)}${i.desc.length > 90 ? '…' : ''}</div>
        </div>`
      ).join('');
    })
    .catch(() => {
      list.innerHTML = `<span class="info-note">Events feed unavailable. <a href="${FEED}" target="_blank" rel="noopener noreferrer">Open feed directly</a>.</span>`;
    });
})();

/* ===================================================================
   GitHub Projects
   =================================================================== */
(function loadGithubProjects() {
  const container = document.getElementById('gh-projects');
  if (!container) return;

  fetch('https://api.github.com/users/justinrogo/repos?sort=pushed&per_page=20')
    .then(r => r.json())
    .then(repos => {
      const visible = repos
        .filter(r => !r.fork && !r.archived && r.name !== 'justinrogo.github.io')
        .slice(0, 6);

      if (!visible.length) throw new Error('No repos');

      container.innerHTML = visible.map(repo => {
        const lang = repo.language || '';
        const color = LANG_COLORS[lang] || '#6e7681';
        const desc = repo.description ? repo.description.slice(0, 80) + (repo.description.length > 80 ? '…' : '') : 'No description';
        const stars = repo.stargazers_count;
        return `<a class="gh-card" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
          <div class="gh-card-name">${repo.name}</div>
          <div class="gh-card-desc">${desc}</div>
          <div class="gh-card-meta">
            ${lang ? `<span class="gh-lang-dot" style="background:${color}"></span><span>${lang}</span>` : ''}
            ${stars ? `<span>★ ${stars}</span>` : ''}
          </div>
        </a>`;
      }).join('');
    })
    .catch(() => {
      container.innerHTML = `<span class="gh-placeholder">Couldn't load projects. <a href="https://github.com/justinrogo" target="_blank" rel="noopener noreferrer">View on GitHub →</a></span>`;
    });
})();

/* ===================================================================
   UConn Library Search Widget (ULSW)
   =================================================================== */
(function mountULSW() {
  const root = document.getElementById('ulsw-root');
  if (!root) return;

  root.innerHTML = `
  <section class="ulsw" data-ulsw>
    <style>
      .ulsw{--navy:#000E2F;--orange:#FF7A00;--bg:var(--navy);--fg:#FFFFFF;--muted:#C9D1D9;--accent:var(--orange);--accent-2:#FFB066;--card:rgba(255,255,255,0.06);--border:rgba(255,255,255,0.14);--radius:.875rem;--shadow:0 .625rem 1.875rem rgba(0,0,0,.45);--inset:inset 0 .0625rem rgba(255,255,255,.05);font-family:system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;font-size:1rem;color:var(--fg)}
      .ulsw .wrap{background:var(--card);border:.0625rem solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow),var(--inset);overflow:clip}
      .ulsw .tabs{display:flex;gap:.125rem;padding:.375rem;background:linear-gradient(0deg,rgba(255,255,255,.04),rgba(255,255,255,.04))}
      .ulsw [role="tab"]{border:.0625rem solid var(--border);background:transparent;color:var(--text);padding:.625rem .875rem;border-radius:.625rem;cursor:pointer;font-weight:600;letter-spacing:.0125em;transition:transform .08s,background .2s,color .2s,border-color .2s}
      .ulsw [role="tab"][aria-selected="true"]{background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(0,0,0,.18));color:var(--text);border-color:rgba(255,255,255,.22);transform:translateY(-.0625rem)}
      .ulsw [role="tab"]:hover{color:var(--fg);border-color:var(--accent)}
      .ulsw [role="tab"]:focus-visible{outline:.1875rem solid var(--accent-2);outline-offset:.125rem}
      .ulsw .ulsw-panel{display:none;padding:1rem;background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(0,0,0,.1))}
      .ulsw .ulsw-panel[data-active="true"]{display:block}
      .ulsw .search-row{display:grid;grid-template-columns:1fr auto;gap:.625rem;align-items:center;max-width:48.75rem}
      .ulsw input[type="text"]{width:100%;padding:.75rem .875rem;border-radius:.625rem;border:.0625rem solid var(--border);background:rgba(0,0,0,.35);color:var(--navy);font-size:1rem}
      .ulsw input[type="text"]::placeholder{color:var(--text)}
      .ulsw .btn{padding:.75rem 1rem;border-radius:.625rem;border:.0625rem solid var(--border);background:linear-gradient(0deg,rgba(255,255,255,.04),rgba(255,255,255,.08));color:var(--text);cursor:pointer;font-weight:700;font-size:1rem}
      .ulsw .btn:hover{border-color:var(--muted)}
      .ulsw .links{text-align:right;font-size:.875rem;margin:.625rem 1rem 1rem}
      .ulsw .links a{color:var(--fg);text-underline-offset:.1875rem}
      .ulsw .helper{color:var(--muted);font-size:.75rem;margin-top:.5rem}
    </style>
    <div class="wrap" role="region" aria-label="UConn Law Library Search">
      <div class="tabs" role="tablist" aria-label="Search types">
        <button role="tab" aria-selected="true"  aria-controls="ulsw-tab-books"     id="ulsw-tabbtn-books">Books &amp; More</button>
        <button role="tab" aria-selected="false" aria-controls="ulsw-tab-journals"  id="ulsw-tabbtn-journals"  tabindex="-1">Journals</button>
        <button role="tab" aria-selected="false" aria-controls="ulsw-tab-databases" id="ulsw-tabbtn-databases" tabindex="-1">Databases</button>
        <button role="tab" aria-selected="false" aria-controls="ulsw-tab-reserves"  id="ulsw-tabbtn-reserves"  tabindex="-1">Reserves</button>
        <button role="tab" aria-selected="false" aria-controls="ulsw-tab-research"  id="ulsw-tabbtn-research"  tabindex="-1">Research</button>
      </div>
      <div id="ulsw-tab-books" class="ulsw-panel" role="tabpanel" aria-labelledby="ulsw-tabbtn-books" data-active="true">
        <form name="catalogSearchForm" method="get" action="https://uconn-law.primo.exlibrisgroup.com/discovery/search" onsubmit="return false">
          <input type="hidden" name="vid" value="01UCT_LAW:01UCT_LAW">
          <input type="hidden" name="tab" value="Everything">
          <input type="hidden" name="search_scope" value="MyInst_and_CI">
          <input type="hidden" name="mode" value="simple">
          <input type="hidden" name="query" data-query-target>
          <div class="search-row">
            <input type="text" placeholder="Search Library Catalog" data-query-input>
            <button class="btn" data-submit>Search</button>
          </div>
          <div class="helper"></div>
        </form>
      </div>
      <div id="ulsw-tab-journals" class="ulsw-panel" role="tabpanel" aria-labelledby="ulsw-tabbtn-journals">
        <form name="journalsSearchForm" method="get" action="https://uconn-law.primo.exlibrisgroup.com/discovery/search" onsubmit="return false">
          <input type="hidden" name="vid" value="01UCT_LAW:01UCT_LAW">
          <input type="hidden" name="tab" value="Everything">
          <input type="hidden" name="search_scope" value="EJOURNALS">
          <input type="hidden" name="mode" value="simple">
          <input type="hidden" name="query" data-query-target>
          <div class="search-row">
            <input type="text" placeholder="Search the Library's E-Journals" data-query-input>
            <button class="btn" data-submit>Search</button>
          </div>
        </form>
      </div>
      <div id="ulsw-tab-databases" class="ulsw-panel" role="tabpanel" aria-labelledby="ulsw-tabbtn-databases">
        <form name="databasesSearchForm" method="get" action="https://uconn-law.primo.exlibrisgroup.com/discovery/search" onsubmit="return false">
          <input type="hidden" name="vid" value="01UCT_LAW:01UCT_LAW">
          <input type="hidden" name="tab" value="Everything">
          <input type="hidden" name="search_scope" value="DATABASES">
          <input type="hidden" name="mode" value="simple">
          <input type="hidden" name="query" data-query-target>
          <div class="search-row">
            <input type="text" placeholder="Search the Library's Databases" data-query-input>
            <button class="btn" data-submit>Search</button>
          </div>
        </form>
      </div>
      <div id="ulsw-tab-reserves" class="ulsw-panel" role="tabpanel" aria-labelledby="ulsw-tabbtn-reserves">
        <form name="searchFormCR" method="get" action="https://uconn-law.primo.exlibrisgroup.com/discovery/search" onsubmit="return false">
          <input type="hidden" name="vid" value="01UCT_LAW:01UCT_LAW">
          <input type="hidden" name="tab" value="Everything">
          <input type="hidden" name="search_scope" value="CourseReserves">
          <input type="hidden" name="mode" value="simple">
          <input type="hidden" name="query" data-query-target>
          <div class="search-row">
            <input type="text" placeholder="Search Course Reserves" data-query-input>
            <button class="btn" data-submit>Search</button>
          </div>
        </form>
      </div>
      <div id="ulsw-tab-research" class="ulsw-panel" role="tabpanel" aria-labelledby="ulsw-tabbtn-research">
        <form role="search" method="GET" action="https://libguides.law.uconn.edu/srch.php" target="_blank" rel="noopener noreferrer">
          <div class="search-row">
            <input class="s-lg-form-control" name="q" size="30" maxlength="125" type="text" placeholder="Search LibGuides">
            <button class="btn" type="submit">Search</button>
          </div>
        </form>
      </div>
      <div class="links">
        <a href="https://uconn-law.primo.exlibrisgroup.com/discovery/search?mode=advanced&vid=01UCT_LAW:01UCT_LAW" target="_blank" rel="noopener noreferrer">Advanced Keyword Search</a> ·
        <a href="https://uconn-law.primo.exlibrisgroup.com/discovery/account?vid=01UCT_LAW:01UCT_LAW" target="_blank" rel="noopener noreferrer">My Library Account</a>
      </div>
    </div>
  </section>`;

  // Wire ULSW tabs + query builders
  (function initULSW(widget) {
    if (!widget) return;
    const tabButtons = widget.querySelectorAll('[role="tab"]');
    const ulswPanels = widget.querySelectorAll('.ulsw-panel');

    let activePanel = Array.from(ulswPanels).find(p => p.dataset.active === 'true') || ulswPanels[0];
    ulswPanels.forEach(p => { p.dataset.active = 'false'; });
    if (activePanel) activePanel.dataset.active = 'true';

    tabButtons.forEach(b => {
      const isActive = b.getAttribute('aria-controls') === activePanel.id;
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
      b.tabIndex = isActive ? 0 : -1;
    });

    function activateULSW(id, btn) {
      ulswPanels.forEach(p => { p.dataset.active = (p.id === id) ? 'true' : 'false'; });
      tabButtons.forEach(b => {
        const on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      btn.focus();
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => activateULSW(btn.getAttribute('aria-controls'), btn));
      btn.addEventListener('keydown', e => {
        const idx = Array.from(tabButtons).indexOf(btn);
        if (e.key === 'ArrowRight') { e.preventDefault(); tabButtons[(idx + 1) % tabButtons.length].click(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); tabButtons[(idx - 1 + tabButtons.length) % tabButtons.length].click(); }
        if (e.key === 'Home')       { e.preventDefault(); tabButtons[0].click(); }
        if (e.key === 'End')        { e.preventDefault(); tabButtons[tabButtons.length - 1].click(); }
      });
    });

    widget.querySelectorAll('form').forEach(form => {
      const input = form.querySelector('[data-query-input]');
      const hidden = form.querySelector('[data-query-target]');
      const submitBtn = form.querySelector('[data-submit]');
      if (submitBtn && input && hidden) {
        const doSubmit = () => {
          hidden.value = 'any,contains,' + (input.value || '').replace(/,/g, ' ');
          form.submit();
        };
        submitBtn.addEventListener('click', doSubmit);
        form.addEventListener('submit', e => { e.preventDefault(); doSubmit(); });
      }
    });
  })(root.querySelector('[data-ulsw]'));
})();
