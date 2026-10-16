
// electron/logic/generate.js
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { FormulaModule } = require('./formulas.js');
const { DocSo } = require('./shared-utils.js');
const { addLegacyPlaceholderAliases } = require('./legacy-placeholder-aliases.js');



const outputDir = path.join(app.getPath('documents'), 'DocxAutomatorOutput');

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

function parseAsNumber(value, numberFormat) {
    try {
        if (typeof value !== 'string') return value;
        const { thousand, decimal } = numberFormat || {};
        const thousandSeparatorRegex = new RegExp(`\\${thousand || ','}`, 'g');
        const cleanedValue = value.replace(thousandSeparatorRegex, '').replace(decimal || '.', '.');
        // #14: parseFloat xử lý đúng số âm (-1000) và số 0
        if (cleanedValue.trim() !== '' && !isNaN(cleanedValue)) {
            return parseFloat(cleanedValue);
        }
        return value;
    } catch (error) {
        console.error('[GENERATE] Error parsing number:', error.message, 'Value:', value);
        return value;
    }
}

/**
 * 🔧 v2.2.6: Tự động tính tổng cho các trường con có sumEnabled = true
 * @param {Object} scope - Scope data đã parse
 * @param {Array} fields - Danh sách fields cấu hình
 * @param {Object} numberFormat - Cấu hình số
 */
function addSumFieldsToScope(scope, fields, numberFormat) {
    if (!Array.isArray(fields) || !scope) return;
    
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        
        const listData = scope[field.id];
        if (!Array.isArray(listData) || listData.length === 0) continue;
        
        // Tìm các subfield có sumEnabled (hỗ trợ cả number và calc/formula)
        for (const subField of field.subFields) {
            // 🔧 v2.2.6: Hỗ trợ tính tổng cho cả number và calc (công thức)
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
                    const parsed = parseAsNumber(value, numberFormat);
                    if (typeof parsed === 'number') {
                        sum += parsed;
                    }
                }
            }
            
            // Tạo key tổng
            const sumKey = `sum_${subField.id}`;
            scope[sumKey] = sum;
            
            // Tự động tạo bằng chữ
            scope[`${sumKey}_bang_chu`] = DocSo(sum);
        }
    }
}


function filterListItemsForPrint(data, fields) {
    if (!data || typeof data !== 'object' || !Array.isArray(fields)) return data;
    for (const field of fields) {
        if (field.type !== 'list' || !Array.isArray(field.subFields)) continue;
        const printFlag = field.subFields.find(sf => sf && sf.type === 'boolean' && /^in_/.test(sf.id));
        if (!printFlag || !Array.isArray(data[field.id])) continue;
        data[field.id] = data[field.id].filter(item => item?.[printFlag.id] === true || item?.[printFlag.id] === 'true' || item?.[printFlag.id] === undefined);
    }
    return data;
}

function prepareScope(data, allFields, numberFormat) {
    try {
        if (!data || typeof data !== 'object') {
            console.warn('[GENERATE] Invalid data provided to prepareScope:', typeof data);
            return {};
        }
        
        // 🔧 v2.2.6: Cleanup orphan keys trong list data TRƯỚC KHI xử lý
        cleanupOrphanListData(data, allFields);
        filterListItemsForPrint(data, allFields);
        
        const fieldTypeMap = new Map();
        function buildMap(fields) {
            if (!Array.isArray(fields)) return;
            fields.forEach(field => {
                fieldTypeMap.set(field?.id, field?.type);
                if (field?.subFields) buildMap(field.subFields);
            });
        }
        buildMap(allFields);

    function recurseAndPrepare(currentData) {
        if (typeof currentData !== 'object' || currentData === null) return currentData;
        if (Array.isArray(currentData)) return currentData.map(item => recurseAndPrepare(item));
        
        const result = {};
        for (const key in currentData) {
            if (!Object.prototype.hasOwnProperty.call(currentData, key)) continue;
            const value = currentData[key];
            if (typeof value === 'object' && value !== null) {
                result[key] = recurseAndPrepare(value);
            } else {
                if (fieldTypeMap.get(key) === 'number' || fieldTypeMap.get(key) === 'currency') {
                    result[key] = parseAsNumber(value, numberFormat);
                } else {
                    result[key] = value;
                }
            }
        }
        return result;
    }
    
    const rawScope = recurseAndPrepare(data);

    for (const key in rawScope) {
        if (Array.isArray(rawScope[key])) {
            const listName = key;
            const listItems = rawScope[key];
            listItems.forEach((item, index) => {
                for (const subKey in item) {
                    if (Object.prototype.hasOwnProperty.call(item, subKey)) {
                        const flattenedKey = `${listName}_${index}_${subKey}`;
                        if (!rawScope.hasOwnProperty(flattenedKey)) {
                           rawScope[flattenedKey] = item[subKey];
                        }
                    }
                }
            });
        }
    }

    // 🔧 v2.2.6: Tính tổng cho các trường con có sumEnabled = true
    addSumFieldsToScope(rawScope, allFields, numberFormat);

    addBangChuToScope(rawScope);
    addUppercaseToScope(rawScope);
    addLegacyPlaceholderAliases(rawScope);
    addBangChuToScope(rawScope);
    addUppercaseToScope(rawScope);
    return rawScope;
    } catch (error) {
        console.error('[GENERATE] Error in prepareScope:', error.message);
        return data || {};
    }
}

function addBangChuToScope(scope) {
    if (typeof scope !== 'object' || scope === null) return;
    const keys = Object.keys(scope);
    for (const key of keys) {
        const value = scope[key];
        if (typeof value === 'object' && value !== null) {
            addBangChuToScope(value);
        } else if (typeof value === 'number') {
            if (!scope.hasOwnProperty(`${key}_bang_chu`)) {
                scope[`${key}_bang_chu`] = DocSo(value);
            }
        }
    }
}

function addUppercaseToScope(scope) {
    if (typeof scope !== 'object' || scope === null) return;
    const keys = Object.keys(scope);
    for (const key of keys) {
        const value = scope[key];
        if (typeof value === 'object' && value !== null) {
            addUppercaseToScope(value);
        } else if (typeof value === 'string' && !key.endsWith('_in_hoa')) {
            const upperKey = `${key}_in_hoa`;
            if (!scope.hasOwnProperty(upperKey)) {
                scope[upperKey] = value.toLocaleUpperCase('vi-VN');
            }
        }
    }
}

function getFormattedScopeForRender(originalScope, allFields, numberFormat, dateFormat) {
    const fieldTypeMap = new Map();
    function buildMap(fields) {
        if (!Array.isArray(fields)) return;
        fields.forEach(field => {
            fieldTypeMap.set(field.id, field.type);
            if (field.subFields) buildMap(field.subFields);
        });
    }
    buildMap(allFields);

    const formatted = JSON.parse(JSON.stringify(originalScope));
    function recurseAndFormat(obj) {
        for (const key in obj) {
            if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
            let value = obj[key];
            
            // 🔧 FIX v2.2.2: Kiểm tra giá trị trống TRƯỚC khi thay thế vào template
            // Nếu trường bỏ trống, để nó rỗng nhưng không thay thế placeholder
            if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                obj[key] = "";
                continue;
            }
            
            if (typeof value === 'object') {
                recurseAndFormat(value);
                continue;
            }

            const fieldType = fieldTypeMap.get(key);
            if (fieldType === 'number' || fieldType === 'currency') {
                if (typeof value === 'string') {
                     const numericVal = parseAsNumber(value, numberFormat);
                     if(typeof numericVal === 'number') value = numericVal;
                }
                if (typeof value === 'number') {
                    try {
                        const { locale, decimalPlaces } = numberFormat;
                        // 🔧 FIX v2.2.2: Xử lý số âm và số thập phân đúng
                        // Giữ nguyên dấu âm, không xóa
                        const formatted = new Intl.NumberFormat(locale || 'vi-VN', { 
                            useGrouping: true, 
                            maximumFractionDigits: decimalPlaces ?? 2 
                        }).format(value);
                        obj[key] = formatted;
                    } catch { /* keep raw value */ }
                }
            } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
                 try {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const year = date.getFullYear();
                        obj[key] = `${day}/${month}/${year}`;
                    }
                } catch { /* keep raw value */ }
            }
        }
    }
    recurseAndFormat(formatted);
    return formatted;
}

// #9: Trích xuất tên placeholder từ XML của template
function extractPlaceholders(templatePath) {
    try {
        const content = fs.readFileSync(templatePath, 'binary');
        const zip = new PizZip(content);
        const docXml = zip.files['word/document.xml']?.asText() || '';
        const regex = /\{([^{}#/]+)\}/g;
        const placeholders = new Set();
        let match;
        while ((match = regex.exec(docXml)) !== null) {
            placeholders.add(match[1].trim());
        }
        return placeholders;
    } catch { return new Set(); }
}

function renderAndSave(template, rawScope, formattedScope, outputName, numberFormat, fields) {
    const content = fs.readFileSync(template.path, 'binary');
    const zip = new PizZip(content);

    // #9: Kiểm tra placeholder không khớp trước khi render
    const placeholders = extractPlaceholders(template.path);
    const unmatchedPlaceholders = [...placeholders].filter(p => !(p in formattedScope) && !(p in rawScope));
    if (unmatchedPlaceholders.length > 0) {
        console.warn(`[GENERATE] Template "${template.name}" có ${unmatchedPlaceholders.length} placeholder không khớp: ${unmatchedPlaceholders.slice(0, 5).join(', ')}${unmatchedPlaceholders.length > 5 ? '...' : ''}`);
    }

    const formulaModule = new FormulaModule(rawScope, numberFormat, fields);
    const doc = new Docxtemplater(zip, {
        modules: [formulaModule],
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        parser: (tag) => {
            const key = String(tag || '').trim();
            const normalizedKey = key.replace(/[\[\]{}#|]/g, '').replace(/\s+/g, '_');
            return { get: (scope) => scope?.[key] ?? scope?.[normalizedKey] ?? '' };
        },
        nullGetter: () => ""
    });

    doc.render(formattedScope);
    doc.getZip().file(/word\/.*\.xml$/).forEach((file) => {
        const text = file.asText();
        const restored = text.replace(/｛/g, '{').replace(/｝/g, '}');
        if (restored !== text) doc.getZip().file(file.name, restored);
    });

    const outputBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: "DEFLATE" });
    const finalOutputDir = path.join(outputDir, template.subfolder || '');
    if (!fs.existsSync(finalOutputDir)) fs.mkdirSync(finalOutputDir, { recursive: true });
    fs.writeFileSync(path.join(finalOutputDir, outputName), outputBuffer);

    return { unmatchedPlaceholders };
}

const executeGeneration = async (event, request) => {
    // THE FIX: Send status as an object, not a string.
    event.sender.send('generate-status', { state: 'running' });
    const { inputData, fields, templates, numberFormat, dateFormat, strategies } = request;
    
    const baseRawScope = prepareScope(inputData, fields, numberFormat);

    let successCount = 0;
    for (const template of templates) {
        const strategyInfo = strategies.find(s => s.templateId === template.id);
        const strategy = strategyInfo ? strategyInfo.strategy : { type: 'SingleBundle' };

        try {
            let listName = strategy.listName;
            if (!listName) {
                const possibleLists = Object.keys(baseRawScope).filter(k => Array.isArray(baseRawScope[k]) && baseRawScope[k].length > 0);
                if (possibleLists.length === 1) listName = possibleLists[0];
            }

            const listFieldDef = fields.find(f => f.id === listName && f.type === 'list');

            // Hàm lấy giá trị từ scope để đặt tên file
            // Format cơ bản: {prefix}_{namingValue}_{originalName}.docx
            // Với MailMerge/SingleItem: {prefix}_{namingValue}_{originalName}_{itemName}.docx
            const getOutputFileName = (scope, item, index) => {
                const ext = path.parse(template.name).ext || '.docx';
                const originalName = path.parse(template.name).name;
                // strategyInfo = { templateId, strategy, namingFieldId, customPrefix }
                const prefix = strategyInfo?.customPrefix || '';
                const namingFieldId = strategyInfo?.namingFieldId;
                
                // Tìm giá trị từ namingFieldId (global naming)
                let namingValue = '';
                if (namingFieldId && namingFieldId !== '__default__') {
                    // Thử tìm trong scope chính
                    if (scope[namingFieldId]) {
                        namingValue = scope[namingFieldId];
                    }
                    // Thử tìm trong các list item đầu tiên
                    else {
                        for (const key of Object.keys(scope)) {
                            if (Array.isArray(scope[key]) && scope[key].length > 0 && scope[key][0][namingFieldId]) {
                                namingValue = scope[key][0][namingFieldId];
                                break;
                            }
                        }
                    }
                }
                
                // Lấy tên item (CHỈ cho MailMerge/SingleItem - thêm hậu tố)
                let itemSuffix = '';
                if (item) {
                    const namingField = listFieldDef?.namingFieldId;
                    let itemName = '';
                    if (namingField && item[namingField]) {
                        itemName = item[namingField];
                    } else if (listFieldDef?.subFields?.length > 0) {
                        const firstSubFieldId = listFieldDef.subFields[0].id;
                        itemName = item[firstSubFieldId] || `muc-${index + 1}`;
                    } else {
                        itemName = `muc-${index + 1}`;
                    }
                    itemSuffix = '_' + String(itemName).replace(/[\\/:*?"<>|]/g, '-');
                }
                
                // Build tên file
                // Format: {prefix}_{namingValue}_{originalName}{itemSuffix}.docx
                let parts = [];
                if (prefix) parts.push(prefix);
                if (namingValue) parts.push(String(namingValue).replace(/[\\/:*?"<>|]/g, '-'));
                parts.push(originalName);
                
                return parts.join('_') + itemSuffix + ext;
            };

            if (strategy.type === 'MailMerge') {
                if (!listName) { continue; }
                const fullList = baseRawScope[listName] || [];
                let indicesToProcess = strategy.selectedIndices || fullList.map((_, i) => i);
                if (indicesToProcess.length === 0) { // #12
                    event.sender.send('generate-progress', { log: { type: 'error', message: `Cảnh báo: Danh sách "${listName}" rỗng — bỏ qua mẫu ${template.name}` } });
                    continue;
                }
                
                const { [listName]: _, ...cleanBaseScope } = baseRawScope;

                let progressCount = 0;
                for (const i of indicesToProcess) {
                    if (i < 0 || i >= fullList.length) continue;
                    progressCount++;
                    const item = fullList[i];
                    const itemRawScope = { ...cleanBaseScope, ...item, [listName]: [item] };
                    const itemFormattedScope = getFormattedScopeForRender(itemRawScope, fields, numberFormat, dateFormat);
                    const newName = getOutputFileName(itemRawScope, item, i);

                    const { unmatchedPlaceholders } = renderAndSave(template, itemRawScope, itemFormattedScope, newName, numberFormat, fields);
                    event.sender.send('generate-progress', { log: { type: 'info', message: `[Hàng loạt] Đã tạo file ${progressCount}/${indicesToProcess.length}: ${newName}` } });
                    if (unmatchedPlaceholders?.length > 0) event.sender.send('generate-progress', { log: { type: 'error', message: `Cảnh báo: ${unmatchedPlaceholders.length} placeholder không khớp trong ${newName}: ${unmatchedPlaceholders.slice(0,3).join(', ')}` } });
                }

            } else { 
                let rawScopeToRender = { ...baseRawScope };
                let item = null;
                let itemIndex = 0;
                
                if (strategy.type === 'SingleItem' && listName && strategy.itemIndex !== undefined) {
                    const fullList = baseRawScope[listName] || [];
                    item = fullList[strategy.itemIndex];
                    itemIndex = strategy.itemIndex;
                    if (item) {
                        const { [listName]: _, ...cleanBaseScope } = baseRawScope;
                        rawScopeToRender = { ...cleanBaseScope, ...item, [listName]: [item] };
                    }
                }
                
                const outputName = getOutputFileName(rawScopeToRender, item, itemIndex);
                const formattedScope = getFormattedScopeForRender(rawScopeToRender, fields, numberFormat, dateFormat);
                
                const { unmatchedPlaceholders: up } = renderAndSave(template, rawScopeToRender, formattedScope, outputName, numberFormat, fields);
                event.sender.send('generate-progress', { log: { type: 'success', message: `[Tổng hợp] Đã tạo: ${outputName}` } });
                if (up?.length > 0) event.sender.send('generate-progress', { log: { type: 'error', message: `Cảnh báo: ${up.length} placeholder không khớp: ${up.slice(0,3).join(', ')}` } });
            }
            successCount++;
        } catch (error) {
            console.error(`Lỗi file '${template.name}':`, error);
            event.sender.send('generate-progress', { log: { type: 'error', message: `Lỗi file ${template.name}: ${error.message}` } });
        }
    }

    // THE FIX: Send status as an object, not a string.
    event.sender.send('generate-status', { state: 'done' });
    return { success: true, message: `Hoàn tất. Đã xử lý ${successCount}/${templates.length} mẫu.` };
};


const startGeneration = async (event, request) => {
    const { inputData, templates, fields, numberFormat, dateFormat } = request;
    
    const rawInputData = prepareScope(inputData, fields, numberFormat);
    const availableLists = Object.keys(rawInputData).filter(key => Array.isArray(rawInputData[key]) && rawInputData[key].length > 0);
    
    if (availableLists.length === 0 || templates.length === 0) {
        executeGeneration(event, { ...request, inputData: rawInputData, strategies: templates.map(t => ({ templateId: t.id, strategy: { type: 'SingleBundle' } })) });
    } else {
        event.sender.send('open-generation-control-panel', { templates, availableLists, inputData: rawInputData, fields, numberFormat, dateFormat });
    }
};

module.exports = {
    startGeneration,
    executeGeneration
};
