# How this was built with an AI coding agent

> **Attribution note for the submitter.** This file records the *engineering
> loops* that actually produced this repository and the concrete before/after
> results of each one. Before submitting, add your own session links or IDs from
> the tool you drove the build with, and correct anything here that does not
> match your own record. Do not leave a claim in this file that you cannot
> point at evidence for — the entire product argues that unverifiable claims are
> the problem, and this file is not exempt from that.

The useful thing to say about agentic development on a project like this is not
"an agent wrote the code." It is **which loops were worth running agentically,
and what each one caught.** Four were.

---

## Loop 1 — Rule-pack authoring

**The loop.** Feed the published document checklist for the service. The agent
drafts candidate rules as structured predicates with a `citation` field naming
the source. A human verifies each citation. Anything that cannot be traced to a
published clause is marked `verified: false` rather than dropped or quietly
asserted.

**Result.** 43 rule definitions in
[`server/rules/khata-transfer.v1.js`](server/rules/khata-transfer.v1.js)
(46 rules once the presence-check family is expanded at module load), emitting
47 defect codes in [`server/engine/ledger.js`](server/engine/ledger.js).

**What verification changed.** **Twelve of the 47 codes** carry
`verified: false` — `DOC-06`, `DOC-10`, `NAME-04`, `FMT-06`, `FMT-08`, `ENC-01`,
`ENC-02`, `ENC-03`, `DATE-02`, `DATE-03`, `DATE-04`, `KYC-02`. These are real
counter practice — the encumbrance certificate, the passport photograph and its
specification, the twelve-month freshness convention on a khata extract, the
release of a registered mortgage — that we could not trace to a notified clause.

Two of them (`ENC-01`, `ENC-03`) are **blocking**, which is the uncomfortable
case: the product tells a citizen they will be turned away on a ground it cannot
cite. It says exactly that, in those words, in the "why this answer" panel. The
landing page prints the count as a headline number rather than burying it, and
the disclosure is asserted in CI:

```js
test('every ledger entry declares a severity, a source and a verification date')
```

**The separation that made the loop work.** Rules are pure predicates that
return a defect *code* plus an evidence object. They contain no prose at all.
Prose lives in the ledger, keyed on `(code × language)`. So authoring a rule and
translating a rule became two independent jobs, and neither blocks the other.

---

## Loop 2 — The eval harness, and the three bugs it caught

**The loop.** A synthetic corpus of complete document sets, a golden test
pinning every persona to an exact set of defect codes, and an
**injected-defect corpus**: start from a set that passes cleanly, break exactly
one thing, assert that exactly the expected code fires and *nothing else moves*.

[`test/engine.test.js`](test/engine.test.js) — **85 tests**, of which 32 are
single-defect injections. [`scripts/smoke.mjs`](scripts/smoke.mjs) walks the
entire citizen journey over HTTP — **42 checks**. Both gate CI.

**Before/after.** The first full run of the harness against a rule pack that
looked finished produced **79 passing, 4 failing**. Three of the four failures
were real defects in the engine, not wrong expectations:

| Failure | The actual bug | Why it mattered |
|---|---|---|
| `an empty field is "unknown", never a match` | `String(null)` is the string `"null"`. A missing name field was being tokenised as the *word* "null" and compared against a real name. | The engine invented a **blocking** `NAME` defect out of a field that simply was not there. A citizen would have been sent to a notary for an affidavit reconciling a name with the word "null". |
| `injected: khata has no PID` — expected `ID-04`, got nothing | Same root cause in `normalizePid`: `normalizePid(null)` returned `"NULL"`, which is truthy, so the "khata carries no property ID" rule silently passed. | The opposite and worse failure: a **false clean bill of health** on a document that was missing the one field the office uses to link the file to the tax record. |
| `name matching: works across scripts` | Kannada long-*e* (`ೇ`) was romanised `"ee"`, and the phonetic normaliser reads `"ee"` the English way and folds it to `"i"`. `ರಮೇಶ್` became `ramis`; the Latin `Ramesh` became `rames`. | The same name in Kannada script on one document and Latin on another was reported as a **mismatch between two different people**. |

The fourth failure was a wrong expectation in the test, and was corrected in the
test rather than in the engine — which is exactly why the two have to be
distinguishable.

Two further defects were caught by the golden corpus in the same session:

- **A purchase was being flagged for the khata standing in the seller's name.**
  `NAME-01` compared the deed's owner against the khata's owner unconditionally.
  For a sale that is backwards: the khata being in the seller's name is the
  entire reason the citizen is there. Every honest buyer would have received a
  blocking defect. Fixed by making the rule variant-aware, and pinned by
  `test('a purchase is not flagged for the khata standing in the seller\'s name')`.

- **A readiness score of 92% next to two blocking defects.** A severity-weighted
  pass rate over 46 rules barely moves when two fail, so the citizen saw "92%"
  and read "nearly there" when they were going to be turned away at the counter.
  Fixed by confining the score to a band chosen by the worst outstanding
  severity, and by making the UI lead with the blocker count rather than the
  percentage. Pinned by
  `test('score bands never let a blocked case look nearly ready')`.

**Why this loop earns its place.** Every one of those five is a wrong answer that
would have looked completely plausible on screen. None would have been caught by
clicking through the demo.

---

## Loop 3 — The consistency graph

**The loop.** Cross-document field extraction and fuzzy name matching, built
agentically and then hardened against the failure cases the tests surfaced.

The substance is in [`server/engine/text.js`](server/engine/text.js). Two
decisions there came directly out of test failures rather than out of design:

1. **An initial may only stand for a full name-word if something else already
   matched.** `"M. Ramesh"` vs `"Ramesh Murthy"` has *ramesh* in common, so
   M↔Murthy is credible evidence. `"M. Ramesh"` vs `"Muniyappa"` has nothing in
   common, and letting M↔Muniyappa count merged a grandfather with his son on the
   strength of one letter.

2. **A bridged match is `probable`, not `match`.** Verdicts are three-valued
   deliberately. `probable` means *the same person in all likelihood, but written
   differently enough that a clerk may query it* — so the citizen gets a warning
   to carry one ID, not a blocking defect and a trip to a notary. The demo
   persona's `NAME-07` advisory is exactly this case, and the app labels it
   **"what we deliberately did NOT flag."**

---

## Loop 4 — Infrastructure

Service worker and offline behaviour, the PWA manifest, three-language string
extraction, browser speech in and out, PDF generation for the packet, the
readiness report and three escalation letters, the Docker image and the CI
workflow.

One thing here is worth naming because it changed a test from cosmetic to real:
PDFKit compresses its content stream, so a test could only assert on *byte
count* — which passes even if the letter says nothing. Adding a
`PDF_NO_COMPRESS` switch (off in production, on in CI) made the generated text
readable, so CI now asserts that the appeal actually quotes the acknowledgement
number, states the correct number of days overdue, names a **role rather than an
individual officer**, and says it has not been sent.

---

## Human decisions that were never delegated

- **A model never makes a compliance verdict.** It reads pixels into candidate
  field values; the citizen confirms every one; a deterministic rule decides.
  This is enforced by the code structure, not by a prompt.
- **No government portal credential is ever collected.** There is no field for
  one and no code path that would accept one.
- **Nothing is submitted anywhere.** The citizen files; we prepare and track.
- **The friction index aggregates by office and never names an officer.**
  Statistics about a service at an office are actionable by a vigilance
  department. An unverified allegation about a person is not, and that is what
  caused earlier bribe-reporting platforms to plateau into unusable heat maps.
- **Unverifiable requirements are labelled unverifiable** rather than being
  dropped (which would under-warn the citizen) or asserted (which would lie).
- **The hard persona ships.** Sarala's 1996 deed was never registered, and no
  amount of document preparation changes that. The app says so and points at
  free legal aid. A product that only ever shows the happy path is a slideshow.

---

## The next loop

Author each remaining service as a versioned rule pack with citations, and
require 100% on its golden corpus before merge. The engine, the ledger shape,
the clock, the packet generator and the escalation ladder are all service-agnostic
already — the work of adding EPF claims or a caste certificate is writing one
data file and one corpus, not touching any of the machinery above.
