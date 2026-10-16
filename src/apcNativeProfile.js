import apcSpine from '../audits/apc_import_20260525/apc_spine.json';
import apcPlaceholders from '../public/templates/apc/placeholders.json';

const FIELD_TYPE_MAP = {
  0: 'text',
  1: 'number',
  2: 'date',
  3: 'text',
  4: 'longtext'
};

const slugify = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const toSafeId = (value = '', fallback = 'id') => {
  const out = slugify(value);
  return out || fallback;
};

const sanitizeTemplateFileName = (value = 'document.docx') => String(value || 'document.docx')
  .replace(/[\\/\x00-\x1f<>:"|?*]+/g, '_')
  .trim()
  .slice(0, 180) || 'document.docx';

export const toApcPlaceholderId = (value = 'field') => String(value || 'field')
  .trim()
  .replace(/[\[\]{}]/g, '')
  .replace(/\s+/g, '_');

export const mapApcAttributeToFieldDefinition = (attribute = {}, scope = {}) => {
  const title = attribute.attributeTitle || attribute.attrReference || attribute.note || 'Trường chưa đặt tên';
  const group = classifyFieldGroup(title);
  const id = toApcPlaceholderId(title);
  return {
    id,
    name: title,
    label: title,
    type: inferApcFieldType(title, FIELD_TYPE_MAP[attribute.dataType] || 'text'),
    group: group.id,
    defaultValue: attribute.formula && !String(attribute.formula).startsWith('=') ? attribute.formula : '',
    required: Boolean(attribute.isPrimary),
    source: 'apc-native',
    apcMeta: {
      rawTitle: attribute.attributeTitle || null,
      formula: attribute.formula || null,
      position: attribute.position ?? null,
      from: 'template-attributes',
      groupName: group.name,
      groupOrder: group.order
    }
  };
};

const GROUP_CATALOG = {
  borrower_identity: { id: 'apc_01_borrower_identity', name: '01. Bên vay / khách hàng', order: 10 },
  borrower_legal: { id: 'apc_02_borrower_legal', name: '02. Pháp lý khách hàng / pháp nhân', order: 20 },
  representative: { id: 'apc_03_representative', name: '03. Đại diện / người được ủy quyền', order: 30 },
  related_people: { id: 'apc_04_related_people', name: '04. Đồng sở hữu / người liên quan', order: 40 },
  approval: { id: 'apc_05_approval', name: '05. Chi nhánh / người dùng / phê duyệt', order: 50 },
  contract: { id: 'apc_06_contract', name: '06. Hợp đồng tín dụng', order: 60 },
  disbursement: { id: 'apc_07_disbursement', name: '07. Giấy nhận nợ / giải ngân', order: 70 },
  payment: { id: 'apc_08_payment', name: '08. Tài khoản / ủy nhiệm chi', order: 80 },
  collateral_land: { id: 'apc_09_collateral_land', name: '09. Tài sản bảo đảm - đất/nhà', order: 90 },
  collateral_other: { id: 'apc_10_collateral_other', name: '10. Tài sản bảo đảm - động sản/khác', order: 100 },
  collateral_owner: { id: 'apc_11_collateral_owner', name: '11. Chủ sở hữu tài sản', order: 110 },
  registration: { id: 'apc_12_registration', name: '12. Đăng ký/xóa giao dịch bảo đảm', order: 120 },
  business_finance: { id: 'apc_13_business_finance', name: '13. SXKD / tài chính doanh nghiệp', order: 130 },
  cif_account: { id: 'apc_14_cif_account', name: '14. CIF / tài khoản / thẻ', order: 140 },
  ebanking: { id: 'apc_15_ebanking', name: '15. Ngân hàng điện tử / ví', order: 150 },
  education_pos: { id: 'apc_16_service_extra', name: '16. Dịch vụ khác / POS / ATM / trường học', order: 160 },
  date_place: { id: 'apc_17_date_place', name: '17. Ngày tháng / địa danh', order: 170 },
  other: { id: 'apc_99_other', name: '99. Thông tin khác', order: 990 }
};

const hasAny = (text, words) => words.some((word) => text.includes(word));

const inferApcFieldType = (title = '', fallbackType = 'text') => {
  const t = String(title || '').toLowerCase();
  if (/(^|[.\s])(ngày|ngay)|ngày cấp|cấp ngày|ngày ký|ngày sinh|ngày hết hạn|ngày giao dịch|ngày hoàn thành|thời điểm|thời gian/.test(t)) return 'date';
  if (hasAny(t, ['số tiền', 'lãi suất', 'hạn mức', 'diện tích', 'giá trị', 'tổng cộng', 'vốn điều lệ', 'tỷ lệ', 'số tầng', 'năm sinh']) && !hasAny(t, ['bằng chữ', 'số hđ', 'số tài khoản', 'số thửa', 'số tờ', 'số seri', 'số vào sổ', 'số điện thoại', 'cmnd', 'cccd'])) return 'number';
  return fallbackType === 'boolean' ? 'text' : fallbackType;
};

const classifyFieldGroup = (title = '') => {
  const raw = String(title || '').trim();
  const t = raw.toLowerCase();

  if (/^(sđ|sd)\./i.test(raw)) {
    if (hasAny(t, ['hđ thế chấp', 'hđtc', 'đăng ký giao dịch', 'xóa đăng ký', 'nơi đăng ký'])) return GROUP_CATALOG.registration;
    return GROUP_CATALOG.collateral_land;
  }
  if (/^(đs|ds)\./i.test(raw)) return GROUP_CATALOG.collateral_other;
  if (/^(đsh|dsh)\./i.test(raw)) return GROUP_CATALOG.collateral_owner;
  if (/^tv\./i.test(raw) || /^nlq\./i.test(raw) || hasAny(t, ['người thừa kế', 'đồng vay', 'người liên quan'])) return GROUP_CATALOG.related_people;
  if (/^hđtd\./i.test(raw)) return GROUP_CATALOG.contract;
  if (/^gn\./i.test(raw)) return GROUP_CATALOG.disbursement;
  if (/^(unc|stk)\./i.test(raw) || hasAny(t, ['số tài khoản', 'nơi mở tài khoản', 'khách hàng thụ hưởng', 'ngân hàng thụ hưởng', 'bên thụ hưởng'])) return GROUP_CATALOG.payment;
  if (/^(cs|cstv|cl)\./i.test(raw) || hasAny(t, ['vốn điều lệ', 'ngành nghề sxkd', 'loại hình tổ chức', 'hàng tồn kho', 'doanh thu', 'lợi nhuận', 'tài sản ngắn hạn', 'nợ ngắn hạn', 'vốn chủ sở hữu'])) return GROUP_CATALOG.business_finance;
  if (/^(cđtv|cdtv|blđ|bld)\./i.test(raw) || hasAny(t, ['cổ đông', 'thành viên', 'ban lãnh đạo', 'chủ tịch hđqt', 'chủ tịch hđtv', 'kế toán trưởng'])) return GROUP_CATALOG.borrower_legal;

  if (hasAny(t, ['người phê duyệt', 'chức vụ npd', 'danh xưng npd', 'người kiểm soát', 'tên người dùng', 'tên chi nhánh', 'pgd', 'mã cn', 'mã số thuế cn', 'địa chỉ trụ sở', 'fax', 'điện thoại'])) return GROUP_CATALOG.approval;
  if (hasAny(t, ['người đại diện', 'chức vụ', 'giấy tờ ủy quyền', 'văn bản ủy quyền', 'ủy quyền số'])) return GROUP_CATALOG.representative;
  if (hasAny(t, ['số đkkd', 'ngày cấp đkkd', 'nơi cấp đkkd', 'loại giấy tờ pháp lý', 'mã số doanh nghiệp', 'tên doanh nghiệp', 'tên khách hàng in hoa'])) return GROUP_CATALOG.borrower_legal;
  if (hasAny(t, ['cmnd', 'cccd', 'loại giấy tờ tùy thân', 'ngày cấp', 'nơi cấp', 'tên khách hàng', 'mã khách hàng', 'địa chỉ', 'nơi thường trú', 'năm sinh', 'danh xưng', 'số điện thoại', 'email', 'quốc tịch', 'giới tính', 'nghề nghiệp', 'nơi công tác'])) return GROUP_CATALOG.borrower_identity;
  if (hasAny(t, ['số hđ tín dụng', 'ngày ký hđtd', 'mục đích vay', 'số tiền vay', 'lãi suất', 'thời hạn vay', 'hạn mức', 'vốn đối ứng', 'tổng nhu cầu', 'phí trả nợ', 'định kỳ trả'])) return GROUP_CATALOG.contract;
  if (hasAny(t, ['số tiền nhận nợ', 'hạn trả cuối', 'giải ngân', 'dư nợ hiện tại', 'tổng dư nợ'])) return GROUP_CATALOG.disbursement;
  if (hasAny(t, ['tài sản bảo đảm', 'tsbđ', 'giấy chứng nhận', 'số thửa', 'tờ bản đồ', 'diện tích', 'đất', 'nhà ở', 'công trình', 'số seri', 'số vào sổ', 'tổng giá trị ts'])) return GROUP_CATALOG.collateral_land;
  if (hasAny(t, ['biển kiểm soát', 'tên tsbđ', 'động sản', 'máy móc', 'phương tiện'])) return GROUP_CATALOG.collateral_other;
  if (hasAny(t, ['đăng ký giao dịch bđ', 'xóa đăng ký', 'thế chấp'])) return GROUP_CATALOG.registration;
  if (hasAny(t, ['cif', 'loại thẻ', 'hạng thẻ', 'số thẻ', 'pos', 'atm'])) return GROUP_CATALOG.cif_account;
  if (hasAny(t, ['ebanking', 'tên đăng nhập', 'ngày giao dịch', 'mã giao dịch', 'tra soát', 'ví điện tử', 'loại ví'])) return GROUP_CATALOG.ebanking;
  if (hasAny(t, ['tên trường', 'khoa', 'ngành học', 'lớp', 'niên khóa', 'hệ đào tạo', 'mã sinh viên', 'số tờ', 'tổng cộng'])) return GROUP_CATALOG.education_pos;
  if (['ngày', 'tháng', 'năm', 'địa danh', 'địa bàn'].includes(t)) return GROUP_CATALOG.date_place;
  return GROUP_CATALOG.other;
};

export const mapApcPlaceholderToFieldDefinition = (placeholder = '', scope = {}) => {
  const title = String(placeholder || '').trim();
  const group = classifyFieldGroup(title);
  return {
    id: toApcPlaceholderId(title),
    name: title,
    label: title,
    type: inferApcFieldType(title, 'text'),
    group: group.id,
    defaultValue: '',
    required: false,
    source: 'apc-native',
    apcMeta: {
      rawTitle: title,
      from: 'docx-placeholder',
      groupName: group.name,
      groupOrder: group.order
    }
  };
};

export const buildNativeApcSchema = (spine = apcSpine, options = {}) => {
  const maxTemplatesPerFolder = options.maxTemplatesPerFolder ?? 120;

  const profileGroups = (spine.tree || []).map((group) => ({
    id: toSafeId(group.title || group.id || 'group', 'group'),
    name: group.title || 'Nhóm hồ sơ',
    profileTypes: (group.categories || []).map((category) => ({
      id: toSafeId(category.title || category.id || 'type', 'type'),
      name: category.title || 'Loại hồ sơ',
      profileBundles: (category.folders || []).map((folder) => {
        const templates = (folder.documents || []).slice(0, maxTemplatesPerFolder).map((doc) => {
          const fileName = sanitizeTemplateFileName(doc.fileName || `${doc.title || 'document'}.docx`);
          const fileId = doc.fileId || '';
          return {
            id: `apc_tpl_${toSafeId(folder.title || folder.id, 'folder')}_${toSafeId(fileName || doc.title || doc.id, 'doc')}_${doc.position ?? 0}`,
            name: fileName,
            title: doc.title || fileName || 'Document',
            path: fileId ? `/templates/apc/${fileId}__${fileName}` : `apc-native:${folder.id}`,
            source: 'apc-native',
            apcMeta: {
              folderId: folder.id,
              documentId: doc.id,
              fileId,
              note: doc.note || null
            }
          };
        });

        const byFieldId = new Map();
        (folder.attributes || []).forEach((attr) => {
          const field = mapApcAttributeToFieldDefinition(attr, { folderTitle: folder.title });
          byFieldId.set(field.id, field);
        });
        (folder.documents || []).forEach((doc) => {
          const fileId = doc.fileId || '';
          const tags = apcPlaceholders?.byFileId?.[fileId] || [];
          tags.forEach((tag) => {
            const field = mapApcPlaceholderToFieldDefinition(tag, { folderTitle: folder.title });
            if (!byFieldId.has(field.id)) byFieldId.set(field.id, field);
          });
        });
        const fields = Array.from(byFieldId.values());

        return {
          id: toSafeId(folder.title || folder.id || 'bundle', 'bundle'),
          name: folder.title || 'Bộ hồ sơ',
          templates,
          fields,
          totalTemplates: (folder.documents || []).length,
          attributeFieldCount: (folder.attributes || []).length,
          placeholderFieldCount: fields.length
        };
      })
    }))
  }));

  return {
    version: 'apc-native-v1',
    source: 'apc-spine-once-import',
    counts: spine.counts || {},
    profileGroups
  };
};

export const APC_NATIVE_SCHEMA = buildNativeApcSchema(apcSpine, {
  maxTemplatesPerFolder: 120
});
