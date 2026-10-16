// OCR Utility - Parse OCR text thành các field values
// Dựa trên cấu trúc field trong defaultState.js

export const FIELD_PATTERNS = {
  // CCCD/CMND patterns
  cccd: /(\d{9,12})/,
  cccd_prefix: /(?:Số|So|No|Number|Chứng minh nhân dân|CMND|Căn cước công dân|CCCD)[\s:]*(\d{9,12})/i,
  
  // Date patterns (Vietnamese format: DD/MM/YYYY or similar)
  date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
  date_prefix: /(?:Ngày sinh|Ngay sinh|Ngày cấp|Ngay cap|Ngày|Ngay)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  
  // Name patterns
  name: /(?:Họ và tên|Ho va ten|Họ tên|Ho ten|Name|Họ|Name)[\s:]*([A-Za-zÀ-ỹ\s]+)/i,
  
  // Phone patterns
  phone: /(?:Điện thoại|Dien thoai|Phone|Mobile|Số điện thoại|So dien thoai)[\s:]*(0\d{9,10})/i,
  
  // Address patterns
  address: /(?:Nơi thường trú|Noi thuong tru|Địa chỉ|Dia chi|Address|Thường trú|Thuong tru)[\s:]*(.+?)(?=\n|$)/i,
  
  // Currency/VND patterns  
  currency: /(?:Số tiền|So tien|Vốn|Von|Tổng|Tong)[\s:]*(?:VND|Dong|₫)?[\s:]*([\d,\.]+)/i,
};

const cleanValue = (value) => String(value || '')
  .replace(/^[\s:：\-–—]+/, '')
  .replace(/[\s]+/g, ' ')
  .trim();

const stripOcrNoise = (value) => cleanValue(value)
  .replace(/^(f\s*)?(full\s*name|place\s*of\s*residence|date\s*of\s*issue|id\s*no)[\s:：-]*/i, '')
  .replace(/[(){}\[\]<>|]/g, '')
  .replace(/\s+[a-z]$/i, '')
  .trim();

const isBadName = (value) => {
  const v = cleanValue(value).toLowerCase();
  return !v || /full\s*name|^hs$|id\s*no|cccd|mst|ngay|ngày|kết quả|nhận dạng|scan|quét/.test(v) || /\d/.test(v);
};

const looksLikeVietnameseName = (value) => {
  const v = cleanValue(value);
  const words = v.split(/\s+/).filter(Boolean);
  return words.length >= 3 && words.length <= 6 && /^[A-Za-zÀ-ỹ\s]+$/.test(v) && !isBadName(v);
};

const getLines = (text) => text
  .split('\n')
  .map(line => cleanValue(line))
  .filter(Boolean);

const collectText = (texts) => texts.filter(Boolean).join('\n');

const findFirst = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return stripOcrNoise(match[1]);
  }
  return '';
};

const parseIdentityData = (ocrText) => {
  const text = ocrText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = getLines(text);
  const joined = lines.join('\n');
  const lowerLines = lines.map(line => line.toLowerCase());

  const numberCandidates = [...joined.matchAll(/\b\d{9,12}\b/g)].map(m => m[0]);
  const phoneCandidates = [...joined.matchAll(/\b0\d{9,10}\b/g)].map(m => m[0]);
  const cccd = numberCandidates.find(n => !phoneCandidates.includes(n)) || numberCandidates[0] || '';

  const dates = [...joined.matchAll(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g)].map(m => m[0]);
  const birthDate = findFirst(joined, [
    /(?:ngày\s*sinh|date\s*of\s*birth|dob)[\s:：-]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /(?:sinh\s*ngày)[\s:：-]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ]) || dates[0] || '';
  const issueDate = findFirst(joined, [
    /(?:ngày\s*cấp|date\s*of\s*issue|cấp\s*ngày|issued\s*on)[\s:：-]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ]);

  let name = '';
  const nameLineIndex = lowerLines.findIndex(line => /(họ\s*và\s*tên|họ\s*tên|full\s*name|name)/i.test(line));
  if (nameLineIndex >= 0) {
    for (let i = nameLineIndex; i < Math.min(lines.length, nameLineIndex + 8); i++) {
      const cleaned = stripOcrNoise(lines[i])
        .replace(/^(họ\s*và\s*tên|họ\s*tên|full\s*name|name)\s*/i, '')
        .replace(/[^A-Za-zÀ-ỹ\s]/g, '')
        .trim();
      if (looksLikeVietnameseName(cleaned)) { name = cleaned; break; }
    }
  }
  if (!name) {
    name = lines
      .map(line => stripOcrNoise(line).replace(/[^A-Za-zÀ-ỹ\s]/g, '').trim())
      .find(looksLikeVietnameseName) || '';
  }
  name = name.toUpperCase();

  const findAddress = (labels) => {
    const idx = lowerLines.findIndex(line => labels.some(label => line.includes(label)));
    if (idx < 0) return '';
    const current = lines[idx].replace(new RegExp(`.*(${labels.join('|')})[\\s:：-]*`, 'i'), '');
    const extra = [];
    for (let i = idx + 1; i < lines.length && extra.length < 2; i++) {
      const low = lowerLines[i];
      if (/^(có giá trị|ngày cấp|date|sex|giới tính|nationality|quốc tịch|quê quán|place of origin)/i.test(low)) break;
      extra.push(lines[i]);
    }
    return stripOcrNoise(collectText([current, ...extra])).replace(/\n/g, ', ');
  };

  const permanentAddress = findAddress(['nơi thường trú', 'place of residence', 'thường trú']);
  const currentAddress = findAddress(['nơi ở hiện tại', 'chỗ ở hiện tại', 'current residence']);
  const rawIssuePlace = findFirst(joined, [
    /(?:nơi\s*cấp|cấp\s*tại|tc_noi_cap_giay_to)[\s:：-]*([^\n]{3,160})/i,
  ]);
  const issuePlace = (rawIssuePlace && /c[uụ]c|c[aả]nh|qlhc|ttxh|h[aà]nh ch/i.test(rawIssuePlace))
    ? 'Cục Cảnh sát quản lý hành chính về trật tự xã hội'
    : (issueDate || cccd ? 'Cục Cảnh sát quản lý hành chính về trật tự xã hội' : rawIssuePlace);
  const phone = phoneCandidates[0] || '';

  return {
    cccd,
    birthDate: birthDate ? normalizeDate(birthDate) : '',
    issueDate: issueDate ? normalizeDate(issueDate) : '',
    name,
    permanentAddress,
    currentAddress,
    issuePlace,
    phone,
  };
};

const flattenFields = (fields) => fields.flatMap(field => field.type === 'list'
  ? (field.subFields || []).map(sub => ({ ...sub, parentListId: field.id }))
  : [field]
);

// Map OCR results to fields
export const mapOCRToFields = (ocrText, fields) => {
  const results = {};
  const normalizedText = ocrText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const parsed = parseIdentityData(normalizedText);
  const allFields = flattenFields(fields);
  
  console.log('[OCR] Starting field mapping...');
  
  allFields.forEach(field => {
    const fieldId = field.id;
    const fieldName = field.name.toLowerCase();
    if (field.type === 'list' || field.formula) return;
    
    let foundValue = null;
    if ((fieldName.includes('cccd') || fieldName.includes('cmnd')) && fieldName.includes('số')) foundValue = parsed.cccd;
    else if (fieldName.includes('ngày sinh') || fieldName.includes('sinh')) foundValue = parsed.birthDate;
    else if (fieldName.includes('ngày cấp') || fieldName.includes('cấp cccd')) foundValue = parsed.issueDate;
    else if (fieldName.includes('nơi cấp') && (parsed.issueDate || /cấp|issue|cục|cảnh sát/i.test(normalizedText))) foundValue = parsed.issuePlace;
    else if (fieldName.includes('họ') || fieldName.includes('tên khách') || fieldName.includes('họ tên') || fieldName.includes('name')) foundValue = parsed.name;
    else if (fieldName.includes('điện thoại') || fieldName.includes('phone') || fieldName.includes('mobile')) foundValue = parsed.phone;
    else if (fieldName.includes('liên hệ') || fieldName.includes('hiện tại')) foundValue = parsed.currentAddress || parsed.permanentAddress;
    else if (fieldName.includes('thường trú') || fieldName.includes('trụ sở')) foundValue = parsed.permanentAddress || parsed.currentAddress;
    else if (fieldName.includes('địa chỉ') || fieldName.includes('nơi ở')) foundValue = parsed.permanentAddress || parsed.currentAddress;
    else if (field.type === 'currency' || field.type === 'number') {
      const match = normalizedText.match(FIELD_PATTERNS.currency);
      if (match) foundValue = parseFloat(match[1].replace(/,/g, ''));
    }
    
    if (foundValue) {
      results[fieldId] = foundValue;
      console.log(`[OCR] ✓ Mapped: ${fieldId} = "${foundValue}"`);
    }
  });
  
  return results;
};

// Normalize date to YYYY-MM-DD format
const normalizeDate = (dateStr) => {
  if (!dateStr) return '';
  
  // Try to parse DD/MM/YYYY or DD-MM-YYYY
  const match = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (match) {
    let day = match[1].padStart(2, '0');
    let month = match[2].padStart(2, '0');
    let year = match[3];
    
    // Handle 2-digit year
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    
    return `${year}-${month}-${day}`;
  }
  
  return dateStr;
};

// Parse CCCD specifically (Vietnamese ID cards have specific format)
export const parseCCCD = (text) => {
  const lines = text.split('\n');
  let cccdNumber = null;
  let issueDate = null;
  let issuePlace = null;
  
  // Common patterns for CCCD
  const cccdRegex = /\b(\d{9,12})\b/;
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  
  lines.forEach(line => {
    const lineLower = line.toLowerCase();
    
    // Find CCCD number
    if (!cccdNumber && (lineLower.includes('cccd') || lineLower.includes('cmnd') || lineLower.includes('căn cước'))) {
      const match = line.match(cccdRegex);
      if (match) cccdNumber = match[1];
    }
    
    // Find issue date
    if (!issueDate && (lineLower.includes('ngày cấp') || lineLower.includes('cấp ngày'))) {
      const match = line.match(dateRegex);
      if (match) issueDate = normalizeDate(match[1]);
    }
    
    // Find issue place
    if (!issuePlace && (lineLower.includes('nơi cấp') || lineLower.includes('cấp tại'))) {
      const match = line.match(/(?:nơi cấp|cấp tại)[\s:]*(.+?)(?:\n|$)/i);
      if (match) issuePlace = match[1].trim();
    }
  });
  
  return { cccdNumber, issueDate, issuePlace };
};

export default { mapOCRToFields, parseCCCD, FIELD_PATTERNS };
