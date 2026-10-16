// =================================================================================================
// ==    DATA PREPARER - V21.0 ("CLEAN-AND-EFFICIENT")                                    ==
// =================================================================================================
// Tác giả: Trợ lý AI
// Phiên bản: V21.0 - Phiên bản sản xuất, tinh gọn.
// Mệnh Lệnh: Giữ lại logic cốt lõi của The Gatekeeper, loại bỏ tất cả các log gỡ lỗi.
// =================================================================================================

const { DocSo, unformatNumber } = require('../shared-utils.js');

function formatNumberStandard(n, numberFormat = {}) {
    const { locale = 'vi-VN' } = numberFormat;
    let valueStr = String(n);
    if (locale === 'vi-VN') {
        return valueStr.replace('.', ',');
    }
    return valueStr;
}

function createReplacement(key, value, fieldType, metadata = {}, settings = {}) {
    const numberFormat = settings?.numberFormat || {};
    const decimalPlaces = numberFormat.decimalPlaces ?? 3;
    const isNumericField = fieldType === 'number' || fieldType === 'currency';

    let valueCandidates = new Set();

    if (value === null || value === undefined) {
        if (!metadata.isLinkedField) return null;
    }

    // 🔧 v2.2.6: Bỏ qua giá trị text quá ngắn (< 2 ký tự) - tránh match sai
    // Trừ khi là linked field hoặc numeric field
    if (!metadata.isLinkedField && !isNumericField) {
        const strValue = String(value || '').trim();
        if (strValue.length < 2) {
            return null;
        }
    }

    if (!metadata.isLinkedField) {
        // 🔧 FIX: Nếu value đã là số, xử lý trực tiếp - không qua unformatNumber
        if (typeof value === 'number' && !isNaN(value)) {
            const numberVal = value;
            const roundedVal = Number(numberVal.toFixed(decimalPlaces));
            valueCandidates.add(formatNumberStandard(roundedVal, { locale: 'vi-VN' }));
            valueCandidates.add(formatNumberStandard(roundedVal, { locale: 'en-US' }));
            
            // 🔧 FIX: Giữ lại dấu "-" cho số âm, bỏ phần thập phân cho numericOnly
            // 🔧 FIX v2.2.3 → v2.2.6: Tạo numeric candidate cho số >= 2 chữ số (trước là >= 3)
            // Số 2 chữ số như 73 vẫn cần được match, nhưng pattern trong reverse-processor 
            // sẽ đảm bảo không match sai (word boundary)
            const numericOnly = String(Math.round(roundedVal)).replace(/[^0-9-]/g, '');
            const absNumeric = numericOnly.replace('-', '');
            if (numericOnly && absNumeric.length >= 2) {
                valueCandidates.add(JSON.stringify({ isNumeric: true, value: numericOnly }));
            }
        } else {
            const valueStr = String(value);
            if (isNumericField) {
                const numericResult = unformatNumber(valueStr, numberFormat);
                // 🔧 FIX: Cho phép số 0 (numericResult có thể là 0)
                if (numericResult !== null && numericResult !== undefined && numericResult !== '' && !isNaN(Number(numericResult))) {
                     const numberVal = Number(numericResult);
                     const roundedVal = Number(numberVal.toFixed(decimalPlaces));
                     valueCandidates.add(formatNumberStandard(roundedVal, { locale: 'vi-VN' }));
                     valueCandidates.add(formatNumberStandard(roundedVal, { locale: 'en-US' }));

                     // 🔧 FIX: Giữ lại dấu "-" cho số âm, bỏ phần thập phân cho numericOnly
                     // 🔧 FIX v2.2.3 → v2.2.6: Tạo numeric candidate cho số >= 2 chữ số (trước là >= 3)
                     const numericOnly = String(Math.round(roundedVal)).replace(/[^0-9-]/g, '');
                     const absNumeric = numericOnly.replace('-', '');
                     if (numericOnly && absNumeric.length >= 2) {
                         valueCandidates.add(JSON.stringify({ isNumeric: true, value: numericOnly }));
                     }
                } else {
                     valueCandidates.add(valueStr);
                }
            } else {
                valueCandidates.add(valueStr);
            }
        }
    }

    const finalValues = [...valueCandidates]
        .map(v => { try { return JSON.parse(v); } catch (e) { return v; } })
        .map(v => (typeof v === 'string' ? v.trim() : v))
        .filter(v => v && (v.value || (typeof v === 'string' && v !== '') || typeof v === 'number'));

    if (finalValues.length === 0 && !metadata.isLinkedField) {
        return null;
    }

    const uniqueValues = [...new Set(finalValues.map(v => typeof v === 'object' ? JSON.stringify(v) : v))]
        .map(v => (String(v).startsWith('{') ? JSON.parse(v) : v));

    const result = { id: '{' + key + '}', key: key, ...metadata };
    if (!metadata.isLinkedField) {
        result.value = uniqueValues;
    }

    return result;
}

function generateSimpleReplacementsForKey(key, value, fieldType, metadata, settings) {
    const results = [];
    const mainRep = createReplacement(key, value, fieldType, metadata, settings);
    if (mainRep) {
        results.push(mainRep);

        const firstValue = Array.isArray(mainRep.value) ? mainRep.value[0] : mainRep.value;
        const representativeValue = (firstValue && typeof firstValue === 'object') ? firstValue.value : firstValue;

        if (representativeValue && (fieldType === 'number' || fieldType === 'currency')) {
             const numberFormat = settings?.numberFormat || {};
             const cleanNumberResult = unformatNumber(String(representativeValue), numberFormat);
             if (cleanNumberResult && !isNaN(cleanNumberResult)) {
                const cleanNumber = Number(cleanNumberResult);
                const textValue = DocSo(cleanNumber);
                const textRep = createReplacement(key + '_bang_chu', textValue, 'text', metadata, settings);
                if (textRep) results.push(textRep);
             }
        }
    }
    return results;
}

/**
 * 🔧 v2.2.6: Tính SUM cho các subfield có sumEnabled = true
 * Trả về object chứa các sum values để thêm vào inputData
 */
function calculateSumFields(inputData, fields, numberFormat) {
    const sumValues = {};
    if (!Array.isArray(fields) || !inputData) return sumValues;
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        const listData = inputData[field.id];
        if (!Array.isArray(listData) || listData.length === 0) continue;
        
        for (const subField of field.subFields) {
            // Hỗ trợ cả number và calc (công thức)
            const isNumericType = subField.type === 'number' || 
                                  (subField.formula && subField.formula.startsWith('calc('));
            if (!isNumericType || !subField.sumEnabled) continue;
            
            // Tính tổng
            let sum = 0;
            for (const item of listData) {
                const value = item[subField.id];
                if (typeof value === 'number') {
                    sum += value;
                } else if (typeof value === 'string') {
                    const parsed = unformatNumber(value, numberFormat);
                    if (parsed !== null && !isNaN(parsed)) {
                        sum += Number(parsed);
                    }
                }
            }
            
            // Tạo key tổng
            const sumKey = `sum_${subField.id}`;
            sumValues[sumKey] = sum;
            sumValues[`${sumKey}_bang_chu`] = DocSo(sum);
        }
    }
    
    return sumValues;
}

/**
 * 🔧 v2.2.6: Cleanup orphan keys trong list data
 * Loại bỏ tất cả keys trong list items mà không được định nghĩa trong subFields config
 */
function cleanupOrphanListData(inputData, fields) {
    if (!inputData || !Array.isArray(fields)) return inputData;
    
    const cleanedData = { ...inputData };
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        const listData = cleanedData[field.id];
        if (!Array.isArray(listData) || listData.length === 0) continue;
        
        // Lấy danh sách valid subField IDs
        const validSubFieldIds = new Set(field.subFields.map(sf => sf.id));
        // Thêm _id vì đây là key hệ thống
        validSubFieldIds.add('_id');
        
        // Cleanup từng item
        cleanedData[field.id] = listData.map(item => {
            if (!item || typeof item !== 'object') return item;
            
            const cleanedItem = {};
            for (const [key, value] of Object.entries(item)) {
                if (validSubFieldIds.has(key)) {
                    cleanedItem[key] = value;
                }
            }
            return cleanedItem;
        });
    }
    
    return cleanedData;
}

const prepareDataForReverse = (inputData, linkedFieldConfig, settings = {}, fields = [], sendProgress = null) => {
    const flatReplacements = [];
    const blockCandidates = new Map();
    const globalIgnoredChars = (linkedFieldConfig?.ignoredChars || []).join('');
    const numberFormat = settings?.numberFormat || {};
    const decimalPlaces = numberFormat.decimalPlaces ?? 3;

    // 🔧 v2.2.6: Cleanup orphan keys trong list data TRƯỚC KHI xử lý
    inputData = cleanupOrphanListData(inputData, fields);

    // 🔧 v2.2.6: Tính sum fields và merge vào inputData để các công thức có thể tham chiếu
    const sumValues = calculateSumFields(inputData, fields, numberFormat);
    // Reassign để tất cả code bên dưới dùng data đã có sum
    inputData = { ...inputData, ...sumValues };

    const fieldTypeMap = new Map();
    const buildTypeMap = (fieldList, parentId = null) => {
        if (!fieldList) return;
        for (const field of fieldList) {
            // Nếu có parentId, tạo key dạng "parent.child"
            const fullKey = parentId ? `${parentId}.${field.id}` : field.id;
            fieldTypeMap.set(fullKey, field.type);
            if (field.subFields) buildTypeMap(field.subFields, field.id);
        }
    }
    buildTypeMap(fields);
    
    // 🔍 DEBUG: Log fieldTypeMap
    // Debug log removed

    const contextMap = new Map();
    const allSourceKeys = new Set();
    const standaloneAllowList = new Set();

    if (linkedFieldConfig && Array.isArray(linkedFieldConfig.groups)) {
        linkedFieldConfig.groups.forEach(group => {
            const fieldItems = group.sequence.filter(item => item.type === 'field');
            if (fieldItems.length === 0) return;
            const simpleSourceKeys = fieldItems.map(item => {
                const key = item.id.split('.').pop();
                allSourceKeys.add(key);
                if (item.allowStandaloneReverse) {
                    standaloneAllowList.add(key);
                }
                return key;
            });
            contextMap.set(group.id, { isLinkedField: true, sequence: group.sequence, separator: group.ignoredChars || ' ', sourceKeys: simpleSourceKeys });
        });
    }

    const protectedValues = new Set();

    const createFormattedSourceValues = (rawValues, sourceKeys, parentKey) => {
        return rawValues.map((val, i) => {
            const subFieldKey = parentKey ? parentKey + '.' + sourceKeys[i] : sourceKeys[i];
            const fieldType = fieldTypeMap.get(subFieldKey) || 'text';
            const isNumeric = fieldType === 'number' || fieldType === 'currency' || String(sourceKeys[i]).startsWith('calc(');

            let formattedVal;

            if (isNumeric) {
                const numericVal = Number(val);
                if (!isNaN(numericVal)) {
                    // 🔧 FIX: Tạo CẢ HAI phiên bản - có decimal và làm tròn
                    // Document có thể hiển thị "101.413.698,63" hoặc "101.413.699" tùy cấu hình
                    
                    // Phiên bản với decimal (theo decimalPlaces setting)
                    const withDecimals = numericVal.toFixed(decimalPlaces);
                    formattedVal = formatNumberStandard(withDecimals, { locale: numberFormat.locale || 'vi-VN' });
                    protectedValues.add(formattedVal);
                    
                    // 🆕 Phiên bản làm tròn số nguyên
                    const roundedInt = Math.round(numericVal);
                    const roundedStr = String(roundedInt);
                    protectedValues.add(roundedStr);
                    
                    // Return phiên bản decimal để dùng trong linked field matching
                    return formattedVal;
                } else {
                    formattedVal = String(val);
                }
            } else {
                formattedVal = String(val);
            }

            protectedValues.add(formattedVal);
            return formattedVal;
        });
    };

    // --- STEP 1: Process LINKED fields ---
    // 1a. For Blocks (Arrays of objects)
    for (const key in inputData) {
        if (!Array.isArray(inputData[key])) continue;
        const arrayData = inputData[key];
         arrayData.forEach((itemData, index) => {
            for (const [generatedId, metadata] of contextMap.entries()) {
                if (metadata.sourceKeys.every(sk => itemData.hasOwnProperty(sk))) {
                    const rawSourceValues = metadata.sourceKeys.map(sk => itemData[sk]);
                    const formattedSourceValues = createFormattedSourceValues(rawSourceValues, metadata.sourceKeys, key);
                    const rep = createReplacement(key + '_' + index + '_' + generatedId, '', 'text', { ...metadata, sourceValues: formattedSourceValues }, settings);
                    if (rep) {
                        if (!blockCandidates.has(key)) blockCandidates.set(key, { id: key, replacements: [] });
                        blockCandidates.get(key).replacements.push(rep);
                    }
                }
            }
        });
    }

    // 1b. For Standalone (Root-level objects)
     for (const [generatedId, metadata] of contextMap.entries()) {
        const allKeysPresent = metadata.sourceKeys.every(sk => inputData.hasOwnProperty(sk) && !Array.isArray(inputData[sk]));
        if (allKeysPresent) {
            const rawSourceValues = metadata.sourceKeys.map(sk => inputData[sk]);
            const formattedSourceValues = createFormattedSourceValues(rawSourceValues, metadata.sourceKeys, null);
            const rep = createReplacement(generatedId, '', 'text', { ...metadata, sourceValues: formattedSourceValues }, settings);
            if(rep) flatReplacements.push(rep);
        }
    }

    // --- STEP 2: Process SIMPLE fields (The rest)
    for (const key in inputData) {
        const value = inputData[key];
        const fieldType = fieldTypeMap.get(key) || 'text';

        if (Array.isArray(value)) {
             const arrayData = inputData[key];
             arrayData.forEach((itemData, index) => {
                 for (const [itemKey, itemValue] of Object.entries(itemData)) {
                    // 🔧 FIX v2.2.3: Nếu field nằm trong linked field config (allSourceKeys),
                    // KHÔNG tạo simple replacement - linked field sẽ xử lý nó
                    // Chỉ exception nếu user đặc cách qua standaloneAllowList
                    if (allSourceKeys.has(itemKey) && !standaloneAllowList.has(itemKey)) {
                        continue;
                    }
                    
                    const subFieldType = fieldTypeMap.get(key + '.' + itemKey) || 'text';
                    const valueStr = String(itemValue);
                    const numericResult = unformatNumber(valueStr, numberFormat);
                    let roundedStr = '';
                    // FIX: Cho phép số 0
                    if (numericResult !== null && numericResult !== undefined && !isNaN(numericResult)) {
                        roundedStr = Number(numericResult).toFixed(decimalPlaces);
                    }

                    let isProtected = protectedValues.has(valueStr);
                    if (roundedStr) {
                       isProtected = isProtected || protectedValues.has(formatNumberStandard(roundedStr, {locale: 'vi-VN'})) || protectedValues.has(formatNumberStandard(roundedStr, {locale: 'en-US'}));
                    }

                    // 🔍 DEBUG: Log nếu bị skip do isProtected
                    if (isProtected && !standaloneAllowList.has(itemKey)) {
                        continue;
                    }

                    const reps = generateSimpleReplacementsForKey(key + '_' + index + '_' + itemKey, itemValue, subFieldType, { globalIgnoredChars }, settings);
                    
                    if (reps.length > 0) {
                        if (!blockCandidates.has(key)) blockCandidates.set(key, { id: key, replacements: [] });
                        blockCandidates.get(key).replacements.push(...reps);
                    }
                 }
             });
        } else {
            // Retain the core GATEKEEPER logic to prevent conflicts.
            if (contextMap.has(key)) {
                continue;
            }

            if (allSourceKeys.has(key) && !standaloneAllowList.has(key)) {
                continue;
            }
            
            const valueStr = String(value);
            const numericResult = unformatNumber(valueStr, numberFormat);
            let roundedStr = '';
            // FIX: Cho phép số 0
            if (numericResult !== null && numericResult !== undefined && !isNaN(numericResult)) {
                roundedStr = Number(numericResult).toFixed(decimalPlaces);
            }

            let isProtected = protectedValues.has(valueStr);
            if (roundedStr) {
               isProtected = isProtected || protectedValues.has(formatNumberStandard(roundedStr, {locale: 'vi-VN'})) || protectedValues.has(formatNumberStandard(roundedStr, {locale: 'en-US'}));
            }

            if (isProtected && !standaloneAllowList.has(key)) {
                continue;
            }

            flatReplacements.push(...generateSimpleReplacementsForKey(key, value, fieldType, { globalIgnoredChars }, settings));
        }
    }

    // Debug logs removed

    return { flatReplacements, blockCandidates };
};

module.exports = { prepareDataForReverse };
