const BASE = import.meta.env.VITE_API_BASE || '';

async function post(path, body) {
  const res = await fetch(`${BASE}/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}/api${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export const getMeta = () => get('/meta');
export const recommend = (payload) => post('/recommend', payload);
export const chat = (payload) => post('/chat', payload);
export const smsSim = (payload) => post('/sms-sim', payload);
export const extractSoil = (payload) => post('/extract-soil', payload);

/* ------------------------------------------------ local field persistence */

const KEY = 'agrisense.fields.v1';

export function savedFields() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveField(rec) {
  const list = savedFields();
  const entry = {
    id: rec.id,
    createdAt: rec.createdAt,
    cropId: rec.cropId,
    cropNames: rec.cropNames,
    zone: rec.zone,
    areaHa: rec.areaHa,
    soil: rec.soil,
    dose: rec.dose,
    savedTotal: rec.comparison?.savedTotal ?? 0,
    tier: rec.tier,
  };
  // Same crop on the same field is the same field — keep the latest, not a pile
  // of near-identical rows from repeated runs.
  const sameField = (f) => f.id === rec.id || (f.cropId === entry.cropId && f.areaHa === entry.areaHa && f.zone === entry.zone);
  const next = [entry, ...list.filter((f) => !sameField(f))].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearFields() {
  localStorage.removeItem(KEY);
}

/* --------------------------------------------------- offline cache of last */

const LAST = 'agrisense.last.v1';
export const cacheLast = (rec) => { try { localStorage.setItem(LAST, JSON.stringify(rec)); } catch {} };
export const readLast = () => { try { return JSON.parse(localStorage.getItem(LAST) || 'null'); } catch { return null; } };
