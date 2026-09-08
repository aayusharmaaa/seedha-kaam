# Submission pack — Build What Moves India

> **Showcase repo:** [github.com/aayusharmaaa/seedha-kaam](https://github.com/aayusharmaaa/seedha-kaam)  
> **Live demo:** [seedha-kaam.vercel.app](https://seedha-kaam.vercel.app)  

![Seedha Kaam showcase screenshot](docs/screenshot.png)

## Project summary (242 words)

We can't end bribery. So we made it cheaper.

The agent wants ₹6,000. He is selling three things nobody told you: which of
Bengaluru's five corporations holds your file, which document is actually wrong,
and that you have had a 30-day statutory right since 2011. All three are public;
none is findable by the person who needs them. That gap is a middleman's entire
business — an information tax, and unlike corruption software can delete it.

Seedha काम deletes the tax. Speak in Kannada, Hindi or English. We resolve which
corporation you are in, and near a boundary we name both offices rather than
guess. Upload your documents and 46 deterministic rules check them against the
notified requirements, cross-matching names, survey numbers and tax continuity.
"Not in order" stops working as a pretext when you hold a report naming the rule,
the two documents that disagreed and the exact field.

Then Karnataka's deadline attaches to your acknowledgement number. On breach the
appeal drafts itself with correct date arithmetic. You write nothing. Not as fast
as paying someone, and we do not pretend otherwise — but it costs nothing.

Rules decide; the model only reads photos into fields you confirm. We never store
credentials or touch a government system — you submit, we prepare and track.

Records are synthetic; all fourteen mocks are listed at /mocks. Adding a service
means authoring a rule file, not writing a scraper.

The information was always yours.

---

## Loom script (2:00) — speak this, click this

**Thesis in one line:** *Rules decide. The model never moves a verdict. Answers are retrieved, not invented.*

### Setup before you hit record

| Item | Do this |
|---|---|
| Device | Chrome DevTools → **iPhone 12/14** (390×844), portrait |
| Network | Throttle **Slow 3G** (leave the badge visible) |
| URL | [seedha-kaam.vercel.app](https://seedha-kaam.vercel.app), hard refresh, English |
| Path | Know **Start → Lakshmi → load her documents → Run check** cold (under 40s, mute) |
| Tabs | Optional: GitHub open on `engine.js` / `measure.js` / `assistant.js` for a 2-second flash |
| Audio | Mic close; never narrate chrome (“now I click next”) |
| Face cam | Optional on the hook (0:00–0:05) and the close (1:52–2:00); screen-only in between |

### The three proofs (minute 2)

| Proof | Code | Commit |
|---|---|---|
| Engine on the phone | [`src/engine.js`](https://github.com/aayusharmaaa/seedha-kaam/blob/master/src/engine.js) | [`636165e`](https://github.com/aayusharmaaa/seedha-kaam/commit/636165e) |
| Pixels, not model opinion | [`src/measure.js`](https://github.com/aayusharmaaa/seedha-kaam/blob/master/src/measure.js) | same commit |
| Ask cannot invent | [`src/assistant.js`](https://github.com/aayusharmaaa/seedha-kaam/blob/master/src/assistant.js) | [`7b00ca0`](https://github.com/aayusharmaaa/seedha-kaam/commit/7b00ca0) |

---

### Minute 1 — what problem, then the product in action (0:00–1:00)

| Time | On screen | Say (almost verbatim) |
|---|---|---|
| **0:00–0:08** | Landing. Hold the hook. Don’t scroll. | **“We can’t end bribery. So we made it cheaper.”** Beat. “In Bengaluru, transferring a property khata, an agent quotes six thousand. Most of that isn’t a bribe — it’s the price of three public facts: which office holds your file, which document is actually wrong, and when your legal deadline runs out.” |
| **0:08–0:18** | Hero → type **Domlur** → contested boundary, two offices. | “I type one locality. We refuse to guess. Two corporations, which to try first. That answer is what a tout sells. Free — before I’ve uploaded anything.” |
| **0:18–0:30** | **Start → Lakshmi**. Intake: *naanu appa house-na khata transfer maadbeku…* Show parse. | “Lakshmi. Father died. She needs the khata in her name so she can sell. She speaks how people speak — two languages in one sentence. Offline cues catch it. No chatbot deciding her case.” |
| **0:30–0:42** | Fast: office → documents → **Load Lakshmi’s documents** → **Run the check**. | “Office resolved. Papers in. Forty-six deterministic rules. Not a language model writing ‘looks fine.’” |
| **0:42–0:54** | Open one **blocking** finding: code, why, two docs, field, days to fix. | **“An agent says: documents not in order — pay six thousand.”** Cursor on the finding. “We say: this rule, these two documents, this field, this many days to fix. ‘Not in order’ dies when you can name it.” |
| **0:54–1:00** | **What we did not flag** (Ramesh Murthy / M. Ramesh). Freeze. | “Deed says Ramesh Murthy. Khata says M. Ramesh. A careless checker sends her to a notary. We matched them and said so. That’s the product. Minute two is why you can trust it.” |

Do **not** open Ask, the packet, or the clock in minute one. Save the architecture for minute two.

---

### Minute 2 — one feature, three proofs (1:00–2:00)

**The feature (singular):** the decision path — *rules decide; nothing generative touches a verdict.*

These three improvements are receipts for that one claim. Stay on the **check** step (Ask only appears here).

#### Beat A — The engine runs on your phone (1:00–1:20)

| Time | On screen | Say |
|---|---|---|
| **1:00–1:06** | Check page. Network badge visible. After findings are up, flip **Airplane mode** or DevTools → Offline. | “Minute two — one commitment. The rule pack never needed a server. No filesystem, no network, no Node builtins. We were still shipping her documents off the phone to check them. That was wrong.” |
| **1:06–1:14** | Re-run check offline, or show findings unchanged. Same codes. | “Same modules now load in the browser — about thirty-one kilobytes, static import on purpose. Lazy-loading would destroy the one moment this exists for: **no signal**. Cut the network. Same verdict. Same defect codes. Her papers never left the phone to learn if a khata extract is stale.” |
| **1:14–1:20** | Optional 2s: flash [`src/engine.js`](https://github.com/aayusharmaaa/seedha-kaam/blob/master/src/engine.js), then back. | “The server can still re-check before a clock attaches. The phone makes it fast and private. It does not make the browser the authority.” |

#### Beat B — We stopped asking a model to judge blur (1:20–1:38)

| Time | On screen | Say |
|---|---|---|
| **1:20–1:28** | Open **Why this answer** on a format / legibility finding if present; otherwise keep cursor on findings and speak. | “Three rules need physical quality. FMT-05 wants legibility below point six — a number and a threshold. Nothing produced the number, so we asked a vision model to *decide* if a scan was readable. That was the one place a model’s opinion could move a verdict — while we promised the opposite.” |
| **1:28–1:38** | Speak the numbers; optional flash [`src/measure.js`](https://github.com/aayusharmaaa/seedha-kaam/blob/master/src/measure.js). | “Pixels do it now, on the device: Laplacian variance, face detection, border deviation, ink density. **The rule pack did not change.** In the browser, a four-pixel blur scores zero-point-one-one-one and fails. One-and-a-half pixels scores zero-point-six-seven-four and passes. Ambiguous measurements return undefined — and undefined fires **no** rule. Reticence is the feature.” |

#### Beat C — An Ask button that cannot invent answers (1:38–1:52)

| Time | On screen | Say |
|---|---|---|
| **1:38–1:42** | Tap **Ask**. Chips visible. | “Last proof. A chat box next to a verdict is the most dangerous place for a language model in this product. So Ask does not compose.” |
| **1:42–1:50** | Chip **What is wrong?** → reply + cite. Then **How many days does the office have?** → Sakala / 30 days. | “Type or speak — Kannada, Hindi, English. Every sentence is pulled from the ledger, the engine, the office resolver, or the clock. A model may help understand the *question*. The *answer* is always retrieved. A test strips every known fragment out of each reply and asserts **no word survives**.” |
| **1:50–1:52** | One beat on Ask. | “Building this found five bugs. Four were Indic: letter-class regex skips combining marks, so Kannada shattered at every matra. English worked. The languages this product exists for didn’t — until we fixed that.” |

#### Close (1:52–2:00)

| Time | On screen | Say |
|---|---|---|
| **1:52–2:00** | Close Ask. Freeze on check findings, or cut to landing hook. Face cam OK. | “So: engine on the phone. Pixels measured, not judged. Answers retrieved, never invented. Thirty-eight percent who paid said it was the only way to get work done. Most of what they bought was information the state had already published. We went and got it — without letting a model fake the verdict. Seedha kaam.” |

---

### Full spoken draft (teleprompter)

*Paste into notes if you prefer continuous prose.*

**Minute 1.** We can’t end bribery. So we made it cheaper. In Bengaluru, an agent quotes six thousand for a khata transfer. Most of that isn’t a bribe — it’s three public facts: which office, which document is wrong, when the deadline runs out. Watch — Domlur. We refuse to guess: two offices, which to try first. That’s what a tout sells. Free. Lakshmi’s father died; she needs the khata to sell. She speaks Kannada and English in one sentence; offline cues catch it. Office resolved, papers in, forty-six rules — not a model saying looks fine. An agent says documents not in order, pay six thousand. We say: this rule, these two documents, this field, this many days. Deed says Ramesh Murthy, khata says M. Ramesh — we matched them on purpose. That’s the product. Minute two is why you can trust it.

**Minute 2.** One commitment. The rule pack never needed a server — we were still shipping documents off the phone. Wrong. Same modules in the browser, thirty-one kilobytes, static on purpose. Cut the network: same verdict, same codes. Papers never left the phone. FMT-05 wanted a legibility number; we had asked a vision model to judge blur — the one place a model could move a verdict. Pixels now: Laplacian, face, border, ink. Four-pixel blur fails at point one one one; one-and-a-half passes at point six seven four. Undefined fires no rule. Ask does not compose — every answer from the ledger, engine, resolver, or clock. Test proves no leftover words. Indic matching was broken at every matra; we fixed that. Engine on the phone. Pixels measured. Answers retrieved. Most of what people paid for was information the state had already published. We got it — without faking the verdict. Seedha kaam.

---

### Rehearsal checklist

1. Lakshmi → check in under **40 seconds**, silent.
2. Offline after findings load — same codes still visible.
3. Ask → “What is wrong?” and “How many days does the office have?” — citations show.
4. If over 2:00, cut code-tab flashes and the Indic-bugs line first. Never cut Domlur or “not in order.”

### What not to do

- Don’t pitch minute two as “three features.” It’s **one** feature (decision integrity) with three receipts.
- Don’t say “AI-powered.” Say **deterministic rules**, **measured pixels**, **retrieved answers**.
- Don’t open Ask off the check step — it isn’t there.
- Don’t invent a government fee number on camera.
- Synthetic data: only if asked — “Every record is synthetic; fourteen mocks are listed in the app.”

### Backup line if you freeze

> “We put the compliance engine on the phone, we stopped letting a model judge blur, and we built an Ask button that can only quote the rulebook — because a hallucinated ‘you’re fine’ costs someone their only leverage.”

---

## Reviewer checklist

- [ ] Live link opens in an **incognito window** with no sign-in prompt.
- [ ] No login credentials are needed. There is nothing to log into.
- [ ] `npm test` → 85 pass. `node scripts/smoke.mjs` → 42 checks pass.
- [ ] `/mocks` renders 14 entries.
- [ ] `/rulebook` renders 47 codes; switching to ಕನ್ನಡ re-renders all of them.
- [ ] Journey walks start to finish at 320px with no horizontal scroll.
- [ ] Partner's registered email filled in (or left blank if solo).

## Things to verify before you submit

1. **Deploy first, polish second.** Confirm the live URL in a private window on a phone.
2. **`OPENAI_API_KEY`** is optional. Manual confirm path works without it; vision is fallback only.
3. **Fill in `CODEX.md`** with your own session evidence. Do not leave a claim you cannot point at.
