
import { evaluateCalc, DocSo, DateSub, unformatNumber, formatNumber } from './utils.js';

// =========================================================================================
// ==    V35.0 - THE DETOX                                                                ==
// ==    Mệnh lệnh: Giải độc hệ thống. Phân biệt rạch ròi number và string.               ==
// =========================================================================================
const FORMULA_REGEX = {
    CALC: /^calc\((.+)\)$/,
    DOCSO: /^docso\((.+)\)$/,
    DATESUB: /^datesub\(([^,]+),([^)]+)\)$/
};

/**
 * 🔧 v2.2.6: Tính SUM cho các subfield có sumEnabled = true
 * Tạo sum_xxx và sum_xxx_bang_chu trong dataContext
 */
function addSumFieldsToContext(dataContext, fields) {
    if (!Array.isArray(fields) || !dataContext) return;
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        const listData = dataContext[field.id];
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
                    const parsed = parseFloat(unformatNumber(value));
                    if (!isNaN(parsed)) {
                        sum += parsed;
                    }
                }
            }
            
            // Tạo key tổng
            const sumKey = `sum_${subField.id}`;
            dataContext[sumKey] = sum;
            dataContext[`${sumKey}_bang_chu`] = DocSo(sum);
        }
    }
}

/**
 * 🔧 v2.2.6: Flatten dữ liệu list để công thức có thể tham chiếu
 * Ví dụ: so_tiet_kiem[0].gia_tri → so_tiet_kiem_0_gia_tri
 * Giúp công thức bình thường có thể dùng docso(so_tiet_kiem_0_gia_tri)
 */
function flattenListDataToContext(dataContext, fields) {
    if (!Array.isArray(fields) || !dataContext) {
        return;
    }
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        const listData = dataContext[field.id];
        if (!Array.isArray(listData)) {
            continue;
        }
        
        // 🔧 v2.2.6: Chỉ flatten những subField được định nghĩa trong config
        const validSubFieldIds = new Set(field.subFields.map(sf => sf.id));
        
        listData.forEach((item, index) => {
            if (!item || typeof item !== 'object') return;
            
            for (const [subKey, subValue] of Object.entries(item)) {
                // 🔧 v2.2.6: Chỉ flatten nếu subKey nằm trong danh sách subFields
                // Bỏ qua các key tạm như _id, hoặc data rác không được định nghĩa
                if (!validSubFieldIds.has(subKey)) {
                    continue;
                }
                
                // Tạo key flattened: listId_index_subFieldId
                const flattenedKey = `${field.id}_${index}_${subKey}`;
                dataContext[flattenedKey] = subValue;
            }
        });
    }
}

const calculateField = (field, dataContext, globalDecimalPlaces) => {
    if (!field.formula) return dataContext[field.id];

    const formula = field.formula.trim();
    
    // 🔧 v2.2.6: Helper để tìm giá trị - hỗ trợ cả top-level và subfield
    const getValueFromContext = (fieldId) => {
        // 1. Tìm trực tiếp trong context
        if (dataContext.hasOwnProperty(fieldId)) {
            return dataContext[fieldId];
        }
        
        // 2. Nếu không tìm thấy, thử tìm trong flattened data với _0_ (item đầu tiên)
        // Tìm tất cả keys dạng xxx_0_fieldId
        for (const key of Object.keys(dataContext)) {
            if (key.endsWith(`_0_${fieldId}`)) {
                return dataContext[key];
            }
        }
        
        return undefined;
    };
    
    let result;
    let formulaMatched = false;

    const calcMatch = formula.match(FORMULA_REGEX.CALC);
    if (calcMatch) {
        formulaMatched = true;
        // `evaluateCalc` sẽ được giải độc ở bước tiếp theo.
        const value = evaluateCalc(formula, dataContext);
        result = (value === null || value === undefined) ? 0 : value;
    }

    const docsoMatch = formula.match(FORMULA_REGEX.DOCSO);
    if (docsoMatch) {
        formulaMatched = true;
        const sourceFieldId = docsoMatch[1].trim();
        const rawValue = getValueFromContext(sourceFieldId);
        


        if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
            result = '';
        } else {
            let cleanNumber;

            // LOGIC GIẢI ĐỘC: Chỉ dùng unformatNumber cho string.
            if (typeof rawValue === 'number') {
                cleanNumber = rawValue; // Dùng trực tiếp nếu đã là số.
            } else {
                cleanNumber = parseFloat(unformatNumber(rawValue)); // Chỉ "phiên dịch" nếu là chuỗi.
            }
            


            if (isNaN(cleanNumber)) {
                result = '';
            } else {
                // Extract decimalPlaces từ object nếu cần
                let decimalPlacesValue;
                if (typeof globalDecimalPlaces === 'object' && globalDecimalPlaces !== null) {
                    decimalPlacesValue = globalDecimalPlaces.decimalPlaces;
                } else {
                    decimalPlacesValue = globalDecimalPlaces;
                }
                
                // Ưu tiên decimalPlaces từ field, nếu không có thì dùng global
                const finalDecimalPlaces = field.numberFormat?.decimalPlaces ?? decimalPlacesValue;
                
                // Nếu có decimalPlaces, format → unformat để lấy số được làm tròn đúng
                let finalNumber = cleanNumber;
                if (finalDecimalPlaces !== undefined && finalDecimalPlaces !== null && finalDecimalPlaces >= 0) {

                    const formattedStr = formatNumber(cleanNumber, { decimalPlaces: finalDecimalPlaces });

                    finalNumber = parseFloat(unformatNumber(formattedStr));

                }
                
                result = DocSo(finalNumber, finalDecimalPlaces);

            }
        }
    }

    const datesubMatch = formula.match(FORMULA_REGEX.DATESUB);
    if (datesubMatch) {
        formulaMatched = true;
        const date1FieldId = datesubMatch[1].trim();
        const date2FieldId = datesubMatch[2].trim();
        
        const date1 = getValueFromContext(date1FieldId);
        const date2 = getValueFromContext(date2FieldId);

        if (date1 === undefined || date2 === undefined) {
            return undefined; // Let it re-evaluate
        }
        
        const subResult = DateSub(date2, date1);
        result = (subResult === null) ? 0 : subResult;
    }

    if (formulaMatched) {
        return result;
    }

    return dataContext[field.id]; 
}

/**
 * 🔧 v2.2.6: Cleanup orphan keys trong list data
 * Loại bỏ tất cả keys trong list items mà không được định nghĩa trong subFields config
 */
function cleanupOrphanListData(data, fields) {
    if (!data || !Array.isArray(fields)) return data;
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        const listData = data[field.id];
        if (!Array.isArray(listData) || listData.length === 0) continue;
        
        // Lấy danh sách valid subField IDs
        const validSubFieldIds = new Set(field.subFields.map(sf => sf.id));
        // Thêm _id vì đây là key hệ thống
        validSubFieldIds.add('_id');
        
        // Cleanup từng item
        data[field.id] = listData.map(item => {
            if (!item || typeof item !== 'object') return item;
            
            const cleanedItem = {};
            let hasOrphans = false;
            for (const [key, value] of Object.entries(item)) {
                if (validSubFieldIds.has(key)) {
                    cleanedItem[key] = value;
                } else {
                    hasOrphans = true;
                }
            }
            return cleanedItem;
        });
    }
    
    return data;
}

export const evaluateAllFormulas = (data, fields, globalDecimalPlaces) => {
    try {
        if (!data || typeof data !== 'object') {
            console.warn('[FORMULA ENGINE] Invalid data:', typeof data);
            return data || {};
        }
        if (!Array.isArray(fields)) {
            console.warn('[FORMULA ENGINE] Invalid fields:', typeof fields);
            return data;
        }
        
        const MAX_ITERATIONS = (fields.length * 2) + 10;
        let iterations = 0;
        let hasChanged = true;
        // 🔧 v2.2.6: Deep copy để cleanup không ảnh hưởng data gốc
        let evaluatedData = JSON.parse(JSON.stringify(data));

        // 🔧 v2.2.6: Cleanup orphan keys trong list data TRƯỚC
        cleanupOrphanListData(evaluatedData, fields);

        // 🔧 v2.2.6: Flatten list data TRƯỚC để công thức có thể tham chiếu listId_index_subFieldId
        flattenListDataToContext(evaluatedData, fields);
        
        // 🔧 v2.2.6: Tính SUM để formula có thể tham chiếu sum_xxx
        addSumFieldsToContext(evaluatedData, fields);

        const allFieldsFlat = fields.flatMap(f => f?.type === 'list' ? [f, ...(f.subFields || [])] : [f]).filter(Boolean);
        const formulaFields = allFieldsFlat.filter(f => f && f.formula);

        while (hasChanged && iterations < MAX_ITERATIONS) {
            hasChanged = false;
            iterations++;

            const processFields = (fieldList, context) => {
                fieldList.forEach(field => {
                    try {
                        const oldValue = context[field?.id];
                        const newValue = calculateField(field, context, globalDecimalPlaces);

                        if (newValue !== undefined && oldValue !== newValue) {
                            context[field.id] = newValue;
                            hasChanged = true;
                        }
                    } catch (error) {
                        console.error(`[FORMULA ENGINE] Error calculating field ${field?.id}:`, error);
                    }
                });
            };

        const topLevelFormulaFields = formulaFields.filter(f => !f.parentId || f.parentId === '__ROOT__');
        processFields(topLevelFormulaFields, evaluatedData);

        const listFields = fields.filter(f => f.type === 'list' && f.subFields?.length > 0);
        listFields.forEach(listField => {
            const listData = evaluatedData[listField.id];
            if (!Array.isArray(listData)) return;

            const subFormulaFields = listField.subFields.filter(sf => sf && sf.formula);
            if (subFormulaFields.length === 0) return;

            const updatedListData = listData.map((item) => {
                let evaluatedItem = { ...item };
                let itemHasChanged = false;

                subFormulaFields.forEach(subField => {
                    const oldSubValue = evaluatedItem[subField.id];
                    const mergedContext = { ...evaluatedData, ...evaluatedItem };
                    const newSubValue = calculateField(subField, mergedContext);
                    
                    if (newSubValue !== undefined && oldSubValue !== newSubValue) {
                        evaluatedItem[subField.id] = newSubValue;
                        itemHasChanged = true; 
                    }
                });

                if(itemHasChanged) hasChanged = true;
                return evaluatedItem;
            });
            
            if (JSON.stringify(evaluatedData[listField.id]) !== JSON.stringify(updatedListData)) {
                 evaluatedData[listField.id] = updatedListData;
            }
        });
    }

        if (iterations >= MAX_ITERATIONS) {
            // Tìm field nào đang bị vòng lặp để báo cáo cụ thể
            const loopingField = formulaFields.find(f => {
                const v1 = evaluatedData[f.id];
                const v2 = calculateField(f, evaluatedData, globalDecimalPlaces);
                return v2 !== undefined && v1 !== v2;
            });
            const fieldInfo = loopingField ? ` Kiểm tra field: "${loopingField.id}" (formula: ${loopingField.formula})` : '';
            throw new Error(`[FORMULA ENGINE] Phát hiện vòng lặp công thức vô hạn (circular dependency).${fieldInfo} Vui lòng kiểm tra lại các công thức tham chiếu nhau.`);
        }

        return evaluatedData;
    } catch (error) {
        console.error('[FORMULA ENGINE] Fatal error during formula evaluation:', error);
        // Trả về data gốc để tránh dữ liệu bị hỏng
        const result = data || {};
        result._formulaEngineError = error.message;
        return result;
    }
};

/**
 * 🔧 v2.2.6: Tạo virtual fields cho SUM để hiển thị trong UI
 * Trả về array các field objects cho sum values
 * @param {Array} fields - Danh sách fields cấu hình
 * @returns {Array} - Các virtual sum field definitions
 */
export const generateSumFields = (fields) => {
    const sumFields = [];
    if (!Array.isArray(fields)) return sumFields;
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        for (const subField of field.subFields) {
            const isNumericType = subField.type === 'number' || 
                                  (subField.formula && subField.formula.startsWith('calc('));
            if (!isNumericType || !subField.sumEnabled) continue;
            
            const sumKey = `sum_${subField.id}`;
            
            // Tạo virtual field cho sum
            sumFields.push({
                id: sumKey,
                name: `Tổng ${subField.name || subField.id}`,
                type: 'number',
                readOnly: true,
                isVirtualSumField: true, // Đánh dấu để UI biết đây là field tự động
                sourceListId: field.id,
                sourceSubFieldId: subField.id,
                group: field.group, // Cùng group với list field cha
            });
            
            // Tạo virtual field cho sum bằng chữ
            sumFields.push({
                id: `${sumKey}_bang_chu`,
                name: `Tổng ${subField.name || subField.id} (bằng chữ)`,
                type: 'text',
                readOnly: true,
                isVirtualSumField: true,
                sourceListId: field.id,
                sourceSubFieldId: subField.id,
                group: field.group,
            });
        }
    }
    
    return sumFields;
};
