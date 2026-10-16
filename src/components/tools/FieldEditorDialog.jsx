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
import { Label } from '../../components/ui/label';
import { PlusCircle, Check } from 'lucide-react';
import { convertVietnameseToId } from '../../utils/toolsUtils.js';

/**
 * Quick Field Editor Dialog - Tạo trường mới nhanh
 */
const FieldEditorDialog = ({ 
  isFieldEditorOpen, 
  setIsFieldEditorOpen, 
  editingFieldData,
  newFieldName,
  setNewFieldName,
  newFieldId,
  setNewFieldId,
  newFieldType,
  setNewFieldType,
  newFieldGroup,
  setNewFieldGroup,
  fieldGroups,
  handleSaveNewField
}) => {
  return (
    <Dialog open={isFieldEditorOpen} onOpenChange={setIsFieldEditorOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-green-500" />
            Tạo Trường Mới Nhanh
          </DialogTitle>
          <DialogDescription>
            Tạo trường mới để sử dụng làm placeholder
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Tên trường</Label>
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => {
                setNewFieldName(e.target.value);
                // Auto-generate ID from name (Vietnamese support)
                if (!editingFieldData) {
                  setNewFieldId(convertVietnameseToId(e.target.value));
                }
              }}
              placeholder="VD: Họ tên khách hàng"
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">ID (placeholder)</Label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400">{"{"}</span>
              <input
                type="text"
                value={newFieldId}
                onChange={(e) => setNewFieldId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="ho_ten_khach_hang"
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 font-mono"
              />
              <span className="text-gray-400">{"}"}</span>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Loại trường</Label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="text">Văn bản</option>
              <option value="number">Số</option>
              <option value="date">Ngày tháng</option>
              <option value="select">Danh sách chọn</option>
            </select>
          </div>
          {fieldGroups && fieldGroups.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Nhóm (tùy chọn)</Label>
              <select
                value={newFieldGroup}
                onChange={(e) => setNewFieldGroup(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">-- Không chọn --</option>
                {fieldGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Hủy</Button>
          </DialogClose>
          <Button onClick={handleSaveNewField} className="bg-green-500 hover:bg-green-600">
            <Check size={16} className="mr-2" />
            Tạo & Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FieldEditorDialog;
