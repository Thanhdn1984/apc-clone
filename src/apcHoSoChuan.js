// src/apcHoSoChuan.js — BỘ HỒ SƠ CHUẨN DUY NHẤT theo APC Enter gốc.
// Nguồn: APC_WORKFLOW.md §3-4 (bên vay 14 trường + khoản vay 10 trường, nguyên tên [...]).
// APC gốc: 1 quy trình chung mọi loại vay. Phân loại TS = mã DS, không phải mẫu riêng.
// Mã DS: TV (thành viên), STK (sổ tiết kiệm), SD (tài sản), DS (tài sản), NLQ (người liên quan).

export const APC_FIELD_GROUPS = [
  { id: 'ben_vay', name: 'Bên vay' },
  { id: 'khoan_vay', name: 'Khoản vay' },
  { id: 'ds_tv', name: 'Danh sách thành viên (TV)' },
  { id: 'ds_stk', name: 'Sổ tiết kiệm (STK)' },
  { id: 'ds_sd', name: 'Tài sản (SĐ)' },
  { id: 'ds_ds', name: 'Tài sản (ĐS)' },
  { id: 'ds_nlq', name: 'Người liên quan (NLQ)' },
  { id: 'phe_duyet', name: 'Kiểm soát / Phê duyệt' },
];

// --- Bên vay: 14 trường nguyên văn APC ---
const benVayFields = [
  { id: 'danh_xung', name: '[Danh xưng]', type: 'select', group: 'ben_vay', defaultValue: 'Ông', options: ['Ông', 'Bà'], required: true },
  { id: 'ten_khach_hang', name: '[Tên khách hàng]', type: 'text', group: 'ben_vay', defaultValue: '', required: true, searchable: true },
  { id: 'nam_sinh', name: '[Năm sinh]', type: 'text', group: 'ben_vay', defaultValue: '', required: true },
  { id: 'loai_giay_to', name: '[Loại giấy tờ tùy thân]', type: 'select', group: 'ben_vay', defaultValue: 'CCCD', options: ['CCCD', 'CMND'], required: true },
  { id: 'cmnd', name: '[CMND]', type: 'text', group: 'ben_vay', defaultValue: '', required: true, searchable: true },
  { id: 'ngay_cap', name: '[Ngày cấp]', type: 'date', group: 'ben_vay', defaultValue: '', required: true },
  { id: 'noi_cap', name: '[Nơi cấp]', type: 'text', group: 'ben_vay', defaultValue: 'Cục Cảnh sát QLHC về TTXH', required: true },
  { id: 'dia_chi', name: '[Địa chỉ]', type: 'longtext', group: 'ben_vay', defaultValue: '', required: true },
  { id: 'noi_cong_tac', name: '[Nơi công tác]', type: 'text', group: 'ben_vay', defaultValue: '', required: false },
  { id: 'so_dien_thoai', name: '[Số điện thoại]', type: 'text', group: 'ben_vay', defaultValue: '', required: true, searchable: true },
  { id: 'ngay_sinh', name: '[Ngày sinh]', type: 'date', group: 'ben_vay', defaultValue: '', required: false },
  { id: 'gioi_tinh', name: '[Giới tính]', type: 'select', group: 'ben_vay', defaultValue: 'Nam', options: ['Nam', 'Nữ'], required: false },
  { id: 'email', name: '[Email]', type: 'text', group: 'ben_vay', defaultValue: '', required: false },
  { id: 'nguoi_dai_dien', name: '[Người đại diện Bên vay]', type: 'text', group: 'ben_vay', defaultValue: '', required: false },
];

// --- Khoản vay: 10 trường nguyên văn APC ---
const khoanVayFields = [
  { id: 'so_tien_vay', name: '[Số tiền vay]', type: 'currency', group: 'khoan_vay', defaultValue: 0, required: true },
  { id: 'so_tien_vay_chu', name: '[Số tiền vay bằng chữ]', type: 'text', group: 'khoan_vay', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(so_tien_vay)', required: false },
  { id: 'ngay_vay', name: '[Ngày vay]', type: 'date', group: 'khoan_vay', defaultValue: '', required: true },
  { id: 'thoi_gian_vay', name: '[Thời gian vay]', type: 'number', group: 'khoan_vay', defaultValue: 12, required: true, hint: 'Chỉ nhập số tháng' },
  { id: 'thoi_han_vay', name: '[Thời hạn vay]', type: 'number', group: 'khoan_vay', defaultValue: 12, required: true, hint: 'Chỉ nhập số tháng' },
  { id: 'han_tra', name: '[Hạn trả]', type: 'text', group: 'khoan_vay', defaultValue: '', required: false },
  { id: 'ngay_den_han', name: '[Ngày đến hạn]', type: 'date', group: 'khoan_vay', defaultValue: '', formula: 'ADD_MONTHS(ngay_vay, thoi_han_vay)', required: false },
  { id: 'so_ngay_vay', name: '[Số ngày vay]', type: 'number', group: 'khoan_vay', defaultValue: 0, required: false },
  { id: 'lai_suat', name: '[Lãi suất]', type: 'number', group: 'khoan_vay', defaultValue: 10.5, required: true, hint: 'Chỉ nhập số, không nhập %' },
  { id: 'muc_dich_vay', name: '[Mục đích vay]', type: 'longtext', group: 'khoan_vay', defaultValue: '', required: true },
];

// --- Danh sách động 5 mã DS (thêm dòng / xóa dòng) ---
const subTV = [
  { id: 'tv_ho_ten', name: '[TV.Họ và tên]', type: 'text', defaultValue: '' },
  { id: 'tv_nam_sinh', name: '[TV.Năm sinh]', type: 'text', defaultValue: '' },
  { id: 'tv_loai_giay_to', name: '[TV.Loại giấy tờ tùy thân]', type: 'text', defaultValue: 'CCCD' },
  { id: 'tv_cmnd', name: '[TV.CMND]', type: 'text', defaultValue: '' },
  { id: 'tv_noi_cap', name: '[TV.Nơi cấp]', type: 'text', defaultValue: '' },
  { id: 'tv_ngay_cap', name: '[TV.Ngày cấp]', type: 'date', defaultValue: '' },
  { id: 'tv_noi_thuong_tru', name: '[TV.Nơi thường trú]', type: 'longtext', defaultValue: '' },
  { id: 'tv_danh_xung', name: '[TV.Danh xưng]', type: 'select', defaultValue: 'Ông', options: ['Ông', 'Bà'] },
  { id: 'tv_moi_quan_he', name: '[TV.Mối quan hệ với KH vay]', type: 'text', defaultValue: '' },
  { id: 'tv_du_no', name: '[TV.Dư nợ tại Agribank]', type: 'currency', defaultValue: 0 },
];
const subSTK = [
  { id: 'stk_so_so', name: '[STK.Số sổ]', type: 'text', defaultValue: '' },
  { id: 'stk_so_tien', name: '[STK.Số tiền]', type: 'currency', defaultValue: 0 },
  { id: 'stk_ngay_gui', name: '[STK.Ngày gửi]', type: 'date', defaultValue: '' },
  { id: 'stk_ky_han', name: '[STK.Kỳ hạn]', type: 'number', defaultValue: 12 },
  { id: 'stk_ngay_den_han', name: '[Ngày đến hạn]', type: 'date', defaultValue: '' },
  { id: 'stk_chu_so_huu', name: '[STK.Chủ sở hữu]', type: 'text', defaultValue: '' },
  { id: 'stk_ben_thu_3', name: '[STK.Bên thứ 3]', type: 'boolean', defaultValue: false },
];
const subTaiSan = (prefix, label) => [
  { id: `${prefix}_loai`, name: `[${prefix}.Loại tài sản] (${label})`, type: 'select', defaultValue: 'Bất động sản', options: ['Bất động sản', 'Động sản', 'Sổ tiết kiệm', 'Giấy tờ có giá', 'Khác'] },
  { id: `${prefix}_mo_ta`, name: `[${prefix}.Mô tả]`, type: 'longtext', defaultValue: '' },
  { id: `${prefix}_so_gcn`, name: `[${prefix}.Số GCN]`, type: 'text', defaultValue: '' },
  { id: `${prefix}_chu_so_huu`, name: `[${prefix}.Chủ sở hữu]`, type: 'text', defaultValue: '' },
  { id: `${prefix}_ben_thu_3`, name: `[${prefix}.Bên thứ 3]`, type: 'boolean', defaultValue: false },
  { id: `${prefix}_gia_tri`, name: `[${prefix}.Giá trị]`, type: 'currency', defaultValue: 0 },
  { id: `${prefix}_gia_tri_dinh_gia`, name: `[${prefix}.Giá trị định giá]`, type: 'currency', defaultValue: 0 },
];
const subNLQ = [
  { id: 'nlq_ten', name: '[NLQ.Tên tổ chức/Cá nhân]', type: 'text', defaultValue: '' },
  { id: 'nlq_giay_to', name: '[NLQ.Số ĐKKD/CMND]', type: 'text', defaultValue: '' },
  { id: 'nlq_moi_lien_quan', name: '[NLQ.Mối liên quan]', type: 'text', defaultValue: '' },
  { id: 'nlq_du_no', name: '[NLQ.Dư nợ tại Agribank]', type: 'currency', defaultValue: 0 },
];

const dsFields = [
  { id: 'ds_tv', name: 'Danh sách thành viên [TV]', type: 'list', group: 'ds_tv', defaultValue: [], subFields: subTV },
  { id: 'ds_stk', name: 'Sổ tiết kiệm [STK]', type: 'list', group: 'ds_stk', defaultValue: [], subFields: subSTK },
  { id: 'ds_sd', name: 'Tài sản [SĐ]', type: 'list', group: 'ds_sd', defaultValue: [], subFields: subTaiSan('SD', 'SĐ') },
  { id: 'ds_ds', name: 'Tài sản [ĐS]', type: 'list', group: 'ds_ds', defaultValue: [], subFields: subTaiSan('DS', 'ĐS') },
  { id: 'ds_nlq', name: 'Người liên quan [NLQ]', type: 'list', group: 'ds_nlq', defaultValue: [], subFields: subNLQ },
  { id: 'tong_gia_tri_tsbd', name: '[Tổng giá trị TSBĐ]', type: 'currency', group: 'ds_sd', defaultValue: 0, formula: 'SUM(ds_sd.SD_gia_tri_dinh_gia)+SUM(ds_ds.DS_gia_tri_dinh_gia)', required: false },
];

// --- Kiểm soát / phê duyệt (trường điền vào biểu, không phải luồng duyệt) ---
const pheDuyetFields = [
  { id: 'nguoi_kiem_soat', name: '[Người kiểm soát]', type: 'text', group: 'phe_duyet', defaultValue: '', required: false },
  { id: 'nguoi_phe_duyet', name: '[Người phê duyệt]', type: 'text', group: 'phe_duyet', defaultValue: '', required: false },
  { id: 'chuc_vu_phe_duyet', name: '[Chức vụ người phê duyệt]', type: 'text', group: 'phe_duyet', defaultValue: 'Giám đốc', required: false },
  { id: 'ma_chi_nhanh', name: '[Mã chi nhánh]', type: 'text', group: 'phe_duyet', defaultValue: '', required: false },
];

export const APC_HO_SO_CHUAN_FIELDS = [
  ...benVayFields,
  ...khoanVayFields,
  ...dsFields,
  ...pheDuyetFields,
];

export const APC_HO_SO_CHUAN = {
  id: 'apc_ho_so_chuan',
  name: 'Hồ sơ tín dụng APC (chuẩn gốc)',
  description: '1 quy trình chung mọi loại vay: Bên vay + Khoản vay + DS TV/STK/SĐ/ĐS/NLQ',
  icon: '📋',
  namingFieldId: 'ten_khach_hang',
  fields: APC_HO_SO_CHUAN_FIELDS,
  fieldGroups: APC_FIELD_GROUPS,
};
