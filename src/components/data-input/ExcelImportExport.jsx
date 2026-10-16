/**
 * ExcelImportExport - Component để import/export dữ liệu từ Excel
 * v2.4.5
 */

import React, { useState, useCallback } from 'react';
import { Button } from '../ui/button.jsx';
import { FileSpreadsheet, Upload, Download, FileDown, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.jsx';
import { Label } from '../ui/label.jsx';
import { Checkbox } from '../ui/checkbox.jsx';

const ExcelImportExport = ({ 
  fields, 
  inputData, 
  onDataChange,
  savedCustomers,
  setSavedCustomers 
}) => {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState(null);
  const [suggestedMapping, setSuggestedMapping] = useState({});
  const [columnMapping, setColumnMapping] = useState({});
  const [previewData, setPreviewData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState('');

  // Reset state
  const resetState = () => {
    setExcelFile(null);
    setExcelData(null);
    setSuggestedMapping({});
    setColumnMapping({});
    setPreviewData([]);
    setImportResult(null);
    setShowAdvanced(false);
    setSelectedSheet('');
  };

  // Mở dialog chọn file Excel
  const handleSelectExcelFile = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.excel.selectFile();
      
      if (result.canceled || !result.filePaths?.length) {
        setIsLoading(false);
        return;
      }

      const filePath = result.filePaths[0];
      setExcelFile(filePath);

      // Detect mapping tự động
      const mappingResult = await window.electronAPI.excel.detectMapping(filePath, fields);
      
      if (mappingResult.success) {
        setExcelData(mappingResult);
        setSuggestedMapping(mappingResult.suggestedMapping);
        setPreviewData(mappingResult.preview?.sampleRows || []);
        setSelectedSheet(mappingResult.sheetNames?.[0] || '');
        
        // Chuyển suggested mapping thành column mapping
        const initialMapping = {};
        Object.entries(mappingResult.suggestedMapping).forEach(([fieldName, mapping]) => {
          initialMapping[fieldName] = mapping.columnIndex;
        });
        setColumnMapping(initialMapping);
        
        // Mở dialog mapping
        setIsImportDialogOpen(false);
        setIsMappingDialogOpen(true);
      } else {
        alert('Lỗi đọc file Excel: ' + (mappingResult.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error selecting Excel file:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Thực hiện import
  const handleImport = async () => {
    try {
      setIsLoading(true);
      
      // Chuyển đổi mapping thành format cần thiết
      const result = await window.electronAPI.excel.importBatch(
        excelFile, 
        columnMapping, 
        fields
      );
      
      if (result.success) {
        setImportResult({
          success: true,
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          customers: result.customers
        });
        
        // Nếu chỉ có 1 khách hàng, tự động điền vào form
        if (result.customers.length === 1) {
          const customer = result.customers[0];
          const newData = { ...inputData };
          
          Object.entries(customer).forEach(([key, value]) => {
            if (key !== '_rowIndex' && value) {
              newData[key] = value;
            }
          });
          
          onDataChange(newData);
          setIsMappingDialogOpen(false);
          resetState();
          alert(`Đã import thành công 1 khách hàng vào form!`);
        } else {
          // Nhiều khách hàng - thêm vào danh sách saved customers
          const newCustomers = result.customers.map((customer, index) => ({
            id: Date.now() + index,
            name: customer.hoTen || customer.tenKhachHang || `Khách hàng ${index + 1}`,
            data: customer,
            createdAt: new Date().toISOString()
          }));
          
          setSavedCustomers(prev => [...prev, ...newCustomers]);
          setIsMappingDialogOpen(false);
          resetState();
          alert(`Đã import thành công ${result.importedCount} khách hàng vào danh sách!`);
        }
      } else {
        alert('Lỗi import: ' + (result.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error importing:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Export dữ liệu hiện tại
  const handleExportCurrent = async () => {
    try {
      setIsLoading(true);
      
      const customers = [inputData];
      const result = await window.electronAPI.excel.exportCustomers(
        customers,
        fields,
        { 
          defaultFileName: 'du_lieu_hien_tai.xlsx',
          sheetName: 'Dữ liệu'
        }
      );
      
      if (result.success) {
        alert(`Đã export thành công ra file Excel!`);
      } else if (!result.canceled) {
        alert('Lỗi export: ' + (result.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsExportDialogOpen(false);
    }
  };

  // Export tất cả khách hàng đã lưu
  const handleExportAllCustomers = async () => {
    try {
      if (!savedCustomers || savedCustomers.length === 0) {
        alert('Chưa có khách hàng nào được lưu để export!');
        return;
      }
      
      setIsLoading(true);
      
      const customers = savedCustomers.map(c => c.data || c);
      const result = await window.electronAPI.excel.exportCustomers(
        customers,
        fields,
        { 
          defaultFileName: `danh_sach_khach_hang_${savedCustomers.length}.xlsx`,
          sheetName: 'Khách hàng'
        }
      );
      
      if (result.success) {
        alert(`Đã export thành công ${savedCustomers.length} khách hàng ra file Excel!`);
      } else if (!result.canceled) {
        alert('Lỗi export: ' + (result.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsExportDialogOpen(false);
    }
  };

  // Tạo file Excel mẫu
  const handleCreateTemplate = async () => {
    try {
      setIsLoading(true);
      
      const result = await window.electronAPI.excel.createTemplate(
        fields,
        { 
          defaultFileName: 'template_nhap_lieu.xlsx',
          sampleRows: 3
        }
      );
      
      if (result.success) {
        alert('Đã tạo file Excel mẫu thành công!');
      } else if (!result.canceled) {
        alert('Lỗi tạo template: ' + (result.error || 'Không xác định'));
      }
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Lỗi: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsExportDialogOpen(false);
    }
  };

  // Cập nhật column mapping
  const handleMappingChange = (fieldName, columnIndex) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldName]: columnIndex === '' ? undefined : parseInt(columnIndex, 10)
    }));
  };

  // Render mapping row
  const renderMappingRow = (field) => {
    const suggested = suggestedMapping[field.name];
    const currentValue = columnMapping[field.name];
    const headers = excelData?.headers || [];

    return (
      <tr key={field.id || field.name} className="border-b border-gray-200">
        <td className="py-2 px-3 text-sm font-medium text-gray-700">
          {field.label || field.name}
          {suggested && (
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
              suggested.confidence === 'high' ? 'bg-green-100 text-green-700' :
              suggested.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {suggested.confidence === 'high' ? '✓ Chính xác' :
               suggested.confidence === 'medium' ? '~ Có thể' : '? Gợi ý'}
            </span>
          )}
        </td>
        <td className="py-2 px-3">
          <select
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={currentValue !== undefined ? currentValue : ''}
            onChange={(e) => handleMappingChange(field.name, e.target.value)}
          >
            <option value="">-- Không import --</option>
            {headers.map((header, index) => (
              <option key={index} value={index}>
                {header || `Cột ${index + 1}`}
              </option>
            ))}
          </select>
        </td>
        <td className="py-2 px-3 text-sm text-gray-500">
          {currentValue !== undefined && previewData.length > 0 ? (
            <span className="text-blue-600">{previewData[0]?.[currentValue] || '(trống)'}</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {/* Nút Import */}
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
        onClick={() => setIsImportDialogOpen(true)}
        disabled={isLoading}
      >
        <Upload className="w-4 h-4" />
        Import Excel
      </Button>

      {/* Nút Export */}
      <Button
        variant="outline"
        size="sm"
        className="flex items-center gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
        onClick={() => setIsExportDialogOpen(true)}
        disabled={isLoading}
      >
        <Download className="w-4 h-4" />
        Export Excel
      </Button>

      {/* Dialog Import */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) resetState();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Import dữ liệu từ Excel
            </DialogTitle>
            <DialogDescription>
              Chọn file Excel (.xlsx, .xls, .csv) để import dữ liệu khách hàng
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 mb-2">Hướng dẫn:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Dòng đầu tiên của file Excel phải là tiêu đề cột</li>
                <li>• Các dòng tiếp theo là dữ liệu khách hàng</li>
                <li>• Hệ thống sẽ tự động nhận diện và gợi ý mapping</li>
                <li>• Bạn có thể điều chỉnh mapping trước khi import</li>
              </ul>
            </div>

            <Button
              className="w-full"
              onClick={handleSelectExcelFile}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : 'Chọn file Excel'}
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mapping */}
      <Dialog open={isMappingDialogOpen} onOpenChange={(open) => {
        setIsMappingDialogOpen(open);
        if (!open) resetState();
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Mapping cột Excel với trường dữ liệu
            </DialogTitle>
            <DialogDescription>
              Kiểm tra và điều chỉnh việc ghép nối giữa cột Excel và trường dữ liệu của ứng dụng
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {/* Sheet selector */}
            {excelData?.sheetNames?.length > 1 && (
              <div className="mb-4 flex items-center gap-2">
                <Label>Sheet:</Label>
                <select
                  className="px-2 py-1 border rounded text-sm"
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                >
                  {excelData.sheetNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Info summary */}
            {excelData && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
                <p><strong>File:</strong> {excelFile?.split(/[/\\]/).pop()}</p>
                <p><strong>Số cột:</strong> {excelData.headers?.length || 0}</p>
                <p><strong>Dữ liệu mẫu:</strong> {previewData.length} dòng</p>
              </div>
            )}

            {/* Mapping table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="py-2 px-3 text-left text-sm font-semibold text-gray-700 w-1/3">
                      Trường dữ liệu
                    </th>
                    <th className="py-2 px-3 text-left text-sm font-semibold text-gray-700 w-1/3">
                      Cột Excel
                    </th>
                    <th className="py-2 px-3 text-left text-sm font-semibold text-gray-700 w-1/3">
                      Mẫu dữ liệu
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fields.filter(f => f.type !== 'formula').map(renderMappingRow)}
                </tbody>
              </table>
            </div>

            {/* Advanced options */}
            <div className="mt-4">
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Tùy chọn nâng cao
              </button>
              
              {showAdvanced && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                  <p className="text-gray-600">
                    • Nếu file có nhiều khách hàng, dữ liệu sẽ được thêm vào danh sách "Khách hàng đã lưu"
                  </p>
                  <p className="text-gray-600">
                    • Nếu chỉ có 1 khách hàng, dữ liệu sẽ được điền trực tiếp vào form
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setIsMappingDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? 'Đang import...' : 'Import dữ liệu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Export */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Export dữ liệu ra Excel
            </DialogTitle>
            <DialogDescription>
              Chọn loại export bạn muốn thực hiện
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={handleExportCurrent}
              disabled={isLoading}
            >
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Export dữ liệu hiện tại</p>
                  <p className="text-sm text-gray-500">Xuất dữ liệu đang nhập trên form</p>
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={handleExportAllCustomers}
              disabled={isLoading || !savedCustomers?.length}
            >
              <div className="flex items-start gap-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Export tất cả khách hàng</p>
                  <p className="text-sm text-gray-500">
                    {savedCustomers?.length ? `${savedCustomers.length} khách hàng đã lưu` : 'Chưa có khách hàng nào'}
                  </p>
                </div>
              </div>
            </Button>

            <div className="border-t pt-3 mt-3">
              <Button
                variant="ghost"
                className="w-full justify-start text-left h-auto py-3"
                onClick={handleCreateTemplate}
                disabled={isLoading}
              >
                <div className="flex items-start gap-3">
                  <FileDown className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Tạo file Excel mẫu</p>
                    <p className="text-sm text-gray-500">Tải file template để nhập liệu</p>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExcelImportExport;
