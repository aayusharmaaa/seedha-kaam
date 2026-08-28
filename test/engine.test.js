/**
 * The CI gate.
 *
 * Three kinds of test, in increasing order of how much they would have saved us:
 *
 *  1. unit tests on the matcher, because the name comparison is where a wrong
 *     answer costs a citizen a trip to a notary they do not need
 *  2. a GOLDEN CORPUS — every persona, as supplied and corrected, pinned to an
 *     exact set of defect codes. If a rule change alters any verdict, this
 *     fails and you have to look at it.
 *  3. an INJECTED-DEFECT CORPUS — start from a document set that passes
 *     cleanly, break exactly one thing, and assert that exactly the expected
 *     code fires and nothing else changes. This is the test that catches a
 *     rule which "works" by accident because two rules overlap.
 *
 * Plus a ledger integrity check, which is the one that stops a defect code from
 * ever reaching a citizen in a language it was never translated into.
 *
 * Run: npm test
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compareNames, phoneticKey, normalizeSurveyNumber, normalizePid,
  normalizeFinancialYear, expectedFinancialYears, splitRelation, transliterate
} from '../server/engine/text.js';
import { isValidAadhaarFormat, RULES, VARIANTS } from '../server/rules/khata-transfer.v1.js';
import { evaluateCase, withPassVerdict } from '../server/engine/compliance.js';
import { DEFECTS, LANGUAGES, explain, ledgerStats } from '../server/engine/ledger.js';
import { buildPersonaCase, PERSONA_IDS } from '../server/fixtures.js';
import { resolveJurisdiction, pointInPolygon, CORPORATIONS, GAZETTEER } from '../server/geo/jurisdiction.js';
import { attachClock, clockStatus, escalationFacts, addDays } from '../server/engine/clock.js';
import { parseIntakeDeterministic } from '../server/intake.js';
import { classifyByFileName, coerceFields, fieldTemplate } from '../server/extract.js';

const TODAY = new Date('2026-08-28T09:00:00+05:30');
const codes = (result) => result.findings.map((f) => f.code).sort();
const run = (caseData) => evaluateCase(caseData, { today: TODAY });

/* ================================================================== *
 * 1 · Name matching
 * ================================================================== */

test('name matching: an initial stands for a full name-word when something else matched', () => {
  const result = compareNames('Ramesh Murthy', 'M. Ramesh');
  assert.notEqual(result.verdict, 'mismatch', 'these are the same person and must not be flagged');
  assert.equal(result.verdict, 'probable', 'bridged by an initial, so it is probable rather than exact');
});

test('name matching: an initial alone is NOT evidence of a match', () => {
  // The failure this guards against: "M." matching "Muniyappa" on one letter,
  // silently merging a grandfather with a son.
  assert.equal(compareNames('M. Ramesh', 'Muniyappa').verdict, 'mismatch');
  assert.equal(compareNames('S. Kumar', 'Srinivasappa').verdict, 'mismatch');
});

test('name matching: romanisation variants of the same Kannada name collapse', () => {
  for (const [a, b] of [
    ['Murthy', 'Moorthy'], ['Murthy', 'Murthi'],
    ['Lakshmi', 'Laxmi'], ['Lakshmi', 'Lakshmee'],
    ['Krishnappa', 'Krishnapa'], ['Venkatesh', 'Venkatesha'],
    ['Ramesha', 'Ramesh'], ['Shivakumar', 'Sivakumar']
  ]) {
    assert.equal(compareNames(a, b).verdict, 'match', `${a} vs ${b} should be the same person`);
  }
});

test('name matching: genuinely different people are still mismatches', () => {
  for (const [a, b] of [
    ['Ramesh Murthy', 'Prakash Nayak'],
    ['Lakshmi Ramesh', 'Suresh Kumar'],
    ['Imran Basha', 'Prakash Nayak']
  ]) {
    assert.equal(compareNames(a, b).verdict, 'mismatch', `${a} vs ${b} must not match`);
  }
});

test('name matching: honorifics and relationship suffixes are stripped', () => {
  assert.equal(compareNames('Sri. Ramesh Murthy S/o Muniyappa', 'Ramesh Murthy').verdict, 'match');
  assert.equal(compareNames('Smt. Lakshmi Ramesh', 'Lakshmi Ramesh').verdict, 'match');
  assert.equal(splitRelation('Ramesh Murthy S/o Muniyappa').relation, 'Muniyappa');
});

test('name matching: works across scripts', () => {
  assert.equal(transliterate('ರಮೇಶ್'), 'ramesh');
  assert.equal(transliterate('ಕೃಷ್ಣಪ್ಪ'), 'krishnappa');
  assert.equal(compareNames('ರಮೇಶ್', 'Ramesh').verdict, 'match');
  assert.equal(compareNames('रमेश', 'Ramesh').verdict, 'match');
});

test('name matching: an empty field is "unknown", never a match', () => {
  assert.equal(compareNames('', 'Ramesh').verdict, 'unknown');
  assert.equal(compareNames('Ramesh', null).verdict, 'unknown');
});

test('a missing field never produces a confident mismatch', () => {
  // String(null) is "null". Comparing that against a real name used to yield a
  // blocking NAME defect invented entirely out of an absent value.
  for (const empty of [null, undefined, '', '   ']) {
    assert.equal(compareNames('Ramesh Murthy', empty).verdict, 'unknown', String(empty));
    assert.equal(compareNames(empty, 'Ramesh Murthy').verdict, 'unknown', String(empty));
  }
  assert.equal(normalizePid(null), '');
  assert.equal(normalizeSurveyNumber(undefined), '');
  assert.equal(normalizeFinancialYear(null), '');
});

test('phonetic key is stable and order-free', () => {
  assert.equal(phoneticKey('Moorthy'), phoneticKey('Murthy'));
  assert.equal(phoneticKey('LAXMI'), phoneticKey('lakshmi'));
});

/* ================================================================== *
 * 2 · Identifiers, years, checksums
 * ================================================================== */

test('survey numbers normalise across the ways clerks write them', () => {
  const forms = ['Sy. No. 42/3', 'Survey No 42-3', '42/3', 'SY NO. 042/03', 'Sy.No.42/3'];
  const normalised = forms.map(normalizeSurveyNumber);
  assert.deepEqual([...new Set(normalised)], ['42/3'], `got ${JSON.stringify(normalised)}`);
});

test('survey number normalisation does not eat letters inside the value', () => {
  assert.equal(normalizeSurveyNumber('42/3s'), '42/3s');
});

test('PIDs normalise across separators', () => {
  assert.equal(normalizePid('84-12-345'), normalizePid('84/12/345'));
  assert.equal(normalizePid('84 12 345'), '8412345');
});

test('financial years normalise', () => {
  for (const form of ['2019-20', '2019-2020', 'FY 2019-20', '2019/20']) {
    assert.equal(normalizeFinancialYear(form), '2019-20', form);
  }
  assert.deepEqual(expectedFinancialYears(2025, 3), ['2023-24', '2024-25', '2025-26']);
});

test('Aadhaar format check runs the real Verhoeff algorithm', () => {
  assert.equal(isValidAadhaarFormat('234567890124'), true);
  assert.equal(isValidAadhaarFormat('765432109878'), true);
  assert.equal(isValidAadhaarFormat('234567890123'), false, 'wrong check digit must fail');
  assert.equal(isValidAadhaarFormat('123456789012'), false, 'must not start with 0 or 1');
  assert.equal(isValidAadhaarFormat('23456789012'), false, 'must be twelve digits');
});

/* ================================================================== *
 * 3 · Golden corpus
 * ================================================================== */

const GOLDEN = {
  'lakshmi/as-supplied': {
    persona: 'lakshmi', corrected: false,
    verdict: 'will-be-refused', submittable: false,
    codes: ['DATE-02', 'DATE-04', 'FMT-07', 'INH-02', 'KYC-02', 'NAME-04', 'NAME-07', 'TAX-01']
  },
  'lakshmi/corrected': {
    persona: 'lakshmi', corrected: true,
    verdict: 'ready', submittable: true,
    codes: ['DATE-04', 'INH-02', 'KYC-02', 'NAME-04', 'NAME-07', 'TAX-04']
  },
  'imran/as-supplied': {
    persona: 'imran', corrected: false,
    verdict: 'will-be-refused', submittable: false,
    codes: ['DOC-09', 'ENC-01', 'FMT-01', 'ID-01', 'TAX-03']
  },
  'imran/corrected': {
    persona: 'imran', corrected: true,
    verdict: 'ready', submittable: true,
    codes: []
  },
  'sarala/as-supplied': {
    persona: 'sarala', corrected: false,
    verdict: 'will-be-refused', submittable: false,
    codes: ['DATE-02', 'DOC-03', 'DOC-05', 'DOC-06', 'DOC-08', 'DOC-10', 'FMT-02', 'FMT-04', 'FMT-05', 'FMT-08', 'ID-04', 'INH-01', 'NAME-05']
  }
};

for (const [name, expected] of Object.entries(GOLDEN)) {
  test(`golden: ${name}`, () => {
    const result = run(buildPersonaCase(expected.persona, { corrected: expected.corrected }));
    assert.deepEqual(result.engineErrors, [], 'no rule may throw');
    assert.deepEqual(codes(result), expected.codes.sort());
    assert.equal(result.verdict, expected.verdict);
    assert.equal(result.submittable, expected.submittable);
  });
}

test('golden: the positive verdict is itself a code with an evidence trail', () => {
  const clean = buildPersonaCase('imran', { corrected: true });
  const result = withPassVerdict(run(clean));
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].code, 'PASS-01');
  assert.ok(result.findings[0].evidence.comparison.includes('0 failures'));
});

test('golden: the engine is deterministic', () => {
  const caseData = buildPersonaCase('lakshmi');
  const a = run(caseData);
  const b = run(caseData);
  assert.deepEqual(codes(a), codes(b));
  assert.equal(a.score, b.score);
});

test('golden: score bands never let a blocked case look nearly ready', () => {
  for (const id of PERSONA_IDS) {
    for (const corrected of [false, true]) {
      const result = run(buildPersonaCase(id, { corrected }));
      if (result.counts.blocks > 0) {
        assert.ok(result.score <= 55, `${id} scored ${result.score} with ${result.counts.blocks} blockers`);
      } else if (result.counts.delays === 0) {
        assert.ok(result.score >= 90, `${id} scored ${result.score} with nothing outstanding`);
      }
    }
  }
});

/* ================================================================== *
 * 4 · Injected-defect corpus
 *
 * Break exactly one thing in a clean set and assert that exactly the expected
 * code appears, and that nothing else moves.
 * ================================================================== */

const CLEAN = () => buildPersonaCase('imran', { corrected: true });
const BASELINE = codes(run(CLEAN()));

const findDoc = (caseData, kind) => caseData.documents.find((d) => d.kind === kind);

const INJECTIONS = [
  {
    name: 'missing sale deed', expect: ['DOC-01', 'NAME-05'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'sale_deed'); }
  },
  {
    name: 'missing khata extract', expect: ['DOC-02'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'khata_extract'); }
  },
  {
    name: 'no tax receipts at all', expect: ['DOC-03'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'tax_receipt'); }
  },
  {
    name: 'missing aadhaar', expect: ['DOC-04'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'aadhaar'); }
  },
  {
    name: 'missing electricity bill', expect: ['DOC-05'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'bescom_bill'); }
  },
  {
    name: 'missing encumbrance certificate', expect: ['DOC-06'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'encumbrance_certificate'); }
  },
  {
    name: 'unsigned application form', expect: ['DOC-09'],
    apply: (c) => { findDoc(c, 'application_form').fields.signed = false; }
  },
  {
    name: 'missing photograph', expect: ['DOC-10'],
    apply: (c) => { c.documents = c.documents.filter((d) => d.kind !== 'photo'); }
  },
  {
    name: 'khata stands in a stranger\'s name', expect: ['NAME-01', 'NAME-02', 'NAME-04'],
    apply: (c) => { findDoc(c, 'khata_extract').fields.ownerName = 'Ravi Shankar Gowda'; }
  },
  {
    name: 'aadhaar name is a different person', expect: ['NAME-03'],
    apply: (c) => { findDoc(c, 'aadhaar').fields.name = 'Farhan Qureshi'; }
  },
  {
    name: 'survey number typo in the khata', expect: ['ID-01'],
    apply: (c) => { findDoc(c, 'khata_extract').fields.surveyNumber = '118/8'; }
  },
  {
    name: 'tax receipts carry a different PID', expect: ['ID-02'],
    apply: (c) => { for (const d of c.documents) if (d.kind === 'tax_receipt') d.fields.pid = '999-1-111'; }
  },
  {
    // ID-02 compares the receipts' PID against the khata's. With no khata PID
    // there is nothing to compare, so only the missing-PID rule should fire —
    // an engine that also reported a "mismatch" here would be inventing one.
    name: 'khata has no PID', expect: ['ID-04'],
    apply: (c) => { findDoc(c, 'khata_extract').fields.pid = null; }
  },
  {
    name: 'extent disagrees beyond tolerance', expect: ['ID-05'],
    apply: (c) => { findDoc(c, 'khata_extract').fields.extentSqFt = 1400; }
  },
  {
    name: 'extent disagrees within rounding tolerance', expect: [],
    apply: (c) => { findDoc(c, 'khata_extract').fields.extentSqFt = 920; }
  },
  {
    name: 'a year is missing from the tax run', expect: ['TAX-01'],
    apply: (c) => { c.documents = c.documents.filter((d) => !(d.kind === 'tax_receipt' && d.fields.financialYear === '2024-25')); }
  },
  {
    name: 'newest receipt is two years stale', expect: ['TAX-01', 'TAX-02'],
    apply: (c) => { for (const d of c.documents) if (d.kind === 'tax_receipt') d.fields.financialYear = '2021-22'; }
  },
  {
    name: 'arrears outstanding', expect: ['TAX-03'],
    apply: (c) => { findDoc(c, 'tax_receipt').fields.arrears = 3200; }
  },
  {
    name: 'under-stamped deed', expect: ['FMT-01'],
    apply: (c) => { findDoc(c, 'sale_deed').fields.stampDutyPaid = 90_000; }
  },
  {
    name: 'unregistered deed', expect: ['FMT-02'],
    apply: (c) => { findDoc(c, 'sale_deed').fields.registrationNumber = null; }
  },
  {
    name: 'missing signature', expect: ['FMT-03'],
    apply: (c) => { findDoc(c, 'sale_deed').fields.signaturePresent = false; }
  },
  {
    name: 'pages missing from the deed', expect: ['FMT-04'],
    apply: (c) => { findDoc(c, 'sale_deed').fields.pageCount = 6; }
  },
  {
    name: 'illegible scan', expect: ['FMT-05'],
    apply: (c) => { findDoc(c, 'khata_extract').fields.legibility = 0.31; }
  },
  {
    name: 'photo below specification', expect: ['FMT-06'],
    apply: (c) => { findDoc(c, 'photo').fields.widthPx = 180; }
  },
  {
    name: 'oversized upload', expect: ['FMT-08'],
    apply: (c) => { findDoc(c, 'sale_deed').fileSizeBytes = 6_000_000; }
  },
  {
    name: 'subsisting mortgage on the EC', expect: ['ENC-01'],
    apply: (c) => { findDoc(c, 'encumbrance_certificate').fields.entries[1].status = 'subsisting'; }
  },
  {
    name: 'court attachment on the EC', expect: ['ENC-03'],
    apply: (c) => { findDoc(c, 'encumbrance_certificate').fields.entries.push({ type: 'attachment', date: '2025-02-11', party: 'City Civil Court O.S. 441/2025', status: 'subsisting' }); }
  },
  {
    name: 'EC stops long before today', expect: ['DATE-03'],
    apply: (c) => { findDoc(c, 'encumbrance_certificate').fields.periodTo = '2024-01-31'; }
  },
  {
    name: 'khata extract older than a year', expect: ['DATE-02'],
    apply: (c) => { findDoc(c, 'khata_extract').fields.issuedDate = '2024-11-02'; }
  },
  {
    name: 'stale electricity bill', expect: ['DATE-04'],
    apply: (c) => { findDoc(c, 'bescom_bill').fields.billMonth = '2026-01'; }
  },
  {
    name: 'invalid aadhaar checksum', expect: ['KYC-01'],
    apply: (c) => { findDoc(c, 'aadhaar').fields.number = '765432109879'; }
  },
  {
    name: 'aadhaar address elsewhere', expect: ['KYC-02'],
    apply: (c) => { findDoc(c, 'aadhaar').fields.address = '18, 5th Main, Rajajinagar, Bengaluru 560010'; }
  }
];

for (const injection of INJECTIONS) {
  test(`injected: ${injection.name}`, () => {
    const caseData = CLEAN();
    injection.apply(caseData);
    const result = run(caseData);
    assert.deepEqual(result.engineErrors, [], 'no rule may throw on a broken document');
    const expected = [...new Set([...BASELINE, ...injection.expect])].sort();
    assert.deepEqual(codes(result), expected);
  });
}

test('injected: the clean baseline really is clean', () => {
  assert.deepEqual(BASELINE, [], 'the injection base case must produce no findings at all');
});

/* ================================================================== *
 * 5 · Rule scoping
 * ================================================================== */

test('rules that do not apply are skipped, not silently passed', () => {
  const purchase = run(buildPersonaCase('imran', { corrected: true }));
  assert.ok(purchase.skippedRuleIds.includes('R-PRESENCE-05'), 'death-certificate rule must not apply to a purchase');
  assert.ok(purchase.skippedRuleIds.includes('R-PRESENCE-06'), 'heirship rule must not apply to a purchase');
  assert.ok(purchase.scoreBasis.rulesSkipped > 0);
  assert.equal(purchase.scoreBasis.rulesApplied + purchase.scoreBasis.rulesSkipped, RULES.length);
});

test('a purchase is not flagged for the khata standing in the seller\'s name', () => {
  // The khata being in the seller's name is the entire reason a buyer is here.
  // Flagging it would put a blocking defect on every honest purchase.
  const result = run(buildPersonaCase('imran', { corrected: true }));
  assert.ok(!codes(result).includes('NAME-01'));
});

test('an inheritance IS flagged when the deed and khata name different owners', () => {
  const caseData = buildPersonaCase('lakshmi', { corrected: true });
  findDoc(caseData, 'khata_extract').fields.ownerName = 'Devaraj Gowda';
  assert.ok(codes(run(caseData)).includes('NAME-01'));
});

/* ================================================================== *
 * 6 · Ledger integrity
 * ================================================================== */

test('every code a rule can emit exists in the ledger', () => {
  for (const rule of RULES) {
    assert.ok(DEFECTS[rule.code], `rule ${rule.id} emits ${rule.code}, which is not in the ledger`);
  }
});

test('every ledger entry is complete in every language', () => {
  for (const [code, entry] of Object.entries(DEFECTS)) {
    for (const { code: lang } of LANGUAGES) {
      const text = entry.text[lang];
      assert.ok(text, `${code} has no ${lang} text`);
      for (const field of ['title', 'why', 'fix', 'owner', 'where']) {
        assert.ok(typeof text[field] === 'string' && text[field].trim().length > 0, `${code}.${lang}.${field} is empty`);
      }
    }
  }
});

test('every ledger entry declares a severity, a source and a verification date', () => {
  for (const [code, entry] of Object.entries(DEFECTS)) {
    assert.ok(['blocks', 'delays', 'advisory'].includes(entry.severity), `${code} severity`);
    assert.ok(entry.citation?.source, `${code} citation`);
    assert.match(entry.citation.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${code} lastVerified`);
    assert.equal(typeof entry.citation.verified, 'boolean', `${code} must state whether the source was verified`);
    assert.equal(typeof entry.expectedDays, 'number', `${code} expectedDays`);
  }
});

test('non-English explanations are actually translated, not English copies', () => {
  for (const code of Object.keys(DEFECTS)) {
    const en = explain(code, 'en');
    for (const lang of ['kn', 'hi']) {
      assert.notEqual(explain(code, lang).title, en.title, `${code} ${lang} title is still English`);
    }
  }
});

test('an unknown code degrades to a safe, non-reassuring message', () => {
  const unknown = explain('NOT-A-CODE', 'en');
  assert.match(unknown.title, /Unknown check/);
  assert.match(unknown.why, /bug/);
});

test('ledger stats are consistent', () => {
  const stats = ledgerStats();
  assert.equal(stats.totalExplanations, stats.codes * stats.languages);
  assert.equal(stats.verifiedCitations + stats.unverifiedCitations, stats.codes);
});

/* ================================================================== *
 * 7 · Jurisdiction
 * ================================================================== */

test('jurisdiction: an interior address resolves to one corporation', () => {
  const result = resolveJurisdiction({ address: '42, Brookefield Main Road, Bengaluru' });
  assert.equal(result.confidence, 'resolved');
  assert.equal(result.candidates.length, 1);
  assert.match(result.candidates[0].corporation, /East/);
  assert.match(result.candidates[0].zone, /Mahadevapura/);
});

test('jurisdiction: an address near a divide returns two offices, not a guess', () => {
  const result = resolveJurisdiction({ address: '7, Amarjyoti Layout, Domlur' });
  assert.equal(result.confidence, 'contested');
  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0].note, 'try first');
  assert.notEqual(result.candidates[0].corporationId, result.candidates[1].corporationId);
});

test('jurisdiction: an unplaceable address refuses to answer', () => {
  const result = resolveJurisdiction({ address: 'behind the big tree' });
  assert.equal(result.confidence, 'unresolved');
  assert.equal(result.candidates.length, 0);
  assert.ok(result.knownLocalities.length > 30, 'and says what it does know');
});

test('jurisdiction: a point outside the corporations says so', () => {
  const result = resolveJurisdiction({ lat: 12.30, lng: 76.65 });   // Mysuru
  assert.equal(result.confidence, 'outside-coverage');
  assert.match(result.nextStep, /Panchayat/);
});

test('jurisdiction: every gazetteer locality lands inside exactly one corporation', () => {
  for (const entry of GAZETTEER) {
    const hits = CORPORATIONS.filter((c) => pointInPolygon([entry.lat, entry.lng], c.polygon));
    assert.equal(hits.length, 1, `${entry.name} falls in ${hits.length} corporations`);
  }
});

test('jurisdiction: every gazetteer locality resolves to a real office', () => {
  for (const entry of GAZETTEER) {
    const result = resolveJurisdiction({ address: entry.name });
    assert.ok(['resolved', 'contested'].includes(result.confidence), `${entry.name}: ${result.confidence}`);
    assert.ok(result.candidates[0].office, `${entry.name} has no office`);
    assert.ok(result.candidates[0].zone, `${entry.name} has no zone`);
  }
});

test('jurisdiction: the five corporation polygons do not overlap', () => {
  const samples = [];
  for (let lat = 12.80; lat < 13.16; lat += 0.02) {
    for (let lng = 77.40; lng < 77.84; lng += 0.02) samples.push([lat, lng]);
  }
  for (const point of samples) {
    const hits = CORPORATIONS.filter((c) => pointInPolygon(point, c.polygon));
    assert.ok(hits.length <= 1, `point ${point} falls in ${hits.length} corporations`);
  }
});

/* ================================================================== *
 * 8 · The clock
 * ================================================================== */

const makeClock = () => attachClock({
  acknowledgementNumber: 'GBAE/MHD/2026/04821',
  submittedAt: '2026-08-28T05:00:00.000Z',
  office: { office: 'Mahadevapura zone office', corporation: 'Bengaluru East' }
});

test('clock: the deadline is the statutory period after submission', () => {
  const clock = makeClock();
  assert.equal(clock.slaDays, 30);
  assert.equal(clock.deadlineAt.slice(0, 10), '2026-09-27');
});

test('clock: counts down, then counts overdue', () => {
  const clock = makeClock();
  const day1 = clockStatus(clock, new Date('2026-08-29T09:00:00Z'));
  assert.equal(day1.breached, false);
  assert.equal(day1.state, 'running');

  const eve = clockStatus(clock, new Date('2026-09-26T09:00:00Z'));
  assert.equal(eve.state, 'due-soon');

  const after = clockStatus(clock, new Date('2026-10-04T09:00:00Z'));
  assert.equal(after.breached, true);
  assert.equal(after.daysOverdue, 7);
});

test('clock: an appeal cannot be drafted before the period lapses', () => {
  const clock = makeClock();
  assert.throws(
    () => escalationFacts(clock, 'first-appeal', new Date('2026-09-10T09:00:00Z')),
    /not available before the statutory period lapses/
  );
});

test('clock: the second appeal waits for the first appeal\'s own window', () => {
  const clock = makeClock();
  const justBreached = new Date('2026-09-29T09:00:00Z');
  assert.doesNotThrow(() => escalationFacts(clock, 'first-appeal', justBreached));
  assert.throws(() => escalationFacts(clock, 'second-appeal', justBreached), /becomes available/);
  assert.doesNotThrow(() => escalationFacts(clock, 'second-appeal', new Date('2026-10-20T09:00:00Z')));
});

test('clock: escalation facts carry arithmetic, not prose', () => {
  const facts = escalationFacts(makeClock(), 'first-appeal', new Date('2026-10-04T09:00:00Z'));
  assert.equal(facts.daysOverdue, 7);
  assert.equal(facts.slaDays, 30);
  assert.equal(facts.acknowledgementNumber, 'GBAE/MHD/2026/04821');
  assert.equal(facts.replyDueBy.slice(0, 10), addDays('2026-10-04T09:00:00Z', 15).toISOString().slice(0, 10));
});

/* ================================================================== *
 * 9 · Intake and extraction
 * ================================================================== */

test('intake: a code-mixed Kannada-English sentence is parsed offline', () => {
  const result = parseIntakeDeterministic('Sir naanu appa house-na khata transfer maadbeku. Appa theerikondru. Mane maarbeku. Brookefield alli ide.');
  assert.equal(result.service, 'khata-transfer');
  assert.equal(result.variant, 'inheritance');
  assert.equal(result.urgency, 'sale-blocked');
  assert.equal(result.locality, 'Brookefield');
  assert.equal(result.relationship, 'child-of-owner');
});

test('intake: a Hindi-English purchase sentence is parsed offline', () => {
  const result = parseIntakeDeterministic('Bhai maine May mein flat liya hai Domlur mein. Bank bol raha hai khata transfer ke baad hi loan release hoga.');
  assert.equal(result.variant, 'sale');
  assert.equal(result.urgency, 'loan-blocked');
  assert.equal(result.locality, 'Domlur');
});

test('intake: an unrelated sentence does not invent a variant', () => {
  const result = parseIntakeDeterministic('what is the weather today');
  assert.equal(result.variant, null);
  assert.equal(result.service, null);
  assert.ok(result.confidence < 0.3);
});

test('extraction: file names classify conservatively', () => {
  assert.equal(classifyByFileName('sale-deed-2004.pdf').kind, 'sale_deed');
  assert.equal(classifyByFileName('khata-extract.pdf').kind, 'khata_extract');
  assert.equal(classifyByFileName('IMG_20260828.jpg').kind, null, 'an ambiguous name must not be guessed');
});

test('extraction: every field a rule reads is offerable to a citizen on the manual path', () => {
  // If a rule reads a field the template does not declare, someone on the
  // no-vision-model path can never supply it, and the rule silently never fires.
  const declared = new Set();
  for (const kind of Object.keys(VARIANTS.inheritance.required.concat(VARIANTS.inheritance.recommended).reduce((a, k) => ({ ...a, [k]: 1 }), {}))) {
    for (const field of fieldTemplate(kind)) declared.add(`${kind}.${field.key}`);
  }
  assert.ok(declared.has('sale_deed.surveyNumber'));
  assert.ok(declared.has('khata_extract.pid'));
  assert.ok(declared.has('tax_receipt.financialYear'));
  assert.ok(declared.has('death_certificate.attested'));
});

test('extraction: confirmed values coerce to the types rules expect', () => {
  const fields = coerceFields('tax_receipt', {
    assesseeName: '  Ramesh Murthy ', pid: '84-12-345', financialYear: '2024-25',
    amountPaid: '4,820', arrears: '0'
  });
  assert.equal(fields.assesseeName, 'Ramesh Murthy');
  assert.equal(fields.amountPaid, 4820);
  assert.equal(fields.arrears, 0);
});

test('extraction: a list field accepts newline-separated text', () => {
  const fields = coerceFields('legal_heir_certificate', { deceasedName: 'X', heirs: 'Lakshmi R\nSuresh Murthy', issuedDate: '2026-01-20' });
  assert.deepEqual(fields.heirs, ['Lakshmi R', 'Suresh Murthy']);
});

/* ================================================================== *
 * 10 · Failure behaviour
 * ================================================================== */

test('a throwing rule is reported as an engine error, never as a clean bill of health', () => {
  const caseData = buildPersonaCase('imran', { corrected: true });
  // Poison a field the EC rules read, in a way that makes them throw.
  findDoc(caseData, 'encumbrance_certificate').fields.entries = { notAnArray: true };
  const result = run(caseData);
  assert.ok(result.engineErrors.length > 0, 'the failure must be surfaced');
  assert.ok(result.engineErrors.every((e) => e.ruleId && e.message));
});

test('an empty case does not claim to be ready', () => {
  const result = run({ variant: 'inheritance', applicant: { name: 'Someone' }, documents: [] });
  assert.equal(result.submittable, false);
  assert.ok(result.counts.blocks >= 4);
});
