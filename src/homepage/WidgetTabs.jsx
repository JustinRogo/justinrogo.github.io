import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { mountCliftonStrengths, mountULSW } from './legacy-widgets.js';
import { useTabIndicator } from './effects.js';

const TABS = [
  { id: 'cal', label: 'My Calendar', title: "Today's Schedule", src: 'https://outlook.office365.com/calendar/published/3ca52ff81f8a440699723f09efe5d298@uconn.edu/66bd7da89640440591f449ae5ce4fcc514733372329545515702/calendar.html' },
  { id: 'book', label: 'Book a Meeting', title: 'Book Meeting', src: 'https://outlook.office.com/bookwithme/user/3ca52ff81f8a440699723f09efe5d298%40uconn.edu?anonymous&ismsaljsauthenabled=true' },
  { id: 'req', label: 'Submit a Request', title: 'Public Trello Board', src: 'https://trello.com/b/2Yp5IKYz.html' },
  { id: 'cs', label: 'My CliftonStrengths' },
  { id: 'cat', label: 'Library Catalog' },
];

// React never reconciles the descendants of these hosts. The existing widgets
// initialize once and keep form/filter state while their tab is hidden.
function LegacyWidget({ initialize, id, className }) {
  const ref = useRef(null);
  useLayoutEffect(() => initialize(ref.current), [initialize]);
  return <div ref={ref} id={id} className={className} />;
}

function RequestPanel({ tab, loaded, sent }) {
  return <div className="card surface" style={{ padding: 14 }}>
    <div className="request-layout">
      <iframe className="embed" loading="lazy" data-src={tab.src} src={loaded ? tab.src : undefined} title={tab.title} />
      <div className="card surface request-form-card">
        <h3>Submit a Request</h3>
        <p className="request-form__sent" id="requestSent" role="status" hidden={!sent}>Thanks! Your request was sent.</p>
        <form action="https://formsubmit.co/justinrogowski1+vnowu7qczgm6cw6e96zn@boards.trello.com" method="POST" id="requestForm" onSubmit={event => {
          const form = event.currentTarget;
          const subject = form.elements.subject.value.trim();
          if (subject) form.elements._subject.value = subject;
        }}>
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_next" value="https://justinrogo.github.io/?sent=1" />
          <input type="hidden" name="_subject" defaultValue="Website request" />
          <input type="text" name="_honey" className="request-form__honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <label>Name<input name="name" autoComplete="name" required /></label>
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Subject<input name="subject" required /></label>
          <label>Details<textarea name="details" rows="6" required /></label>
          <button className="glass btn request-form__submit" type="submit">Send Request</button>
        </form>
      </div>
    </div>
  </div>;
}

export function WidgetTabs() {
  const [sent] = useState(() => new URLSearchParams(location.search).get('sent') === '1');
  const [active, setActive] = useState(sent ? 'req' : 'cat');
  const [visited, setVisited] = useState(() => new Set([sent ? 'req' : 'cat']));
  const sectionRef = useRef(null);
  const tablistRef = useRef(null);
  const indicatorRef = useRef(null);
  const buttonsRef = useRef({});
  useTabIndicator(tablistRef, indicatorRef, active);

  function activate(id, focus = true) {
    setVisited(previous => previous.has(id) ? previous : new Set([...previous, id]));
    setActive(id);
    if (focus) buttonsRef.current[id]?.focus({ preventScroll: true });
  }

  useEffect(() => {
    const button = document.getElementById('viewStrengthsBtn');
    function showStrengths() {
      activate('cs');
      sectionRef.current.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start',
      });
    }
    button?.addEventListener('click', showStrengths);
    return () => button?.removeEventListener('click', showStrengths);
  }, []);

  useEffect(() => {
    if (!sent) return;
    const url = new URL(location.href);
    url.searchParams.delete('sent');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    buttonsRef.current.req?.focus({ preventScroll: true });
  }, [sent]);

  function navigate(event, index) {
    const next = { ArrowRight: (index + 1) % TABS.length, ArrowLeft: (index - 1 + TABS.length) % TABS.length, Home: 0, End: TABS.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activate(TABS[next].id);
  }

  return <section ref={sectionRef} className="card glass tabs" aria-label="Widgets">
    <div ref={tablistRef} className="tablist glass glass--strong" role="tablist" aria-label="Widget tabs">
      <span ref={indicatorRef} className="tab-indicator" aria-hidden="true" />
      {TABS.map((tab, index) => <button key={tab.id} ref={element => { buttonsRef.current[tab.id] = element; }} type="button"
        className="tab glass" role="tab" aria-selected={active === tab.id} aria-controls={`tab-${tab.id}`} id={`tbtn-${tab.id}`}
        tabIndex={active === tab.id ? 0 : -1} onClick={() => activate(tab.id)} onKeyDown={event => navigate(event, index)}>{tab.label}</button>)}
    </div>
    {TABS.map(tab => <div key={tab.id} id={`tab-${tab.id}`} className={`tabpanel${active === tab.id ? ' active' : ''}`}
      role="tabpanel" aria-labelledby={`tbtn-${tab.id}`} hidden={active !== tab.id}>
      {tab.id === 'req' ? <RequestPanel tab={tab} loaded={visited.has(tab.id)} sent={sent} />
        : tab.id === 'cs' ? <LegacyWidget initialize={mountCliftonStrengths} id="csMount" className="widget" />
          : tab.id === 'cat' ? <LegacyWidget initialize={mountULSW} id="ulsw-root" />
            : <iframe className="embed" loading="lazy" data-src={tab.src} src={visited.has(tab.id) ? tab.src : undefined} title={tab.title} />}
    </div>)}
  </section>;
}
