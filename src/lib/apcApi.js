// Same-origin: nginx proxy /api → 127.0.0.1:20246 (tranh hardcode 127.0.0.1 + mixed-content)
const BASE = '/api';

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
  // Tim kiem ho so theo customer_code
  searchProfiles: async (q, limit = 50) => {
    const r = await fetch(`${BASE}/profiles/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    const data = await r.json().catch(() => ([]));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  // Quan ly mau .docx upload (server/templates/)
  listServerTemplates: async () => {
    const r = await fetch(`${BASE}/templates`);
    const data = await r.json().catch(() => ([]));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  uploadServerTemplate: async (name, arrayBuffer) => {
    const r = await fetch(`${BASE}/templates?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: arrayBuffer,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  deleteServerTemplate: async (name) => {
    const r = await fetch(`${BASE}/templates/${encodeURIComponent(name)}`, { method: 'DELETE' });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  // Duyet ho so nhieu cap (trinh -> kiem soat -> phe duyet)
  submitProfile: async (id, approver = '') => {
    const r = await fetch(`${BASE}/profiles/${id}/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approver }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  profileApprovals: async (id) => {
    const r = await fetch(`${BASE}/profiles/${id}/approvals`);
    const data = await r.json().catch(() => ([]));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  decideApproval: async (approvalId, decision, approver = '', note = '') => {
    const r = await fetch(`${BASE}/approvals/${approvalId}/decide`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, approver, note }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  dashboard: async () => {
    const r = await fetch(`${BASE}/dashboard`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  },
  online: async () => {
    try {
      const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) });
      return r.ok;
    } catch { return false; }
  },
};
