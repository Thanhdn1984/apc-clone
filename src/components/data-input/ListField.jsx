import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import InputField from './InputField';

// #5: Nhận thêm inputData để formula subfields có thể tham chiếu trường cha
const shouldShowSubField = (subField, item) => {
    if (!subField.showWhen) return true;
    const conditions = Array.isArray(subField.showWhen) ? subField.showWhen : [subField.showWhen];
    return conditions.every(condition => {
        const actual = item?.[condition.fieldId];
        const expected = condition.values || [condition.value];
        return expected.includes(actual);
    });
};

const firstListItem = (inputData, listId) => Array.isArray(inputData?.[listId]) ? inputData[listId][0] : null;

const buildOwnerPatch = (source, inputData) => {
    const borrower = {
        hoTen: inputData?.cn_ten_khach_hang || '',
        cccd: inputData?.cn_so_cccd || '',
        ngayCap: inputData?.cn_ngay_cap_cccd || '',
        noiCap: inputData?.cn_noi_cap_cccd || '',
        diaChi: inputData?.cn_ho_khau_thuong_tru || inputData?.cn_noi_o_hien_tai || '',
    };
    const spouse = {
        hoTen: inputData?.cn_ten_vo_chong || '',
        cccd: inputData?.cn_cccd_vo_chong || '',
        ngayCap: inputData?.cn_ngay_cap_cccd_vo_chong || '',
        noiCap: inputData?.cn_noi_cap_cccd_vo_chong || '',
        diaChi: inputData?.cn_ho_khau_thuong_tru || inputData?.cn_noi_o_hien_tai || '',
    };
    const coBorrowerItem = firstListItem(inputData, 'cn_danh_sach_dong_vay') || {};
    const coBorrower = {
        hoTen: coBorrowerItem.cn_ten_dong_vay || '',
        cccd: coBorrowerItem.cn_cccd_dong_vay || '',
        ngayCap: coBorrowerItem.cn_ngay_cap_cccd_dong_vay || '',
        noiCap: coBorrowerItem.cn_noi_cap_cccd_dong_vay || '',
        diaChi: coBorrowerItem.cn_dia_chi_dong_vay || '',
    };

    const owners = source === 'Người vay' ? [borrower]
        : source === 'Vợ/chồng người vay' ? [spouse]
        : source === 'Người vay + vợ/chồng' ? [borrower, spouse]
        : source === 'Người đồng vay / bảo lãnh' ? [coBorrower]
        : [];

    const cleanOwners = owners.filter(o => o.hoTen || o.cccd || o.diaChi);
    if (source === 'Nhập thủ công' || cleanOwners.length === 0) return {};

    const patch = { cn_so_luong_chu_so_huu_ts: String(Math.min(cleanOwners.length, 3)) };
    cleanOwners.slice(0, 3).forEach((o, idx) => {
        const n = idx + 1;
        patch[`cn_chu_so_huu_${n}_ho_ten`] = o.hoTen;
        patch[`cn_chu_so_huu_${n}_cccd`] = o.cccd;
        patch[`cn_chu_so_huu_${n}_ngay_cap_cccd`] = o.ngayCap;
        patch[`cn_chu_so_huu_${n}_noi_cap_cccd`] = o.noiCap;
        patch[`cn_chu_so_huu_${n}_dia_chi`] = o.diaChi;
    });
    return patch;
};

const ListField = ({ field, value, onListChange, numberFormat, inputData }) => {
    const [internalList, setInternalList] = useState(value || []);
    const listRef = useRef(internalList);

    useEffect(() => {
        const listValue = value || [];
        setInternalList(listValue);
        listRef.current = listValue;
    }, [value]);

    const handleInputChange = (index, subFieldId, fieldValue) => {
        const newList = internalList.map((item, i) => {
            if (i === index) {
                const base = { ...item, [subFieldId]: fieldValue };
                if (field.id === 'cn_danh_sach_tsdb' && subFieldId === 'cn_nguon_chu_so_huu_ts') {
                    return { ...base, ...buildOwnerPatch(fieldValue, inputData) };
                }
                return base;
            }
            return item;
        });
        setInternalList(newList);
        listRef.current = newList;
        // LƯU NGAY khi user type - không đợi blur!
        onListChange(field.id, newList);
    };

    const handleBlur = () => {
        // Không cần gọi onListChange nữa vì đã gọi trong handleInputChange
    };

    const handleAddItem = () => {
        const newItem = field.subFields.reduce((acc, subField) => ({ ...acc, [subField.id]: subField.defaultValue || '' }), {});
        newItem._id = `item_${Date.now()}_${Math.random()}`;
        const newList = [...internalList, newItem];
        setInternalList(newList);
        listRef.current = newList;
        onListChange(field.id, newList);
    };

    const handleDeleteItem = (index) => {
        const newList = internalList.filter((_, i) => i !== index);
        setInternalList(newList);
        listRef.current = newList;
        onListChange(field.id, newList);
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-gray-50/80">
            <h3 className="font-bold text-lg text-banking-navy">{field.name}</h3>
            {(internalList || []).map((item, index) => (
                <div key={item._id || index} className="p-4 border rounded-lg bg-white shadow-sm relative">
                    <button onClick={() => handleDeleteItem(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-600">Mục #{index + 1}</h4>
                        {/* Boolean flags hiển thị nổi bật ở header */}
                        <div className="flex items-center gap-4">
                            {field.subFields.filter(sf => sf.type === 'boolean').map(sf => (
                                <label key={sf.id} className="flex items-center gap-1.5 cursor-pointer select-none text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full">
                                    <input
                                        type="checkbox"
                                        checked={item[sf.id] === true || item[sf.id] === 'true'}
                                        onChange={(e) => handleInputChange(index, sf.id, e.target.checked)}
                                        className="w-3.5 h-3.5 cursor-pointer accent-purple-600"
                                    />
                                    {sf.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {field.subFields.filter(sf => sf.type !== 'boolean' && shouldShowSubField(sf, item)).map(subField => (
                            <InputField
                                key={subField.id}
                                field={subField}
                                value={item[subField.id]}
                                onChange={(fieldValue) => handleInputChange(index, subField.id, fieldValue)}
                                onBlur={handleBlur}
                                numberFormat={numberFormat}
                                isFormula={!!subField.formula}
                           />
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nhãn (Tags)</label>
                            <input
                                type="text"
                                value={item.tags || ''}
                                onChange={e => handleInputChange(index, 'tags', e.target.value)}
                                onBlur={handleBlur}
                                className="w-full p-2 border rounded mt-1 bg-white"
                                placeholder="VD: bên vay, bên bảo lãnh"
                            />
                        </div>
                    </div>
                </div>
            ))}
            <button onClick={handleAddItem} className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded transition-colors duration-200 text-sm">
                <Plus size={16} /> Thêm Mục
            </button>
        </div>
    );
};

export default ListField;
