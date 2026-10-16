// src/tabs/ApprovalTab.jsx — Tab Duyet ho so nhieu cap + Dashboard.
// Luong: draft -> submit (mo cap 1 Trinh) -> duyet L1 -> L2 Kiem soat -> L3 Phe duyet.
// Hien dashboard dem ho so theo trang thai + hang doi pending moi cap,
// danh sach ho so (loc theo status), chi tiet lich su duyet tung ho so.
import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Send, RefreshCw, WifiOff, ClipboardCheck, BarChart3, History } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { useToast } from '../components/ui/use-toast.js';
import { apcApi } from '../lib/apcApi.js';
import { loadCurrentUser } from '../components/ApcLoginGate.jsx';

export const LEVELS = [
  { level: 1, name: 'Trinh', role: 'staff' },
  { level: 2, name: 'Kiem soat', role: 'manager' },
  { level: 3, name: 'Phe duyet', role: 'admin/manager' },
];

const STATUS_LABEL = { draft: 'Nhap', in_review: 'Cho duyet', approved: 'Da duyet', rejected: 'Tu choi' };
const STATUS_COLOR = {
  draft: 'bg-gray-200 text-gray-700',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

export default function ApprovalTab() {
  const { toast } = useToast();
  const me = loadCurrentUser()?.username || '';
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dash, setDash] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [chain, setChain] = useState([]);
  const [note, setNote] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await apcApi.online();
      setOnline(ok);
      if (!ok) { setLoading(false); return; }
      const [d, list] = await Promise.all([apcApi.dashboard(), apcApi.list('profiles')]);
      setDash(d);
      setProfiles(Array.isArray(list) ? list : []);
    } catch (e) {
      toast({ title: 'Loi tai du lieu duyet', description: String(e.message), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  const openDetail = async (p) => {
    setSelected(p);
    setNote('');
    try {
      setChain(await apcApi.profileApprovals(p.id));
    } catch (e) {
      toast({ title: 'Loi tai lich su duyet', description: String(e.message), variant: 'destructive' });
      setChain([]);
    }
  };

  const doSubmit = async (p) => {
    try {
      const r = await apcApi.submitProfile(p.id, me);
      setChain(r.chain || []);
      toast({ title: `Da trinh duyet ho so #${p.id}` });
      reload();
    } catch (e) {
      toast({ title: 'Loi trinh duyet', description: String(e.message), variant: 'destructive' });
    }
  };

  const doDecide = async (approvalId, decision) => {
    try {
      const r = await apcApi.decideApproval(approvalId, decision, me, note);
      setChain(r.chain || []);
      setNote('');
      toast({ title: decision === 'approved' ? 'Da duyet' : 'Da tu choi' });
      reload();
      if (selected) {
        try { setProfiles(await apcApi.list('profiles')); } catch {}
      }
    } catch (e) {
      toast({ title: 'Loi duyet', description: String(e.message), variant: 'destructive' });
    }
  };

  if (!online && !loading) {
    return (
      <div className="h-full p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><WifiOff size={18} /> Backend offline</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">Chua ket noi API 127.0.0.1:20246. Chay <code>node server/api.js</code> roi bam tai lai.</p>
            <Button onClick={reload}><RefreshCw size={14} className="mr-1" /> Thu lai</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visible = filter === 'all' ? profiles : profiles.filter((p) => (p.status || 'draft') === filter);

  return (
    <div className="h-full p-4 overflow-auto space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2"><ClipboardCheck size={18} /> Duyet ho so</h2>
        <span className="text-sm text-gray-500">({me || 'offline'})</span>
        <Button variant="ghost" size="sm" onClick={reload}><RefreshCw size={14} /></Button>
      </div>

      {/* Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <DashCard icon={<BarChart3 size={16} />} label="Tong ho so" value={dash?.total ?? '-'} />
        {['draft', 'in_review', 'approved', 'rejected'].map((s) => (
          <DashCard key={s} label={STATUS_LABEL[s]} value={dash?.byStatus?.[s] ?? '-'} tone={STATUS_COLOR[s]} onClick={() => setFilter(filter === s ? 'all' : s)} active={filter === s} />
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Hang doi cho duyet theo cap</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <span key={l.level} className="px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-sm">
                Cap {l.level} {l.name}: <b>{dash?.pendingByLevel?.[l.level] ?? '-'}</b> cho
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Danh sach ho so */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ho so ({visible.length}/{profiles.length})</CardTitle>
            <div className="flex gap-1 flex-wrap mt-2">
              {[['all', 'Tat ca'], ['draft', 'Nhap'], ['in_review', 'Cho duyet'], ['approved', 'Da duyet'], ['rejected', 'Tu choi']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} className={`px-2 py-1 text-xs rounded ${filter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{l}</button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={`border-t cursor-pointer hover:bg-gray-50 ${selected?.id === p.id ? 'bg-blue-50' : ''}`} onClick={() => openDetail(p)}>
                    <td className="py-1.5 font-mono">#{p.id}</td>
                    <td>{p.customer_code}<div className="text-xs text-gray-400">{p.profile_type}</div></td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[p.status || 'draft']}`}>{STATUS_LABEL[p.status || 'draft']}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visible.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">Chua co ho so.</p>}
          </CardContent>
        </Card>

        {/* Chi tiet + lich su */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-1"><History size={14} /> {selected ? `Ho so #${selected.id} — ${selected.customer_code}` : 'Chon 1 ho so de xem lich su'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {selected && (
              <>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[selected.status || 'draft']}`}>{STATUS_LABEL[selected.status || 'draft']}</span>
                  {(selected.status === 'draft' || selected.status === 'rejected' || !selected.status) && (
                    <Button size="sm" onClick={() => doSubmit(selected)}><Send size={13} className="mr-1" /> Trinh duyet</Button>
                  )}
                </div>
                <ol className="space-y-2">
                  {LEVELS.map((l) => {
                    const a = chain.find((x) => x.level === l.level);
                    return (
                      <li key={l.level} className="border rounded p-2 text-sm">
                        <div className="flex items-center justify-between">
                          <b>Cap {l.level} — {l.name}</b>
                          {a ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'approved' ? 'bg-green-100 text-green-800' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
                              {a.status === 'approved' ? 'Da duyet' : a.status === 'rejected' ? 'Tu choi' : 'Cho duyet'}
                            </span>
                          ) : <span className="text-xs text-gray-400">chua toi luot</span>}
                        </div>
                        {a && (
                          <div className="text-xs text-gray-500 mt-1">
                            {a.approver && <span>Nguoi duyet: <b>{a.approver}</b> · </span>}
                            {a.decided_at && <span>{a.decided_at}</span>}
                            {a.note && <div className="text-gray-700 mt-0.5">Ghi chu: {a.note}</div>}
                          </div>
                        )}
                        {a?.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => doDecide(a.id, 'approved')}><CheckCircle size={13} className="mr-1" /> Duyet</Button>
                            <Button size="sm" variant="destructive" onClick={() => doDecide(a.id, 'rejected')}><XCircle size={13} className="mr-1" /> Tu choi</Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <div>
                  <label className="text-xs text-gray-500">Ghi chu duyet (ap dung cho lan Duyet/Tu choi ke tiep)</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Da doi chieu CMND, OK" />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashCard({ label, value, tone, icon, onClick, active }) {
  return (
    <button onClick={onClick} className={`rounded border p-3 text-left hover:shadow ${active ? 'ring-2 ring-blue-500' : ''} ${tone?.includes('bg-') ? '' : 'bg-white'}`}>
      <div className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </button>
  );
}
