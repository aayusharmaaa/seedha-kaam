/**
 * API client.
 *
 * Two things worth noting for a slow connection:
 *   - every request has a timeout, so a stalled 2G socket surfaces as a
 *     readable message instead of a spinner that never resolves
 *   - the case id lives in sessionStorage, not a cookie, so closing the tab
 *     really does end the session
 */

const TIMEOUT_MS = 30_000;
const CASE_KEY = 'seedha:caseId';

export const getStoredCaseId = () => {
  try { return sessionStorage.getItem(CASE_KEY); } catch { return null; }
};
export const setStoredCaseId = (id) => {
  try { id ? sessionStorage.setItem(CASE_KEY, id) : sessionStorage.removeItem(CASE_KEY); } catch { /* private mode */ }
};

async function request(path, { method = 'GET', body, timeout = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `Request failed (${response.status})`);
      error.status = response.status;
      error.expired = Boolean(payload.expired);
      error.payload = payload;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('That took too long. Your connection may be slow — try once more.');
    }
    if (error instanceof TypeError) {
      throw new Error('We could not reach the server. Check your connection and try again.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  meta: () => request('/meta'),
  mocks: () => request('/mocks'),
  ledger: (language) => request(`/ledger?language=${encodeURIComponent(language)}`),
  frictionIndex: () => request('/friction-index'),
  documentKinds: () => request('/document-kinds'),

  publicLookup: (address) => request('/jurisdiction/lookup', { method: 'POST', body: { address } }),

  createCase: (body) => request('/cases', { method: 'POST', body }),
  getCase: (id) => request(`/cases/${id}`),
  deleteCase: (id) => request(`/cases/${id}`, { method: 'DELETE' }),
  setLanguage: (id, language) => request(`/cases/${id}/language`, { method: 'POST', body: { language } }),
  setApplicant: (id, body) => request(`/cases/${id}/applicant`, { method: 'POST', body }),

  intake: (id, utterance) => request(`/cases/${id}/intake`, { method: 'POST', body: { utterance }, timeout: 20_000 }),
  jurisdiction: (id, body) => request(`/cases/${id}/jurisdiction`, { method: 'POST', body }),

  loadFixtures: (id, body) => request(`/cases/${id}/documents/fixtures`, { method: 'POST', body }),
  addDocument: (id, body) => request(`/cases/${id}/documents`, { method: 'POST', body, timeout: 60_000 }),
  updateDocument: (id, docId, body) => request(`/cases/${id}/documents/${docId}`, { method: 'PUT', body }),
  removeDocument: (id, docId) => request(`/cases/${id}/documents/${docId}`, { method: 'DELETE' }),

  check: (id) => request(`/cases/${id}/check`, { method: 'POST' }),
  submit: (id, acknowledgementNumber) => request(`/cases/${id}/submit`, { method: 'POST', body: { acknowledgementNumber } }),
  clock: (id) => request(`/cases/${id}/clock`),
  demoNow: (id, now) => request(`/cases/${id}/demo-now`, { method: 'POST', body: { now } }),
  complete: (id) => request(`/cases/${id}/complete`, { method: 'POST' }),

  packetUrl: (id) => `/api/cases/${id}/packet.pdf`,
  reportUrl: (id) => `/api/cases/${id}/report.pdf`,
  escalationUrl: (id, rung) => `/api/cases/${id}/escalation/${rung}.pdf`
};

/**
 * Downscales an image in the browser before it is ever uploaded.
 *
 * A 4 MB phone photo on a 2G uplink is roughly two minutes of waiting. The
 * text on a document is legible at 1600px on the long edge, so we send that
 * instead — typically under 300 KB.
 */
export function downscaleImage(file, maxEdge = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return resolve(null);
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width: canvas.width, height: canvas.height });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    image.src = url;
  });
}
