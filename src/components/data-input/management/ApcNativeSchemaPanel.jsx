import React, { useMemo, useState } from 'react';
import { Database, Search, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button.jsx';
import { Input } from '../../ui/input.jsx';
import { useToast } from '../../ui/use-toast.js';

const ApcNativeSchemaPanel = ({
  apcNativeSchema,
  setFields,
  setFieldGroups,
  inputData,
  setInputData,
  setTemplates,
  setSelectedTemplateIds,
  onLoadApcBundle
}) => {
  const { toast } = useToast();
  const [groupId, setGroupId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [bundleId, setBundleId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const groups = apcNativeSchema?.profileGroups || [];
  const selectedGroup = useMemo(() => groups.find(g => g.id === groupId) || groups[0] || null, [groups, groupId]);
  const types = selectedGroup?.profileTypes || [];
  const selectedType = useMemo(() => types.find(t => t.id === typeId) || types[0] || null, [types, typeId]);
  const bundles = selectedType?.profileBundles || [];
  const selectedBundle = useMemo(() => bundles.find(b => b.id === bundleId) || bundles[0] || null, [bundles, bundleId]);
  const filteredTemplates = useMemo(() => {
    const docs = selectedBundle?.templates || [];
    const q = search.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(d => (d.name || '').toLowerCase().includes(q) || (d.title || '').toLowerCase().includes(q));
  }, [selectedBundle, search]);

  const loadBundle = async () => {
    if (!selectedBundle) return;
    setLoading(true);
    try {
      const incoming = [];
      for (const doc of selectedBundle.templates || []) {
        const next = { ...doc };
        if (next.path && String(next.path).startsWith('/templates/apc/')) {
          try {
            const res = await fetch(`${next.path}?v=apc-brace-20260525-2215`, { cache: 'no-store' });
            if (res.ok) {
              const blob = await res.blob();
              next.webBuffer = await blob.arrayBuffer();
              next.size = next.webBuffer.byteLength;
            } else {
              next.path = `apc-native:${selectedBundle.id}`;
            }
          } catch {
            next.path = `apc-native:${selectedBundle.id}`;
          }
        }
        incoming.push(next);
      }

      const fields = (selectedBundle.fields || []).map(f => ({ ...f, defaultValue: f.defaultValue ?? '' }));
      const groupsMap = new Map(fields.map(field => [
        field.group,
        { id: field.group, name: field.apcMeta?.groupName || 'Thông tin khác', order: field.apcMeta?.groupOrder ?? 990, source: 'apc-native' }
      ]));

      const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => (a.order ?? 990) - (b.order ?? 990) || a.name.localeCompare(b.name, 'vi'));
      const nextInput = {};
      fields.forEach(field => { nextInput[field.id] = field.defaultValue ?? ''; });
      const nextSelectedIds = new Set(incoming.filter(t => t.webBuffer).map(t => t.id));
      if (onLoadApcBundle) {
        onLoadApcBundle({ fields, fieldGroups: sortedGroups, inputData: nextInput, templates: incoming, selectedTemplateIds: nextSelectedIds });
      } else {
        setFields?.(fields);
        setFieldGroups?.(sortedGroups);
        setInputData?.(nextInput);
        setTemplates?.(incoming);
        setSelectedTemplateIds?.(nextSelectedIds);
      }

      const realDocx = incoming.filter(t => t.webBuffer).length;
      toast({ title: 'Đã nạp hồ sơ APC', description: `${fields.length} trường / ${realDocx}/${incoming.length} mẫu DOCX thật. Chỉ chọn mẫu có nội dung.` });
    } finally {
      setLoading(false);
    }
  };

  if (!apcNativeSchema) return null;

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-emerald-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-600 p-2 text-white"><Database size={20} /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Mẫu hồ sơ APC Native</h3>
            <p className="text-xs text-slate-500">Chọn cấu trúc hồ sơ → nạp trường nhập liệu + mẫu DOCX thật</p>
          </div>
        </div>
        <div className="hidden text-right text-xs text-slate-500 md:block">
          <div>{apcNativeSchema.counts?.groups || 0} nhóm • {apcNativeSchema.counts?.categories || 0} loại</div>
          <div>{apcNativeSchema.counts?.folders || 0} bộ • {apcNativeSchema.counts?.documents || 0} mẫu</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-4">
        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedGroup?.id || ''} onChange={(e) => { setGroupId(e.target.value); setTypeId(''); setBundleId(''); }}>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm" value={selectedType?.id || ''} onChange={(e) => { setTypeId(e.target.value); setBundleId(''); }}>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm lg:col-span-2" value={selectedBundle?.id || ''} onChange={(e) => setBundleId(e.target.value)}>
          {bundles.map(b => <option key={b.id} value={b.id}>{b.name} — {b.fields?.length || 0} trường / {b.templates?.length || 0} mẫu</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 pb-5 lg:grid-cols-[1fr_auto]">
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mẫu trong bộ hồ sơ..." />
          </div>
          <div className="rounded-xl bg-white/70 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">{selectedBundle?.name || 'Chưa chọn bộ hồ sơ'}</div>
            <div className="mt-1">{filteredTemplates.length}/{selectedBundle?.templates?.length || 0} mẫu • {selectedBundle?.fields?.length || 0} trường nhập liệu</div>
            <div className="mt-2 line-clamp-2">Mẫu: {filteredTemplates.slice(0, 6).map(t => t.name).join(' • ') || 'Không có'}</div>
            <div className="mt-1 line-clamp-2">Trường: {(selectedBundle?.fields || []).slice(0, 8).map(f => f.name).join(' • ') || 'Không có'}</div>
          </div>
        </div>
        <div className="flex items-end">
          <Button onClick={loadBundle} disabled={!selectedBundle || loading} className="h-11 bg-emerald-600 px-5 text-white hover:bg-emerald-700">
            <Sparkles size={16} className="mr-2" />{loading ? 'Đang nạp...' : 'Nạp bộ hồ sơ APC'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApcNativeSchemaPanel;
