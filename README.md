# Seedha काम

**Khata transfer without a middleman.** *Sarkari kaam, seedha.*

> **We can't end bribery. So we made it cheaper :)**
>
> The ₹6,000 an agent wants is mostly not a bribe — it is the price of three
> things nobody told you: which office holds your file, which document is
> actually wrong, and when your deadline runs out. All three are public.

An independent prototype for one Bengaluru problem: transferring a property khata
after an inheritance or a purchase, without paying somebody ₹3,000–₹15,000 to be
told your papers are "not in order."

> **This is not a government service.** Every property record in it is synthetic.
> Nothing is submitted anywhere. No government portal password is ever asked for,
> stored or used. No government logo appears anywhere in it.
> Full disclosure at [`/mocks`](#the-mock-register).

---

## The problem

Forty per cent of bribes paid in India are for property registration and land —
the largest single category. But the number that matters is the next one:
**38% of people who paid say it was the only way to get their work done**, and
54% of businesses report being *forced* to pay.

Most of that money is not buying an unfair advantage. It is buying a service the
state already owes you. That is not a moral problem to be shamed away. It is a
friction problem, and friction can be engineered away.

Bengaluru sharpens it: BBMP was replaced by five city corporations, so for a lot
of addresses nobody can reliably say which office even holds their file.
Confusion is the raw material of extraction.

**Five things are hard today**, and none of them is "the website looks bad":

1. You do not know which office is yours.
2. You do not know whether your documents will be accepted.
3. "Documents not in order" is unfalsifiable to you, which is what makes it the
   perfect lever.
4. There is no clock. No consequence attaches to a file sitting on a desk.
5. An escalation right exists and is unusable, because knowing which officer,
   which format and which deadline is itself the expertise being sold.

An agent absorbs 1 through 5. This does 1 through 5 with software.

---

## What it does

| | |
|---|---|
| **Jurisdiction resolver** | Point-in-polygon over the five corporation boundaries. Within 1.5 km of a divide it returns **both** offices and which to try first, rather than a confident guess. Given away free in the hero, before you have entered anything. |
| **Compliance pre-flight** | 46 deterministic rules compare names, survey numbers, property IDs, tax-year continuity, dates, stamp duty and encumbrances across every document. Each finding names the rule, the two documents that disagreed and the exact field. |
| **Guided packet** | Cover sheet, enclosures in order, counter checklist, full evidence report — generated as PDFs you file yourself. |
| **The clock** | Your acknowledgement number attaches the statutory deadline. On breach the first appeal is drafted with correct date arithmetic; later, the second appeal and an RTI for the file's movement history. You write nothing. |
| **Three languages, spoken** | Kannada, Hindi and English. Every defect explanation can be read aloud. Voice intake accepts code-mixed speech — "naanu appa house-na khata transfer maadbeku" — with cue matching that never has to pick a language first. |
| **Friction index** | Every completed case leaves one anonymous row: office, service, days taken. By office, **never by officer**. |

---

## The architectural commitment

```
   MODEL              YOU                ENGINE                LEDGER
reads a photo  →  confirm every  →  decides,          →  turns the code into
into fields       value            deterministically      your language
                                   (46 rules)             (47 codes × 3 languages)
```

**Rules decide. The model only reads and explains.**

A hallucinated "your papers are fine" costs someone a day of work, a bus fare and
the only leverage they had. So the model is never in the decision path. It
transcribes pixels into candidate field values, every one of which is shown to
the citizen as an editable field before a single rule runs. The verdict itself
comes from a versioned rule pack, and every verdict carries a **"why this answer"**
expander showing the rule id, the documents that disagreed, the exact field, and
the source of the requirement — including when that source is marked *not traced
to a published clause*, which twelve of the forty-seven are. Two of those twelve
are **blocking**, which is the uncomfortable case: the product tells you that you
will be turned away on a ground it cannot cite, and says so in those words.

**Credentials are never the mechanism.** There is no field anywhere in this
product for a government portal password or OTP, and no code path that would
accept one. The citizen submits; we prepare and track. A product built on
credential automation or screen-scraping a government portal cannot survive its
own scale, and we are deliberately not making that mistake.

---

## Why cost is flat in population

Explanations are cached per **(defect code × language)** — 47 × 3 = **141
explanations that exist in total, forever**, no matter how many citizens use it.
There is no per-citizen generation anywhere in the verdict path. Marginal cost
per citizen is one deterministic engine call plus, optionally, one extraction.

Serving one crore people costs the same model spend as serving ten thousand.

Adding a service means **authoring a rule file**, not writing a scraper. A rule
pack declares its required documents, its consistency constraints, its statutory
period and its escalation ladder. EPF claims, caste certificates and trade
licences fit the same shape.

---

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The client proxies `/api` to the server on 3001.

```bash
npm test          # 85 engine tests: golden corpus + injected-defect corpus + ledger integrity
node scripts/smoke.mjs   # boots the server and walks the entire citizen journey over HTTP
npm run check     # both, plus a production build
```

Production:

```bash
npm run build && npm start        # serves dist + API on PORT (default 3001)
docker build -t seedha-kaam . && docker run -p 3001:3001 seedha-kaam
```

`render.yaml` is included for a one-click Render deploy. The live link opens with
no sign-in and no credentials — there is nothing to log into.

### Optional: vision extraction

Set `OPENAI_API_KEY` and uploaded photographs are read into candidate field
values by an OpenAI vision model. **With no key set the product works end to
end**: documents are classified by file name and the citizen confirms the fields
themselves. The compliance engine is byte-identical either way, and the UI states
on every document which path ran.

The manual path is not a degraded fallback we are embarrassed by. On a 2G
connection, typing six fields beats uploading a 3 MB photo, and it is the path
that works in a CSC kiosk with no connectivity budget.

---

## What works, and what is mocked

**Fully working:** the jurisdiction resolver including the contested-boundary
path; the 46-rule compliance engine with its full evidence trail; the 47-code
defect ledger in three languages; readiness scoring and the re-check loop;
transliteration-aware name matching across Kannada, Devanagari and Latin; the
Verhoeff checksum on Aadhaar-format numbers; code-mixed intake; PDF packet,
readiness report, first appeal, second appeal and RTI generation; the statutory
clock with breach detection and staged escalation availability; the friction
index; browser speech in and out; offline PWA behaviour; immediate case deletion.

**Mocked or absent:** every property record is synthetic; nothing is submitted to
any office; there is no payment flow at all; corporation boundaries are
approximate hand-drawn envelopes rather than official geometry; appeals and RTIs
are drafted and downloadable but never delivered; the time-travel control is a
labelled demo affordance; the friction index is seeded with 15 synthetic rows.

**Limitations we state before anyone asks:** compliance rules encode publicly
notified requirements, and individual offices apply discretion — the pre-flight
reduces rejection risk rather than eliminating it, and the product says so in
those words. Boundary geometry is approximate, so contested cases return two
offices rather than a confident guess. Statutory quanta drift, so every one is
stamped with a verification date and three ledger entries are explicitly marked
*not traced to a published clause*. One service, one city — generalisation is
claimed as a design property, not a demonstrated one.

### The mock register

`/mocks` in the app (and `GET /api/mocks`) lists **fourteen** entries, each with
what the prototype does instead, what is genuinely real, and what would replace
it in production. If you find something not on that list, that is a bug in the
list.

---

## Repository map

```
server/
  engine/text.js         transliteration, phonetic matching, identifier normalisation
  engine/ledger.js       47 defect codes × 3 languages, each with a cited source
  engine/compliance.js   the deterministic evaluator
  engine/clock.js        statutory periods, breach detection, escalation ladder
  rules/khata-transfer.v1.js   the rule pack — 46 rules, pure predicates
  geo/jurisdiction.js    corporation polygons, gazetteer, contested-boundary logic
  extract.js             vision extraction + the manual-confirm path
  intake.js              code-mixed cue matching
  pdf.js                 packet, report, appeals, RTI
  mocks.js               the mock register
  store.js               in-memory cases with a TTL + the anonymised friction index
src/                     React client — landing, journey, /mocks, /rulebook, /index
test/engine.test.js      the CI gate
scripts/smoke.mjs        end-to-end journey over HTTP
```

---

## API

Everything the UI does is available as JSON. Two endpoints need no case at all:

```
GET  /api/health
GET  /api/meta                     rule pack, ledger stats, languages, personas, extraction mode
GET  /api/mocks                    the mock register
GET  /api/ledger?language=kn       all 47 codes in any supported language
GET  /api/friction-index           anonymised office × service × days
POST /api/jurisdiction/lookup      { address } → office, with an explicit confidence field
```

Case-scoped: `POST /api/cases`, then `/intake`, `/jurisdiction`, `/documents`,
`/check`, `/submit`, `/clock`, `/demo-now`, `/complete`, and
`packet.pdf`, `report.pdf`, `escalation/{first-appeal|second-appeal|rti}.pdf`.
`DELETE /api/cases/:id` removes a case immediately.

---

## Privacy

A case is held in server memory for three hours and then discarded. **Nothing is
written to disk.** Closing the tab and starting again loses everything, which is
the intended behaviour. `DELETE /api/cases/:id` removes it at once. The only
thing that outlives a case is one anonymous friction-index row carrying no
identifier of any kind.

Aadhaar numbers are used only to run the public Verhoeff checksum. They are never
persisted and never transmitted onward.

---

*Not affiliated with, endorsed by, or connected to any government body.*
