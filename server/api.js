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
  profiles: { cols: ['customer_code', 'profile_type', 'data', 'created_by'], required: ['customer_code'] },
  attributes: { cols: ['name', 'field_key', 'field_type', 'default_value', 'options', 'branch_id', 'required'], required: ['name', 'field_key'] },
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
