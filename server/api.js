// server/api.js — Express REST CRUD cho 4 bang, port 20246
// (KHONG dung port 20245). Chay: node server/api.js
import express from 'express';
import cors from 'cors';
import db from './db.js';

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
