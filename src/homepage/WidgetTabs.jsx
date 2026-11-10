import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { mountCliftonStrengths, mountULSW } from './legacy-widgets.js';
import { useTabIndicator } from './effects.js';
import { GlassMaterial } from './GlassMaterial.jsx';
import { requestLimits, submitRequest } from '../request-form.js';

const TABS = [
  { id: 'cal', label: 'My Calendar', title: "Today's Schedule", src: 'https://outlook.office365.com/calendar/published/3ca52ff81f8a440699723f09efe5d298@uconn.edu/66bd7da89640440591f449ae5ce4fcc514733372329545515702/calendar.html' },
  { id: 'book', label: 'Book a Meeting', title: 'Book Meeting', src: 'https://outlook.office.com/bookwithme/user/3ca52ff81f8a440699723f09efe5d298%40uconn.edu?anonymous&ismsaljsauthenabled=true' },
  { id: 'req', label: 'Submit a Request' },
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

function RequestPanel() {
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');
  const startedAt = useRef(performance.now());
  async function send(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setState('sending');
    try {
      await submitRequest(form, startedAt.current);
      form.reset();
      startedAt.current = performance.now();
      setState('sent');
    } catch (failure) {
      setError(failure.message);
      setState('error');
    }
  }
  return <div className="card surface" style={{ padding: 14 }}>
    <div className="card surface request-form-card">
      <h3>Submit a Request</h3>
      <p>Only I can see what you send.</p>
      <p className="request-form__sent" id="requestSent" role="status" hidden={state !== 'sent'}>Thanks! Your request was sent.</p>
      <p className="request-form__sent" style={{ borderColor: 'var(--orange)' }} role="alert" hidden={state !== 'error'}>{error}</p>
      <form id="requestForm" onSubmit={send} aria-busy={state === 'sending'}>
        <input type="text" name="website" className="request-form__honey" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>Name<input name="name" autoComplete="name" maxLength={requestLimits.name} required /></label>
        <label>Email<input name="email" type="email" autoComplete="email" maxLength={requestLimits.email} required /></label>
        <label>Subject<input name="subject" maxLength={requestLimits.subject} required /></label>
        <label>Details<textarea name="details" rows="6" maxLength={requestLimits.details} required /></label>
        <button className="glass btn request-form__submit" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send Request'}</button>
      </form>
    </div>
  </div>;
}

export function WidgetTabs() {
  const [active, setActive] = useState('cat');
  const [visited, setVisited] = useState(() => new Set(['cat']));
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

  function navigate(event, index) {
    const next = { ArrowRight: (index + 1) % TABS.length, ArrowLeft: (index - 1 + TABS.length) % TABS.length, Home: 0, End: TABS.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    activate(TABS[next].id);
  }

  return <section ref={sectionRef} className="card glass tabs" aria-label="Widgets">
    <GlassMaterial />
    <div ref={tablistRef} className="tablist glass glass--strong" role="tablist" aria-label="Widget tabs">
      <span ref={indicatorRef} className="tab-indicator" aria-hidden="true" />
      {TABS.map((tab, index) => <button key={tab.id} ref={element => { buttonsRef.current[tab.id] = element; }} type="button"
        className="tab glass" role="tab" aria-selected={active === tab.id} aria-controls={`tab-${tab.id}`} id={`tbtn-${tab.id}`}
        tabIndex={active === tab.id ? 0 : -1} onClick={() => activate(tab.id)} onKeyDown={event => navigate(event, index)}>{tab.label}</button>)}
    </div>
    {TABS.map(tab => <div key={tab.id} id={`tab-${tab.id}`} className={`tabpanel${active === tab.id ? ' active' : ''}`}
      role="tabpanel" aria-labelledby={`tbtn-${tab.id}`} hidden={active !== tab.id}>
      {tab.id === 'req' ? <RequestPanel />
        : tab.id === 'cs' ? <LegacyWidget initialize={mountCliftonStrengths} id="csMount" className="widget" />
          : tab.id === 'cat' ? <LegacyWidget initialize={mountULSW} id="ulsw-root" />
            : <iframe className="embed" loading="lazy" data-src={tab.src} src={visited.has(tab.id) ? tab.src : undefined} title={tab.title} />}
    </div>)}
  </section>;
}
