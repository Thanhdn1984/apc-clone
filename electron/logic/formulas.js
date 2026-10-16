// electron/logic/formulas.js
const expressions = require('angular-expressions');
const { DocSo } = require('./shared-utils.js');

class FormulaModule {
    // FINAL: Accept 'fields' to be aware of field types
    constructor(scope, numberFormat, fields) {
        this.name = "FormulaModule";
        this.scope = scope; // Raw data scope
        this.numberFormat = numberFormat || { decimalPlaces: 2, locale: 'vi-VN' };
        
        this.fieldTypeMap = new Map();
        if (fields) {
            const buildMap = (fieldList) => {
                if (!Array.isArray(fieldList)) return;
                fieldList.forEach(field => {
                    this.fieldTypeMap.set(field.id, field.type);
                    if (field.subFields) buildMap(field.subFields);
                });
            }
            buildMap(fields);
        }
    }

    parse(tag) {
        const trimmedTag = tag.trim();
        if (trimmedTag.startsWith("=")) {
            let expression = trimmedTag.substring(1);
            let isCalc = false;
            const calcMatch = /calc\((.*)\)/.exec(expression);
            if (calcMatch && calcMatch[1]) {
                expression = calcMatch[1];
                isCalc = true;
            }
            return { type: "expression", value: expression, fromCalc: isCalc };
        }
        if (trimmedTag.startsWith("docso(") && trimmedTag.endsWith(")")) {
            return { type: "docso", value: trimmedTag.substring(6, trimmedTag.length - 1) };
        }
        return null;
    }

    render(part, { scope: proxyScope }) {
        if (part.type === "expression") {
            try {
                let result = expressions.compile(part.value)(this.scope);

                // FINAL-FIX: Check if the source field is actually a number type.
                const isCalculation = /[-+*/]/.test(part.value) || part.fromCalc;
                const fieldType = this.fieldTypeMap.get(part.value.trim());

                // Only proceed with number formatting if it's a calculation or a numeric field type
                if (isCalculation || fieldType === 'number' || fieldType === 'currency') {
                    if (typeof result === 'string') {
                        const { thousand, decimal } = this.numberFormat;
                        const cleanedValue = result.replace(new RegExp(`\\${thousand || ','}`, 'g'), '').replace(decimal || '.', '.');
                        if (!isNaN(cleanedValue) && cleanedValue.trim() !== '') {
                            result = parseFloat(cleanedValue);
                        }
                    }
                    
                    if (typeof result === 'number' && isFinite(result)) {
                        const locale = this.numberFormat.locale || 'vi-VN';
                        const decimalPlaces = this.numberFormat.decimalPlaces ?? 2;
                        return {
                            value: new Intl.NumberFormat(locale, {
                                useGrouping: true,
                                maximumFractionDigits: decimalPlaces,
                            }).format(result)
                        };
                    }
                }

                // If none of the above, return the raw value (handles CCCD, phone numbers etc.)
                return { value: result };

            } catch (error) {
                return { value: "" };
            }
        }

        if (part.type === "docso") {
            try {
                const value = expressions.compile(part.value)(this.scope);
                // 🔧 FIX v2.2.2: Xử lý số âm đúng
                // Regex /[^0-9.-]/ để giữ dấu "-" và dấu "."
                const number = parseFloat(String(value || '').replace(/[^0-9.\-]/g, ""));
                if (isNaN(number) || number === 0) return { value: 'Không đồng' };
                return { value: DocSo(number) };
            } catch (error) {
                return { value: '[Lỗi đọc số]' };
            }
        }
        return null;
    }
}

module.exports = { FormulaModule };
