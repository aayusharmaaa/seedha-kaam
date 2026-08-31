import { useCallback, useEffect, useState } from 'react';
import { api, getStoredCase, getStoredCaseId, setStoredCase, setStoredCaseId } from './api.js';
import { FALLBACK_META } from './demo-meta.js';
import { warmVoices } from './speech.js';
import Landing, { PersonaPicker } from './Landing.jsx';
import Journey from './Journey.jsx';
import { FrictionIndexPage, HowPage, MocksPage, RulebookPage } from './Pages.jsx';
import { LanguageProvider, MockBanner, Notice, OfflineBar, useHashRoute, useLang } from './ui.jsx';

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
      });
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

  if (route.startsWith('/mocks')) return <MocksPage />;
  if (route.startsWith('/rulebook')) return <RulebookPage />;
  if (route.startsWith('/index')) return <FrictionIndexPage />;
  if (route.startsWith('/how')) return <HowPage />;

  if (route.startsWith('/start') || route.startsWith('/personas')) {
    return (
      <>
        {error && <div className="page"><Notice tone="error">{error}</Notice></div>}
        <PersonaPicker meta={meta} onStart={start} starting={starting} />
      </>
    );
  }

  if (route.startsWith('/case')) {
    if (!caseData) {
      return <CaseGate />;
    }
    return <Journey caseData={caseData} setCaseData={setCaseData} meta={meta} onExit={exit} onRestart={restart} />;
  }

  return (
    <>
      {error && <div className="page"><Notice tone="error">{error}</Notice></div>}
      <Landing meta={meta} onStart={start} starting={starting} />
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
