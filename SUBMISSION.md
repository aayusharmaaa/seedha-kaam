# Submission pack

## Project summary (246 words)

The agent wants ₹6,000. What is he actually selling?

Three things nobody told you: which of Bengaluru's five new corporations holds
your file, which document is actually wrong, and that you have had a 30-day
statutory right since 2011. All three are public; none is findable by the person
who needs them. That gap is a middleman's entire business — an information tax,
and unlike corruption it is something software can simply delete.

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

Pay a fraction of the agent's fee. The information was always yours.

---

## Two-minute video plan

### Minute 1 — as a citizen, no slides

Phone-sized viewport, network throttled and visible.

| ~sec | Beat |
|---|---|
| 0:00 | Land on the hook, which animates in as a question and then answers itself: **"The agent wants ₹6,000. What is he actually selling?"** — then the three things, one at a time. |
| 0:06 | Type **Domlur** into the hero lookup. It returns a **boundary case**: two offices, which to try first. *"That is the answer a tout charges for. It is free, before I have entered anything."* |
| 0:14 | Open Lakshmi's case. Speak the Kannada-English line: *"naanu appa house-na khata transfer maadbeku…"* The parse appears — inheritance, sale-blocked, Brookefield — with the matched cues shown. |
| 0:26 | Office resolves: Bengaluru East, Mahadevapura zone. |
| 0:32 | Run the check. **2 blocking, 1 objection, 5 worth knowing.** Tap read-aloud in Kannada. |
| 0:42 | **The line:** *"An agent would have said 'not in order' and quoted ₹6,000. Here is the rule, the two documents that disagreed, the field, and how many days to fix it."* |
| 0:52 | Scroll to **"What we deliberately did NOT flag."** *"The deed says Ramesh Murthy, the khata says M. Ramesh. A careless check calls that a mismatch and sends you to a notary. We matched them and said so."* |
| 1:00 | Fix, re-check → green. Download the packet. Enter the acknowledgement number. **30 days.** |
| 1:10 | Time-travel to day 32. Breach fires, **first appeal drafts**, second appeal explicitly withheld: *"we won't draft an escalation before the law makes it available."* Download. |

### Minute 2 — how and why, three things only

1. **The architecture line.** Rules decide, the model only reads and explains,
   because a hallucinated "your papers are fine" costs someone their leverage.
   Open **"why this answer"** — rule id, the two documents, the exact field, the
   source, and whether that source was verified.
2. **The mock boundary**, fast and plainly, pointing at `/mocks` — fourteen
   entries, each with what's real and what would replace it.
3. **The scale answer.** 47 codes × 3 languages = 141 explanations that exist in
   total, forever, so cost is flat in population. Adding a service is authoring a
   rule file. The anonymised friction index is the byproduct — by office, never by
   officer. Close on the reframe: *38% pay because it was the only way to get their
   work done. Most of what they paid for was information the state had already
   published — so we went and got it.*

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

1. **Deploy first, polish second.** Connect the repo to Render using the included
   `render.yaml`, confirm the health check at `/api/health`, then open the live
   URL in a private window on a phone.
2. **Decide on `OPENAI_API_KEY`.** With it set, uploads are read by a vision
   model. Without it, the journey still completes end to end via the
   manual-confirm path. Either way the app states which path ran. If you set it,
   spend two minutes uploading a photo of any document to check the confirm step
   reads well.
3. **Fill in `CODEX.md`** with your own session evidence. Its opening note says
   this explicitly; do not leave a claim in it you cannot point at.
