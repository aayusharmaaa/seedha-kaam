import { Fragment, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { Brand, Button, LanguageSwitch, Reveal, SiteFooter, SiteNav, SpeakButton, useLang, useStagedEntrance, rupees } from './ui.jsx';

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
 * The right-hand visual.
 *
 * Two claims, shown rather than written. Five document fragments lying at odd
 * angles pull themselves into an ordered, checked stack — that is the whole
 * product in one gesture. Then the fee the agent quoted is struck through and
 * replaced.
 *
 * Everything renders in its FINISHED state by default; the animation only runs
 * when the hero has opted into staging. A stalled timeline shows a neat stack
 * and the corrected price, never scattered paper frozen mid-air.
 * ------------------------------------------------------------------ */

function PriceCut() {
  const { t } = useLang();
  return (
    <figure className="pricecut">
      <div className="shards" role="img" aria-label={t('cut.gathered')}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`shard s${n}`} aria-hidden="true">
            <i /><i /><i /><i />
          </span>
        ))}
        <span className="seal" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.6 4.5L19 7.5" />
          </svg>
        </span>
      </div>

      <figcaption className="cut">
        <span className="cut-side was">
          <s>₹3,000&ndash;15,000</s>
          <em>{t('cut.was')}</em>
        </span>
        <span className="cut-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
        <span className="cut-side now">
          <b>₹500</b>
          <em>{t('cut.now')}</em>
        </span>
      </figcaption>

      <p className="cut-note">{t('cut.refund')}</p>
    </figure>
  );
}

/* ------------------------------------------------------------------ *
 * The money moment
 * ------------------------------------------------------------------ */

function PriceContrast() {
  return (
    <section className="price" id="price">
      <div className="price-head">
        <span className="kicker">The itemised bill</span>
        <h2>What that fee actually buys.</h2>
        <p>
          Three facts, each already published by the state, none of them findable by the
          person who needs them. Priced by the state at nothing.
        </p>
      </div>

      <ol className="tax-list">
        <Reveal as="li" delay={0}>
          <span className="tax-what">Which of the five corporations holds your record</span>
          <span className="tax-where">Published. Resolvable from your address in about a second.</span>
          <span className="tax-price">₹0</span>
        </Reveal>
        <Reveal as="li" delay={120}>
          <span className="tax-what">Which document is actually wrong, and why</span>
          <span className="tax-where">A notified checklist, plus consistency the counter checks silently.</span>
          <span className="tax-price">₹0</span>
        </Reveal>
        <Reveal as="li" delay={240}>
          <span className="tax-what">That you have a 30-day right, and how to enforce it</span>
          <span className="tax-where">In force since 2011. Almost nobody claims it.</span>
          <span className="tax-price">₹0</span>
        </Reveal>
      </ol>

      <div className="tax-total">
        <p>
          <strong>This part is an information tax.</strong> Not corruption — just three public
          facts with no route to the person who needs them, and it is the part software can
          delete outright. We cannot tell you what share of any given fee it is, because
          nobody can measure that honestly. The rest — somebody genuinely sitting on your
          file — is what the clock is for, and the clock is slower than cash. We do not
          pretend otherwise.
        </p>
        <span className="price-note">
          Payments are not implemented in this prototype — there is no payment screen at all.
          See <a href="#/mocks">/mocks</a>.
        </span>
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
    body: 'Your acknowledgement number attaches a statutory deadline. When it lapses, the first appeal is already drafted — correct addressee, correct date arithmetic, your name at the bottom. You sign it. It is not as fast as paying someone, and we do not pretend otherwise — it is the only lever you have that costs nothing.',
    proof: 'Day 31 · appeal ready',
    proofLabel: 'The only pressure you have that is not money'
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
        <Reveal className="arch-node model" delay={0}>
          <span className="node-role">Model</span>
          <strong>Reads a photo into fields</strong>
          <p>Every value it reads is shown to you as an editable field first.</p>
        </Reveal>
        <div className="arch-arrow" aria-hidden="true">→</div>
        <Reveal className="arch-node you" delay={140}>
          <span className="node-role">You</span>
          <strong>Confirm each value</strong>
          <p>Nothing reaches a rule until a human has looked at it.</p>
        </Reveal>
        <div className="arch-arrow" aria-hidden="true">→</div>
        <Reveal className="arch-node engine" delay={280}>
          <span className="node-role">Engine</span>
          <strong>Decides, deterministically</strong>
          <p>46 rules. Same input, same output, every time. Returns a code and an evidence trail.</p>
        </Reveal>
        <div className="arch-arrow" aria-hidden="true">→</div>
        <Reveal className="arch-node ledger" delay={420}>
          <span className="node-role">Ledger</span>
          <strong>Turns the code into your language</strong>
          <p>47 codes × 3 languages = 141 explanations that exist once, for everybody.</p>
        </Reveal>
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
  // Opts the hero into its entrance animation after mount, and back out once
  // the sequence has played. See useStagedEntrance.
  const heroRef = useStagedEntrance(3600);
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
      <section className="hero" ref={heroRef}>
        <div className="hero-copy">
          <span className="hero-eyebrow">{t('hero.eyebrow')}</span>

          {/*
            Played straight. Read literally, "it" refers to bribery, so the line
            relies on the reader hearing the irony unaided — which is exactly why
            the gloss below is set at reading size in full-strength ink rather
            than as a caption. It names the ₹6,000 as the AGENT'S FEE, so the joke
            resolves into the actual claim within one line of being made.
          */}
          <h1 className="hero-head">
            <span className="head-price">{t('hero.price')}</span>
            <span className="head-claim">{t('hero.claim')}</span>
          </h1>

          <p className="hero-gloss">{t('hero.gloss')}</p>
          <ol className="hero-three">
            <li>{t('hero.item1')}</li>
            <li>{t('hero.item2')}</li>
            <li>{t('hero.item3')}</li>
          </ol>

          {/*
            The payoff. This is the answer to the question the headline asks, so
            it breaks out of the text column into its own panel rather than
            reading as one more paragraph. The offer is revealed word by word —
            the words are split here rather than in CSS because the split has to
            work in Kannada and Hindi too, and because a real space has to stay
            OUTSIDE each span or the line stops wrapping at 320px.
          */}
          <div className="hero-payoff">
            <p className="payoff-lead">{t('hero.turnLead')}</p>
            <p className="payoff-offer">
              {t('hero.turn').split(' ').map((word, index, all) => (
                <Fragment key={`${word}-${index}`}>
                  <span style={{ '--w': Math.min(index, 14) }}>{word}</span>
                  {index < all.length - 1 ? ' ' : ''}
                </Fragment>
              ))}
            </p>
          </div>

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
        <div className="hero-side">
          <PriceCut />
          <div className="hero-lookup" id="lookup"><OfficeLookup /></div>
        </div>
      </section>

      <Evidence />
      <PriceContrast />
      <Mechanics />
      <Personas personas={meta?.personas || []} onStart={onStart} starting={starting} />
      <Architecture />
      <Honesty meta={meta} />

      {/* The punchline is a callback: the statistic says a bribe is "the only way",
          and the answer is the one word that undoes it. Note what it does NOT
          claim — we are not saying bribery ends, because it does not, and a
          product whose whole argument is "stop overclaiming" cannot close on an
          overclaim. */}
      <section className="closer">
        <p>{t('closer.lead')}</p>
        <h2>{t('closer.punch')}</h2>
        <Button kind="primary big" onClick={() => onStart('lakshmi')} busy={starting === 'lakshmi'}>
          {t('hero.cta')} <span aria-hidden="true">→</span>
        </Button>
      </section>

      <SiteFooter />
    </>
  );
}
