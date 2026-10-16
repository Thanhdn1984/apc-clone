// ============================================================================
// docCheckEngine.js — "AI" kiểm lỗi hồ sơ (JS thuần, không gọi API ngoài)
// Nguyên tắc: CHỈ CẢNH BÁO, KHÔNG CHẶN. Trả về danh sách warnings để UI gợi ý.
// Các nhóm kiểm tra:
//   1. required-empty  — trường bắt buộc (required) đang trống
//   2. amount-mismatch — số tiền (số) ≠ diễn giải bằng chữ (so với DocSo)
//   3. date-invalid    — ngày tháng vô lý (sai định dạng, tương lai bất hợp lý,
//                        hết hạn trước hiệu lực, tuổi < 0 hoặc > 120)
//   4. missing-docs    — thiếu giấy tờ theo loại hồ sơ / loại khách hàng
// ============================================================================

import { DocSo } from './utils.js';

export const CHECK_LEVEL = 'warning'; // mọi cảnh báo đều là gợi ý, không chặn

// --- Chuẩn hoá chuỗi tiếng Việt để so sánh số-tiền-bằng-chữ ----------------
// Bỏ hậu tố tiền tệ, dấu câu, khoảng trắng thừa, viết thường, gom "mươi/mười".
export function normalizeWords(s) {
  if (s === null || s === undefined) return '';
  let t = String(s).toLowerCase().trim();
  // Bỏ hậu tố tiền tệ thường gặp
  t = t.replace(/(việt nam đồng|vnđ|vnd|đồng|dong)\.?/g, '');
  // "nghìn đồng chẵn", "chẵn" ở cuối
  t = t.replace(/\bchẵn\b/g, '');
  // Chuẩn hoá dấu câu thành khoảng trắng
  t = t.replace(/[.,;:!?\-_/()"]/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

// Parse số từ giá trị field (currency/number có thể là string format "1.000.000")
export function parseAmount(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s) return null;
  // Format vi-VN: "1.234.567,89" → 1234567.89 ; format en: "1,234,567.89"
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // vi
    } else {
      s = s.replace(/,/g, ''); // en
    }
  } else if (hasComma && !hasDot) {
    // "100,5" → 100.5 ; "1,000" (nghìn) → 1000 nếu 3 số sau phẩy
    const parts = s.split(',');
    s = parts.length === 2 && parts[1].length <= 2
      ? parts[0].replace(/\./g, '') + '.' + parts[1]
      : s.replace(/,/g, '');
  } else {
    s = s.replace(/\s/g, '');
    if (hasDot) {
      const frac = s.split('.').pop();
      // "1.000.000" → bỏ hết chấm; "100.50" → giữ
      s = frac && frac.length === 3 && (s.match(/\./g) || []).length > 1
        ? s.replace(/\./g, '')
        : s;
      if ((s.match(/\./g) || []).length === 1 && frac.length === 3 && s.length > 4) {
        // mơ hồ ("1.000") → coi là phân cách nghìn
        s = s.replace('.', '');
      }
    }
  }
  s = s.replace(/[^0-9.\-]/g, '');
  if (!s || s === '-' || s === '.') return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Parse ngày: hỗ trợ yyyy-mm-dd (input date), dd/mm/yyyy, dd-mm-yyyy
export function parseDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const s = String(v).trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isValidYMD(d, +m[1], +m[2], +m[3]) ? d : 'INVALID';
  }
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return isValidYMD(d, +m[3], +m[2], +m[1]) ? d : 'INVALID';
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? 'INVALID' : d;
}

function isValidYMD(d, y, mo, da) {
  return d.getFullYear() === y && d.getMonth() === mo - 1 && d.getDate() === da;
}

const isEmpty = (v) =>
  v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0);

function warn(code, fieldId, fieldName, message, suggestion) {
  return { code, level: CHECK_LEVEL, fieldId, fieldName, message, suggestion };
}

// --- 1. Trường bắt buộc trống ------------------------------------------------
function checkRequired(fields, inputData) {
  const out = [];
  for (const f of fields || []) {
    if (!f.required || f.formula) continue; // field công thức tự tính, bỏ qua
    if (f.type === 'list') {
      const rows = inputData?.[f.id];
      if (!rows || rows.length === 0) {
        // list rỗng: chỉ cảnh báo nhẹ, vì nhiều list là tuỳ chọn
        continue;
      }
    } else if (isEmpty(inputData?.[f.id])) {
      out.push(warn(
        'required-empty', f.id, f.name,
        `“${f.name}” là trường bắt buộc nhưng đang trống.`,
        `Nhập giá trị cho “${f.name}” trước khi sinh hồ sơ.`,
      ));
    }
  }
  return out;
}

// --- 2. Số tiền (số) ≠ bằng chữ ---------------------------------------------
// Tìm cặp: field text có formula NUMBER_TO_VIETNAMESE(X) → so với DocSo(X).
// Fallback: field tên chứa "bằng chữ" ghép với field tiền gần nhất cùng group.
function findAmountPairs(fields) {
  const pairs = [];
  const byId = new Map((fields || []).map((f) => [f.id, f]));
  const used = new Set();
  for (const f of fields || []) {
    const m = typeof f.formula === 'string' &&
      f.formula.match(/NUMBER_TO_VIETNAMESE\s*\(\s*([A-Za-z0-9_]+)/i);
    if (m && byId.has(m[1])) {
      pairs.push({ amountField: byId.get(m[1]), wordsField: f });
      used.add(f.id);
    }
  }
  // Fallback theo tên: "*bằng chữ*" + field currency/number cùng group
  const norm = (s) => (s || '').toLowerCase();
  for (const f of fields || []) {
    if (used.has(f.id) || f.formula) continue;
    if (f.type !== 'text' && f.type !== 'longtext') continue;
    if (!norm(f.name).includes('bằng chữ')) continue;
    const base = norm(f.name).replace('bằng chữ', '').trim();
    const cand = (fields || []).find((g) =>
      (g.type === 'currency' || g.type === 'number') &&
      g.group === f.group &&
      (base === '' || norm(g.name).includes(base) || base.includes(norm(g.name).split('(')[0].trim())));
    if (cand) {
      pairs.push({ amountField: cand, wordsField: f });
      used.add(f.id);
    }
  }
  return pairs;
}

function checkAmountMismatch(fields, inputData) {
  const out = [];
  for (const { amountField, wordsField } of findAmountPairs(fields)) {
    const amount = parseAmount(inputData?.[amountField.id]);
    const typed = inputData?.[wordsField.id];
    if (amount === null || amount === 0) continue; // chưa nhập số → không so
    if (isEmpty(typed)) continue; // field công thức tự điền; nếu user xoá mới tính
    // Chỉ so khi người dùng tự gõ chữ (khác kết quả công thức) — nếu trùng thì OK
    let expected = '';
    try { expected = DocSo(amount); } catch { expected = ''; }
    if (!expected) continue;
    if (normalizeWords(typed) !== normalizeWords(expected)) {
      out.push(warn(
        'amount-mismatch', wordsField.id, wordsField.name,
        `Số tiền bằng số (${Number(amount).toLocaleString('vi-VN')}) không khớp chữ đã nhập (“${typed}”).`,
        `Chữ đúng gợi ý: “${expected}”. Sao chép nếu đồng ý — chỉ là gợi ý, không bắt buộc.`,
      ));
    }
  }
  return out;
}

// --- 3. Ngày tháng vô lý ------------------------------------------------------
const BIRTH_KEYS = ['ngay_sinh', 'birth', 'ngay_sinh_', 'nam_sinh'];
const ISSUE_KEYS = ['ngay_cap', 'ngay_mo', 'ngay_hieu_luc', 'ngay_phe_duyet', 'ngay_cong_chung', 'ngay_ky'];
const EXPIRY_KEYS = ['ngay_het_han', 'ngay_dao_han', 'ngay_hieu_luc'];

function checkDates(fields, inputData) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateFields = (fields || []).filter((f) => f.type === 'date');
  const valOf = (f) => inputData?.[f.id];

  for (const f of dateFields) {
    const raw = valOf(f);
    if (isEmpty(raw)) continue;
    const d = parseDate(raw);
    if (d === 'INVALID') {
      out.push(warn('date-invalid', f.id, f.name,
        `“${f.name}” có giá trị ngày không hợp lệ (“${raw}”).`,
        'Nhập lại theo định dạng ngày-tháng-năm (vd 15/08/2024).'));
      continue;
    }
    const id = (f.id || '').toLowerCase();
    const nm = (f.name || '').toLowerCase();
    const key = id + ' ' + nm;
    const isBirth = BIRTH_KEYS.some((k) => key.includes(k));
    const isPastLike = isBirth || ISSUE_KEYS.some((k) => key.includes(k));

    if (d > today && isPastLike) {
      out.push(warn('date-invalid', f.id, f.name,
        `“${f.name}” là ngày trong tương lai (${d.toLocaleDateString('vi-VN')}) — vô lý với ngày sinh/ngày cấp.`,
        'Kiểm tra lại ngày đã nhập.'));
      continue;
    }
    if (isBirth) {
      const age = (today - d) / (365.25 * 24 * 3600 * 1000);
      if (age > 120) {
        out.push(warn('date-invalid', f.id, f.name,
          `Ngày sinh cho tuổi trên 120 (${d.toLocaleDateString('vi-VN')}) — có thể nhầm năm.`,
          'Kiểm tra lại năm sinh.'));
      } else if (age < 14) {
        out.push(warn('date-invalid', f.id, f.name,
          `Chủ thể chưa đủ 14 tuổi (sinh ${d.toLocaleDateString('vi-VN')}) — cần người đại diện/giám hộ.`,
          'Bổ sung giấy tờ của người đại diện hợp pháp.'));
      }
    }
  }

  // Cặp hiệu lực → hết hạn: tìm trong cùng group hoặc theo tên
  const eff = dateFields.find((f) => (f.id + ' ' + f.name).toLowerCase().includes('ngay_hieu_luc'));
  const exp = dateFields.find((f) => {
    const k = (f.id + ' ' + f.name).toLowerCase();
    return k.includes('ngay_het_han') || k.includes('ngay_dao_han');
  });
  if (eff && exp && !isEmpty(valOf(eff)) && !isEmpty(valOf(exp))) {
    const d1 = parseDate(valOf(eff));
    const d2 = parseDate(valOf(exp));
    if (d1 && d1 !== 'INVALID' && d2 && d2 !== 'INVALID' && d2 < d1) {
      out.push(warn('date-invalid', exp.id, exp.name,
        `Ngày hết hạn (${d2.toLocaleDateString('vi-VN')}) trước ngày hiệu lực (${d1.toLocaleDateString('vi-VN')}).`,
        'Kiểm tra lại thời hạn / ngày hiệu lực.'));
    }
  }
  return out;
}

// --- 4. Thiếu giấy tờ theo loại hồ sơ ----------------------------------------
// Suy luận loại hồ sơ từ prefix field id (tc_/cc_/cn_) + loại KH, rồi đối chiếu
// các field chứng cứ đã có. Thiếu → gợi ý bổ sung (không chặn).
function detectProfile(fields, inputData) {
  const ids = (fields || []).map((f) => f.id || '');
  let kind = 'chung';
  if (ids.some((i) => i.startsWith('cc_'))) kind = 'cam_co';
  else if (ids.some((i) => i.startsWith('tc_'))) kind = 'thau_chi';
  else if (ids.some((i) => i.startsWith('cn_'))) kind = 'tin_chap';
  const hay = JSON.stringify(inputData || {}).toLowerCase() + ' ' +
    (fields || []).map((f) => `${f.id} ${f.name}`.toLowerCase()).join(' ');
  const isOrg = /tổ chức|doanh nghiệp|công ty|loại khách hàng[^"]*"[^"]*(tổ|doanh|công)/.test(hay) ||
    /"tc_loai_khach_hang"\s*:\s*"[^"]*(tổ chức|doanh nghiệp|công ty)/i.test(JSON.stringify(inputData || {}));
  return { kind, isOrg };
}

function hasValue(inputData, ...ids) {
  return ids.some((id) => !isEmpty(inputData?.[id]));
}

function checkMissingDocs(fields, inputData) {
  const out = [];
  const { kind, isOrg } = detectProfile(fields, inputData);
  const push = (docName, hint) => out.push({
    code: 'missing-docs', level: CHECK_LEVEL, fieldId: null,
    fieldName: 'Giấy tờ', message: `Thiếu giấy tờ gợi ý: ${docName}.`, suggestion: hint,
  });

  // Định danh KH: CCCD (cá nhân) hoặc GPKD/MST (tổ chức)
  const idFields = (fields || []).filter((f) =>
    /cccd|cmnd|mst|gpkd|giấy phép|đăng ký kinh doanh/i.test(`${f.id} ${f.name}`));
  const hasId = idFields.some((f) => !isEmpty(inputData?.[f.id]));
  if (!hasId) {
    push(isOrg ? 'GPKD / MST của tổ chức' : 'CCCD/CMND của khách hàng',
      'Bổ sung số giấy tờ định danh ở nhóm thông tin khách hàng.');
  }

  // Thu nhập / phương án trả nợ
  const incomeFields = (fields || []).filter((f) =>
    /thu_nhap|thu nhập|lương|phương án|phuong_an|tra_no|trả nợ|muc_dich|mục đích/i.test(`${f.id} ${f.name}`));
  if (incomeFields.length > 0 && !incomeFields.some((f) => !isEmpty(inputData?.[f.id]))) {
    push('Chứng minh thu nhập / phương án trả nợ',
      'Bổ sung sao kê lương, HĐLĐ hoặc phương án sử dụng vốn.');
  }

  // TSĐB: khai "Có" nhưng danh sách trống
  const coTsdb = (fields || []).find((f) => /co_tsdb|có.*tài sản|tai_san_dam_bao/i.test(`${f.id} ${f.name}`) && f.type !== 'list');
  const listTsdb = (fields || []).find((f) => f.type === 'list' && /tsdb|tai_san|tài sản|dam_bao|đảm bảo/i.test(`${f.id} ${f.name}`));
  if (coTsdb && listTsdb) {
    const flag = String(inputData?.[coTsdb.id] || '').toLowerCase();
    const rows = inputData?.[listTsdb.id];
    if (/có|yes|true|1/.test(flag) && (!rows || rows.length === 0)) {
      push('Hồ sơ tài sản đảm bảo (GCN, HĐ thế chấp, định giá)',
        'Đã khai “Có TSĐB” nhưng danh sách tài sản đang trống — thêm dòng tài sản.');
    }
  }
  if (kind === 'cam_co' && listTsdb && (!inputData?.[listTsdb.id] || inputData[listTsdb.id].length === 0)) {
    push('Sổ tiết kiệm / GCNQSDĐ cầm cố',
      'Hồ sơ cầm cố cần ít nhất một tài sản (sổ TK, GCN) trong danh sách.');
  }

  // Phê duyệt: người phê duyệt + ngày phê duyệt
  const approver = (fields || []).find((f) => /phe_duyet|phê duyệt/i.test(`${f.id} ${f.name}`) && /nguoi|người|ten|tên/i.test(`${f.id} ${f.name}`));
  if (approver && isEmpty(inputData?.[approver.id])) {
    push('Chữ ký / quyết định phê duyệt',
      'Bổ sung người phê duyệt và ngày phê duyệt trước khi trình ký.');
  }
  return out;
}

// --- API chính ----------------------------------------------------------------
export function checkProfile(fields, inputData) {
  return [
    ...checkRequired(fields, inputData),
    ...checkAmountMismatch(fields, inputData),
    ...checkDates(fields, inputData),
    ...checkMissingDocs(fields, inputData),
  ];
}

// Gom theo field để highlight inline dưới ô nhập
export function groupWarningsByField(warnings) {
  const map = {};
  for (const w of warnings || []) {
    if (!w.fieldId) continue;
    (map[w.fieldId] = map[w.fieldId] || []).push(w);
  }
  return map;
}

export const CHECK_META = {
  'required-empty': { label: 'Thiếu bắt buộc', icon: '●' },
  'amount-mismatch': { label: 'Lệch số ↔ chữ', icon: '●' },
  'date-invalid': { label: 'Ngày vô lý', icon: '●' },
  'missing-docs': { label: 'Thiếu giấy tờ', icon: '●' },
};
