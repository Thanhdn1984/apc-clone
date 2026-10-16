// DocCheckPanel — hiển thị cảnh báo kiểm lỗi hồ sơ (gợi ý, KHÔNG chặn).
// Props: warnings (mảng từ checkProfile), onJump(fieldId) để cuộn tới field.
import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Lightbulb } from 'lucide-react';
import { CHECK_META } from '../../lib/docCheckEngine.js';

const CODE_COLOR = {
  'required-empty': 'border-amber-300 bg-amber-50 text-amber-800',
  'amount-mismatch': 'border-orange-300 bg-orange-50 text-orange-800',
  'date-invalid': 'border-sky-300 bg-sky-50 text-sky-800',
  'missing-docs': 'border-violet-300 bg-violet-50 text-violet-800',
};

export default function DocCheckPanel({ warnings = [], onJump }) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => {
    const c = { all: warnings.length };
    for (const w of warnings) c[w.code] = (c[w.code] || 0) + 1;
    return c;
  }, [warnings]);

  const shown = filter === 'all' ? warnings : warnings.filter((w) => w.code === filter);

  if (warnings.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Hồ sơ ổn — không phát hiện lỗi. Kiểm tra tự động chỉ mang tính gợi ý.</span>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        title="Kết quả kiểm lỗi tự động — chỉ gợi ý, không chặn thao tác"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="text-sm font-semibold text-gray-800">
          Kiểm lỗi hồ sơ: {warnings.length} gợi ý
        </span>
        <span className="text-xs text-gray-400">(không chặn — chỉ gợi ý)</span>
        <span className="ml-auto text-gray-400">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t px-4 py-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label={`Tất cả (${counts.all || 0})`} />
            {Object.keys(CHECK_META).map((code) =>
              counts[code] ? (
                <FilterChip
                  key={code}
                  active={filter === code}
                  onClick={() => setFilter(code)}
                  label={`${CHECK_META[code].label} (${counts[code]})`}
                />
              ) : null,
            )}
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {shown.map((w, i) => (
              <li
                key={`${w.code}-${w.fieldId || 'doc'}-${i}`}
                className={`rounded-lg border px-3 py-2 text-sm ${CODE_COLOR[w.code] || 'border-gray-200 bg-gray-50 text-gray-700'}`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-block rounded bg-white/60 px-1.5 py-0.5 text-[11px] font-semibold">
                    {CHECK_META[w.code]?.label || w.code}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug">{w.message}</p>
                    {w.suggestion && (
                      <p className="mt-1 flex items-start gap-1 text-xs opacity-80">
                        <Lightbulb className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{w.suggestion}</span>
                      </p>
                    )}
                  </div>
                  {w.fieldId && onJump && (
                    <button
                      onClick={() => onJump(w.fieldId)}
                      className="shrink-0 rounded bg-white/70 px-2 py-0.5 text-xs font-medium underline hover:bg-white"
                    >
                      Tới trường
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}
