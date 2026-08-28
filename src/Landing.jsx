import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Brand, Button, LanguageSwitch, SiteFooter, SiteNav, SpeakButton, useCountUp, useLang, rupees } from './ui.jsx';

/* ------------------------------------------------------------------ *
 * The hero's live office lookup.
 *
 * This is the most important element on the page and it is deliberately placed
 * above everything else, with no sign-in, no email capture and no case.
 * "Which office holds my file" is precisely the question a middleman monetises
 * since BBMP became five corporations. Giving the answer away in the hero,
 * before asking for anything at all, is the argument.
 * ------------------------------------------------------------------ */

function OfficeLookup() {
  const { t } = useLang();
  const [value, setValue] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [localities, setLocalities] = useState([]);

  useEffect(() => { api.meta().then((m) => setLocalities(m.localities || [])).catch(() => {}); }, []);

  const run = async (address) => {
    const query = (address ?? value).trim();
    if (!query) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const { jurisdiction } = await api.publicLookup(query);
      setResult(jurisdiction);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="lookup">
      <div className="lookup-head">
        <span className="lookup-tag">{t('lookup.tag')}</span>
        <h2>{t('lookup.title')}</h2>
        <p>{t('lookup.sub')}</p>
      </div>

      <form className="lookup-form" onSubmit={(e) => { e.preventDefault(); run(); }}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t('lookup.placeholder')}
          aria-label={t('lookup.placeholder')}
          autoComplete="off"
          list="locality-list"
        />
        <datalist id="locality-list">
          {localities.map((name) => <option key={name} value={name} />)}
        </datalist>
        <Button type="submit" busy={busy}>{busy ? t('lookup.trying') : t('lookup.button')}</Button>
      </form>

      {/* Place names stay as they are written on a document. The last chip is a
          deliberate one: the resolver refusing to answer is as much a feature as
          the resolver answering, so it gets a button of its own. */}
      <div className="lookup-chips">
        {['Brookefield', 'Domlur', 'Yelahanka', 'Electronic City'].map((chip) => (
          <button key={chip} type="button" onClick={() => { setValue(chip); run(chip); }}>{chip}</button>
        ))}
        <button type="button" className="chip-unknown" onClick={() => { setValue('behind the big tree'); run('behind the big tree'); }}>
          {t('lookup.unknownChip')}
        </button>
      </div>

      {error && <p className="lookup-error">{error}</p>}

      {result && (
        <div className={`lookup-result ${result.confidence}`}>
          <div className="lookup-verdict">
            <span className={`conf conf-${result.confidence}`}>
              {result.confidence === 'resolved' && 'Resolved'}
              {result.confidence === 'contested' && 'Boundary case'}
              {result.confidence === 'unresolved' && 'Not placed'}
              {result.confidence === 'outside-coverage' && 'Outside the city corporations'}
            </span>
            <p>{result.message}</p>
          </div>

          {result.candidates?.map((candidate, index) => (
            <div className="office-card" key={candidate.corporationId}>
              {result.candidates.length > 1 && (
                <span className="office-order">{index === 0 ? t('office.tryFirst') : t('office.alternate')}</span>
              )}
              <strong>{candidate.corporation}</strong>
              <span className="office-zone">{candidate.zone}</span>
              <span className="office-counter">{candidate.office}</span>
              {index === 0 && candidate.previousWard && <span className="office-ward">Formerly {candidate.previousWard}</span>}
            </div>
          ))}

          {result.nextStep && <p className="lookup-next">{result.nextStep}</p>}

          {result.confidence === 'unresolved' && (
            <details className="lookup-known">
              <summary>{t('office.known')} ({result.knownLocalities?.length})</summary>
              <p>{result.knownLocalities?.join(' · ')}</p>
            </details>
          )}

          <p className="lookup-caveat">
            Boundary geometry here is approximate — we say so on <a href="#/mocks">the mocks page</a> rather than in a footnote nobody reads. When a property sits within 1.5 km of a divide we name both offices instead of guessing.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The money moment
 * ------------------------------------------------------------------ */

function PriceContrast() {
  const [seen, setSeen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold: 0.4 });
    observer.observe(node);
    // The figure is the argument of the page; it must never be left showing
    // zero because an observer did not fire.
    const failsafe = setTimeout(() => setSeen(true), 2500);
    return () => { observer.disconnect(); clearTimeout(failsafe); };
  }, []);
  const agent = useCountUp(seen ? 6000 : 0, 1100);

  return (
    <section className="price" ref={ref} id="price">
      <div className="price-inner">
        <div className="price-side agent">
          <span className="price-label">What Lakshmi was quoted</span>
          <div className="price-figure">{rupees(agent)}</div>
          <p>To be told her papers were "not in order" — without ever being told which paper, or which line on it.</p>
        </div>
        <div className="price-divider" aria-hidden="true"><span>vs</span></div>
        <div className="price-side ours">
          <span className="price-label">What this costs</span>
          <div className="price-figure">₹499</div>
          <p>The same outcome, and you know exactly what was wrong, who fixes it, where, and how many days it takes.</p>
          <span className="price-note">Payments are not implemented in this prototype. There is no payment screen at all — see <a href="#/mocks">/mocks</a>.</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * The evidence
 * ------------------------------------------------------------------ */

function Evidence() {
  const { locale } = useLang();
  const spoken = 'Forty per cent of bribes paid in India are for property registration and land. But thirty eight per cent of people say they paid because it was the only way to get their work done. That is not a moral problem. It is a friction problem.';
  return (
    <section className="evidence" id="why">
      <div className="evidence-grid">
        <div className="stat big">
          <span className="stat-num">40<i>%</i></span>
          <span className="stat-label">of bribes paid in India are for property registration and land — the largest single category, ahead of police and municipal services.</span>
        </div>
        <div className="stat">
          <span className="stat-num">38<i>%</i></span>
          <span className="stat-label">of people who paid say it was <em>the only way to get their work done</em>.</span>
        </div>
        <div className="stat">
          <span className="stat-num">54<i>%</i></span>
          <span className="stat-label">of businesses report being <em>forced</em> to pay. That is extortion, not willing bribery.</span>
        </div>
      </div>
      <div className="evidence-claim">
        <p>
          Read that middle number again. Most of this money is not buying an unfair advantage.
          It is buying a service the state already owes you.
        </p>
        <p className="claim-punch">
          Which means it is not a moral problem to be shamed away.
          <strong> It is a friction problem, and friction can be engineered away.</strong>
        </p>
        <SpeakButton text={spoken} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * The three mechanics
 * ------------------------------------------------------------------ */

const MECHANICS = [
  {
    id: 'office',
    step: '01',
    title: 'Find the office that actually holds your file',
    body: 'BBMP was replaced by five city corporations. Your address is resolved against the corporation boundaries — and when it sits near a divide, you get both offices and which to try first, not a confident guess.',
    proof: 'Bengaluru East · Mahadevapura zone',
    proofLabel: 'Resolved from “42, Brookefield Main Road”'
  },
  {
    id: 'papers',
    step: '02',
    title: 'Find out what is wrong before they do',
    body: 'Forty-six deterministic rules compare names, survey numbers, property IDs, tax years, dates and stamp duty across every document you have. Each finding names the rule, the two documents that disagreed, and the exact field.',
    proof: '2 blocking · 1 objection · 5 worth knowing',
    proofLabel: 'A real result from the demo document set'
  },
  {
    id: 'clock',
    step: '03',
    title: 'Make the deadline do the pushing',
    body: 'Your acknowledgement number attaches a statutory deadline. When it lapses, the first appeal is already drafted — correct addressee, correct date arithmetic, your name at the bottom. You sign it. You write nothing.',
    proof: 'Day 31 · appeal ready',
    proofLabel: 'The clock does what a bribe used to'
  }
];

function Mechanics() {
  const [active, setActive] = useState('office');
  const mechanic = MECHANICS.find((m) => m.id === active);
  return (
    <section className="mechanics" id="how">
      <div className="section-head">
        <span className="kicker">The three things that change</span>
        <h2>The counter should never be where you discover a problem.</h2>
      </div>
      <div className="mechanics-body">
        <div className="mechanics-tabs" role="tablist">
          {MECHANICS.map((m) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={active === m.id}
              className={active === m.id ? 'on' : ''}
              onClick={() => setActive(m.id)}
            >
              <span className="tab-step">{m.step}</span>
              <span className="tab-title">{m.title}</span>
            </button>
          ))}
        </div>
        <div className="mechanics-panel" role="tabpanel">
          <p className="panel-body">{mechanic.body}</p>
          <div className="panel-proof">
            <span className="proof-label">{mechanic.proofLabel}</span>
            <strong>{mechanic.proof}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Architecture
 * ------------------------------------------------------------------ */

function Architecture() {
  return (
    <section className="arch" id="architecture">
      <div className="section-head light">
        <span className="kicker">The one architectural commitment</span>
        <h2>Rules decide. The model only reads and explains.</h2>
        <p>
          A hallucinated “your papers are fine” costs someone a day of work, a bus fare, and the only
          leverage they had. So the model is never in the decision path.
        </p>
      </div>
      <div className="arch-flow">
        <div className="arch-node model">
          <span className="node-role">Model</span>
          <strong>Reads a photo into fields</strong>
          <p>Every value it reads is shown to you as an editable field first.</p>
        </div>
        <div className="arch-arrow" aria-hidden="true">→</div>
        <div className="arch-node you">
          <span className="node-role">You</span>
          <strong>Confirm each value</strong>
          <p>Nothing reaches a rule until a human has looked at it.</p>
        </div>
        <div className="arch-arrow" aria-hidden="true">→</div>
        <div className="arch-node engine">
          <span className="node-role">Engine</span>
          <strong>Decides, deterministically</strong>
          <p>46 rules. Same input, same output, every time. Returns a code and an evidence trail.</p>
        </div>
        <div className="arch-arrow" aria-hidden="true">→</div>
        <div className="arch-node ledger">
          <span className="node-role">Ledger</span>
          <strong>Turns the code into your language</strong>
          <p>47 codes × 3 languages = 141 explanations that exist once, for everybody.</p>
        </div>
      </div>
      <p className="arch-scale">
        That last line is also the scale answer. Because explanations are cached per defect code and not
        per citizen, serving one crore people costs the same model spend as serving ten thousand.
        Adding a second service means authoring another rule file — not writing another scraper.
        <a href="#/rulebook">See all 47 codes →</a>
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Personas
 * ------------------------------------------------------------------ */

function Personas({ personas, onStart, starting }) {
  if (!personas.length) return null;
  return (
    <section className="personas" id="personas">
      <div className="section-head">
        <span className="kicker">Two minutes, start to finish</span>
        <h2>Pick someone and walk their whole case.</h2>
        <p>Each one has a complete synthetic document set with real defects in it. The engine has not been told which is which.</p>
      </div>
      <div className="persona-grid">
        {personas.map((persona) => (
          <button
            key={persona.id}
            className={`persona-card ${persona.resolvableByPaperwork ? '' : 'hard'}`}
            onClick={() => onStart(persona.id)}
            disabled={Boolean(starting)}
          >
            <span className="persona-avatar" aria-hidden="true">{persona.initial}</span>
            <span className="persona-name">{persona.name}</span>
            <span className="persona-head">{persona.headline}</span>
            <span className="persona-foot">
              <span className="persona-quote">Quoted {rupees(persona.quotedByAgent)}</span>
              <span className="persona-go">{starting === persona.id ? 'Opening…' : 'Walk this case →'}</span>
            </span>
            {!persona.resolvableByPaperwork && <span className="persona-flag">The hard case — cannot be fixed with better paperwork</span>}
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Honesty strip
 * ------------------------------------------------------------------ */

function Honesty({ meta }) {
  return (
    <section className="honesty" id="honesty">
      <div className="honesty-inner">
        <div>
          <span className="kicker">Before you look for the seam</span>
          <h2>Here is where it is.</h2>
          <p>
            Every property record here is invented. Nothing is submitted to any office. No payment is taken.
            No government login is ever asked for, stored or used. The corporation boundaries are approximate
            envelopes, not official geometry. Appeals are drafted and downloadable — never delivered.
          </p>
          <p>
            The full register lists fourteen of these, each with what we do instead and what would replace it.
            If you find something on it we have not listed, that is a bug in the page.
          </p>
          <a className="btn ghost" href="#/mocks">Read the mock register →</a>
        </div>
        <ul className="honesty-facts">
          <li><strong>{meta?.ruleCount ?? 46}</strong><span>deterministic rules, none of them a model call</span></li>
          <li><strong>{meta?.ledger?.codes ?? 47}</strong><span>defect codes, each with a cited source</span></li>
          <li><strong>{meta?.ledger?.unverifiedCitations ?? 0}</strong><span>of them marked “not traced to a published clause”, because they aren’t</span></li>
          <li><strong>0</strong><span>government systems contacted, ever</span></li>
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function Landing({ meta, onStart, starting }) {
  const { t } = useLang();
  return (
    <>
      <SiteNav />

      {/*
        The hook is the sentence itself.
        Every person this is built for has stood at a counter and heard it, and
        the whole product is the answer to the question it refuses to answer.
        So the sentence leads, in the language the reader chose, and the turn
        underneath it is the promise.
      */}
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">{t('hero.eyebrow')}</span>

          <h1 className="hero-quote">
            <span className="quote-open" aria-hidden="true">&ldquo;</span>
            <span className="quote-text">{t('hero.quote')}</span>
            <span className="quote-close" aria-hidden="true">&rdquo;</span>
          </h1>
          <p className="hero-gloss">{t('hero.gloss')}</p>

          <p className="hero-turn">
            {t('hero.turnLead')} <strong>{t('hero.turn')}</strong>
          </p>

          <p className="hero-sub">{t('hero.sub')}</p>

          <div className="hero-actions">
            <Button kind="primary big" onClick={() => onStart('lakshmi')} busy={starting === 'lakshmi'}>
              {t('hero.cta')} <span aria-hidden="true">→</span>
            </Button>
            <a className="btn ghost big" href="#lookup">{t('hero.secondary')}</a>
          </div>
          <span className="hero-microcopy">{t('hero.ctaSub')}</span>
          <p className="hero-who">{t('hero.who')}</p>
        </div>
        <div className="hero-lookup" id="lookup"><OfficeLookup /></div>
      </section>

      <Evidence />
      <PriceContrast />
      <Mechanics />
      <Personas personas={meta?.personas || []} onStart={onStart} starting={starting} />
      <Architecture />
      <Honesty meta={meta} />

      <section className="closer">
        <p>
          Thirty-eight per cent pay because it is the only way to get their work done.
        </p>
        <h2>So we built the other way.</h2>
        <Button kind="primary big" onClick={() => onStart('lakshmi')} busy={starting === 'lakshmi'}>
          {t('hero.cta')} <span aria-hidden="true">→</span>
        </Button>
      </section>

      <SiteFooter />
    </>
  );
}
