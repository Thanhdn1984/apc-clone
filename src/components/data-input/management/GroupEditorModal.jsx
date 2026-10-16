
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { sanitizeId } from './managementUtils.js';

const GroupEditorModal = ({ group: initialGroup, onSave, onClose, allFieldIds }) => {
    const [name, setName] = useState(initialGroup?.name || '');
    const [id, setId] = useState(initialGroup?.id || '');
    const nameInputRef = useRef(null);
    const isEditing = !!initialGroup;

    useEffect(() => {
        nameInputRef.current?.focus();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalId = isEditing ? initialGroup.id : sanitizeId(id).replace(/(docso|calc)/g, '');
        if (!name || !finalId) {
            toast.error('Tên nhóm và Mã định danh không được để trống.');
            return;
        }
        if (!isEditing && allFieldIds.includes(finalId)) {
            toast.error('Lỗi: Mã định danh (ID) này đã tồn tại. Vui lòng chọn một ID khác.');
            return;
        }
        onSave({ name, id: finalId });

        if (isEditing) {
            onClose();
        } else {
            setName('');
            setId('');
            nameInputRef.current?.focus();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[51]">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">{isEditing ? 'Sửa Nhóm' : 'Thêm Nhóm Mới'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Tên nhóm</label>
                <input ref={nameInputRef} type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full p-2 border rounded" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Mã định danh (ID)</label>
                <input type="text" value={id} onChange={e => setId(e.target.value)} className={`mt-1 block w-full p-2 border rounded ${isEditing ? 'bg-gray-200' : ''}`} disabled={isEditing} placeholder="ví dụ: thong_tin_ca_nhan"/>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded font-semibold">Đóng</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">Lưu</button>
            </div>
            </form>
        </div>
        </div>
    );
};

export default GroupEditorModal;
