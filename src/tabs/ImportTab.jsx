// src/tabs/ImportTab.jsx — Import Excel KH: chon .xlsx -> preview -> luu vao profiles
// Dung xlsx (da co san). Khong dung window.electronAPI (web-safe).
import React, { useState } from 'react';
import { Upload, Save, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { useToast } from '../components/ui/use-toast.js';
import { apcApi } from '../lib/apcApi.js';

export default function ImportTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [cols, setCols] = useState([]);
  const [fileName, setFileName] = useState('');
  const [profileType, setProfileType] = useState('thau_chi');
  const [codeCol, setCodeCol] = useState('');
  const [saved, setSaved] = useState(0);
  const [saving, setSaving] = useState(false);

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    const XLSX = (await import('xlsx')).default;
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!json.length) { toast({ title: 'File rong', variant: 'destructive' }); return; }
    const [header, ...body] = json;
    setCols(header.map(String));
    setCodeCol(header[0] ? String(header[0]) : '');
    setRows(body.filter((r) => r.some((c) => c !== '')).map((r) => Object.fromEntries(header.map((h, i) => [String(h), r[i] ?? '']))));
    setSaved(0);
  };

  const saveAll = async () => {
    if (!rows.length || !codeCol) { toast({ title: 'Chon file + cot ma KH', variant: 'destructive' }); return; }
    setSaving(true);
    let ok = 0;
    try {
      for (const r of rows) {
        const code = String(r[codeCol] ?? '').trim();
        if (!code) continue;
        await apcApi.create('profiles', { customer_code: code, profile_type: profileType, data: JSON.stringify(r) });
        ok++;
      }
      setSaved(ok);
      toast({ title: `Da luu ${ok}/${rows.length} ho so` });
    } catch (e) {
      toast({ title: `Luu duoc ${ok} — loi: ${String(e.message)}`, variant: 'destructive' });
      setSaved(ok);
    } finally { setSaving(false); }
  };

  return (
    <div className="h-full p-4 overflow-auto space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet size={18} /> Import Excel khach hang → profiles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div><Label>File .xlsx</Label><Input type="file" accept=".xlsx,.xls" onChange={pickFile} /></div>
            <div><Label>Loai ho so</Label>
              <select className="border rounded px-2 py-1.5 ml-2" value={profileType} onChange={(e) => setProfileType(e.target.value)}>
                <option value="thau_chi">Thau chi</option>
                <option value="tin_chap">Tin chap</option>
                <option value="the_chap">The chap</option>
                <option value="bao_lanh">Bao lanh</option>
                <option value="khac">Khac</option>
              </select>
            </div>
            <div><Label>Cot ma KH</Label>
              <select className="border rounded px-2 py-1.5 ml-2" value={codeCol} onChange={(e) => setCodeCol(e.target.value)}>
                {cols.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Button onClick={saveAll} disabled={!rows.length || saving}><Save size={14} className="mr-1" /> {saving ? 'Dang luu...' : `Luu ${rows.length} dong`}</Button>
          </div>
          {fileName && <p className="text-sm text-gray-600">{fileName}: {rows.length} dong{saved ? ` — da luu ${saved}` : ''}</p>}
        </CardContent>
      </Card>

      {!!rows.length && (
        <Card>
          <CardHeader><CardTitle>Preview (10 dong dau)</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <table className="text-xs border-collapse">
              <thead><tr>{cols.map((c) => <th key={c} className="border px-2 py-1 bg-gray-100">{c}</th>)}</tr></thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i}>{cols.map((c) => <td key={c} className="border px-2 py-1">{String(r[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
