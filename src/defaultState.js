
// This file defines the initial state of the application.

// 1. Define all fields and groups first
const fields = [
  // Group I: Thong tin khach hang (List)
  {
    id: 'danh_sach_khach_hang',
    name: 'Danh sách Khách hàng',
    type: 'list',
    group: 'group_khachhang',
    subFields: [
      { id: 'kh_ho_ten', name: 'Họ và tên', type: 'text', defaultValue: '' },
      { id: 'kh_ngay_sinh', name: 'Ngày sinh', type: 'date', defaultValue: '' },
      { id: 'kh_cccd_so', name: 'CCCD Số', type: 'text', defaultValue: '' },
      { id: 'kh_cccd_ngay_cap', name: 'Ngày cấp CCCD', type: 'date', defaultValue: '' },
      { id: 'kh_cccd_noi_cap', name: 'Nơi cấp CCCD', type: 'text', defaultValue: '' },
      { id: 'kh_thuong_tru', name: 'Nơi thường trú', type: 'longtext', defaultValue: '' },
      { id: 'kh_hien_tai', name: 'Nơi ở hiện tại', type: 'longtext', defaultValue: '' },
      { id: 'kh_dien_thoai', name: 'Số điện thoại', type: 'text', defaultValue: '' },
    ]
  },
   // Group II: Tình hình quan hệ tín dụng
  { id: 'qhtd_cic_ngay', name: 'Ngày tra cứu CIC', type: 'date', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_agribank_duno', name: 'Dư nợ tại Agribank', type: 'currency', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_agribank_nhom_no', name: 'Nhóm nợ tại Agribank', type: 'text', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_tctd_khac_ten', name: 'Tên TCTD khác', type: 'text', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_tctd_khac_duno', name: 'Dư nợ tại TCTD khác', type: 'currency', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_tctd_khac_nhom_no', name: 'Nhóm nợ TCTD khác', type: 'text', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_the_tin_dung_duno', name: 'Dư nợ thẻ tín dụng', type: 'currency', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_no_xau_5_nam', name: 'Ghi chú Nợ xấu 5 năm', type: 'text', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_no_chu_y_12_thang', name: 'Ghi chú Nợ cần chú ý 12 tháng', type: 'text', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_no_ban_vamc', name: 'Ghi chú Nợ bán VAMC', type: 'text', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_xep_hang_noi_bo_ngay', name: 'Ngày xếp hạng nội bộ', type: 'date', group: 'group_qhtd' , defaultValue: ''},
  { id: 'qhtd_xep_hang_noi_bo_hang', name: 'Xếp hạng nội bộ', type: 'text', group: 'group_qhtd' , defaultValue: ''},

  // Group III: Thông tin khoản vay
  { id: 'kv_tong_nhu_cau_von', name: 'Tổng nhu cầu vốn', type: 'currency', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_von_doi_ung', name: 'Vốn đối ứng', type: 'currency', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_von_doi_ung_tyle', name: 'Tỷ lệ vốn đối ứng (%)', type: 'number', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_so_tien_vay', name: 'Số tiền vay Agribank', type: 'currency', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_muc_dich', name: 'Mục đích sử dụng vốn', type: 'longtext', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_thoi_han_vay', name: 'Thời hạn vay vốn (tháng)', type: 'number', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_phuong_thuc_cho_vay', name: 'Phương thức cho vay', type: 'text', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_ky_han_goc', name: 'Kỳ hạn trả nợ gốc', type: 'text', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_ky_han_lai', name: 'Kỳ hạn trả nợ lãi', type: 'text', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_lai_suat_phuong_thuc', name: 'Phương thức áp dụng lãi suất', type: 'text', group: 'group_khoanvay' , defaultValue: ''},
  { id: 'kv_lai_suat_muc', name: 'Mức lãi suất cho vay (%/năm)', type: 'text', group: 'group_khoanvay' , defaultValue: ''},
];

const fieldGroups = [
  { id: 'group_khachhang', name: 'I. Thông tin khách hàng' },
  { id: 'group_qhtd', name: 'II. Tình hình quan hệ tín dụng' },
  { id: 'group_khoanvay', name: 'III. Thông tin khoản vay' },
];

// 2. Helper function to create the initial inputData based on the fields
const initializeInputData = (fields) => {
  const initialData = {};
  fields.forEach(field => {
    if (field.type === 'list') {
      initialData[field.id] = [];
    } else {
      initialData[field.id] = field.defaultValue !== undefined ? field.defaultValue : '';
    }
  });
  return initialData;
};

// 3. Assemble the final default state
const defaultState = {
  // UI State
  activeTab: 'data-input',
  configActiveTab: 'data-and-settings', 
  dataInputOpenGroups: ['group_khachhang'],
  managementOpenGroupIds: [], // FIX: Should be an array
  managementOpenListFieldIds: [], // CRITICAL FIX: Initialize as an empty array, not a Set.
  showWelcomeGuide: false,
  templateSearchTerm: '',
  selectedTemplateIds: new Set(),

  // Core Data & Configuration
  fields: fields, 
  fieldGroups: fieldGroups, 
  linkedFieldConfig: { 
    groups: [], 
    ignoredChars: [] 
  },
  numberFormat: { locale: 'vi-VN', decimalPlaces: null },
  dateFormat: 'DD/MM/YYYY',

  // User Data
  inputData: initializeInputData(fields), 
  savedCustomers: [],

  // File & Template Data
  templates: [],
  sourcePaths: [],
  destinationPath: '',

  // Log & Progress State for Utilities
  logs: [],
  progress: { isRunning: false, status: 'idle', total: 0, current: 0, message: '' },

  // Profile naming field
  namingFieldId: '',

  // Custom profile templates saved by user
  customTemplates: [],

  // Auto-Update Settings
  autoUpdateEnabled: false, // Mặc định tắt auto-update
};

export default defaultState;
