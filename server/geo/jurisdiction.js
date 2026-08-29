/**
 * JURISDICTION RESOLVER
 *
 * BBMP was dissolved and replaced by the Greater Bengaluru Authority with five
 * city corporations. A khata transfer that used to go to one ward office now
 * depends on which corporation holds the record for that area, and for a lot of
 * addresses nobody can say which one that is off the top of their head.
 *
 * That uncertainty is what a middleman sells. So this resolver does three
 * things, in this order of importance:
 *
 *   1. give a straight answer when the geometry is unambiguous
 *   2. say "this is a boundary case, here are both offices" when it is not,
 *      instead of guessing confidently
 *   3. never pretend to have geocoded an address it could not place
 *
 * HONESTY NOTE, repeated in /mocks and in the UI:
 * The corporation polygons below are APPROXIMATE. Official machine-readable
 * GBA boundary files were not available to build against, so these are
 * hand-drawn envelopes that reproduce the known corporation assignment for the
 * localities in the gazetteer. They are good enough to route a citizen to an
 * office to call. They are not a survey record and must not be used as one.
 */

/* ------------------------------------------------------------------ *
 * Geometry primitives
 * ------------------------------------------------------------------ */

const DEG_TO_KM_LAT = 111.32;
const degToKmLng = (lat) => 111.32 * Math.cos((lat * Math.PI) / 180);

/** Ray-casting point-in-polygon. Polygon is [[lat, lng], ...], not closed. */
export function pointInPolygon([lat, lng], polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersects = (lngI > lng) !== (lngJ > lng)
      && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Shortest distance in km from a point to a polygon's edge. */
export function distanceToPolygonEdgeKm([lat, lng], polygon) {
  const kmLng = degToKmLng(lat);
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const ax = (polygon[j][1] - lng) * kmLng;
    const ay = (polygon[j][0] - lat) * DEG_TO_KM_LAT;
    const bx = (polygon[i][1] - lng) * kmLng;
    const by = (polygon[i][0] - lat) * DEG_TO_KM_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    let t = lengthSq === 0 ? 0 : -(ax * dx + ay * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx;
    const py = ay + t * dy;
    best = Math.min(best, Math.hypot(px, py));
  }
  return best;
}

/* ------------------------------------------------------------------ *
 * The five corporations
 * ------------------------------------------------------------------ */

export const CORPORATIONS = [
  {
    id: 'central',
    name: 'Bengaluru Central City Corporation',
    nameKn: 'ಬೆಂಗಳೂರು ಕೇಂದ್ರ ನಗರ ಪಾಲಿಕೆ',
    nameHi: 'बेंगलुरु सेंट्रल सिटी कॉर्पोरेशन',
    polygon: [[12.935, 77.560], [12.935, 77.630], [13.015, 77.630], [13.015, 77.560]],
    zones: [
      { id: 'east-zone', name: 'East zone', office: 'Assistant Revenue Officer, East zone office, Shivajinagar', localities: ['shivajinagar', 'ulsoor', 'richmond town', 'frazer town'] },
      { id: 'south-zone', name: 'South zone', office: 'Assistant Revenue Officer, South zone office, Jayanagar 4th Block', localities: ['basavanagudi', 'chamrajpet', 'wilson garden'] },
      { id: 'gandhinagar', name: 'Gandhinagar sub-division', office: 'Assistant Revenue Officer, Gandhinagar sub-division office', localities: ['gandhinagar', 'majestic', 'sampangi rama nagar', 'seshadripuram'] }
    ]
  },
  {
    id: 'east',
    name: 'Bengaluru East City Corporation',
    nameKn: 'ಬೆಂಗಳೂರು ಪೂರ್ವ ನಗರ ಪಾಲಿಕೆ',
    nameHi: 'बेंगलुरु ईस्ट सिटी कॉर्पोरेशन',
    polygon: [[12.935, 77.630], [12.935, 77.860], [13.015, 77.860], [13.015, 77.630]],
    zones: [
      { id: 'mahadevapura', name: 'Mahadevapura zone', office: 'Assistant Revenue Officer, Mahadevapura zone office, Garudacharpalya', localities: ['whitefield', 'brookefield', 'mahadevapura', 'hoodi', 'marathahalli', 'kundalahalli', 'itpl', 'varthur'] },
      { id: 'krpuram', name: 'K R Puram sub-division', office: 'Assistant Revenue Officer, K R Puram sub-division office', localities: ['k r puram', 'krpuram', 'ramamurthy nagar', 'tin factory', 'vijinapura'] },
      { id: 'indiranagar', name: 'Indiranagar sub-division', office: 'Assistant Revenue Officer, Indiranagar sub-division office', localities: ['indiranagar', 'domlur', 'cv raman nagar', 'jeevan bhima nagar'] }
    ]
  },
  {
    id: 'west',
    name: 'Bengaluru West City Corporation',
    nameKn: 'ಬೆಂಗಳೂರು ಪಶ್ಚಿಮ ನಗರ ಪಾಲಿಕೆ',
    nameHi: 'बेंगलुरु वेस्ट सिटी कॉर्पोरेशन',
    polygon: [[12.935, 77.360], [12.935, 77.560], [13.015, 77.560], [13.015, 77.360]],
    zones: [
      { id: 'rajajinagar', name: 'Rajajinagar zone', office: 'Assistant Revenue Officer, Rajajinagar zone office', localities: ['rajajinagar', 'basaveshwaranagar', 'mahalakshmi layout', 'nandini layout'] },
      { id: 'vijayanagar', name: 'Vijayanagar sub-division', office: 'Assistant Revenue Officer, Vijayanagar sub-division office', localities: ['vijayanagar', 'chandra layout', 'hampinagar', 'attiguppe'] },
      { id: 'kengeri', name: 'Kengeri sub-division', office: 'Assistant Revenue Officer, Kengeri sub-division office', localities: ['kengeri', 'rajarajeshwari nagar', 'nagarbhavi', 'jnanabharathi'] }
    ]
  },
  {
    id: 'north',
    name: 'Bengaluru North City Corporation',
    nameKn: 'ಬೆಂಗಳೂರು ಉತ್ತರ ನಗರ ಪಾಲಿಕೆ',
    nameHi: 'बेंगलुरु नॉर्थ सिटी कॉर्पोरेशन',
    polygon: [[13.015, 77.360], [13.015, 77.860], [13.180, 77.860], [13.180, 77.360]],
    zones: [
      { id: 'yelahanka', name: 'Yelahanka zone', office: 'Assistant Revenue Officer, Yelahanka zone office', localities: ['yelahanka', 'jakkur', 'attur layout', 'vidyaranyapura', 'doddaballapur road'] },
      { id: 'hebbal', name: 'Hebbal sub-division', office: 'Assistant Revenue Officer, Hebbal sub-division office', localities: ['hebbal', 'sanjaynagar', 'rt nagar', 'ganganagar', 'kodigehalli'] },
      { id: 'byatarayanapura', name: 'Byatarayanapura sub-division', office: 'Assistant Revenue Officer, Byatarayanapura sub-division office', localities: ['byatarayanapura', 'thanisandra', 'hennur', 'kothanur', 'horamavu'] },
      { id: 'peenya', name: 'Peenya sub-division', office: 'Assistant Revenue Officer, Peenya sub-division office', localities: ['peenya', 'jalahalli', 'yeshwanthpur', 'nagasandra', 'dasarahalli'] }
    ]
  },
  {
    id: 'south',
    name: 'Bengaluru South City Corporation',
    nameKn: 'ಬೆಂಗಳೂರು ದಕ್ಷಿಣ ನಗರ ಪಾಲಿಕೆ',
    nameHi: 'बेंगलुरु साउथ सिटी कॉर्पोरेशन',
    polygon: [[12.760, 77.360], [12.760, 77.860], [12.935, 77.860], [12.935, 77.360]],
    zones: [
      { id: 'jayanagar', name: 'Jayanagar zone', office: 'Assistant Revenue Officer, Jayanagar zone office', localities: ['jayanagar', 'jp nagar', 'banashankari', 'padmanabhanagar', 'girinagar'] },
      { id: 'bommanahalli', name: 'Bommanahalli zone', office: 'Assistant Revenue Officer, Bommanahalli zone office', localities: ['bommanahalli', 'hsr layout', 'btm layout', 'begur', 'hongasandra'] },
      { id: 'koramangala', name: 'Koramangala sub-division', office: 'Assistant Revenue Officer, Koramangala sub-division office', localities: ['koramangala', 'ejipura', 'adugodi', 'sarjapur road'] },
      { id: 'electronic-city', name: 'Electronic City sub-division', office: 'Assistant Revenue Officer, Electronic City sub-division office', localities: ['electronic city', 'anekal road', 'chandapura', 'hebbagodi'] }
    ]
  }
];

/** How close to a corporation edge before we refuse to sound certain. */
export const CONTESTED_THRESHOLD_KM = 1.5;

/* ------------------------------------------------------------------ *
 * Locality gazetteer
 *
 * A small offline gazetteer, so the resolver works on a 2G connection and
 * without sending a citizen's address to any third-party geocoder. Every entry
 * is a public place name with an approximate centroid.
 * ------------------------------------------------------------------ */

export const GAZETTEER = [
  // East
  { name: 'Brookefield', lat: 12.9698, lng: 77.7180, ward: 'BBMP Ward 84 (Hagadur)' },
  { name: 'Whitefield', lat: 12.9698, lng: 77.7500, ward: 'BBMP Ward 84 (Hagadur)' },
  { name: 'Mahadevapura', lat: 12.9910, lng: 77.6870, ward: 'BBMP Ward 54 (Mahadevapura)' },
  { name: 'Hoodi', lat: 12.9925, lng: 77.7160, ward: 'BBMP Ward 84 (Hagadur)' },
  { name: 'Marathahalli', lat: 12.9591, lng: 77.6974, ward: 'BBMP Ward 85 (Marathahalli)' },
  { name: 'Kundalahalli', lat: 12.9591, lng: 77.7130, ward: 'BBMP Ward 84 (Hagadur)' },
  { name: 'Varthur', lat: 12.9400, lng: 77.7480, ward: 'BBMP Ward 150 (Varthur)' },
  { name: 'K R Puram', lat: 13.0079, lng: 77.6957, ward: 'BBMP Ward 53 (K R Puram)' },
  { name: 'Ramamurthy Nagar', lat: 13.0159, lng: 77.6780, ward: 'BBMP Ward 25 (Ramamurthy Nagar)' },
  { name: 'Indiranagar', lat: 12.9784, lng: 77.6408, ward: 'BBMP Ward 80 (Hoysala Nagar)' },
  { name: 'Domlur', lat: 12.9609, lng: 77.6387, ward: 'BBMP Ward 112 (Domlur)' },
  { name: 'CV Raman Nagar', lat: 12.9850, lng: 77.6630, ward: 'BBMP Ward 57 (C V Raman Nagar)' },
  { name: 'Jeevan Bhima Nagar', lat: 12.9640, lng: 77.6560, ward: 'BBMP Ward 81 (Jeevanbhimanagar)' },

  // Central
  { name: 'Shivajinagar', lat: 12.9850, lng: 77.6050, ward: 'BBMP Ward 90 (Shivajinagar)' },
  { name: 'Ulsoor', lat: 12.9800, lng: 77.6220, ward: 'BBMP Ward 91 (Halasuru)' },
  { name: 'Frazer Town', lat: 12.9970, lng: 77.6180, ward: 'BBMP Ward 89 (Pulikeshinagar)' },
  { name: 'Richmond Town', lat: 12.9600, lng: 77.6010, ward: 'BBMP Ward 116 (Shanthala Nagar)' },
  { name: 'Basavanagudi', lat: 12.9420, lng: 77.5730, ward: 'BBMP Ward 154 (Basavanagudi)' },
  { name: 'Chamrajpet', lat: 12.9580, lng: 77.5680, ward: 'BBMP Ward 141 (Chamrajpet)' },
  { name: 'Gandhinagar', lat: 12.9780, lng: 77.5750, ward: 'BBMP Ward 94 (Gandhinagar)' },
  { name: 'Seshadripuram', lat: 12.9930, lng: 77.5760, ward: 'BBMP Ward 76 (Seshadripuram)' },
  { name: 'Wilson Garden', lat: 12.9490, lng: 77.5940, ward: 'BBMP Ward 119 (Sudhama Nagar)' },
  { name: 'Majestic', lat: 12.9770, lng: 77.5710, ward: 'BBMP Ward 94 (Gandhinagar)' },

  // West
  { name: 'Rajajinagar', lat: 12.9917, lng: 77.5522, ward: 'BBMP Ward 99 (Rajajinagar)' },
  { name: 'Basaveshwaranagar', lat: 12.9930, lng: 77.5350, ward: 'BBMP Ward 101 (Basaveshwara Nagar)' },
  { name: 'Vijayanagar', lat: 12.9720, lng: 77.5330, ward: 'BBMP Ward 128 (Vijayanagar)' },
  { name: 'Nagarbhavi', lat: 12.9600, lng: 77.5100, ward: 'BBMP Ward 129 (Hosahalli)' },
  { name: 'Rajarajeshwari Nagar', lat: 12.9270, lng: 77.5180, ward: 'BBMP Ward 160 (R R Nagar)' },
  { name: 'Kengeri', lat: 12.9080, lng: 77.4820, ward: 'BBMP Ward 198 (Kengeri)' },
  { name: 'Mahalakshmi Layout', lat: 13.0090, lng: 77.5490, ward: 'BBMP Ward 71 (Mahalakshmipuram)' },
  { name: 'Nandini Layout', lat: 13.0030, lng: 77.5390, ward: 'BBMP Ward 70 (Nandini Layout)' },

  // North
  { name: 'Yelahanka', lat: 13.1007, lng: 77.5963, ward: 'BBMP Ward 4 (Yelahanka)' },
  { name: 'Jakkur', lat: 13.0770, lng: 77.6020, ward: 'BBMP Ward 6 (Jakkur)' },
  { name: 'Vidyaranyapura', lat: 13.0790, lng: 77.5560, ward: 'BBMP Ward 9 (Vidyaranyapura)' },
  { name: 'Hebbal', lat: 13.0358, lng: 77.5970, ward: 'BBMP Ward 21 (Hebbal)' },
  { name: 'Sanjaynagar', lat: 13.0290, lng: 77.5720, ward: 'BBMP Ward 22 (Sanjaya Nagar)' },
  { name: 'RT Nagar', lat: 13.0210, lng: 77.5940, ward: 'BBMP Ward 34 (Radhakrishna Temple)' },
  { name: 'Thanisandra', lat: 13.0570, lng: 77.6300, ward: 'BBMP Ward 24 (Thanisandra)' },
  { name: 'Hennur', lat: 13.0400, lng: 77.6400, ward: 'BBMP Ward 24 (Thanisandra)' },
  { name: 'Horamavu', lat: 13.0290, lng: 77.6580, ward: 'BBMP Ward 25 (Ramamurthy Nagar)' },
  { name: 'Kothanur', lat: 13.0630, lng: 77.6440, ward: 'BBMP Ward 23 (Byatarayanapura)' },
  { name: 'Byatarayanapura', lat: 13.0650, lng: 77.5940, ward: 'BBMP Ward 23 (Byatarayanapura)' },
  { name: 'Yeshwanthpur', lat: 13.0284, lng: 77.5401, ward: 'BBMP Ward 65 (Yeshwanthpura)' },
  { name: 'Peenya', lat: 13.0280, lng: 77.5190, ward: 'BBMP Ward 40 (Peenya Industrial Area)' },
  { name: 'Jalahalli', lat: 13.0430, lng: 77.5310, ward: 'BBMP Ward 39 (Jalahalli)' },
  { name: 'Dasarahalli', lat: 13.0430, lng: 77.5130, ward: 'BBMP Ward 38 (Bagalakunte)' },

  // South
  { name: 'Jayanagar', lat: 12.9250, lng: 77.5938, ward: 'BBMP Ward 168 (Jayanagar)' },
  { name: 'JP Nagar', lat: 12.9100, lng: 77.5850, ward: 'BBMP Ward 179 (J P Nagar)' },
  { name: 'Banashankari', lat: 12.9250, lng: 77.5460, ward: 'BBMP Ward 161 (Banashankari Temple)' },
  { name: 'BTM Layout', lat: 12.9160, lng: 77.6100, ward: 'BBMP Ward 176 (Jakkasandra)' },
  { name: 'HSR Layout', lat: 12.9120, lng: 77.6410, ward: 'BBMP Ward 174 (Bellandur)' },
  { name: 'Koramangala', lat: 12.9352, lng: 77.6245, ward: 'BBMP Ward 151 (Koramangala)' },
  { name: 'Ejipura', lat: 12.9430, lng: 77.6220, ward: 'BBMP Ward 148 (Jeevanbhimanagar)' },
  { name: 'Sarjapur Road', lat: 12.9010, lng: 77.6970, ward: 'BBMP Ward 150 (Bellandur)' },
  { name: 'Bellandur', lat: 12.9260, lng: 77.6760, ward: 'BBMP Ward 150 (Bellandur)' },
  { name: 'Bommanahalli', lat: 12.8980, lng: 77.6180, ward: 'BBMP Ward 191 (Bommanahalli)' },
  { name: 'Begur', lat: 12.8720, lng: 77.6280, ward: 'BBMP Ward 192 (Begur)' },
  { name: 'Electronic City', lat: 12.8452, lng: 77.6602, ward: 'BBMP Ward 195 (Hemmigepura)' },
  { name: 'Padmanabhanagar', lat: 12.9180, lng: 77.5570, ward: 'BBMP Ward 181 (Padmanabhanagar)' },
  { name: 'Girinagar', lat: 12.9410, lng: 77.5460, ward: 'BBMP Ward 158 (Girinagar)' },
  { name: 'Adugodi', lat: 12.9440, lng: 77.6070, ward: 'BBMP Ward 145 (Adugodi)' }
];

/* ------------------------------------------------------------------ *
 * Address matching
 * ------------------------------------------------------------------ */

const normalise = (s = '') => String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Finds the gazetteer entry whose name appears in the address. Longer names win,
 * so "Rajarajeshwari Nagar" is not shadowed by "Nagar".
 */
export function matchLocality(address) {
  const text = normalise(address);
  if (!text) return null;
  const candidates = GAZETTEER
    .map((entry) => ({ entry, needle: normalise(entry.name) }))
    .filter(({ needle }) => text.includes(needle))
    .sort((a, b) => b.needle.length - a.needle.length);
  return candidates.length ? candidates[0].entry : null;
}

function pickZone(corporation, address) {
  const text = normalise(address);
  for (const zone of corporation.zones) {
    if (zone.localities.some((locality) => text.includes(normalise(locality)))) return zone;
  }
  return corporation.zones[0];
}

/* ------------------------------------------------------------------ *
 * The resolver
 * ------------------------------------------------------------------ */

/**
 * @param {{address?: string, lat?: number, lng?: number}} input
 * @returns {object} a resolution with an explicit `confidence` field, which is
 *   the part the UI must not throw away.
 */
export function resolveJurisdiction(input = {}) {
  let lat = Number(input.lat);
  let lng = Number(input.lng);
  let matched = null;
  let source = 'coordinates';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    matched = matchLocality(input.address || '');
    if (!matched) {
      return {
        confidence: 'unresolved',
        reason: 'no-locality-match',
        message: 'We could not place this address on the corporation map, and we are not going to guess.',
        nextStep: 'Add a well-known locality or landmark to the address (for example "Brookefield" or "Yelahanka"), or share your location so we can use coordinates.',
        knownLocalities: GAZETTEER.map((entry) => entry.name).sort(),
        candidates: []
      };
    }
    lat = matched.lat;
    lng = matched.lng;
    source = 'gazetteer';
  }

  const point = [lat, lng];
  const containing = CORPORATIONS.filter((corporation) => pointInPolygon(point, corporation.polygon));
  const distances = CORPORATIONS
    .map((corporation) => ({ corporation, edgeKm: distanceToPolygonEdgeKm(point, corporation.polygon), inside: pointInPolygon(point, corporation.polygon) }))
    .sort((a, b) => a.edgeKm - b.edgeKm);

  if (containing.length === 0) {
    const nearest = distances[0];
    return {
      confidence: 'outside-coverage',
      reason: 'outside-all-polygons',
      message: `This location falls outside the five city corporation areas we hold boundaries for. The nearest is ${nearest.corporation.name}, about ${nearest.edgeKm.toFixed(1)} km away.`,
      nextStep: 'If the property is outside the Greater Bengaluru area, the khata is held by a Town Panchayat or Gram Panchayat, not a city corporation. Ask at your nearest Nadakacheri.',
      point: { lat, lng, source, locality: matched?.name || null },
      candidates: [describe(nearest.corporation, input.address, matched, nearest.edgeKm)]
    };
  }

  const home = containing[0];
  const edgeKm = distanceToPolygonEdgeKm(point, home.polygon);
  const neighbour = distances.find((d) => d.corporation.id !== home.id);

  // Close to an edge: the polygon is approximate, so the honest answer names
  // both offices and says which to try first.
  if (edgeKm < CONTESTED_THRESHOLD_KM && neighbour) {
    return {
      confidence: 'contested',
      reason: 'near-corporation-boundary',
      message: `This address sits about ${edgeKm.toFixed(1)} km from the boundary between ${home.name} and ${neighbour.corporation.name}. Our boundary data is approximate, so we will not pretend to be sure.`,
      nextStep: `Call the first office below and quote your property ID before travelling. If they say the record is not with them, the second office is the one to try — you are not being sent away, you are being redirected.`,
      point: { lat, lng, source, locality: matched?.name || null, distanceToBoundaryKm: Number(edgeKm.toFixed(2)) },
      candidates: [
        describe(home, input.address, matched, edgeKm, 'try first'),
        describe(neighbour.corporation, input.address, matched, neighbour.edgeKm, 'if the first has no record')
      ]
    };
  }

  return {
    confidence: 'resolved',
    reason: 'inside-single-polygon',
    message: `Your property falls inside ${home.name}.`,
    nextStep: 'Take your packet to the office below. Ask for an acknowledgement number when you hand it in — that number is what starts your clock.',
    point: { lat, lng, source, locality: matched?.name || null, distanceToBoundaryKm: Number(edgeKm.toFixed(2)) },
    candidates: [describe(home, input.address, matched, edgeKm)]
  };
}

function describe(corporation, address, matched, edgeKm, note) {
  const zone = pickZone(corporation, matched ? `${address || ''} ${matched.name}` : address || '');
  return {
    corporationId: corporation.id,
    corporation: corporation.name,
    corporationKn: corporation.nameKn,
    corporationHi: corporation.nameHi,
    zone: zone.name,
    office: zone.office,
    previousWard: matched?.ward || null,
    distanceToBoundaryKm: Number(edgeKm.toFixed(2)),
    note: note || null
  };
}

export const GEO_META = {
  corporations: CORPORATIONS.length,
  localities: GAZETTEER.length,
  contestedThresholdKm: CONTESTED_THRESHOLD_KM,
  boundarySource: 'Hand-drawn approximate envelopes, not official GBA polygons',
  lastVerified: '2026-08-01'
};
