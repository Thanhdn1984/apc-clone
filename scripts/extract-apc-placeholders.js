#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const root = process.cwd();
const dir = path.join(root, 'public/templates/apc');
const out = path.join(dir, 'placeholders.json');
const result = {};
const re = /\[([^\[\]]{1,120})\]/g;
for (const file of fs.readdirSync(dir)) {
  if (!file.toLowerCase().endsWith('.docx')) continue;
  const fileId = file.split('__')[0];
  try {
    const zip = new AdmZip(path.join(dir, file));
    const names = zip.getEntries().map(e=>e.entryName).filter(n => /^word\/(document|header\d+|footer\d+)\.xml$/.test(n));
    const set = new Set();
    for (const n of names) {
      const xml = zip.readAsText(n);
      let m; while ((m = re.exec(xml))) {
        const tag = m[1].replace(/<[^>]+>/g,'').trim();
        if (tag && !/^\d+$/.test(tag)) set.add(tag);
      }
    }
    result[fileId] = Array.from(set).sort((a,b)=>a.localeCompare(b,'vi'));
  } catch (e) {
    result[fileId] = [];
  }
}
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), count: Object.keys(result).length, byFileId: result }, null, 2));
console.log(JSON.stringify({ out, count: Object.keys(result).length }, null, 2));
