// src/components/data-input/ApcProfileSearch.jsx
// (2) TIM KIEM HO SO: tim theo customer_code qua GET /api/profiles/search?q=,
// list ket qua + Xem (nap data vao form) + Xoa (DELETE /api/profiles/:id).
import React, { useState } from 'react';
import { Search, Trash2, Eye, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { useToast } from '../ui/use-toast.js';
import { apcApi } from '../../lib/apcApi.js';

export default function ApcProfileSearch({ onLoadProfile, inputData }) {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [saveCode, setSaveCode] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Luu ho so hien tai (form + thuoc tinh dong apc_*) len server profiles.data
  const saveCurrentProfile = async () => {
    const code = (saveCode || inputData?.customer_code || '').trim();
    if (!code) {
      toast({ title: 'Nhập mã KH để lưu', variant: 'destructive' });
      return;
    }
    try {
      const me = JSON.parse(localStorage.getItem('apc_current_user') || 'null');
      await apcApi.create('profiles', {
        customer_code: code,
        profile_type: 'thau_chi',
        data: JSON.stringify(inputData || {}),
        created_by: me?.id || null,
      });
      toast({ title: `Đã lưu hồ sơ ${code} lên server` });
      setSaveCode('');
    } catch (e) {
      toast({ title: 'Lỗi lưu hồ sơ', description: `${String(e.message)} (API 20246 có chạy?)`, variant: 'destructive' });
    }
  };

  const doSearch = async () => {
    if (!q.trim()) {
      toast({ title: 'Nhập mã khách hàng cần tìm', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const rows = await apcApi.searchProfiles(q.trim());
      setResults(Array.isArray(rows) ? rows : []);
      setSearched(true);
    } catch (e) {
      toast({ title: 'Lỗi tìm kiếm', description: `${String(e.message)} (API 20246 có chạy?)`, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const viewProfile = (row) => {
    let data = {};
    try { data = JSON.parse(row.data || '{}'); } catch { data = {}; }
    onLoadProfile?.(data, row);
    toast({ title: `Đã nạp hồ sơ ${row.customer_code}` });
  };

  const deleteProfile = async (row) => {
    if (!window.confirm(`Xóa hồ sơ ${row.customer_code}?`)) return;
    try {
      await apcApi.remove('profiles', row.id);
      setResults((prev) => prev.filter((r) => r.id !== row.id));
      toast({ title: 'Đã xóa hồ sơ' });
    } catch (e) {
      toast({ title: 'Lỗi xóa', description: String(e.message), variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-4">
      <h3 className="text-base font-semibold text-banking-navy mb-3">Tìm hồ sơ theo mã KH</h3>
      <div className="flex gap-2 mb-2">
        <Input
          placeholder="Mã KH để lưu hồ sơ hiện tại"
          value={saveCode}
          onChange={(e) => setSaveCode(e.target.value)}
        />
        <Button variant="outline" onClick={saveCurrentProfile}>Lưu hồ sơ hiện tại</Button>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nhập customer_code (VD KH001)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
        />
        <Button onClick={doSearch} disabled={loading}>
          {loading ? <RefreshCw size={14} className="animate-spin mr-1" /> : <Search size={14} className="mr-1" />}
          Tìm
        </Button>
      </div>
      {searched && (
        <div className="mt-3">
          <p className="text-sm text-gray-500 mb-2">Tìm thấy {results.length} hồ sơ</p>
          {results.length === 0 ? (
            <p className="text-sm text-gray-400">Không có hồ sơ nào khớp “{q}”.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th>Mã KH</th><th>Loại</th><th>Ngày tạo</th><th></th></tr></thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1 font-mono">{r.customer_code}</td>
                    <td>{r.profile_type}</td>
                    <td className="text-xs text-gray-500">{r.created_at}</td>
                    <td className="text-right whitespace-nowrap">
                      <button className="p-1 text-blue-600" title="Xem / nạp vào form" onClick={() => viewProfile(r)}><Eye size={15} /></button>
                      <button className="p-1 text-red-600" title="Xóa" onClick={() => deleteProfile(r)}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
