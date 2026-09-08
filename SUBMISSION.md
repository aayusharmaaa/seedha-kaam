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
