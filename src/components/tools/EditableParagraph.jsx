import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { useToast } from "../../components/ui/use-toast.js";
import { removeVietnameseDiacritics } from '../../utils/toolsUtils.js';

// ============================================================================
// == EDITABLE PARAGRAPH COMPONENT (Cho phép chỉnh sửa trực tiếp)            ==
// ============================================================================
const EditableParagraph = ({ 
  paragraph, 
  index, 
  currentFileName,
  currentParagraphIndex,
  fields, 
  fieldGroups, 
  onTextChange,
  uploadedFiles,
  fileContents,
  setFileContents,
  saveToHistory,
  updateHistoryPresent,
  linkedFieldConfig,
  findAllReplacements,
  setShowReplaceConfirm,
  setPendingReplacements,
  setPendingPlaceholder,
  setPendingOldText
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(paragraph.text);
  const [showFieldMenu, setShowFieldMenu] = useState(false);
  const [searchInMenu, setSearchInMenu] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [cursorPosition, setCursorPosition] = useState({ offset: 0, selectedText: '' });
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const paragraphRef = useRef(null);

  // Sync editText with paragraph.text when it changes externally
  useEffect(() => {
    if (editText !== paragraph.text) {
      setEditText(paragraph.text);
    }
  }, [paragraph.text]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showFieldMenu && menuRef.current && !menuRef.current.contains(e.target)) {
        setShowFieldMenu(false);
        setSearchInMenu('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFieldMenu]);

  // Focus search input when menu opens
  useEffect(() => {
    if (showFieldMenu && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [showFieldMenu]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      textareaRef.current.focus();
    }
  }, [isEditing, editText]);

  // Click to start editing
  const handleClick = () => {
    setIsEditing(true);
  };

  // Handle mouse up for text selection in display mode
  const handleMouseUp = (e) => {
    if (isEditing) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString()?.trim();
    
    if (selectedText && selectedText.length > 0) {
      let matchIndex = 0;
      const textIndex = paragraph.text.indexOf(selectedText);
      if (textIndex !== -1) {
        matchIndex = textIndex;
      }
      
      try {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(e.currentTarget);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const preCaretText = preCaretRange.toString();
        const selectionStartInElement = preCaretText.length;
        
        let searchStart = Math.max(0, selectionStartInElement - 10);
        let foundIndex = paragraph.text.indexOf(selectedText, searchStart);
        if (foundIndex !== -1) {
          matchIndex = foundIndex;
        } else {
          foundIndex = paragraph.text.indexOf(selectedText);
          if (foundIndex !== -1) {
            matchIndex = foundIndex;
          }
        }
      } catch (err) {
        // Fallback
      }
      
      setCursorPosition({ offset: matchIndex, selectedText });
      setSearchInMenu('');
      setShowFieldMenu(true);
    }
  };

  // Right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    
    const selection = window.getSelection();
    const selectedText = selection?.toString()?.trim() || '';
    
    if (!isEditing) {
      if (selectedText) {
        let matchIndex = paragraph.text.indexOf(selectedText);
        if (matchIndex === -1) matchIndex = 0;
        
        try {
          const range = selection.getRangeAt(0);
          const preCaretRange = range.cloneRange();
          preCaretRange.selectNodeContents(e.currentTarget);
          preCaretRange.setEnd(range.startContainer, range.startOffset);
          const preCaretText = preCaretRange.toString();
          const selectionStartInElement = preCaretText.length;
          let searchStart = Math.max(0, selectionStartInElement - 10);
          let foundIndex = paragraph.text.indexOf(selectedText, searchStart);
          if (foundIndex !== -1) {
            matchIndex = foundIndex;
          }
        } catch (err) {
          // Fallback
        }
        
        setCursorPosition({ offset: matchIndex, selectedText });
      } else {
        setIsEditing(true);
        setTimeout(() => {
          if (textareaRef.current) {
            setCursorPosition({ offset: textareaRef.current.selectionStart || 0, selectedText: '' });
          }
        }, 50);
      }
      setSearchInMenu('');
      setShowFieldMenu(true);
      return;
    }
    
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const textareaSelectedText = start !== end ? editText.substring(start, end) : '';
      
      setCursorPosition({ offset: start, selectedText: textareaSelectedText });
      setSearchInMenu('');
      setShowFieldMenu(true);
    }
  };

  // Save changes on blur
  const handleBlur = (e) => {
    if (menuRef.current?.contains(e.relatedTarget)) return;
    
    setIsEditing(false);
    if (editText !== paragraph.text) {
      onTextChange(editText);
    }
  };

  // Handle key events
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditText(paragraph.text);
      setIsEditing(false);
    }
  };

  // Insert placeholder with auto uppercase detection
  const handleFieldSelect = (fieldId, type = 'simple') => {
    let placeholder;
    if (type === 'block-open') {
      placeholder = `{#${fieldId}}`;
    } else if (type === 'block-close') {
      placeholder = `{/${fieldId}}`;
    } else {
      placeholder = `{${fieldId}}`;
    }
    
    const oldSelectedText = cursorPosition.selectedText;
    
    // Auto detect uppercase and add _in_hoa suffix
    if (type === 'simple' && oldSelectedText) {
      const lettersOnly = oldSelectedText.replace(/[^a-zA-ZÀ-ỹ]/g, '');
      if (lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase()) {
        if (!fieldId.endsWith('_in_hoa')) {
          placeholder = `{${fieldId}_in_hoa}`;
        }
      }
    }
    
    // Check for multi-replace confirmation
    if (oldSelectedText && uploadedFiles && uploadedFiles.length > 0 && findAllReplacements) {
      const allReplacements = findAllReplacements(oldSelectedText, placeholder);
      
      if (allReplacements.length > 1) {
        const originalMatchIndex = cursorPosition.offset;
        const replacementsInCurrentPara = allReplacements.filter(r => 
          r.fileName === currentFileName && r.paragraphIndex === currentParagraphIndex
        );
        
        const markedReplacements = allReplacements.map(r => {
          const isInCurrentParagraph = r.fileName === currentFileName && 
                                       r.paragraphIndex === currentParagraphIndex;
          
          let isOriginal = false;
          if (isInCurrentParagraph) {
            if (replacementsInCurrentPara.length === 1) {
              isOriginal = true;
            } else {
              isOriginal = Math.abs(r.matchIndex - originalMatchIndex) <= 5;
            }
          }
          
          return {
            ...r,
            isOriginal,
            isInCurrentParagraph,
            selected: isOriginal ? true : r.selected
          };
        });
        
        const hasOriginalSelected = markedReplacements.some(r => r.isOriginal && r.selected);
        if (!hasOriginalSelected && replacementsInCurrentPara.length > 0) {
          const firstInCurrentPara = markedReplacements.find(r => r.isInCurrentParagraph);
          if (firstInCurrentPara) {
            firstInCurrentPara.isOriginal = true;
            firstInCurrentPara.selected = true;
          }
        }
        
        setPendingOldText(oldSelectedText);
        setPendingPlaceholder(placeholder);
        setPendingReplacements(markedReplacements);
        setShowReplaceConfirm(true);
        setShowFieldMenu(false);
        setSearchInMenu('');
        return;
      }
    }
    
    // Single replacement
    let newText;
    if (oldSelectedText) {
      newText = editText.replace(oldSelectedText, placeholder);
    } else {
      const before = editText.substring(0, cursorPosition.offset);
      const after = editText.substring(cursorPosition.offset);
      newText = before + placeholder + after;
    }
    
    setEditText(newText);
    setShowFieldMenu(false);
    setSearchInMenu('');
    onTextChange(newText);
    
    toast({
      title: "✅ Đã chèn placeholder",
      description: placeholder,
      duration: 1500
    });
    
    setIsEditing(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = cursorPosition.offset + placeholder.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);
  };

  // Flatten fields including subFields
  const flattenedFields = useMemo(() => {
    const result = [];
    const processField = (field, parentName = null, parentId = null, parentGroup = null) => {
      const hasSubFields = field.subFields && field.subFields.length > 0;
      const effectiveGroup = field.group || parentGroup;
      result.push({
        ...field,
        group: effectiveGroup,
        displayName: parentName ? `${parentName} → ${field.name}` : field.name,
        isSubField: !!parentName,
        parentId: parentId,
        hasSubFields: hasSubFields
      });
      if (hasSubFields) {
        field.subFields.forEach(sub => processField(sub, field.name, field.id, effectiveGroup));
      }
    };
    fields.forEach(f => processField(f));
    return result;
  }, [fields]);

  // Group fields by fieldGroups
  const groupedFields = useMemo(() => {
    const groups = {};
    const ungrouped = [];
    
    if (fieldGroups && fieldGroups.length > 0) {
      fieldGroups.forEach(g => {
        groups[g.id] = { name: g.name, fields: [] };
      });
    }
    
    flattenedFields.forEach(field => {
      if (field.group && groups[field.group]) {
        groups[field.group].fields.push(field);
      } else {
        ungrouped.push(field);
      }
    });
    
    return { groups, ungrouped };
  }, [flattenedFields, fieldGroups]);

  // Filter fields by search and selected group
  const filteredFields = useMemo(() => {
    const search = searchInMenu.toLowerCase().trim();
    const searchNoDiacritics = removeVietnameseDiacritics(search);
    let result = { groups: {}, ungrouped: [] };
    
    if (selectedGroup === 'all') {
      result = { groups: { ...groupedFields.groups }, ungrouped: [...groupedFields.ungrouped] };
    } else if (selectedGroup === 'ungrouped') {
      result = { groups: {}, ungrouped: [...groupedFields.ungrouped] };
    } else if (groupedFields.groups[selectedGroup]) {
      result = { groups: { [selectedGroup]: groupedFields.groups[selectedGroup] }, ungrouped: [] };
    }
    
    const matchesSearch = (text) => {
      if (!text) return false;
      const lowerText = text.toLowerCase();
      return lowerText.includes(search) || 
             removeVietnameseDiacritics(lowerText).includes(searchNoDiacritics);
    };
    
    if (search) {
      const filtered = { groups: {}, ungrouped: [] };
      
      filtered.ungrouped = result.ungrouped.filter(f => 
        matchesSearch(f.name) || matchesSearch(f.id)
      );
      
      Object.entries(result.groups).forEach(([groupId, group]) => {
        const matchedFields = group.fields.filter(f => 
          matchesSearch(f.name) || matchesSearch(f.id)
        );
        if (matchedFields.length > 0) {
          filtered.groups[groupId] = { name: group.name, fields: matchedFields };
        }
      });
      
      return filtered;
    }
    
    return result;
  }, [groupedFields, searchInMenu, selectedGroup]);

  // Highlight placeholders in text
  const renderHighlightedText = (text) => {
    const selectedText = showFieldMenu && cursorPosition.selectedText ? cursorPosition.selectedText : null;
    const selectionOffset = selectedText ? cursorPosition.offset : -1;
    
    let textParts = [text];
    if (selectedText && selectionOffset >= 0) {
      const before = text.substring(0, selectionOffset);
      const selection = text.substring(selectionOffset, selectionOffset + selectedText.length);
      const after = text.substring(selectionOffset + selectedText.length);
      
      if (selection === selectedText) {
        textParts = [
          { type: 'text', content: before },
          { type: 'selection', content: selection },
          { type: 'text', content: after }
        ];
      }
    }
    
    const renderWithPlaceholders = (content, keyPrefix = '') => {
      const parts = content.split(/(\{[#/]?[^}]+\})/g);
      return parts.map((part, i) => {
        if (part.match(/^\{#[^}]+\}$/)) {
          return (
            <span key={`${keyPrefix}${i}`} className="bg-green-200 text-green-800 px-1 rounded font-mono text-sm">
              {part}
            </span>
          );
        } else if (part.match(/^\{\/[^}]+\}$/)) {
          return (
            <span key={`${keyPrefix}${i}`} className="bg-red-200 text-red-800 px-1 rounded font-mono text-sm">
              {part}
            </span>
          );
        } else if (part.match(/^\{[^}]+\}$/)) {
          return (
            <span key={`${keyPrefix}${i}`} className="bg-yellow-200 text-yellow-800 px-1 rounded font-mono text-sm">
              {part}
            </span>
          );
        }
        return part;
      });
    };
    
    if (Array.isArray(textParts) && textParts[0]?.type) {
      return textParts.map((part, idx) => {
        if (part.type === 'selection') {
          return (
            <span key={`sel-${idx}`} className="bg-blue-200 ring-2 ring-blue-400 rounded px-0.5">
              {renderWithPlaceholders(part.content, `sel-${idx}-`)}
            </span>
          );
        }
        return <React.Fragment key={`part-${idx}`}>{renderWithPlaceholders(part.content, `part-${idx}-`)}</React.Fragment>;
      });
    }
    
    return renderWithPlaceholders(text);
  };

  const totalFields = Object.values(filteredFields.groups).reduce((sum, g) => sum + g.fields.length, 0) 
    + filteredFields.ungrouped.length;

  const groupOptions = useMemo(() => {
    const options = [{ id: 'all', name: 'Tất cả' }];
    
    if (fieldGroups && fieldGroups.length > 0) {
      fieldGroups.forEach(g => {
        if (groupedFields.groups[g.id]?.fields?.length > 0) {
          options.push({ id: g.id, name: g.name });
        }
      });
    }
    
    if (groupedFields.ungrouped.length > 0) {
      options.push({ id: 'ungrouped', name: 'Khác' });
    }
    
    return options;
  }, [fieldGroups, groupedFields]);

  return (
    <div className="group relative">
      <span className="absolute -left-8 top-1 text-xs text-gray-300 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
        {index + 1}
      </span>
      
      {!isEditing ? (
        <div
          ref={paragraphRef}
          onClick={handleClick}
          onMouseUp={handleMouseUp}
          onContextMenu={handleContextMenu}
          className={`leading-relaxed px-3 py-2 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 transition-all cursor-text min-h-[2.5rem] whitespace-pre-wrap select-text ${
            paragraph.isEmpty ? 'text-gray-300 italic' : 'text-gray-800'
          }`}
        >
          {paragraph.isEmpty ? '(dòng trống)' : renderHighlightedText(paragraph.text)}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          className="w-full text-gray-800 leading-relaxed px-3 py-2 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none overflow-hidden"
          style={{ minHeight: '2.5rem' }}
        />
      )}

      {showFieldMenu && (
        <div 
          ref={menuRef}
          className="fixed z-50 bg-white border shadow-2xl rounded-xl overflow-hidden w-80"
          style={{ right: 20, top: 120 }}
        >
          <div className="px-3 py-2 bg-gradient-to-r from-slate-800 to-indigo-900 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">
                {cursorPosition.selectedText 
                  ? `🔄 Thay: "${cursorPosition.selectedText.substring(0, 15)}${cursorPosition.selectedText.length > 15 ? '...' : ''}"` 
                  : '📌 Chèn placeholder'}
              </span>
              <button 
                onClick={() => { setShowFieldMenu(false); setSearchInMenu(''); }}
                className="p-1 text-gray-300 hover:text-white hover:bg-white/20 rounded"
              >
                <X size={16} />
              </button>
            </div>
            
            {cursorPosition.selectedText && uploadedFiles && uploadedFiles.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-cyan-300 mb-2 bg-white/10 px-2 py-1.5 rounded">
                <AlertCircle size={14} />
                <span>Tìm thấy {uploadedFiles.length} file - Sẽ xác nhận trước khi thay thế hàng loạt</span>
              </div>
            )}
            
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm trường..."
                value={searchInMenu}
                onChange={(e) => setSearchInMenu(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {groupOptions.length > 2 && (
              <div className="flex flex-wrap gap-1">
                {groupOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedGroup(opt.id)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-all ${
                      selectedGroup === opt.id
                        ? 'bg-cyan-400 text-slate-900'
                        : 'bg-white/20 text-gray-200 hover:bg-white/30'
                    }`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {totalFields === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                Không tìm thấy trường nào
              </div>
            ) : (
              <>
                {Object.entries(filteredFields.groups).map(([groupId, group]) => (
                  group.fields.length > 0 && (
                    <div key={groupId}>
                      <div className="px-3 py-1.5 bg-gray-100 text-xs font-semibold text-gray-500 sticky top-0">
                        📁 {group.name}
                      </div>
                      {group.fields.map(field => (
                        <div key={field.id} className="border-b border-gray-50 last:border-0">
                          <button
                            onClick={() => handleFieldSelect(field.id, 'simple')}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between group/item transition-colors"
                          >
                            <span className="truncate font-medium text-gray-700 group-hover/item:text-blue-600">
                              {field.isSubField && <span className="text-gray-400">↳ </span>}
                              {field.displayName || field.name}
                            </span>
                            <code className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded group-hover/item:bg-blue-100 group-hover/item:text-blue-600">
                              {`{${field.id}}`}
                            </code>
                          </button>
                          {field.hasSubFields && (
                            <div className="flex gap-1 px-3 pb-2">
                              <button
                                onClick={() => handleFieldSelect(field.id, 'block-open')}
                                className="flex-1 text-xs py-1 px-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors font-mono"
                              >
                                {`{#${field.id}}`}
                              </button>
                              <button
                                onClick={() => handleFieldSelect(field.id, 'block-close')}
                                className="flex-1 text-xs py-1 px-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors font-mono"
                              >
                                {`{/${field.id}}`}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ))}
                
                {filteredFields.ungrouped.length > 0 && (
                  <div>
                    {Object.keys(filteredFields.groups).length > 0 && (
                      <div className="px-3 py-1.5 bg-gray-100 text-xs font-semibold text-gray-500 sticky top-0">
                        📋 Khác
                      </div>
                    )}
                    {filteredFields.ungrouped.map(field => (
                      <div key={field.id} className="border-b border-gray-50 last:border-0">
                        <button
                          onClick={() => handleFieldSelect(field.id, 'simple')}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm flex items-center justify-between group/item transition-colors"
                        >
                          <span className="truncate font-medium text-gray-700 group-hover/item:text-blue-600">
                            {field.isSubField && <span className="text-gray-400">↳ </span>}
                            {field.displayName || field.name}
                          </span>
                          <code className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded group-hover/item:bg-blue-100 group-hover/item:text-blue-600">
                            {`{${field.id}}`}
                          </code>
                        </button>
                        {field.hasSubFields && (
                          <div className="flex gap-1 px-3 pb-2">
                            <button
                              onClick={() => handleFieldSelect(field.id, 'block-open')}
                              className="flex-1 text-xs py-1 px-2 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors font-mono"
                            >
                              {`{#${field.id}}`}
                            </button>
                            <button
                              onClick={() => handleFieldSelect(field.id, 'block-close')}
                              className="flex-1 text-xs py-1 px-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors font-mono"
                            >
                              {`{/${field.id}}`}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-3 py-2 bg-slate-100 border-t text-xs text-gray-500">
            <p>💡 <strong>Bôi đen text</strong> hoặc <strong>click chuột phải</strong> để chèn</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableParagraph;
