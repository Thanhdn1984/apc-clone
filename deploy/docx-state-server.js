const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DOCX_STATE_DIR || '/var/lib/docx-state';
const DATA_FILE = path.join(DATA_DIR, 'state.json');
const PROFILE_DIR = path.join(DATA_DIR, 'profiles');
const TEMPLATE_DIR = path.join(DATA_DIR, 'uploaded-templates');
const REFERENCE_DIR = path.join(DATA_DIR, 'reference-files');
const PORT = Number(process.env.PORT || 20245);
const MAX_BODY = 1024 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(PROFILE_DIR, { recursive: true });
fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
fs.mkdirSync(REFERENCE_DIR, { recursive: true });

function send(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'https://docx.aistacklab.org',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function hashKey(key) {
  return crypto.createHash('sha256').update(String(key || 'default')).digest('hex').slice(0, 32);
}

function safeName(name) {
  return String(name || '').trim().replace(/[^a-zA-Z0-9_. -]/g, '_').slice(0, 120);
}

function profilePath(name) {
  const safe = safeName(name);
  return safe ? path.join(PROFILE_DIR, `${safe}.json`) : null;
}

function templatePath(name) {
  const safe = safeName(name);
  return safe ? path.join(TEMPLATE_DIR, safe) : null;
}

function referencePath(name) {
  const safe = safeName(name);
  return safe ? path.join(REFERENCE_DIR, safe) : null;
}

function readStore() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return {}; }
}

function writeStore(store) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, { ok: true });
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/api/docx/state/health') return send(res, 200, { ok: true });

  if (url.pathname === '/api/docx/templates' && req.method === 'GET') {
    const files = fs.readdirSync(TEMPLATE_DIR)
      
      .map(f => ({ name: f, size: fs.statSync(path.join(TEMPLATE_DIR, f)).size }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return send(res, 200, { ok: true, files });
  }

  if (url.pathname === '/api/docx/templates' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const files = Array.isArray(payload.files) ? payload.files : [];
        let saved = 0;
        for (const file of files) {
          const fp = templatePath(file.name);
          if (!fp || typeof file.base64 !== 'string') continue;
          fs.writeFileSync(fp, Buffer.from(file.base64, 'base64'));
          saved += 1;
        }
        send(res, 200, { ok: true, saved });
      } catch { send(res, 400, { ok: false, error: 'bad_json' }); }
    });
    return;
  }

  if (url.pathname === '/api/docx/references' && req.method === 'GET') {
    const files = fs.readdirSync(REFERENCE_DIR)
      .map(f => ({ name: f, size: fs.statSync(path.join(REFERENCE_DIR, f)).size }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return send(res, 200, { ok: true, files });
  }

  if (url.pathname === '/api/docx/reference-raw' && req.method === 'POST') {
    const fp = referencePath(url.searchParams.get('name'));
    if (!fp) return send(res, 400, { ok: false, error: 'bad_name' });
    const tmp = fp + '.uploading';
    let size = 0;
    const out = fs.createWriteStream(tmp);
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        out.destroy();
        fs.rmSync(tmp, { force: true });
        send(res, 413, { ok: false, error: 'too_large', maxBytes: MAX_BODY });
        req.destroy();
      }
    });
    req.pipe(out);
    out.on('finish', () => {
      if (res.writableEnded) return;
      if (size === 0) {
        fs.rmSync(tmp, { force: true });
        return send(res, 400, { ok: false, error: 'empty_file' });
      }
      fs.renameSync(tmp, fp);
      send(res, 200, { ok: true, saved: 1, size });
    });
    out.on('error', err => {
      fs.rmSync(tmp, { force: true });
      if (!res.writableEnded) send(res, 500, { ok: false, error: err.message });
    });
    return;
  }

  if (url.pathname === '/api/docx/references' && req.method === 'POST') {
    let body = '';
    let tooLarge = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) {
        tooLarge = true;
        send(res, 413, { ok: false, error: 'too_large', maxBytes: MAX_BODY });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge || res.writableEnded) return;
      try {
        const payload = JSON.parse(body || '{}');
        const files = Array.isArray(payload.files) ? payload.files : [];
        let saved = 0;
        for (const file of files) {
          const fp = referencePath(file.name);
          if (!fp || typeof file.base64 !== 'string') continue;
          const buf = Buffer.from(file.base64, 'base64');
          if (buf.length === 0) continue;
          fs.writeFileSync(fp, buf);
          saved += 1;
        }
        send(res, 200, { ok: true, saved });
      } catch { send(res, 400, { ok: false, error: 'bad_json' }); }
    });
    return;
  }

  if (url.pathname === '/api/docx/profiles' && req.method === 'GET') {
    const profiles = fs.readdirSync(PROFILE_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.basename(f, '.json'))
      .sort();
    return send(res, 200, { ok: true, profiles });
  }

  if (url.pathname === '/api/docx/profile' && req.method === 'GET') {
    const fp = profilePath(url.searchParams.get('name'));
    if (!fp) return send(res, 400, { ok: false, error: 'bad_name' });
    try { return send(res, 200, JSON.parse(fs.readFileSync(fp, 'utf8'))); }
    catch { return send(res, 404, { ok: false, error: 'not_found' }); }
  }

  if (url.pathname === '/api/docx/profile' && req.method === 'POST') {
    const fp = profilePath(url.searchParams.get('name'));
    if (!fp) return send(res, 400, { ok: false, error: 'bad_name' });
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > MAX_BODY) req.destroy(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!payload || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
          return send(res, 400, { ok: false, error: 'bad_state' });
        }
        fs.writeFileSync(fp, JSON.stringify({ ok: true, state: payload.state, updatedAt: new Date().toISOString() }, null, 2));
        send(res, 200, { ok: true });
      } catch { send(res, 400, { ok: false, error: 'bad_json' }); }
    });
    return;
  }

  if (url.pathname === '/api/docx/profile/delete' && req.method === 'POST') {
    const fp = profilePath(url.searchParams.get('name'));
    if (!fp) return send(res, 400, { ok: false, error: 'bad_name' });
    try { fs.unlinkSync(fp); } catch {}
    return send(res, 200, { ok: true });
  }

  if (url.pathname !== '/api/docx/state') return send(res, 404, { ok: false, error: 'not_found' });
  const key = hashKey(url.searchParams.get('key'));
  if (req.method === 'GET') {
    const row = readStore()[key];
    return send(res, 200, row || { ok: true, state: null, updatedAt: null });
  }
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        if (!payload || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
          return send(res, 400, { ok: false, error: 'bad_state' });
        }
        const store = readStore();
        store[key] = { ok: true, state: payload.state, updatedAt: new Date().toISOString() };
        writeStore(store);
        send(res, 200, { ok: true, updatedAt: store[key].updatedAt });
      } catch {
        send(res, 400, { ok: false, error: 'bad_json' });
      }
    });
    return;
  }
  send(res, 405, { ok: false, error: 'method_not_allowed' });
}).listen(PORT, '127.0.0.1', () => console.log(`docx state api on ${PORT}`));
