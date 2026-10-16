// src/components/data-input/ApcDynamicFields.jsx
// (1) ATTRIBUTES DONG: fetch attributes tu API 20246, render them vao form,
// luu vao inputData duoi key apc_<field_key>. Offline (API tat) -> render null.
import React, { useState, useEffect } from 'react';
import { apcApi } from '../../lib/apcApi.js';

export function parseAttrOptions(attr) {
  if (!attr?.options) return [];
  try {
    const v = JSON.parse(attr.options);
    return Array.isArray(v) ? v.map(String) : [];
  } catch { return []; }
}

export function apcAttrKey(attr) {
  return `apc_${attr.field_key}`;
}

export default function ApcDynamicFields({ inputData, onDataChange }) {
  const [attrs, setAttrs] = useState([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const ok = await apcApi.online();
        if (!alive) return;
        setOnline(ok);
        if (!ok) return;
        const list = await apcApi.list('attributes');
        if (alive) setAttrs(Array.isArray(list) ? list : []);
      } catch { if (alive) setOnline(false); }
    })();
    return () => { alive = false; };
  }, []);

  if (!online || attrs.length === 0) return null;

  const set = (key, value) => onDataChange({ ...inputData, [key]: value });

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mt-4">
      <h3 className="text-base font-semibold text-banking-navy mb-1">
        Thuộc tính động từ Quản trị ({attrs.length})
      </h3>
      <p className="text-xs text-gray-400 mb-4">Lưu vào hồ sơ (profiles.data) khi lưu hồ sơ.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
        {attrs.map((a) => {
          const key = apcAttrKey(a);
          const val = inputData?.[key] ?? a.default_value ?? '';
          const req = !!a.required;
          if (a.field_type === 'select') {
            const opts = parseAttrOptions(a);
            return (
              <div key={a.id}>
                <label className="text-sm font-medium text-gray-700">{a.name}{req && ' *'}</label>
                <select className="w-full border rounded px-2 py-1.5 mt-1" value={val} onChange={(e) => set(key, e.target.value)}>
                  <option value="">-- Chọn --</option>
                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          }
          if (a.field_type === 'textarea') {
            return (
              <div key={a.id} className="lg:col-span-3">
                <label className="text-sm font-medium text-gray-700">{a.name}{req && ' *'}</label>
                <textarea className="w-full border rounded px-2 py-1.5 mt-1" rows={2} value={val} onChange={(e) => set(key, e.target.value)} />
              </div>
            );
          }
          const type = a.field_type === 'number' ? 'number' : a.field_type === 'date' ? 'date' : 'text';
          return (
            <div key={a.id}>
              <label className="text-sm font-medium text-gray-700">{a.name}{req && ' *'}</label>
              <input type={type} className="w-full border rounded px-2 py-1.5 mt-1" value={val} required={req} onChange={(e) => set(key, e.target.value)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
