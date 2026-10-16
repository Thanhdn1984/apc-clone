
// electron/logic/presets.js
const { app, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { processTemplatesByPath } = require('./templates.js');

const PRESETS_DIR = path.join(app.getPath('userData'), 'presets');

if (!fs.existsSync(PRESETS_DIR)) { 
    fs.mkdirSync(PRESETS_DIR, { recursive: true }); 
}

const createDefaultState = () => ({
  fields: [
    // Group I: Thong tin khach hang (List)
    {
      id: 'danh_sach_khach_hang',
      name: 'Danh sách Khách hàng',
      type: 'list',
      group: 'group_khachhang',
      subFields: [
        { id: 'kh_ho_ten', name: 'Họ và tên', type: 'text' },
        { id: 'kh_ngay_sinh', name: 'Ngày sinh', type: 'date' },
        { id: 'kh_cccd_so', name: 'CCCD Số', type: 'text' },
        { id: 'kh_cccd_ngay_cap', name: 'Ngày cấp CCCD', type: 'date' },
        { id: 'kh_cccd_noi_cap', name: 'Nơi cấp CCCD', type: 'text' },
        { id: 'kh_thuong_tru', name: 'Nơi thường trú', type: 'longtext' },
        { id: 'kh_hien_tai', name: 'Nơi ở hiện tại', type: 'longtext' },
        { id: 'kh_dien_thoai', name: 'Số điện thoại', type: 'text' },
      ]
    },

    // Group II: Tình hình quan hệ tín dụng
    { id: 'qhtd_cic_ngay', name: 'Ngày tra cứu CIC', type: 'date', group: 'group_qhtd' },
    { id: 'qhtd_agribank_duno', name: 'Dư nợ tại Agribank', type: 'currency', group: 'group_qhtd' },
    { id: 'qhtd_agribank_nhom_no', name: 'Nhóm nợ tại Agribank', type: 'text', group: 'group_qhtd' },
    { id: 'qhtd_tctd_khac_ten', name: 'Tên TCTD khác', type: 'text', group: 'group_qhtd' },
    { id: 'qhtd_tctd_khac_duno', name: 'Dư nợ tại TCTD khác', type: 'currency', group: 'group_qhtd' },
    { id: 'qhtd_tctd_khac_nhom_no', name: 'Nhóm nợ TCTD khác', type: 'text', group: 'group_qhtd' },
    { id: 'qhtd_the_tin_dung_duno', name: 'Dư nợ thẻ tín dụng', type: 'currency', group: 'group_qhtd' },
    { id: 'qhtd_no_xau_5_nam', name: 'Ghi chú Nợ xấu 5 năm', type: 'text', group: 'group_qhtd' },
    { id: 'qhtd_no_chu_y_12_thang', name: 'Ghi chú Nợ cần chú ý 12 tháng', type: 'text', group: 'group_qhtd' },
    { id: 'qhtd_no_ban_vamc', name: 'Ghi chú Nợ bán VAMC', type: 'text', group: 'group_qhtd' },
    { id: 'qhtd_xep_hang_noi_bo_ngay', name: 'Ngày xếp hạng nội bộ', type: 'date', group: 'group_qhtd' },
    { id: 'qhtd_xep_hang_noi_bo_hang', name: 'Xếp hạng nội bộ', type: 'text', group: 'group_qhtd' },

    // Group III: Thông tin khoản vay
    { id: 'kv_tong_nhu_cau_von', name: 'Tổng nhu cầu vốn', type: 'currency', group: 'group_khoanvay' },
    { id: 'kv_von_doi_ung', name: 'Vốn đối ứng', type: 'currency', group: 'group_khoanvay' },
    { id: 'kv_von_doi_ung_tyle', name: 'Tỷ lệ vốn đối ứng (%)', type: 'number', group: 'group_khoanvay' },
    { id: 'kv_so_tien_vay', name: 'Số tiền vay Agribank', type: 'currency', group: 'group_khoanvay' },
    { id: 'kv_muc_dich', name: 'Mục đích sử dụng vốn', type: 'longtext', group: 'group_khoanvay' },
    { id: 'kv_thoi_han_vay', name: 'Thời hạn vay vốn (tháng)', type: 'number', group: 'group_khoanvay' },
    { id: 'kv_phuong_thuc_cho_vay', name: 'Phương thức cho vay', type: 'text', group: 'group_khoanvay' },
    { id: 'kv_ky_han_goc', name: 'Kỳ hạn trả nợ gốc', type: 'text', group: 'group_khoanvay' },
    { id: 'kv_ky_han_lai', name: 'Kỳ hạn trả nợ lãi', type: 'text', group: 'group_khoanvay' },
    { id: 'kv_lai_suat_phuong_thuc', name: 'Phương thức áp dụng lãi suất', type: 'text', group: 'group_khoanvay' },
    { id: 'kv_lai_suat_muc', name: 'Mức lãi suất cho vay (%/năm)', type: 'text', group: 'group_khoanvay' },

    // Group IV: Phương án và Nguồn trả nợ
    { id: 'pa_thu_nhap_thang', name: 'Thu nhập bình quân tháng', type: 'currency', group: 'group_phuongan' },
    { id: 'pa_nguon_thu_nhap', name: 'Nguồn thu nhập hàng tháng', type: 'longtext', group: 'group_phuongan' },
    { id: 'pa_thu_nhap_cuoi_ky', name: 'Nguồn thu nhập cuối kỳ', type: 'longtext', group: 'group_phuongan' },
    { id: 'pa_chi_phi_sinh_hoat', name: 'Chi phí sinh hoạt và tích lũy', type: 'currency', group: 'group_phuongan' },
    { id: 'pa_thu_nhap_con_lai', name: 'Thu nhập còn lại trả nợ', type: 'currency', group: 'group_phuongan' },

    // Group V: Tài sản bảo đảm
    { id: 'tsbd_bien_phap', name: 'Biện pháp bảo đảm', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_ten', name: 'Tên/Mô tả tài sản', type: 'longtext', group: 'group_tsbd' },
    { id: 'tsbd_thua_dat_so', name: 'Thửa đất số', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_to_ban_do_so', name: 'Tờ bản đồ số', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_dia_chi', name: 'Địa chỉ thửa đất', type: 'longtext', group: 'group_tsbd' },
    { id: 'tsbd_dien_tich', name: 'Diện tích (m2)', type: 'number', group: 'group_tsbd' },
    { id: 'tsbd_loai_dat', name: 'Loại đất', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_thoi_han_su_dung', name: 'Thời hạn sử dụng đất', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_hinh_thuc_su_dung', name: 'Hình thức sử dụng đất', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_giay_to_so_hieu', name: 'Số hiệu GCN', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_giay_to_so_vao_so', name: 'Số vào sổ cấp GCN', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_giay_to_ngay_cap', name: 'Ngày cấp GCN', type: 'date', group: 'group_tsbd' },
    { id: 'tsbd_giay_to_noi_cap', name: 'Nơi cấp GCN', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_dinh_gia_gia_tri', name: 'Giá trị định giá (làm tròn)', type: 'currency', group: 'group_tsbd' },
    { id: 'tsbd_dinh_gia_gia_m2', name: 'Đơn giá đất thị trường (đ/m2)', type: 'currency', group: 'group_tsbd' },
    { id: 'tsbd_dinh_gia_ngay_tham_dinh', name: 'Ngày thẩm định giá', type: 'date', group: 'group_tsbd' },
    { id: 'tsbd_dinh_gia_don_vi', name: 'Đơn vị thẩm định giá', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_muc_cho_vay_bao_dam', name: 'Tỷ lệ cho vay/TSBĐ', type: 'text', group: 'group_tsbd' },
    { id: 'tsbd_pham_vi_bao_dam', name: 'Phạm vi bảo đảm', type: 'longtext', group: 'group_tsbd' }
  ],
  fieldGroups: [
    { id: 'group_khachhang', name: 'I. Thông tin khách hàng' },
    { id: 'group_qhtd', name: 'II. Tình hình quan hệ tín dụng' },
    { id: 'group_khoanvay', name: 'III. Thông tin khoản vay' },
    { id: 'group_phuongan', name: 'IV. Phương án và Nguồn trả nợ' },
    { id: 'group_tsbd', name: 'V. Tài sản bảo đảm' },
  ],
  templates: [],
  inputData: {
    danh_sach_khach_hang: [], // Changed from individual fields to a list
  },
  numberFormat: '.',
});

const savePreset = (name, data) => {
  try {
    if (!name.match(/^[a-zA-Z0-9_-]+$/)) throw new Error('Invalid preset name.');
    const filePath = path.join(PRESETS_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return { success: true };
  } catch (error) {
    console.error(`[Main] Error saving preset '${name}':`, error);
    return { success: false, error: error.message };
  }
};

const loadPreset = (name) => {
  try {
    if (!name.match(/^[a-zA-Z0-9_-]+$/)) throw new Error('Invalid preset name.');
    const filePath = path.join(PRESETS_DIR, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      if (name === 'default') {
        const defaultState = createDefaultState();
        savePreset('default', defaultState);
        return { success: true, data: defaultState };
      }
      throw new Error(`Preset '${name}' not found.`);
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    if (data.templates && Array.isArray(data.templates)) {
        const templatePaths = data.templates.map(t => t.path || t).filter(Boolean);
        data.templates = processTemplatesByPath(templatePaths);
    }
    return { success: true, data: data };
  } catch (error) {
    console.error(`[Main] Error loading preset '${name}':`, error);
    const defaultState = createDefaultState();
    savePreset('default', defaultState);
    return { success: false, error: error.message, data: defaultState };
  }
};

async function loadPresetDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'JSON Files', extensions: ['json'] }] });
  if (canceled || filePaths.length === 0) return { success: false, canceled: true };
  try {
    const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
    const data = JSON.parse(fileContent);
    if (data.templates && Array.isArray(data.templates)) {
        const templatePaths = data.templates.map(t => t.path || t).filter(Boolean);
        data.templates = processTemplatesByPath(templatePaths);
    }
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function savePresetDialog(event, dataToSave) {
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Lưu cấu hình hiện tại',
        defaultPath: 'my_docugen_preset.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (canceled || !filePath) {
        return { success: false, canceled: true };
    }
    try {
        const dataWithTemplatePaths = {
            ...dataToSave,
            templates: dataToSave.templates.map(t => t.path)
        };
        fs.writeFileSync(filePath, JSON.stringify(dataWithTemplatePaths, null, 2));
        return { success: true, filePath };
    } catch (error) {
        return { success: false, error: message };
    }
}

const resetDefaultPreset = () => {
  try {
    const filePath = path.join(PRESETS_DIR, 'default.json');
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('[Main] Error resetting default preset:', error);
    return { success: false, error: error.message };
  }
};


module.exports = { 
    PRESETS_DIR, 
    createDefaultState,
    savePreset, 
    loadPreset, 
    loadPresetDialog, 
    savePresetDialog,
    resetDefaultPreset
}; 
