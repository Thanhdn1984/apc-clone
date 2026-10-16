// src/lib/apcApi.js — client cho APC backend (port 20246)
const BASE = 'http://127.0.0.1:20246/api';

async function req(table, method = 'GET', body, id) {
  const url = id ? `${BASE}/${table}/${id}` : `${BASE}/${table}`;
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}

export const apcApi = {
  health: () => fetch(`${BASE}/health`.replace('/api/health', '/api/health')).then((r) => r.json()),
  list: (t) => req(t),
  get: (t, id) => req(t, 'GET', null, id),
  create: (t, body) => req(t, 'POST', body),
  update: (t, id, body) => req(t, 'PUT', body, id),
  remove: (t, id) => req(t, 'DELETE', null, id),
  online: async () => {
    try {
      const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch { return false; }
  },
};
