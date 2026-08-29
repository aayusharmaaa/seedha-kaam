/**
 * SYNTHETIC CASE FIXTURES
 *
 * Every person, property, deed, receipt and number below is invented. No real
 * record was copied, transcribed or derived. The Aadhaar-format numbers are
 * sequential test values chosen only because they satisfy the public Verhoeff
 * checksum — they are not allocated to anybody, and the app never transmits
 * them anywhere.
 *
 * The fixtures exist so a reviewer with two minutes can see the engine make a
 * real decision without first having to find five property documents. Anything
 * a citizen uploads themselves goes through exactly the same engine.
 */

export const TODAY_ANCHOR = '2026-08-28';

/* ------------------------------------------------------------------ *
 * Persona 1 — Lakshmi. Inheritance. The main demo path.
 * ------------------------------------------------------------------ */

const lakshmiDocuments = (corrected) => [
  {
    id: 'doc-deed', kind: 'sale_deed', fileName: 'sale-deed-2004.pdf',
    fileSizeBytes: 840_000, extractionSource: 'fixture',
    fields: {
      ownerName: 'Ramesh Murthy',
      sellerName: 'Sri. Venkataramanappa S/o Muniyappa',
      surveyNumber: 'Sy. No. 42/3',
      pid: '84-12-345',
      extentSqFt: 1200,
      registrationNumber: 'BRK-1-00842/2004-05',
      executionDate: '2004-06-11',
      marketValue: 1_350_000,
      stampDutyPaid: 68_000,
      address: '42, Brookefield Main Road, Bengaluru 560037',
      pageCount: 14, expectedPageCount: 14,
      signaturePresent: true,
      legibility: 0.91
    }
  },
  {
    id: 'doc-khata', kind: 'khata_extract', fileName: 'khata-extract.pdf',
    fileSizeBytes: 210_000, extractionSource: 'fixture',
    fields: {
      ownerName: 'M. Ramesh',
      khataNumber: 'KH/84/1247',
      pid: '84/12/345',
      surveyNumber: '42/3',
      extentSqFt: 1200,
      // Stale in the defective set — a real and very common cause of a wasted trip.
      issuedDate: corrected ? '2026-08-04' : '2025-02-10',
      address: '42, Brookefield Main Road, Bengaluru 560037',
      pageCount: 2, expectedPageCount: 2,
      legibility: 0.88
    }
  },
  ...[
    ...(corrected ? [{ year: '2023-24', receipt: 'PT/2023/774102', paid: '2023-05-19' }] : []),
    { year: '2022-23', receipt: 'PT/2022/551903', paid: '2022-05-04' },
    { year: '2024-25', receipt: 'PT/2024/990117', paid: '2024-06-02' },
    { year: '2025-26', receipt: 'PT/2025/118844', paid: '2025-05-27' }
  ].map((entry, index) => ({
    id: `doc-tax-${index}`, kind: 'tax_receipt', fileName: `property-tax-${entry.year}.pdf`,
    fileSizeBytes: 96_000, extractionSource: 'fixture',
    fields: {
      assesseeName: 'Ramesh Murthy',
      pid: '84-12-345',
      financialYear: entry.year,
      receiptNumber: entry.receipt,
      paidDate: entry.paid,
      amountPaid: 4820,
      arrears: 0,
      legibility: 0.86
    }
  })),
  {
    id: 'doc-death', kind: 'death_certificate', fileName: 'death-certificate.jpg',
    fileSizeBytes: 1_400_000, extractionSource: 'fixture',
    fields: {
      deceasedName: 'Ramesh Murthy',
      dateOfDeath: '2025-11-02',
      registrationNumber: 'DTH/BLR/2025/44810',
      issuingAuthority: 'Registrar of Births and Deaths, Bengaluru',
      // The blocking defect in the defective set.
      attested: corrected,
      legibility: 0.74
    }
  },
  {
    id: 'doc-heir', kind: 'legal_heir_certificate', fileName: 'legal-heir-certificate.pdf',
    fileSizeBytes: 180_000, extractionSource: 'fixture',
    fields: {
      deceasedName: 'Ramesh Murthy',
      heirs: ['Lakshmi R', 'Suresh Murthy'],
      issuedDate: '2026-01-20',
      issuingAuthority: 'Tahsildar, Bengaluru East Taluk',
      attested: true,
      legibility: 0.90
    }
  },
  {
    id: 'doc-noc', kind: 'noc_affidavit', fileName: 'noc-suresh-murthy.pdf',
    fileSizeBytes: 120_000, extractionSource: 'fixture',
    fields: { fromName: 'Suresh Murthy', notarised: true, legibility: 0.89 }
  },
  {
    id: 'doc-aadhaar', kind: 'aadhaar', fileName: 'aadhaar-front.jpg',
    fileSizeBytes: 640_000, extractionSource: 'fixture',
    fields: {
      name: 'Lakshmi Ramesh',
      number: '234567890124',           // fictitious, checksum-valid only
      dob: '1979-03-22',
      address: '12, 3rd Cross, Kaggadasapura, Bengaluru 560093',
      legibility: 0.93
    }
  },
  {
    id: 'doc-bescom', kind: 'bescom_bill', fileName: 'bescom-bill.pdf',
    fileSizeBytes: 88_000, extractionSource: 'fixture',
    fields: {
      // Still in the grandfather's name — normal for an old family property,
      // and the engine must say so rather than flagging it as a problem.
      consumerName: 'Muniyappa',
      rrNumber: 'W4-BRK-118240',
      billMonth: '2026-04',
      address: '42, Brookefield Main Road, Bengaluru 560037',
      legibility: 0.83
    }
  },
  {
    id: 'doc-ec', kind: 'encumbrance_certificate', fileName: 'ec-2013-2026.pdf',
    fileSizeBytes: 320_000, extractionSource: 'fixture',
    fields: {
      periodFrom: '2013-01-01',
      periodTo: '2026-06-30',
      entries: [
        { type: 'mortgage', date: '2014-08-19', party: 'Canara Bank, Brookefield branch', status: 'released' }
      ],
      legibility: 0.79
    }
  },
  {
    id: 'doc-photo', kind: 'photo', fileName: 'passport-photo.jpg',
    fileSizeBytes: 42_000, extractionSource: 'fixture',
    fields: { widthPx: 420, heightPx: 540, faceVisible: true, plainBackground: true }
  },
  {
    id: 'doc-form', kind: 'application_form', fileName: 'transfer-application.pdf',
    fileSizeBytes: 64_000, extractionSource: 'fixture',
    fields: { signed: true }
  }
];

/* ------------------------------------------------------------------ *
 * Persona 2 — Imran. Purchase, home loan blocked pending mutation.
 * Different variant, different defects, contested boundary address.
 * ------------------------------------------------------------------ */

const imranDocuments = (corrected) => [
  {
    id: 'doc-deed', kind: 'sale_deed', fileName: 'sale-deed-2026.pdf',
    fileSizeBytes: 910_000, extractionSource: 'fixture',
    fields: {
      ownerName: 'Imran Basha',
      sellerName: 'Prakash Nayak',
      surveyNumber: 'Sy. No. 118/6',
      pid: '112-9-771',
      extentSqFt: 900,
      registrationNumber: 'DML-2-00311/2026-27',
      executionDate: '2026-05-08',
      marketValue: 9_200_000,
      // Under-stamped in the defective set: 5% of 92 lakh is 4.6 lakh.
      stampDutyPaid: corrected ? 466_000 : 210_000,
      address: '7, Amarjyoti Layout, Domlur, Bengaluru 560071',
      pageCount: 11, expectedPageCount: 11,
      signaturePresent: true,
      legibility: 0.94
    }
  },
  {
    id: 'doc-khata', kind: 'khata_extract', fileName: 'khata-extract.pdf',
    fileSizeBytes: 200_000, extractionSource: 'fixture',
    fields: {
      ownerName: 'Prakash Nayak',
      khataNumber: 'KH/112/0455',
      pid: '112-9-771',
      // Typo in the khata record: 118/6 written as 118/8. Genuinely blocking,
      // genuinely slow to fix, and exactly the kind of thing an agent "handles".
      surveyNumber: corrected ? '118/6' : '118/8',
      extentSqFt: 900,
      issuedDate: '2026-06-15',
      address: '7, Amarjyoti Layout, Domlur, Bengaluru 560071',
      legibility: 0.9
    }
  },
  ...['2023-24', '2024-25', '2025-26'].map((year, index) => ({
    id: `doc-tax-${index}`, kind: 'tax_receipt', fileName: `property-tax-${year}.pdf`,
    fileSizeBytes: 92_000, extractionSource: 'fixture',
    fields: {
      assesseeName: 'Prakash Nayak', pid: '112-9-771', financialYear: year,
      receiptNumber: `PT/${year.slice(0, 4)}/44${index}921`,
      paidDate: `${year.slice(0, 4)}-06-11`, amountPaid: 11_400,
      arrears: !corrected && index === 2 ? 2_180 : 0,
      legibility: 0.87
    }
  })),
  {
    id: 'doc-aadhaar', kind: 'aadhaar', fileName: 'aadhaar-front.jpg',
    fileSizeBytes: 610_000, extractionSource: 'fixture',
    fields: {
      name: 'Imran Basha', number: '765432109878', dob: '1991-11-30',
      address: '7, Amarjyoti Layout, Domlur, Bengaluru 560071', legibility: 0.92
    }
  },
  {
    id: 'doc-ec', kind: 'encumbrance_certificate', fileName: 'ec-2013-2026.pdf',
    fileSizeBytes: 300_000, extractionSource: 'fixture',
    fields: {
      periodFrom: '2013-04-01', periodTo: '2026-07-31',
      entries: [
        { type: 'sale', date: '2026-05-08', party: 'Prakash Nayak to Imran Basha', status: 'registered' },
        // The seller's old home loan was never released on record. The buyer's
        // own bank will not disburse until this clears.
        { type: 'mortgage', date: '2018-02-14', party: 'HDFC Bank, Indiranagar branch', status: corrected ? 'released' : 'subsisting' }
      ],
      legibility: 0.81
    }
  },
  {
    id: 'doc-bescom', kind: 'bescom_bill', fileName: 'bescom-bill.pdf',
    fileSizeBytes: 84_000, extractionSource: 'fixture',
    fields: {
      consumerName: 'Prakash Nayak', rrNumber: 'C2-DML-778120',
      billMonth: '2026-08', address: '7, Amarjyoti Layout, Domlur, Bengaluru 560071', legibility: 0.85
    }
  },
  {
    id: 'doc-photo', kind: 'photo', fileName: 'passport-photo.jpg',
    fileSizeBytes: 38_000, extractionSource: 'fixture',
    fields: { widthPx: 420, heightPx: 540, faceVisible: true, plainBackground: true }
  },
  {
    id: 'doc-form', kind: 'application_form', fileName: 'transfer-application.pdf',
    fileSizeBytes: 60_000, extractionSource: 'fixture',
    fields: { signed: corrected }
  }
];

/* ------------------------------------------------------------------ *
 * Persona 3 — Sarala. The hard case: an unresolvable-on-paper file.
 * Included on purpose. A product that only ever shows the happy path is
 * not a product, it is a slideshow.
 * ------------------------------------------------------------------ */

const saralaDocuments = () => [
  {
    id: 'doc-deed', kind: 'sale_deed', fileName: 'sale-deed-1996-scan.jpg',
    fileSizeBytes: 3_100_000, extractionSource: 'fixture',
    fields: {
      ownerName: 'Krishnappa',
      sellerName: 'Not legible',
      surveyNumber: 'Sy. No. 61/2',
      extentSqFt: 800,
      registrationNumber: null,
      executionDate: '1996-09-04',
      address: 'Site 9, Byatarayanapura, Bengaluru 560092',
      pageCount: 4, expectedPageCount: 9,
      signaturePresent: true,
      legibility: 0.41
    }
  },
  {
    id: 'doc-khata', kind: 'khata_extract', fileName: 'khata-extract-old.jpg',
    fileSizeBytes: 240_000, extractionSource: 'fixture',
    fields: {
      ownerName: 'Krishnappa', khataNumber: 'B-Register/9/0221', pid: null,
      surveyNumber: '61/2', extentSqFt: 800, issuedDate: '2019-07-12',
      address: 'Site 9, Byatarayanapura, Bengaluru 560092', legibility: 0.55
    }
  },
  {
    id: 'doc-aadhaar', kind: 'aadhaar', fileName: 'aadhaar.jpg',
    fileSizeBytes: 520_000, extractionSource: 'fixture',
    fields: { name: 'Sarala Bai', number: '765432109884', dob: '1962-01-15', address: 'Site 9, Byatarayanapura, Bengaluru 560092', legibility: 0.88 }
  },
  {
    id: 'doc-death', kind: 'death_certificate', fileName: 'death-certificate.pdf',
    fileSizeBytes: 140_000, extractionSource: 'fixture',
    fields: {
      deceasedName: 'Krishnappa', dateOfDeath: '2021-04-30',
      registrationNumber: 'DTH/BLR/2021/09912', attested: true, legibility: 0.86
    }
  }
];

/* ------------------------------------------------------------------ *
 * Personas
 * ------------------------------------------------------------------ */

export const PERSONAS = {
  lakshmi: {
    id: 'lakshmi',
    name: 'Lakshmi Ramesh',
    nameKn: 'ಲಕ್ಷ್ಮಿ ರಮೇಶ್',
    nameHi: 'लक्ष्मी रमेश',
    initial: 'ಲ',
    variant: 'inheritance',
    address: '42, Brookefield Main Road, Bengaluru 560037',
    headline: 'Inherited her father\'s house. Cannot sell it until the khata moves to her name.',
    headlineKn: 'ತಂದೆಯ ಮನೆ ವಾರಸಾಗಿ ಬಂದಿದೆ. ಖಾತಾ ತನ್ನ ಹೆಸರಿಗೆ ಬರುವವರೆಗೆ ಮಾರಲಾಗದು.',
    headlineHi: 'पिता का घर विरासत में मिला। खाता अपने नाम आए बिना बेच नहीं सकतीं।',
    quotedByAgent: 6000,
    spokenIntake: 'Sir, naanu appa house-na khata transfer maadbeku. Appa theerikondru last November. Mane Brookefield alli ide, adanna maarbeku, adakke khata na hesaru change aagbeku. Papers ella ideve.',
    spokenIntakeGloss: 'I need to transfer my father\'s house khata. He passed away last November. I want to sell the house, so the khata has to come into my name. I have all the papers.',
    declared: { willExists: false, willProbated: false, relationshipToOwner: 'daughter' },
    documents: lakshmiDocuments
  },
  imran: {
    id: 'imran',
    name: 'Imran Basha',
    nameKn: 'ಇಮ್ರಾನ್ ಬಾಷಾ',
    nameHi: 'इमरान बाशा',
    initial: 'ಇ',
    variant: 'sale',
    address: '7, Amarjyoti Layout, Domlur, Bengaluru 560071',
    headline: 'Bought a flat in May. His bank will not release the loan until the khata is in his name.',
    headlineKn: 'ಮೇ ತಿಂಗಳಲ್ಲಿ ಫ್ಲಾಟ್ ಖರೀದಿಸಿದ್ದಾರೆ. ಖಾತಾ ಅವರ ಹೆಸರಿಗೆ ಬರುವವರೆಗೆ ಬ್ಯಾಂಕ್ ಸಾಲ ಬಿಡುಗಡೆ ಮಾಡುವುದಿಲ್ಲ.',
    headlineHi: 'मई में फ्लैट खरीदा। खाता उनके नाम आए बिना बैंक लोन जारी नहीं करेगा।',
    quotedByAgent: 15000,
    spokenIntake: 'Bhai, maine May mein flat liya hai Domlur mein. Bank bol raha hai khata transfer hone ke baad hi loan release hoga. Registration ho chuka hai.',
    spokenIntakeGloss: 'I bought a flat in Domlur in May. The bank says the loan will only be released after the khata transfer. Registration is already done.',
    declared: { willExists: false, willProbated: false, relationshipToOwner: 'purchaser' },
    documents: imranDocuments
  },
  sarala: {
    id: 'sarala',
    name: 'Sarala Bai',
    nameKn: 'ಸರಳಾ ಬಾಯಿ',
    nameHi: 'सरला बाई',
    initial: 'ಸ',
    variant: 'inheritance',
    address: 'Site 9, Byatarayanapura, Bengaluru 560092',
    headline: 'A 1996 deed that was never registered. The hard case — and the one where telling the truth matters most.',
    headlineKn: '1996ರ ಕ್ರಯಪತ್ರ, ಎಂದೂ ನೋಂದಣಿಯಾಗಿಲ್ಲ. ಕಠಿಣ ಪ್ರಕರಣ — ಇಲ್ಲಿ ಸತ್ಯ ಹೇಳುವುದೇ ಮುಖ್ಯ.',
    headlineHi: '1996 का विलेख, कभी पंजीकृत नहीं हुआ। कठिन मामला — और यहीं सच बोलना सबसे ज़रूरी है।',
    quotedByAgent: 25000,
    spokenIntake: 'Namma manege khata illa. Ganda theerikondru. Byatarayanapura alli mane ide. Yaaro heltaare 25 saavira kotre maadi kodtivi anta.',
    spokenIntakeGloss: 'Our house has no khata. My husband passed away. Someone says they will get it done if I pay twenty-five thousand.',
    declared: { willExists: true, willProbated: false, relationshipToOwner: 'spouse' },
    documents: saralaDocuments
  }
};

export const PERSONA_IDS = Object.keys(PERSONAS);

/** Builds the case object a persona starts from. */
export function buildPersonaCase(personaId, { corrected = false } = {}) {
  const persona = PERSONAS[personaId];
  if (!persona) throw new Error(`Unknown persona "${personaId}"`);
  return {
    personaId: persona.id,
    applicant: { name: persona.name, personaId: persona.id },
    variant: persona.variant,
    address: persona.address,
    declared: persona.declared,
    documents: persona.documents(corrected).map((doc) => ({ ...doc, synthetic: true }))
  };
}
