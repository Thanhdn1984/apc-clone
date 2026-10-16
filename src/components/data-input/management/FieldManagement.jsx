
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit, Trash2, List, LayoutGrid, X, GripVertical, ChevronDown, Download, Upload, Sparkles, BookOpen } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { PROFILE_TEMPLATES, initInputDataFromFields } from '../../../profileTemplates.js';
import { APC_HO_SO_CHUAN } from '../../../apcHoSoChuan.js';

import FieldEditorModal from './FieldEditorModal.jsx';
import GroupEditorModal from './GroupEditorModal.jsx';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// =================================================================================
// == GIỮ VỮNG VỊ TRÍ - NÂNG CẤP 1: THÊM "THẺ ĐỊNH DANH" VÀO DANH SÁCH SẮP XẾP  ==
// =================================================================================
// Thêm data-field-id={id} để "Hệ thần kinh phục hồi" có thể tìm thấy trường này.
const SortableListItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} className="flex items-center w-full" data-field-id={id}>
            <div {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab touch-none">
                <GripVertical size={18} />
            </div>
            <div className="flex-grow min-w-0">{children}</div>
        </div>
    );
};


const AccordionItem = ({ title, children, isOpen, onToggle, itemCount, id, isUngrouped = false }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: isUngrouped });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 'auto',
        opacity: isDragging ? 0.9 : 1,
    };
    return (
        <div ref={setNodeRef} style={style} className="border rounded-lg bg-white flex flex-col shadow-sm">
            <div className="flex justify-between items-center p-2 border-b">
                 {!isUngrouped && (
                    <div {...attributes} {...listeners} className="p-1.5 text-gray-400 hover:text-gray-600 cursor-grab touch-none">
                        <GripVertical size={18} />
                    </div>
                )}
                <button onClick={onToggle} className={`flex items-center gap-2 text-left w-full ${isUngrouped ? 'ml-4' : ''}`}>
                    <ChevronDown size={20} className={`transform transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                    <h4 className="font-semibold text-md text-banking-green flex-grow">{title} <span className="text-gray-400 font-normal">({itemCount} trường)</span></h4>
                </button>
            </div>
            {isOpen && (
                <div className="p-2 space-y-1">{itemCount > 0 ? children : <p className="text-sm text-gray-500 italic px-1">Chưa có trường nào.</p>}</div>
            )}
        </div>
    );
};

const FieldManagement = ({
    fields, setFields,
    fieldGroups, setFieldGroups,
    inputData, setInputData,
    numberFormat,
    openGroupIds, setOpenGroupIds,
    managementOpenListFieldIds, setManagementOpenListFieldIds,
    linkedFieldConfig, setLinkedFieldConfig,
    namingFieldId, setNamingFieldId,
    customTemplates, setCustomTemplates,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('fields');
  
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  
  const [editingField, setEditingField] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [forcedParentId, setForcedParentId] = useState(null);

  // =================================================================================
  // == GIỮ VỮNG VỊ TRÍ - NÂNG CẤP 2: CẤY "THIẾT BỊ GHI NHỚ" VÀ "THAM CHIẾU"      ==
  // =================================================================================
  const editedFieldIdRef = useRef(null); // "Thiết bị ghi nhớ" ID của trường vừa sửa
  const scrollContainerRef = useRef(null); // "Thiết bị tham chiếu" đến container cuộn

  const allFieldIds = useMemo(() => {
      const ids = new Set();
      const recursiveAdd = (fieldList) => {
          if (!fieldList) return;
          for (const field of fieldList) {
              ids.add(field.id);
              if (field.subFields) recursiveAdd(field.subFields);
          }
      };
      recursiveAdd(fields);
      (fieldGroups || []).forEach(g => ids.add(g.id));
      return Array.from(ids);
  }, [fields, fieldGroups]);
  
  // =================================================================================
  // == GIỮ VỮNG VỊ TRÍ - NÂNG CẤP 3: CẤY "HỆ THẦN KINH PHỤC HỒI VỊ TRÍ"          ==
  // =================================================================================
  // "Dây thần kinh" này được kích hoạt *sau khi* `fields` thay đổi (giao diện vẽ lại)
  useEffect(() => {
    // 1. Kiểm tra "trí nhớ" xem có ID nào được lưu không.
    if (editedFieldIdRef.current && scrollContainerRef.current) {
        const fieldId = editedFieldIdRef.current;
        // 2. Tìm phần tử trong DOM có "thẻ định danh" khớp với ID đã nhớ.
        const element = scrollContainerRef.current.querySelector(`[data-field-id='${fieldId}']`);

        if (element) {
            // 3. Ra lệnh cho trình duyệt cuộn đến và làm nổi bật phần tử đó.
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-on-save');
            setTimeout(() => {
                element.classList.remove('highlight-on-save');
            }, 2000); // Giữ hiệu ứng trong 2 giây
        }
        // 4. Xóa "trí nhớ" để chuẩn bị cho lần lưu tiếp theo.
        editedFieldIdRef.current = null;
    }
  }, [fields]); // Chỉ kích hoạt khi `fields` thay đổi.


  const { orderedGroups, ungroupedGroup } = useMemo(() => {
    const groupMap = (fieldGroups || []).reduce((acc, group) => ({ ...acc, [group.id]: { ...group, fields: [] } }), {});
    const ungrouped = [];

    (fields || []).forEach(field => {
      if (!field.parentId || field.parentId === '__ROOT__') {
          const targetGroup = field.group && groupMap[field.group] ? groupMap[field.group].fields : ungrouped;
          targetGroup.push(field);
      }
    });
    
    Object.values(groupMap).forEach(g => g.fields.sort((a, b) => (fields.findIndex(f => f.id === a.id)) - (fields.findIndex(f => f.id === b.id))));
    ungrouped.sort((a, b) => (fields.findIndex(f => f.id === a.id)) - (fields.findIndex(f => f.id === b.id)));
    
    return {
      orderedGroups: (fieldGroups || []).map(g => groupMap[g.id]).filter(Boolean),
      ungroupedGroup: { id: '__ungrouped__', name: 'Trường chưa được nhóm', fields: ungrouped }
    };
  }, [fields, fieldGroups]);

  useEffect(() => {
    if (!Array.isArray(openGroupIds) && setOpenGroupIds) {
        const allIds = [ ...orderedGroups.map(g => g.id), ...(ungroupedGroup.fields.length > 0 ? [ungroupedGroup.id] : []) ];
        setOpenGroupIds(allIds);
    }
  }, [orderedGroups, ungroupedGroup, openGroupIds, setOpenGroupIds]);

  const openFieldEditorForNew = (parentId = null) => {
      setEditingField(null);
      setForcedParentId(parentId);
      setEditingSubField(null); // 🔧 v2.2.6
      setIsFieldEditorOpen(true);
  };

  // 🔧 v2.2.6: State để track subfield cần edit
  const [editingSubField, setEditingSubField] = useState(null);

  const openFieldEditorForEdit = (fieldToEdit) => {
      // 🔧 v2.2.6: Kiểm tra xem fieldToEdit có phải là subfield không
      // Nếu có, mở modal của trường cha và set editingSubField
      let parentListField = null;
      for (const field of (fields || [])) {
          if (field.type === 'list' && field.subFields?.some(sf => sf.id === fieldToEdit.id)) {
              parentListField = field;
              break;
          }
      }
      
      if (parentListField) {
          // Đây là subfield - mở modal trường cha và đánh dấu subfield cần edit
          setEditingField(parentListField);
          setEditingSubField(fieldToEdit);
      } else {
          // Đây là trường gốc
          setEditingField(fieldToEdit);
          setEditingSubField(null);
      }
      setForcedParentId(null);
      setIsFieldEditorOpen(true);
  };

  const closeModalAndReset = () => {
      setIsFieldEditorOpen(false);
      setEditingField(null);
      setForcedParentId(null);
      setEditingSubField(null); // 🔧 v2.2.6
  }

  const handleToggleGroup = (groupId) => {
    if (!setOpenGroupIds) return;
    const currentIds = Array.isArray(openGroupIds) ? openGroupIds : [];
    setOpenGroupIds(currentIds.includes(groupId) ? currentIds.filter(id => id !== groupId) : [...currentIds, groupId]);
  };

  const handleToggleListField = (fieldId) => {
    if (!setManagementOpenListFieldIds) return;
    setManagementOpenListFieldIds(prevIds => {
        const newIds = new Set(prevIds);
        if (newIds.has(fieldId)) newIds.delete(fieldId);
        else newIds.add(fieldId);
        return Array.from(newIds);
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleGroupReorder = ({ active, over }) => {
    if (active.id !== over.id) {
        setFieldGroups((items) => arrayMove(items, items.findIndex(g => g.id === active.id), items.findIndex(g => g.id === over.id)));
    }
  };

  const handleFieldReorder = ({ active, over }) => {
      if (active.id !== over.id) {
          setFields(currentFields => arrayMove(currentFields, currentFields.findIndex(f => f.id === active.id), currentFields.findIndex(f => f.id === over.id)));
      }
  };

  const handleSubFieldReorder = (event, parentFieldId) => {
      const { active, over } = event;
      if (active.id !== over.id) {
          setFields(currentFields => {
              const newFields = JSON.parse(JSON.stringify(currentFields));
              const parentField = findFieldRecursive(newFields, parentFieldId);
              if (parentField?.subFields) {
                  const oldIndex = parentField.subFields.findIndex(f => f.id === active.id);
                  const newIndex = parentField.subFields.findIndex(f => f.id === over.id);
                  if (oldIndex !== -1 && newIndex !== -1) {
                      parentField.subFields = arrayMove(parentField.subFields, oldIndex, newIndex);
                  }
              }
              return newFields;
          });
      }
  };

  const findFieldRecursive = (searchFields, id) => {
    for (const f of searchFields) {
        if (f.id === id) return f;
        if (f.subFields) {
            const found = findFieldRecursive(f.subFields, id);
            if (found) return found;
        }
    }
    return null;
  };

  // =================================================================================
  // == GIỮ VỮNG VỊ TRÍ - NÂNG CẤP 4: DẠY CHO HÀM LƯU CÁCH "GHI NHỚ" VỊ TRÍ        ==
  // =================================================================================
  const handleSaveField = (fieldData, originalId, continueCreating = false) => {
    // Hành động "ghi nhớ" vị trí: Lưu ID của trường sắp được lưu vào "thiết bị nhớ".
    editedFieldIdRef.current = fieldData.id;

    // **THÊMMỚI: Nếu ID thay đổi, cập nhật linkedFieldConfig**
    if (originalId && originalId !== fieldData.id && setLinkedFieldConfig && linkedFieldConfig?.links) {
        const newConfig = { 
            ...linkedFieldConfig, 
            links: linkedFieldConfig.links.map(link => ({
                ...link,
                targetField: link.targetField === originalId ? fieldData.id : link.targetField
            }))
        };
        setLinkedFieldConfig(newConfig);
    }
    
    // 🔧 v2.2.6: Cleanup data khi field bị di chuyển từ subField của list ra ngoài
    const cleanupListDataWhenFieldMoved = (fieldId, oldParentId, newParentId) => {
        // Chỉ cleanup khi field được di chuyển từ bên trong list ra ngoài
        if (!oldParentId || oldParentId === '__ROOT__' || oldParentId === newParentId) return;
        
        // Tìm list cha cũ
        const oldParentField = findFieldRecursive(fields || [], oldParentId);
        if (!oldParentField || oldParentField.type !== 'list') return;
        
        // Cleanup: Xóa key fieldId khỏi tất cả items trong list data
        const listData = inputData[oldParentId];
        if (Array.isArray(listData) && listData.length > 0) {
            const cleanedListData = listData.map(item => {
                if (item && typeof item === 'object' && item.hasOwnProperty(fieldId)) {
                    const { [fieldId]: removed, ...rest } = item;
                    return rest;
                }
                return item;
            });
            setInputData(prev => ({ ...prev, [oldParentId]: cleanedListData }));
        }
    };

    setFields(prevFields => {
        let draftFields = JSON.parse(JSON.stringify(prevFields || []));

        if (originalId) { // Đây là trường hợp sửa một trường đã có
            const findAndGetParent = (fields, id) => {
                for(let i=0; i<fields.length; i++) {
                    if(fields[i].id === id) return { parent: fields, index: i};
                    if(fields[i].subFields){
                        const found = findAndGetParent(fields[i].subFields, id);
                        if(found) return found;
                    }
                }
                return null;
            }
            const found = findAndGetParent(draftFields, originalId);
            
            // 🔧 v2.2.6: Lấy oldParentId trước khi xóa
            const oldParentId = found?.parent?.[found.index]?.parentId;
            
            if(found && (fieldData.parentId === found.parent[found.index].parentId && fieldData.group === found.parent[found.index].group)) {
                 // Nếu parentId và group không thay đổi, sửa tại chỗ
                found.parent[found.index] = fieldData;
                return draftFields;
            } else {
                 // Nếu parentId hoặc group thay đổi, phải xóa từ vị trí cũ và thêm vào vị trí mới
                 const deleteRecursive = (fields) => {
                     return fields
                         .filter(f => f.id !== originalId)
                         .map(f => f.subFields ? { ...f, subFields: deleteRecursive(f.subFields) } : f);
                 };
                 draftFields = deleteRecursive(draftFields);
                 
                 // 🔧 v2.2.6: Cleanup data khi field được di chuyển ra khỏi list
                 cleanupListDataWhenFieldMoved(originalId, oldParentId, fieldData.parentId);
            }
        }
        
        // Trường hợp thêm mới hoặc cần thêm vào vị trí mới
        const newField = { ...fieldData };
        if (newField.parentId && newField.parentId !== '__ROOT__') {
            const parent = findFieldRecursive(draftFields, newField.parentId);
            if (parent) {
                parent.subFields = parent.subFields || [];
                parent.subFields.push(newField);
            } else { 
                draftFields.push(newField);
            }
        } else {
            draftFields.push(newField);
        }
        return draftFields;
    });
    
    const newData = { ...inputData };
    if (originalId && originalId !== fieldData.id) {
        delete newData[originalId];
    }
    if (!newData.hasOwnProperty(fieldData.id)) {
         newData[fieldData.id] = fieldData.type === 'list' ? [] : '';
    }
    setInputData(newData);
    
    // 🔧 v2.2.6: Không đóng modal nếu đang "Lưu & Tạo tiếp"
    if (!continueCreating) {
        closeModalAndReset();
    }
  };
  
  const handleDeleteField = (fieldId) => {
    const idsToDelete = new Set([fieldId]);
    const fieldToDelete = findFieldRecursive(fields || [], fieldId);

    if (fieldToDelete) {
        const findSubFieldIds = (startField) => {
            if (startField?.subFields) {
                for (const subField of startField.subFields) {
                    idsToDelete.add(subField.id);
                    findSubFieldIds(subField);
                }
            }
        };
        findSubFieldIds(fieldToDelete);
    }

    if (setLinkedFieldConfig && linkedFieldConfig) {
        // #6: Cleanup cả links lẫn groups trong linkedFieldConfig
        const newConfig = { ...linkedFieldConfig };
        if (newConfig.links) {
            newConfig.links = newConfig.links.filter(link => !idsToDelete.has(link.targetField) && !idsToDelete.has(link.sourceField));
        }
        if (newConfig.groups) {
            newConfig.groups = newConfig.groups
                .map(group => ({
                    ...group,
                    sequence: (group.sequence || []).filter(item => item.type !== 'field' || !idsToDelete.has(item.id))
                }))
                .filter(group => (group.sequence || []).some(item => item.type === 'field'));
        }
        setLinkedFieldConfig(newConfig);
    }

    setFields(prevFields => {
        const deleteRecursive = (currentFields) => {
            return currentFields
                .filter(f => !idsToDelete.has(f.id))
                .map(f => f.subFields ? { ...f, subFields: deleteRecursive(f.subFields) } : f);
        };
        return deleteRecursive(prevFields || []);
    });

    const newData = { ...inputData };
    idsToDelete.forEach(id => { delete newData[id]; });
    setInputData(newData);

    toast({ title: "Đã xóa trường", description: `Trường "${fieldToDelete?.name || fieldId}" đã được xóa.`, variant: "destructive" });
  };

  const handleSaveGroup = (groupData) => {
    const isNew = !(fieldGroups || []).some(g => g.id === groupData.id);
    setFieldGroups(prev => isNew ? [...(prev || []), groupData] : prev.map(g => (g.id === groupData.id ? groupData : g)));
    setIsGroupEditorOpen(false);
  };

  const handleDeleteGroup = (groupId, groupName) => {
     // Tìm tất cả các trường trong nhóm sắp xóa
     const fieldsInGroup = (fields || []).filter(f => f.group === groupId);
     const fieldsInGroupIds = new Set(fieldsInGroup.map(f => f.id));

     // Cập nhật linked fields: xóa những link tham chiếu trường trong nhóm
     if (setLinkedFieldConfig && linkedFieldConfig?.links) {
         const newConfig = { 
             ...linkedFieldConfig, 
             links: linkedFieldConfig.links.filter(link => !fieldsInGroupIds.has(link.targetField))
         };
         setLinkedFieldConfig(newConfig);
     }

     // Xóa nhóm
     setFieldGroups(prev => prev.filter(g => g.id !== groupId));
     
     // Chuyển các trường trong nhóm về "chưa được nhóm"
     setFields(prevFields => prevFields.map(f => (f.group === groupId ? { ...f, group: null } : f)));
     
     toast({ title: `Đã xóa nhóm "${groupName}"`, description: "Các trường thuộc nhóm này đã được chuyển thành 'chưa được nhóm'." });
  };

  // ========== EXPORT/IMPORT NHÓM ==========
  
  // Xuất một nhóm đơn lẻ (kèm tất cả trường trong đó)
  const handleExportSingleGroup = (group) => {
    const groupFields = (fields || []).filter(f => f.group === group.id);
    const exportData = {
      version: '1.0',
      type: 'single-group',
      exportedAt: new Date().toISOString(),
      group: group,
      fields: JSON.parse(JSON.stringify(groupFields))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nhom_${group.id}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Xuất thành công', description: `Đã xuất nhóm "${group.name}" với ${groupFields.length} trường.` });
  };

  // Xuất tất cả nhóm (kèm tất cả trường)
  const handleExportAllGroups = () => {
    if (!fieldGroups || fieldGroups.length === 0) {
      toast({ title: 'Không có nhóm', description: 'Không có nhóm nào để xuất.', variant: 'destructive' });
      return;
    }
    
    // Lấy tất cả trường thuộc các nhóm
    const groupIds = new Set(fieldGroups.map(g => g.id));
    const groupedFields = (fields || []).filter(f => f.group && groupIds.has(f.group));
    
    const exportData = {
      version: '1.0',
      type: 'all-groups',
      exportedAt: new Date().toISOString(),
      groups: JSON.parse(JSON.stringify(fieldGroups)),
      fields: JSON.parse(JSON.stringify(groupedFields))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tat_ca_nhom_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Xuất thành công', description: `Đã xuất ${fieldGroups.length} nhóm với ${groupedFields.length} trường.` });
  };

  // Nhập nhóm từ file JSON
  const handleImportGroups = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        
        if (!importData.version || !importData.type) {
          toast({ title: 'File không hợp lệ', description: 'File không đúng định dạng xuất nhóm.', variant: 'destructive' });
          return;
        }
        
        let groupsToImport = [];
        let fieldsToImport = [];
        
        if (importData.type === 'single-group') {
          groupsToImport = [importData.group];
          fieldsToImport = importData.fields || [];
        } else if (importData.type === 'all-groups') {
          groupsToImport = importData.groups || [];
          fieldsToImport = importData.fields || [];
        }
        
        // Kiểm tra trùng ID nhóm
        const existingGroupIds = new Set((fieldGroups || []).map(g => g.id));
        const existingFieldIds = new Set(allFieldIds);
        
        let skippedGroups = 0;
        let addedGroups = 0;
        let skippedFields = 0;
        let addedFields = 0;
        
        // Thêm nhóm mới (bỏ qua nhóm trùng ID)
        const newGroups = [];
        const validGroupIds = new Set();
        
        for (const group of groupsToImport) {
          if (existingGroupIds.has(group.id)) {
            skippedGroups++;
          } else {
            newGroups.push(group);
            validGroupIds.add(group.id);
            addedGroups++;
          }
        }
        
        // Thêm trường mới (chỉ các trường thuộc nhóm đã được thêm)
        const newFields = [];
        for (const field of fieldsToImport) {
          if (existingFieldIds.has(field.id)) {
            skippedFields++;
          } else if (validGroupIds.has(field.group)) {
            newFields.push(field);
            addedFields++;
          }
        }
        
        // Cập nhật state
        if (newGroups.length > 0) {
          setFieldGroups(prev => [...(prev || []), ...newGroups]);
        }
        if (newFields.length > 0) {
          setFields(prev => [...(prev || []), ...newFields]);
        }
        
        // Thông báo kết quả
        let message = `Đã thêm ${addedGroups} nhóm và ${addedFields} trường.`;
        if (skippedGroups > 0 || skippedFields > 0) {
          message += ` Bỏ qua ${skippedGroups} nhóm và ${skippedFields} trường trùng ID.`;
        }
        
        toast({ 
          title: 'Nhập thành công', 
          description: message,
          duration: 5000
        });
        
      } catch (err) {
        toast({ title: 'Lỗi đọc file', description: 'File JSON không hợp lệ.', variant: 'destructive' });
      }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input để có thể chọn lại cùng file
  };

  // ========== DỌN DẸP DỮ LIỆU RÁC ==========
  const handleCleanupOrphanData = () => {
    // Thu thập tất cả field IDs hợp lệ từ cây fields
    const validFieldIds = new Set();
    const collectValidIds = (fieldList, parentIds = new Set()) => {
      if (!fieldList) return;
      for (const field of fieldList) {
        if (!field) continue;
        validFieldIds.add(field.id);
        if (field.type === 'list' && field.subFields) {
          collectValidIds(field.subFields, validFieldIds);
        }
      }
    };
    collectValidIds(fields);
    
    // Tìm các key trong inputData không có trong validFieldIds
    const orphanKeys = Object.keys(inputData || {}).filter(key => {
      // Bỏ qua các key đặc biệt như sum_*, các key là array index
      if (key.startsWith('sum_')) return false;
      if (!isNaN(key)) return false; // numeric keys for list items
      return !validFieldIds.has(key);
    });
    
    if (orphanKeys.length === 0) {
      toast({ title: 'Không có dữ liệu rác', description: 'Dữ liệu của bạn đã sạch sẽ!' });
      return;
    }
    
    // Hiển thị confirm với danh sách orphan keys
    const confirmMsg = `Tìm thấy ${orphanKeys.length} mục dữ liệu rác:\n\n${orphanKeys.slice(0, 10).join('\n')}${orphanKeys.length > 10 ? `\n... và ${orphanKeys.length - 10} mục khác` : ''}\n\nBạn có muốn xóa không?`;
    
    if (window.confirm(confirmMsg)) {
      const newInputData = { ...inputData };
      orphanKeys.forEach(key => delete newInputData[key]);
      setInputData(newInputData);
      
      toast({ 
        title: 'Đã dọn dẹp', 
        description: `Đã xóa ${orphanKeys.length} mục dữ liệu rác.`,
        duration: 5000
      });
    }
  };

  const getFieldTypeDisplay = (field) => {
      if (field.formula?.startsWith('docso(')) return `Đọc số`;
      if (field.formula?.startsWith('calc(')) return `Công thức`;
      if (field.formula?.startsWith('datesub(')) return `Tính ngày`;
      if (field.type === 'list') return `Danh sách (${field.subFields?.length || 0} trường con)`;
      const typeNames = {text: 'Văn bản', longtext: 'Văn bản dài', number: 'Số', date: 'Ngày'};
      return typeNames[field.type] || field.type;
  }
  const renderFieldWithSubfields = (field, isSubField = false) => {
    const isListOpen = field.type === 'list' && managementOpenListFieldIds?.includes(field.id);

    const fieldHeader = (
      <div className={`flex items-center justify-between p-2 rounded-t-md border ${isSubField ? 'bg-gray-100' : 'bg-gray-50'} ${field.type === 'list' && isListOpen ? 'rounded-b-none' : 'rounded-b-md'}`}>
        <div className="flex-grow flex items-center min-w-0" onClick={() => field.type === 'list' && handleToggleListField(field.id)} style={{ cursor: field.type === 'list' ? 'pointer' : 'default' }}>
            {field.type === 'list' && <ChevronDown size={20} className={`transform transition-transform duration-200 flex-shrink-0 mr-2 ${isListOpen ? 'rotate-180' : ''}`} />}
            <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm truncate">{field.name} <span className="text-xs text-gray-500 font-mono">({field.id})</span></p>
                <p className="text-xs text-gray-600 truncate">{getFieldTypeDisplay(field)}</p>
            </div>
        </div>
        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); openFieldEditorForEdit(field); }} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Edit size={15}/></button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-full"><Trash2 size={15}/></button>
        </div>
      </div>
    );

    if (field.type === 'list') {
        return (
            <div className="w-full">
                {fieldHeader}
                {isListOpen && (
                    <div className="pl-6 pr-2 py-2 space-y-2 border-l border-r border-b rounded-b-md bg-white">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleSubFieldReorder(e, field.id)}>
                            <SortableContext items={field.subFields?.map(sf => sf.id) || []} strategy={verticalListSortingStrategy}>
                                {field.subFields?.map(subField => (
                                    <SortableListItem key={subField.id} id={subField.id}>
                                        {renderFieldWithSubfields(subField, true)}
                                    </SortableListItem>
                                ))}
                            </SortableContext>
                        </DndContext>
                        <Button size="sm" variant="outline" className="flex items-center gap-1 mt-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700" onClick={() => openFieldEditorForNew(field.id)}>
                            <Plus size={16}/>Thêm trường con
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return <div className="w-full">{fieldHeader}</div>;
  };

  const [newTemplateName, setNewTemplateName] = useState('');

  const countFieldsDeep = useCallback((fieldList = []) => {
    return (fieldList || []).reduce((total, field) => {
      return total + 1 + (Array.isArray(field.subFields) ? countFieldsDeep(field.subFields) : 0);
    }, 0);
  }, []);

  const handleSaveCustomTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) {
      toast({ title: 'Vui lòng nhập tên mẫu hồ sơ', variant: 'destructive' });
      return;
    }
    const existing = (customTemplates || []).find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!window.confirm(`Mẫu "${name}" đã tồn tại. Ghi đè?`)) return;
    }
    const newTemplate = {
      id: `custom_${Date.now()}`,
      name,
      description: `Mẫu tùy chỉnh (${(fields || []).length} trường, ${(fieldGroups || []).length} nhóm)`,
      icon: '📋',
      namingFieldId: namingFieldId || '',
      fields: JSON.parse(JSON.stringify(fields || [])),
      fieldGroups: JSON.parse(JSON.stringify(fieldGroups || [])),
      isCustom: true,
    };
    const updated = existing
      ? (customTemplates || []).map(t => t.name.toLowerCase() === name.toLowerCase() ? newTemplate : t)
      : [...(customTemplates || []), newTemplate];
    if (setCustomTemplates) setCustomTemplates(updated);
    setNewTemplateName('');
    toast({ title: `✅ Đã lưu mẫu "${name}"`, description: `${(fields || []).length} trường, ${(fieldGroups || []).length} nhóm` });
  };

  const handleDeleteCustomTemplate = (templateId) => {
    if (!window.confirm('Xóa mẫu hồ sơ này?')) return;
    if (setCustomTemplates) setCustomTemplates((customTemplates || []).filter(t => t.id !== templateId));
  };

  const handleLoadTemplate = (template) => {
    const confirmMsg = `Tải bộ hồ sơ "${template.name}" sẽ XÓA TOÀN BỘ cấu trúc trường và dữ liệu hiện tại.\n\nBạn có muốn tiếp tục không?`;
    if (!window.confirm(confirmMsg)) return;

    const newInputData = initInputDataFromFields(template.fields);
    setFields(JSON.parse(JSON.stringify(template.fields)));
    setFieldGroups(JSON.parse(JSON.stringify(template.fieldGroups)));
    setInputData(newInputData);
    if (setNamingFieldId) setNamingFieldId(template.namingFieldId || '');

    localStorage.removeItem('dataInputTab_scrollPosition');
    localStorage.removeItem('docxautomator_naming_settings');

    toast({
      title: `✅ Đã tải: ${template.name}`,
      description: `${countFieldsDeep(template.fields)} trường (gồm trường con), ${template.fieldGroups.length} nhóm. Trường đặt tên hồ sơ: ${template.namingFieldId || 'chưa đặt'}`,
    });
  };

  return (
    <>
      <div className="flex border-b mb-4 bg-white sticky top-0 z-10">
        <button onClick={() => setActiveTab('fields')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeTab === 'fields' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}><LayoutGrid size={18}/> Trường</button>
        <button onClick={() => setActiveTab('groups')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeTab === 'groups' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}><List size={18}/> Nhóm</button>
        <button onClick={() => setActiveTab('templates')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeTab === 'templates' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-gray-500'}`}><BookOpen size={18}/> Mẫu hồ sơ</button>
      </div>
      
      {activeTab === 'fields' && (
        <div className="space-y-4" ref={scrollContainerRef}>
            <Button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm" onClick={() => openFieldEditorForNew()}>
                <Plus size={18}/> Thêm Trường Mới
            </Button>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupReorder}>
                <SortableContext items={orderedGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3 pt-4">
                        {orderedGroups.map((group) => (
                            <AccordionItem key={group.id} id={group.id} title={group.name} itemCount={group.fields.length} isOpen={(openGroupIds || []).includes(group.id)} onToggle={() => handleToggleGroup(group.id)}>
                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldReorder}>
                                    <SortableContext items={group.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                        <div className="space-y-2">
                                            {group.fields.map((field) => (
                                                <SortableListItem key={field.id} id={field.id}>
                                                    {renderFieldWithSubfields(field)}
                                                </SortableListItem>
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </AccordionItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            {ungroupedGroup.fields.length > 0 && (
                <div className="mt-4">
                 <AccordionItem id={ungroupedGroup.id} title={ungroupedGroup.name} isUngrouped={true} itemCount={ungroupedGroup.fields.length} isOpen={(openGroupIds || []).includes(ungroupedGroup.id)} onToggle={() => handleToggleGroup(ungroupedGroup.id)}>
                     <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFieldReorder}>
                        <SortableContext items={ungroupedGroup.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                                {ungroupedGroup.fields.map(field => (
                                    <SortableListItem key={field.id} id={field.id}>
                                       {renderFieldWithSubfields(field)}
                                    </SortableListItem>
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                 </AccordionItem>
                </div>
            )}
        </div>
      )}
      {activeTab === 'templates' && (
        <div className="space-y-5">
          {/* Lưu cấu trúc hiện tại */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-800 mb-2">💾 Lưu cấu trúc hiện tại thành mẫu</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTemplateName}
                onChange={e => setNewTemplateName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveCustomTemplate()}
                placeholder="Tên mẫu hồ sơ (vd: Hồ sơ mua xe, Vay BĐS...)"
                className="flex-1 px-3 py-1.5 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveCustomTemplate}>
                Lưu mẫu
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-400">Chọn mẫu để tải cấu trúc trường. <strong>Lưu ý:</strong> sẽ xóa cấu trúc hiện tại.</p>

          {/* Mẫu tùy chỉnh */}
          {(customTemplates || []).length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-2">Mẫu của tôi</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(customTemplates || []).map(template => (
                  <div key={template.id} className="border rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2 border-blue-200">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate">{template.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{template.description}</p>
                      </div>
                      <button onClick={() => handleDeleteCustomTemplate(template.id)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0" title="Xóa mẫu">
                        <Trash2 size={15}/>
                      </button>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleLoadTemplate(template)}>
                      Tải mẫu này
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bộ hồ sơ chuẩn APC gốc (1 quy trình chung) */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-green-700 mb-2">★ Bộ hồ sơ chuẩn APC</h4>
            <div className="border-2 border-green-500 rounded-xl p-3 bg-green-50 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{APC_HO_SO_CHUAN.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-800">{APC_HO_SO_CHUAN.name}</h3>
                  <p className="text-xs text-gray-500">{APC_HO_SO_CHUAN.description}</p>
                </div>
              </div>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleLoadTemplate(APC_HO_SO_CHUAN)}>
                Tải bộ hồ sơ chuẩn
              </Button>
            </div>
          </div>
          {/* Mẫu cố định (cũ, giữ để tương thích) */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 mb-2">Mẫu mặc định</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROFILE_TEMPLATES.map(template => (
                <div key={template.id} className="border rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-800">{template.name}</h3>
                      <p className="text-xs text-gray-500">{template.description}</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex gap-3 flex-wrap">
                    <span>{countFieldsDeep(template.fields)} trường</span>
                    <span>({template.fields.length} trường chính)</span>
                    <span>{template.fieldGroups.length} nhóm</span>
                    <span>Đặt tên: <code className="bg-gray-100 px-1 rounded">{template.namingFieldId}</code></span>
                  </div>
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleLoadTemplate(template)}>
                    Tải bộ hồ sơ này
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="space-y-4">
           <div className="flex flex-wrap gap-2">
             <button onClick={() => { setEditingGroup(null); setIsGroupEditorOpen(true); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm"><Plus size={18}/> Thêm Nhóm Mới</button>
             <button onClick={handleExportAllGroups} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm"><Download size={18}/> Xuất tất cả</button>
             <label className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm cursor-pointer">
               <Upload size={18}/> Nhập nhóm
               <input type="file" accept=".json" onChange={handleImportGroups} className="hidden" />
             </label>
             <button onClick={handleCleanupOrphanData} className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-sm" title="Xóa các dữ liệu rác không còn liên kết với trường nào"><Sparkles size={18}/> Dọn rác</button>
           </div>
           <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupReorder}>
               <SortableContext items={(fieldGroups || []).map(g => g.id)} strategy={verticalListSortingStrategy}>
                   <div className="space-y-2">
                    {(fieldGroups || []).map((group) => (
                        <SortableListItem key={group.id} id={group.id}>
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border w-full shadow-sm">
                            <div><p className="font-semibold">{group.name} <span className="text-sm text-gray-500 font-mono">({group.id})</span></p></div>
                            <div className="flex items-center gap-2">
                               <button onClick={() => handleExportSingleGroup(group)} className="p-1.5 text-green-600 hover:text-green-800" title="Xuất nhóm này"><Download size={16}/></button>
                               <button onClick={() => { setEditingGroup(group); setIsGroupEditorOpen(true); }} className="p-1.5 text-blue-600 hover:text-blue-800" title="Sửa nhóm"><Edit size={16}/></button>
                               <button onClick={() => handleDeleteGroup(group.id, group.name)} className="p-1.5 text-red-600 hover:text-red-800" title="Xóa nhóm"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </SortableListItem>
                    ))}
                  </div>
               </SortableContext>
           </DndContext>
        </div>
      )}

      {isFieldEditorOpen && 
        <FieldEditorModal 
            field={editingField} 
            fields={fields}
            onSave={handleSaveField} 
            onClose={closeModalAndReset} 
            fieldGroups={fieldGroups || []} 
            allFieldIds={allFieldIds}
            numberFormat={numberFormat} 
            parentId={forcedParentId}
            initialSubField={editingSubField}
        />}
      {isGroupEditorOpen && 
        <GroupEditorModal 
            group={editingGroup} 
            onSave={handleSaveGroup} 
            onClose={() => {setIsGroupEditorOpen(false); setEditingGroup(null);}}
            allFieldIds={allFieldIds.filter(id => id !== editingGroup?.id)} 
        />}
    </>
  );
};

export default FieldManagement;
