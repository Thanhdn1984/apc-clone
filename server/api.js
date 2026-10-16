// server/api.js — Express REST CRUD cho 4 bang, port 20246
// (KHONG dung port 20245). Chay: node server/api.js
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Thu muc templates/ o root project — chua file .docx mau upload
const TPL_DIR = path.join(__dirname, '..', 'templates');
fs.mkdirSync(TPL_DIR, { recursive: true });
const safeTplName = (n = '') => String(n).replace(/[^a-zA-Z0-9-_.\u00C0-\u024F\u1E00-\u1EF9 ]/g, '_').trim().slice(0, 180);

const app = express();
const PORT = process.env.APC_API_PORT || 20246;
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const TABLES = {
  branches: { cols: ['code', 'name'], required: ['code', 'name'] },
  users: { cols: ['username', 'role', 'branch_id'], required: ['username'] },
  profiles: { cols: ['customer_code', 'profile_type', 'data', 'created_by', 'status'], required: ['customer_code'] },
  attributes: { cols: ['name', 'field_key', 'field_type', 'default_value', 'options', 'branch_id', 'required'], required: ['name', 'field_key'] },
  approvals: { cols: ['profile_id', 'level', 'approver', 'status', 'note'], required: ['profile_id', 'level'] },
};

app.get('/api/health', (req, res) => res.json({ ok: true, port: PORT }));

// --- Template .docx upload: list + upload raw octet-stream + delete ---
// GET /api/templates -> [{name, size}]
app.get('/api/templates', (req, res) => {
  const files = fs.readdirSync(TPL_DIR).filter((f) => /\.docx$/i.test(f));
  res.json(files.map((name) => ({ name, size: fs.statSync(path.join(TPL_DIR, name)).size })));
});
// POST /api/templates?name=xxx.docx (Content-Type: application/octet-stream, body raw)
app.post('/api/templates', express.raw({ type: 'application/octet-stream', limit: '50mb' }), (req, res) => {
  const name = safeTplName(req.query.name || '');
  if (!/\.docx$/i.test(name)) return res.status(400).json({ error: 'need_?name=xxx.docx' });
  const buf = req.body;
  if (!buf || !buf.length) return res.status(400).json({ error: 'empty_body' });
  // magic PK\x03\x04
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) return res.status(400).json({ error: 'not_docx_zip' });
  fs.writeFileSync(path.join(TPL_DIR, name), buf);
  res.status(201).json({ ok: true, name, size: buf.length });
});
app.delete('/api/templates/:name', (req, res) => {
  const name = safeTplName(req.params.name);
  const p = path.join(TPL_DIR, name);
  if (!fs.existsSync(p)) return res.status(404).json({ error: 'not_found' });
  fs.unlinkSync(p);
  res.json({ ok: true, name });
});
// GET /api/templates/:name -> binary .docx (de GeneratorTab nap truc tiep)
app.get('/api/templates/:name', (req, res) => {
  const name = safeTplName(req.params.name);
  const p = path.join(TPL_DIR, name);
  if (!/\.docx$/i.test(name) || !fs.existsSync(p)) return res.status(404).json({ error: 'not_found' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  fs.createReadStream(p).pipe(res);
});

// Tim kiem ho so theo customer_code (?q=) — LIKE prefix, toi da ?limit
app.get('/api/profiles/search', (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'missing_q' });
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  res.json(db.prepare('SELECT * FROM profiles WHERE customer_code LIKE ? ORDER BY id DESC LIMIT ?').all(q + '%', limit));
});

// --- Duyet ho so nhieu cap (trinh -> kiem soat -> phe duyet) ---
// 3 cap: 1 = trinh (staff), 2 = kiem soat (manager), 3 = phe duyet (admin/manager).
// Luong: POST /api/profiles/:id/submit (draft/rejected -> in_review + tao approval L1)
// -> POST /api/approvals/:id/decide {decision, approver, note}
// approved L1/L2 -> mo L tiep theo; approved L3 -> profile approved; rejected -> profile rejected.
const LEVEL_NAMES = { 1: 'Trinh', 2: 'Kiem soat', 3: 'Phe duyet' };
const decidedNow = () =>
  db.prepare("SELECT datetime('now','localtime') t").get().t;

const getApprovalChain = (profileId) =>
  db.prepare('SELECT * FROM approvals WHERE profile_id = ? ORDER BY level ASC')
    .all(profileId);

function syncProfileStatus(profileId) {
  const chain = getApprovalChain(profileId);
  if (!chain.length) {
    db.prepare("UPDATE profiles SET status = 'draft' WHERE id = ?").run(profileId);
    return 'draft';
  }
  if (chain.some((a) => a.status === 'rejected')) {
    db.prepare("UPDATE profiles SET status = 'rejected' WHERE id = ?").run(profileId);
    return 'rejected';
  }
  const l3 = chain.find((a) => a.level === 3);
  if (l3 && l3.status === 'approved') {
    db.prepare("UPDATE profiles SET status = 'approved' WHERE id = ?").run(profileId);
    return 'approved';
  }
  db.prepare("UPDATE profiles SET status = 'in_review' WHERE id = ?").run(profileId);
  return 'in_review';
}

// Nop ho so de duyet: tao approval cap 1 (idempotent)
app.post('/api/profiles/:id/submit', (req, res) => {
  const p = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  if (p.status === 'in_review') return res.status(400).json({ error: 'already_in_review' });
  if (p.status === 'approved') return res.status(400).json({ error: 'already_approved' });
  const me = String(req.body?.approver || req.body?.username || '');
  db.prepare(
    `INSERT INTO approvals (profile_id, level, approver, status, note)
     VALUES (?, 1, ?, 'pending', '')
     ON CONFLICT (profile_id, level) DO UPDATE SET status='pending', decided_at=NULL, approver=excluded.approver`
  ).run(p.id, me);
  // Trinh lai sau tu choi: xoa chain cu cap 2,3 de duyet lai tu dau
  db.prepare('DELETE FROM approvals WHERE profile_id = ? AND level > 1').run(p.id);
  syncProfileStatus(p.id);
  res.status(201).json({ ok: true, chain: getApprovalChain(p.id) });
});

// Lich su duyet cua 1 ho so
app.get('/api/profiles/:id/approvals', (req, res) => {
  const p = db.prepare('SELECT id FROM profiles WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not_found' });
  res.json(getApprovalChain(req.params.id));
});

// Duyet / tu choi 1 cap
app.post('/api/approvals/:id/decide', (req, res) => {
  const a = db.prepare('SELECT * FROM approvals WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found' });
  if (a.status !== 'pending') return res.status(400).json({ error: 'already_decided' });
  const { decision, approver = '', note = '' } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'decision_must_be_approved_or_rejected' });
  }
  // Cap truoc phai approved (tru L1)
  if (a.level > 1) {
    const prev = db.prepare('SELECT * FROM approvals WHERE profile_id = ? AND level = ?')
      .get(a.profile_id, a.level - 1);
    if (!prev || prev.status !== 'approved') {
      return res.status(400).json({ error: 'previous_level_not_approved' });
    }
  }
  db.prepare('UPDATE approvals SET status = ?, approver = ?, note = ?, decided_at = ? WHERE id = ?')
    .run(decision, String(approver), String(note), decidedNow(), a.id);
  // Mo cap tiep theo neu approved va chua het 3 cap
  if (decision === 'approved' && a.level < 3) {
    db.prepare(
      `INSERT INTO approvals (profile_id, level, status) VALUES (?, ?, 'pending')
       ON CONFLICT (profile_id, level) DO NOTHING`
    ).run(a.profile_id, a.level + 1);
  }
  const status = syncProfileStatus(a.profile_id);
  res.json({ ok: true, status, chain: getApprovalChain(a.profile_id) });
});

// Dashboard: dem ho so theo status + dem approval pending theo cap
app.get('/api/dashboard', (req, res) => {
  const byStatus = db.prepare(
    `SELECT COALESCE(status,'draft') status, COUNT(*) c FROM profiles GROUP BY status`
  ).all();
  const pendingByLevel = db.prepare(
    `SELECT level, COUNT(*) c FROM approvals WHERE status = 'pending' GROUP BY level`
  ).all();
  const total = db.prepare('SELECT COUNT(*) c FROM profiles').get().c;
  const counts = { draft: 0, in_review: 0, approved: 0, rejected: 0 };
  for (const r of byStatus) if (r.status in counts) counts[r.status] = r.c;
  const pending = { 1: 0, 2: 0, 3: 0 };
  for (const r of pendingByLevel) pending[r.level] = r.c;
  res.json({ total, byStatus: counts, pendingByLevel: pending, levelNames: LEVEL_NAMES });
});

for (const [table, cfg] of Object.entries(TABLES)) {
  // LIST (co ?limit)
  app.get(`/api/${table}`, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
    res.json(db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT ?`).all(limit));
  });
  // GET one
  app.get(`/api/${table}/:id`, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json(row);
  });
  // CREATE
  app.post(`/api/${table}`, (req, res) => {
    for (const f of cfg.required) {
      if (req.body[f] === undefined || req.body[f] === '') {
        return res.status(400).json({ error: `missing_field: ${f}` });
      }
    }
    const cols = cfg.cols.filter((c) => req.body[c] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'empty_body' });
    try {
      const r = db.prepare(
        `INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`
      ).run(...cols.map((c) => (typeof req.body[c] === 'object' ? JSON.stringify(req.body[c]) : req.body[c])));
      res.status(201).json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(r.lastInsertRowid));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  // UPDATE
  app.put(`/api/${table}/:id`, (req, res) => {
    const cols = cfg.cols.filter((c) => req.body[c] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'empty_body' });
    try {
      const r = db.prepare(
        `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`
      ).run(...cols.map((c) => (typeof req.body[c] === 'object' ? JSON.stringify(req.body[c]) : req.body[c])), req.params.id);
      if (!r.changes) return res.status(404).json({ error: 'not_found' });
      res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id));
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
  // DELETE
  app.delete(`/api/${table}/:id`, (req, res) => {
    const r = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true, id: Number(req.params.id) });
  });
}

app.listen(PORT, '127.0.0.1', () => console.log(`APC API on http://127.0.0.1:${PORT}`));
export default app;
