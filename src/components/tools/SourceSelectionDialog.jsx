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
import { Folder, Files, FolderPlus } from 'lucide-react';

/**
 * Source Selection Dialog - Chọn nguồn dữ liệu cho Batch Generate
 */
const SourceSelectionDialog = ({ 
  isSourceDialogOpen, 
  setIsSourceDialogOpen, 
  handleSelectSources
}) => {
  return (
    <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Folder className="h-5 w-5 text-white" />
            </div>
            <span>Chọn Nguồn Dữ Liệu</span>
          </DialogTitle>
          <DialogDescription>
            Chọn phương thức để thêm các file nguồn (.docx) cần xử lý
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <button
            onClick={() => handleSelectSources('files')}
            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-gray-200 hover:border-cyan-400 hover:bg-cyan-50/50 transition-all duration-200 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-200">
              <Files className="h-8 w-8 text-white" />
            </div>
            <span className="mt-3 font-semibold text-gray-700 group-hover:text-cyan-600">Chọn Từng File</span>
            <span className="text-xs text-gray-500 mt-1">Chọn một hoặc nhiều file .docx</span>
          </button>
          <button
            onClick={() => handleSelectSources('folder')}
            className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50/50 transition-all duration-200 group"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 group-hover:scale-105 transition-all duration-200">
              <FolderPlus className="h-8 w-8 text-white" />
            </div>
            <span className="mt-3 font-semibold text-gray-700 group-hover:text-amber-600">Chọn Thư Mục</span>
            <span className="text-xs text-gray-500 mt-1">Quét tất cả file trong thư mục</span>
          </button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Hủy</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SourceSelectionDialog;
