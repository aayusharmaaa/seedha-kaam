import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { newCaseId, getCase, putCase, updateCase, deleteCase, storeStats, recordOutcome, frictionIndex } from './store.js';
import { buildPersonaCase, PERSONAS, PERSONA_IDS } from './fixtures.js';
import { evaluateCase, withPassVerdict } from './engine/compliance.js';
import { LANGUAGES, ledgerStats, DEFECTS, explain } from './engine/ledger.js';
import { RULE_PACK_VERSION, RULES, VARIANTS, DOCUMENT_KINDS, TAX_YEARS_REQUIRED } from './rules/khata-transfer.v1.js';
import { resolveJurisdiction, GEO_META, GEO_MAP, GAZETTEER } from './geo/jurisdiction.js';
import { attachClock, clockStatus, escalationFacts, SERVICE_SLA, ESCALATION_LADDER } from './engine/clock.js';
import { extractDocument, coerceFields, extractionMode, fieldTemplate, FIELD_TEMPLATES, classifyByFileName } from './extract.js';
import { parseIntake } from './intake.js';
import { streamPacket, streamReport, streamEscalation } from './pdf.js';
import { MOCK_REGISTER } from './mocks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3001);

app.disable('x-powered-by');
app.set('trust proxy', 1);
// Images arrive as data URLs. 9 MB covers a downscaled phone photo with room
// to spare; anything larger is rejected with an explanation rather than a 413
// the client cannot interpret.
app.use(express.json({ limit: '9mb' }));

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // ASCII only: header values must not carry non-Latin-1 characters.
  res.setHeader('X-Prototype', 'Seedha Kaam - synthetic data only, not a government service');
  next();
});

const ok = (res, payload) => res.json(payload);
const bad = (res, message, status = 400) => res.status(status).json({ error: message });

/* ------------------------------------------------------------------ *
 * Case lookup middleware
 * ------------------------------------------------------------------ */

function withCase(req, res, next) {
  const caseData = getCase(req.params.caseId);
  if (!caseData) {
    return res.status(404).json({
      error: 'This session has expired or was never started.',
      recover: 'Start again from the home page — nothing is lost, because nothing was stored.',
      expired: true
    });
  }
  req.caseData = caseData;
  next();
}

/** Resolves "now" for a case, honouring the clearly-labelled demo time-travel. */
function caseNow(caseData) {
  return caseData.demoNow ? new Date(caseData.demoNow) : new Date();
}

/* ------------------------------------------------------------------ *
 * Meta
 * ------------------------------------------------------------------ */

app.get('/api/health', (_req, res) => ok(res, {
  status: 'ok',
  mode: 'synthetic-demo',
  rulePack: RULE_PACK_VERSION,
  extraction: extractionMode().mode,
  uptimeSeconds: Math.round(process.uptime())
}));

app.get('/api/meta', (_req, res) => ok(res, {
  rulePack: RULE_PACK_VERSION,
  ruleCount: RULES.length,
  ledger: ledgerStats(),
  languages: LANGUAGES,
  variants: Object.values(VARIANTS).map(({ id, label, labelKn, labelHi, required, recommended, slaDays }) => ({ id, label, labelKn, labelHi, required, recommended, slaDays })),
  documentKinds: DOCUMENT_KINDS,
  taxYearsRequired: TAX_YEARS_REQUIRED,
  extraction: extractionMode(),
  geo: GEO_META,
  geoMap: GEO_MAP,
  localities: GAZETTEER.map((entry) => entry.name).sort(),
  sla: SERVICE_SLA['khata-transfer'],
  escalationLadder: ESCALATION_LADDER,
  personas: PERSONA_IDS.map((id) => {
    const { documents, ...rest } = PERSONAS[id];
    return { ...rest, resolvableByPaperwork: id !== 'sarala' };
  }),
  store: storeStats()
}));

app.get('/api/mocks', (_req, res) => ok(res, {
  register: MOCK_REGISTER,
  extraction: extractionMode(),
  ledger: ledgerStats(),
  geo: GEO_META,
  store: storeStats(),
  generatedAt: new Date().toISOString()
}));

app.get('/api/ledger', (req, res) => {
  const language = LANGUAGES.some((l) => l.code === req.query.language) ? req.query.language : 'en';
  ok(res, {
    language,
    rulePack: RULE_PACK_VERSION,
    stats: ledgerStats(),
    entries: Object.keys(DEFECTS).map((code) => ({
      ...explain(code, language),
      rules: RULES.filter((rule) => rule.code === code).map((rule) => rule.id)
    }))
  });
});

app.get('/api/friction-index', (_req, res) => ok(res, frictionIndex()));

/* ------------------------------------------------------------------ *
 * Cases
 * ------------------------------------------------------------------ */

const createSchema = z.object({
  personaId: z.enum(['lakshmi', 'imran', 'sarala']).optional(),
  language: z.enum(['en', 'kn', 'hi']).optional(),
  variant: z.enum(['inheritance', 'sale']).optional()
});

app.post('/api/cases', (req, res) => {
  const parsed = createSchema.safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Could not start a case with those options.');
  const { personaId, language = 'en', variant } = parsed.data;

  const caseId = newCaseId();
  const base = personaId
    ? buildPersonaCase(personaId)
    : { personaId: null, applicant: { name: '' }, variant: variant || 'inheritance', address: '', declared: {}, documents: [] };

  const caseData = putCase(caseId, {
    ...base,
    id: caseId,
    language,
    createdAt: new Date().toISOString(),
    jurisdiction: null,
    clock: null,
    demoNow: null,
    outcomeRecorded: false,
    synthetic: Boolean(personaId)
  });

  ok(res, { caseId, case: caseData });
});

app.get('/api/cases/:caseId', withCase, (req, res) => ok(res, { case: req.caseData }));

app.delete('/api/cases/:caseId', (req, res) => {
  deleteCase(req.params.caseId);
  ok(res, { deleted: true, note: 'The case and every document field in it are gone from memory. Nothing was written to disk.' });
});

app.post('/api/cases/:caseId/language', withCase, (req, res) => {
  const parsed = z.object({ language: z.enum(['en', 'kn', 'hi']) }).safeParse(req.body);
  if (!parsed.success) return bad(res, 'Unsupported language.');
  ok(res, { case: updateCase(req.params.caseId, { language: parsed.data.language }) });
});

app.post('/api/cases/:caseId/applicant', withCase, (req, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    variant: z.enum(['inheritance', 'sale']).optional(),
    address: z.string().trim().max(240).optional()
  }).safeParse(req.body);
  if (!parsed.success) return bad(res, 'Please give a name of at least two characters.');
  const { name, variant, address } = parsed.data;
  const next = { applicant: { ...req.caseData.applicant, name } };
  if (variant) next.variant = variant;
  if (address !== undefined) next.address = address;
  ok(res, { case: updateCase(req.params.caseId, next) });
});

/* ------------------------------------------------------------------ *
 * Intake
 * ------------------------------------------------------------------ */

app.post('/api/cases/:caseId/intake', withCase, async (req, res, next) => {
  try {
    const parsed = z.object({ utterance: z.string().trim().min(2).max(600) }).safeParse(req.body);
    if (!parsed.success) return bad(res, 'Say or type a sentence about what you need done.');
    const intake = await parseIntake(parsed.data.utterance);
    const changes = { intake: { ...intake, utterance: parsed.data.utterance, at: new Date().toISOString() } };
    if (intake.variant) changes.variant = intake.variant;
    if (intake.locality && !req.caseData.address) changes.address = intake.locality;
    ok(res, { case: updateCase(req.params.caseId, changes), intake });
  } catch (error) { next(error); }
});

/* ------------------------------------------------------------------ *
 * Jurisdiction
 * ------------------------------------------------------------------ */

app.post('/api/cases/:caseId/jurisdiction', withCase, (req, res) => {
  const parsed = z.object({
    address: z.string().trim().max(240).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional()
  }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Give an address or a location.');

  const address = parsed.data.address ?? req.caseData.address;
  if (!address && parsed.data.lat === undefined) return bad(res, 'Give an address or share your location.');

  const jurisdiction = resolveJurisdiction({ address, lat: parsed.data.lat, lng: parsed.data.lng });
  ok(res, { case: updateCase(req.params.caseId, { address: address || req.caseData.address, jurisdiction }), jurisdiction });
});

// Unauthenticated resolver, so the landing page can answer "which office is
// mine" before anyone has started anything. This is the answer a tout charges
// for, so it is given away with no case, no session and no sign-in.
app.post('/api/jurisdiction/lookup', (req, res) => {
  const parsed = z.object({ address: z.string().trim().min(2).max(240) }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Type an area name, for example "Brookefield".');
  ok(res, { jurisdiction: resolveJurisdiction({ address: parsed.data.address }) });
});

/* ------------------------------------------------------------------ *
 * Documents
 * ------------------------------------------------------------------ */

app.get('/api/document-kinds', (_req, res) => ok(res, {
  kinds: Object.entries(DOCUMENT_KINDS).map(([kind, meta]) => ({ kind, ...meta, fields: fieldTemplate(kind) })),
  templates: FIELD_TEMPLATES
}));

app.post('/api/cases/:caseId/documents/fixtures', withCase, (req, res) => {
  const parsed = z.object({
    personaId: z.enum(['lakshmi', 'imran', 'sarala']).optional(),
    corrected: z.boolean().optional()
  }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Unknown demo document set.');
  const personaId = parsed.data.personaId || req.caseData.personaId;
  if (!personaId) return bad(res, 'This case is not using a demo persona, so there are no sample documents to load.');
  const built = buildPersonaCase(personaId, { corrected: Boolean(parsed.data.corrected) });
  ok(res, {
    case: updateCase(req.params.caseId, {
      personaId,
      applicant: built.applicant,
      variant: built.variant,
      address: req.caseData.address || built.address,
      declared: built.declared,
      documents: built.documents,
      synthetic: true
    })
  });
});

const uploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().max(120).optional(),
  sizeBytes: z.number().int().min(0).max(50_000_000).optional(),
  dataUrl: z.string().max(9_000_000).optional(),
  kindHint: z.string().trim().max(60).optional()
});

app.post('/api/cases/:caseId/documents', withCase, async (req, res, next) => {
  try {
    const parsed = uploadSchema.safeParse(req.body || {});
    if (!parsed.success) return bad(res, 'That file could not be accepted. Keep it under 9 MB and give it a name.');
    if (req.caseData.documents.length >= 24) return bad(res, 'This case already holds 24 documents, which is more than any counter will read.');

    const extracted = await extractDocument(parsed.data);
    const doc = {
      id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      kind: extracted.kind,
      fileName: extracted.fileName,
      mimeType: extracted.mimeType || null,
      fileSizeBytes: extracted.fileSizeBytes,
      fields: coerceFields(extracted.kind, extracted.fields),
      rawExtraction: extracted.fields,
      template: extracted.template,
      classification: extracted.classification,
      extractionSource: extracted.extractionSource,
      extractionModel: extracted.extractionModel || null,
      extractionNote: extracted.extractionNote,
      extractionError: extracted.extractionError || null,
      confirmed: false,
      synthetic: false,
      addedAt: new Date().toISOString()
    };

    const documents = [...req.caseData.documents, doc];
    ok(res, { case: updateCase(req.params.caseId, { documents }), document: doc });
  } catch (error) { next(error); }
});

app.put('/api/cases/:caseId/documents/:docId', withCase, (req, res) => {
  const parsed = z.object({
    kind: z.string().trim().max(60).optional(),
    fields: z.record(z.string(), z.any()).optional(),
    confirmed: z.boolean().optional()
  }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Those field values could not be saved.');

  const documents = req.caseData.documents.map((doc) => {
    if (doc.id !== req.params.docId) return doc;
    const kind = parsed.data.kind || doc.kind;
    return {
      ...doc,
      kind,
      template: fieldTemplate(kind),
      fields: parsed.data.fields ? coerceFields(kind, { ...doc.fields, ...parsed.data.fields }) : doc.fields,
      confirmed: parsed.data.confirmed ?? true,
      // Once a human has touched a value it is no longer the model's reading.
      extractionSource: parsed.data.fields ? 'citizen-confirmed' : doc.extractionSource
    };
  });
  if (!documents.some((doc) => doc.id === req.params.docId)) return bad(res, 'No such document in this case.', 404);
  ok(res, { case: updateCase(req.params.caseId, { documents }) });
});

app.delete('/api/cases/:caseId/documents/:docId', withCase, (req, res) => {
  const documents = req.caseData.documents.filter((doc) => doc.id !== req.params.docId);
  ok(res, { case: updateCase(req.params.caseId, { documents }) });
});

app.post('/api/documents/classify', (req, res) => {
  const parsed = z.object({ fileName: z.string().trim().min(1).max(200) }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Give a file name.');
  const classification = classifyByFileName(parsed.data.fileName);
  ok(res, { classification, fields: fieldTemplate(classification.kind) });
});

/* ------------------------------------------------------------------ *
 * The pre-flight check
 * ------------------------------------------------------------------ */

function runCheck(caseData) {
  const evaluation = withPassVerdict(evaluateCase(caseData, {
    language: caseData.language || 'en',
    today: caseNow(caseData)
  }));
  return evaluation;
}

app.post('/api/cases/:caseId/check', withCase, (req, res) => {
  const evaluation = runCheck(req.caseData);
  ok(res, { case: updateCase(req.params.caseId, { lastEvaluation: evaluation }), evaluation });
});

/* ------------------------------------------------------------------ *
 * Submission and the clock
 * ------------------------------------------------------------------ */

app.post('/api/cases/:caseId/submit', withCase, (req, res) => {
  const parsed = z.object({
    acknowledgementNumber: z.string().trim().min(4).max(60),
    submittedAt: z.string().datetime().optional()
  }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Enter the acknowledgement number printed on the receipt you were given.');

  const evaluation = req.caseData.lastEvaluation || runCheck(req.caseData);
  if (!evaluation.submittable) {
    return bad(res, `There ${evaluation.counts.blocks === 1 ? 'is 1 blocking issue' : `are ${evaluation.counts.blocks} blocking issues`} outstanding. Fix them before you go, or you will be turned away and lose the trip.`);
  }

  const clock = attachClock({
    acknowledgementNumber: parsed.data.acknowledgementNumber,
    submittedAt: parsed.data.submittedAt || new Date().toISOString(),
    service: 'khata-transfer',
    office: req.caseData.jurisdiction?.candidates?.[0] || null
  });

  ok(res, {
    case: updateCase(req.params.caseId, { clock, demoNow: null }),
    clock,
    status: clockStatus(clock, new Date())
  });
});

app.get('/api/cases/:caseId/clock', withCase, (req, res) => {
  if (!req.caseData.clock) return bad(res, 'No acknowledgement number has been attached to this case yet.', 409);
  ok(res, { clock: req.caseData.clock, status: clockStatus(req.caseData.clock, caseNow(req.caseData)) });
});

/**
 * Time travel. A demo affordance, labelled as one everywhere it appears.
 * It moves the clock's "now", nothing else — every date the appeal letter
 * quotes is then computed from it by the same arithmetic that would run on a
 * real day.
 */
app.post('/api/cases/:caseId/demo-now', withCase, (req, res) => {
  const parsed = z.object({ now: z.string().datetime().nullable() }).safeParse(req.body || {});
  if (!parsed.success) return bad(res, 'Give an ISO timestamp, or null to return to real time.');
  const now = parsed.data.now;
  if (now) {
    const target = new Date(now);
    const floor = new Date('2026-01-01');
    const ceiling = new Date('2028-12-31');
    if (target < floor || target > ceiling) return bad(res, 'The demo clock only moves within 2026–2028.');
  }
  const caseData = updateCase(req.params.caseId, { demoNow: now });
  ok(res, {
    case: caseData,
    status: caseData.clock ? clockStatus(caseData.clock, caseNow(caseData)) : null,
    timeTravel: Boolean(now),
    disclosure: 'Time travel is a demonstration control. It changes only which date the clock is evaluated against.'
  });
});

app.post('/api/cases/:caseId/complete', withCase, (req, res) => {
  if (!req.caseData.clock) return bad(res, 'This case has no clock, so there is no outcome to record.', 409);
  if (req.caseData.outcomeRecorded) return ok(res, { alreadyRecorded: true, frictionIndex: frictionIndex() });

  const status = clockStatus(req.caseData.clock, caseNow(req.caseData));
  const office = req.caseData.clock.office;
  const row = recordOutcome({
    office: office?.office || 'Unknown office',
    corporation: office?.corporation || '',
    service: 'khata-transfer',
    days: status.elapsedDays,
    metSla: !status.breached
  });
  ok(res, {
    case: updateCase(req.params.caseId, { outcomeRecorded: true, completedAt: new Date().toISOString() }),
    contributed: row ? { office: row.office, days: row.days, metSla: row.metSla } : null,
    note: 'One anonymous row was added: office, service, days taken, and whether the statutory period was met. No name, no address, no identifier, and never an officer.',
    frictionIndex: frictionIndex()
  });
});

/* ------------------------------------------------------------------ *
 * Generated documents
 * ------------------------------------------------------------------ */

app.get('/api/cases/:caseId/packet.pdf', withCase, (req, res, next) => {
  try {
    streamPacket(res, {
      caseData: req.caseData,
      evaluation: req.caseData.lastEvaluation || runCheck(req.caseData),
      jurisdiction: req.caseData.jurisdiction,
      language: req.caseData.language
    });
  } catch (error) { next(error); }
});

app.get('/api/cases/:caseId/report.pdf', withCase, (req, res, next) => {
  try {
    streamReport(res, { caseData: req.caseData, evaluation: req.caseData.lastEvaluation || runCheck(req.caseData) });
  } catch (error) { next(error); }
});

app.get('/api/cases/:caseId/escalation/:rung.pdf', withCase, (req, res, next) => {
  try {
    if (!req.caseData.clock) return bad(res, 'No clock is attached to this case.', 409);
    const facts = escalationFacts(req.caseData.clock, req.params.rung, caseNow(req.caseData));
    streamEscalation(res, { facts, caseData: req.caseData });
  } catch (error) {
    if (/available|lapses|Unknown escalation/.test(error.message)) return bad(res, error.message, 409);
    next(error);
  }
});

/* ------------------------------------------------------------------ *
 * Static client
 * ------------------------------------------------------------------ */

const dist = path.resolve(__dirname, '../dist');
// On Vercel, static assets are served from dist/ by the CDN; this app only handles /api.
if (!process.env.VERCEL && existsSync(dist)) {
  app.use(express.static(dist, {
    setHeaders: (res, filePath) => {
      const name = path.basename(filePath);
      // Only the content-hashed bundles under /assets are safe to cache
      // forever. The service worker in particular must NEVER be immutable:
      // it is the thing that ships every future update, and a year-long
      // immutable cache on it would strand returning users on an old build.
      const hashed = /[\\/]assets[\\/]/.test(filePath) && /\.(js|css|woff2?)$/.test(name);
      if (hashed) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (name === 'sw.js') res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      else res.setHeader('Cache-Control', 'no-cache');
    }
  }));
  app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use('/api/{*splat}', (_req, res) => res.status(404).json({ error: 'No such endpoint.' }));

app.use((err, _req, res, _next) => {
  console.error('[seedha-kaam]', err);
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That image is too large. Take the photo again at a smaller size, or type the fields in yourself — it is faster on a slow connection anyway.' });
  }
  res.status(500).json({ error: 'Something went wrong on our side. Nothing about your case was lost or sent anywhere.' });
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    const mode = extractionMode();
    console.log(`Seedha Kaam listening on ${port}`);
    console.log(`  rule pack     ${RULE_PACK_VERSION} · ${RULES.length} rules · ${ledgerStats().codes} defect codes · ${LANGUAGES.length} languages`);
    console.log(`  extraction    ${mode.mode}${mode.model ? ` (${mode.model})` : ''}`);
    console.log(`  jurisdiction  ${GEO_META.corporations} corporations · ${GEO_META.localities} localities`);
  });
}

export default app;
