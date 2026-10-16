import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "../ui/dialog.jsx";
import { Button } from "../ui/button.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../ui/select.jsx";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group.jsx";
import { Label } from "../ui/label.jsx";
import { Input } from "../ui/input.jsx";

const NAMING_STORAGE_KEY = 'docxautomator_naming_settings';

const GenerationControlPanel = ({ controlPanelData, onConfirm, onCancel }) => {
    if (!controlPanelData) return null;

    const { templates, availableLists, inputData, fields } = controlPanelData; // <-- Added fields

    const [strategies, setStrategies] = useState(() => {
        const initialStrategies = {};
        templates.forEach(t => {
            initialStrategies[t.id] = { type: 'SingleBundle' };
        });
        return initialStrategies;
    });

    // === GLOBAL NAMING OPTIONS (áp dụng cho TẤT CẢ file) - Load từ localStorage ===
    const [globalNamingFieldId, setGlobalNamingFieldId] = useState(() => {
        try {
            const saved = localStorage.getItem(NAMING_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.namingFieldId || '';
            }
        } catch (e) {}
        return '';
    });
    const [globalCustomPrefix, setGlobalCustomPrefix] = useState(() => {
        try {
            const saved = localStorage.getItem(NAMING_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.customPrefix || '';
            }
        } catch (e) {}
        return '';
    });

    // Lưu vào localStorage khi thay đổi
    useEffect(() => {
        localStorage.setItem(NAMING_STORAGE_KEY, JSON.stringify({
            namingFieldId: globalNamingFieldId,
            customPrefix: globalCustomPrefix
        }));
    }, [globalNamingFieldId, globalCustomPrefix]);

    // Lấy tất cả trường phẳng (bao gồm subfields) để chọn đặt tên file
    const allFlatFields = useMemo(() => {
        if (!fields) return [];
        const result = [];
        const flatten = (fieldList, groupName = null) => {
            for (const field of fieldList) {
                if (!field) continue;
                result.push({ ...field, _groupName: groupName });
                if (field.type === 'list' && field.subFields) {
                    flatten(field.subFields, field.name);
                }
            }
        };
        flatten(fields);
        return result;
    }, [fields]);

    // Xóa field ID cũ nếu không còn tồn tại trong template hiện tại
    useEffect(() => {
        if (!globalNamingFieldId) return;
        const isValid = allFlatFields.some(f => f.id === globalNamingFieldId || f.name === globalNamingFieldId);
        if (!isValid) setGlobalNamingFieldId('');
    }, [allFlatFields, globalNamingFieldId]);

    // Nhóm các trường theo nhóm/danh sách cha
    const groupedFields = useMemo(() => {
        const groups = {};
        allFlatFields.forEach(f => {
            const groupKey = f._groupName || '__root__';
            if (!groups[groupKey]) {
                groups[groupKey] = { name: f._groupName || 'Trường chính', fields: [] };
            }
            groups[groupKey].fields.push(f);
        });
        return Object.values(groups);
    }, [allFlatFields]);

    // Lấy giá trị preview cho tên file
    const namingPreviewValue = useMemo(() => {
        if (!globalNamingFieldId || globalNamingFieldId === '__default__') return '';
        const fieldDef = allFlatFields.find(f => f.id === globalNamingFieldId);
        if (!fieldDef) return `{${globalNamingFieldId}}`;
        
        // Try to get actual value from inputData
        let value = inputData?.[globalNamingFieldId];
        if (value) return String(value);
        
        return `{${fieldDef.name}}`;
    }, [globalNamingFieldId, inputData, allFlatFields]);

    const handleStrategyChange = (templateId, newStrategy) => {
        setStrategies(prev => ({
            ...prev,
            [templateId]: newStrategy
        }));
    };

    const handleSubmit = () => {
        const finalStrategies = Object.entries(strategies).map(([templateId, strategy]) => ({
            templateId,
            strategy,
            // Gắn global naming vào từng strategy
            namingFieldId: globalNamingFieldId,
            customPrefix: globalCustomPrefix
        }));
        onConfirm(finalStrategies);
    };

    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bảng Điều Khiển Tạo File Nâng Cao</DialogTitle>
                    <DialogDescription>
                        Phát hiện thấy dữ liệu có chứa danh sách. Vui lòng chọn cách xử lý cho từng mẫu.
                    </DialogDescription>
                </DialogHeader>

                {/* === ĐẶT TÊN FILE - ÁP DỤNG CHO TẤT CẢ === */}
                <div className="flex-shrink-0 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-purple-800">📝 Đặt tên file</span>
                        <span className="text-xs text-gray-400">({'{prefix}{tên}'}_{'{mẫu}'}.docx)</span>
                    </div>
                    <div className="flex gap-3 items-end">
                        <div className="w-24">
                            <Label className="text-xs text-gray-500">Tiền tố</Label>
                            <Input 
                                placeholder="2025" 
                                value={globalCustomPrefix}
                                onChange={(e) => setGlobalCustomPrefix(e.target.value)}
                                className="mt-0.5 h-7 text-xs"
                            />
                        </div>
                        <div className="w-40">
                            <Label className="text-xs text-gray-500">Trường đặt tên</Label>
                            <Select value={globalNamingFieldId} onValueChange={setGlobalNamingFieldId}>
                                <SelectTrigger className="mt-0.5 h-7 text-xs">
                                    <SelectValue placeholder="-- Giữ nguyên --" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__default__">-- Giữ nguyên --</SelectItem>
                                    {groupedFields.map(group => (
                                        <SelectGroup key={group.name}>
                                            <SelectLabel className="text-xs font-bold bg-gray-100">{group.name}</SelectLabel>
                                            {group.fields.filter(f => f.type === 'text' || f.type === 'number').map(field => (
                                                <SelectItem key={field.id} value={field.id} className="pl-4 text-xs">
                                                    {field.name}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 text-xs font-mono text-purple-700 bg-white px-2 py-1.5 rounded border truncate">
                            {[globalCustomPrefix, globalNamingFieldId && globalNamingFieldId !== '__default__' ? namingPreviewValue : '', 'TenMau'].filter(Boolean).join('_')}.docx
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto pr-6 space-y-6">
                    {templates.map(template => (
                        <TemplateStrategyEditor
                            key={template.id}
                            template={template}
                            strategy={strategies[template.id]}
                            onStrategyChange={handleStrategyChange}
                            availableLists={availableLists}
                            inputData={inputData}
                            fields={fields}
                        />
                    ))}
                </div>

                <DialogFooter className="mt-4 pt-4 border-t">
                    <Button variant="outline" onClick={onCancel}>Hủy</Button>
                    <Button onClick={handleSubmit}>Xác nhận và Tạo File</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TemplateStrategyEditor = ({ template, strategy, onStrategyChange, availableLists, inputData, fields }) => {
    const [selectedList, setSelectedList] = useState(strategy.listName || (availableLists.length > 0 ? availableLists[0] : ''));
    const [selectedItemIndex, setSelectedItemIndex] = useState(strategy.itemIndex || 0);

    const handleTypeChange = (newType) => {
        let newStrategy = { type: newType };
        if (newType === 'MailMerge' || newType === 'SingleItem') {
            newStrategy.listName = selectedList;
            if (newType === 'SingleItem') {
                newStrategy.itemIndex = selectedItemIndex;
            }
        }
        onStrategyChange(template.id, newStrategy);
    };
    
    const handleListChange = (newListName) => {
        setSelectedList(newListName);
        let newStrategy = { ...strategy, listName: newListName };
        if (strategy.type === 'SingleItem') {
            setSelectedItemIndex(0); 
            newStrategy.itemIndex = 0;
        }
        onStrategyChange(template.id, newStrategy);
    };

    const handleItemIndexChange = (newIndexStr) => {
        const newIndex = parseInt(newIndexStr, 10);
        setSelectedItemIndex(newIndex);
        onStrategyChange(template.id, { ...strategy, itemIndex: newIndex });
    };

    const itemsInSelectedList = useMemo(() => {
        return (inputData && selectedList && inputData[selectedList]) || [];
    }, [inputData, selectedList]);

    const listNameFieldId = useMemo(() => {
        if (!selectedList || !fields) return null;
        const listFieldDef = fields.find(f => f.id === selectedList && f.type === 'list');
        if (listFieldDef) {
            // Ưu tiên dùng namingFieldId đã cấu hình
            if (listFieldDef.namingFieldId) {
                return listFieldDef.namingFieldId;
            }
            // Fallback: dùng trường con đầu tiên
            if (listFieldDef.subFields && listFieldDef.subFields.length > 0) {
                return listFieldDef.subFields[0].id;
            }
        }
        return null;
    }, [fields, selectedList]);

    return (
        <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">{template.name}</h3>
            
            <RadioGroup value={strategy.type} onValueChange={handleTypeChange} className="space-y-1">
                <div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SingleBundle" id={`rb-bundle-${template.id}`} />
                        {/* #3: Tooltip giải thích rõ SingleBundle */}
                        <Label htmlFor={`rb-bundle-${template.id}`}>Lặp lại tất cả (Mặc định)</Label>
                    </div>
                    <p className="text-xs text-gray-500 ml-6">Tạo <strong>1 file duy nhất</strong> — tất cả {availableLists.length > 0 ? `${availableLists.map(l => inputData?.[l]?.length || 0).reduce((a,b)=>a+b,0)} mục trong ${availableLists.length} danh sách` : 'mục'} đều được render vào cùng 1 file.</p>
                </div>
                <div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MailMerge" id={`rb-merge-${template.id}`} disabled={availableLists.length === 0} />
                        <Label htmlFor={`rb-merge-${template.id}`} className={availableLists.length === 0 ? 'text-gray-400' : ''}>Tạo file riêng cho mỗi mục (Mail Merge)</Label>
                    </div>
                    {/* #2: Hiển thị số lượng file sẽ được tạo */}
                    <p className="text-xs text-gray-500 ml-6">Tạo <strong>{selectedList && inputData?.[selectedList] ? `${inputData[selectedList].length} file` : 'nhiều file'}</strong> — mỗi file ứng với một mục trong danh sách đã chọn.</p>
                </div>
                <div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SingleItem" id={`rb-single-${template.id}`} disabled={availableLists.length === 0} />
                        <Label htmlFor={`rb-single-${template.id}`} className={availableLists.length === 0 ? 'text-gray-400' : ''}>Chỉ dùng một mục duy nhất</Label>
                    </div>
                     <p className="text-xs text-gray-500 ml-6">Tạo 1 file, chỉ sử dụng một mục duy nhất từ danh sách đã chọn.</p>
                </div>
            </RadioGroup>

            {(strategy.type === 'MailMerge' || strategy.type === 'SingleItem') && (
                <div className="pl-6 pt-2 border-l-2 border-purple-300 ml-3 mt-3 bg-purple-50 rounded-r-lg p-3">
                    <Label className="font-semibold text-purple-800">Chọn danh sách để áp dụng:</Label>
                     <Select value={selectedList} onValueChange={handleListChange}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Chọn một danh sách..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableLists.map(listName => (
                                <SelectItem key={listName} value={listName}>
                                    {listName} {inputData?.[listName] ? `(${inputData[listName].length} mục)` : ''} {/* #2 */}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            {strategy.type === 'SingleItem' && itemsInSelectedList.length > 0 && (
                 <div className="pl-6 pt-2 border-l-2 border-orange-300 ml-3 mt-3 bg-orange-50 rounded-r-lg p-3">
                    <Label className="font-semibold text-orange-800">Chọn mục để sử dụng:</Label>
                     <Select value={String(selectedItemIndex)} onValueChange={handleItemIndexChange}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Chọn một mục..." />
                        </SelectTrigger>
                        <SelectContent>
                            {itemsInSelectedList.map((item, index) => {
                                const displayName = listNameFieldId && item[listNameFieldId] 
                                    ? item[listNameFieldId]
                                    : `Mục ${index + 1}`;

                                return (
                                    <SelectItem key={index} value={String(index)}>
                                        {`Mục #${index + 1}: ${displayName}`}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    );
};

export default GenerationControlPanel;
