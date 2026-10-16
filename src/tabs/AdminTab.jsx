// src/tabs/AdminTab.jsx — Form builder admin: CRUD thuoc tinh dong (bang attributes)
// + quan ly branches/users. Fallback offline khi API 20246 khong chay.
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, WifiOff, Building2, Users, ListPlus } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { useToast } from '../components/ui/use-toast.js';
import { apcApi } from '../lib/apcApi.js';

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea'];

const emptyAttr = { name: '', field_key: '', field_type: 'text', default_value: '', options: '', branch_id: '', required: 0 };

export default function AdminTab() {
  const { toast } = useToast();
  const [online, setOnline] = useState(false);
  const [tab, setTab] = useState('attributes');
  const [attrs, setAttrs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyAttr);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const ok = await apcApi.online();
      setOnline(ok);
      if (!ok) { setLoading(false); return; }
      const [a, b, u] = await Promise.all([apcApi.list('attributes'), apcApi.list('branches'), apcApi.list('users')]);
      setAttrs(a); setBranches(b); setUsers(u);
    } catch (e) {
      toast({ title: 'Loi tai du lieu', description: String(e.message), variant: 'destructive' });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { reload(); }, [reload]);

  const submitAttr = async () => {
    if (!form.name || !form.field_key) {
      toast({ title: 'Thieu ten / field_key', variant: 'destructive' });
      return;
    }
    const payload = {
      ...form,
      branch_id: form.branch_id === '' ? null : Number(form.branch_id),
      required: form.required ? 1 : 0,
    };
    try {
      if (editingId) await apcApi.update('attributes', editingId, payload);
      else await apcApi.create('attributes', payload);
      toast({ title: editingId ? 'Da cap nhat thuoc tinh' : 'Da them thuoc tinh' });
      setForm(emptyAttr); setEditingId(null); reload();
    } catch (e) {
      toast({ title: 'Loi luu', description: String(e.message), variant: 'destructive' });
    }
  };

  const delAttr = async (id) => {
    if (!window.confirm('Xoa thuoc tinh nay?')) return;
    try { await apcApi.remove('attributes', id); toast({ title: 'Da xoa' }); reload(); }
    catch (e) { toast({ title: 'Loi xoa', description: String(e.message), variant: 'destructive' }); }
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

  return (
    <div className="h-full p-4 overflow-auto space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === 'attributes' ? 'default' : 'outline'} onClick={() => setTab('attributes')}><ListPlus size={14} className="mr-1" /> Thuoc tinh</Button>
        <Button variant={tab === 'branches' ? 'default' : 'outline'} onClick={() => setTab('branches')}><Building2 size={14} className="mr-1" /> Chi nhanh ({branches.length})</Button>
        <Button variant={tab === 'users' ? 'default' : 'outline'} onClick={() => setTab('users')}><Users size={14} className="mr-1" /> Nguoi dung ({users.length})</Button>
        <Button variant="ghost" onClick={reload}><RefreshCw size={14} /></Button>
      </div>

      {tab === 'attributes' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>{editingId ? 'Sua thuoc tinh' : 'Them thuoc tinh'}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div><Label>Ten hien thi *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="So CMND" /></div>
              <div><Label>field_key * (khong dau, cach bang _)</Label><Input value={form.field_key} onChange={(e) => setForm({ ...form, field_key: e.target.value })} placeholder="so_cmnd" /></div>
              <div><Label>Kieu</Label>
                <select className="w-full border rounded px-2 py-1.5" value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value })}>
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Gia tri mac dinh</Label><Input value={form.default_value} onChange={(e) => setForm({ ...form, default_value: e.target.value })} /></div>
              <div><Label>Options (select: JSON ["A","B"])</Label><Input value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} placeholder='["A","B"]' /></div>
              <div><Label>Chi nhanh</Label>
                <select className="w-full border rounded px-2 py-1.5" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
                  <option value="">-- Tat ca --</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.code} - {b.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.required} onChange={(e) => setForm({ ...form, required: e.target.checked ? 1 : 0 })} /> Bat buoc</label>
              <div className="flex gap-2">
                <Button onClick={submitAttr}><Plus size={14} className="mr-1" /> {editingId ? 'Cap nhat' : 'Them'}</Button>
                {editingId && <Button variant="outline" onClick={() => { setForm(emptyAttr); setEditingId(null); }}>Huy</Button>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Danh sach ({attrs.length})</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500"><th>Ten</th><th>Key</th><th>Kieu</th><th></th></tr></thead>
                <tbody>
                  {attrs.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="py-1">{a.name}{a.required ? ' *' : ''}</td>
                      <td className="font-mono text-xs">{a.field_key}</td>
                      <td>{a.field_type}</td>
                      <td className="text-right">
                        <button className="p-1" onClick={() => { setForm({ name: a.name, field_key: a.field_key, field_type: a.field_type, default_value: a.default_value || '', options: a.options || '', branch_id: a.branch_id || '', required: a.required || 0 }); setEditingId(a.id); }} title="Sua"><Pencil size={14} /></button>
                        <button className="p-1 text-red-600" onClick={() => delAttr(a.id)} title="Xoa"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'branches' && (
        <BranchUserList kind="branches" items={branches} reload={reload} />
      )}
      {tab === 'users' && (
        <BranchUserList kind="users" items={users} branches={branches} reload={reload} />
      )}
    </div>
  );
}

function BranchUserList({ kind, items, branches = [], reload }) {
  const { toast } = useToast();
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const add = async () => {
    try {
      if (kind === 'branches') {
        if (!f1 || !f2) return toast({ title: 'Nhap code + ten', variant: 'destructive' });
        await apcApi.create('branches', { code: f1, name: f2 });
      } else {
        if (!f1) return toast({ title: 'Nhap username', variant: 'destructive' });
        await apcApi.create('users', { username: f1, role: f2 || 'staff' });
      }
      setF1(''); setF2(''); reload();
    } catch (e) { toast({ title: 'Loi', description: String(e.message), variant: 'destructive' }); }
  };
  const del = async (id) => {
    if (!window.confirm('Xoa?')) return;
    try { await apcApi.remove(kind, id); reload(); }
    catch (e) { toast({ title: 'Loi xoa', description: String(e.message), variant: 'destructive' }); }
  };
  return (
    <Card>
      <CardHeader><CardTitle>{kind === 'branches' ? 'Chi nhanh / PGD' : 'Nguoi dung'}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input placeholder={kind === 'branches' ? 'Ma (VD PGD02)' : 'Username'} value={f1} onChange={(e) => setF1(e.target.value)} />
          {kind === 'branches'
            ? <Input placeholder="Ten chi nhanh" value={f2} onChange={(e) => setF2(e.target.value)} />
            : <select className="border rounded px-2" value={f2} onChange={(e) => setF2(e.target.value)}><option value="staff">staff</option><option value="manager">manager</option><option value="admin">admin</option></select>}
          <Button onClick={add}><Plus size={14} /></Button>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="py-1 font-mono">#{it.id}</td>
                <td>{kind === 'branches' ? `${it.code} - ${it.name}` : `${it.username} (${it.role})`}</td>
                <td className="text-right"><button className="p-1 text-red-600" onClick={() => del(it.id)}><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
