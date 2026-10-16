
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Type, GripVertical } from 'lucide-react';
import { useToast } from '../../ui/use-toast.js';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Input } from '../../ui/input.jsx';
import { Button } from '../../ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select.jsx';
import { Checkbox } from '../../ui/checkbox.jsx';
import { cn } from '../../../lib/utils.js';


// A single item in the sequence list (either a field or a static text)
const SequenceItem = ({ item, index, onRemove, onUpdate, allFields, onToggleStandalone, dragHandleProps }) => {
    if (item.type === 'field') {
        const field = allFields.find(f => f.id === item.id);
        const checkboxId = `standalone-${item.key}`;
        return (
            <div className="flex flex-col gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                    <div {...dragHandleProps} className="cursor-grab touch-none">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>
                    <span className="font-mono text-sm text-blue-800 flex-grow">TRƯỜNG: {field ? field.name : 'Không rõ'}</span>
                    <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-7 w-7">
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
                <div className="pl-7 flex items-center space-x-2 pt-1">
                    <Checkbox
                        id={checkboxId}
                        checked={!!item.allowStandaloneReverse}
                        onCheckedChange={() => onToggleStandalone(index)}
                    />
                    <label
                        htmlFor={checkboxId}
                        className="text-xs font-medium text-gray-700 cursor-pointer select-none"
                    >
                        Cho phép thay thế độc lập (ngoài chuỗi liên kết này)
                    </label>
                </div>
            </div>
        );
    }

    if (item.type === 'text') {
        return (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                <div {...dragHandleProps} className="cursor-grab touch-none">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
                <Type className="h-5 w-5 text-green-700 flex-shrink-0" />
                <Input
                    type="text"
                    value={item.value}
                    onChange={(e) => onUpdate(index, e.target.value)}
                    placeholder="Nhập văn bản tĩnh..."
                    className="flex-grow text-sm border-green-300 focus:ring-green-500 h-9"
                />
                <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="h-7 w-7">
                    <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
            </div>
        );
    }
    return null;
};

// Wrapper to make SequenceItem sortable
const SortableSequenceItem = (props) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: props.item.key });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <SequenceItem {...props} dragHandleProps={listeners} />
        </div>
    );
};


const LinkEditorModal = ({ onClose, onSave, allFlattenedFields, fieldGroups, existingGroup }) => {
    const { toast } = useToast();
    const [sequence, setSequence] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
    
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (existingGroup) {
            // If it's the new format, use it directly (ensuring flag exists)
            if (existingGroup.sequence) {
                const newSequence = existingGroup.sequence.map((item, index) => ({
                    ...item,
                    key: item.key || `${item.type}-${item.id || 'text'}-${index}`, // Ensure key exists
                    allowStandaloneReverse: item.type === 'field' ? !!item.allowStandaloneReverse : undefined
                }));
                setSequence(newSequence);
            } 
            // If it's the old format, convert it
            else if (existingGroup.fieldIds) {
                const separator = existingGroup.separator || ' ';
                const convertedSequence = existingGroup.fieldIds.flatMap((id, index) => {
                     const fieldItem = { type: 'field', id: id, key: `field-${id}-${Date.now()}`, allowStandaloneReverse: false };
                     if (index < existingGroup.fieldIds.length - 1 && separator) { // Only add separator if it's not empty
                         const textItem = { type: 'text', value: separator, key: `text-sep-${index}-${Date.now()}`};
                         return [fieldItem, textItem];
                     }        
                     return [fieldItem];
                });
                setSequence(convertedSequence);
            }
        }
    }, [existingGroup]);

    const availableFields = useMemo(() => {
        const usedIds = new Set(sequence.filter(item => item.type === 'field').map(item => item.id));
        return allFlattenedFields.filter(field => {
            if (usedIds.has(field.id)) return false;
            const matchesGroup = selectedGroupFilter === 'all' || String(field.group) === String(selectedGroupFilter);
            const matchesSearch = field.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesGroup && matchesSearch;
        });
    }, [allFlattenedFields, sequence, selectedGroupFilter, searchTerm]);

    const handleSave = () => {
        if (sequence.filter(item => item.type === 'field').length === 0) {
            toast({ title: "Lỗi", description: "Chuỗi liên kết phải chứa ít nhất một trường.", variant: "destructive" });
            return;
        }
        // 🔧 v2.2.6: Tự động xóa các text item trống thay vì báo lỗi
        const cleanedSequence = sequence.filter(item => {
            if (item.type === 'text' && item.value.trim() === '') {
                return false; // Loại bỏ text trống
            }
            return true;
        });
        
        if (cleanedSequence.length === 0 || cleanedSequence.filter(item => item.type === 'field').length === 0) {
            toast({ title: "Lỗi", description: "Chuỗi liên kết phải chứa ít nhất một trường.", variant: "destructive" });
            return;
        }

        const newGroup = {
            id: existingGroup?.id || `lg_${Date.now()}`,
            sequence: cleanedSequence.map(({key, ...rest}) => rest), // Remove key before saving
            ignoredChars: existingGroup?.ignoredChars || '',
        };
        onSave(newGroup);
    };

    const addFieldToSequence = (fieldId) => {
        setSequence(prev => [...prev, { type: 'field', id: fieldId, key: `field-${fieldId}-${Date.now()}`, allowStandaloneReverse: false }]);
    };

    const addTextToSequence = () => {
        setSequence(prev => [...prev, { type: 'text', value: '', key: `text-${Date.now()}` }]);
    };

    const removeItem = (index) => {
        setSequence(prev => prev.filter((_, i) => i !== index));
    };
    
    const updateTextItem = (index, value) => {
        setSequence(prev => {
            const newSeq = [...prev];
            if(newSeq[index].type === 'text') {
                newSeq[index] = { ...newSeq[index], value };
            }
            return newSeq;
        });
    };

    const toggleStandalone = (index) => {
        setSequence(prev => {
            const newSeq = [...prev];
            const item = newSeq[index];
            if (item.type === 'field') {
                newSeq[index] = { ...item, allowStandaloneReverse: !item.allowStandaloneReverse };
            }
            return newSeq;
        });
    };
    
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setSequence((items) => {
                const oldIndex = items.findIndex((item) => item.key === active.id);
                const newIndex = items.findIndex((item) => item.key === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4" onMouseDown={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-6xl flex flex-col h-[90vh]" onMouseDown={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-banking-navy mb-4 flex-shrink-0">
                    {existingGroup ? 'Chỉnh Sửa Chuỗi Liên Kết' : 'Tạo Chuỗi Liên Kết Mới'}
                </h3>
                
                <div className="flex-grow grid grid-cols-2 gap-6 overflow-hidden">
                    {/* LEFT - AVAILABLE ITEMS */}
                    <div className="flex flex-col border rounded-lg p-3 overflow-hidden bg-gray-50/50">
                        <h4 className="text-base font-semibold mb-3 text-banking-navy">Nguồn Dữ Liệu</h4>
                        <div className="mb-3 flex-shrink-0">
                             <Button onClick={addTextToSequence} className="w-full bg-green-600 hover:bg-green-700">
                                <Plus className="mr-2 h-4 w-4" /> Thêm Văn Bản Tĩnh
                            </Button>
                        </div>
                        <div className="flex gap-2 mb-3 flex-shrink-0">
                            <Input type="text" placeholder="Tìm trường..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="text-sm" />
                            <Select value={selectedGroupFilter} onValueChange={setSelectedGroupFilter}>
                                <SelectTrigger className="w-[240px] text-sm"><SelectValue placeholder="Lọc theo nhóm" /></SelectTrigger>
                                <SelectContent className="z-[200]">
                                    <SelectItem value="all">Tất cả các nhóm</SelectItem>
                                    {fieldGroups && fieldGroups.map(g => <SelectItem key={g.id} value={g.id} className="text-sm">{g.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-grow border rounded-md overflow-y-auto bg-white">
                            {availableFields.map(field => (
                                <div key={field.id} onClick={() => addFieldToSequence(field.id)} 
                                     className="flex items-center justify-between p-2.5 hover:bg-blue-100 cursor-pointer text-sm border-b">
                                    <span>{field.name}</span>
                                    <Plus className="h-5 w-5 text-gray-400" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT - SEQUENCE BUILDER */}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <div className="flex flex-col border rounded-lg p-3 flex-grow overflow-hidden">
                            <h4 className="text-base font-semibold mb-2 text-banking-navy">Chuỗi Liên Kết (Kéo thả để sắp xếp)</h4>
                                <SortableContext items={sequence.map(item => item.key)} strategy={verticalListSortingStrategy}>
                                    <div className="flex-grow border rounded-md p-2 overflow-y-auto bg-white space-y-2">
                                        {sequence.length > 0 ? sequence.map((item, index) => (
                                            <SortableSequenceItem 
                                                key={item.key} 
                                                item={item} 
                                                index={index} 
                                                onRemove={removeItem} 
                                                onUpdate={updateTextItem}
                                                allFields={allFlattenedFields} 
                                                onToggleStandalone={toggleStandalone}
                                            />
                                        )) : (
                                            <div className="text-center text-gray-500 py-10">
                                                <p>Thêm trường hoặc văn bản tĩnh từ cột bên trái để bắt đầu xây dựng chuỗi.</p>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                        </div>
                    </DndContext>
                </div>

                <div className="flex justify-end gap-3 pt-5 mt-4 border-t flex-shrink-0">
                    <Button variant="outline" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                        Lưu Chuỗi Liên Kết
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default LinkEditorModal;
