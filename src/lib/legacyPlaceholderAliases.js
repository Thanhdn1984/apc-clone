const firstValue = (scope, keys) => {
  for (const key of keys) {
    const value = scope?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
};

const setIfBlank = (scope, key, value) => {
  if (scope[key] === undefined || scope[key] === null || scope[key] === '') scope[key] = value ?? '';
};

const upper = (v) => String(v || '').toLocaleUpperCase('vi-VN');
const title = (gender) => String(gender || '').toLowerCase().includes('nữ') ? 'Bà' : 'Ông';
const joinNonBlank = (arr, sep = ', ') => arr.filter(v => v !== undefined && v !== null && String(v).trim() !== '').join(sep);

const firstListItem = (scope, listKeys) => {
  for (const key of listKeys) {
    const list = scope?.[key];
    if (Array.isArray(list) && list.length > 0 && list[0]) return list[0];
  }
  return {};
};

const addLegacyPlaceholderAliases = (inputScope = {}) => {
  const scope = inputScope;

  const khName = firstValue(scope, ['kh_ho_ten', 'cn_ten_khach_hang', 'cc_ten_khach_hang_vay', 'tc_ten_khach_hang']);
  const khGender = firstValue(scope, ['cn_gioi_tinh', 'cc_gioi_tinh_ben_vay', 'tc_gioi_tinh']);
  setIfBlank(scope, 'kh_ho_ten', khName);
  setIfBlank(scope, 'kh_ho_ten_in_hoa', upper(khName));
  setIfBlank(scope, 'danh_xung', title(khGender));
  setIfBlank(scope, 'kh_cccd_so', firstValue(scope, ['cn_so_cccd', 'cc_cccd_ben_vay', 'tc_so_cccd', 'so_cccd']));
  setIfBlank(scope, 'so_cccd', scope.kh_cccd_so);
  setIfBlank(scope, 'kh_cccd_ngay_cap', firstValue(scope, ['cn_ngay_cap_cccd', 'cc_ngay_cap_cccd_ben_vay', 'tc_ngay_cap_cccd']));
  setIfBlank(scope, 'kh_cccd_noi_cap', firstValue(scope, ['cn_noi_cap_cccd', 'cc_noi_cap_cccd_ben_vay', 'tc_noi_cap_cccd', 'noi_cap']));
  setIfBlank(scope, 'noi_cap', scope.kh_cccd_noi_cap);
  setIfBlank(scope, 'kh_thuong_tru', firstValue(scope, ['cn_ho_khau_thuong_tru', 'cn_noi_o_hien_tai', 'cc_dia_chi_ben_vay', 'tc_dia_chi_thuong_tru']));
  setIfBlank(scope, 'kh_hien_tai', firstValue(scope, ['cn_noi_o_hien_tai', 'kh_thuong_tru', 'cc_dia_chi_ben_vay', 'tc_dia_chi_lien_he']));
  setIfBlank(scope, 'kh_ngay_sinh', firstValue(scope, ['cn_ngay_sinh', 'cc_ngay_sinh_ben_vay', 'tc_ngay_sinh']));
  setIfBlank(scope, 'kh_dien_thoai', firstValue(scope, ['cn_so_dien_thoai', 'cc_sdt_ben_vay', 'tc_so_dien_thoai']));
  setIfBlank(scope, 'ma_khach_hang', firstValue(scope, ['cn_ma_khach_hang', 'tc_ma_khach_hang']));

  const spouseName = firstValue(scope, ['cn_ten_vo_chong', 'cc_ten_vo_chong_ben_vay']);
  const customers = [khName, spouseName].filter(Boolean).map((name) => ({ kh_ho_ten: name }));
  if (!Array.isArray(scope.danh_sach_khach_hang) || scope.danh_sach_khach_hang.length === 0) scope.danh_sach_khach_hang = customers;
  setIfBlank(scope, 'danh_sach_khach_hang_0_kh_ho_ten', khName);

  setIfBlank(scope, 'ma_so_thue', firstValue(scope, ['dn_ma_so_thue']));
  setIfBlank(scope, 'tru_so_tai', firstValue(scope, ['dn_dia_chi_tru_so']));
  const repName = firstValue(scope, ['dn_ten_nguoi_dai_dien']);
  setIfBlank(scope, 'nguoi_dai_dien', repName);
  setIfBlank(scope, 'nguoi_dai_dien_in_hoa', upper(repName));
  setIfBlank(scope, 'chuc_vu', firstValue(scope, ['dn_chuc_vu_dai_dien']));
  setIfBlank(scope, 'uy_quyen_so', firstValue(scope, ['dn_so_vb_uy_quyen']));

  const blName = firstValue(scope, ['bl_ho_ten', 'cc_ten_ben_cam_co']);
  setIfBlank(scope, 'bl_ho_ten', blName);
  setIfBlank(scope, 'bl_ho_ten_in_hoa', upper(blName));
  setIfBlank(scope, 'bl_cccd_so', firstValue(scope, ['cc_cccd_ben_cam_co']));
  setIfBlank(scope, 'bl_cccd_ngay_cap', firstValue(scope, ['cc_ngay_cap_cccd_ben_cam_co']));
  setIfBlank(scope, 'bl_noi_cap', firstValue(scope, ['cc_noi_cap_cccd_ben_cam_co']));
  setIfBlank(scope, 'bl_thuong_tru', firstValue(scope, ['cc_dia_chi_ben_cam_co']));
  setIfBlank(scope, 'bl_ngay_sinh', firstValue(scope, ['cc_ngay_sinh_ben_cam_co']));
  setIfBlank(scope, 'bl_danh_xung', 'Ông/Bà');
  setIfBlank(scope, 'ben_bao_lanh', joinNonBlank([scope.bl_ho_ten, scope.bl_cccd_so, scope.bl_thuong_tru], ' - '));

  const asset = firstListItem(scope, ['cn_danh_sach_tsdb', 'dn_danh_sach_tsdb', 'tc_danh_sach_tsdb']);
  setIfBlank(scope, 'tsbd_ten', firstValue(asset, ['cn_ten_tsdb', 'dn_ten_tsdb', 'tc_mo_ta_tsdb']));
  setIfBlank(scope, 'tsbd_dia_chi', firstValue(asset, ['cn_dia_chi_tsdb', 'dn_dia_chi_tsdb', 'tc_dia_chi_tsdb']));
  setIfBlank(scope, 'tsbd_dien_tich', firstValue(asset, ['cn_dien_tich_tsdb', 'dn_dien_tich_tsdb']));
  setIfBlank(scope, 'tsbd_giay_to_so_hieu', firstValue(asset, ['cn_so_giay_to', 'dn_so_giay_to_so_huu', 'tc_so_giay_to']));
  setIfBlank(scope, 'tsbd_giay_to_ngay_cap', firstValue(asset, ['cn_ngay_cap_giay_to', 'dn_ngay_cap_giay_to', 'tc_ngay_cap_giay_to']));
  setIfBlank(scope, 'tsbd_giay_to_noi_cap', firstValue(asset, ['cn_noi_cap_giay_to', 'dn_noi_cap_giay_to', 'tc_noi_cap_giay_to']));
  setIfBlank(scope, 'tsbd_thua_dat_so', firstValue(asset, ['cn_thua_dat_so', 'dn_thua_dat_so']));
  setIfBlank(scope, 'tsbd_to_ban_do_so', firstValue(asset, ['cn_to_ban_do_so', 'dn_to_ban_do_so']));
  setIfBlank(scope, 'tsbd_thoi_han_su_dung', firstValue(asset, ['cn_thoi_han_su_dung', 'dn_thoi_han_su_dung']));
  setIfBlank(scope, 'tsbd_hinh_thuc_su_dung', firstValue(asset, ['cn_hinh_thuc_su_dung', 'dn_hinh_thuc_su_dung']));
  setIfBlank(scope, 'tsbd_giay_to_so_vao_so', firstValue(asset, ['cn_so_vao_so_giay_to', 'dn_so_vao_so_giay_to', 'tc_so_vao_so_giay_to']));
  setIfBlank(scope, 'dien_tich_su_dung', firstValue(asset, ['cn_dien_tich_su_dung', 'dn_dien_tich_su_dung', 'cn_dien_tich_tsdb', 'dn_dien_tich_tsdb']));
  setIfBlank(scope, 'dien_tich_xay_dung', firstValue(asset, ['cn_dien_tich_xay_dung', 'dn_dien_tich_xay_dung']));
  setIfBlank(scope, 'nguon_goc_su_dung', firstValue(asset, ['cn_nguon_goc_su_dung', 'dn_nguon_goc_su_dung']));
  setIfBlank(scope, 'loai_nha_o', firstValue(asset, ['cn_loai_nha_o', 'dn_loai_nha_o']));
  setIfBlank(scope, 'cap_hang', firstValue(asset, ['cn_cap_hang', 'dn_cap_hang']));
  setIfBlank(scope, 'hinh_thuc_so_huu', firstValue(asset, ['cn_hinh_thuc_so_huu', 'dn_hinh_thuc_so_huu']));
  setIfBlank(scope, 'ket_cau_nha', firstValue(asset, ['cn_ket_cau_nha', 'dn_ket_cau_nha']));
  setIfBlank(scope, 'so_tang', firstValue(asset, ['cn_so_tang', 'dn_so_tang']));
  setIfBlank(scope, 'thoi_gian_su_dung', firstValue(asset, ['cn_thoi_gian_su_dung', 'dn_thoi_gian_su_dung']));
  setIfBlank(scope, 'tsbd_dinh_gia_gia_m2', firstValue(asset, ['cn_don_gia_dat_m2', 'dn_don_gia_dat_m2', 'tc_don_gia_dat_m2']));
  setIfBlank(scope, 'gia_dat_tai_vi_tri', firstValue(asset, ['cn_gia_dat_tai_vi_tri', 'dn_gia_dat_tai_vi_tri', 'tsbd_dinh_gia_gia_m2']));
  setIfBlank(scope, 'don_gia_xay_dung', firstValue(asset, ['cn_don_gia_xay_dung', 'dn_don_gia_xay_dung']));
  setIfBlank(scope, 'quyet_dinh_don_gia_xay_dung', firstValue(asset, ['cn_quyet_dinh_don_gia_xay_dung', 'dn_quyet_dinh_don_gia_xay_dung']));
  setIfBlank(scope, 'gia_tri_dat', firstValue(asset, ['cn_gia_tri_dat', 'dn_gia_tri_dat']));
  setIfBlank(scope, 'gia_tri_nha', firstValue(asset, ['cn_gia_tri_nha', 'dn_gia_tri_nha']));
  setIfBlank(scope, 'tsbd_dinh_gia_gia_tri', firstValue(asset, ['cn_gia_tri_dinh_gia', 'dn_gia_tri_dinh_gia', 'tc_gia_tri_dinh_gia']));
  setIfBlank(scope, 'gia_tri_ts_tham_dinh_lai', firstValue(asset, ['cn_gia_tri_ts_tham_dinh_lai', 'dn_gia_tri_ts_tham_dinh_lai', 'tsbd_dinh_gia_gia_tri']));
  setIfBlank(scope, 'gia_tri_dinh_gia_lam_tron_tdl', firstValue(asset, ['cn_gia_tri_dinh_gia', 'dn_gia_tri_dinh_gia', 'tc_gia_tri_dinh_gia']));
  setIfBlank(scope, 'gia_tri_dinh_gia_lam_tron', scope.gia_tri_dinh_gia_lam_tron_tdl);
  setIfBlank(scope, 'muc_cho_vay_tren_tsdb', firstValue(asset, ['cn_muc_cho_vay_tren_tsdb', 'dn_muc_cho_vay_tren_tsdb']));
  setIfBlank(scope, 'pham_vi_dam_bao', firstValue(asset, ['cn_pham_vi_dam_bao', 'dn_pham_vi_dam_bao']));
  setIfBlank(scope, 'quyen_su_dung_dat', joinNonBlank([scope.tsbd_ten, scope.tsbd_giay_to_so_hieu, scope.tsbd_dia_chi], '; '));
  if (!Array.isArray(scope.quyen_su_dung_dat)) scope.quyen_su_dung_dat = scope.quyen_su_dung_dat ? [{ mo_ta: scope.quyen_su_dung_dat, so_lcl: firstValue(scope, ['so_lcl']), so_cong_chung: firstValue(scope, ['so_cong_chung']), ten_van_phong_cc: firstValue(scope, ['ten_van_phong_cc']) }] : [];
  setIfBlank(scope, 'quyen_su_dung_dat_0_so_lcl', firstValue(asset, ['cn_so_lcl', 'dn_so_lcl', 'tc_so_lcl']));
  setIfBlank(scope, 'quyen_su_dung_dat_0_so_cong_chung', firstValue(asset, ['cn_so_cong_chung', 'dn_so_cong_chung']));
  setIfBlank(scope, 'quyen_su_dung_dat_0_ten_van_phong_cc', firstValue(asset, ['cn_ten_van_phong_cc', 'dn_ten_van_phong_cc']));
  setIfBlank(scope, 'quyen_su_dung_dat_0_thoi_diem_xac_dinh_gia_tri_ban_dau', firstValue(asset, ['cn_thoi_diem_xac_dinh_gia_tri_ban_dau', 'dn_thoi_diem_xac_dinh_gia_tri_ban_dau']));

  setIfBlank(scope, 'muc_dich_su_dung', firstValue(scope, ['cn_muc_dich_vay', 'cc_muc_dich_vay', 'tc_muc_dich_thau_chi', 'dn_muc_dich_vay']));
  setIfBlank(scope, 'ngay_ky_hdtc', firstValue(scope, ['cn_ngay_ky_hdtc', 'tc_ngay_ky_hop_dong', 'dn_ngay_ky_hop_dong']));
  setIfBlank(scope, 'ngay_ky_hdtc_cu', firstValue(scope, ['cn_ngay_ky_hdtc_cu', 'ngay_ky_hdtc']));
  setIfBlank(scope, 'ngay_het_han_the_chap', firstValue(scope, ['cn_ngay_het_han_the_chap', 'dn_ngay_het_han_the_chap']));
  setIfBlank(scope, 'so_lcl', firstValue(scope, ['cn_so_lcl', 'dn_so_lcl', 'tc_so_lcl']));
  setIfBlank(scope, 'so_lcl_in_hoa', upper(scope.so_lcl));
  setIfBlank(scope, 'so_lcl_cu_in_hoa', upper(firstValue(scope, ['cn_so_lcl_cu', 'dn_so_lcl_cu', 'so_lcl'])));
  setIfBlank(scope, 'so_cong_chung', firstValue(scope, ['cn_so_cong_chung', 'dn_so_cong_chung']));
  setIfBlank(scope, 'so_cong_chung_cu', firstValue(scope, ['cn_so_cong_chung_cu', 'so_cong_chung']));
  setIfBlank(scope, 'ten_van_phong_cc', firstValue(scope, ['cn_ten_van_phong_cc', 'dn_ten_van_phong_cc']));
  setIfBlank(scope, 'ten_don_vi', firstValue(scope, ['dn_ten_doanh_nghiep', 'cn_ten_don_vi', 'ten_don_vi_nhan_the_chap_cu']));
  setIfBlank(scope, 'ten_don_vi_in_hoa', upper(scope.ten_don_vi));
  setIfBlank(scope, 'ten_don_vi_nhan_the_chap_cu', firstValue(scope, ['cn_ten_don_vi_nhan_the_chap_cu', 'ten_don_vi']));
  setIfBlank(scope, 'afa_viet_nam', firstValue(scope, ['cn_afa_viet_nam', 'AFA Việt Nam']));
  setIfBlank(scope, 'van_ban_ndn_afa', firstValue(scope, ['cn_van_ban_ndn_afa']));
  setIfBlank(scope, 'giay_chung_nhan_dk_hoat_dong', firstValue(scope, ['dn_giay_chung_nhan_dk_hoat_dong']));
  setIfBlank(scope, 'cbtd', firstValue(scope, ['cn_can_bo_tin_dung', 'dn_can_bo_tin_dung', 'tc_can_bo_tin_dung']));
  setIfBlank(scope, 'cbtd_sdt', firstValue(scope, ['cn_sdt_can_bo_tin_dung', 'dn_sdt_can_bo_tin_dung', 'tc_sdt_can_bo_tin_dung']));
  setIfBlank(scope, 'nguoi_tham_dinh', firstValue(scope, ['cn_nguoi_tham_dinh', 'dn_nguoi_tham_dinh']));
  setIfBlank(scope, 'chuc_vu_ntd', firstValue(scope, ['cn_chuc_vu_nguoi_tham_dinh', 'dn_chuc_vu_nguoi_tham_dinh']));
  setIfBlank(scope, 'moi_quan_he_voi_nguoi_bao_dam', firstValue(scope, ['cn_moi_quan_he_voi_nguoi_bao_dam', 'cc_moi_quan_he_voi_nguoi_bao_dam']));
  setIfBlank(scope, 'so_tien_vay_bo_sung', firstValue(scope, ['cn_so_tien_vay_bo_sung', 'dn_so_tien_vay_bo_sung']));
  setIfBlank(scope, 'tong_no_goc_duoc_db', firstValue(scope, ['cn_tong_no_goc_duoc_db', 'dn_tong_no_goc_duoc_db']));

  const now = new Date();
  setIfBlank(scope, 'ngay', String(now.getDate()).padStart(2, '0'));
  setIfBlank(scope, 'thang', String(now.getMonth() + 1).padStart(2, '0'));
  setIfBlank(scope, 'nam', String(now.getFullYear()));
  setIfBlank(scope, 'ngay_cap', scope.kh_cccd_ngay_cap);
  return scope;
};

export { addLegacyPlaceholderAliases };
export default addLegacyPlaceholderAliases;
