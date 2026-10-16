import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../../components/ui/dialog";
import { Button } from '../../components/ui/button';
import { 
  CheckCircle, AlertTriangle, TestTube, Play
} from 'lucide-react';

/**
 * Test Preview Dialog - Xem kết quả kiểm tra placeholder trước khi gửi sang Generator
 */
const TestPreviewDialog = ({ 
  showTestPreview, 
  setShowTestPreview, 
  testResult, 
  setActiveTab,
  confirmAndSendToGenerator
}) => {
  return (
    <Dialog open={showTestPreview} onOpenChange={setShowTestPreview}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <TestTube size={22} className="text-amber-500" />
            Kiểm tra Placeholder
          </DialogTitle>
          <DialogDescription>
            Kết quả phân tích file: <strong>{testResult?.fileName}</strong>
          </DialogDescription>
        </DialogHeader>

        {testResult && !testResult.error && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{testResult.totalPlaceholders}</div>
                <div className="text-xs text-blue-600">Tổng Placeholder</div>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{testResult.valid?.length || 0}</div>
                <div className="text-xs text-green-600">Hợp lệ</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${testResult.invalid?.length > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className={`text-2xl font-bold ${testResult.invalid?.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {testResult.invalid?.length || 0}
                </div>
                <div className={`text-xs ${testResult.invalid?.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>Không hợp lệ</div>
              </div>
            </div>

            {/* Valid Placeholders */}
            {testResult.valid?.length > 0 && (
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
                  <CheckCircle size={16} />
                  Placeholder hợp lệ ({testResult.valid.length})
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {testResult.valid.map((ph, i) => (
                    <code key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-mono">
                      {`{${ph}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Invalid Placeholders */}
            {testResult.invalid?.length > 0 && (
              <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                <h4 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} />
                  Placeholder KHÔNG hợp lệ ({testResult.invalid.length})
                </h4>
                <p className="text-xs text-red-600 mb-2">Các placeholder này có vấn đề cần kiểm tra:</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {testResult.invalid.map((ph, i) => {
                    // Detect XML markup or GUID issues
                    const isXmlMarkup = ph.includes('<') || ph.includes('>') || ph.includes('w:');
                    const isGuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}/.test(ph);
                    const isSplitRuns = ph.includes('</w:t>') || ph.includes('<w:r');
                    
                    return (
                      <div key={i} className="relative group">
                        <code className={`text-xs px-2 py-1 rounded font-mono ${
                          isXmlMarkup || isGuid || isSplitRuns 
                            ? 'bg-purple-100 text-purple-700 border border-purple-300' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {isXmlMarkup || isSplitRuns 
                            ? `{${ph.substring(0, 30)}${ph.length > 30 ? '...' : ''}}` 
                            : `{${ph}}`}
                        </code>
                        {(isXmlMarkup || isGuid || isSplitRuns) && (
                          <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 w-64 -top-2 left-full ml-2">
                            {isGuid ? '⚠️ GUID từ Word bookmark - Không phải placeholder' : '⚠️ Placeholder bị chia runs - Cần fix trong Word'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Hướng dẫn fix XML markup issues */}
                {testResult.invalid.some(ph => ph.includes('<') || ph.includes('>') || /^[0-9a-fA-F]{8}-/.test(ph)) && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <p className="font-semibold text-purple-800 text-sm mb-2">🔧 Cách sửa trong Word</p>
                    <p className="text-xs text-purple-700">
                      Mở file Word gốc, tìm các placeholder bị lỗi và gõ lại chúng hoàn chỉnh.
                      GUID từ bookmark cần được xóa trong Word.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Missing Values */}
            {testResult.missingValues?.length > 0 && (
              <div className="border border-amber-200 rounded-lg p-3 bg-amber-50">
                <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} />
                  Thiếu dữ liệu ({testResult.missingValues.length})
                </h4>
                <p className="text-xs text-amber-600 mb-2">Các trường chưa có giá trị trong tab Nhập Dữ Liệu:</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {testResult.missingValues.map((ph, i) => (
                    <code key={i} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-mono">
                      {`{${ph}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Status Message */}
            <div className={`p-4 rounded-lg ${
              testResult.success 
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
                : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
            }`}>
              {testResult.success ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">✅ File sẵn sàng!</p>
                    <p className="text-sm text-green-600">Tất cả placeholder đều hợp lệ. Bạn có thể gửi sang tab Tạo File.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <AlertTriangle size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-800">⚠️ Cần kiểm tra lại</p>
                    <p className="text-sm text-amber-600">
                      Có {testResult.invalid?.length || 0} placeholder không hợp lệ. 
                      File vẫn có thể tạo nhưng các placeholder này sẽ không được thay thế.
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
                <p className="font-semibold text-red-800">❌ Lỗi</p>
                <p className="text-sm text-red-600">{testResult.error}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-4 gap-2">
          <DialogClose asChild>
            <Button variant="outline">Đóng</Button>
          </DialogClose>
          {testResult && !testResult.error && setActiveTab && (
            <Button 
              onClick={confirmAndSendToGenerator}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Play size={16} className="mr-2" />
              Gửi sang Tạo File
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestPreviewDialog;
