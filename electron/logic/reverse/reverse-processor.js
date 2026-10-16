// =================================================================================================
// ==    REVERSE PROCESSOR - PRODUCTION VERSION                                               ==
// =================================================================================================
// Tác giả: Trợ lý AI & Người Chỉ Huy
// Phiên bản: Hợp nhất (Tích hợp logic từ V49, V50, V51)
// Mệnh Lệnh: Hợp nhất các logic sửa lỗi thành một phiên bản sản xuất tinh gọn.
// =================================================================================================
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom');
const { createTagParagraph, getParentBlock } = require('../xml-utils');
const { DocSo } = require('../shared-utils');

// =============================================================================
// REGEX UTILITY FUNCTIONS
// =============================================================================

function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\/\\]/g, '\\$&');
}

function createNumericPattern(numericString) {
    // Hỗ trợ số âm: -123 hoặc số dương: 123
    if (!numericString || !/^-?\d+$/.test(numericString)) return null;
    
    const isNegative = numericString.startsWith('-');
    const digits = isNegative ? numericString.slice(1) : numericString;
    
    // 🔧 FIX: Pattern separator mở rộng để match:
    // - Dấu chấm (.), dấu phẩy (,)
    // - Space thường và non-breaking space (\u00A0)
    // - Khoảng trắng Unicode (\s)
    // - Có thể có XML tags giữa các số (<[^>]*>)
    const SEP = '(?:[.,\\s\\u00A0]|<[^>]*>)*';
    
    const digitPattern = digits.split('').join(SEP);
    
    // 🔧 FIX v2.2.3: Thay lookbehind bằng capturing group
    // Vấn đề: Khi cell bảng dính liền (AD00027449101100.000.000)
    // lookbehind (?<![0-9-]) sẽ fail vì có số trước
    // Giải pháp: Sử dụng capturing group và match từ đầu hoặc sau ký tự không phải số
    if (isNegative) {
        // Số âm: dấu "-" phải đứng trước số
        // Match: đầu chuỗi HOẶC sau ký tự không phải số (bao gồm chữ cái)
        return `(?:^|(?<=[^0-9]))-${SEP}${digitPattern}(?![0-9])`;
    } else {
        // Số dương: match sau boundary hoặc ký tự không phải số
        // (?<=[^0-9-]) cho phép số đứng sau chữ cái (AD00027449101|100.000.000)
        // nhưng không cho phép đứng sau số khác (tránh 123|456)
        return `(?:^|(?<=[^0-9-]))${digitPattern}(?![0-9])`;
    }
}

function buildInnerPattern(value) {
    const normalizedValue = String(value).normalize('NFC');
    const textParts = normalizedValue.split(/[\s\p{P}]+/u).filter(Boolean);
    // 🔧 FIX v2.2.6: Hỗ trợ XML tags giữa các phần text (giống createNumericPattern)
    // Điều này cho phép match văn bản có formatting (bold, italic) trong linked fields
    // Pattern cho phép: space, punctuation, non-breaking space, và XML tags (<w:rPr>...</w:rPr> etc.)
    const SEP = '(?:[\\s\\p{P}\\u00A0]|<[^>]*>)*?';
    return textParts.map(escapeRegex).join(SEP);
}

function createGreedyPattern(value, ignoredChars) {
    const content = String(value || '').trim();
    if (!content) return null;
    
    // 🔧 FIX: Kiểm tra nếu là SỐ (bao gồm số âm)
    // Số có thể là: -123, 123, -3, 0
    if (/^-?\d+$/.test(content)) {
        return createNumericPattern(content);
    }
    
    // 🔧 FIX: Kiểm tra nếu là số có dấu phân cách (250.000 hoặc 250,000)
    if (/^-?[\d.,\s]+$/.test(content) && /\d/.test(content)) {
        // Chuyển về số thuần
        const numericOnly = content.replace(/[^\d-]/g, '');
        if (/^-?\d+$/.test(numericOnly)) {
            return createNumericPattern(numericOnly);
        }
    }
    
    // TEXT: không split theo dấu "-" để giữ nguyên từ có gạch ngang
    const separator = ignoredChars ? escapeRegex(ignoredChars) : '\\p{P}';
    const ignoredPattern = `[\\s${separator}]*?`;
    // Chỉ split theo space, comma, dot - KHÔNG split theo dấu "-"
    const parts = content.split(/[\s,.]+/).filter(Boolean);
    if (parts.length === 0) return null;
    
    // 🔧 FIX v2.2.5: Thay thế từ đồng nghĩa trong tiếng Việt
    // "nghìn" ↔ "ngàn" (cả hai đều nghĩa là thousand)
    // "lẻ" ↔ "linh" (cả hai đều dùng cho số 0 ở giữa)
    const synonymMap = {
        'nghìn': '(?:nghìn|ngàn)',
        'ngàn': '(?:nghìn|ngàn)',
        'lẻ': '(?:lẻ|linh)',
        'linh': '(?:lẻ|linh)'
    };
    
    const escapedParts = parts.map(part => {
        const lowerPart = part.toLowerCase();
        if (synonymMap[lowerPart]) {
            return synonymMap[lowerPart];
        }
        return escapeRegex(part);
    });
    
    // 🔧 FIX v2.2.4: Thêm word boundary cho text pattern
    // Để tránh "ba" match trong "Agribank"
    // Sử dụng Unicode word boundary: (?<!\p{L}) và (?!\p{L})
    // - (?<!\p{L}) = không có chữ cái Unicode trước
    // - (?!\p{L}) = không có chữ cái Unicode sau
    const innerPattern = escapedParts.join(ignoredPattern);
    return `(?<!\\p{L})${innerPattern}(?!\\p{L})`;
}

function createLinkedPattern(replacement) {
    const { sequence, sourceValues, separator } = replacement;
    if (!sequence || !sourceValues) return null;
    // 🔧 FIX v2.2.6: Separator pattern cũng cần hỗ trợ XML tags
    // để có thể match linked fields có formatting (bold, italic) trong văn bản gốc
    const separatorPattern = `(?:[\\s${escapeRegex(separator || ' ')}\\u00A0]|<[^>]*>)*`;
    let valueIndex = 0;
    const patternParts = [];
    for (const item of sequence) {
        let part = '';
        if (item.type === 'text') {
            // 🔧 FIX v2.2.6: Text cũng cần hỗ trợ XML tags giữa các ký tự
            const textChars = item.value.split('').map(escapeRegex);
            part = textChars.join('(?:<[^>]*>)*');
        } else if (item.type === 'field') {
            const fieldValue = sourceValues[valueIndex];
            if (fieldValue) {
                part = `(${buildInnerPattern(fieldValue)})`;
            }
            valueIndex++;
        }
        if (part) {
            patternParts.push(part);
        }
    }
    if (patternParts.length === 0) return null;
    return patternParts.join(separatorPattern);
}

// =============================================================================
// XML/DOCUMENT FUNCTIONS
// =============================================================================

function getRunsAndText(unit) {
  const runs = [];
  let fullText = '';
  if (!unit || !unit.getElementsByTagName) return { runs, fullText };
  
  // 🔧 FIX v2.2.3: Khi xử lý bảng (w:tbl), thêm separator giữa các cell
  // để tránh text dính liền (AD00027449101100.000.000)
  const isTable = unit.nodeName === 'w:tbl';
  
  const textNodes = unit.getElementsByTagName('w:t');
  let lastCellId = null;
  
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    if (node.childNodes && node.childNodes.length > 0 && node.childNodes[0].nodeValue != null) {
      const text = node.childNodes[0].nodeValue.normalize('NFC');
      
      // 🔧 FIX: Nếu là bảng, kiểm tra xem text node có thuộc cell khác không
      if (isTable) {
        // Tìm cell cha (w:tc)
        let parent = node.parentNode;
        let cellId = null;
        while (parent && parent !== unit) {
          if (parent.nodeName === 'w:tc') {
            cellId = parent;
            break;
          }
          parent = parent.parentNode;
        }
        
        // Nếu chuyển sang cell mới, thêm "virtual run" với space
        // để giữ đồng bộ giữa fullText và runs
        if (cellId && cellId !== lastCellId && lastCellId !== null) {
          // Thêm virtual separator - không có textNode thực
          runs.push({ textNode: null, text: ' ', originalText: ' ', isVirtual: true });
          fullText += ' ';
        }
        lastCellId = cellId;
      }
      
      runs.push({ textNode: node, text: text, originalText: text });
      fullText += text;
    }
  }
  return { runs, fullText };
}

// =============================================================================
// 🔧 v2.2.6: TABLE ROW PROCESSING FOR BLOCKS
// =============================================================================

/**
 * Lấy text content của một row (w:tr)
 */
function getRowText(row) {
  if (!row || !row.getElementsByTagName) return '';
  const textNodes = row.getElementsByTagName('w:t');
  let text = '';
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    if (node.childNodes && node.childNodes[0]?.nodeValue) {
      text += node.childNodes[0].nodeValue;
    }
  }
  return text;
}

/**
 * Kiểm tra row có phải là header row không
 * Header row thường: không có placeholder, có text như "STT", "Loại", "Số", etc.
 */
function isHeaderRow(rowText) {
  // Không có placeholder
  if (/\{[^{}]+\}/.test(rowText)) return false;
  
  // Có các từ khóa header phổ biến (case-insensitive)
  const headerKeywords = /\b(stt|loại|số|tên|ngày|giá trị|lãi suất|mệnh giá|tổ chức|đơn vị|ghi chú|diễn giải)\b/i;
  return headerKeywords.test(rowText);
}

/**
 * Kiểm tra row có phải là footer/tổng cộng row không
 * Footer row thường: chứa "Tổng", "Tổng cộng", "Cộng", etc.
 */
function isFooterRow(rowText) {
  // Chứa từ khóa tổng cộng
  const footerKeywords = /\b(tổng cộng|tổng|cộng|total|sum)\b/i;
  return footerKeywords.test(rowText);
}

/**
 * Lấy danh sách cells (w:tc) từ một row
 */
function getCellsFromRow(row) {
  if (!row || !row.getElementsByTagName) return [];
  return Array.from(row.getElementsByTagName('w:tc'));
}

/**
 * Lấy text content của một cell
 */
function getCellText(cell) {
  if (!cell || !cell.getElementsByTagName) return '';
  const textNodes = cell.getElementsByTagName('w:t');
  let text = '';
  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    if (node.childNodes && node.childNodes[0]?.nodeValue) {
      text += node.childNodes[0].nodeValue;
    }
  }
  return text;
}

/**
 * Lấy visual column index (tính cả gridSpan) cho từng cell trong row
 * Trả về mảng: [{cell, startCol, endCol}, ...]
 */
function getCellsWithVisualColumns(row) {
  const cells = getCellsFromRow(row);
  const result = [];
  let currentCol = 0;
  
  for (const cell of cells) {
    // Tìm gridSpan trong w:tcPr/w:gridSpan
    let span = 1;
    const tcPr = cell.getElementsByTagName('w:tcPr')[0];
    if (tcPr) {
      const gridSpan = tcPr.getElementsByTagName('w:gridSpan')[0];
      if (gridSpan) {
        const val = gridSpan.getAttribute('w:val');
        if (val) span = parseInt(val, 10) || 1;
      }
    }
    
    result.push({
      cell,
      startCol: currentCol,
      endCol: currentCol + span - 1,
      span,
      text: getCellText(cell).trim()
    });
    
    currentCol += span;
  }
  
  return result;
}

/**
 * 🔧 v2.2.6: Extract SUM replacements từ TẤT CẢ bảng trong document
 * Chạy TRƯỚC khi thay thế để đọc được số từ footer
 * 
 * @param {Document} doc - XML document
 * @param {Array} allUnits - Tất cả paragraph/table units
 * @param {Map} blockCandidates - Map các block với replacements
 * @param {Function} sendProgress - Progress callback
 * @returns {Array} - Mảng các replacement objects cho sum fields
 */
function extractSumFromTables(doc, allUnits, blockCandidates, sendProgress) {
  const allSumReplacements = [];
  
  // 🔧 v2.2.6: Tính toán SUM dự kiến cho mỗi rawKey trong mỗi block
  // Ví dụ: so_tiet_kiem có gia_tri ở index 0 = 100M, index 1 = 200M → sum = 300M
  const expectedSums = new Map(); // rawKey → expectedSum (số nguyên)
  
  for (const [blockId, block] of blockCandidates.entries()) {
    const replacements = block.replacements || [];
    const sumsByRawKey = new Map(); // rawKey → array of numbers
    
    for (const rep of replacements) {
      // Extract rawKey và index từ key: so_tiet_kiem_0_gia_tri
      const match = rep.key.match(new RegExp(`^${blockId}_(\\d+)_(.+)$`));
      if (!match) continue;
      
      const rawKey = match[2];
      
      // Tìm numeric candidate trong values
      const values = Array.isArray(rep.value) ? rep.value : [rep.value];
      for (const v of values) {
        if (typeof v === 'object' && v?.isNumeric && v?.value) {
          const num = parseInt(v.value, 10);
          if (!isNaN(num) && num > 0) {
            if (!sumsByRawKey.has(rawKey)) {
              sumsByRawKey.set(rawKey, []);
            }
            sumsByRawKey.get(rawKey).push(num);
          }
        }
      }
    }
    
    // Tính tổng cho mỗi rawKey
    for (const [rawKey, numbers] of sumsByRawKey.entries()) {
      const sum = numbers.reduce((a, b) => a + b, 0);
      if (sum > 0) {
        expectedSums.set(rawKey, sum);
        if (sendProgress) {
          sendProgress({ log: { type: 'info', message: `[SUM CALC] ${rawKey}: ${numbers.join(' + ')} = ${sum}` } });
        }
      }
    }
  }
  
  if (expectedSums.size === 0) {
    if (sendProgress) sendProgress({ log: { type: 'info', message: `[SUM] Không có numeric candidates để tính tổng` } });
    return allSumReplacements;
  }
  
  // Duyệt qua tất cả bảng để tìm footer rows
  for (const unit of allUnits) {
    if (unit.nodeName !== 'w:tbl') continue;
    
    const rows = unit.getElementsByTagName('w:tr');
    if (!rows || rows.length < 2) continue;
    
    const rowsArray = Array.from(rows);
    
    // Tìm footer rows
    for (let i = 0; i < rowsArray.length; i++) {
      const row = rowsArray[i];
      const rowText = getRowText(row);
      
      if (!isFooterRow(rowText)) continue;
      
      // Lấy tất cả số trong footer row
      const cells = getCellsFromRow(row);
      for (const cell of cells) {
        const cellText = getCellText(cell).trim();
        
        // Bỏ qua cell "Tổng cộng"
        if (/\b(tổng|cộng|total|sum)\b/i.test(cellText)) continue;
        
        // Kiểm tra cell có số không
        if (!/\d/.test(cellText)) continue;
        
        // Lấy số từ cell (loại bỏ dấu phân cách)
        const footerNum = parseInt(cellText.replace(/[^\d]/g, ''), 10);
        if (isNaN(footerNum) || footerNum === 0) continue;
        
        // Tìm rawKey có expectedSum === footerNum
        for (const [rawKey, expectedSum] of expectedSums.entries()) {
          if (Math.abs(expectedSum - footerNum) < 2) { // Cho phép sai số 1 đồng (làm tròn)
            const sumKey = `sum_${rawKey}`;
            
            // Kiểm tra xem đã tạo replacement này chưa
            const exists = allSumReplacements.some(r => r.key === sumKey);
            if (exists) continue;
            
            // Tạo replacement cho số
            allSumReplacements.push({
              key: sumKey,
              value: [
                cellText, // Giá trị có format (300.000.000)
                { isNumeric: true, value: String(footerNum) }
              ]
            });
            
            // 🔧 v2.2.6: Tạo thêm replacement cho bằng chữ
            const sumBangChuKey = `${sumKey}_bang_chu`;
            const sumBangChuText = DocSo(footerNum);
            if (sumBangChuText) {
              allSumReplacements.push({
                key: sumBangChuKey,
                value: sumBangChuText
              });
              if (sendProgress) {
                sendProgress({ log: { type: 'success', message: `[SUM] Tạo: {${sumBangChuKey}} = "${sumBangChuText.substring(0, 30)}..."` } });
              }
            }
            
            if (sendProgress) {
              sendProgress({ log: { type: 'success', message: `[SUM] Tạo: {${sumKey}} = "${cellText}" (expected ${expectedSum})` } });
            }
            
            // Xóa khỏi expectedSums để không match lại
            expectedSums.delete(rawKey);
            break;
          }
        }
      }
    }
  }
  
  return allSumReplacements;
}

/**
 * Xử lý bảng cho block: 
 * - Giữ nguyên header row (tiêu đề)
 * - Giữ nguyên footer row (tổng cộng)
 * - Chỉ xử lý data rows ở giữa: giữ 1 template, xóa trùng lặp
 * 
 * @param {Document} doc - XML document
 * @param {Element} table - w:tbl element
 * @param {Set} rawKeysForBlock - Set các key thuộc block (không có prefix)
 * @param {string} blockId - ID của block
 * @param {Function} sendProgress - Progress callback
 */
function processTableForBlock(doc, table, rawKeysForBlock, blockId, sendProgress) {
  const rows = table.getElementsByTagName('w:tr');
  if (!rows || rows.length === 0) return;
  
  const rowsArray = Array.from(rows);
  
  // Phân loại rows
  const headerRows = [];
  const footerRows = [];
  const dataRows = [];
  
  for (let i = 0; i < rowsArray.length; i++) {
    const row = rowsArray[i];
    const rowText = getRowText(row);
    
    if (isHeaderRow(rowText)) {
      headerRows.push({ row, index: i, text: rowText });
    } else if (isFooterRow(rowText)) {
      footerRows.push({ row, index: i, text: rowText });
    } else {
      // Data row - có thể có placeholder hoặc không
      dataRows.push({ row, index: i, text: rowText });
    }
  }
  
  // Log phân loại
  if (sendProgress) {
    sendProgress({ log: { type: 'info', message: `[Bảng] Phân loại: ${headerRows.length} header, ${dataRows.length} data, ${footerRows.length} footer` } });
  }
  
  // Xử lý data rows - giữ 1 template, xóa trùng lặp
  const seenKeys = new Set();
  const rowsToRemove = [];
  let templateDataRow = null;
  
  for (const dataRowInfo of dataRows) {
    const rowText = dataRowInfo.text;
    const keysInRow = [...rowText.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]).filter(k => rawKeysForBlock.has(k));
    
    if (keysInRow.length === 0) continue; // Row không có placeholder của block
    
    const hasSeenKey = keysInRow.some(key => seenKeys.has(key));
    
    if (hasSeenKey) {
      // Row này có key đã thấy → đánh dấu để xóa
      rowsToRemove.push(dataRowInfo.row);
    } else {
      // Row đầu tiên với các key mới → giữ làm template
      if (!templateDataRow) {
        templateDataRow = dataRowInfo.row;
      }
      keysInRow.forEach(key => seenKeys.add(key));
    }
  }
  
  // Xóa các data rows trùng lặp
  if (rowsToRemove.length > 0) {
    if (sendProgress) {
      sendProgress({ log: { type: 'info', message: `[Bảng] Xóa ${rowsToRemove.length} dòng dữ liệu trùng lặp (giữ header/footer)` } });
    }
    
    for (const row of rowsToRemove) {
      if (row.parentNode) {
        row.parentNode.removeChild(row);
      }
    }
  }
  
  // Log kết quả - chỉ giữ lại các logs quan trọng
  if (sendProgress && templateDataRow) {
    sendProgress({ log: { type: 'info', message: `[Bảng] Xử lý: ${headerRows.length} header, ${dataRows.length} data (xóa ${rowsToRemove.length}), ${footerRows.length} footer` } });
  }
}

/**
 * 🔧 v2.2.6: Chèn khối {#blockId} và {/blockId} BÊN TRONG bảng
 * Chỉ bao quanh data rows, không bao quanh header/footer
 * 
 * @param {Document} doc - XML document
 * @param {Element} table - w:tbl element
 * @param {string} blockId - ID của block
 * @param {Function} sendProgress - Progress callback
 */
function insertBlockTagsInsideTable(doc, table, blockId, sendProgress) {
  const rows = table.getElementsByTagName('w:tr');
  if (!rows || rows.length === 0) {
    if (sendProgress) sendProgress({ log: { type: 'warning', message: `[Bảng] Không có rows trong bảng` } });
    return;
  }
  
  const rowsArray = Array.from(rows);
  
  // Tìm data row ĐẦU TIÊN (chỉ dùng 1 dòng làm template)
  let templateRowIndex = -1;
  
  for (let i = 0; i < rowsArray.length; i++) {
    const row = rowsArray[i];
    const rowText = getRowText(row);
    const isHeader = isHeaderRow(rowText);
    const isFooter = isFooterRow(rowText);
    const hasPlaceholder = /\{[^{}]+\}/.test(rowText);
    
    // Bỏ qua header và footer
    if (isHeader || isFooter) continue;
    
    // Kiểm tra row có placeholder không - đây là template row
    if (hasPlaceholder) {
      templateRowIndex = i;
      break; // Chỉ lấy dòng đầu tiên làm template
    }
  }
  
  if (templateRowIndex === -1) {
    if (sendProgress) sendProgress({ log: { type: 'warning', message: `[Bảng] Không tìm thấy data row để đóng khối (tất cả đều là header/footer hoặc không có placeholder)` } });
    return;
  }
  
  const templateRow = rowsArray[templateRowIndex];
  const cells = templateRow.getElementsByTagName('w:tc');
  
  if (!cells || cells.length === 0) {
    if (sendProgress) sendProgress({ log: { type: 'warning', message: `[Bảng] Template row không có cells` } });
    return;
  }
  
  // Chèn {#blockId} vào ĐẦU cell đầu tiên của template row
  const firstCell = cells[0];
  if (firstCell) {
    const startTagPara = createTagParagraph(doc, `{#${blockId}}`);
    // Chèn làm con đầu tiên của cell
    if (firstCell.firstChild) {
      firstCell.insertBefore(startTagPara, firstCell.firstChild);
    } else {
      firstCell.appendChild(startTagPara);
    }
  }
  
  // Chèn {/blockId} vào CUỐI cell cuối của CÙNG template row
  const lastCell = cells[cells.length - 1];
  if (lastCell) {
    const endTagPara = createTagParagraph(doc, `{/${blockId}}`);
    lastCell.appendChild(endTagPara);
  }
  
  if (sendProgress) {
    sendProgress({ log: { type: 'success', message: `[Bảng] ✅ Đã chèn {#${blockId}}...{/${blockId}} vào template row (index ${templateRowIndex})` } });
  }
}

// =============================================================================
// CORE REPLACEMENT LOGIC
// =============================================================================

function initialSmartReplaceFinal(doc, unit, replacements, sendProgress) {
  const { runs, fullText } = getRunsAndText(unit);
  if (!fullText || runs.length === 0 || fullText.trim() === '') return 0;

  const allOps = [];
  const priorityZones = []; 

  const linkedFieldReplacements = replacements.filter(r => r.isLinkedField);
  const simpleReplacements = replacements.filter(r => !r.isLinkedField);

  // --- STEP 1: Process LINKED FIELDS first ---
  for (const rep of linkedFieldReplacements) {
    const patternString = createLinkedPattern(rep);
    if (!patternString) {
      continue;
    }

    const contextRegex = new RegExp(patternString, 'giu');
    const prefixMatch = rep.key.match(/^(.*_\d+)_/);
    const prefix = prefixMatch ? prefixMatch[1] : '';

    let contextMatch;
    let matchFound = false;
    while ((contextMatch = contextRegex.exec(fullText)) !== null) {
      matchFound = true;
      const fullMatchStart = contextMatch.index;
      const fullMatchEnd = fullMatchStart + contextMatch[0].length;
      priorityZones.push({ start: fullMatchStart, end: fullMatchEnd });

      let currentPositionInMatch = 0;
      for (let i = 0; i < rep.sourceKeys.length; i++) {
        const subMatchText = contextMatch[i + 1];
        if (!subMatchText) continue;

        const rawSubKey = rep.sourceKeys[i];
        const finalSubKey = prefix ? `${prefix}_${rawSubKey}` : rawSubKey;
        const opStart = fullText.indexOf(subMatchText, fullMatchStart + currentPositionInMatch);
        
        if (opStart !== -1) {
            const opEnd = opStart + subMatchText.length;
            allOps.push({ start: opStart, end: opEnd, newText: `{${finalSubKey}}` });
            currentPositionInMatch = opEnd - fullMatchStart;
        }
      }
    }
  }

  // --- STEP 2: Process SIMPLE FIELDS with equalized logic ---
  for (const replacement of simpleReplacements) {
    const candidates = Array.isArray(replacement.value) ? replacement.value : [replacement.value];
    const ignoredChars = replacement.globalIgnoredChars || ''; 

    for (const candidate of candidates) {
        let searchValue;
        let isNumericSearch = false;

        if (typeof candidate === 'object' && candidate.isNumeric) {
            searchValue = candidate.value;
            isNumericSearch = true;
        } else {
            searchValue = String(candidate || '').trim();
        }

        if (!searchValue) continue;

        const searchSet = new Set([searchValue]);
        if (!isNumericSearch) {
            const dateMatch = searchValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (dateMatch) {
                searchSet.add(`${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`);
            }
        }

        for (const finalSearchValue of searchSet) {
            try {
                const patternString = isNumericSearch
                    ? createNumericPattern(finalSearchValue)
                    : createGreedyPattern(finalSearchValue, ignoredChars);

                if (!patternString) continue;

                const flexibleRegex = new RegExp(patternString, 'giu');
                let match;
                let matchCount = 0;
                while ((match = flexibleRegex.exec(fullText)) !== null) {
                    matchCount++;
                    const opStart = match.index;
                    const opEnd = opStart + match[0].length;

                    const isOverlapping = priorityZones.some(zone => opStart < zone.end && opEnd > zone.start);

                    if (!isOverlapping) {
                        allOps.push({ start: opStart, end: opEnd, newText: `{${replacement.key}}` });
                    }
                }
            } catch (e) {
                if (sendProgress) sendProgress({ log: { type: 'error', message: `[Lỗi Regex] Không thể xử lý giá trị '${finalSearchValue}': ${e.message}` } });
            }
        }
    }
  }

  // --- STEP 3: Finalize and Apply Operations ---
  if (allOps.length === 0) return 0;

  allOps.sort((a, b) => a.start - b.start || b.end - a.end);

  const nonOverlappingOps = [];
  let lastOpEnd = -1;
  for (const op of allOps) {
    if (op.start >= lastOpEnd) {
      nonOverlappingOps.push(op);
      lastOpEnd = op.end;
    }
  }

  nonOverlappingOps.sort((a, b) => b.start - a.start);

  for (const op of nonOverlappingOps) {
    let charCounter = 0;
    let opStartHandled = false;
    for (const runInfo of runs) {
      const textStart = charCounter;
      const textEnd = charCounter + runInfo.originalText.length;

      if (textEnd > op.start && textStart < op.end) {
        // 🔧 FIX v2.2.3: Bỏ qua virtual runs (separator giữa các cell trong bảng)
        if (runInfo.isVirtual) {
          charCounter = textEnd;
          continue;
        }
        
        const nodeText = runInfo.text;
        const replaceStartInNode = Math.max(0, op.start - textStart);
        const replaceEndInNode = Math.min(nodeText.length, op.end - textStart);

        let newTextContent = opStartHandled 
            ? nodeText.substring(0, replaceStartInNode) + '' + nodeText.substring(replaceEndInNode)
            : nodeText.substring(0, replaceStartInNode) + op.newText + nodeText.substring(replaceEndInNode);

        opStartHandled = true;

        // 🔧 FIX v2.2.4: Double-check for null textNode before accessing childNodes
        if (!runInfo.textNode || !runInfo.textNode.childNodes || !runInfo.textNode.childNodes[0]) {
          continue;
        }
        const newTextNode = doc.createTextNode(newTextContent);
        runInfo.textNode.childNodes[0].parentNode.replaceChild(newTextNode, runInfo.textNode.childNodes[0]);
        runInfo.text = newTextContent;
      }
      charCounter = textEnd;
    }
  }
  return nonOverlappingOps.length;
}

// =============================================================================
// BLOCK STRATEGY & FILE SAVING
// =============================================================================

function executeBlockAndFlattenStrategy(doc, allUnits, blockCandidates, flatReplacements, sendProgress) {
    const MIN_PLACEHOLDERS_FOR_BLOCK = 2;
    const allForeignPlaceholders = new Set((flatReplacements || []).map(r => `{${r.key}}`));

    for (const [blockId, block] of blockCandidates.entries()) {
        const blockKeys = new Set((block.replacements || []).flatMap(r => r.isLinkedField ? r.sourceKeys.map(sk => `${blockId}_${(r.key.match(/_(\d+)_/) || [null, '0'])[1]}_${sk}`) : [r.key]));
        if (blockKeys.size === 0) continue;

        const chunks = [];
        let currentChunk = [];
        const unitsWithPlaceholders = allUnits.filter(u => getRunsAndText(u).fullText.includes('{'));
        
        if (unitsWithPlaceholders.length > 0) {
            const firstRelevantIndex = Math.min(...unitsWithPlaceholders.map(u => u.originalIndex).filter(i => i !== undefined));
            const lastRelevantIndex = Math.max(...unitsWithPlaceholders.map(u => u.originalIndex).filter(i => i !== undefined));
            const scanRange = allUnits.filter(u => u.originalIndex >= firstRelevantIndex && u.originalIndex <= lastRelevantIndex);

            for (const unit of scanRange) {
                const unitText = getRunsAndText(unit).fullText;
                const placeholdersInUnit = [...unitText.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]);
                const hasForeign = placeholdersInUnit.some(p => allForeignPlaceholders.has(`{${p}}`) && !blockKeys.has(p));
                
                // 🔧 v2.2.5: Check nếu unit có text thuần (không chỉ có placeholders) và không có placeholder của block
                // → coi như có dữ liệu ngăn cách → đóng chunk
                const hasBlockPlaceholder = placeholdersInUnit.some(p => blockKeys.has(p));
                const textWithoutPlaceholders = unitText.replace(/\{[^{}]+\}/g, '').trim();
                const hasSubstantialText = textWithoutPlaceholders.length > 10; // Có text đáng kể
                const isDataSeparator = !hasBlockPlaceholder && hasSubstantialText && placeholdersInUnit.length === 0;
                
                // 🔧 v2.2.6 FIX: Nếu unit có placeholder của block → LUÔN thêm vào chunk
                // Bất kể có foreign placeholder hay không (vì bảng có thể chứa cả hai)
                if (hasBlockPlaceholder) {
                    // Unit có placeholder của block → thêm vào chunk
                    currentChunk.push(unit);
                } else if (hasForeign || isDataSeparator) {
                    // Unit KHÔNG có placeholder của block VÀ (có foreign HOẶC là separator) → đóng chunk
                    if (currentChunk.length > 0) {
                        chunks.push(currentChunk);
                    }
                    currentChunk = [];
                } else { 
                    // Unit không có placeholder gì đặc biệt → thêm vào chunk
                    currentChunk.push(unit);
                }
            }
        }
        if (currentChunk.length > 0) chunks.push(currentChunk);

        const finalChunks = chunks.filter(c => c.some(u => [...getRunsAndText(u).fullText.matchAll(/\{([^{}]+)\}/g)].some(m => blockKeys.has(m[1]))));
        
        // 🔍 DEBUG: Log thông tin quan trọng về chunks và bảng
        if (sendProgress) {
            const totalTables = chunks.reduce((sum, c) => sum + c.filter(u => u.nodeName === 'w:tbl').length, 0);
            const finalTables = finalChunks.reduce((sum, c) => sum + c.filter(u => u.nodeName === 'w:tbl').length, 0);
            sendProgress({ log: { type: 'info', message: `[DEBUG] Block ${blockId}: ${chunks.length} chunks (${totalTables} bảng), ${finalChunks.length} finalChunks (${finalTables} bảng)` } });
            
            // Log chi tiết nếu có bảng bị mất
            if (totalTables > 0 && finalTables === 0) {
                for (let ci = 0; ci < chunks.length; ci++) {
                    const c = chunks[ci];
                    const tables = c.filter(u => u.nodeName === 'w:tbl');
                    if (tables.length > 0) {
                        const tblText = getRunsAndText(tables[0]).fullText;
                        const placeholders = [...tblText.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]);
                        const hasBlockKey = placeholders.some(p => blockKeys.has(p));
                        sendProgress({ log: { type: 'warning', message: `[DEBUG] Chunk ${ci} có bảng nhưng không vào finalChunks. hasBlockKey=${hasBlockKey}, placeholders=${placeholders.slice(0, 3).join(', ')}...` } });
                    }
                }
            }
        }

        for (let i = finalChunks.length - 1; i >= 0; i--) {
            const chunk = finalChunks[i];
            const chunkText = chunk.map(u => getRunsAndText(u).fullText).join('\n');
            const uniqueRawKeysInChunk = new Set([...chunkText.matchAll(new RegExp(`{${blockId}_\\d+_(.+?)}`, 'g'))].map(m => m[1]));

            if (uniqueRawKeysInChunk.size >= MIN_PLACEHOLDERS_FOR_BLOCK) {
                if (sendProgress) sendProgress({ log: { type: 'info', message: `[Phân tích] Đã tạo khối dữ liệu lặp: '${blockId}'.` } });

                const rawKeysForBlock = new Set([...blockKeys].map(k => k.replace(new RegExp(`^${blockId}_\\d+_`), '')));

                for (const unit of chunk) {
                    for (const run of getRunsAndText(unit).runs) {
                        // 🔧 FIX v2.2.4: Skip virtual runs and null textNodes
                        if (!run.textNode || !run.textNode.childNodes || !run.textNode.childNodes[0]?.nodeValue) continue;
                        let text = run.textNode.childNodes[0].nodeValue;
                        text = text.replace(new RegExp(`{${blockId}_\\d+_(.+?)}`, 'g'), `{$1}`);
                        run.textNode.replaceChild(doc.createTextNode(text), run.textNode.childNodes[0]);
                    }
                }

                // 🔧 v2.2.6: Xử lý THỐNG NHẤT cho cả BẢNG và PARAGRAPH
                // Theo dõi keys đã thấy ACROSS tất cả units (bao gồm cả bảng)
                const seenRawKeys = new Set();
                const unitsToRemove = [];
                
                for (const unit of chunk) {
                    const unitText = getRunsAndText(unit).fullText;
                    const keysInUnit = [...unitText.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]).filter(k => rawKeysForBlock.has(k));
                    if (keysInUnit.length === 0) continue;
                    
                    const hasSeenKey = keysInUnit.some(key => seenRawKeys.has(key));
                    
                    if (hasSeenKey) {
                        // Unit này có key đã thấy → đánh dấu để xóa
                        if (unit.nodeName === 'w:tbl') {
                            // 🔧 Với BẢNG: xử lý rows bên trong trước khi quyết định xóa
                            // Nếu TẤT CẢ keys trong bảng đều đã thấy → xóa cả bảng
                            const allKeysSeenBefore = keysInUnit.every(key => seenRawKeys.has(key));
                            if (allKeysSeenBefore) {
                                if (sendProgress) sendProgress({ log: { type: 'info', message: `[Bảng] Xóa bảng trùng lặp (tất cả keys đã có): ${keysInUnit.slice(0, 3).join(', ')}...` } });
                                unitsToRemove.push(unit);
                            } else {
                                // Có một số key mới → xử lý rows trong bảng
                                processTableForBlock(doc, unit, rawKeysForBlock, blockId, sendProgress);
                                keysInUnit.forEach(key => seenRawKeys.add(key));
                            }
                        } else {
                            // PARAGRAPH: xóa như trước
                            unitsToRemove.push(unit);
                        }
                    } else {
                        // Chưa thấy key nào → giữ lại, thêm vào seenRawKeys
                        if (unit.nodeName === 'w:tbl') {
                            // Với bảng đầu tiên: xử lý rows để xóa row trùng
                            processTableForBlock(doc, unit, rawKeysForBlock, blockId, sendProgress);
                        }
                        keysInUnit.forEach(key => seenRawKeys.add(key));
                    }
                }
                
                // 🔧 v2.2.6: Xử lý riêng cho BẢNG và PARAGRAPH
                // QUAN TRỌNG: Chèn block tags TRƯỚC KHI xóa units!
                
                const tablesInChunk = chunk.filter(unit => {
                    if (unit.nodeName !== 'w:tbl') return false;
                    // Không chèn vào bảng sẽ bị xóa
                    if (unitsToRemove.includes(unit)) return false;
                    return true;
                });
                
                // 🔍 DEBUG: Log quan trọng để debug vấn đề block tags
                if (sendProgress) {
                    const tablesInChunkAll = chunk.filter(unit => unit.nodeName === 'w:tbl');
                    sendProgress({ log: { type: 'info', message: `[DEBUG] Block ${blockId}: chunk có ${tablesInChunkAll.length} bảng, ${tablesInChunk.length} sẽ được chèn block tags` } });
                }
                
                // Với BẢNG: chèn khối BÊN TRONG bảng (trước/sau data row)
                for (const table of tablesInChunk) {
                    insertBlockTagsInsideTable(doc, table, blockId, sendProgress);
                }

                const paragraphsInChunk = chunk.filter(unit => {
                    if (!unit.parentNode) return false;
                    if (unit.nodeName === 'w:tbl') return false;
                    if (unitsToRemove.includes(unit)) return false;
                    const text = getRunsAndText(unit).fullText;
                    return [...text.matchAll(/\{([^{}]+)\}/g)].map(m => m[1]).some(k => rawKeysForBlock.has(k));
                });

                // SAU ĐÓ mới xóa các units trùng lặp
                unitsToRemove.forEach(unit => unit.parentNode?.removeChild(unit));

                // Với PARAGRAPH: chèn khối BÊN NGOÀI như cũ
                if (paragraphsInChunk.length > 0) {
                    const firstContentUnit = paragraphsInChunk[0];
                    const lastContentUnit = paragraphsInChunk[paragraphsInChunk.length - 1];

                    getParentBlock(firstContentUnit).insertBefore(createTagParagraph(doc, `{#${blockId}}`), firstContentUnit);
                    
                    const endTag = createTagParagraph(doc, `{/${blockId}}`);
                    const parentLast = getParentBlock(lastContentUnit);
                    if (lastContentUnit.nextSibling) {
                        parentLast.insertBefore(endTag, lastContentUnit.nextSibling);
                    } else {
                        parentLast.appendChild(endTag);
                    }
                }

            } else if (chunk.length > 0) {
                 if (sendProgress) sendProgress({ log: { type: 'info', message: `[Tối ưu] Làm phẳng khối '${blockId}' do không đủ trường. Dữ liệu sẽ được điền tuần tự.` } });
            }
        }
    }
}


async function processSingleFileV12(sourcePath, saveDirectory, flatReplacements, loopCandidates, blockCandidates, sendProgress, numberFormat) {
  try {
    const fileName = path.basename(sourcePath);
    if (sendProgress) sendProgress({ log: { type: 'info', message: `[Bắt đầu] Đang xử lý file: ${fileName}` } });
    const content = fs.readFileSync(sourcePath, 'binary');
    const zip = new PizZip(content);
    const doc = new DOMParser().parseFromString(zip.files['word/document.xml'].asText(), 'application/xml');
    const allUnits = [];
    const body = doc.getElementsByTagName('w:body')[0];
    for (let i = 0; i < body.childNodes.length; i++) {
      const node = body.childNodes[i];
      if (node.nodeName === 'w:p' || node.nodeName === 'w:tbl') {
        node.originalIndex = i;
        allUnits.push(node);
      }
    }
    
    // 🔧 v2.2.6: PHASE 1 - Extract SUM replacements TRƯỚC (chưa thay thế)
    // Vì sum cần đọc số từ footer rows trước khi bị thay thế
    const sumReplacements = extractSumFromTables(doc, allUnits, blockCandidates || new Map(), sendProgress);
    
    // Tạo danh sách replacements đầy đủ (bao gồm sum)
    const allReplacements = [
      ...(flatReplacements || []),
      ...Array.from((blockCandidates && blockCandidates.values()) || []).flatMap(b => b.replacements || []),
      ...(sumReplacements || [])
    ];
    
    // 🔍 DEBUG: Log số lượng
    if (sendProgress) {
        sendProgress({ log: { type: 'info', message: `[DEBUG] Tìm thấy ${allUnits.length} đơn vị (p/tbl), ${allUnits.filter(u => u.nodeName === 'w:tbl').length} bảng` } });
        sendProgress({ log: { type: 'info', message: `[DEBUG] ${allReplacements.length} replacements (${sumReplacements?.length || 0} sum)` } });
    }
    
    // 🔧 v2.2.6: PHASE 2 - Thay thế số/text bằng placeholder
    for (const unit of allUnits) {
        initialSmartReplaceFinal(doc, unit, allReplacements, sendProgress);
    }
    
    // 🔧 v2.2.6: PHASE 3 - Xử lý khối (SAU khi đã có placeholder)
    executeBlockAndFlattenStrategy(doc, allUnits, blockCandidates || new Map(), flatReplacements || [], sendProgress);

    const finalXml = new XMLSerializer().serializeToString(doc);
    zip.file('word/document.xml', finalXml);
    const outputBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const savePath = path.join(saveDirectory, `Mau_${fileName}`);
    fs.writeFileSync(savePath, outputBuffer);
    if (sendProgress) sendProgress({ log: { type: 'success', message: `[Hoàn tất] Xử lý thành công! File đã được lưu tại: ${savePath}` } });
    return { success: true };
  } catch (e) {
    if (sendProgress) sendProgress({ log: { type: 'error', message: `[Lỗi nghiêm trọng] Xảy ra lỗi khi xử lý file: ${e.message}`, details: e.stack } });
    return { success: false, message: e.message };
  }
}

module.exports = { processSingleFileV12 };
