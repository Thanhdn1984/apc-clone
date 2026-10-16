/**
 * ExcelEditor.jsx - Chỉnh sửa file Excel/CSV với Placeholder
 * 
 * ⚠️ QUAN TRỌNG: Component này KHÔNG ĐƯỢC thay đổi cấu trúc file Excel:
 * - Không thêm/xóa hàng
 * - Không thêm/xóa cột  
 * - Không thay đổi format (font, màu, border, width, height...)
 * - Không merge/unmerge cell
 * - Chỉ thay đổi NỘI DUNG TEXT của cell
 * 
 * v2.4.10 - Tính năng tương tự Word PlaceholderEditor:
 * - Tải và hiển thị file Excel/CSV
 * - Tìm kiếm và thay thế text bằng placeholder
 * - Undo/Redo
 * - Kiểm tra placeholder hợp lệ
 * - Lưu file (giữ nguyên cấu trúc gốc)
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Upload, Save, Trash2, Search, Download, RefreshCw, Check, AlertCircle,
  FileSpreadsheet, Table2, Undo2, Redo2, Plus, X, CheckCircle, AlertTriangle,
  Wand2, Eye, TestTube, Play, ChevronDown, ChevronRight, Copy, Edit, Loader2
} from 'lucide-react';
import { useToast } from '../ui/use-toast.js';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';

const ExcelEditor = ({
  fields,
  inputData,
  derivedInputData,
  isElectron,
  numberFormat,
  setActiveTab,
  setTemplateFile
}) => {
  const { toast } = useToast();
  
  // ========== STATE ==========
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(null);
  const [fileContents, setFileContents] = useState({}); // {filename: {sheets, workbook, originalBuffer}}
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState('');
  const [selectedCell, setSelectedCell] = useState(null); // {row, col}
  const [editingCell, setEditingCell] = useState(null); // {row, col, value}
  
  // Undo/Redo
  const [fileHistories, setFileHistories] = useState({});
  
  // Test dialog
  const [showTestPreview, setShowTestPreview] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isTestingFile, setIsTestingFile] = useState(false);
  
  const fileInputRef = useRef(null);
  
  // ========== COMPUTED ==========
  const selectedFile = uploadedFiles[selectedFileIndex];
  const currentContent = selectedFile ? fileContents[selectedFile.name] : null;
  const currentSheetData = currentContent?.sheets?.[selectedSheet];
  
  // ========== UNDO/REDO ==========
  const canUndo = useMemo(() => {
    if (!selectedFile) return false;
    return fileHistories[selectedFile.name]?.past?.length > 0;
  }, [selectedFile, fileHistories]);
  
  const canRedo = useMemo(() => {
    if (!selectedFile) return false;
    return fileHistories[selectedFile.name]?.future?.length > 0;
  }, [selectedFile, fileHistories]);
  
  const saveToHistory = useCallback((fileName) => {
    setFileHistories(prev => {
      const existing = prev[fileName];
      if (!existing || !existing.present) return prev;
      
      return {
        ...prev,
        [fileName]: {
          past: [...(existing.past || []), JSON.parse(JSON.stringify(existing.present))].slice(-20),
          present: existing.present,
          future: []
        }
      };
    });
  }, []);
  
  const updateHistoryPresent = useCallback((fileName, newContent) => {
    setFileHistories(prev => {
      const existing = prev[fileName];
      if (!existing) return prev;
      
      return {
        ...prev,
        [fileName]: {
          ...existing,
          present: JSON.parse(JSON.stringify(newContent))
        }
      };
    });
  }, []);
  
  const handleUndo = useCallback(() => {
    if (!selectedFile) return;
    
    const history = fileHistories[selectedFile.name];
    if (!history?.past?.length) {
      toast({ title: "⚠️ Undo", description: "Không có thao tác để hoàn tác", duration: 1500 });
      return;
    }
    
    const newPast = [...history.past];
    const previous = newPast.pop();
    
    setFileHistories(prev => ({
      ...prev,
      [selectedFile.name]: {
        past: newPast,
        present: previous,
        future: [history.present, ...(history.future || [])]
      }
    }));
    
    if (previous) {
      setFileContents(prev => ({
        ...prev,
        [selectedFile.name]: JSON.parse(JSON.stringify(previous))
      }));
    }
    
    toast({ title: "↩️ Undo", description: "Đã hoàn tác thao tác", duration: 1500 });
  }, [selectedFile, fileHistories, toast]);
  
  const handleRedo = useCallback(() => {
    if (!selectedFile) return;
    
    const history = fileHistories[selectedFile.name];
    if (!history?.future?.length) {
      toast({ title: "⚠️ Redo", description: "Không có thao tác để làm lại", duration: 1500 });
      return;
    }
    
    const newFuture = [...history.future];
    const next = newFuture.shift();
    
    setFileHistories(prev => ({
      ...prev,
      [selectedFile.name]: {
        past: [...(history.past || []), history.present],
        present: next,
        future: newFuture
      }
    }));
    
    if (next) {
      setFileContents(prev => ({
        ...prev,
        [selectedFile.name]: JSON.parse(JSON.stringify(next))
      }));
    }
    
    toast({ title: "↪️ Redo", description: "Đã làm lại thao tác", duration: 1500 });
  }, [selectedFile, fileHistories, toast]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  // ========== FILE UPLOAD ==========
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setIsProcessing(true);
    
    for (const file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        toast({
          title: "Lỗi",
          description: `File "${file.name}" không phải file Excel/CSV`,
          variant: "destructive"
        });
        continue;
      }
      
      try {
        // Dynamic import xlsx
        const XLSX = (await import('xlsx')).default;
        
        // Read file
        const arrayBuffer = await file.arrayBuffer();
        
        // Parse workbook - QUAN TRỌNG: giữ nguyên format
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array',
          cellStyles: true,      // Giữ styles
          cellFormula: true,     // Giữ formula
          cellDates: true,       // Giữ dates
          cellNF: true,          // Giữ number format
          sheetStubs: true,      // Giữ empty cells
          bookVBA: true,         // Giữ VBA
          bookImages: true,      // Giữ images
          bookLinks: true,       // Giữ external links
          bookProps: true,       // Giữ document props
          bookSheets: true,      // Giữ hidden sheets
          bookDeps: true,        // Giữ dependencies
          password: ''           // Support password protected
        });
        
        // Extract sheets data (CHỈ ĐỌC, không modify structure)
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Get range
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          
          // Convert to array of arrays (giữ nguyên vị trí)
          const data = [];
          for (let r = range.s.r; r <= range.e.r; r++) {
            const row = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cellAddress = XLSX.utils.encode_cell({ r, c });
              const cell = worksheet[cellAddress];
              row.push({
                address: cellAddress,
                value: cell?.v ?? '',           // Giá trị gốc
                displayValue: cell?.w ?? (cell?.v ?? ''), // Giá trị hiển thị
                formula: cell?.f ?? null,       // Formula nếu có
                type: cell?.t ?? 's',           // Type (s=string, n=number, b=boolean, d=date)
                style: cell?.s ?? null,         // Style reference
                originalCell: cell              // Giữ nguyên cell object gốc
              });
            }
            data.push(row);
          }
          
          sheets[sheetName] = {
            data,
            range: worksheet['!ref'],
            merges: worksheet['!merges'] || [],    // Giữ merge info
            cols: worksheet['!cols'] || [],        // Giữ column widths
            rows: worksheet['!rows'] || [],        // Giữ row heights
            // Không lưu worksheet để tiết kiệm memory, sẽ rebuild khi save
          };
        });
        
        const fileInfo = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          originalBuffer: arrayBuffer,
          type: ext
        };
        
        const content = {
          sheets,
          workbook, // Giữ workbook gốc để rebuild
          sheetNames: workbook.SheetNames,
          originalBuffer: arrayBuffer
        };
        
        setUploadedFiles(prev => {
          const existingIndex = prev.findIndex(f => f.name === file.name);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = fileInfo;
            return updated;
          }
          return [...prev, fileInfo];
        });
        
        setFileContents(prev => ({
          ...prev,
          [file.name]: content
        }));
        
        // Initialize history
        setFileHistories(prev => ({
          ...prev,
          [file.name]: {
            past: [],
            present: JSON.parse(JSON.stringify(content)),
            future: []
          }
        }));
        
        // Auto-select
        if (uploadedFiles.length === 0) {
          setSelectedFileIndex(0);
          setSelectedSheet(workbook.SheetNames[0]);
        }
        
        toast({
          title: "✅ Đã tải file",
          description: `${file.name} - ${workbook.SheetNames.length} sheet`
        });
        
      } catch (error) {
        console.error('Error processing Excel file:', error);
        toast({
          title: "Lỗi xử lý file",
          description: error.message,
          variant: "destructive"
        });
      }
    }
    
    setIsProcessing(false);
    e.target.value = '';
  };
  
  // ========== CELL EDITING ==========
  const handleCellClick = (rowIndex, colIndex) => {
    setSelectedCell({ row: rowIndex, col: colIndex });
  };
  
  const handleCellDoubleClick = (rowIndex, colIndex) => {
    if (!currentSheetData) return;
    const cell = currentSheetData.data[rowIndex]?.[colIndex];
    if (!cell) return;
    
    setEditingCell({
      row: rowIndex,
      col: colIndex,
      value: String(cell.displayValue ?? cell.value ?? '')
    });
  };
  
  const handleCellChange = (newValue) => {
    setEditingCell(prev => prev ? { ...prev, value: newValue } : null);
  };
  
  const handleCellSave = () => {
    if (!editingCell || !selectedFile || !selectedSheet) return;
    
    const { row, col, value } = editingCell;
    
    // Save to history BEFORE change
    saveToHistory(selectedFile.name);
    
    // Update cell value - CHỈ THAY ĐỔI NỘI DUNG, không thay đổi cấu trúc
    setFileContents(prev => {
      const content = prev[selectedFile.name];
      if (!content) return prev;
      
      const newSheets = { ...content.sheets };
      const sheetData = { ...newSheets[selectedSheet] };
      const newData = sheetData.data.map((r, ri) => 
        ri === row 
          ? r.map((c, ci) => ci === col ? {
              ...c,
              value: value,
              displayValue: value,
              // GIỮ NGUYÊN: formula, type, style, originalCell reference
            } : c)
          : r
      );
      
      sheetData.data = newData;
      newSheets[selectedSheet] = sheetData;
      
      const newContent = { ...content, sheets: newSheets };
      
      // Update history present
      updateHistoryPresent(selectedFile.name, newContent);
      
      return {
        ...prev,
        [selectedFile.name]: newContent
      };
    });
    
    setEditingCell(null);
    
    toast({
      title: "✅ Đã cập nhật cell",
      description: `${currentSheetData.data[row][col].address}: "${value}"`,
      duration: 1500
    });
  };
  
  const handleCellCancel = () => {
    setEditingCell(null);
  };
  
  // ========== INSERT PLACEHOLDER ==========
  const insertPlaceholder = useCallback((fieldId) => {
    if (!selectedCell || !selectedFile || !selectedSheet) {
      toast({
        title: "Chưa chọn cell",
        description: "Vui lòng click vào cell cần chèn placeholder",
        variant: "destructive"
      });
      return;
    }
    
    const { row, col } = selectedCell;
    const cell = currentSheetData?.data[row]?.[col];
    if (!cell) return;
    
    const placeholder = `{${fieldId}}`;
    const currentValue = String(cell.displayValue ?? cell.value ?? '');
    const newValue = currentValue ? `${currentValue} ${placeholder}` : placeholder;
    
    // Save to history
    saveToHistory(selectedFile.name);
    
    // Update cell
    setFileContents(prev => {
      const content = prev[selectedFile.name];
      if (!content) return prev;
      
      const newSheets = { ...content.sheets };
      const sheetData = { ...newSheets[selectedSheet] };
      const newData = sheetData.data.map((r, ri) =>
        ri === row
          ? r.map((c, ci) => ci === col ? {
              ...c,
              value: newValue,
              displayValue: newValue
            } : c)
          : r
      );
      
      sheetData.data = newData;
      newSheets[selectedSheet] = sheetData;
      
      const newContent = { ...content, sheets: newSheets };
      updateHistoryPresent(selectedFile.name, newContent);
      
      return {
        ...prev,
        [selectedFile.name]: newContent
      };
    });
    
    toast({
      title: "✅ Đã chèn placeholder",
      description: `{${fieldId}} vào cell ${cell.address}`,
      duration: 2000
    });
  }, [selectedCell, selectedFile, selectedSheet, currentSheetData, saveToHistory, updateHistoryPresent, toast]);
  
  // ========== REPLACE TEXT WITH PLACEHOLDER ==========
  const replaceInCell = useCallback((rowIndex, colIndex, oldText, fieldId) => {
    if (!selectedFile || !selectedSheet || !currentSheetData) return;
    
    const cell = currentSheetData.data[rowIndex]?.[colIndex];
    if (!cell) return;
    
    const placeholder = `{${fieldId}}`;
    const currentValue = String(cell.displayValue ?? cell.value ?? '');
    const newValue = currentValue.replace(oldText, placeholder);
    
    if (newValue === currentValue) {
      toast({
        title: "Không tìm thấy",
        description: `"${oldText}" không có trong cell`,
        variant: "destructive"
      });
      return;
    }
    
    saveToHistory(selectedFile.name);
    
    setFileContents(prev => {
      const content = prev[selectedFile.name];
      if (!content) return prev;
      
      const newSheets = { ...content.sheets };
      const sheetData = { ...newSheets[selectedSheet] };
      const newData = sheetData.data.map((r, ri) =>
        ri === rowIndex
          ? r.map((c, ci) => ci === colIndex ? {
              ...c,
              value: newValue,
              displayValue: newValue
            } : c)
          : r
      );
      
      sheetData.data = newData;
      newSheets[selectedSheet] = sheetData;
      
      const newContent = { ...content, sheets: newSheets };
      updateHistoryPresent(selectedFile.name, newContent);
      
      return {
        ...prev,
        [selectedFile.name]: newContent
      };
    });
    
    toast({
      title: "✅ Đã thay thế",
      description: `"${oldText.substring(0, 20)}..." → {${fieldId}}`,
      duration: 2000
    });
  }, [selectedFile, selectedSheet, currentSheetData, saveToHistory, updateHistoryPresent, toast]);
  
  // ========== SAVE FILE ==========
  const saveModifiedFile = useCallback(async () => {
    if (!selectedFile || !currentContent) {
      toast({ title: "Lỗi", description: "Chưa chọn file để lưu", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const XLSX = (await import('xlsx')).default;
      
      // ⚠️ QUAN TRỌNG: Đọc lại workbook từ buffer GỐC để giữ nguyên cấu trúc
      const workbook = XLSX.read(currentContent.originalBuffer, {
        type: 'array',
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true,
        bookVBA: true,
        bookImages: true,
        bookLinks: true,
        bookProps: true,
        bookSheets: true,
        bookDeps: true
      });
      
      // CHỈ cập nhật GIÁ TRỊ cell, KHÔNG thay đổi structure
      Object.keys(currentContent.sheets).forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = currentContent.sheets[sheetName];
        
        if (!worksheet || !sheetData) return;
        
        sheetData.data.forEach((row, rowIndex) => {
          row.forEach((cell, colIndex) => {
            const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
            const originalCell = worksheet[address];
            
            // Chỉ cập nhật nếu giá trị thay đổi
            const originalValue = originalCell?.v ?? '';
            const newValue = cell.value;
            
            if (String(originalValue) !== String(newValue)) {
              if (originalCell) {
                // Cell đã tồn tại - CHỈ cập nhật value, giữ nguyên mọi thứ khác
                originalCell.v = newValue;
                originalCell.w = String(newValue);
                // Giữ nguyên: t (type), f (formula), s (style), z (number format)...
              } else if (newValue !== '' && newValue != null) {
                // Cell mới (trước đó trống) - tạo cell mới với value
                worksheet[address] = {
                  t: 's',
                  v: newValue,
                  w: String(newValue)
                };
              }
            }
          });
        });
      });
      
      // Generate file - GIỮ NGUYÊN format gốc
      const fileType = selectedFile.type || 'xlsx';
      const bookType = fileType === 'csv' ? 'csv' : (fileType === 'xls' ? 'biff8' : 'xlsx');
      
      const newBuffer = XLSX.write(workbook, {
        type: 'array',
        bookType: bookType,
        bookSST: true,      // Shared strings để file nhỏ hơn
        compression: true   // Nén
      });
      
      const mimeType = fileType === 'csv' 
        ? 'text/csv' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      const blob = new Blob([newBuffer], { type: mimeType });
      
      // Save
      if (isElectron && window.electronAPI?.saveFileDialog) {
        const result = await window.electronAPI.saveFileDialog({
          defaultPath: selectedFile.name.replace(/\.(xlsx|xls|csv)$/i, '_placeholder.$1'),
          filters: [
            { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
            { name: 'CSV Files', extensions: ['csv'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          await window.electronAPI.writeFile(result.filePath, new Uint8Array(newBuffer));
          toast({
            title: "✅ Đã lưu file",
            description: result.filePath.split(/[/\\]/).pop()
          });
        }
      } else {
        // Browser download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = selectedFile.name.replace(/\.(xlsx|xls|csv)$/i, '_placeholder.$1');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        toast({
          title: "✅ Đã tải file",
          description: link.download
        });
      }
      
    } catch (error) {
      console.error('Error saving Excel file:', error);
      toast({
        title: "Lỗi lưu file",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsProcessing(false);
  }, [selectedFile, currentContent, isElectron, toast]);
  
  // ========== TEST FILE ==========
  const testFileWithGenerator = useCallback(async () => {
    if (!selectedFile || !currentContent) {
      toast({ title: "Lỗi", description: "Chưa chọn file để test", variant: "destructive" });
      return;
    }
    
    setIsTestingFile(true);
    setTestResult(null);
    
    try {
      // Scan all cells for placeholders
      const foundPlaceholders = new Set();
      const placeholderRegex = /\{([#/]?)([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)\}/g;
      
      Object.values(currentContent.sheets).forEach(sheet => {
        sheet.data.forEach(row => {
          row.forEach(cell => {
            const text = String(cell.displayValue ?? cell.value ?? '');
            let match;
            while ((match = placeholderRegex.exec(text)) !== null) {
              foundPlaceholders.add(match[2]);
            }
          });
        });
      });
      
      // Check against fields
      const fieldIds = new Set(fields.map(f => f.id));
      fields.forEach(f => {
        if (f.subFields) {
          f.subFields.forEach(sf => {
            fieldIds.add(sf.id);
            fieldIds.add(`${f.id}.${sf.id}`);
          });
        }
      });
      
      const validPlaceholders = [];
      const invalidPlaceholders = [];
      const missingValues = [];
      
      foundPlaceholders.forEach(ph => {
        if (fieldIds.has(ph) || ph.endsWith('_in_hoa') || ph.endsWith('_bang_chu') || ph.startsWith('sum_')) {
          validPlaceholders.push(ph);
          
          const baseKey = ph.replace(/_in_hoa$|_bang_chu$|_formatted$/, '');
          const value = (derivedInputData || inputData)?.[baseKey];
          if (value === undefined || value === null || value === '') {
            missingValues.push(ph);
          }
        } else {
          invalidPlaceholders.push(ph);
        }
      });
      
      setTestResult({
        totalPlaceholders: foundPlaceholders.size,
        valid: validPlaceholders,
        invalid: invalidPlaceholders,
        missingValues,
        fileName: selectedFile.name,
        success: invalidPlaceholders.length === 0
      });
      setShowTestPreview(true);
      
    } catch (error) {
      console.error('Error testing Excel file:', error);
      setTestResult({ error: error.message });
      toast({
        title: "Lỗi test file",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsTestingFile(false);
  }, [selectedFile, currentContent, fields, inputData, derivedInputData, toast]);
  
  // ========== REMOVE FILE ==========
  const removeFile = useCallback((index) => {
    const file = uploadedFiles[index];
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileContents(prev => {
      const updated = { ...prev };
      delete updated[file.name];
      return updated;
    });
    setFileHistories(prev => {
      const updated = { ...prev };
      delete updated[file.name];
      return updated;
    });
    
    if (selectedFileIndex === index) {
      setSelectedFileIndex(uploadedFiles.length > 1 ? 0 : null);
      setSelectedSheet(null);
    }
  }, [uploadedFiles, selectedFileIndex]);
  
  // ========== RELOAD FILE ==========
  const reloadFile = useCallback(async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    
    try {
      const XLSX = (await import('xlsx')).default;
      
      const workbook = XLSX.read(selectedFile.originalBuffer, {
        type: 'array',
        cellStyles: true,
        cellFormula: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true
      });
      
      const sheets = {};
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        const data = [];
        for (let r = range.s.r; r <= range.e.r; r++) {
          const row = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cellAddress = XLSX.utils.encode_cell({ r, c });
            const cell = worksheet[cellAddress];
            row.push({
              address: cellAddress,
              value: cell?.v ?? '',
              displayValue: cell?.w ?? (cell?.v ?? ''),
              formula: cell?.f ?? null,
              type: cell?.t ?? 's',
              style: cell?.s ?? null,
              originalCell: cell
            });
          }
          data.push(row);
        }
        
        sheets[sheetName] = {
          data,
          range: worksheet['!ref'],
          merges: worksheet['!merges'] || [],
          cols: worksheet['!cols'] || [],
          rows: worksheet['!rows'] || []
        };
      });
      
      const content = {
        sheets,
        workbook,
        sheetNames: workbook.SheetNames,
        originalBuffer: selectedFile.originalBuffer
      };
      
      setFileContents(prev => ({
        ...prev,
        [selectedFile.name]: content
      }));
      
      setFileHistories(prev => ({
        ...prev,
        [selectedFile.name]: {
          past: [],
          present: JSON.parse(JSON.stringify(content)),
          future: []
        }
      }));
      
      toast({
        title: "🔄 Đã reload file",
        description: selectedFile.name
      });
      
    } catch (error) {
      console.error('Error reloading file:', error);
      toast({
        title: "Lỗi reload",
        description: error.message,
        variant: "destructive"
      });
    }
    
    setIsProcessing(false);
  }, [selectedFile, toast]);
  
  // ========== FIELD LIST ==========
  const allFields = useMemo(() => {
    const result = [];
    const processFields = (fieldList, parentName = '') => {
      if (!Array.isArray(fieldList)) return;
      fieldList.forEach(field => {
        const displayName = parentName ? `${parentName} > ${field.name}` : field.name;
        result.push({
          id: field.id,
          name: field.name,
          displayName,
          type: field.type,
          isSubField: !!parentName
        });
        if (field.subFields) {
          processFields(field.subFields, field.name);
        }
      });
    };
    processFields(fields);
    return result;
  }, [fields]);
  
  const filteredFields = useMemo(() => {
    if (!searchPlaceholder.trim()) return allFields;
    const search = searchPlaceholder.toLowerCase();
    return allFields.filter(f =>
      f.id.toLowerCase().includes(search) ||
      f.name.toLowerCase().includes(search)
    );
  }, [allFields, searchPlaceholder]);
  
  // ========== RENDER ==========
  return (
    <div className="h-full flex gap-4">
      {/* Left Panel - File List & Fields */}
      <div className="w-72 flex flex-col gap-4 flex-shrink-0">
        {/* File Upload */}
        <Card className="flex-shrink-0">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-500" />
              File Excel/CSV
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 size={16} className="mr-2 animate-spin" />
              ) : (
                <Upload size={16} className="mr-2" />
              )}
              Tải file Excel/CSV
            </Button>
            
            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={file.name}
                    onClick={() => {
                      setSelectedFileIndex(index);
                      const content = fileContents[file.name];
                      if (content?.sheetNames?.length) {
                        setSelectedSheet(content.sheetNames[0]);
                      }
                    }}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer group ${
                      selectedFileIndex === index
                        ? 'bg-emerald-100 border border-emerald-300'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <FileSpreadsheet size={14} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                    >
                      <X size={12} className="text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Sheet Tabs */}
        {currentContent?.sheetNames?.length > 1 && (
          <Card className="flex-shrink-0">
            <CardHeader className="py-2">
              <CardTitle className="text-xs text-gray-500">Sheets</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="flex flex-wrap gap-1">
                {currentContent.sheetNames.map(name => (
                  <button
                    key={name}
                    onClick={() => setSelectedSheet(name)}
                    className={`text-xs px-2 py-1 rounded ${
                      selectedSheet === name
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Field List */}
        <Card className="flex-1 overflow-hidden flex flex-col">
          <CardHeader className="py-3 flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Plus size={16} className="text-blue-500" />
              Chèn Placeholder
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchPlaceholder}
                onChange={(e) => setSearchPlaceholder(e.target.value)}
                placeholder="Tìm trường..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border rounded"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredFields.map(field => (
                <button
                  key={field.id}
                  onClick={() => insertPlaceholder(field.id)}
                  className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-blue-50 flex items-center gap-2 group"
                >
                  <code className="text-xs bg-gray-100 px-1 rounded font-mono text-blue-600">
                    {`{${field.id}}`}
                  </code>
                  <span className="text-gray-600 truncate flex-1">{field.name}</span>
                  <Copy size={12} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              
              {filteredFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Không tìm thấy trường
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content - Spreadsheet View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white rounded-t-xl shadow-sm p-2 flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </Button>
          
          <div className="w-px h-6 bg-gray-200" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={reloadFile}
            disabled={!selectedFile || isProcessing}
            title="Reload file gốc"
          >
            <RefreshCw size={16} className={isProcessing ? 'animate-spin' : ''} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={testFileWithGenerator}
            disabled={!selectedFile || isTestingFile}
            title="Kiểm tra placeholder"
          >
            {isTestingFile ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <TestTube size={16} />
            )}
            <span className="ml-1 hidden sm:inline">Test</span>
          </Button>
          
          <div className="flex-1" />
          
          <Button
            onClick={saveModifiedFile}
            disabled={!selectedFile || isProcessing}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isProcessing ? (
              <Loader2 size={16} className="mr-2 animate-spin" />
            ) : (
              <Save size={16} className="mr-2" />
            )}
            Lưu file
          </Button>
        </div>
        
        {/* Spreadsheet */}
        <div className="flex-1 bg-white rounded-b-xl shadow-sm overflow-auto">
          {!selectedFile ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-50" />
                <p>Tải file Excel/CSV để bắt đầu</p>
              </div>
            </div>
          ) : !currentSheetData ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="border-collapse text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-2 py-1 bg-gray-200 font-medium text-gray-600 w-10">
                    #
                  </th>
                  {currentSheetData.data[0]?.map((_, colIndex) => (
                    <th
                      key={colIndex}
                      className="border border-gray-300 px-2 py-1 bg-gray-200 font-medium text-gray-600 min-w-[80px]"
                    >
                      {String.fromCharCode(65 + colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentSheetData.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-2 py-1 bg-gray-100 font-medium text-gray-600 text-center">
                      {rowIndex + 1}
                    </td>
                    {row.map((cell, colIndex) => {
                      const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                      const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                      const hasPlaceholder = /\{[^}]+\}/.test(String(cell.displayValue ?? cell.value ?? ''));
                      
                      return (
                        <td
                          key={colIndex}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                          className={`border border-gray-300 px-2 py-1 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''
                          } ${hasPlaceholder ? 'bg-green-50' : ''}`}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingCell.value}
                              onChange={(e) => handleCellChange(e.target.value)}
                              onBlur={handleCellSave}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCellSave();
                                if (e.key === 'Escape') handleCellCancel();
                              }}
                              autoFocus
                              className="w-full px-1 py-0.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className={hasPlaceholder ? 'text-green-700 font-mono text-xs' : ''}>
                              {String(cell.displayValue ?? cell.value ?? '')}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Test Preview Dialog */}
      <Dialog open={showTestPreview} onOpenChange={setShowTestPreview}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube size={20} className="text-amber-500" />
              Kiểm tra Placeholder - Excel
            </DialogTitle>
            <DialogDescription>
              File: <strong>{testResult?.fileName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {testResult && !testResult.error && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{testResult.totalPlaceholders}</div>
                  <div className="text-xs text-blue-600">Tổng</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{testResult.valid?.length || 0}</div>
                  <div className="text-xs text-green-600">Hợp lệ</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${testResult.invalid?.length ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${testResult.invalid?.length ? 'text-red-600' : 'text-gray-400'}`}>
                    {testResult.invalid?.length || 0}
                  </div>
                  <div className="text-xs text-gray-600">Không hợp lệ</div>
                </div>
              </div>
              
              {/* Valid */}
              {testResult.valid?.length > 0 && (
                <div className="border rounded-lg p-3">
                  <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                    <CheckCircle size={16} />
                    Hợp lệ ({testResult.valid.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {testResult.valid.map((ph, i) => (
                      <code key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {`{${ph}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Invalid */}
              {testResult.invalid?.length > 0 && (
                <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                  <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} />
                    Không hợp lệ ({testResult.invalid.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {testResult.invalid.map((ph, i) => (
                      <code key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        {`{${ph}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Missing Values */}
              {testResult.missingValues?.length > 0 && (
                <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                  <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} />
                    Thiếu dữ liệu ({testResult.missingValues.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {testResult.missingValues.map((ph, i) => (
                      <code key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                        {`{${ph}}`}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Status */}
              <div className={`p-4 rounded-lg ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}>
                {testResult.success ? (
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} className="text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">✅ File sẵn sàng!</p>
                      <p className="text-sm text-green-600">Tất cả placeholder đều hợp lệ.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className="text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800">⚠️ Cần kiểm tra</p>
                      <p className="text-sm text-amber-600">
                        Có {testResult.invalid?.length || 0} placeholder không hợp lệ.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {testResult?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Lỗi</p>
                  <p className="text-sm text-red-600">{testResult.error}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Đóng</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExcelEditor;
