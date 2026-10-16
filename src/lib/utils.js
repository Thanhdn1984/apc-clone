
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const separatorCache = {};
function getSeparators(locale) {
  if (separatorCache[locale]) return separatorCache[locale];
  const parts = new Intl.NumberFormat(locale).formatToParts(1111.1);
  const thousands = parts.find(part => part.type === 'group')?.value || (locale === 'vi-VN' ? '.' : ',');
  const decimal = parts.find(part => part.type === 'decimal')?.value || (locale === 'vi-VN' ? ',' : '.');
  separatorCache[locale] = { thousands, decimal };
  return { thousands, decimal };
}

export function unformatNumber(s, numberFormat = {}) {
  if (s === null || s === undefined || String(s).trim() === '') return '';

  const { locale = 'vi-VN' } = numberFormat;
  const { thousands, decimal } = getSeparators(locale);

  let stringValue = String(s);

  
  // For vi-VN: thousands='.' and decimal=','
  // We need to:
  // 1. Find the LAST occurrence of decimal separator
  // 2. Everything before it is integer part (remove thousands separators)
  // 3. Everything after it is decimal part
  
  const lastDecimalIndex = stringValue.lastIndexOf(decimal);
  
  let result;
  if (lastDecimalIndex !== -1) {
    // Has decimal separator - split here
    const integerPart = stringValue.substring(0, lastDecimalIndex);
    const decimalPart = stringValue.substring(lastDecimalIndex + decimal.length);
    
    // Remove thousands separators ONLY from integer part
    const thousandsRegex = new RegExp(`\\${thousands}`, 'g');
    const cleanIntegerPart = integerPart.replace(thousandsRegex, '');
    
    // Combine: cleaned integer + standard decimal point
    result = cleanIntegerPart + '.' + decimalPart;

  } else {
    // No decimal separator found
    // This could be:
    // 1. A plain integer
    // 2. Or a number where only thousands separators exist
    // Remove all thousands separators
    const thousandsRegex = new RegExp(`\\${thousands}`, 'g');
    result = stringValue.replace(thousandsRegex, '');

  }
  
  // Final validation - ensure we have a valid number format
  // If result starts with '.', prepend '0'
  if (result.startsWith('.')) {
    result = '0' + result;
  }
  

  return result;
}

export function formatNumber(n, numberFormat = {}) {
    if (n === null || n === undefined || String(n).trim() === '') return '';

    const { locale = 'vi-VN', decimalPlaces } = numberFormat;
    
    try {
        // If it's already a number, convert to standard format first
        let numberValue;
        if (typeof n === 'number') {
            numberValue = n;
        } else {
            // It's a string - unformat it using locale rules
            const standardizedNumberString = unformatNumber(String(n), { locale });
            
            if (standardizedNumberString.trim() === '' || isNaN(Number(standardizedNumberString))) {
                return '';
            }
            numberValue = Number(standardizedNumberString);
        }
        

        
        // Convert to string to detect actual decimal places (before floating point artifacts)
        const numStr = String(numberValue);
        const dotIndex = numStr.indexOf('e'); // Check for scientific notation first
        const actualStr = dotIndex === -1 ? numStr : numberValue.toFixed(20); // Use toFixed for scientific notation
        const decimalIndex = actualStr.indexOf('.');
        
        let actualDecimalPlaces = 0;
        let targetDecimalPlaces = decimalPlaces;
        
        if (decimalIndex !== -1) {
            // Get actual decimal places BEFORE rounding
            const afterDot = actualStr.substring(decimalIndex + 1);
            actualDecimalPlaces = afterDot.replace(/0+$/, '').length; // Remove trailing zeros to get real precision
            
            // If no decimalPlaces specified, use actual decimal places
            if (decimalPlaces === undefined) {
                targetDecimalPlaces = actualDecimalPlaces;
            }
        }
        

        
        // Round to target decimal places to remove floating point artifacts
        let roundedValue = numberValue;
        if (targetDecimalPlaces >= 0) {
            const factor = Math.pow(10, targetDecimalPlaces);
            roundedValue = Math.round(numberValue * factor) / factor;
        } else {
            roundedValue = Math.round(numberValue);
        }
        

        
        // After rounding, recalculate actual decimal places from the rounded value
        // This is what we'll display (no trailing zeros)
        const roundedStr = String(roundedValue);
        const roundedDecimalIndex = roundedStr.indexOf('.');
        let displayDecimalPlaces = 0;
        if (roundedDecimalIndex !== -1) {
            const afterDot = roundedStr.substring(roundedDecimalIndex + 1);
            displayDecimalPlaces = afterDot.replace(/0+$/, '').length;
        }

        
        // Now format with Intl.NumberFormat
        const hasDecimal = roundedValue % 1 !== 0;

        let options;
        if (hasDecimal) {
            // Use display decimal places (actual decimals after rounding, no trailing zeros)
            options = {
                style: 'decimal',
                minimumFractionDigits: Math.max(1, displayDecimalPlaces),
                maximumFractionDigits: Math.max(1, displayDecimalPlaces),
            };
        } else {
            // Integer - no decimals needed
            options = {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            };
        }


        const formatted = new Intl.NumberFormat(locale, options).format(roundedValue);

        return formatted;
    } catch (error) {
        console.error('Error formatting number:', error, n);
        return String(n);
    }
}

// --- COMPUTATION & TEXT-TO-SPEECH UTILITIES (PRESERVING V35 DETOX LOGIC) ---

export function evaluateCalc(formula, dataContext) {
  const calcRegex = /calc\(([^()]*)\)/;

  // 🔧 v2.2.6: Helper để tìm giá trị - hỗ trợ cả top-level và subfield
  const getValueFromContext = (fieldId) => {
    // 1. Tìm trực tiếp trong context
    if (dataContext.hasOwnProperty(fieldId)) {
      return dataContext[fieldId];
    }
    
    // 2. Nếu không tìm thấy, thử tìm trong flattened data với _0_ (item đầu tiên)
    for (const key of Object.keys(dataContext)) {
      if (key.endsWith(`_0_${fieldId}`)) {
        console.log(`🔍 [CALC] Fallback: ${fieldId} → ${key} = ${dataContext[key]}`);
        return dataContext[key];
      }
    }
    
    return undefined;
  };

  const resolve = (expr) => {
    let currentExpr = expr;
    let match;

    while ((match = currentExpr.match(calcRegex)) !== null) {
      const innerExpr = match[1];
      const innerResult = resolve(innerExpr);
      if (innerResult === null) {
        return null; 
      }
      currentExpr = currentExpr.replace(match[0], innerResult);
    }

    const fieldIds = [...currentExpr.matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/g)].map(m => m[0]);
    let processedExpression = currentExpr;

    for (const id of new Set(fieldIds)) {
        const rawValue = getValueFromContext(id);
        if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '') {
            return null; 
        }

        let value;
        if (typeof rawValue === 'number') {
            value = rawValue;
        } else {
            value = parseFloat(unformatNumber(rawValue));
        }

        if (isNaN(value)) {
             return null;
        }
        processedExpression = processedExpression.replace(new RegExp('\\b' + id + '\\b', 'g'), value);
    }

    if (/[a-zA-Z_]/.test(processedExpression)) {
        return null;
    }
    
    if (/[^0-9+\-*/().\s]/.test(processedExpression)) {
      return null;
    }

    try {
      const result = new Function('return ' + processedExpression)();
      if (isNaN(result) || !isFinite(result)) {
        return null;
      }
      return result;
    } catch (error) {
      return null;
    }
  };

  return resolve(formula.slice(5, -1));
}


const mangSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function convert_block_three(numberString, isMostSignificantBlock) {
    let tram, chuc, donvi;
    let ketQua = '';
    const baSo = numberString.toString().padStart(3, '0');
    tram = parseInt(baSo[0]);
    chuc = parseInt(baSo[1]);
    donvi = parseInt(baSo[2]);

    if (tram === 0 && chuc === 0 && donvi === 0) return '';

    if (tram > 0) {
        ketQua += mangSo[tram] + ' trăm';
    } else if (!isMostSignificantBlock && (chuc > 0 || donvi > 0)) {
        ketQua += 'không trăm';
    }

    if (chuc > 1) {
        ketQua += (ketQua ? ' ' : '') + mangSo[chuc] + ' mươi';
        if (donvi === 1) ketQua += ' mốt';
        else if (donvi === 5) ketQua += ' lăm';
        else if (donvi > 0) ketQua += ' ' + mangSo[donvi];
    } else if (chuc === 1) {
        ketQua += (ketQua ? ' ' : '') + 'mười';
        if (donvi === 5) ketQua += ' lăm';
        else if (donvi > 0) ketQua += ' ' + mangSo[donvi];
    } else if (donvi > 0) {
        if (ketQua) {
            ketQua += ' lẻ ' + mangSo[donvi];
        } else {
            ketQua += mangSo[donvi];
        }
    }
    return ketQua;
}

export function DocSo(number, decimalPlaces) {
  if (number === null || number === undefined || number === '' || isNaN(parseFloat(number)) || parseFloat(number) === 0) {
    return '';
  }

  let num = parseFloat(number);
  
  // If decimalPlaces specified, format to that many decimals
  let displayDecimalPlaces = decimalPlaces;
  if (decimalPlaces !== undefined && decimalPlaces !== null && decimalPlaces >= 0) {
    num = parseFloat(num.toFixed(decimalPlaces));
    displayDecimalPlaces = decimalPlaces;
  } else {
    // Use actual decimal places from the number
    const numStr = String(num);
    const dotIndex = numStr.indexOf('.');
    displayDecimalPlaces = dotIndex !== -1 ? numStr.substring(dotIndex + 1).length : 0;
  }

  const numStr = String(num);
  const parts = numStr.split('.');
  const integerPartStr = parts[0];
  let decimalPartStr = parts[1] || '';
  
  // Pad decimal part to match displayDecimalPlaces (for when config specifies decimals)
  // BUT: only if there's actually a decimal value, don't pad if it's a whole number
  if (decimalPlaces !== undefined && decimalPlaces !== null && decimalPlaces >= 0) {
    // Only pad if the original number had decimals OR we want to show trailing zeros
    // For whole numbers, keep decimalPartStr empty (no "phẩy 00")
    if (decimalPartStr) {
      decimalPartStr = decimalPartStr.padEnd(decimalPlaces, '0').substring(0, decimalPlaces);
      // Trim trailing zeros when reading (so 43.20 reads as "ba mươi ba phẩy hai", not "hai không")
      decimalPartStr = decimalPartStr.replace(/0+$/, '');
    }
    // If decimalPartStr is empty and it's a whole number, don't add fake decimals
  }

  const dv = ['', ' nghìn', ' triệu', ' tỷ'];
  let integerInWords = '';
  if (integerPartStr !== '0' && integerPartStr !== '') {
      let arr = [];
      let tempIntStr = integerPartStr;
      while (tempIntStr.length > 0) {
        arr.push(tempIntStr.substring(Math.max(0, tempIntStr.length - 3)));
        tempIntStr = tempIntStr.substring(0, Math.max(0, tempIntStr.length - 3));
      }

      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] === '000' && i < arr.length - 1) continue;
        const doc = convert_block_three(arr[i], i === arr.length - 1 && arr[i].length < 3);
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
  finalResult = finalResult.trim().replace(/\s+/g, ' ');

  if (!finalResult) return '';

  return finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
}

export function DateSub(endDateStr, startDateStr) {
  if (!endDateStr || !startDateStr || typeof endDateStr !== 'string' || typeof startDateStr !== 'string') return null;

  const parseDate = (dateString) => {
    const trimmed = dateString.trim();
    if (trimmed.length < 8) return null;
    
    let year, month, day;

    if (trimmed.includes('-')) {
       const parts = trimmed.split('-');
       if(parts.length === 3) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
       }
    } else if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
    }

    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(Date.UTC(year, month - 1, day));
    }
    return null;
  };

  const endDate = parseDate(endDateStr);
  const startDate = parseDate(startDateStr);

  if (endDate && startDate) {
    const timeDiff = endDate.getTime() - startDate.getTime();
    const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return dayDiff;
  }

  return null;
}
