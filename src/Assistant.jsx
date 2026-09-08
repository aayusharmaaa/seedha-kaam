/**
 * THE ASSISTANT — orb, panel, voice.
 *
 * This is only the surface. Everything it says comes from `assistant.js`,
 * which retrieves rather than composes; see the note at the top of that file
 * for why the line is drawn there and not somewhere more convenient.
 *
 * The orb reuses the wordmark's idea — a dashed arc going the long way round,
 * a straight line going through it — because that is the whole product in one
 * glyph and it costs nothing to repeat it here.
 */

import { useEffect, useRef, useState } from 'react';
import { answer, SUGGESTION_INTENTS } from './assistant.js';
import { createRecognizer, recognitionSupported, speak, stopSpeaking } from './speech.js';
import { useLang } from './ui.jsx';
import { LANGS } from './i18n.js';

const localeFor = (language) => LANGS.find((l) => l.code === language)?.speech || 'en-IN';

export default function Assistant({ caseData, evaluation }) {
  const { t, language } = useLang();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const recognizerRef = useRef(null);

  // The scaffolding sentences. Everything substantive — titles, why, fix,
  // owner, where — arrives already translated on the findings themselves,
  // because the ledger is keyed on (code × language).
  const strings = {
    whatToDo: t('bot.whatToDo'), whoWhere: t('bot.whoWhere'), fromRulebook: t('bot.fromRulebook'),
    fromEngine: t('bot.fromEngine'), fromJurisdiction: t('bot.fromJurisdiction'), lastVerified: t('bot.lastVerified'),
    noCheckYet: t('bot.noCheckYet'), noOfficeYet: t('bot.noOfficeYet'), noBlockers: t('bot.noBlockers'),
    nothingToFix: t('bot.nothingToFix'), nothingMissing: t('bot.nothingMissing'),
    blockersIntro: t('bot.blockersIntro'), askWhichOne: t('bot.askWhichOne'), missingIntro: t('bot.missingIntro'),
    countsLine: t('bot.countsLine'), howLongAnswer: t('bot.howLongAnswer'), deadlineAnswer: t('bot.deadlineAnswer'),
    appealIntro: t('bot.appealIntro'), appealDrafted: t('bot.appealDrafted'), theDayItLapses: t('bot.theDayItLapses'),
    disposedWithin: t('bot.disposedWithin'), days: t('common.days'), contested: t('bot.contested'),
    calendarDays: t('bot.calendarDays'), feeAnswer: t('bot.feeAnswer'), helpAnswer: t('bot.helpAnswer'),
    verdictRefused: t('check.refused'), verdictObjected: t('check.objected'), verdictReady: t('check.ready')
  };

  const ask = (question) => {
    const text = String(question || '').trim();
    if (!text) return;
    const reply = answer(text, { caseData, evaluation, strings, language });
    setTurns((prev) => [...prev, { role: 'you', text }, { role: 'bot', ...reply }]);
    setDraft('');
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [turns]);

  // Closing must silence it. A panel dismissed while still talking is the
  // fastest way to make someone in a queue put the phone in their pocket.
  // Clear the log so a previous intro blurb cannot stick around in state.
  useEffect(() => {
    if (!open) {
      stopSpeaking();
      setSpeaking(false);
      recognizerRef.current?.stop();
      setTurns([]);
    }
  }, [open]);
  useEffect(() => () => { stopSpeaking(); recognizerRef.current?.stop(); }, []);

  const dictate = () => {
    if (listening) { recognizerRef.current?.stop(); setListening(false); return; }
    if (!recognitionSupported()) return;
    stopSpeaking(); setSpeaking(false);
    const recognizer = createRecognizer({
      locale: localeFor(language),
      onResult: ({ interim, final }) => {
        setDraft(final || interim);
        if (final) { setListening(false); ask(final); }
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false)
    });
    recognizerRef.current = recognizer;
    if (recognizer) { setListening(true); recognizer.start(); }
  };

  const readAloud = (text) => {
    if (speaking) { stopSpeaking(); setSpeaking(false); return; }
    setSpeaking(true);
    speak(text, { locale: localeFor(language), onEnd: () => setSpeaking(false) });
  };

  return (
    <>
      <button
        className={`orb${open ? ' orb-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('bot.open')}
      >
        <span className="orb-halo" aria-hidden="true" />
        <svg viewBox="0 0 32 32" width="27" height="27" aria-hidden="true" focusable="false">
          <path d="M7 20.5C9.5 8.5 20.5 8.5 24 18.5" className="orb-detour" fill="none" strokeWidth="2" strokeLinecap="round" strokeDasharray="2.6 3.2" />
          <path d="M7 20.5h14.5" className="orb-straight" fill="none" strokeWidth="3" strokeLinecap="round" />
          <path d="m18.5 16.8 4.2 3.7-4.2 3.7" className="orb-straight" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="orb-label">{t('bot.orb')}</span>
      </button>

      {open && (
        <section className="bot" role="dialog" aria-label={t('bot.title')}>
          <header className="bot-head">
            <div>
              <strong>{t('bot.title')}</strong>
              <span>{t('bot.subtitle')}</span>
            </div>
            <button className="bot-close" onClick={() => setOpen(false)} aria-label={t('common.close')}>×</button>
          </header>

          {/* Chips stay above the scroll log so a long help turn cannot cover them. */}
          <div className="bot-chips">
            {SUGGESTION_INTENTS.map((id) => (
              <button key={id} type="button" onClick={() => ask(t(`bot.chip.${id}`))}>{t(`bot.chip.${id}`)}</button>
            ))}
          </div>

          <div className="bot-log" ref={logRef}>
            {turns.map((turn, i) => (
              <div key={i} className={`bot-turn ${turn.role}`}>
                <p>{turn.text}</p>
                {turn.cite && <p className="bot-cite">{turn.cite}</p>}
                {turn.role === 'bot' && (
                  <button className="bot-speak" onClick={() => readAloud(turn.text)}>
                    {speaking ? t('bot.stop') : t('bot.readAloud')}
                  </button>
                )}
              </div>
            ))}
          </div>

          <form
            className="bot-input"
            onSubmit={(e) => { e.preventDefault(); ask(draft); }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={listening ? t('bot.listening') : t('bot.placeholder')}
              aria-label={t('bot.placeholder')}
            />
            {recognitionSupported() && (
              <button
                type="button"
                className={`bot-mic${listening ? ' on' : ''}`}
                onClick={dictate}
                aria-label={t('bot.speak')}
              >
                {listening ? '■' : '🎙'}
              </button>
            )}
            <button type="submit" className="bot-send" aria-label={t('bot.send')}>→</button>
          </form>

          <p className="bot-foot">{t('bot.disclaimer')}</p>
        </section>
      )}
    </>
  );
}
