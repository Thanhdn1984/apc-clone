// src/components/ApcLoginGate.jsx
// (4) DANG NHAP PHAN QUYEN: man hinh chon user luc mo app.
// Fetch users tu API 20246, luu user dang nhap vao localStorage (apc_current_user).
// Role admin -> thay AdminTab; staff/manager -> an AdminTab. Offline -> nut "Vào offline".
import React, { useState, useEffect } from 'react';
import { User, WifiOff } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.jsx';
import { apcApi } from '../lib/apcApi.js';

export const APC_USER_KEY = 'apc_current_user';

export function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(APC_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function isAdminUser(u) {
  return u?.role === 'admin';
}

export default function ApcLoginGate({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ok = await apcApi.online();
        if (!alive) return;
        setOnline(ok);
        if (ok) {
          const list = await apcApi.list('users');
          if (alive) {
            setUsers(Array.isArray(list) ? list : []);
            if (list?.length) setSelectedId(String(list[0].id));
          }
        }
      } catch { if (alive) setOnline(false); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const loginAs = (u) => {
    localStorage.setItem(APC_USER_KEY, JSON.stringify(u));
    onLogin?.(u);
  };

  const confirmLogin = () => {
    const u = users.find((x) => String(x.id) === String(selectedId));
    if (u) loginAs(u);
  };

  const loginOffline = () => loginAs({ id: 0, username: 'offline', role: 'staff', offline: true });

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><User size={18} /> Đăng nhập APC Clone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Đang tải danh sách user…</p>
          ) : !online ? (
            <>
              <p className="text-sm text-amber-600 flex items-center gap-1"><WifiOff size={14} /> API 20246 offline — chỉ vào được chế độ offline (ẩn Quản trị).</p>
              <Button className="w-full" onClick={loginOffline}>Vào offline (staff)</Button>
            </>
          ) : (
            <>
              <label className="text-sm font-medium">Chọn người dùng ({users.length})</label>
              <select className="w-full border rounded px-2 py-2" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.username} — {u.role}</option>)}
              </select>
              <Button className="w-full" onClick={confirmLogin} disabled={!selectedId}>Đăng nhập</Button>
              <Button className="w-full" variant="outline" onClick={loginOffline}>Vào offline (staff)</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
