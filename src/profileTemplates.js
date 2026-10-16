// src/profileTemplates.js
// 4 bộ hồ sơ tín dụng chuẩn cho Agribank

import { v4 as uuidv4 } from 'uuid';

// Helper: tạo input data mặc định từ fields
export const initInputDataFromFields = (fields) => {
    const data = {};
    const process = (fieldList) => {
        for (const f of (fieldList || [])) {
            if (f.type === 'list') {
                data[f.id] = [];
            } else {
                data[f.id] = f.defaultValue !== undefined ? f.defaultValue : '';
            }
        }
    };
    process(fields);
    return data;
};

// Gán id mới để tránh conflict với UUID
const mkField = (def) => ({ ...def, id: def.id });
const mkSubField = (def) => ({ ...def, id: def.id });

// ============================================================
// 1. HỒ SƠ THẤU CHI
// ============================================================
const thauChiFieldGroups = [
    { id: 'tc_khach_hang', name: 'Thông tin khách hàng' },
    { id: 'tc_tai_khoan', name: 'Thông tin tài khoản thanh toán' },
    { id: 'tc_khoan_thau_chi', name: 'Thông tin khoản thấu chi' },
    { id: 'tc_tai_san_dam_bao', name: 'Tài sản đảm bảo' },
    { id: 'tc_phe_duyet', name: 'Thông tin phê duyệt' },
    { id: 'tc_hop_dong', name: 'Thông tin hợp đồng' },
];

const thauChiFields = [
    { id: 'tc_loai_khach_hang', name: 'Loại khách hàng', type: 'text', group: 'tc_khach_hang', defaultValue: 'Cá nhân', required: true },
    { id: 'tc_ten_khach_hang', name: 'Họ tên / Tên tổ chức', type: 'text', group: 'tc_khach_hang', defaultValue: '', required: true },
    { id: 'tc_so_cccd', name: 'Số CCCD/MST', type: 'text', group: 'tc_khach_hang', defaultValue: '', required: true },
    { id: 'tc_ngay_cap_cccd', name: 'Ngày cấp', type: 'date', group: 'tc_khach_hang', defaultValue: '', required: false },
    { id: 'tc_noi_cap_cccd', name: 'Nơi cấp', type: 'text', group: 'tc_khach_hang', defaultValue: 'Cục Cảnh sát QLHC về TTXH', required: false },
    { id: 'tc_ngay_sinh', name: 'Ngày sinh / Ngày thành lập', type: 'date', group: 'tc_khach_hang', defaultValue: '', required: false },
    { id: 'tc_gioi_tinh', name: 'Giới tính', type: 'text', group: 'tc_khach_hang', defaultValue: 'Nam', required: false },
    { id: 'tc_dia_chi_thuong_tru', name: 'Địa chỉ thường trú / Trụ sở', type: 'longtext', group: 'tc_khach_hang', defaultValue: '', required: true },
    { id: 'tc_dia_chi_lien_he', name: 'Địa chỉ liên hệ', type: 'longtext', group: 'tc_khach_hang', defaultValue: '', required: false },
    { id: 'tc_so_dien_thoai', name: 'Số điện thoại', type: 'text', group: 'tc_khach_hang', defaultValue: '', required: true },
    { id: 'tc_email', name: 'Email', type: 'text', group: 'tc_khach_hang', defaultValue: '', required: false },
    { id: 'tc_nghe_nghiep', name: 'Nghề nghiệp / Ngành nghề KD', type: 'text', group: 'tc_khach_hang', defaultValue: '', required: false },
    { id: 'tc_noi_lam_viec', name: 'Nơi làm việc', type: 'text', group: 'tc_khach_hang', defaultValue: '', required: false },
    { id: 'tc_thu_nhap_binh_quan', name: 'Thu nhập bình quân tháng', type: 'currency', group: 'tc_khach_hang', defaultValue: 0, required: false },

    { id: 'tc_so_tai_khoan', name: 'Số tài khoản thanh toán', type: 'text', group: 'tc_tai_khoan', defaultValue: '', required: true },
    { id: 'tc_ten_chu_tai_khoan', name: 'Tên chủ tài khoản', type: 'text', group: 'tc_tai_khoan', defaultValue: '', required: true },
    { id: 'tc_ngan_hang_mo_tk', name: 'Ngân hàng mở TK', type: 'text', group: 'tc_tai_khoan', defaultValue: 'Agribank Chi nhánh ...', required: true },
    { id: 'tc_chi_nhanh_mo_tk', name: 'Chi nhánh / PGD', type: 'text', group: 'tc_tai_khoan', defaultValue: '', required: false },
    { id: 'tc_ngay_mo_tk', name: 'Ngày mở tài khoản', type: 'date', group: 'tc_tai_khoan', defaultValue: '', required: false },
    { id: 'tc_so_du_binh_quan_tk', name: 'Số dư bình quân TK (6 tháng)', type: 'currency', group: 'tc_tai_khoan', defaultValue: 0, required: false },

    { id: 'tc_han_muc_thau_chi', name: 'Hạn mức thấu chi', type: 'currency', group: 'tc_khoan_thau_chi', defaultValue: 0, required: true },
    { id: 'tc_han_muc_bang_chu', name: 'Hạn mức bằng chữ', type: 'text', group: 'tc_khoan_thau_chi', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(tc_han_muc_thau_chi)', required: false },
    { id: 'tc_thoi_han_thau_chi', name: 'Thời hạn thấu chi (tháng)', type: 'number', group: 'tc_khoan_thau_chi', defaultValue: 12, required: true },
    { id: 'tc_ngay_hieu_luc', name: 'Ngày hiệu lực', type: 'date', group: 'tc_khoan_thau_chi', defaultValue: '', required: true },
    { id: 'tc_ngay_het_han', name: 'Ngày hết hạn', type: 'date', group: 'tc_khoan_thau_chi', defaultValue: '', formula: 'ADD_MONTHS(tc_ngay_hieu_luc, tc_thoi_han_thau_chi)', required: true },
    { id: 'tc_lai_suat_trong_han', name: 'Lãi suất trong hạn (%/năm)', type: 'number', group: 'tc_khoan_thau_chi', defaultValue: 10.5, required: true },
    { id: 'tc_lai_suat_qua_han', name: 'Lãi suất quá hạn (%/năm)', type: 'number', group: 'tc_khoan_thau_chi', defaultValue: 15.75, formula: 'tc_lai_suat_trong_han * 1.5', required: true },
    { id: 'tc_phi_thau_chi', name: 'Phí cấp hạn mức (%)', type: 'number', group: 'tc_khoan_thau_chi', defaultValue: 0, required: false },
    { id: 'tc_muc_dich_thau_chi', name: 'Mục đích sử dụng', type: 'longtext', group: 'tc_khoan_thau_chi', defaultValue: 'Phục vụ nhu cầu chi tiêu, sinh hoạt cá nhân', required: true },
    { id: 'tc_phuong_thuc_tra_no', name: 'Phương thức trả nợ', type: 'longtext', group: 'tc_khoan_thau_chi', defaultValue: 'Tự động trích tài khoản khi có số dư Có', required: false },

    { id: 'tc_co_tsdb', name: 'Có tài sản đảm bảo', type: 'text', group: 'tc_tai_san_dam_bao', defaultValue: 'Không', required: true },
    {
        id: 'tc_danh_sach_tsdb', name: 'Danh sách tài sản đảm bảo', type: 'list', group: 'tc_tai_san_dam_bao', defaultValue: [], required: false,
        subFields: [
            { id: 'in_tai_san', name: 'In tài sản này', type: 'boolean', defaultValue: true },
            { id: 'tc_loai_tsdb', name: 'Loại tài sản', type: 'text', defaultValue: 'Bất động sản' },
            { id: 'tc_mo_ta_tsdb', name: 'Mô tả tài sản', type: 'longtext', defaultValue: '' },
            { id: 'tc_so_giay_to', name: 'Số GCN/Giấy tờ', type: 'text', defaultValue: '' },
            { id: 'tc_noi_cap_giay_to', name: 'Nơi cấp', type: 'text', defaultValue: '' },
            { id: 'tc_ngay_cap_giay_to', name: 'Ngày cấp', type: 'date', defaultValue: '' },
            { id: 'tc_chu_so_huu_tsdb', name: 'Chủ sở hữu', type: 'text', defaultValue: '' },
            { id: 'tc_dia_chi_tsdb', name: 'Địa chỉ tài sản', type: 'longtext', defaultValue: '' },
            { id: 'tc_gia_tri_dinh_gia', name: 'Giá trị định giá', type: 'currency', defaultValue: 0 },
            { id: 'tc_ty_le_cho_vay', name: 'Tỷ lệ cho vay (%)', type: 'number', defaultValue: 70 },
            { id: 'tc_muc_cho_vay_toi_da', name: 'Mức cho vay tối đa', type: 'currency', defaultValue: 0, formula: 'tc_gia_tri_dinh_gia * tc_ty_le_cho_vay / 100' },
            { id: 'tc_so_hd_the_chap', name: 'Số HĐ thế chấp', type: 'text', defaultValue: '' },
            { id: 'tc_ngay_cong_chung', name: 'Ngày công chứng', type: 'date', defaultValue: '' },
            { id: 'tc_noi_cong_chung', name: 'Nơi công chứng', type: 'text', defaultValue: '' },
            { id: 'tc_ngay_dk_gdbd', name: 'Ngày đăng ký GDBĐ', type: 'date', defaultValue: '' },
        ]
    },
    { id: 'tc_tong_gia_tri_tsdb', name: 'Tổng giá trị TSĐB', type: 'currency', group: 'tc_tai_san_dam_bao', defaultValue: 0, formula: 'SUM(tc_danh_sach_tsdb.tc_gia_tri_dinh_gia)', required: false },
    { id: 'tc_ty_le_tsdb_tren_han_muc', name: 'Tỷ lệ TSĐB / Hạn mức (%)', type: 'number', group: 'tc_tai_san_dam_bao', defaultValue: 0, formula: 'tc_tong_gia_tri_tsdb / tc_han_muc_thau_chi * 100', required: false },

    { id: 'tc_nguoi_phe_duyet', name: 'Người phê duyệt', type: 'text', group: 'tc_phe_duyet', defaultValue: '', required: true },
    { id: 'tc_chuc_vu_phe_duyet', name: 'Chức vụ', type: 'text', group: 'tc_phe_duyet', defaultValue: 'Giám đốc', required: false },
    { id: 'tc_ngay_phe_duyet', name: 'Ngày phê duyệt', type: 'date', group: 'tc_phe_duyet', defaultValue: '', required: true },
    { id: 'tc_so_to_trinh', name: 'Số tờ trình', type: 'text', group: 'tc_phe_duyet', defaultValue: '', required: false },
    { id: 'tc_can_bo_tin_dung', name: 'Cán bộ tín dụng', type: 'text', group: 'tc_phe_duyet', defaultValue: '', required: true },

    { id: 'tc_so_hop_dong', name: 'Số hợp đồng thấu chi', type: 'text', group: 'tc_hop_dong', defaultValue: '', required: true },
    { id: 'tc_ngay_ky_hop_dong', name: 'Ngày ký hợp đồng', type: 'date', group: 'tc_hop_dong', defaultValue: '', required: true },
    { id: 'tc_noi_ky_hop_dong', name: 'Nơi ký', type: 'text', group: 'tc_hop_dong', defaultValue: '', required: false },
    { id: 'tc_ten_chi_nhanh', name: 'Chi nhánh ngân hàng', type: 'text', group: 'tc_hop_dong', defaultValue: 'Agribank Chi nhánh Đà Nẵng', required: false },
    { id: 'tc_nguoi_dai_dien_nh', name: 'Người đại diện ngân hàng', type: 'text', group: 'tc_hop_dong', defaultValue: '', required: false },
    { id: 'tc_chuc_vu_dai_dien_nh', name: 'Chức vụ đại diện', type: 'text', group: 'tc_hop_dong', defaultValue: 'Giám đốc', required: false },
];

// ============================================================
// 2. HỒ SƠ CẦM CỐ SỔ TIẾT KIỆM
// ============================================================
const camCoFieldGroups = [
    { id: 'cc_ben_vay', name: 'Bên vay' },
    { id: 'cc_ben_cam_co', name: 'Bên cầm cố (Bên thứ 3)' },
    { id: 'cc_so_tiet_kiem', name: 'Sổ tiết kiệm cầm cố' },
    { id: 'cc_khoan_vay', name: 'Thông tin khoản vay' },
    { id: 'cc_nhan_no', name: 'Nhận nợ' },
    { id: 'cc_hop_dong', name: 'Hợp đồng' },
];

const camCoFields = [
    { id: 'cc_ten_khach_hang_vay', name: 'Họ tên bên vay', type: 'text', group: 'cc_ben_vay', defaultValue: '', required: true },
    { id: 'cc_cccd_ben_vay', name: 'CCCD bên vay', type: 'text', group: 'cc_ben_vay', defaultValue: '', required: true },
    { id: 'cc_ngay_cap_cccd_ben_vay', name: 'Ngày cấp CCCD', type: 'date', group: 'cc_ben_vay', defaultValue: '', required: false },
    { id: 'cc_noi_cap_cccd_ben_vay', name: 'Nơi cấp CCCD', type: 'text', group: 'cc_ben_vay', defaultValue: 'Cục Cảnh sát QLHC về TTXH', required: false },
    { id: 'cc_ngay_sinh_ben_vay', name: 'Ngày sinh bên vay', type: 'date', group: 'cc_ben_vay', defaultValue: '', required: false },
    { id: 'cc_gioi_tinh_ben_vay', name: 'Giới tính', type: 'text', group: 'cc_ben_vay', defaultValue: 'Nam', required: false },
    { id: 'cc_dia_chi_ben_vay', name: 'Địa chỉ thường trú', type: 'longtext', group: 'cc_ben_vay', defaultValue: '', required: true },
    { id: 'cc_sdt_ben_vay', name: 'SĐT bên vay', type: 'text', group: 'cc_ben_vay', defaultValue: '', required: true },
    { id: 'cc_tinh_trang_hon_nhan_ben_vay', name: 'Tình trạng hôn nhân', type: 'text', group: 'cc_ben_vay', defaultValue: 'Độc thân', required: false },
    { id: 'cc_ten_vo_chong_ben_vay', name: 'Họ tên vợ/chồng BV', type: 'text', group: 'cc_ben_vay', defaultValue: '', required: false },
    { id: 'cc_cccd_vo_chong_ben_vay', name: 'CCCD vợ/chồng BV', type: 'text', group: 'cc_ben_vay', defaultValue: '', required: false },

    { id: 'cc_la_ben_thu_3', name: 'Cầm cố là bên thứ 3', type: 'text', group: 'cc_ben_cam_co', defaultValue: 'Không', required: true },
    { id: 'cc_quan_he_ben_cam_co', name: 'Quan hệ với bên vay', type: 'text', group: 'cc_ben_cam_co', defaultValue: 'Bản thân', required: false },
    { id: 'cc_ten_ben_cam_co', name: 'Họ tên bên cầm cố', type: 'text', group: 'cc_ben_cam_co', defaultValue: '', required: true },
    { id: 'cc_cccd_ben_cam_co', name: 'CCCD bên cầm cố', type: 'text', group: 'cc_ben_cam_co', defaultValue: '', required: true },
    { id: 'cc_ngay_cap_cccd_ben_cam_co', name: 'Ngày cấp CCCD BCC', type: 'date', group: 'cc_ben_cam_co', defaultValue: '', required: false },
    { id: 'cc_noi_cap_cccd_ben_cam_co', name: 'Nơi cấp CCCD BCC', type: 'text', group: 'cc_ben_cam_co', defaultValue: '', required: false },
    { id: 'cc_ngay_sinh_ben_cam_co', name: 'Ngày sinh BCC', type: 'date', group: 'cc_ben_cam_co', defaultValue: '', required: false },
    { id: 'cc_dia_chi_ben_cam_co', name: 'Địa chỉ thường trú BCC', type: 'longtext', group: 'cc_ben_cam_co', defaultValue: '', required: true },
    { id: 'cc_sdt_ben_cam_co', name: 'SĐT bên cầm cố', type: 'text', group: 'cc_ben_cam_co', defaultValue: '', required: false },
    { id: 'cc_tinh_trang_hon_nhan_bcc', name: 'Tình trạng hôn nhân BCC', type: 'text', group: 'cc_ben_cam_co', defaultValue: 'Độc thân', required: false },
    { id: 'cc_ten_vo_chong_bcc', name: 'Họ tên vợ/chồng BCC', type: 'text', group: 'cc_ben_cam_co', defaultValue: '', required: false },
    { id: 'cc_cccd_vo_chong_bcc', name: 'CCCD vợ/chồng BCC', type: 'text', group: 'cc_ben_cam_co', defaultValue: '', required: false },

    {
        id: 'cc_danh_sach_so_tk', name: 'Danh sách sổ tiết kiệm cầm cố', type: 'list', group: 'cc_so_tiet_kiem', defaultValue: [], required: true,
        subFields: [
            { id: 'in_so', name: 'In sổ này', type: 'boolean', defaultValue: true },
            { id: 'cc_so_so', name: 'Số sổ tiết kiệm', type: 'text', defaultValue: '' },
            { id: 'cc_so_seri', name: 'Số seri', type: 'text', defaultValue: '' },
            { id: 'cc_ten_chu_so', name: 'Tên chủ sổ', type: 'text', defaultValue: '' },
            { id: 'cc_cccd_chu_so', name: 'CCCD chủ sổ', type: 'text', defaultValue: '' },
            { id: 'cc_ngan_hang_phat_hanh', name: 'Ngân hàng phát hành', type: 'text', defaultValue: 'Agribank' },
            { id: 'cc_chi_nhanh_phat_hanh', name: 'Chi nhánh phát hành', type: 'text', defaultValue: '' },
            { id: 'cc_ngay_phat_hanh', name: 'Ngày phát hành', type: 'date', defaultValue: '' },
            { id: 'cc_so_tien_so', name: 'Số tiền gửi', type: 'currency', defaultValue: 0 },
            { id: 'cc_loai_tien', name: 'Loại tiền tệ', type: 'text', defaultValue: 'VND' },
            { id: 'cc_ky_han', name: 'Kỳ hạn (tháng)', type: 'number', defaultValue: 12 },
            { id: 'cc_lai_suat_so', name: 'Lãi suất sổ (%/năm)', type: 'number', defaultValue: 5.5 },
            { id: 'cc_ngay_dao_han_so', name: 'Ngày đáo hạn sổ', type: 'date', defaultValue: '' },
            { id: 'cc_hinh_thuc_tra_lai', name: 'Hình thức trả lãi', type: 'text', defaultValue: 'Cuối kỳ' },
            { id: 'cc_ty_le_cam_co', name: 'Tỷ lệ cầm cố (%)', type: 'number', defaultValue: 95 },
            { id: 'cc_so_tien_cho_vay_toi_da', name: 'Số tiền cho vay tối đa', type: 'currency', defaultValue: 0, formula: 'cc_so_tien_so * cc_ty_le_cam_co / 100' },
        ]
    },
    { id: 'cc_tong_so_tien_so_tk', name: 'Tổng tiền các sổ TK', type: 'currency', group: 'cc_so_tiet_kiem', defaultValue: 0, formula: 'SUM(cc_danh_sach_so_tk.cc_so_tien_so)', required: false },
    { id: 'cc_tong_muc_cho_vay_toi_da', name: 'Tổng mức cho vay tối đa', type: 'currency', group: 'cc_so_tiet_kiem', defaultValue: 0, formula: 'SUM(cc_danh_sach_so_tk.cc_so_tien_cho_vay_toi_da)', required: false },
    { id: 'cc_so_luong_so', name: 'Số lượng sổ cầm cố', type: 'number', group: 'cc_so_tiet_kiem', defaultValue: 0, formula: 'COUNT(cc_danh_sach_so_tk)', required: false },

    { id: 'cc_so_tien_vay', name: 'Số tiền vay', type: 'currency', group: 'cc_khoan_vay', defaultValue: 0, required: true },
    { id: 'cc_so_tien_vay_bang_chu', name: 'Số tiền vay bằng chữ', type: 'text', group: 'cc_khoan_vay', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(cc_so_tien_vay)', required: false },
    { id: 'cc_thoi_han_vay_thang', name: 'Thời hạn vay (tháng)', type: 'number', group: 'cc_khoan_vay', defaultValue: 12, required: true },
    { id: 'cc_ngay_giai_ngan', name: 'Ngày giải ngân dự kiến', type: 'date', group: 'cc_khoan_vay', defaultValue: '', required: true },
    { id: 'cc_ngay_dao_han_khoan_vay', name: 'Ngày đáo hạn khoản vay', type: 'date', group: 'cc_khoan_vay', defaultValue: '', formula: 'ADD_MONTHS(cc_ngay_giai_ngan, cc_thoi_han_vay_thang)', required: true },
    { id: 'cc_lai_suat_vay', name: 'Lãi suất vay (%/năm)', type: 'number', group: 'cc_khoan_vay', defaultValue: 7.5, required: true },
    { id: 'cc_lai_suat_qua_han', name: 'Lãi suất quá hạn (%/năm)', type: 'number', group: 'cc_khoan_vay', defaultValue: 11.25, formula: 'cc_lai_suat_vay * 1.5', required: true },
    { id: 'cc_muc_dich_vay', name: 'Mục đích vay', type: 'longtext', group: 'cc_khoan_vay', defaultValue: 'Phục vụ nhu cầu tiêu dùng cá nhân', required: true },
    { id: 'cc_phuong_thuc_giai_ngan', name: 'Phương thức giải ngân', type: 'text', group: 'cc_khoan_vay', defaultValue: 'Chuyển khoản', required: false },
    { id: 'cc_phuong_thuc_tra_no_goc', name: 'Phương thức trả nợ gốc', type: 'text', group: 'cc_khoan_vay', defaultValue: 'Trả 1 lần cuối kỳ', required: true },
    { id: 'cc_phuong_thuc_tra_lai', name: 'Phương thức trả lãi', type: 'text', group: 'cc_khoan_vay', defaultValue: 'Trả lãi hàng tháng', required: true },

    {
        id: 'cc_danh_sach_nhan_no', name: 'Danh sách lần nhận nợ', type: 'list', group: 'cc_nhan_no', defaultValue: [], required: false,
        subFields: [
            { id: 'in_lan_nhan_no', name: 'In lần nhận nợ này', type: 'boolean', defaultValue: true },
            { id: 'cc_lan_thu', name: 'Lần thứ', type: 'number', defaultValue: 1 },
            { id: 'cc_so_giay_nhan_no', name: 'Số GNN', type: 'text', defaultValue: '' },
            { id: 'cc_ngay_nhan_no', name: 'Ngày nhận nợ', type: 'date', defaultValue: '' },
            { id: 'cc_so_tien_nhan_no', name: 'Số tiền nhận nợ', type: 'currency', defaultValue: 0 },
            { id: 'cc_so_tien_nhan_no_chu', name: 'Số tiền bằng chữ', type: 'text', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(cc_so_tien_nhan_no)' },
            { id: 'cc_muc_dich_chi_tiet', name: 'Mục đích chi tiết', type: 'longtext', defaultValue: '' },
            { id: 'cc_lai_suat_nhan_no', name: 'Lãi suất (%/năm)', type: 'number', defaultValue: 7.5 },
            { id: 'cc_ngay_tra_no_dk', name: 'Ngày trả nợ dự kiến', type: 'date', defaultValue: '' },
            { id: 'cc_tai_khoan_giai_ngan', name: 'TK giải ngân vào', type: 'text', defaultValue: '' },
        ]
    },
    { id: 'cc_tong_da_nhan_no', name: 'Tổng đã nhận nợ', type: 'currency', group: 'cc_nhan_no', defaultValue: 0, formula: 'SUM(cc_danh_sach_nhan_no.cc_so_tien_nhan_no)', required: false },

    { id: 'cc_so_hd_tin_dung', name: 'Số HĐ tín dụng', type: 'text', group: 'cc_hop_dong', defaultValue: '', required: true },
    { id: 'cc_so_hd_cam_co', name: 'Số HĐ cầm cố', type: 'text', group: 'cc_hop_dong', defaultValue: '', required: true },
    { id: 'cc_ngay_ky_hop_dong', name: 'Ngày ký hợp đồng', type: 'date', group: 'cc_hop_dong', defaultValue: '', required: true },
    { id: 'cc_noi_ky_hop_dong', name: 'Nơi ký', type: 'text', group: 'cc_hop_dong', defaultValue: '', required: false },
    { id: 'cc_can_bo_tin_dung', name: 'Cán bộ tín dụng', type: 'text', group: 'cc_hop_dong', defaultValue: '', required: true },
    { id: 'cc_nguoi_dai_dien_nh', name: 'Người đại diện ngân hàng', type: 'text', group: 'cc_hop_dong', defaultValue: '', required: true },
    { id: 'cc_chuc_vu_dai_dien_nh', name: 'Chức vụ đại diện', type: 'text', group: 'cc_hop_dong', defaultValue: 'Giám đốc', required: false },
    { id: 'cc_ten_chi_nhanh', name: 'Chi nhánh ngân hàng', type: 'text', group: 'cc_hop_dong', defaultValue: 'Agribank Chi nhánh Đà Nẵng', required: false },
];

// ============================================================
// 3. HỒ SƠ CÁ NHÂN TIÊU DÙNG
// ============================================================
const caNhanFieldGroups = [
    { id: 'cn_khach_hang', name: 'Thông tin khách hàng' },
    { id: 'cn_vo_chong', name: 'Vợ/Chồng khách hàng' },
    { id: 'cn_dong_vay', name: 'Người đồng vay / Bảo lãnh' },
    { id: 'cn_thu_nhap', name: 'Thu nhập' },
    { id: 'cn_khoan_vay', name: 'Thông tin khoản vay' },
    { id: 'cn_tai_san_dam_bao', name: 'Tài sản đảm bảo' },
    { id: 'cn_nhan_no', name: 'Nhận nợ' },
    { id: 'cn_hop_dong', name: 'Hợp đồng tín dụng' },
    { id: 'cn_quan_he_tin_dung_cic', name: 'Quan hệ tín dụng / CIC' },
    { id: 'cn_danh_muc_ho_so', name: 'Danh mục hồ sơ' },
    { id: 'cn_ngan_hang_can_bo', name: 'Thông tin ngân hàng / cán bộ' },
];

const caNhanFields = [
    { id: 'cn_ten_khach_hang', name: 'Họ và tên', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_ngay_sinh', name: 'Ngày sinh', type: 'date', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_gioi_tinh', name: 'Giới tính', type: 'text', group: 'cn_khach_hang', defaultValue: 'Nam', required: true },
    { id: 'cn_quoc_tich', name: 'Quốc tịch', type: 'text', group: 'cn_khach_hang', defaultValue: 'Việt Nam', required: false },
    { id: 'cn_dan_toc', name: 'Dân tộc', type: 'text', group: 'cn_khach_hang', defaultValue: 'Kinh', required: false },
    { id: 'cn_so_cccd', name: 'Số CCCD', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_ngay_cap_cccd', name: 'Ngày cấp CCCD', type: 'date', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_noi_cap_cccd', name: 'Nơi cấp CCCD', type: 'text', group: 'cn_khach_hang', defaultValue: 'Cục Cảnh sát QLHC về TTXH', required: true },
    { id: 'cn_ho_khau_thuong_tru', name: 'Hộ khẩu thường trú', type: 'longtext', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_noi_o_hien_tai', name: 'Nơi ở hiện tại', type: 'longtext', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_tinh_trang_so_huu_nha', name: 'Tình trạng nhà ở', type: 'text', group: 'cn_khach_hang', defaultValue: 'Sở hữu', required: false },
    { id: 'cn_so_dien_thoai', name: 'Số điện thoại', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_email', name: 'Email', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: false },
    { id: 'cn_tinh_trang_hon_nhan', name: 'Tình trạng hôn nhân', type: 'text', group: 'cn_khach_hang', defaultValue: 'Đã kết hôn', required: true },
    { id: 'cn_trinh_do_hoc_van', name: 'Trình độ học vấn', type: 'text', group: 'cn_khach_hang', defaultValue: 'Đại học', required: false },
    { id: 'cn_nghe_nghiep', name: 'Nghề nghiệp', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_chuc_vu', name: 'Chức vụ', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: false },
    { id: 'cn_noi_lam_viec', name: 'Nơi làm việc', type: 'text', group: 'cn_khach_hang', defaultValue: '', required: true },
    { id: 'cn_dia_chi_noi_lam_viec', name: 'Địa chỉ nơi làm việc', type: 'longtext', group: 'cn_khach_hang', defaultValue: '', required: false },
    { id: 'cn_thoi_gian_lam_viec', name: 'Thời gian làm việc (năm)', type: 'number', group: 'cn_khach_hang', defaultValue: 0, required: false },
    { id: 'cn_loai_hdld', name: 'Loại HĐ lao động', type: 'text', group: 'cn_khach_hang', defaultValue: 'Không xác định thời hạn', required: false },
    { id: 'cn_so_nguoi_phu_thuoc', name: 'Số người phụ thuộc', type: 'number', group: 'cn_khach_hang', defaultValue: 0, required: false },

    { id: 'cn_ten_vo_chong', name: 'Họ tên vợ/chồng', type: 'text', group: 'cn_vo_chong', defaultValue: '', required: false },
    { id: 'cn_cccd_vo_chong', name: 'CCCD vợ/chồng', type: 'text', group: 'cn_vo_chong', defaultValue: '', required: false },
    { id: 'cn_ngay_cap_cccd_vo_chong', name: 'Ngày cấp CCCD vợ/chồng', type: 'date', group: 'cn_vo_chong', defaultValue: '', required: false },
    { id: 'cn_noi_cap_cccd_vo_chong', name: 'Nơi cấp CCCD vợ/chồng', type: 'text', group: 'cn_vo_chong', defaultValue: '', required: false },
    { id: 'cn_ngay_sinh_vo_chong', name: 'Ngày sinh vợ/chồng', type: 'date', group: 'cn_vo_chong', defaultValue: '', required: false },
    { id: 'cn_nghe_nghiep_vo_chong', name: 'Nghề nghiệp vợ/chồng', type: 'text', group: 'cn_vo_chong', defaultValue: '', required: false },
    { id: 'cn_thu_nhap_vo_chong', name: 'Thu nhập vợ/chồng', type: 'currency', group: 'cn_vo_chong', defaultValue: 0, required: false },
    { id: 'cn_so_gdk_ket_hon', name: 'Số GĐK kết hôn', type: 'text', group: 'cn_vo_chong', defaultValue: '', required: false },

    { id: 'cn_co_nguoi_dong_vay', name: 'Có người đồng vay/bảo lãnh', type: 'text', group: 'cn_dong_vay', defaultValue: 'Không', required: false },
    {
        id: 'cn_danh_sach_dong_vay', name: 'Danh sách người đồng vay/bảo lãnh', type: 'list', group: 'cn_dong_vay', defaultValue: [], required: false,
        subFields: [
            { id: 'in_dong_vay', name: 'In người này', type: 'boolean', defaultValue: true },
            { id: 'cn_vai_tro', name: 'Vai trò', type: 'text', defaultValue: 'Đồng vay' },
            { id: 'cn_ten_dong_vay', name: 'Họ tên', type: 'text', defaultValue: '' },
            { id: 'cn_cccd_dong_vay', name: 'CCCD', type: 'text', defaultValue: '' },
            { id: 'cn_ngay_cap_cccd_dong_vay', name: 'Ngày cấp', type: 'date', defaultValue: '' },
            { id: 'cn_noi_cap_cccd_dong_vay', name: 'Nơi cấp', type: 'text', defaultValue: '' },
            { id: 'cn_ngay_sinh_dong_vay', name: 'Ngày sinh', type: 'date', defaultValue: '' },
            { id: 'cn_dia_chi_dong_vay', name: 'Địa chỉ', type: 'longtext', defaultValue: '' },
            { id: 'cn_sdt_dong_vay', name: 'SĐT', type: 'text', defaultValue: '' },
            { id: 'cn_quan_he_voi_kh', name: 'Quan hệ với KH', type: 'text', defaultValue: '' },
            { id: 'cn_thu_nhap_dong_vay', name: 'Thu nhập tháng', type: 'currency', defaultValue: 0 },
        ]
    },

    { id: 'cn_luong_co_ban', name: 'Lương cơ bản tháng', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, required: true },
    { id: 'cn_phu_cap', name: 'Phụ cấp tháng', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, required: false },
    { id: 'cn_thuong_binh_quan', name: 'Thưởng bình quân tháng', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, required: false },
    {
        id: 'cn_danh_sach_thu_nhap_khac', name: 'Thu nhập khác', type: 'list', group: 'cn_thu_nhap', defaultValue: [], required: false,
        subFields: [
            { id: 'in_thu_nhap', name: 'In khoản này', type: 'boolean', defaultValue: true },
            { id: 'cn_nguon_thu_nhap', name: 'Nguồn thu nhập', type: 'text', defaultValue: '' },
            { id: 'cn_mo_ta_thu_nhap', name: 'Mô tả', type: 'longtext', defaultValue: '' },
            { id: 'cn_so_tien_thang', name: 'Số tiền/tháng', type: 'currency', defaultValue: 0 },
            { id: 'cn_tan_suat', name: 'Tần suất', type: 'text', defaultValue: 'Hàng tháng' },
            { id: 'cn_chung_tu_cm', name: 'Chứng từ chứng minh', type: 'text', defaultValue: '' },
        ]
    },
    { id: 'cn_tong_thu_nhap_khac', name: 'Tổng thu nhập khác', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, formula: 'SUM(cn_danh_sach_thu_nhap_khac.cn_so_tien_thang)', required: false },
    { id: 'cn_tong_thu_nhap_thang', name: 'Tổng thu nhập tháng', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, formula: 'cn_luong_co_ban + cn_phu_cap + cn_thuong_binh_quan + cn_tong_thu_nhap_khac', required: false },
    { id: 'cn_chi_phi_sinh_hoat', name: 'Chi phí sinh hoạt tháng', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, required: false },
    { id: 'cn_thu_nhap_rong', name: 'Thu nhập ròng tháng', type: 'currency', group: 'cn_thu_nhap', defaultValue: 0, formula: 'cn_tong_thu_nhap_thang - cn_chi_phi_sinh_hoat', required: false },

    { id: 'cn_muc_dich_vay', name: 'Mục đích vay', type: 'longtext', group: 'cn_khoan_vay', defaultValue: '', required: true },
    { id: 'cn_muc_dich_vay_chi_tiet', name: 'Mô tả mục đích chi tiết', type: 'longtext', group: 'cn_khoan_vay', defaultValue: '', required: false },
    { id: 'cn_tong_nhu_cau_von', name: 'Tổng nhu cầu vốn', type: 'currency', group: 'cn_khoan_vay', defaultValue: 0, required: true },
    { id: 'cn_von_tu_co', name: 'Vốn tự có', type: 'currency', group: 'cn_khoan_vay', defaultValue: 0, required: false },
    { id: 'cn_so_tien_de_nghi_vay', name: 'Số tiền đề nghị vay', type: 'currency', group: 'cn_khoan_vay', defaultValue: 0, formula: 'cn_tong_nhu_cau_von - cn_von_tu_co', required: true },
    { id: 'cn_so_tien_vay_bang_chu', name: 'Số tiền vay bằng chữ', type: 'text', group: 'cn_khoan_vay', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(cn_so_tien_de_nghi_vay)', required: false },
    { id: 'cn_ty_le_von_doi_ung', name: 'Tỷ lệ vốn đối ứng (%)', type: 'number', group: 'cn_khoan_vay', defaultValue: 0, formula: 'cn_von_tu_co / cn_tong_nhu_cau_von * 100', required: false },
    { id: 'cn_thoi_han_vay', name: 'Thời hạn vay (tháng)', type: 'number', group: 'cn_khoan_vay', defaultValue: 36, required: true },
    { id: 'cn_lai_suat_vay', name: 'Lãi suất vay (%/năm)', type: 'number', group: 'cn_khoan_vay', defaultValue: 10.5, required: true },
    { id: 'cn_lai_suat_qua_han', name: 'Lãi suất quá hạn (%/năm)', type: 'number', group: 'cn_khoan_vay', defaultValue: 15.75, formula: 'cn_lai_suat_vay * 1.5', required: true },
    { id: 'cn_phuong_thuc_tra_no', name: 'Phương thức trả nợ', type: 'text', group: 'cn_khoan_vay', defaultValue: 'Trả gốc và lãi hàng tháng theo dư nợ giảm dần', required: true },
    { id: 'cn_ky_tra_no_goc', name: 'Kỳ trả nợ gốc', type: 'text', group: 'cn_khoan_vay', defaultValue: 'Hàng tháng', required: false },
    { id: 'cn_ky_tra_lai', name: 'Kỳ trả lãi', type: 'text', group: 'cn_khoan_vay', defaultValue: 'Hàng tháng', required: false },
    { id: 'cn_nguon_tra_no', name: 'Nguồn trả nợ', type: 'longtext', group: 'cn_khoan_vay', defaultValue: 'Từ thu nhập lương hàng tháng', required: false },

    {
        id: 'cn_danh_sach_tsdb', name: 'Danh sách TSĐB', type: 'list', group: 'cn_tai_san_dam_bao', defaultValue: [], required: false,
        subFields: [
            { id: 'in_tai_san', name: 'In tài sản này', type: 'boolean', defaultValue: true },
            { id: 'cn_loai_tsdb', name: 'Loại TSĐB', type: 'text', defaultValue: 'Bất động sản#Sổ tiết kiệm/Giấy tờ có giá#Xe ô tô#Máy móc thiết bị#Hàng hóa#Tài sản khác' },
            { id: 'cn_nguon_chu_so_huu_ts', name: 'Nguồn chủ sở hữu', type: 'text', defaultValue: 'Người vay#Vợ/chồng người vay#Người vay + vợ/chồng#Người đồng vay / bảo lãnh#Nhập thủ công' },
            { id: 'cn_ten_tsdb', name: 'Tên tài sản', type: 'text', defaultValue: '' },
            { id: 'cn_mo_ta_tsdb', name: 'Mô tả chi tiết', type: 'longtext', defaultValue: '' },
            { id: 'cn_so_giay_to_so_huu', name: 'Số giấy tờ sở hữu / Số giấy chứng nhận / Số đăng ký', type: 'text', defaultValue: '' },
            { id: 'cn_ngay_cap_giay_to', name: 'Ngày cấp giấy tờ', type: 'date', defaultValue: '' },
            { id: 'cn_noi_cap_giay_to', name: 'Nơi cấp giấy tờ', type: 'text', defaultValue: '' },
            { id: 'cn_chu_so_huu_ts', name: 'Chủ sở hữu (ghi tất cả đồng sở hữu)', type: 'longtext', defaultValue: '' },
            { id: 'cn_so_luong_chu_so_huu_ts', name: 'Số lượng chủ sở hữu', type: 'text', defaultValue: '1#2#3' , showWhen: { fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] } },
            { id: 'cn_chu_so_huu_1_ho_ten', name: 'Chủ sở hữu 1 - Họ tên', type: 'text', defaultValue: '' , showWhen: { fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] } },
            { id: 'cn_chu_so_huu_1_cccd', name: 'Chủ sở hữu 1 - CCCD/MST', type: 'text', defaultValue: '' , showWhen: { fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] } },
            { id: 'cn_chu_so_huu_1_ngay_cap_cccd', name: 'Chủ sở hữu 1 - Ngày cấp CCCD/MST', type: 'date', defaultValue: '' , showWhen: { fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] } },
            { id: 'cn_chu_so_huu_1_noi_cap_cccd', name: 'Chủ sở hữu 1 - Nơi cấp CCCD/MST', type: 'text', defaultValue: '' , showWhen: { fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] } },
            { id: 'cn_chu_so_huu_1_dia_chi', name: 'Chủ sở hữu 1 - Địa chỉ', type: 'longtext', defaultValue: '' , showWhen: { fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] } },

            { id: 'cn_chu_so_huu_2_ho_ten', name: 'Chủ sở hữu 2 - Họ tên', type: 'text', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['2', '3', 2, 3] }] },
            { id: 'cn_chu_so_huu_2_cccd', name: 'Chủ sở hữu 2 - CCCD/MST', type: 'text', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['2', '3', 2, 3] }] },
            { id: 'cn_chu_so_huu_2_ngay_cap_cccd', name: 'Chủ sở hữu 2 - Ngày cấp CCCD/MST', type: 'date', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['2', '3', 2, 3] }] },
            { id: 'cn_chu_so_huu_2_noi_cap_cccd', name: 'Chủ sở hữu 2 - Nơi cấp CCCD/MST', type: 'text', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['2', '3', 2, 3] }] },
            { id: 'cn_chu_so_huu_2_dia_chi', name: 'Chủ sở hữu 2 - Địa chỉ', type: 'longtext', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['2', '3', 2, 3] }] },

            { id: 'cn_chu_so_huu_3_ho_ten', name: 'Chủ sở hữu 3 - Họ tên', type: 'text', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['3', 3] }] },
            { id: 'cn_chu_so_huu_3_cccd', name: 'Chủ sở hữu 3 - CCCD/MST', type: 'text', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['3', 3] }] },
            { id: 'cn_chu_so_huu_3_ngay_cap_cccd', name: 'Chủ sở hữu 3 - Ngày cấp CCCD/MST', type: 'date', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['3', 3] }] },
            { id: 'cn_chu_so_huu_3_noi_cap_cccd', name: 'Chủ sở hữu 3 - Nơi cấp CCCD/MST', type: 'text', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['3', 3] }] },
            { id: 'cn_chu_so_huu_3_dia_chi', name: 'Chủ sở hữu 3 - Địa chỉ', type: 'longtext', defaultValue: '', showWhen: [{ fieldId: 'cn_nguon_chu_so_huu_ts', values: ['Nhập thủ công'] }, { fieldId: 'cn_so_luong_chu_so_huu_ts', values: ['3', 3] }] },
            { id: 'cn_dia_chi_tsdb', name: 'Địa chỉ/Vị trí TS', type: 'longtext', defaultValue: '', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Bất động sản', 'Xe ô tô', 'Máy móc thiết bị', 'Hàng hóa', 'Tài sản khác'] } },
            { id: 'cn_dien_tich', name: 'Diện tích (m2) / Số lượng', type: 'number', defaultValue: 0, showWhen: { fieldId: 'cn_loai_tsdb', values: ['Bất động sản', 'Máy móc thiết bị', 'Hàng hóa'] } },
            { id: 'cn_muc_dich_su_dung', name: 'Mục đích sử dụng / Công dụng', type: 'text', defaultValue: '', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Bất động sản', 'Xe ô tô', 'Máy móc thiết bị', 'Hàng hóa', 'Tài sản khác'] } },
            { id: 'cn_thoi_han_su_dung', name: 'Thời hạn sử dụng / Niên hạn', type: 'text', defaultValue: 'Lâu dài', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Bất động sản', 'Xe ô tô', 'Máy móc thiết bị'] } },
            { id: 'cn_bien_kiem_soat', name: 'Biển kiểm soát / Số khung / Số máy', type: 'text', defaultValue: '', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Xe ô tô'] } },
            { id: 'cn_so_so_tiet_kiem', name: 'Số sổ tiết kiệm / Số giấy tờ có giá', type: 'text', defaultValue: '', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Sổ tiết kiệm/Giấy tờ có giá'] } },
            { id: 'cn_to_chuc_phat_hanh_tsdb', name: 'Tổ chức phát hành / Nơi mở sổ', type: 'text', defaultValue: '', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Sổ tiết kiệm/Giấy tờ có giá'] } },
            { id: 'cn_ngay_den_han_tsdb', name: 'Ngày đến hạn tài sản', type: 'date', defaultValue: '', showWhen: { fieldId: 'cn_loai_tsdb', values: ['Sổ tiết kiệm/Giấy tờ có giá'] } },
            { id: 'cn_gia_tri_dinh_gia', name: 'Giá trị định giá', type: 'currency', defaultValue: 0 },
            { id: 'cn_ngay_dinh_gia', name: 'Ngày định giá', type: 'date', defaultValue: '' },
            { id: 'cn_don_vi_dinh_gia', name: 'Đơn vị định giá', type: 'text', defaultValue: 'Nội bộ ngân hàng' },
            { id: 'cn_ty_le_cho_vay', name: 'Tỷ lệ cho vay (%)', type: 'number', defaultValue: 70 },
            { id: 'cn_muc_cho_vay_toi_da', name: 'Mức cho vay tối đa', type: 'currency', defaultValue: 0, formula: 'cn_gia_tri_dinh_gia * cn_ty_le_cho_vay / 100' },
            { id: 'cn_so_hd_the_chap', name: 'Số HĐ thế chấp', type: 'text', defaultValue: '' },
            { id: 'cn_ngay_ky_hd_the_chap', name: 'Ngày ký HĐ thế chấp', type: 'date', defaultValue: '' },
            { id: 'cn_noi_cong_chung', name: 'Nơi công chứng', type: 'text', defaultValue: '' },
            { id: 'cn_so_cong_chung', name: 'Số công chứng', type: 'text', defaultValue: '' },
            { id: 'cn_ngay_dk_gdbd', name: 'Ngày đăng ký GDBĐ', type: 'date', defaultValue: '' },
            { id: 'cn_noi_dk_gdbd', name: 'Nơi đăng ký GDBĐ', type: 'text', defaultValue: '' },
            { id: 'cn_noi_luu_giu_ts', name: 'Nơi lưu giữ tài sản', type: 'text', defaultValue: 'Kho ngân hàng' },
        ]
    },
    { id: 'cn_tong_gia_tri_tsdb', name: 'Tổng giá trị TSĐB', type: 'currency', group: 'cn_tai_san_dam_bao', defaultValue: 0, formula: 'SUM(cn_danh_sach_tsdb.cn_gia_tri_dinh_gia)', required: false },
    { id: 'cn_ty_le_tsdb_tren_khoan_vay', name: 'Tỷ lệ TSĐB / Khoản vay (%)', type: 'number', group: 'cn_tai_san_dam_bao', defaultValue: 0, formula: 'cn_tong_gia_tri_tsdb / cn_so_tien_de_nghi_vay * 100', required: false },

    {
        id: 'cn_danh_sach_nhan_no', name: 'Danh sách nhận nợ', type: 'list', group: 'cn_nhan_no', defaultValue: [], required: false,
        subFields: [
            { id: 'in_lan_nhan_no', name: 'In lần nhận nợ', type: 'boolean', defaultValue: true },
            { id: 'cn_lan_thu', name: 'Lần thứ', type: 'number', defaultValue: 1 },
            { id: 'cn_so_giay_nhan_no', name: 'Số GNN', type: 'text', defaultValue: '' },
            { id: 'cn_ngay_nhan_no', name: 'Ngày nhận nợ', type: 'date', defaultValue: '' },
            { id: 'cn_so_tien_nhan_no', name: 'Số tiền nhận nợ', type: 'currency', defaultValue: 0 },
            { id: 'cn_so_tien_nhan_no_chu', name: 'Số tiền bằng chữ', type: 'text', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(cn_so_tien_nhan_no)' },
            { id: 'cn_muc_dich_chi_tiet', name: 'Mục đích sử dụng', type: 'longtext', defaultValue: '' },
            { id: 'cn_lai_suat_ap_dung', name: 'Lãi suất áp dụng (%/năm)', type: 'number', defaultValue: 10.5 },
            { id: 'cn_thoi_han_nhan_no', name: 'Thời hạn (tháng)', type: 'number', defaultValue: 36 },
            { id: 'cn_ngay_tra_no_cuoi', name: 'Ngày trả nợ cuối', type: 'date', defaultValue: '' },
            { id: 'cn_tai_khoan_giai_ngan', name: 'TK giải ngân', type: 'text', defaultValue: '' },
            { id: 'cn_nguoi_thu_huong', name: 'Người thụ hưởng', type: 'text', defaultValue: '' },
        ]
    },
    { id: 'cn_tong_da_nhan_no', name: 'Tổng đã nhận nợ', type: 'currency', group: 'cn_nhan_no', defaultValue: 0, formula: 'SUM(cn_danh_sach_nhan_no.cn_so_tien_nhan_no)', required: false },
    { id: 'cn_so_du_no_con_lai', name: 'Số dư nợ còn lại', type: 'currency', group: 'cn_nhan_no', defaultValue: 0, formula: 'cn_so_tien_de_nghi_vay - cn_tong_da_nhan_no', required: false },

    { id: 'cn_so_hd_tin_dung', name: 'Số HĐ tín dụng', type: 'text', group: 'cn_hop_dong', defaultValue: '', required: true },
    { id: 'cn_ngay_ky_hop_dong', name: 'Ngày ký HĐTD', type: 'date', group: 'cn_hop_dong', defaultValue: '', required: true },
    { id: 'cn_noi_ky_hop_dong', name: 'Nơi ký', type: 'text', group: 'cn_hop_dong', defaultValue: '', required: false },
    { id: 'cn_ten_chi_nhanh', name: 'Chi nhánh ngân hàng', type: 'text', group: 'cn_hop_dong', defaultValue: 'Agribank Chi nhánh Đà Nẵng', required: true },
    { id: 'cn_nguoi_dai_dien_nh', name: 'Người đại diện ngân hàng', type: 'text', group: 'cn_hop_dong', defaultValue: '', required: true },
    { id: 'cn_chuc_vu_dai_dien', name: 'Chức vụ đại diện', type: 'text', group: 'cn_hop_dong', defaultValue: 'Giám đốc', required: false },
    { id: 'cn_can_bo_tin_dung', name: 'Cán bộ tín dụng', type: 'text', group: 'cn_hop_dong', defaultValue: '', required: true },
    { id: 'cn_so_to_trinh', name: 'Số tờ trình thẩm định', type: 'text', group: 'cn_hop_dong', defaultValue: '', required: false },
    { id: 'cn_ngay_to_trinh', name: 'Ngày tờ trình', type: 'date', group: 'cn_hop_dong', defaultValue: '', required: false },

    { id: 'cn_cic_ngay', name: 'Ngày tra cứu CIC', type: 'date', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_agribank_du_no', name: 'Dư nợ tại Agribank', type: 'currency', group: 'cn_quan_he_tin_dung_cic', defaultValue: 0, required: false },
    { id: 'cn_agribank_nhom_no', name: 'Nhóm nợ tại Agribank', type: 'text', group: 'cn_quan_he_tin_dung_cic', defaultValue: 'Nhóm 1', required: false },
    { id: 'cn_tctd_khac_ten', name: 'Tên TCTD khác', type: 'text', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_tctd_khac_du_no', name: 'Dư nợ tại TCTD khác', type: 'currency', group: 'cn_quan_he_tin_dung_cic', defaultValue: 0, required: false },
    { id: 'cn_tctd_khac_nhom_no', name: 'Nhóm nợ tại TCTD khác', type: 'text', group: 'cn_quan_he_tin_dung_cic', defaultValue: 'Nhóm 1', required: false },
    { id: 'cn_the_tin_dung_du_no', name: 'Dư nợ thẻ tín dụng', type: 'currency', group: 'cn_quan_he_tin_dung_cic', defaultValue: 0, required: false },
    { id: 'cn_no_xau_5_nam', name: 'Tình trạng nợ xấu 5 năm', type: 'longtext', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_no_chu_y_12_thang', name: 'Tình trạng nợ chú ý 12 tháng', type: 'longtext', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_no_ban_vamc', name: 'Tình trạng nợ bán VAMC', type: 'longtext', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_xep_hang_noi_bo_ngay', name: 'Ngày xếp hạng nội bộ', type: 'date', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_xep_hang_noi_bo_hang', name: 'Hạng xếp hạng nội bộ', type: 'text', group: 'cn_quan_he_tin_dung_cic', defaultValue: '', required: false },
    { id: 'cn_ma_khach_hang', name: 'Mã khách hàng', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_ma_so_thue_chi_nhanh', name: 'Mã số thuế chi nhánh', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_giay_dang_ky_hoat_dong_cn', name: 'Giấy đăng ký hoạt động chi nhánh', type: 'longtext', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_cccd_nguoi_dai_dien_nh', name: 'CCCD người đại diện ngân hàng', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_ngay_cap_cccd_nguoi_dai_dien_nh', name: 'Ngày cấp CCCD người đại diện ngân hàng', type: 'date', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_noi_cap_cccd_nguoi_dai_dien_nh', name: 'Nơi cấp CCCD người đại diện ngân hàng', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_giay_uy_quyen_so', name: 'Giấy ủy quyền số', type: 'longtext', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_can_bo_tin_dung_cccd', name: 'CCCD cán bộ tín dụng', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_can_bo_tin_dung_ngay_cap_cccd', name: 'Ngày cấp CCCD cán bộ tín dụng', type: 'date', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_can_bo_tin_dung_noi_cap_cccd', name: 'Nơi cấp CCCD cán bộ tín dụng', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_can_bo_tin_dung_sdt', name: 'Số điện thoại cán bộ tín dụng', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_nguoi_tham_dinh', name: 'Người thẩm định', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_chuc_vu_nguoi_tham_dinh', name: 'Chức vụ người thẩm định', type: 'text', group: 'cn_ngan_hang_can_bo', defaultValue: '', required: false },
    { id: 'cn_hs_phap_ly', name: 'Hồ sơ pháp lý', type: 'list', group: 'cn_danh_muc_ho_so', defaultValue: [], required: false, subFields: [{ id: 'ten_ho_so', name: 'Tên hồ sơ', type: 'text', defaultValue: '' }, { id: 'ghi_chu', name: 'Ghi chú', type: 'text', defaultValue: '' }] },
    { id: 'cn_hs_kinh_te', name: 'Hồ sơ kinh tế / nguồn thu', type: 'list', group: 'cn_danh_muc_ho_so', defaultValue: [], required: false, subFields: [{ id: 'ten_ho_so', name: 'Tên hồ sơ', type: 'text', defaultValue: '' }, { id: 'ghi_chu', name: 'Ghi chú', type: 'text', defaultValue: '' }] },
    { id: 'cn_hs_muc_dich_su_dung_von', name: 'Hồ sơ mục đích sử dụng vốn', type: 'list', group: 'cn_danh_muc_ho_so', defaultValue: [], required: false, subFields: [{ id: 'ten_ho_so', name: 'Tên hồ sơ', type: 'text', defaultValue: '' }, { id: 'ghi_chu', name: 'Ghi chú', type: 'text', defaultValue: '' }] },
];

// ============================================================
// 4. HỒ SƠ DOANH NGHIỆP
// ============================================================
const doanhNghiepFieldGroups = [
    { id: 'dn_doanh_nghiep', name: 'Thông tin doanh nghiệp' },
    { id: 'dn_nguoi_dai_dien', name: 'Người đại diện pháp luật' },
    { id: 'dn_nguoi_uy_quyen', name: 'Người được uỷ quyền' },
    { id: 'dn_tai_chinh', name: 'Thông tin tài chính' },
    { id: 'dn_cic', name: 'Quan hệ tín dụng (CIC)' },
    { id: 'dn_khoan_vay', name: 'Thông tin khoản vay' },
    { id: 'dn_tai_san_dam_bao', name: 'Tài sản đảm bảo' },
    { id: 'dn_nhan_no', name: 'Nhận nợ' },
    { id: 'dn_hop_dong', name: 'Hợp đồng tín dụng' },
];

const doanhNghiepFields = [
    { id: 'dn_ten_doanh_nghiep', name: 'Tên doanh nghiệp (đầy đủ)', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_ten_viet_tat', name: 'Tên viết tắt', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_ten_tieng_anh', name: 'Tên tiếng Anh', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_loai_hinh_dn', name: 'Loại hình DN', type: 'text', group: 'dn_doanh_nghiep', defaultValue: 'Công ty TNHH', required: true },
    { id: 'dn_ma_so_thue', name: 'Mã số thuế', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_so_dkkd', name: 'Số ĐKKD/GCNĐKDN', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_ngay_cap_dkkd', name: 'Ngày cấp ĐKKD', type: 'date', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_noi_cap_dkkd', name: 'Nơi cấp', type: 'text', group: 'dn_doanh_nghiep', defaultValue: 'Sở KHĐT', required: true },
    { id: 'dn_lan_thay_doi_dkkd', name: 'Lần thay đổi gần nhất', type: 'number', group: 'dn_doanh_nghiep', defaultValue: 0, required: false },
    { id: 'dn_ngay_thay_doi_dkkd', name: 'Ngày thay đổi gần nhất', type: 'date', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_ngay_thanh_lap', name: 'Ngày thành lập', type: 'date', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_dia_chi_tru_so', name: 'Địa chỉ trụ sở chính', type: 'longtext', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_dia_chi_kinh_doanh', name: 'Địa chỉ kinh doanh', type: 'longtext', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_dien_thoai', name: 'Điện thoại', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_email', name: 'Email', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_website', name: 'Website', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_nganh_nghe_chinh', name: 'Ngành nghề kinh doanh chính', type: 'longtext', group: 'dn_doanh_nghiep', defaultValue: '', required: true },
    { id: 'dn_ma_nganh_chinh', name: 'Mã ngành chính', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_nganh_nghe_phu', name: 'Ngành nghề phụ', type: 'longtext', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_von_dieu_le', name: 'Vốn điều lệ', type: 'currency', group: 'dn_doanh_nghiep', defaultValue: 0, required: true },
    { id: 'dn_von_dieu_le_bang_chu', name: 'Vốn điều lệ bằng chữ', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(dn_von_dieu_le)', required: false },
    { id: 'dn_von_thuc_gop', name: 'Vốn thực góp', type: 'currency', group: 'dn_doanh_nghiep', defaultValue: 0, required: false },
    { id: 'dn_so_lao_dong', name: 'Số lao động', type: 'number', group: 'dn_doanh_nghiep', defaultValue: 0, required: false },
    { id: 'dn_tai_khoan_thanh_toan', name: 'Số TK thanh toán chính', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },
    { id: 'dn_ngan_hang_mo_tk', name: 'Ngân hàng mở TK', type: 'text', group: 'dn_doanh_nghiep', defaultValue: '', required: false },

    { id: 'dn_ten_nguoi_dai_dien', name: 'Họ tên người đại diện', type: 'text', group: 'dn_nguoi_dai_dien', defaultValue: '', required: true },
    { id: 'dn_chuc_vu_dai_dien', name: 'Chức vụ', type: 'text', group: 'dn_nguoi_dai_dien', defaultValue: 'Giám đốc', required: true },
    { id: 'dn_cccd_dai_dien', name: 'CCCD', type: 'text', group: 'dn_nguoi_dai_dien', defaultValue: '', required: true },
    { id: 'dn_ngay_cap_cccd_dai_dien', name: 'Ngày cấp CCCD', type: 'date', group: 'dn_nguoi_dai_dien', defaultValue: '', required: true },
    { id: 'dn_noi_cap_cccd_dai_dien', name: 'Nơi cấp CCCD', type: 'text', group: 'dn_nguoi_dai_dien', defaultValue: 'Cục Cảnh sát QLHC về TTXH', required: false },
    { id: 'dn_ngay_sinh_dai_dien', name: 'Ngày sinh', type: 'date', group: 'dn_nguoi_dai_dien', defaultValue: '', required: false },
    { id: 'dn_gioi_tinh_dai_dien', name: 'Giới tính', type: 'text', group: 'dn_nguoi_dai_dien', defaultValue: 'Nam', required: false },
    { id: 'dn_ho_khau_dai_dien', name: 'Hộ khẩu thường trú', type: 'longtext', group: 'dn_nguoi_dai_dien', defaultValue: '', required: true },
    { id: 'dn_dia_chi_lh_dai_dien', name: 'Địa chỉ liên hệ', type: 'longtext', group: 'dn_nguoi_dai_dien', defaultValue: '', required: false },
    { id: 'dn_sdt_dai_dien', name: 'SĐT', type: 'text', group: 'dn_nguoi_dai_dien', defaultValue: '', required: true },

    { id: 'dn_co_nguoi_uy_quyen', name: 'Có uỷ quyền cho người khác', type: 'text', group: 'dn_nguoi_uy_quyen', defaultValue: 'Không', required: false },
    { id: 'dn_ten_nguoi_uy_quyen', name: 'Họ tên người được uỷ quyền', type: 'text', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_chuc_vu_uy_quyen', name: 'Chức vụ', type: 'text', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_cccd_uy_quyen', name: 'CCCD', type: 'text', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_ngay_cap_cccd_uq', name: 'Ngày cấp CCCD', type: 'date', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_noi_cap_cccd_uq', name: 'Nơi cấp CCCD', type: 'text', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_dia_chi_uy_quyen', name: 'Địa chỉ thường trú', type: 'longtext', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_so_vb_uy_quyen', name: 'Số văn bản uỷ quyền', type: 'text', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_ngay_vb_uy_quyen', name: 'Ngày văn bản uỷ quyền', type: 'date', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },
    { id: 'dn_pham_vi_uy_quyen', name: 'Phạm vi uỷ quyền', type: 'longtext', group: 'dn_nguoi_uy_quyen', defaultValue: '', required: false },

    {
        id: 'dn_danh_sach_tai_chinh', name: 'Số liệu tài chính theo năm', type: 'list', group: 'dn_tai_chinh', defaultValue: [], required: true,
        subFields: [
            { id: 'in_nam', name: 'In năm này', type: 'boolean', defaultValue: true },
            { id: 'dn_nam_tai_chinh', name: 'Năm tài chính', type: 'number', defaultValue: 2025 },
            { id: 'dn_loai_bao_cao', name: 'Loại báo cáo', type: 'text', defaultValue: 'BCTC kiểm toán' },
            { id: 'dn_tong_tai_san', name: 'Tổng tài sản', type: 'currency', defaultValue: 0 },
            { id: 'dn_tai_san_ngan_han', name: 'Tài sản ngắn hạn', type: 'currency', defaultValue: 0 },
            { id: 'dn_tai_san_dai_han', name: 'Tài sản dài hạn', type: 'currency', defaultValue: 0 },
            { id: 'dn_tong_no_phai_tra', name: 'Tổng nợ phải trả', type: 'currency', defaultValue: 0 },
            { id: 'dn_no_ngan_han', name: 'Nợ ngắn hạn', type: 'currency', defaultValue: 0 },
            { id: 'dn_no_dai_han', name: 'Nợ dài hạn', type: 'currency', defaultValue: 0 },
            { id: 'dn_von_chu_so_huu', name: 'Vốn chủ sở hữu', type: 'currency', defaultValue: 0 },
            { id: 'dn_doanh_thu', name: 'Doanh thu thuần', type: 'currency', defaultValue: 0 },
            { id: 'dn_gia_von', name: 'Giá vốn hàng bán', type: 'currency', defaultValue: 0 },
            { id: 'dn_loi_nhuan_gop', name: 'Lợi nhuận gộp', type: 'currency', defaultValue: 0, formula: 'dn_doanh_thu - dn_gia_von' },
            { id: 'dn_chi_phi_quan_ly', name: 'Chi phí QLDN', type: 'currency', defaultValue: 0 },
            { id: 'dn_chi_phi_ban_hang', name: 'Chi phí bán hàng', type: 'currency', defaultValue: 0 },
            { id: 'dn_chi_phi_tai_chinh', name: 'Chi phí tài chính', type: 'currency', defaultValue: 0 },
            { id: 'dn_loi_nhuan_truoc_thue', name: 'LN trước thuế', type: 'currency', defaultValue: 0 },
            { id: 'dn_thue_tndn', name: 'Thuế TNDN', type: 'currency', defaultValue: 0 },
            { id: 'dn_loi_nhuan_sau_thue', name: 'LN sau thuế', type: 'currency', defaultValue: 0, formula: 'dn_loi_nhuan_truoc_thue - dn_thue_tndn' },
            { id: 'dn_ty_suat_loi_nhuan', name: 'Tỷ suất LN/DT (%)', type: 'number', defaultValue: 0, formula: 'dn_loi_nhuan_sau_thue / dn_doanh_thu * 100' },
            { id: 'dn_he_so_no', name: 'Hệ số nợ (%)', type: 'number', defaultValue: 0, formula: 'dn_tong_no_phai_tra / dn_tong_tai_san * 100' },
            { id: 'dn_kha_nang_tt', name: 'Khả năng thanh toán hiện thời', type: 'number', defaultValue: 0, formula: 'dn_tai_san_ngan_han / dn_no_ngan_han' },
        ]
    },

    { id: 'dn_co_quan_he_tin_dung', name: 'Có quan hệ tín dụng tại TCTD khác', type: 'text', group: 'dn_cic', defaultValue: 'Có', required: true },
    {
        id: 'dn_danh_sach_quan_he_td', name: 'Danh sách quan hệ tín dụng', type: 'list', group: 'dn_cic', defaultValue: [], required: false,
        subFields: [
            { id: 'in_quan_he', name: 'In quan hệ này', type: 'boolean', defaultValue: true },
            { id: 'dn_ten_tctd', name: 'Tên TCTD', type: 'text', defaultValue: '' },
            { id: 'dn_loai_san_pham', name: 'Loại sản phẩm', type: 'text', defaultValue: 'Vay ngắn hạn' },
            { id: 'dn_han_muc_tin_dung', name: 'Hạn mức cấp', type: 'currency', defaultValue: 0 },
            { id: 'dn_du_no_hien_tai', name: 'Dư nợ hiện tại', type: 'currency', defaultValue: 0 },
            { id: 'dn_trong_do_qua_han', name: 'Trong đó quá hạn', type: 'currency', defaultValue: 0 },
            { id: 'dn_nhom_no', name: 'Nhóm nợ', type: 'number', defaultValue: 1 },
            { id: 'dn_ngay_phat_sinh_td', name: 'Ngày phát sinh', type: 'date', defaultValue: '' },
            { id: 'dn_ngay_dao_han_td', name: 'Ngày đáo hạn', type: 'date', defaultValue: '' },
            { id: 'dn_tsdb_kem_theo', name: 'TSĐB kèm theo', type: 'longtext', defaultValue: '' },
        ]
    },
    { id: 'dn_ngay_tra_cuu_cic', name: 'Ngày tra cứu CIC', type: 'date', group: 'dn_cic', defaultValue: '', required: false },
    { id: 'dn_nhom_no_cao_nhat_cic', name: 'Nhóm nợ cao nhất theo CIC', type: 'number', group: 'dn_cic', defaultValue: 1, required: false },
    { id: 'dn_tong_du_no_hien_tai', name: 'Tổng dư nợ hiện tại tại các TCTD', type: 'currency', group: 'dn_cic', defaultValue: 0, formula: 'SUM(dn_danh_sach_quan_he_td.dn_du_no_hien_tai)', required: false },

    { id: 'dn_loai_khoan_vay', name: 'Loại khoản vay', type: 'text', group: 'dn_khoan_vay', defaultValue: 'Vay theo món', required: true },
    { id: 'dn_muc_dich_vay', name: 'Mục đích vay', type: 'longtext', group: 'dn_khoan_vay', defaultValue: 'Bổ sung vốn lưu động phục vụ SXKD', required: true },
    { id: 'dn_phuong_an_kinh_doanh', name: 'Phương án kinh doanh / Dự án', type: 'longtext', group: 'dn_khoan_vay', defaultValue: '', required: true },
    { id: 'dn_tong_nhu_cau_von', name: 'Tổng nhu cầu vốn dự án', type: 'currency', group: 'dn_khoan_vay', defaultValue: 0, required: true },
    { id: 'dn_von_tu_co', name: 'Vốn tự có DN tham gia', type: 'currency', group: 'dn_khoan_vay', defaultValue: 0, required: true },
    { id: 'dn_von_huy_dong_khac', name: 'Vốn huy động khác', type: 'currency', group: 'dn_khoan_vay', defaultValue: 0, required: false },
    { id: 'dn_so_tien_de_nghi_vay', name: 'Số tiền đề nghị vay', type: 'currency', group: 'dn_khoan_vay', defaultValue: 0, formula: 'dn_tong_nhu_cau_von - dn_von_tu_co - dn_von_huy_dong_khac', required: true },
    { id: 'dn_so_tien_vay_bang_chu', name: 'Số tiền vay bằng chữ', type: 'text', group: 'dn_khoan_vay', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(dn_so_tien_de_nghi_vay)', required: false },
    { id: 'dn_ty_le_von_doi_ung', name: 'Tỷ lệ vốn đối ứng (%)', type: 'number', group: 'dn_khoan_vay', defaultValue: 0, formula: 'dn_von_tu_co / dn_tong_nhu_cau_von * 100', required: false },
    { id: 'dn_thoi_han_vay_thang', name: 'Thời hạn vay (tháng)', type: 'number', group: 'dn_khoan_vay', defaultValue: 12, required: true },
    { id: 'dn_thoi_han_an_han', name: 'Thời gian ân hạn (tháng)', type: 'number', group: 'dn_khoan_vay', defaultValue: 0, required: false },
    { id: 'dn_lai_suat_vay', name: 'Lãi suất vay (%/năm)', type: 'number', group: 'dn_khoan_vay', defaultValue: 9.5, required: true },
    { id: 'dn_lai_suat_qua_han', name: 'Lãi suất quá hạn (%/năm)', type: 'number', group: 'dn_khoan_vay', defaultValue: 14.25, formula: 'dn_lai_suat_vay * 1.5', required: true },
    { id: 'dn_phuong_thuc_dieu_chinh_lai', name: 'Phương thức điều chỉnh lãi', type: 'text', group: 'dn_khoan_vay', defaultValue: 'Định kỳ 3 tháng/lần', required: false },
    { id: 'dn_phuong_thuc_giai_ngan', name: 'Phương thức giải ngân', type: 'text', group: 'dn_khoan_vay', defaultValue: 'Chuyển khoản theo nhu cầu', required: true },
    { id: 'dn_phuong_thuc_tra_no_goc', name: 'Phương thức trả nợ gốc', type: 'longtext', group: 'dn_khoan_vay', defaultValue: 'Trả gốc theo dòng tiền dự án', required: true },
    { id: 'dn_phuong_thuc_tra_lai', name: 'Phương thức trả lãi', type: 'text', group: 'dn_khoan_vay', defaultValue: 'Trả lãi hàng tháng', required: true },
    { id: 'dn_nguon_tra_no', name: 'Nguồn trả nợ', type: 'longtext', group: 'dn_khoan_vay', defaultValue: 'Doanh thu từ hoạt động SXKD', required: true },

    {
        id: 'dn_danh_sach_tsdb', name: 'Danh sách TSĐB', type: 'list', group: 'dn_tai_san_dam_bao', defaultValue: [], required: true,
        subFields: [
            { id: 'in_tai_san', name: 'In tài sản này', type: 'boolean', defaultValue: true },
            { id: 'dn_loai_tsdb', name: 'Loại TSĐB', type: 'text', defaultValue: 'Bất động sản' },
            { id: 'dn_ten_tsdb', name: 'Tên tài sản', type: 'text', defaultValue: '' },
            { id: 'dn_mo_ta_tsdb', name: 'Mô tả chi tiết', type: 'longtext', defaultValue: '' },
            { id: 'dn_so_giay_to_so_huu', name: 'Số giấy chứng nhận', type: 'text', defaultValue: '' },
            { id: 'dn_ngay_cap_giay_to', name: 'Ngày cấp giấy tờ', type: 'date', defaultValue: '' },
            { id: 'dn_noi_cap_giay_to', name: 'Nơi cấp', type: 'text', defaultValue: '' },
            { id: 'dn_ten_chu_so_huu', name: 'Chủ sở hữu', type: 'text', defaultValue: '' },
            { id: 'dn_loai_chu_so_huu', name: 'Loại chủ sở hữu', type: 'text', defaultValue: 'Doanh nghiệp' },
            { id: 'dn_dia_chi_tsdb', name: 'Địa chỉ/Vị trí TS', type: 'longtext', defaultValue: '' },
            { id: 'dn_dien_tich_ts', name: 'Diện tích/Số lượng', type: 'text', defaultValue: '' },
            { id: 'dn_muc_dich_su_dung', name: 'Mục đích sử dụng', type: 'text', defaultValue: '' },
            { id: 'dn_thoi_han_su_dung', name: 'Thời hạn sử dụng', type: 'text', defaultValue: 'Lâu dài' },
            { id: 'dn_gia_tri_so_sach', name: 'Giá trị sổ sách', type: 'currency', defaultValue: 0 },
            { id: 'dn_gia_tri_dinh_gia', name: 'Giá trị định giá', type: 'currency', defaultValue: 0 },
            { id: 'dn_ngay_dinh_gia', name: 'Ngày định giá', type: 'date', defaultValue: '' },
            { id: 'dn_don_vi_dinh_gia', name: 'Đơn vị định giá', type: 'text', defaultValue: '' },
            { id: 'dn_ty_le_cho_vay', name: 'Tỷ lệ cho vay (%)', type: 'number', defaultValue: 70 },
            { id: 'dn_muc_cho_vay_toi_da', name: 'Mức cho vay tối đa', type: 'currency', defaultValue: 0, formula: 'dn_gia_tri_dinh_gia * dn_ty_le_cho_vay / 100' },
            { id: 'dn_so_hd_the_chap', name: 'Số HĐ thế chấp', type: 'text', defaultValue: '' },
            { id: 'dn_ngay_ky_hd_the_chap', name: 'Ngày ký HĐ thế chấp', type: 'date', defaultValue: '' },
            { id: 'dn_noi_cong_chung', name: 'Nơi công chứng', type: 'text', defaultValue: '' },
            { id: 'dn_so_cong_chung', name: 'Số công chứng', type: 'text', defaultValue: '' },
            { id: 'dn_ngay_dk_gdbd', name: 'Ngày đăng ký GDBĐ', type: 'date', defaultValue: '' },
            { id: 'dn_noi_dk_gdbd', name: 'Nơi đăng ký GDBĐ', type: 'text', defaultValue: '' },
            { id: 'dn_noi_luu_giu_ts', name: 'Nơi lưu giữ tài sản', type: 'text', defaultValue: '' },
            { id: 'dn_bao_hiem_tsdb', name: 'Bảo hiểm TSĐB', type: 'text', defaultValue: 'Có' },
            { id: 'dn_so_hd_bao_hiem', name: 'Số HĐ bảo hiểm', type: 'text', defaultValue: '' },
        ]
    },
    { id: 'dn_tong_gia_tri_tsdb', name: 'Tổng giá trị TSĐB', type: 'currency', group: 'dn_tai_san_dam_bao', defaultValue: 0, formula: 'SUM(dn_danh_sach_tsdb.dn_gia_tri_dinh_gia)', required: false },
    { id: 'dn_tong_muc_cho_vay_toi_da', name: 'Tổng mức cho vay tối đa từ TSĐB', type: 'currency', group: 'dn_tai_san_dam_bao', defaultValue: 0, formula: 'SUM(dn_danh_sach_tsdb.dn_muc_cho_vay_toi_da)', required: false },
    { id: 'dn_ty_le_tsdb_tren_khoan_vay', name: 'Tỷ lệ TSĐB / Khoản vay (%)', type: 'number', group: 'dn_tai_san_dam_bao', defaultValue: 0, formula: 'dn_tong_gia_tri_tsdb / dn_so_tien_de_nghi_vay * 100', required: false },

    {
        id: 'dn_danh_sach_nhan_no', name: 'Danh sách nhận nợ', type: 'list', group: 'dn_nhan_no', defaultValue: [], required: false,
        subFields: [
            { id: 'in_lan_nhan_no', name: 'In lần nhận nợ', type: 'boolean', defaultValue: true },
            { id: 'dn_lan_thu', name: 'Lần thứ', type: 'number', defaultValue: 1 },
            { id: 'dn_so_giay_nhan_no', name: 'Số GNN/Khế ước', type: 'text', defaultValue: '' },
            { id: 'dn_ngay_nhan_no', name: 'Ngày nhận nợ', type: 'date', defaultValue: '' },
            { id: 'dn_so_tien_nhan_no', name: 'Số tiền nhận nợ', type: 'currency', defaultValue: 0 },
            { id: 'dn_so_tien_nhan_no_chu', name: 'Số tiền bằng chữ', type: 'text', defaultValue: '', formula: 'NUMBER_TO_VIETNAMESE(dn_so_tien_nhan_no)' },
            { id: 'dn_muc_dich_chi_tiet', name: 'Mục đích sử dụng vốn', type: 'longtext', defaultValue: '' },
            { id: 'dn_lai_suat_ap_dung', name: 'Lãi suất áp dụng (%/năm)', type: 'number', defaultValue: 9.5 },
            { id: 'dn_thoi_han_nhan_no', name: 'Thời hạn (tháng)', type: 'number', defaultValue: 12 },
            { id: 'dn_ngay_tra_no_cuoi', name: 'Ngày trả nợ cuối', type: 'date', defaultValue: '' },
            { id: 'dn_phuong_thuc_gn', name: 'Phương thức giải ngân', type: 'text', defaultValue: 'Chuyển khoản' },
            { id: 'dn_tai_khoan_gn_den', name: 'TK người thụ hưởng', type: 'text', defaultValue: '' },
            { id: 'dn_ten_nguoi_thu_huong', name: 'Tên người thụ hưởng', type: 'text', defaultValue: '' },
            { id: 'dn_ngan_hang_thu_huong', name: 'Ngân hàng thụ hưởng', type: 'text', defaultValue: '' },
            { id: 'dn_noi_dung_chuyen_tien', name: 'Nội dung chuyển tiền', type: 'longtext', defaultValue: '' },
            { id: 'dn_so_chung_tu_cm', name: 'Số chứng từ chứng minh', type: 'text', defaultValue: '' },
        ]
    },
    { id: 'dn_tong_da_nhan_no', name: 'Tổng đã nhận nợ', type: 'currency', group: 'dn_nhan_no', defaultValue: 0, formula: 'SUM(dn_danh_sach_nhan_no.dn_so_tien_nhan_no)', required: false },
    { id: 'dn_han_muc_con_lai', name: 'Hạn mức còn lại', type: 'currency', group: 'dn_nhan_no', defaultValue: 0, formula: 'dn_so_tien_de_nghi_vay - dn_tong_da_nhan_no', required: false },

    { id: 'dn_so_hd_tin_dung', name: 'Số HĐ tín dụng', type: 'text', group: 'dn_hop_dong', defaultValue: '', required: true },
    { id: 'dn_ngay_ky_hop_dong', name: 'Ngày ký HĐTD', type: 'date', group: 'dn_hop_dong', defaultValue: '', required: true },
    { id: 'dn_noi_ky_hop_dong', name: 'Nơi ký', type: 'text', group: 'dn_hop_dong', defaultValue: '', required: false },
    { id: 'dn_ten_chi_nhanh_nh', name: 'Chi nhánh ngân hàng', type: 'text', group: 'dn_hop_dong', defaultValue: 'Agribank Chi nhánh Đà Nẵng', required: true },
    { id: 'dn_dia_chi_chi_nhanh', name: 'Địa chỉ chi nhánh', type: 'longtext', group: 'dn_hop_dong', defaultValue: '', required: false },
    { id: 'dn_nguoi_dai_dien_nh', name: 'Người đại diện ngân hàng', type: 'text', group: 'dn_hop_dong', defaultValue: '', required: true },
    { id: 'dn_chuc_vu_dai_dien_nh', name: 'Chức vụ', type: 'text', group: 'dn_hop_dong', defaultValue: 'Giám đốc', required: false },
    { id: 'dn_can_bo_tin_dung', name: 'Cán bộ tín dụng', type: 'text', group: 'dn_hop_dong', defaultValue: '', required: true },
    { id: 'dn_phong_ban_phu_trach', name: 'Phòng ban phụ trách', type: 'text', group: 'dn_hop_dong', defaultValue: 'Phòng KHDN', required: false },
    { id: 'dn_so_to_trinh_tham_dinh', name: 'Số tờ trình thẩm định', type: 'text', group: 'dn_hop_dong', defaultValue: '', required: false },
    { id: 'dn_ngay_to_trinh', name: 'Ngày tờ trình', type: 'date', group: 'dn_hop_dong', defaultValue: '', required: false },
    { id: 'dn_so_quyet_dinh_phe_duyet', name: 'Số QĐ phê duyệt', type: 'text', group: 'dn_hop_dong', defaultValue: '', required: false },
    { id: 'dn_ngay_phe_duyet', name: 'Ngày phê duyệt', type: 'date', group: 'dn_hop_dong', defaultValue: '', required: false },
    { id: 'dn_cap_phe_duyet', name: 'Cấp phê duyệt', type: 'text', group: 'dn_hop_dong', defaultValue: 'Chi nhánh', required: false },
];

const apcLuongFieldGroups = [
    {
        "id": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "name": "APC - Cá nhân tiêu dùng không TSBĐ nguồn lương"
    }
];

const apcLuongFields = [
    {
        "id": "ten_khach_hang",
        "name": "Tên khách hàng",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "loai_giay_to_tuy_than",
        "name": "Loại giấy tờ tùy thân",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "cmnd",
        "name": "CMND",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "ngay_cap",
        "name": "Ngày cấp",
        "type": "date",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "noi_cap",
        "name": "Nơi cấp",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "nam_sinh",
        "name": "Năm sinh",
        "type": "date",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "danh_xung",
        "name": "Danh xưng",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "so_dien_thoai",
        "name": "Số điện thoại",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "so_tai_khoan",
        "name": "Số tài khoản",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "noi_mo_tai_khoan",
        "name": "Nơi mở tài khoản",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "dia_chi",
        "name": "Địa chỉ",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "noi_cong_tac",
        "name": "Nơi công tác",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "ma_khach_hang",
        "name": "Mã khách hàng",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "nguoi_thua_ke",
        "name": "Người thừa kế",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    },
    {
        "id": "dia_ban",
        "name": "Địa bàn",
        "type": "text",
        "group": "apc_ca_nhan_tieu_dung_khong_tsbd_luong",
        "defaultValue": "",
        "required": false
    }
];


// ============================================================
// EXPORT
// ============================================================
export const PROFILE_TEMPLATES = [
    {
        id: 'apc_ca_nhan_tieu_dung_khong_tsbd_luong',
        name: 'APC - Cá nhân tiêu dùng không TSBĐ nguồn lương',
        description: 'Bộ hồ sơ APC: vay tiêu dùng không có tài sản bảo đảm, nguồn trả nợ từ lương',
        icon: '👤',
        namingFieldId: 'ten_khach_hang',
        fields: apcLuongFields,
        fieldGroups: apcLuongFieldGroups,
    },
    {
        id: 'thau_chi',
        name: 'Hồ sơ Thấu chi',
        description: 'Thấu chi tài khoản (cá nhân / tổ chức)',
        icon: '💳',
        namingFieldId: 'tc_ten_khach_hang',
        fields: thauChiFields,
        fieldGroups: thauChiFieldGroups,
    },
    {
        id: 'cam_co_stk',
        name: 'Hồ sơ Cầm cố STK',
        description: 'Cầm cố sổ tiết kiệm (nhiều sổ, bên thứ 3)',
        icon: '📒',
        namingFieldId: 'cc_ten_khach_hang_vay',
        fields: camCoFields,
        fieldGroups: camCoFieldGroups,
    },
    {
        id: 'ca_nhan_tieu_dung',
        name: 'Hồ sơ Cá nhân TD',
        description: 'Vay cá nhân tiêu dùng, mua nhà, mua xe...',
        icon: '👤',
        namingFieldId: 'cn_ten_khach_hang',
        fields: caNhanFields,
        fieldGroups: caNhanFieldGroups,
    },
    {
        id: 'doanh_nghiep',
        name: 'Hồ sơ Doanh nghiệp',
        description: 'Vay vốn sản xuất kinh doanh, tổ chức kinh tế',
        icon: '🏢',
        namingFieldId: 'dn_ten_doanh_nghiep',
        fields: doanhNghiepFields,
        fieldGroups: doanhNghiepFieldGroups,
    },
];

export default PROFILE_TEMPLATES;
