import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Edit, Trash2, GripVertical, Plus, ArrowLeft } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { sanitizeId } from './managementUtils.js';
import { formatNumber, unformatNumber } from '../../../lib/utils.js';
import { generateSumFields } from '../../../lib/formulaEngine.js';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

const getFlattenedFields = (fields, prefix = '', parentGroup = null, validFieldIds = null) => {
    let flat = [];
    if (!fields) return flat;
    
    // Nếu là lần gọi đầu tiên, tạo set các field IDs hợp lệ
    if (validFieldIds === null) {
        validFieldIds = new Set();
        const collectIds = (fieldList) => {
            if (!fieldList) return;
            for (const f of fieldList) {
                if (!f) continue;
                validFieldIds.add(f.id);
                if (f.type === 'list' && f.subFields) {
                    collectIds(f.subFields);
                }
            }
        };
        collectIds(fields);
    }
    
    for (const field of fields) {
        if (!field) continue;
        // Kế thừa group từ parent nếu field không có group riêng
        const effectiveGroup = field.group || parentGroup;
        flat.push({ ...field, name: `${prefix}${field.name}`, _effectiveGroup: effectiveGroup, _isSubField: prefix !== '' });
        if (field.type === 'list' && field.subFields) {
            flat = flat.concat(getFlattenedFields(field.subFields, `${prefix}  ↳ `, effectiveGroup, validFieldIds));
        }
    }
    return flat;
};

// ========== GROUPED FIELD SELECT WITH SEARCH ==========
// Component hiển thị danh sách trường theo nhóm với tính năng tìm kiếm
const GroupedFieldSelect = ({ fields, fieldGroups, filterFn, value, onChange, placeholder = "-- Chọn trường --", showFieldId = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    // Tạo danh sách trường theo nhóm
    const groupedFields = useMemo(() => {
        let filteredFields = filterFn ? fields.filter(filterFn) : fields;
        
        // Lọc theo search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filteredFields = filteredFields.filter(f => 
                f.name?.toLowerCase().includes(term) || 
                f.id?.toLowerCase().includes(term)
            );
        }
        
        // Tạo map nhóm
        const groupMap = {};
        (fieldGroups || []).forEach(g => {
            groupMap[g.id] = { ...g, fields: [] };
        });
        groupMap['__ungrouped__'] = { id: '__ungrouped__', name: '📁 Chưa nhóm', fields: [] };
        groupMap['__sum__'] = { id: '__sum__', name: '📊 Tổng danh sách', fields: [] };
        
        // Phân loại trường vào các nhóm - sử dụng _effectiveGroup cho subfields
        filteredFields.forEach(field => {
            if (field.id?.startsWith('sum_')) {
                groupMap['__sum__'].fields.push(field);
            } else {
                const groupId = field._effectiveGroup || field.group;
                if (groupId && groupMap[groupId]) {
                    groupMap[groupId].fields.push(field);
                } else {
                    groupMap['__ungrouped__'].fields.push(field);
                }
            }
        });
        
        // Sắp xếp: nhóm có trường trước, Chưa nhóm & Tổng cuối cùng
        const result = [];
        (fieldGroups || []).forEach(g => {
            if (groupMap[g.id]?.fields.length > 0) {
                result.push(groupMap[g.id]);
            }
        });
        if (groupMap['__ungrouped__'].fields.length > 0) {
            result.push(groupMap['__ungrouped__']);
        }
        if (groupMap['__sum__'].fields.length > 0) {
            result.push(groupMap['__sum__']);
        }
        
        return result;
    }, [fields, fieldGroups, filterFn, searchTerm]);

    const hasGroups = groupedFields.length > 0 && groupedFields.some(g => g.fields.length > 0);
    const totalFields = groupedFields.reduce((sum, g) => sum + g.fields.length, 0);

    return (
        <Select value={value} onValueChange={onChange} onOpenChange={(open) => { setIsOpen(open); if (!open) setSearchTerm(''); }}>
            <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent className="max-h-[400px] overflow-hidden flex flex-col">
                {/* Search box - fixed at top */}
                <div className="p-2 border-b bg-white flex-shrink-0">
                    <input
                        type="text"
                        placeholder="🔍 Tìm trường..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                    {searchTerm && (
                        <p className="text-xs text-gray-500 mt-1 px-1">
                            Tìm thấy {totalFields} trường
                        </p>
                    )}
                </div>
                
                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1">
                {hasGroups ? (
                    groupedFields.map(group => (
                        <SelectGroup key={group.id}>
                            <SelectLabel className="text-xs font-bold text-white bg-gray-600 py-1.5 px-3">
                                {group.name} ({group.fields.length})
                            </SelectLabel>
                            {group.fields.map(field => (
                                <SelectItem key={field.id} value={field.id} className="pl-4">
                                    {field.name} {showFieldId && <span className="text-gray-400">({field.id})</span>}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))
                ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        {searchTerm ? 'Không tìm thấy trường phù hợp' : 'Không có trường nào'}
                    </div>
                )}
                </div>
            </SelectContent>
        </Select>
    );
};


const SortableSubFieldItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.7 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 w-full">
            <div {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-md cursor-grab touch-none">
                <GripVertical size={16} />
            </div>
            <div className="flex-grow min-w-0">{children}</div>
        </div>
    );
};


const FormulaBuilder = ({ allFields, fieldGroups, formula, onFormulaChange }) => {
    const formulaInputRef = useRef(null);
    const operators = ['+', '-', '*', '/', '(', ')'];
    
    // 🔧 v2.2.6: Bao gồm cả sum fields vào danh sách chọn
    const numericFields = useMemo(() => {
        const regularFields = (allFields || []).filter(f => f.type === 'number' || f.formula?.startsWith('calc('));
        const sumFields = generateSumFields(allFields || []).filter(f => f.type === 'number');
        return [...regularFields, ...sumFields];
    }, [allFields]);

    const insertIntoFormula = (text) => {
        if (!formulaInputRef.current) return;
        const { selectionStart, selectionEnd, value } = formulaInputRef.current;
        const newFormula = `${value.substring(0, selectionStart)}${text}${value.substring(selectionEnd)}`;
        onFormulaChange(newFormula);
        setTimeout(() => {
            formulaInputRef.current.focus();
            const newCursorPosition = selectionStart + text.length;
            formulaInputRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    };

    return (
        <div className="space-y-3 p-3 bg-gray-50 rounded-md border">
             <textarea
                id="formulaInput"
                ref={formulaInputRef}
                value={formula}
                onChange={(e) => onFormulaChange(e.target.value)}
                className="w-full p-2 border rounded font-mono text-sm bg-white shadow-inner min-h-[80px]"
                placeholder="ví dụ: (so_luong * don_gia) / 100"
            />
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="fieldSelector" className="text-xs">Chèn trường số:</Label>
                    <GroupedFieldSelect
                        fields={numericFields}
                        fieldGroups={fieldGroups}
                        value=""
                        onChange={value => { if(value) insertIntoFormula(value) }}
                        placeholder="-- Chọn trường số --"
                    />
                </div>
                <div>
                    <Label className="text-xs">Chèn toán tử:</Label>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {operators.map(op => (
                            <Button key={op} type="button" variant="outline" size="sm" onClick={() => insertIntoFormula(op)} className="font-mono w-10">{op}</Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DocsoBuilder = ({ allFields, fieldGroups, value, onChange }) => {
    // 🔧 v2.2.6: Bao gồm cả sum fields vào danh sách chọn
    const numericFields = useMemo(() => {
        const regularFields = (allFields || []).filter(f => f.type === 'number' || f.formula?.startsWith('calc('));
        const sumFields = generateSumFields(allFields || []).filter(f => f.type === 'number');
        return [...regularFields, ...sumFields];
    }, [allFields]);
    return (
        <div className="p-3 bg-gray-50 rounded-md border">
            <Label htmlFor="docsoSource">Trường số cần đọc</Label>
            <GroupedFieldSelect
                fields={numericFields}
                fieldGroups={fieldGroups}
                value={value}
                onChange={onChange}
                placeholder="-- Chọn trường số --"
                showFieldId={true}
            />
        </div>
    );
};
const DateSubBuilder = ({ allFields, fieldGroups, values, onChange }) => {
    const dateFields = useMemo(() => (allFields || []).filter(f => f.type === 'date'), [allFields]);
    return (
        <div className="p-3 bg-gray-50 rounded-md border space-y-3">
            <div className="grid grid-cols-2 gap-4 items-end">
                <div>
                    <Label>Ngày bắt đầu</Label>
                    <GroupedFieldSelect
                        fields={dateFields}
                        fieldGroups={fieldGroups}
                        value={values.date1 || ''}
                        onChange={val => onChange('date1', val)}
                        placeholder="Chọn trường ngày..."
                    />
                </div>
                <div>
                    <Label>Ngày kết thúc</Label>
                    <GroupedFieldSelect
                        fields={dateFields}
                        fieldGroups={fieldGroups}
                        value={values.date2 || ''}
                        onChange={val => onChange('date2', val)}
                        placeholder="Chọn trường ngày..."
                    />
                </div>
            </div>
            <p className="text-sm text-center text-gray-500 pt-1">Kết quả = (Ngày kết thúc) - (Ngày bắt đầu)</p>
        </div>
    );
};

const getParentOptions = (fields, currentFieldId, prefix = '') => {
    let options = [];
    if (!fields) return options;
    for (const field of fields) {
        if (!field) continue;
        if (field.id === currentFieldId) continue;
        if (field.type === 'list') {
            options.push({ value: field.id, label: `${prefix}${field.name}` });
            if (field.subFields && field.subFields.length > 0) {
                options = [...options, ...getParentOptions(field.subFields, currentFieldId, `${prefix}  ↳ `)];
            }
        }
    }
    return options;
};

const FieldEditorForm = ({ 
    fieldData, setFieldData, 
    isEditing, fields, allFieldIds, 
    fieldGroups, numberFormat, parentId: forceParentId, 
    isSubField, parentFieldType 
}) => {
    const nameInputRef = useRef(null);
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    
    const allAvailableFields = useMemo(() => getFlattenedFields(fields), [fields]);

    const { 
        name = '', id = '', group = '', parentId = '__ROOT__',
        type = 'text', defaultValue = '', formula = '',
        subFields = [], namingFieldId = '' 
    } = fieldData || {};

    const definitionMode = useMemo(() => {
        if (formula?.startsWith('calc')) return 'calc';
        if (formula?.startsWith('docso')) return 'docso';
        if (formula?.startsWith('datesub')) return 'datesub';
        return 'input';
    }, [formula]);

    const updateField = (key, value) => setFieldData(prev => ({ ...prev, [key]: value }));

    useEffect(() => {
        if (!isEditing) {
            updateField('id', sanitizeId(name));
        }
    }, [name, isEditing]);

    useEffect(() => {
        if (type !== 'number') {
            setDisplayValue(defaultValue || '');
            return;
        }
        if (!isFocused) {
            setDisplayValue(formatNumber(defaultValue, numberFormat));
        } else {
            setDisplayValue(String(defaultValue || ''));
        }
    }, [defaultValue, isFocused, type, numberFormat]);

    useEffect(() => {
        if (type === 'list' && subFields.length > 0 && !namingFieldId) {
            const firstTextField = subFields.find(sf => sf.type === 'text') || subFields[0];
            if (firstTextField) {
                updateField('namingFieldId', firstTextField.id);
            }
        }
        if (type !== 'list') {
            updateField('namingFieldId', '');
        }
    }, [type, subFields]);
    
    const parentOptions = useMemo(() => {
        const currentId = isEditing ? id : null;
        return getParentOptions(fields || [], currentId);
    }, [fields, id, isEditing]);

    const handleDefaultValueChange = (e) => {
        const inputValue = e.target.value;
        if (type === 'number') {
            setDisplayValue(inputValue);
            updateField('defaultValue', unformatNumber(inputValue, numberFormat));
        } else {
            // 🔧 v2.2.6: Cập nhật cả displayValue cho text fields
            setDisplayValue(inputValue);
            updateField('defaultValue', inputValue);
        }
    };

    const handleDefinitionModeChange = (mode) => {
        if (mode === 'input') {
            updateField('formula', undefined);
        } else {
            const currentFormula = fieldData.formula || '';
            const formulaContent = currentFormula.match(/^\w+\((.*)\)$/)?.[1] || '';
            if (mode === 'calc') updateField('formula', `calc(${formulaContent})`);
            if (mode === 'docso') updateField('formula', `docso(${formulaContent})`);
            if (mode === 'datesub') updateField('formula', `datesub(${formulaContent})`);
            updateField('type', (mode === 'docso' || mode === 'longtext') ? 'text' : 'number');
            updateField('defaultValue', undefined);
        }
    }

    const isListDisabled = parentFieldType === 'list';
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="fieldName">Tên hiển thị</Label>
                    <Input id="fieldName" ref={nameInputRef} value={name} onChange={e => updateField('name', e.target.value)} placeholder="Ví dụ: Số tiền vay" />
                </div>
                <div>
                    <Label htmlFor="fieldId">ID (Mã định danh)</Label>
                    <Input
                        id="fieldId"
                        value={id}
                        onChange={e => {
                            const raw = e.target.value;
                            // #11: Chỉ cho phép a-z, A-Z, 0-9, dấu gạch dưới
                            if (raw && !/^[a-zA-Z0-9_]*$/.test(raw)) return;
                            updateField('id', raw);
                        }}
                        placeholder="vi_du_so_tien_vay"
                        className="font-mono"
                        disabled={isEditing}
                        title="Chỉ được dùng chữ cái, số và dấu gạch dưới (_)"
                    />
                </div>
            </div>

            {!isSubField && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="fieldParent">Trường cha (Phụ thuộc vào)</Label>
                        <Select value={parentId} onValueChange={val => updateField('parentId', val)} disabled={!!forceParentId}>
                            <SelectTrigger><SelectValue placeholder="Không có (trường gốc)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__ROOT__">Không có (trường gốc)</SelectItem>
                                {parentOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="fieldGroup">Nhóm</Label>
                        <Select value={group || '__NONE__'} onValueChange={val => updateField('group', val === '__NONE__' ? '' : val)}>
                            <SelectTrigger><SelectValue placeholder="Không có nhóm"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__NONE__">Không có nhóm</SelectItem>
                                {(fieldGroups || []).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            <div className="border-t pt-4 mt-4">
                <Label className="font-semibold">Định nghĩa giá trị</Label>
                <p className="text-sm text-gray-500 mb-2">Chọn cách giá trị của trường này được xác định.</p>
                <Tabs value={definitionMode} onValueChange={handleDefinitionModeChange} className="w-full">
                    <TabsList>
                        <TabsTrigger value="input">Nhập liệu</TabsTrigger>
                        <TabsTrigger value="calc">Công thức tính toán</TabsTrigger>
                        <TabsTrigger value="docso">Công thức đọc số</TabsTrigger>
                        <TabsTrigger value="datesub">Công thức tính ngày</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="input" className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="fieldType">Loại dữ liệu</Label>
                                <Select value={type} onValueChange={val => updateField('type', val)}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Văn bản</SelectItem>
                                        <SelectItem value="longtext">Văn bản dài</SelectItem>
                                        <SelectItem value="number">Số</SelectItem>
                                        <SelectItem value="date">Ngày</SelectItem>
                                        <SelectItem value="list" disabled={isListDisabled}>Danh sách (List)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* 🔧 v2.2.6: Checkbox tính tổng cho trường con kiểu number */}
                            {isSubField && type === 'number' && (
                                <div className="flex items-center space-x-2 pt-6">
                                    <Checkbox 
                                        id="sumEnabled" 
                                        checked={fieldData.sumEnabled || false}
                                        onCheckedChange={(checked) => updateField('sumEnabled', checked)}
                                    />
                                    <Label htmlFor="sumEnabled" className="text-sm font-normal cursor-pointer">
                                        Tính tổng cột này
                                    </Label>
                                </div>
                            )}
                        </div>
                        {/* Hiển thị gợi ý khi bật tính tổng - number */}
                        {isSubField && type === 'number' && fieldData.sumEnabled && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                <p className="text-sm text-green-700">
                                    ✓ Khi tạo document, hệ thống sẽ tự động tính tổng và tạo placeholder:
                                </p>
                                <ul className="text-xs text-green-600 mt-1 ml-4 list-disc">
                                    <li><code className="bg-green-100 px-1 rounded">{`{sum_${id || 'field_id'}}`}</code> - Tổng dạng số</li>
                                    <li><code className="bg-green-100 px-1 rounded">{`{sum_${id || 'field_id'}_bang_chu}`}</code> - Tổng bằng chữ</li>
                                </ul>
                            </div>
                        )}
                         {type !== 'list' && (
                            <div className="space-y-3">
                                <div>
                                    <Label>Giá trị mặc định</Label>
                                    {type === 'longtext' ? 
                                        <Textarea value={displayValue || ''} onChange={handleDefaultValueChange} className="h-24"/> :
                                        <Input value={displayValue} onChange={handleDefaultValueChange} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} />
                                    }
                                </div>
                                
                                {/* 🔧 v2.2.6: Hướng dẫn tạo dropdown với liên kết */}
                                {type === 'text' && (
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                                        <p className="text-sm font-medium text-blue-800">💡 Tạo dropdown với trường liên kết:</p>
                                        <div className="text-xs text-blue-700 space-y-1">
                                            <p><strong>#</strong> = ngăn cách các lựa chọn</p>
                                            <p><strong>|</strong> = ngăn cách giá trị hiển thị và giá trị liên kết</p>
                                        </div>
                                        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded font-mono">
                                            <p className="font-semibold mb-1">Ví dụ:</p>
                                            <p>Nguyễn Văn A|Giám đốc|123456<span className="text-blue-800 font-bold">#</span>Trần Thị B|Phó GĐ|789012</p>
                                        </div>
                                        <p className="text-xs text-blue-600">
                                            → Hiển thị: <span className="font-medium">Nguyễn Văn A</span> hoặc <span className="font-medium">Trần Thị B</span><br/>
                                            → Liên kết: <span className="font-medium">Giám đốc</span>, <span className="font-medium">123456</span> (theo thứ tự)
                                        </p>
                                    </div>
                                )}
                                
                                {/* 🔧 v2.2.6: Linked Fields UI - chỉ hiển thị khi có nhiều lựa chọn và có | */}
                                {type === 'text' && defaultValue?.includes('#') && defaultValue?.includes('|') && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                        <Label className="text-green-800">ID các trường nhận giá trị liên kết:</Label>
                                        <Input 
                                            defaultValue={(fieldData.linkedFieldIds || []).join(', ')} 
                                            onBlur={(e) => {
                                                const ids = e.target.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
                                                updateField('linkedFieldIds', ids);
                                            }}
                                            placeholder="vd: chuc_vu, cccd"
                                            className="font-mono text-sm mt-1"
                                        />
                                        {(() => {
                                            // Parse để hiển thị preview
                                            const firstOption = defaultValue.split('#')[0];
                                            const parts = firstOption.split('|');
                                            const linkedVals = parts.slice(1);
                                            const linkedIds = fieldData.linkedFieldIds || [];
                                            if (linkedVals.length > 0 && linkedIds.length > 0) {
                                                return (
                                                    <div className="mt-2 text-xs text-green-700">
                                                        <p className="font-medium">📋 Ánh xạ (option đầu tiên):</p>
                                                        {linkedIds.map((id, i) => (
                                                            <p key={i} className="ml-2">
                                                                <code className="bg-green-100 px-1 rounded">{id}</code> ← 
                                                                <span className="font-medium">{linkedVals[i] !== undefined ? ` "${linkedVals[i]}"` : ' (thiếu giá trị)'}</span>
                                                            </p>
                                                        ))}
                                                        {linkedVals.length > linkedIds.length && (
                                                            <p className="ml-2 text-amber-600">⚠️ Còn {linkedVals.length - linkedIds.length} giá trị chưa có trường nhận</p>
                                                        )}
                                                        {linkedIds.length > linkedVals.length && (
                                                            <p className="ml-2 text-amber-600">⚠️ Còn {linkedIds.length - linkedVals.length} trường chưa có giá trị</p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>
                    
                    <TabsContent value="calc" className="space-y-4">
                        <FormulaBuilder 
                            allFields={allAvailableFields}
                            fieldGroups={fieldGroups}
                            formula={formula?.match(/^calc\((.*)\)$/)?.[1] || ''}
                            onFormulaChange={content => updateField('formula', `calc(${content})`)} 
                        />
                        {/* 🔧 v2.2.6: Checkbox tính tổng cho trường công thức */}
                        {isSubField && (
                            <div className="flex items-center space-x-2 pt-2 border-t">
                                <Checkbox 
                                    id="sumEnabledCalc" 
                                    checked={fieldData.sumEnabled || false}
                                    onCheckedChange={(checked) => updateField('sumEnabled', checked)}
                                />
                                <Label htmlFor="sumEnabledCalc" className="text-sm font-normal cursor-pointer">
                                    Tính tổng cột này
                                </Label>
                            </div>
                        )}
                        {/* Hiển thị gợi ý khi bật tính tổng - calc */}
                        {isSubField && fieldData.sumEnabled && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <p className="text-sm text-blue-700">
                                    ✓ Khi tạo document, hệ thống sẽ tự động tính tổng kết quả công thức:
                                </p>
                                <ul className="text-xs text-blue-600 mt-1 ml-4 list-disc">
                                    <li><code className="bg-blue-100 px-1 rounded">{`{sum_${id || 'field_id'}}`}</code> - Tổng dạng số</li>
                                    <li><code className="bg-blue-100 px-1 rounded">{`{sum_${id || 'field_id'}_bang_chu}`}</code> - Tổng bằng chữ</li>
                                </ul>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="docso">
                        <DocsoBuilder 
                            allFields={allAvailableFields}
                            fieldGroups={fieldGroups}
                            value={formula?.match(/^docso\((.*)\)$/)?.[1] || ''}
                            onChange={content => updateField('formula', `docso(${content})`)} 
                        />
                    </TabsContent>
                    <TabsContent value="datesub">
                        <DateSubBuilder 
                            allFields={allAvailableFields}
                            fieldGroups={fieldGroups} 
                            values={(() => {
                                const content = formula?.match(/^datesub\((.*)\)$/)?.[1] || '';
                                const parts = content.split(',').map(p => p.trim());
                                return { date1: parts[0] || '', date2: parts[1] || '' };
                            })()}
                            onChange={(key, val) => {
                                const content = fieldData.formula?.match(/^datesub\((.*)\)$/)?.[1] || '';
                                const parts = content.split(',').map(p => p.trim());
                                let d1 = parts[0] || '';
                                let d2 = parts[1] || '';
                                if (key === 'date1') d1 = val;
                                if (key === 'date2') d2 = val;
                                updateField('formula', `datesub(${d1}, ${d2})`);
                            }} 
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

const FieldEditorModal = ({ 
    field: initialField, 
    onSave, 
    onClose, 
    fieldGroups, 
    allFieldIds, 
    numberFormat, 
    fields,
    parentId: forceParentId,
    initialSubField  // 🔧 v2.2.6: Subfield cần edit ngay khi mở modal
}) => {
    const { toast } = useToast();
    const [view, setView] = useState('MAIN');
    const [mainField, setMainField] = useState(null);
    const [subField, setSubField] = useState(null);
    
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    const isEditing = useMemo(() => !!(view === 'MAIN' ? initialField?.id : subField?.originalId), [view, initialField, subField]);

    // 🔧 v2.2.6: Nếu có initialSubField, tự động mở view SUBFIELD sau khi mainField được set
    const initialSubFieldHandled = useRef(false);
    useEffect(() => {
        if (initialSubField && mainField && !initialSubFieldHandled.current) {
            initialSubFieldHandled.current = true;
            // Tìm subfield trong mainField.subFields
            const sf = mainField.subFields?.find(s => s.id === initialSubField.id);
            if (sf) {
                setSubField({ ...sf, originalId: sf.id });
                setView('SUBFIELD');
            }
        }
    }, [initialSubField, mainField]);

    // 🔧 v2.2.6: Flag để ngăn useEffect reset form khi đang "Lưu & Tạo tiếp"
    const [isContinueCreating, setIsContinueCreating] = useState(false);

    useEffect(() => {
        // 🔧 v2.2.6: Không reset nếu đang trong chế độ "tạo tiếp"
        if (isContinueCreating) {
            return;
        }
        
        if (!fields) {
            setMainField(initialField || { parentId: forceParentId || '__ROOT__', subFields: [] });
            return;
        };

        const findParent = (fieldList, childId) => {
            if (!fieldList) return '__ROOT__';
            for (const f of fieldList) {
                if (f.subFields?.some(sf => sf.id === childId)) return f.id;
                if (f.subFields) {
                    const found = findParent(f.subFields, childId);
                    if (found) return found;
                }
            }
            return '__ROOT__';
        };
        
        let fieldToEdit;
        if (initialField) {
            fieldToEdit = { 
                ...initialField, 
                parentId: forceParentId || findParent(fields, initialField.id)
            };
        } else {
            fieldToEdit = { 
                parentId: forceParentId || '__ROOT__',
                subFields: [],
                type: 'text'
            };
        }
        setMainField(fieldToEdit);
    }, [initialField, fields, forceParentId, isContinueCreating]);


    const openSubFieldEditor = (subFieldToEdit) => {
        if (subFieldToEdit) {
            setSubField({ ...subFieldToEdit, originalId: subFieldToEdit.id });
        } else {
            setSubField({ parentId: mainField.id, type: 'text' });
        }
        setView('SUBFIELD');
    }

    const handleSaveSubField = () => {
        if (!subField.name?.trim() || !subField.id?.trim()) {
            toast({ title: "Lỗi", description: "Tên và ID của trường con không được để trống.", variant: "destructive" });
            return;
        }

        const siblingIds = (mainField.subFields || []).map(sf => sf.id).filter(id => id !== subField.originalId);
        if (siblingIds.includes(subField.id)) {
             toast({ title: "Lỗi", description: `ID trường con "${subField.id}" đã tồn tại.`, variant: "destructive" });
            return;
        }

        setMainField(prevMain => {
            const newSubFields = [...(prevMain.subFields || [])];
            const index = newSubFields.findIndex(sf => sf.id === subField.originalId);
            
            const finalSubField = { ...subField };
            delete finalSubField.originalId;

            if (index > -1) {
                newSubFields[index] = finalSubField;
            } else {
                newSubFields.push(finalSubField);
            }
            return { ...prevMain, subFields: newSubFields };
        });

        setView('MAIN');
        setSubField(null);
    };
    
    const handleDeleteSubField = (subFieldId) => {
        setMainField(prev => ({ ...prev, subFields: prev.subFields.filter(sf => sf.id !== subFieldId) }));
    };

    const handleSaveMainField = (continueCreating = false) => {
        if (!mainField.name?.trim() || !mainField.id?.trim()) {
            toast({ title: "Lỗi", description: "Tên và ID của trường không được để trống.", variant: "destructive" });
            return;
        }
        
        const finalId = mainField.id.trim();
        const originalId = initialField?.id;

        const allOtherIds = allFieldIds.filter(id => id !== originalId);
        if (allOtherIds.includes(finalId)) {
            toast({ title: "Lỗi", description: `ID "${finalId}" đã tồn tại. Vui lòng chọn ID khác.`, variant: "destructive" });
            return;
        }

        const dataToSave = { ...mainField };
        
        // 🔧 v2.2.6: Lưu lại group và parentId TRƯỚC khi modify dataToSave
        const savedGroup = mainField.group;
        const savedParentId = mainField.parentId;
        
        if (dataToSave.parentId === '__ROOT__') {
            delete dataToSave.parentId;
        }

        // 🔧 v2.2.6: Nếu chọn "Lưu & Tạo tiếp", set flag TRƯỚC khi gọi onSave
        if (continueCreating) {
            setIsContinueCreating(true);
        }

        // Truyền flag continueCreating vào onSave
        onSave(dataToSave, originalId, continueCreating);
        
        // Nếu chọn "Lưu & Tạo tiếp", reset form để tạo trường mới
        if (continueCreating) {
            const newField = {
                id: '',
                name: '',
                type: 'text',
                defaultValue: '',
                group: savedGroup, // Giữ nguyên group
                parentId: savedParentId || '__ROOT__', // Giữ nguyên parentId
            };
            setMainField(newField);
            toast({ title: "✅ Đã lưu", description: `Trường "${dataToSave.name}" đã được tạo. Tiếp tục tạo trường mới.` });
        }
    };
    
    const handleSubFieldDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setMainField(prev => {
                 const oldIndex = prev.subFields.findIndex(sf => sf.id === active.id);
                 const newIndex = prev.subFields.findIndex(sf => sf.id === over.id);
                 return {...prev, subFields: arrayMove(prev.subFields, oldIndex, newIndex) };
            });
        }
    };
    
    if (!mainField) return null;

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                 <div className="flex flex-col h-full max-h-[85vh]">
                    <DialogHeader>
                        {view === 'SUBFIELD' && (
                             <Button variant="ghost" size="sm" className="absolute left-4 top-4 h-auto p-1" onClick={() => { setView('MAIN'); setSubField(null); }}>
                                <ArrowLeft size={16} className="mr-1"/> Quay lại
                            </Button>
                        )}
                        <DialogTitle className={view === 'SUBFIELD' ? 'text-center' : ''}>
                            {view === 'MAIN' && (isEditing ? `Sửa Trường: ${initialField.name}` : 'Thêm Trường Mới')}
                            {view === 'SUBFIELD' && (isEditing ? `Sửa Trường Con: ${subField.name}` : 'Thêm Trường Con')}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                           {view === 'MAIN' ? 'Form để thêm hoặc sửa một trường.' : 'Form để thêm hoặc sửa một trường con.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-grow space-y-4 overflow-y-auto py-4 pr-2 -mr-4">
                        {view === 'MAIN' ? (
                            <>
                                <FieldEditorForm 
                                    fieldData={mainField}
                                    setFieldData={setMainField}
                                    isEditing={isEditing}
                                    fields={fields}
                                    allFieldIds={allFieldIds}
                                    fieldGroups={fieldGroups}
                                    numberFormat={numberFormat}
                                    parentId={forceParentId}
                                    isSubField={false}
                                />
                                {mainField.type === 'list' && (
                                    <div className="pt-4 border-t mt-4 space-y-4">
                                        <h4 className="font-semibold text-gray-800">Cấu hình Trường Con</h4>
                                        <div className="p-3 bg-gray-50 rounded-md border">
                                            <Label htmlFor="namingField">Trường dùng để đặt tên cho mỗi mục</Label>
                                            <Select value={mainField.namingFieldId || ''} onValueChange={val => setMainField(p => ({ ...p, namingFieldId: val }))} >
                                                <SelectTrigger><SelectValue placeholder="Chọn một trường con..."/></SelectTrigger>
                                                <SelectContent>
                                                    {(mainField.subFields || []).map(sf => (
                                                        <SelectItem key={sf.id} value={sf.id}>{sf.name} ({sf.id})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-gray-500 mt-1">Trường này sẽ được dùng để hiển thị và đặt tên file khi tạo hàng loạt.</p>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <h5 className="font-semibold">Danh sách trường con</h5>
                                            <Button type="button" size="sm" variant="outline" onClick={() => openSubFieldEditor(null)}><Plus className="h-4 w-4 mr-1"/>Thêm</Button>
                                        </div>

                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubFieldDragEnd}>
                                            <SortableContext items={(mainField.subFields || []).map(sf => sf.id)} strategy={verticalListSortingStrategy}>
                                                <div className="space-y-2 mt-2">
                                                    {(mainField.subFields || []).map((sf) => (
                                                        <SortableSubFieldItem key={sf.id} id={sf.id}>
                                                            <div className="flex justify-between items-center p-2 pl-3 bg-white rounded border w-full">
                                                                <p className="text-sm font-medium">{sf.name} <span className="text-xs text-gray-400 font-mono">({sf.id})</span></p>
                                                                <div className="flex items-center gap-1">
                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => openSubFieldEditor(sf)}><Edit size={14} /></Button>
                                                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteSubField(sf.id)}><Trash2 size={14} /></Button>
                                                                </div>
                                                            </div>
                                                        </SortableSubFieldItem>
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                        {(!mainField.subFields || mainField.subFields.length === 0) && <p className='text-sm text-center text-gray-500 italic py-4'>Chưa có trường con nào.</p>}
                                    </div>
                                )}
                            </>
                        ) : (
                            <FieldEditorForm 
                                fieldData={subField}
                                setFieldData={setSubField}
                                isEditing={isEditing}
                                fields={fields}
                                allFieldIds={(mainField.subFields || []).map(sf => sf.id)}
                                isSubField={true}
                                parentFieldType={mainField.type}
                                numberFormat={numberFormat}
                            />
                        )}
                    </div>
                    
                    <DialogFooter className="flex-shrink-0 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={view === 'SUBFIELD' ? () => { setView('MAIN'); setSubField(null); } : onClose}>
                            {view === 'SUBFIELD' ? 'Hủy' : 'Đóng'}
                        </Button>
                        {/* 🔧 v2.2.6: Nút Lưu & Tạo tiếp - chỉ hiện khi tạo mới (không phải edit) */}
                        {view === 'MAIN' && !isEditing && (
                            <Button type="button" variant="secondary" onClick={() => handleSaveMainField(true)}>
                                Lưu & Tạo tiếp
                            </Button>
                        )}
                        <Button type="button" onClick={view === 'SUBFIELD' ? handleSaveSubField : () => handleSaveMainField(false)}>Lưu</Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default FieldEditorModal;
