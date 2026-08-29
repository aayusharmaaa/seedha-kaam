/**
 * Bundled demo metadata so the landing page works even when /api/meta is slow,
 * blocked by a stale service worker, or unavailable (e.g. static preview).
 */
export const FALLBACK_META = {
  rulePack: 'khata-transfer@1.4.0',
  ruleCount: 46,
  ledger: { codes: 47, unverifiedCitations: 12 },
  personas: [
    {
      id: 'lakshmi',
      name: 'Lakshmi Ramesh',
      initial: 'ಲ',
      headline: 'Inherited her father\'s house. Cannot sell it until the khata moves to her name.',
      quotedByAgent: 6000,
      resolvableByPaperwork: true
    },
    {
      id: 'imran',
      name: 'Imran Basha',
      initial: 'ಇ',
      headline: 'Bought a flat in May. His bank will not release the loan until the khata is in his name.',
      quotedByAgent: 15000,
      resolvableByPaperwork: true
    },
    {
      id: 'sarala',
      name: 'Sarala Bai',
      initial: 'ಸ',
      headline: 'A 1996 deed that was never registered. The hard case — and the one where telling the truth matters most.',
      quotedByAgent: 25000,
      resolvableByPaperwork: false
    }
  ]
};
