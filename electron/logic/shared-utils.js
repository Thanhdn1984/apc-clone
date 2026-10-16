// BACKEND-ONLY UTILITIES (CommonJS)

function unformatNumber(s, numberFormat = { locale: 'vi-VN' }) {
  // Nếu đã là số, trả về luôn
  if (typeof s === 'number') {
    return isNaN(s) ? '' : String(s);
  }
  
  if (s === null || s === undefined || typeof s !== 'string' || s.trim() === '') return '';
  
  // Simplified separator logic for backend (vi-VN: . là thousand, , là decimal)
  const thousands = '.';
  const decimal = ',';

  let temp_s = s.trim();
  
  // 🔧 FIX: Detect xem . là thousand separator hay decimal separator
  // Nếu chỉ có 1 dấu . và phần sau không phải 3 chữ số → đó là decimal (số thập phân en-US)
  const dotCount = (temp_s.match(/\./g) || []).length;
  const lastDotIndex = temp_s.lastIndexOf('.');
  
  if (dotCount === 1 && lastDotIndex !== -1) {
    const afterDot = temp_s.substring(lastDotIndex + 1);
    // Nếu phần sau dấu . KHÔNG phải đúng 3 chữ số → đây là decimal separator (en-US format)
    if (!/^\d{3}$/.test(afterDot)) {
      // Đây là số thập phân dạng en-US: 101259589.04109588
      // Chỉ cần bỏ dấu , (nếu có) và giữ nguyên .
      temp_s = temp_s.replace(/,/g, '');
      return temp_s;
    }
  }
  
  // Đây là số vi-VN format: 100.000.000 hoặc 100.000.000,50
  const thousandsRegex = new RegExp(`\\${thousands}`, 'g');
  temp_s = temp_s.replace(thousandsRegex, '');
  temp_s = temp_s.replace(decimal, '.');
  
  return temp_s;
}

const mangSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function convert_block_three(baSo) {
    let tram, chuc, donvi;
    let ketQua = '';
    baSo = baSo.toString().padStart(3, '0');
    tram = parseInt(baSo[0]);
    chuc = parseInt(baSo[1]);
    donvi = parseInt(baSo[2]);
    if (tram === 0 && chuc === 0 && donvi === 0) return '';
    if (tram > 0) ketQua += mangSo[tram] + ' trăm';
    if (chuc > 1) {
        ketQua += (tram > 0 ? ' ' : '') + mangSo[chuc] + ' mươi';
        if (donvi === 1) ketQua += ' mốt';
        else if (donvi === 5) ketQua += ' lăm';
        else if (donvi > 0) ketQua += ' ' + mangSo[donvi];
    } else if (chuc === 1) {
        ketQua += (tram > 0 ? ' ' : '') + 'mười';
        if (donvi === 5) ketQua += ' lăm';
        else if (donvi > 0) ketQua += ' ' + mangSo[donvi];
    } else if (donvi > 0 && (tram > 0 || chuc > 0)) {
        ketQua += ' lẻ ' + mangSo[donvi];
    } else if (donvi > 0) {
        ketQua += mangSo[donvi];
    }
    return ketQua;
}

function DocSo(number, numberFormat = { locale: 'vi-VN' }) {
  const cleanNumberStr = unformatNumber(String(number || ''), numberFormat);

  // **THE CRITICAL FIX**: If the value is not a number or is zero, return an empty string.
  if (cleanNumberStr === '' || isNaN(parseFloat(cleanNumberStr)) || parseFloat(cleanNumberStr) === 0) {
    return '';
  }
  
  const parts = cleanNumberStr.split('.');
  const integerPartStr = parts[0];
  const decimalPartStr = parts[1];

  if (integerPartStr.length > 15) {
      return 'Số quá lớn để đọc';
  }

  const dv = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ'];
  let integerInWords = '';
  
  if (integerPartStr !== '0' && integerPartStr !== '') {
      let arr = [];
      let tempIntStr = integerPartStr;
      while (tempIntStr.length > 0) {
        arr.push(tempIntStr.substring(Math.max(0, tempIntStr.length - 3)));
        tempIntStr = tempIntStr.substring(0, Math.max(0, tempIntStr.length - 3));
      }
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === '000') continue;
        const doc = convert_block_three(arr[i]);
        if (doc) {
          integerInWords += doc + dv[i] + ' ';
        }
      }
  }
  
  let decimalInWords = '';
  if (decimalPartStr) {
    decimalInWords = 'phẩy ';
    for (const char of decimalPartStr) {
      decimalInWords += mangSo[parseInt(char)] + ' ';
    }
  }
  
  let finalResult = (integerInWords.trim() || '') + (integerInWords.trim() && decimalInWords ? ' ' : '') + decimalInWords.trim();
  finalResult = finalResult.trim().replace(/\s+/g, ' ').replace(/tỷ triệu/g, 'tỷ');
  
  if (!finalResult) return ''; // Ensure empty result if everything else fails

  return finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
}

module.exports = {
    unformatNumber,
    DocSo
};
