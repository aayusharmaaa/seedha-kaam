import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { makeT, speechLocale, LANGS } from './i18n.js';
import { speak, stopSpeaking, synthesisSupported } from './speech.js';

/* ------------------------------------------------------------------ *
 * Language context
 * ------------------------------------------------------------------ */

export const LanguageContext = createContext({ language: 'en', setLanguage: () => {}, t: makeT('en') });
export const useLang = () => useContext(LanguageContext);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try { return localStorage.getItem('seedha:lang') || 'en'; } catch { return 'en'; }
  });
  const setLanguage = (next) => {
    setLanguageState(next);
    try { localStorage.setItem('seedha:lang', next); } catch { /* private mode */ }
    document.documentElement.lang = next;
  };
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: makeT(language), locale: speechLocale(language) }}>
      {children}
    </LanguageContext.Provider>
  );
}

/* ------------------------------------------------------------------ *
 * Chrome
 * ------------------------------------------------------------------ */

export function MockBanner() {
  const { t } = useLang();
  return (
    <div className="mock-banner" role="note">
      <span className="mock-dot" aria-hidden="true" />
      <span>{t('banner.text')}</span>
      <a href="#/mocks">{t('banner.link')} →</a>
    </div>
  );
}

export function LanguageSwitch({ compact }) {
  const { language, setLanguage } = useLang();
  return (
    <div className={`lang-switch ${compact ? 'compact' : ''}`} role="group" aria-label="Language">
      {LANGS.map((entry) => (
        <button
          key={entry.code}
          type="button"
          className={entry.code === language ? 'on' : ''}
          aria-pressed={entry.code === language}
          onClick={() => { stopSpeaking(); setLanguage(entry.code); }}
        >
          {entry.native}
        </button>
      ))}
    </div>
  );
}

/**
 * The mark is the argument in one glyph.
 *
 * Two paths leave the same point and arrive at the same point. One arcs the
 * long way round — the detour through somebody who says they know a person.
 * The other goes straight through. *Seedha* means straight, and that is the
 * only claim this product makes.
 *
 * The wordmark is deliberately bilingual: "Seedha" in Latin, "काम" in
 * Devanagari. It is a Hindi phrase, it should look like one, and a wordmark
 * that romanises itself into English would be arguing against its own point.
 */
export function BrandMark({ size = 30 }) {
  return (
    <svg
      className="brand-glyph"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label="Seedha Kaam"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" className="glyph-bg" />
      {/* the long way round */}
      <path d="M7 20.5C9.5 8.5 20.5 8.5 24 18.5" className="glyph-detour" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.6 3.2" />
      {/* seedha — straight through */}
      <path d="M7 20.5h14.5" className="glyph-straight" fill="none" strokeWidth="3" strokeLinecap="round" />
      <path d="m18.5 16.8 4.2 3.7-4.2 3.7" className="glyph-straight" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Brand({ small }) {
  return (
    <a className={`brand ${small ? 'small' : ''}`} href="#/" aria-label="Seedha Kaam — home">
      <BrandMark size={small ? 26 : 30} />
      <span className="brand-word">
        Seedha<em lang="hi">काम</em>
      </span>
    </a>
  );
}

export function SiteNav() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-nav">
      <Brand />
      <button className="nav-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">{open ? '✕' : '☰'}</span>
        <span className="sr-only">Menu</span>
      </button>
      <nav className={open ? 'open' : ''} onClick={() => setOpen(false)}>
        <a href="#/how">{t('nav.how')}</a>
        <a href="#/mocks">{t('nav.mocks')}</a>
        <a href="#/rulebook">{t('nav.ledger')}</a>
        <a href="#/index">{t('nav.index')}</a>
        <LanguageSwitch compact />
        <a className="nav-cta" href="#/case">{t('nav.start')}</a>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <Brand small />
        <p>An independent prototype for a public-service problem. Not affiliated with, endorsed by, or connected to any government body. No government logo is used anywhere in this product, and no government system is accessed by it.</p>
      </div>
      <div className="footer-links">
        <a href="#/mocks">Everything that is mocked</a>
        <a href="#/rulebook">The rulebook</a>
        <a href="#/index">Friction index</a>
        <a href="#/how">How it works</a>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ *
 * Primitives
 * ------------------------------------------------------------------ */

export function Button({ kind = 'primary', busy, children, ...props }) {
  return (
    <button className={`btn ${kind} ${busy ? 'busy' : ''}`} disabled={busy || props.disabled} {...props}>
      {busy && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Notice({ tone = 'info', title, children }) {
  return (
    <div className={`notice-box ${tone}`} role={tone === 'error' ? 'alert' : 'note'}>
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div className="spinner-row" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/** A read-aloud control. Present next to anything a citizen must understand. */
export function SpeakButton({ text, label }) {
  const { locale, t } = useLang();
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!synthesisSupported()) return null;
  return (
    <button
      type="button"
      className={`speak-btn ${on ? 'on' : ''}`}
      aria-label={label || t('common.listen')}
      title={label || t('common.listen')}
      onClick={() => {
        if (on) { stopSpeaking(); setOn(false); return; }
        setOn(true);
        speak(text, { locale, onEnd: () => setOn(false) });
      }}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H3v6h3l5 4V5z" />
        {on ? <path d="M17 9l4 6M21 9l-4 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
      </svg>
      <span>{on ? t('common.stop') : t('common.listen')}</span>
    </button>
  );
}

export function SeverityBadge({ severity }) {
  const { t } = useLang();
  // Short form on the chip. The long phrasing belongs on the group heading, and
  // repeating it on every card just made the same sentence appear twice.
  const label = { blocks: t('sev.blocks'), delays: t('sev.delays'), advisory: t('sev.advisory') }[severity];
  return <span className={`sev sev-${severity}`}>{label}</span>;
}

/**
 * "Why this answer" — the expander that has to exist on every verdict.
 * It shows the rule id, the documents and fields that disagreed, and the
 * source the requirement came from. Without this the product is asking to be
 * trusted; with it, it is showing its work.
 */
export function WhyThisAnswer({ finding }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const evidence = finding.evidence || {};
  return (
    <div className={`why ${open ? 'open' : ''}`}>
      <button type="button" className="why-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="why-icon" aria-hidden="true">{open ? '−' : '+'}</span>
        {t('check.why')}
        <code>{finding.ruleId}</code>
      </button>
      {open && (
        <div className="why-body">
          {evidence.note && <p className="why-note">{evidence.note}</p>}
          {evidence.comparison && <p className="why-compare"><code>{evidence.comparison}</code></p>}
          {Array.isArray(evidence.documents) && evidence.documents.length > 0 && (
            <table className="why-table">
              <thead><tr><th>Document</th><th>Field</th><th>Value read</th></tr></thead>
              <tbody>
                {evidence.documents.map((doc, i) => (
                  <tr key={`${doc.kind}-${doc.field}-${i}`}>
                    <td>{doc.fileName || doc.kind}</td>
                    <td><code>{doc.field}</code></td>
                    <td>{doc.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <dl className="why-meta">
            <div><dt>{t('check.rule')}</dt><dd><code>{finding.ruleId}</code> · {finding.rulePack}</dd></div>
            {finding.citation && (
              <div>
                <dt>{t('check.source')}</dt>
                <dd>
                  {finding.citation.source}
                  <span className={`verified ${finding.citation.verified ? 'yes' : 'no'}`}>
                    {finding.citation.verified ? `verified ${finding.citation.lastVerified}` : 'not traced to a published clause'}
                  </span>
                </dd>
              </div>
            )}
          </dl>
          <p className="why-arch">No language model took part in this verdict. A deterministic rule compared the fields above and returned code <code>{finding.code}</code>; this page only translated that code into your language.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || '/');
  useEffect(() => {
    const handler = () => {
      setRoute(window.location.hash.replace(/^#/, '') || '/');
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return [route, (next) => { window.location.hash = next; }];
}

export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-bar" role="alert">
      You are offline. What is already on this screen stays readable — including every fix and where to get it. New checks will run when you reconnect.
    </div>
  );
}

/** Counts up to a number. Used exactly once, on the money figure. */
export function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef();
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setValue(target); return undefined; }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setValue(Math.round(target * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    // requestAnimationFrame does not run in a background or non-compositing
    // tab, which would leave the figure showing zero. This number is the
    // argument of the page; it must land on its real value whether or not the
    // animation ever got to run.
    const settle = setTimeout(() => setValue(target), duration + 400);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(settle); };
  }, [target, duration]);
  return value;
}

export const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
