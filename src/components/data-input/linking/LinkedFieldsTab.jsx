
import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronDown, Edit, AlertTriangle } from 'lucide-react';
import { useToast } from "../../ui/use-toast.js";
import LinkEditorModal from './LinkEditorModal.jsx';

const LinkedFieldsTab = ({ fields, linkedFieldConfig, setLinkedFieldConfig, fieldGroups }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [openGroupIds, setOpenGroupIds] = useState(new Set());
  const { toast } = useToast();

  const { groups = [] } = linkedFieldConfig || {};

  const allFlattenedFields = useMemo(() => {
    const flattened = [];
    (fields || []).forEach(field => {
      if (field.type === 'list') {
        (field.subFields || []).forEach(subField => {
          flattened.push({ 
            id: `${field.id}.${subField.id}`, 
            name: `${field.name} -> ${subField.name}`,
            group: field.group
          });
        });
      } else {
        flattened.push({ 
          id: field.id, 
          name: field.name,
          group: field.group
        });
      }
    });
    return flattened;
  }, [fields]);

  const handleOpenEditorForNew = () => {
    setEditingGroup(null);
    setIsEditorOpen(true);
  };

  const handleOpenEditorForEdit = (group) => {
    setEditingGroup(group);
    setIsEditorOpen(true);
  };

  const handleSaveGroup = (groupToSave) => {
    setLinkedFieldConfig(prev => {
        const existingGroups = prev?.groups ?? [];
        const isUpdating = existingGroups.some(g => g.id === groupToSave.id);
        const updatedGroups = isUpdating
            ? existingGroups.map(g => g.id === groupToSave.id ? groupToSave : g)
            : [...existingGroups, groupToSave];
        return { ...prev, groups: updatedGroups };
    });
    setIsEditorOpen(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (groupId) => {
    toast({
        title: "Xác nhận xóa liên kết",
        description: `Bạn có chắc chắn muốn xóa chuỗi liên kết này không?`,
        variant: "destructive",
        action: (
            <button
                onClick={() => {
                    setLinkedFieldConfig(prev => ({
                       ...prev,
                       groups: (prev?.groups ?? []).filter(g => g.id !== groupId)
                    }));
                    toast({ title: "Thành công", description: "Chuỗi liên kết đã được xóa." });
                }}
                className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
                Xác nhận xóa
            </button>
        ),
    });
  };

  const handleGroupIgnoredCharsChange = (groupId, value) => {
      setLinkedFieldConfig(prev => ({
        ...prev,
        groups: (prev?.groups ?? []).map(g => g.id === groupId ? { ...g, ignoredChars: value } : g)
      }));
  };

  const getFieldNameById = (fieldId) => allFlattenedFields.find(f => f.id === fieldId)?.name || fieldId;

  const renderSequence = (sequence) => {
      if (!sequence) return null;
      return sequence.map((item, index) => {
          if (item.type === 'field') {
              const fieldName = getFieldNameById(item.id);
              return (
                <span key={item.key || index} title={fieldName} className="font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded-md max-w-[150px] truncate inline-block align-middle">
                    {fieldName}
                </span>
              );
          } else if (item.type === 'text') {
              return <span key={item.key || index} className="font-semibold text-green-800 bg-green-100 px-2 py-1 rounded-md">"{item.value}"</span>
          }
          return null;
      })
  }

  const handleToggleGroup = (groupId) => {
    setOpenGroupIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(groupId)) newSet.delete(groupId);
        else newSet.add(groupId);
        return newSet;
    });
  };

  return (
    <div className="p-4 h-full flex flex-col space-y-4 bg-gray-50/50">
      {isEditorOpen && 
        <LinkEditorModal 
            onClose={() => { setIsEditorOpen(false); setEditingGroup(null); }}
            onSave={handleSaveGroup}
            allFlattenedFields={allFlattenedFields}
            fieldGroups={fieldGroups}
            existingGroup={editingGroup}
        />}

      <div className="flex-shrink-0">
        <button 
            onClick={handleOpenEditorForNew}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 shadow hover:bg-blue-700"
        >
          <Plus size={18} />
          Tạo Chuỗi Liên Kết Mới
        </button>
      </div>

      <div className="flex-grow space-y-3 overflow-y-auto pr-2">
        <h3 className="text-md font-semibold text-banking-navy mb-2">Các Chuỗi Liên Kết Hiện Có</h3>
        {(groups || []).map(group => {
            let displayContent;
            if (group.sequence) {
                displayContent = renderSequence(group.sequence);
            } else if (group.fieldIds) { // Handle old format
                displayContent = (
                    <>
                        {group.fieldIds.map((id, index) => (
                            <React.Fragment key={id}>
                                <span className="font-semibold text-yellow-800 bg-yellow-100 px-2 py-1 rounded-md">{getFieldNameById(id)}</span>
                                {index < group.fieldIds.length - 1 && <span className="text-gray-400">+</span>}
                            </React.Fragment>
                        ))}
                        <span className="ml-2 flex items-center gap-1.5 text-xs font-bold text-yellow-700"><AlertTriangle size={14} /> CẦN CẬP NHẬT</span>
                    </>
                );
            } else {
                displayContent = <span className="text-red-500">Định dạng không hợp lệ</span>;
            }

            return (
              <div key={group.id} className="border rounded-lg bg-white flex flex-col shadow-sm">
                  <div className="flex justify-between items-center p-2 border-b">
                      <button onClick={() => handleToggleGroup(group.id)} className="flex items-center gap-2 text-left w-full overflow-hidden">
                          <ChevronDown size={20} className={`transform transition-transform duration-200 flex-shrink-0 ${openGroupIds.has(group.id) ? 'rotate-180' : ''}`} />
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 flex-grow overflow-hidden">
                            {displayContent}
                          </div>
                      </button>
                      <div className="flex items-center ml-2 shrink-0">
                          <button onClick={() => handleOpenEditorForEdit(group)} className="text-gray-500 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50">
                              <Edit size={16} />
                          </button>
                          <button onClick={() => handleDeleteGroup(group.id)} className="text-gray-500 hover:text-red-700 p-1.5 rounded-full hover:bg-red-50">
                              <Trash2 size={16} />
                          </button>
                      </div>
                  </div>
                  {openGroupIds.has(group.id) && (
                      <div className="p-4 bg-gray-50/70">
                          <label htmlFor={`override-${group.id}`} className="text-sm font-medium text-gray-700">Ký tự bỏ qua (áp dụng riêng cho chuỗi này):</label>
                          <input 
                              id={`override-${group.id}`}
                              type="text"
                              placeholder="Vd: ,-"
                              value={group.ignoredChars || ''}
                              onChange={(e) => handleGroupIgnoredCharsChange(group.id, e.target.value)}
                              className="mt-1 w-full p-2 border rounded-md text-sm shadow-inner"
                          />
                           <p className="text-xs text-gray-500 mt-1">Các ký tự này sẽ bị xóa khỏi giá trị của các trường trong chuỗi này TRƯỚC KHI tìm kiếm.</p>
                      </div>
                  )}
              </div>
            );
        })}
        {(groups || []).length === 0 && (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-gray-500">Chưa có chuỗi liên kết nào.</p>
            <p className="text-sm text-gray-400 mt-1">Hãy nhấn "+ Tạo Chuỗi Liên Kết Mới" để bắt đầu.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinkedFieldsTab;
