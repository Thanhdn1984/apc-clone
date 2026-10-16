
import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Edit, Trash2, List, LayoutGrid, X, GripVertical, ChevronDown } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import FieldEditorModal from './management/FieldEditorModal';
import GroupEditorModal from './management/GroupEditorModal';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Reusable Sortable Item Component
const SortableListItem = ({ id, children }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center w-full">
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
                <div className="p-2 space-y-1">
                    {itemCount > 0 ? children : <p className="text-sm text-gray-500 italic px-1">Chưa có trường nào trong nhóm này.</p>}
                </div>
            )}
        </div>
    );
};

const FieldManagement = ({ 
    isEmbedded = false, isOpen, onClose,
    fields, setFields, 
    fieldGroups, setFieldGroups, 
    setInputData, numberFormat,
    openGroupIds, setOpenGroupIds,
    managementOpenListFieldIds, setManagementOpenListFieldIds // Receive new props
}) => {
  if (!isEmbedded && !isOpen) return null;

  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('fields');
  const [isFieldEditorOpen, setIsFieldEditorOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [isGroupEditorOpen, setIsGroupEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
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

  const { orderedGroups, ungroupedGroup } = useMemo(() => {
    const groupMap = (fieldGroups || []).reduce((acc, group) => ({ ...acc, [group.id]: { ...group, fields: [] } }), {});
    const ungrouped = [];

    (fields || []).forEach(field => {
      if (!field.parentId) { // Only process top-level fields for grouping
          const targetGroup = field.group && groupMap[field.group] ? groupMap[field.group].fields : ungrouped;
          targetGroup.push(field);
      }
    });
    
    Object.values(groupMap).forEach(g => {
      g.fields.sort((a, b) => (fields.findIndex(f => f.id === a.id)) - (fields.findIndex(f => f.id === b.id)));
    });
    ungrouped.sort((a, b) => (fields.findIndex(f => f.id === a.id)) - (fields.findIndex(f => f.id === b.id)));
    
    return {
      orderedGroups: (fieldGroups || []).map(g => groupMap[g.id]).filter(Boolean),
      ungroupedGroup: { id: '__ungrouped__', name: 'Trường chưa được nhóm', fields: ungrouped }
    };
  }, [fields, fieldGroups]);


  useEffect(() => {
    if (!Array.isArray(openGroupIds) && setOpenGroupIds) {
        const allIds = [
            ...orderedGroups.map(g => g.id),
            ...(ungroupedGroup.fields.length > 0 ? [ungroupedGroup.id] : [])
        ];
        setOpenGroupIds(allIds);
    }
  }, [orderedGroups, ungroupedGroup, openGroupIds, setOpenGroupIds]);

  const handleToggleGroup = (groupId) => {
    if (!setOpenGroupIds) return;
    const currentIds = Array.isArray(openGroupIds) ? openGroupIds : [];
    setOpenGroupIds(currentIds.includes(groupId) ? currentIds.filter(id => id !== groupId) : [...currentIds, groupId]);
  };

  // *** ADDED THIS FUNCTION ***
  const handleToggleListField = (fieldId) => {
    if (!setManagementOpenListFieldIds) return;
    setManagementOpenListFieldIds(prevIds => {
        const newIds = new Set(prevIds);
        if (newIds.has(fieldId)) {
            newIds.delete(fieldId);
        } else {
            newIds.add(fieldId);
        }
        return newIds;
    });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleGroupReorder = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
        setFieldGroups((items) => {
            const oldIndex = items.findIndex(g => g.id === active.id);
            const newIndex = items.findIndex(g => g.id === over.id);
            return arrayMove(items, oldIndex, newIndex);
        });
    }
  };

  const handleFieldReorder = (event) => {
      const { active, over } = event;
      if (active.id !== over.id) {
          setFields(currentFields => {
              const oldIndex = currentFields.findIndex(f => f.id === active.id);
              const newIndex = currentFields.findIndex(f => f.id === over.id);
              return arrayMove(currentFields, oldIndex, newIndex);
          });
      }
  };

  const handleSubFieldReorder = (event, parentFieldId) => {
      const { active, over } = event;
      if (active.id !== over.id) {
          setFields(currentFields => {
              const newFields = JSON.parse(JSON.stringify(currentFields));
              let parentField = null;
              
              const findParentRecursive = (fieldsToSearch) => {
                  for (const field of fieldsToSearch) {
                      if (field.id === parentFieldId) {
                          parentField = field;
                          return;
                      }
                      if (field.subFields) {
                          findParentRecursive(field.subFields);
                      }
                  }
              };
              findParentRecursive(newFields);

              if (parentField && parentField.subFields) {
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

  const handleSaveField = (fieldData, originalId) => {
    const newFieldId = fieldData.id;
    const idToLookFor = originalId || newFieldId;
    const { parentId } = fieldData;

    let draftFields = JSON.parse(JSON.stringify(fields || []));

    const findAndRemoveRecursive = (currentFields, targetId) => {
        const index = currentFields.findIndex(f => f.id === targetId);
        if (index > -1) {
            currentFields.splice(index, 1);
            return true;
        }
        for (let field of currentFields) {
            if (field.subFields && findAndRemoveRecursive(field.subFields, targetId)) {
                return true;
            }
        }
        return false;
    };
    
    if (originalId || fields.some(f => f.id === idToLookFor)) {
       findAndRemoveRecursive(draftFields, idToLookFor);
    }

    const childData = { ...fieldData };
    delete childData.parentId;

    if (parentId) {
        let parentFound = false;
        const findAndAddRecursive = (currentFields) => {
            for (let field of currentFields) {
                if (field.id === parentId) {
                    field.subFields = field.subFields || [];
                    field.subFields.push(childData);
                    parentFound = true;
                    return;
                }
                if (field.subFields) {
                    findAndAddRecursive(field.subFields);
                }
            }
        };
        findAndAddRecursive(draftFields);
        if (!parentFound) { // Failsafe: if parent not found, add as top-level
             delete childData.parentId;
             draftFields.push(childData);
        }
    } else {
        draftFields.push(childData);
    }
    
    setFields(draftFields);

    setInputData(prevData => {
        const newData = { ...prevData };
        if (originalId && originalId !== newFieldId) {
            delete newData[originalId];
        }
        newData[newFieldId] = newData[newFieldId] ?? (fieldData.type === 'list' ? [] : '');
        return newData;
    });
    
    setIsFieldEditorOpen(false);
  };

  const handleDeleteField = (fieldId) => {
    const deleteRecursive = (fields, idToDelete) => {
        let newFields = fields.filter(f => f.id !== idToDelete);
        return newFields.map(f => {
            if (f.subFields) {
                return { ...f, subFields: deleteRecursive(f.subFields, idToDelete) };
            }
            return f;
        });
    };

    setFields(prevFields => deleteRecursive(prevFields, fieldId));

    setInputData(prevData => {
        const newData = { ...prevData };
        delete newData[fieldId];
        // Also need to remove subfields from data if any
        return newData;
    });

    toast({
        title: "Trường đã được xóa",
        description: `Trường với ID "${fieldId}" đã được xóa.`,
        variant: "destructive",
    });
  };

  const handleSaveGroup = (groupData) => {
    const isNew = !(fieldGroups || []).some(g => g.id === groupData.id);
    setFieldGroups(prev => isNew ? [...(prev || []), groupData] : prev.map(g => (g.id === groupData.id ? groupData : g)));
    setIsGroupEditorOpen(false);
  };

  const handleDeleteGroup = (groupId, groupName) => {
     setFieldGroups(prev => prev.filter(g => g.id !== groupId));
     setFields(prevFields => prevFields.map(f => {
         if (f.group === groupId) {
             return { ...f, group: null };
         }
         return f;
     }));
     toast({
        title: `Đã xóa nhóm "${groupName}"`,
        description: "Các trường thuộc nhóm này đã được chuyển thành 'chưa được nhóm'.",
    });
  };

  const openNewFieldEditor = () => { setEditingField(null); setIsFieldEditorOpen(true); };
  const openEditFieldEditor = (field) => { setEditingField(field); setIsFieldEditorOpen(true); };
  const openNewGroupEditor = () => { setEditingGroup(null); setIsGroupEditorOpen(true); };
  const openEditGroupEditor = (group) => { setEditingGroup(group); setIsGroupEditorOpen(true); };

  const getFieldTypeDisplay = (field) => {
      if (field.type === 'list') return `Danh sách (${field.subFields?.length || 0} trường con)`;
      if (field.id.startsWith('docso(')) return `Đọc số (từ '${field.id.slice(6, -1)}')`;
      if (field.id.startsWith('calc(')) return `Công thức (${field.id.slice(5, -1)})`;
      const typeNames = {text: 'Văn bản ngắn', longtext: 'Văn bản dài', number: 'Số', date: 'Ngày', currency: 'Tiền tệ'};
      return typeNames[field.type] || field.type;
  }
  
  const renderFieldWithSubfields = (field, isSubField = false) => {
    const isListOpen = field.type === 'list' && managementOpenListFieldIds?.has(field.id);

    const fieldHeader = (
      <div className={`flex items-center justify-between p-2 rounded-t-md border ${isSubField ? 'bg-gray-100' : 'bg-gray-50'} ${field.type === 'list' && isListOpen ? 'rounded-b-none' : 'rounded-b-md'}`}>
        <div className="flex-grow flex items-center">
            {field.type === 'list' && (
                 <ChevronDown size={20} className={`transform transition-transform duration-200 flex-shrink-0 mr-2 ${isListOpen ? 'rotate-180' : ''}`} />
            )}
            <div onClick={() => field.type === 'list' && handleToggleListField(field.id)} className={`w-full ${field.type === 'list' ? 'cursor-pointer' : ''}`}>
                <p className="font-semibold text-sm">{field.name} <span className="text-xs text-gray-500 font-mono">({field.id})</span></p>
                <p className="text-xs text-gray-600">{getFieldTypeDisplay(field)}</p>
            </div>
        </div>
        <div className="flex items-center gap-1 ml-4 flex-shrink-0">
            <button onClick={(e) => { e.stopPropagation(); openEditFieldEditor(field); }} className="p-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Edit size={16}/></button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }} className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
        </div>
      </div>
    );

    if (field.type === 'list') {
        return (
            <div className="w-full">
                {fieldHeader}
                {isListOpen && field.subFields && (
                    <div className="pl-6 pt-2 pb-2 space-y-2 border-l border-r border-b rounded-b-md bg-white">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleSubFieldReorder(e, field.id)}>
                            <SortableContext items={field.subFields.map(sf => sf.id)} strategy={verticalListSortingStrategy}>
                                {field.subFields.map(subField => (
                                    <SortableListItem key={subField.id} id={subField.id}>
                                        {renderFieldWithSubfields(subField, true)}
                                    </SortableListItem>
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`p-2 rounded-md border ${isSubField ? 'bg-gray-100' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold text-sm">{field.name} <span className="text-xs text-gray-500 font-mono">({field.id})</span></p>
                    <p className="text-xs text-gray-600">{getFieldTypeDisplay(field)}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => openEditFieldEditor(field)} className="p-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Edit size={16}/></button>
                    <button onClick={() => handleDeleteField(field.id)} className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                </div>
            </div>
        </div>
    );
  };

  const managementUI = (
    <>
      <div className="flex border-b mb-4">
        <button onClick={() => setActiveTab('fields')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeTab === 'fields' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}><LayoutGrid size={18}/> Quản lý Trường</button>
        <button onClick={() => setActiveTab('groups')} className={`py-2 px-4 font-semibold flex items-center gap-2 ${activeTab === 'groups' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}><List size={18}/> Quản lý Nhóm</button>
      </div>
      {activeTab === 'fields' && (
        <div>
          <button onClick={openNewFieldEditor} className="mb-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"><Plus size={18}/> Thêm Trường Mới</button>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupReorder}>
                <SortableContext items={orderedGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
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
                <div className="mt-3">
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
      {activeTab === 'groups' && (
        <div>
           <button onClick={openNewGroupEditor} className="mb-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"><Plus size={18}/> Thêm Nhóm Mới</button>
           <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupReorder}>
               <SortableContext items={(fieldGroups || []).map(g => g.id)} strategy={verticalListSortingStrategy}>
                   <div className="space-y-2">
                    {(fieldGroups || []).map((group) => (
                        <SortableListItem key={group.id} id={group.id}>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border w-full">
                            <div><p className="font-semibold text-sm">{group.name} <span className="text-xs text-gray-500 font-mono">({group.id})</span></p></div>
                            <div className="flex items-center gap-1">
                               <button onClick={() => openEditGroupEditor(group)} className="p-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full"><Edit size={16}/></button>
                               <button onClick={() => handleDeleteGroup(group.id, group.name)} className="p-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-full"><Trash2 size={16}/></button>
                            </div>
                          </div>
                        </SortableListItem>
                    ))}
                  </div>
               </SortableContext>
           </DndContext>
        </div>
      )}
    </>
  );

  const childModals = (
    <>
      {isFieldEditorOpen && 
        <FieldEditorModal 
            field={editingField} 
            fields={fields}
            onSave={handleSaveField} 
            onClose={() => setIsFieldEditorOpen(false)} 
            fieldGroups={fieldGroups || []} 
            allFieldIds={allFieldIds.filter(id => id !== editingField?.id)} 
            numberFormat={numberFormat} 
        />}
      {isGroupEditorOpen && 
        <GroupEditorModal 
            group={editingGroup} 
            onSave={handleSaveGroup} 
            onClose={() => setIsGroupEditorOpen(false)} 
            allFieldIds={allFieldIds.filter(id => id !== editingGroup?.id)} 
        />}
    </>
  );

  if (isEmbedded) {
    return <div className="p-4 h-full">{managementUI}{childModals}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-banking-navy">Quản lý Trường & Nhóm</h2>
          <button onClick={onClose} className="p-2 text-gray-600 rounded-full hover:bg-gray-200"><X size={24} /></button>
        </header>
        <main className="flex-grow overflow-y-auto bg-gray-50"><div className="p-4">{managementUI}</div></main>
      </div>
      {childModals}
    </div>
  );
};

export default FieldManagement;
