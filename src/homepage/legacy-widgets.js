// Imperative widget islands. React owns only their empty host elements.
// Each initializer returns cleanup; panel switching never remounts these hosts.
export function mountCliftonStrengths(mount) {
  if (!mount) return;

  const controller = new AbortController();
  const html = `<div id="CS">
      <div class="summary">
        <h2>My <strong>CliftonStrengths Themes</strong></h2>
        <div class="bar" role="img" aria-label="CliftonStrengths domain balance">
          <div class="green" data-domain="thinking" data-label="Strategic Thinking" aria-hidden="true"></div>
          <div class="blue" data-domain="relationship" data-label="Relationship Building" aria-hidden="true"></div>
          <div class="purple" data-domain="executing" data-label="Executing" aria-hidden="true"></div>
          <div class="orange" data-domain="influencing" data-label="Influencing" aria-hidden="true"></div>
        </div>
        <div class="controls">
          <button data-limit="5">Top 5</button>
          <button data-limit="10">Top 10</button>
          <button data-limit="all">Show All</button>
        </div>
      </div>
      <br />
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
      <br />
      <!-- Strategic Thinking -->
      <section class="section">
        <h3>Strategic Thinking <span style="background:var(--green)"></span></h3>
        <div class="list">
          <div class="item top10" data-domain="thinking" data-desc="Ideation: People with this strength enjoy finding connections between ideas that seem unrelated. They approach familiar problems from different angles and often suggest options others have not considered. Brainstorming, combining approaches, and questioning the usual way of doing something give them room to put their imagination to work."><span class="rank">1</span><span class="name">Ideation</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Strategic: People with this strength consider several possible paths and look for patterns that help them choose among them. They anticipate obstacles, compare scenarios, and adjust their approach as new information appears. When a plan gets complicated, they can help a group identify a next step and keep alternatives in mind."><span class="rank">2</span><span class="name">Strategic</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Input: People with this strength collect information, examples, and resources that catch their interest or might be useful later. They enjoy having material to draw on when a question or problem comes up. Their collections might include articles, notes, useful tools, or references they can share when someone needs a starting point."><span class="rank">3</span><span class="name">Input</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Intellection: People with this strength enjoy thinking deeply and spending time with an idea before settling on an answer. They may work through a question privately, in writing, or in a thoughtful conversation. Time to reflect helps them examine different interpretations and explain more clearly what they think and why."><span class="rank">7</span><span class="name">Intellection</span></div>
          <div class="item top10" data-domain="thinking" data-desc="Analytical: People with this strength look for evidence and want to understand why something happens. They examine patterns, test assumptions, and ask whether the available information supports a conclusion. In a discussion, they may separate facts from guesses or point out what still needs to be checked before a decision is made."><span class="rank">8</span><span class="name">Analytical</span></div>
          <div class="item" data-domain="thinking" data-desc="Futuristic: People with this strength enjoy imagining what the future could look like. They describe possibilities in enough detail to help others picture a change, whether it involves a project, an organization, or daily life. Sharing that picture can give people a reason to work toward a goal that still feels far away."><span class="rank">11</span><span class="name">Futuristic</span></div>
          <div class="item" data-domain="thinking" data-desc="Learner: People with this strength enjoy the process of developing knowledge and skills. They find satisfaction in moving from unfamiliarity to understanding through practice, questions, and discovery. A new subject, tool, or assignment can hold their attention because it gives them something to figure out and a way to notice their progress."><span class="rank">13</span><span class="name">Learner</span></div>
          <div class="item" data-domain="thinking" data-desc="Context: People with this strength look to the past to understand the present. They explore earlier decisions, experiences, and circumstances before deciding how to proceed. Learning why a process exists or how a previous effort turned out helps them recognize useful precedents and avoid repeating mistakes."><span class="rank">29</span><span class="name">Context</span></div>
        </div>
      </section>
      <!-- Executing -->
      <section class="section">
        <h3>Executing <span style="background:var(--purple)"></span></h3>
        <div class="list">
          <div class="item top10" data-domain="executing" data-desc="Arranger: People with this strength enjoy coordinating people, tasks, and resources while staying flexible about how they fit together. They can rethink a plan when priorities shift or a new constraint appears. In a busy project, they may adjust assignments, timing, or available resources to keep the work moving."><span class="rank">4</span><span class="name">Arranger</span></div>
          <div class="item top10" data-domain="executing" data-desc="Restorative: People with this strength are drawn to problems they can investigate and solve. They want to understand what is going wrong, identify possible causes, and work through a repair. Troubleshooting a process or getting a stalled project moving again can give them a clear and satisfying challenge."><span class="rank">5</span><span class="name">Restorative</span></div>
          <div class="item" data-domain="executing" data-desc="Belief: People with this strength use their core values to guide decisions and commitments. They want their work to have a purpose they can stand behind and may be firm about principles that matter to them. When priorities compete, those values help them decide where to spend their time and what to decline."><span class="rank">17</span><span class="name">Belief</span></div>
          <div class="item" data-domain="executing" data-desc="Responsibility: People with this strength take their commitments seriously and feel personally accountable for following through. They pay attention to what they have promised and what others are counting on them to do. If a commitment becomes difficult to meet, they tend to look for a way to put things right."><span class="rank">24</span><span class="name">Responsibility</span></div>
          <div class="item" data-domain="executing" data-desc="Focus: People with this strength set a direction and concentrate their effort on reaching it. They use priorities and milestones to decide what deserves attention and what can wait. When new requests or distractions appear, they check whether those activities support the goal and adjust their time accordingly."><span class="rank">26</span><span class="name">Focus</span></div>
          <div class="item" data-domain="executing" data-desc="Achiever: People with this strength feel a steady drive to get things done. They find satisfaction in completing tasks and seeing concrete progress over the course of a day. A clear workload and opportunities to finish meaningful pieces of work give them a way to direct that energy."><span class="rank">28</span><span class="name">Achiever</span></div>
          <div class="item" data-domain="executing" data-desc="Discipline: People with this strength prefer structure and create routines that make work more predictable. They pay attention to schedules, preparation, and the sequence of steps needed to complete a task. Checklists and clear procedures can help them manage details and reduce uncertainty about what comes next."><span class="rank">31</span><span class="name">Discipline</span></div>
          <div class="item" data-domain="executing" data-desc="Deliberative: People with this strength think carefully before committing to a decision. They look for risks, weigh possible consequences, and want time to understand what could go wrong. Their questions can help a group address potential problems early and choose an approach with a clearer understanding of the trade-offs."><span class="rank">32</span><span class="name">Deliberative</span></div>
          <div class="item" data-domain="executing" data-desc="Consistency: People with this strength value fair treatment and clear expectations. They look for rules and procedures that apply reliably, so people understand how decisions are made and what is expected of them. They may question exceptions or uneven standards that give some people an unexplained advantage."><span class="rank">34</span><span class="name">Consistency</span></div>
        </div>
      </section>
      <!-- Relationship Building -->
      <section class="section">
        <h3>Relationship Building <span style="background:var(--blue)"></span></h3>
        <div class="list">
          <div class="item top10" data-domain="relationship" data-desc="Adaptability: People with this strength respond to what is happening now and adjust as circumstances change. They are comfortable revising plans when an unexpected need or opportunity appears. In a changing situation, they can help others work with the conditions at hand and identify what can be done next."><span class="rank">6</span><span class="name">Adaptability</span></div>
          <div class="item top10" data-domain="relationship" data-desc="Individualization: People with this strength notice what is distinctive about each person. They pay attention to differences in motivation, preferences, and ways of working, then adjust their approach to suit the individual. This can show up in how they assign tasks, explain an idea, recognize a contribution, or help people work together."><span class="rank">9</span><span class="name">Individualization</span></div>
          <div class="item top10" data-domain="relationship" data-desc="Developer: People with this strength notice potential in others and take an interest in their progress. They recognize small improvements and look for chances to offer encouragement, feedback, or practice. Helping someone build confidence with an unfamiliar task can be as satisfying to them as seeing a larger achievement."><span class="rank">10</span><span class="name">Developer</span></div>
          <div class="item" data-domain="relationship" data-desc="Connectedness: People with this strength look for connections among people, experiences, and events. They tend to see individual choices as part of something larger and consider how those choices affect others. In a group, they may draw attention to shared purpose and responsibilities that extend beyond the immediate task."><span class="rank">12</span><span class="name">Connectedness</span></div>
          <div class="item" data-domain="relationship" data-desc="Positivity: People with this strength bring enthusiasm and tend to notice reasons for hope. They enjoy encouraging others, celebrating progress, and helping a group find energy to continue. During a setback, they may point to what is still possible or recognize an effort that deserves appreciation."><span class="rank">14</span><span class="name">Positivity</span></div>
          <div class="item" data-domain="relationship" data-desc="Empathy: People with this strength are attentive to other people's emotions and try to understand experiences from their perspective. They may notice a shift in tone, an unspoken concern, or a feeling someone has trouble expressing. That awareness can help them respond with care and give others room to explain how they feel."><span class="rank">18</span><span class="name">Empathy</span></div>
          <div class="item" data-domain="relationship" data-desc="Includer: People with this strength notice who has been left out and look for ways to bring them into the group. They want people to feel welcome and have a chance to participate. They may invite a quieter person into a conversation, introduce a newcomer, or question a practice that keeps others on the outside."><span class="rank">21</span><span class="name">Includer</span></div>
          <div class="item" data-domain="relationship" data-desc="Relator: People with this strength value close relationships built through time, trust, and shared experience. They enjoy getting to know people beyond a first impression and working with those they know well. Honest conversations and opportunities to work toward a shared goal help them deepen those relationships."><span class="rank">22</span><span class="name">Relator</span></div>
          <div class="item" data-domain="relationship" data-desc="Harmony: People with this strength look for common ground and practical ways to work together. When people disagree, they listen for areas of agreement that can support a decision. They tend to guide conversations toward workable next steps and reduce conflict that is getting in the way of the task."><span class="rank">33</span><span class="name">Harmony</span></div>
        </div>
      </section>
      <!-- Influencing -->
      <section class="section">
        <h3>Influencing <span style="background:var(--orange)"></span></h3>
        <div class="list">
          <div class="item" data-domain="influencing" data-desc="Communication: People with this strength enjoy putting thoughts into words and making ideas understandable to others. They often use stories, examples, or conversation to explain a point and hold attention. When a topic is difficult to follow, they can help a group find language that makes it easier to discuss."><span class="rank">15</span><span class="name">Communication</span></div>
          <div class="item" data-domain="influencing" data-desc="Activator: People with this strength are eager to turn a decision or idea into action. They look for a concrete first step and learn by trying things, observing the result, and making adjustments. When a discussion stalls, they may help the group decide what it can start doing with the information already available."><span class="rank">16</span><span class="name">Activator</span></div>
          <div class="item" data-domain="influencing" data-desc="Woo: People with this strength enjoy meeting new people and making an initial connection. They are often comfortable starting conversations, finding shared interests, and helping strangers feel welcome. Opportunities to introduce themselves or bring people together give them a way to build a wider circle of contacts."><span class="rank">19</span><span class="name">Woo</span></div>
          <div class="item" data-domain="influencing" data-desc="Command: People with this strength are comfortable stating a position and taking charge when a situation calls for direction. They are willing to address difficult issues openly and ask others to be clear about where they stand. In an uncertain discussion, they can help a group confront a decision it has been avoiding."><span class="rank">20</span><span class="name">Command</span></div>
          <div class="item" data-domain="influencing" data-desc="Self-Assurance: People with this strength trust their judgment and their ability to handle the consequences of a decision. They can move forward despite uncertainty and are comfortable taking responsibility for their choices. That confidence can help them hold a course when others are unsure how to proceed."><span class="rank">23</span><span class="name">Self-Assurance</span></div>
          <div class="item" data-domain="influencing" data-desc="Competition: People with this strength pay attention to how their performance compares with others. Clear measures, challenging opponents, and opportunities to win give them motivation to improve. They may track results closely and use a strong performance by someone else as a target for their own work."><span class="rank">25</span><span class="name">Competition</span></div>
          <div class="item" data-domain="influencing" data-desc="Maximizer: People with this strength notice what is already working well and look for ways to make it better. They prefer to develop existing talents and build on successful approaches. They may help someone refine a skill, improve a strong piece of work, or choose assignments that make good use of their abilities."><span class="rank">27</span><span class="name">Maximizer</span></div>
          <div class="item" data-domain="influencing" data-desc="Significance: People with this strength want to make a substantial contribution and have their work recognized. They are drawn to responsibilities where their effort can make a noticeable difference. Knowing who will benefit from the work and how the result will be judged can help them choose goals worth pursuing."><span class="rank">30</span><span class="name">Significance</span></div>
        </div>
      </section>

      <!-- Inline disclosure: moved beneath the selected strength's grid row. -->
      <section id="strength-detail" class="strength-detail surface" hidden aria-labelledby="strength-detail-title">
        <button class="strength-detail__close btn" type="button" aria-label="Close strength description">&times;</button>
        <div aria-live="polite" aria-atomic="true">
          <p class="strength-detail__meta"></p>
          <h4 id="strength-detail-title"></h4>
          <p class="strength-detail__description"></p>
        </div>
      </section>
    </div>`;

  mount.innerHTML = html;

  // Promote each generated theme card to a native button before the browser
  // paints it, so the card has built-in keyboard and assistive-tech behavior.
  mount.querySelectorAll('.item').forEach(item => {
    const button = document.createElement('button');
    [...item.attributes].forEach(attribute => button.setAttribute(attribute.name, attribute.value));
    button.type = 'button';
    button.append(...item.childNodes);
    const themeName = button.querySelector('.name')?.textContent || 'CliftonStrengths theme';
    const rank = button.querySelector('.rank')?.textContent || '';
    button.setAttribute('aria-label', `${themeName}, rank ${rank}`);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'strength-detail');
    item.replaceWith(button);
  });

  // Size the domain bar from the ranked profile. A #1 theme receives 34 points,
  // a #2 theme receives 33, and so on through #34 receiving 1 point.
  const domainBar = mount.querySelector('.bar');
  const heroDomainBar = document.querySelector('.hero-strengths__bar');
  const rankedItems = [...mount.querySelectorAll('.item[data-domain]')];
  const maxRank = Math.max(...rankedItems.map(item => (
    parseInt(item.querySelector('.rank')?.textContent || '0', 10)
  )));
  const domainScores = rankedItems.reduce((scores, item) => {
    const rank = parseInt(item.querySelector('.rank')?.textContent || '0', 10);
    const score = Math.max(1, maxRank + 1 - rank);
    scores[item.dataset.domain] = (scores[item.dataset.domain] || 0) + score;
    return scores;
  }, {});
  const totalDomainScore = Object.values(domainScores).reduce((total, score) => total + score, 0);

  [domainBar, heroDomainBar].filter(Boolean).forEach(bar => {
    if (!totalDomainScore) return;
    const labels = [...bar.querySelectorAll('[data-domain]')].map(segment => {
      const score = domainScores[segment.dataset.domain] || 0;
      const percentage = Math.round((score / totalDomainScore) * 1000) / 10;
      segment.style.setProperty('--domain-weight', score);
      segment.title = `${segment.dataset.label}: ${percentage}%`;
      return `${segment.dataset.label} ${percentage}%`;
    });
    bar.setAttribute('aria-label', `Rank-weighted CliftonStrengths domain balance: ${labels.join(', ')}`);
  });

  // Inline strength details: one reusable, non-modal disclosure. Focus stays
  // on the selected button, so keyboard users can keep browsing the grid.
  const detail = mount.querySelector('#strength-detail');
  const detailTitle = detail.querySelector('#strength-detail-title');
  const detailDescription = detail.querySelector('.strength-detail__description');
  const detailMeta = detail.querySelector('.strength-detail__meta');
  const domainNames = {
    thinking: 'Strategic Thinking', executing: 'Executing',
    relationship: 'Relationship Building', influencing: 'Influencing',
  };
  let detailTrigger = null;

  function closeStrengthDetail(restoreFocus = false) {
    const trigger = detailTrigger;
    detailTrigger = null;
    trigger?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger?.focus({ preventScroll: true });
    detail.hidden = true;
  }

  function positionStrengthDetail() {
    if (!detailTrigger) return;
    const focused = detail.contains(document.activeElement) ? document.activeElement : null;
    // Measure the intact grid, then place the full-width detail after that row.
    detail.hidden = true;
    const list = detailTrigger.closest('.list');
    const rowTop = detailTrigger.offsetTop;
    const rowItems = [...list.querySelectorAll('.item')].filter(item =>
      item.getClientRects().length && Math.abs(item.offsetTop - rowTop) < 2);
    rowItems[rowItems.length - 1].after(detail);
    detail.hidden = false;
    focused?.focus({ preventScroll: true });
  }

  rankedItems.forEach(item => {
    item.addEventListener('click', () => {
      if (detailTrigger === item) {
        closeStrengthDetail();
        return;
      }
      closeStrengthDetail();
      detailTrigger = item;
      const name = item.querySelector('.name').textContent;
      const rank = item.querySelector('.rank').textContent;
      detail.dataset.domain = item.dataset.domain;
      detailTitle.textContent = name;
      detailMeta.textContent = `${domainNames[item.dataset.domain]} · Rank ${rank} of ${maxRank}`;
      // The heading already supplies the name; avoid repeating it in the copy.
      const description = item.dataset.desc || '';
      detailDescription.textContent = description.startsWith(`${name}:`)
        ? description.slice(name.length + 1).trim() : description;
      item.setAttribute('aria-expanded', 'true');
      positionStrengthDetail();
      // Bring the short explanation into view while keeping its row nearby.
      // No scroll animation is needed for this disclosure interaction.
      detail.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
  });

  detail.querySelector('.strength-detail__close').addEventListener('click', () => closeStrengthDetail(true));
  mount.addEventListener('keydown', event => {
    if (event.key === 'Escape' && detailTrigger) {
      event.preventDefault();
      closeStrengthDetail(true);
    }
  }, { signal: controller.signal });

  // Reflow the open detail when a responsive breakpoint changes the grid.
  const listWidths = new WeakMap();
  const detailResizeObserver = new ResizeObserver(entries => {
    entries.forEach(({ target, contentRect }) => {
      const previous = listWidths.get(target);
      listWidths.set(target, contentRect.width);
      if (contentRect.width > 0 && contentRect.width !== previous && target.contains(detailTrigger)) {
        positionStrengthDetail();
      }
    });
  });
  mount.querySelectorAll('.list').forEach(list => detailResizeObserver.observe(list));

  // Strengths filter controls
  const controlBtns = mount.querySelectorAll('.controls button');

  function filterStrengths(limit) {
    closeStrengthDetail();
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
  }, { signal: controller.signal });
  return () => {
    controller.abort();
    detailResizeObserver.disconnect();
    mount.replaceChildren();
  };
}

export function mountULSW(root) {
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
  return () => root.replaceChildren();
}
