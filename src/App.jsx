import { useCallback, useEffect, useState } from 'react';
import { api, getStoredCase, getStoredCaseId, setStoredCase, setStoredCaseId } from './api.js';
import { FALLBACK_META } from './demo-meta.js';
import { warmVoices } from './speech.js';
import Landing, { PersonaPicker } from './Landing.jsx';
import Journey from './Journey.jsx';
import Assistant from './Assistant.jsx';
import { MocksPage, RulebookPage } from './Pages.jsx';
import { LanguageProvider, MockBanner, Notice, OfflineBar, Spinner, landingSectionForRoute, useHashRoute, useLang } from './ui.jsx';

function CaseGate() {
  useEffect(() => {
    window.location.hash = '#/start';
  }, []);
  return (
    <main className="page">
      <Notice tone="info" title="No case open in this tab">
        <p>Pick one of the three demo cases on the home page — Lakshmi, Imran, or Sarala.</p>
        <p><a className="btn primary" href="#/start">Pick a demo case</a></p>
      </Notice>
    </main>
  );
}

function Shell() {
  const { language } = useLang();
  const [route, navigate] = useHashRoute();
  const [meta, setMeta] = useState(FALLBACK_META);
  const [caseData, setCaseData] = useState(null);
  const [starting, setStarting] = useState('');
  const [error, setError] = useState('');
  // True only while a stored case is being restored. Without it, a reload on
  // /case/<step> rendered CaseGate first — and a child's effect runs before its
  // parent's, so CaseGate bounced to /start before the resume below had a
  // chance to run, throwing away the step in the URL.
  const [resuming, setResuming] = useState(() => Boolean(getStoredCaseId()));

  useEffect(() => {
    let cancelled = false;
    api.meta()
      .then((loaded) => { if (!cancelled) setMeta(loaded); })
      .catch(() => { /* bundled personas already on screen */ });
    warmVoices();
    return () => { cancelled = true; };
  }, []);

  // Resume a case if this tab already had one.
  useEffect(() => {
    const stored = getStoredCaseId();
    if (!stored) return;
    const local = getStoredCase();
    if (local?.id === stored) setCaseData(local);
    api.getCase(stored)
      .then((r) => { setCaseData(r.case); setStoredCase(r.case); })
      .catch(() => {
        if (!getStoredCase()) setStoredCaseId(null);
      })
      .finally(() => setResuming(false));
  }, []);

  const start = useCallback(async (personaId) => {
    setStarting(personaId || 'blank');
    setError('');
    try {
      const result = await api.createCase({ personaId, language });
      setStoredCaseId(result.caseId);
      setStoredCase(result.case);
      setCaseData(result.case);
      navigate('/case');
    } catch (e) {
      setError(e.message.includes('reach the server')
        ? 'Could not reach the server. If you are running locally, start both halves with npm run dev.'
        : e.message);
    }
    finally { setStarting(''); }
  }, [language, navigate]);

  const exit = () => navigate('/');

  const restart = async () => {
    if (caseData?.id) await api.deleteCase(caseData.id).catch(() => {});
    setStoredCaseId(null);
    setStoredCase(null);
    setCaseData(null);
    navigate('/');
  };

  const landingSection = landingSectionForRoute(route);
  const inCase = route.startsWith('/case');

  const content = (() => {
    if (route.startsWith('/register')) return <MocksPage />;
    if (route.startsWith('/ledger')) return <RulebookPage />;

    if (route.startsWith('/start') || route.startsWith('/personas')) {
      return (
        <>
          {error && <div className="page"><Notice tone="error">{error}</Notice></div>}
          <PersonaPicker meta={meta} onStart={start} starting={starting} />
        </>
      );
    }

    if (inCase) {
      if (resuming && !caseData) {
        return <main className="page"><Spinner label="Opening your case…" /></main>;
      }
      if (!caseData) return <CaseGate />;
      // The journey owns which of its steps the route names; it just needs the
      // route and a way to change it, so that Back walks the steps rather than
      // leaving the case altogether.
      return (
        <Journey
          caseData={caseData}
          setCaseData={setCaseData}
          meta={meta}
          route={route}
          navigate={navigate}
          onExit={exit}
          onRestart={restart}
        />
      );
    }

    return (
      <>
        {error && <div className="page"><Notice tone="error">{error}</Notice></div>}
        <Landing meta={meta} onStart={start} starting={starting} focusSection={landingSection || undefined} />
      </>
    );
  })();

  return (
    <>
      {content}
      {/* The orb belongs on every page, not only inside a case. Mounted only in
          the journey it was invisible until you had already committed to eight
          steps — which is exactly backwards, because the questions people have
          before they start (how many days does the office get, what happens if
          they sit on it, what am I supposed to pay) are the ones the assistant
          can answer without a case at all.

          Inside the journey, Journey mounts its own with the live evaluation
          from the on-device check, which can be newer than the copy on the case
          when the network is down. So this one stands down there. */}
      {!inCase && <Assistant caseData={caseData} evaluation={caseData?.lastEvaluation || null} />}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <MockBanner />
      <OfflineBar />
      <Shell />
    </LanguageProvider>
  );
}
