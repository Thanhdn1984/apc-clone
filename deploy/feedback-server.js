const http = require('http');
const fs = require('fs');
const path = require('path');
const DATA_DIR = '/var/lib/docx-feedback';
const DATA_FILE = path.join(DATA_DIR, 'feedback.jsonl');
fs.mkdirSync(DATA_DIR, { recursive: true });
function send(res, code, data, type='application/json') {
  res.writeHead(code, { 'Content-Type': type + '; charset=utf-8', 'Access-Control-Allow-Origin': 'https://docx.aistacklab.org' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
}
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method === 'POST' && req.url === '/api/feedback') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', () => {
      try {
        const p = JSON.parse(body || '{}');
        const msg = String(p.message || '').trim();
        if (!msg) return send(res, 400, { ok:false, error:'missing_message' });
        const row = {
          ts: new Date().toISOString(),
          name: String(p.name || '').slice(0,120),
          contact: String(p.contact || '').slice(0,160),
          type: String(p.type || 'feedback').slice(0,50),
          message: msg.slice(0,5000),
          ua: String(req.headers['user-agent'] || '').slice(0,300),
          ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].slice(0,80)
        };
        fs.appendFileSync(DATA_FILE, JSON.stringify(row) + '\n');
        send(res, 200, { ok:true });
      } catch (e) { send(res, 400, { ok:false, error:'bad_json' }); }
    });
    return;
  }
  if (req.method === 'GET' && req.url.startsWith('/api/feedback/health')) return send(res, 200, { ok:true });
  send(res, 404, { ok:false, error:'not_found' });
});
server.listen(20244, '127.0.0.1', () => console.log('docx feedback api on 20244'));
