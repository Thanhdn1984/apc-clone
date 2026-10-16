
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, Search, Trash2, FilePlus, Download } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "../ui/use-toast.js";

const COMMON_FIELD_ALIASES = {
    borrowerFullName: ['cn_ten_khach_hang', 'cc_ten_khach_hang_vay', 'tc_ten_khach_hang'],
    borrowerIdNumber: ['cn_so_cccd', 'cc_cccd_ben_vay', 'tc_so_cccd'],
    borrowerIdIssueDate: ['cn_ngay_cap_cccd', 'cc_ngay_cap_cccd_ben_vay', 'tc_ngay_cap_cccd'],
    borrowerIdIssuePlace: ['cn_noi_cap_cccd', 'cc_noi_cap_cccd_ben_vay', 'tc_noi_cap_cccd'],
    borrowerBirthDate: ['cn_ngay_sinh', 'cc_ngay_sinh_ben_vay', 'tc_ngay_sinh'],
    borrowerGender: ['cn_gioi_tinh', 'cc_gioi_tinh_ben_vay', 'tc_gioi_tinh'],
    borrowerAddress: ['cn_ho_khau_thuong_tru', 'cn_noi_o_hien_tai', 'cc_dia_chi_ben_vay', 'tc_dia_chi_thuong_tru', 'tc_dia_chi_lien_he'],
    borrowerPhone: ['cn_so_dien_thoai', 'cc_sdt_ben_vay', 'tc_so_dien_thoai'],
    borrowerEmail: ['cn_email', 'tc_email'],
    borrowerJob: ['cn_nghe_nghiep', 'tc_nghe_nghiep'],
    borrowerWorkplace: ['cn_noi_lam_viec', 'tc_noi_lam_viec'],
    borrowerMaritalStatus: ['cn_tinh_trang_hon_nhan', 'cc_tinh_trang_hon_nhan_ben_vay'],
    spouseFullName: ['cn_ten_vo_chong', 'cc_ten_vo_chong_ben_vay'],
    spouseIdNumber: ['cn_cccd_vo_chong', 'cc_cccd_vo_chong_ben_vay'],
    spouseIdIssueDate: ['cn_ngay_cap_cccd_vo_chong'],
    spouseIdIssuePlace: ['cn_noi_cap_cccd_vo_chong'],
    spouseBirthDate: ['cn_ngay_sinh_vo_chong'],
    spouseJob: ['cn_nghe_nghiep_vo_chong'],
    pledgorFullName: ['cc_ten_ben_cam_co'],
    pledgorIdNumber: ['cc_cccd_ben_cam_co'],
    pledgorIdIssueDate: ['cc_ngay_cap_cccd_ben_cam_co'],
    pledgorIdIssuePlace: ['cc_noi_cap_cccd_ben_cam_co'],
    pledgorBirthDate: ['cc_ngay_sinh_ben_cam_co'],
    pledgorAddress: ['cc_dia_chi_ben_cam_co'],
    pledgorPhone: ['cc_sdt_ben_cam_co'],
    pledgorMaritalStatus: ['cc_tinh_trang_hon_nhan_bcc'],
    pledgorSpouseFullName: ['cc_ten_vo_chong_bcc'],
    pledgorSpouseIdNumber: ['cc_cccd_vo_chong_bcc'],
    companyName: ['dn_ten_doanh_nghiep'],
    companyTaxCode: ['dn_ma_so_thue'],
    companyAddress: ['dn_dia_chi_tru_so'],
    companyPhone: ['dn_dien_thoai'],
    companyEmail: ['dn_email'],
    legalRepFullName: ['dn_ten_nguoi_dai_dien'],
    legalRepIdNumber: ['dn_cccd_dai_dien'],
    legalRepIdIssueDate: ['dn_ngay_cap_cccd_dai_dien'],
    legalRepIdIssuePlace: ['dn_noi_cap_cccd_dai_dien'],
    legalRepBirthDate: ['dn_ngay_sinh_dai_dien'],
    legalRepGender: ['dn_gioi_tinh_dai_dien'],
    legalRepAddress: ['dn_ho_khau_dai_dien', 'dn_dia_chi_lh_dai_dien'],
    legalRepPhone: ['dn_sdt_dai_dien'],
    authorizedRepFullName: ['dn_ten_nguoi_uy_quyen'],
    authorizedRepIdNumber: ['dn_cccd_uy_quyen'],
    authorizedRepIdIssueDate: ['dn_ngay_cap_cccd_uq'],
    authorizedRepIdIssuePlace: ['dn_noi_cap_cccd_uq'],
    authorizedRepAddress: ['dn_dia_chi_uy_quyen'],
};

const FIELD_TO_COMMON_KEY = Object.entries(COMMON_FIELD_ALIASES).reduce((acc, [key, ids]) => {
    ids.forEach(id => { acc[id] = key; });
    return acc;
}, {});

const isBlankValue = (value) => value === undefined || value === null || value === '';
const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const defaultValueForField = (field) => {
    if (field?.type === 'list') return [];
    if (field?.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') return cloneValue(field.defaultValue);
    return '';
};

const ProfileManager = ({ 
    inputData,
    savedCustomers,
    setSavedCustomers,
    setInputData,
    fields,
    setFields,
    fieldGroups,
    setFieldGroups,
    namingFieldId,
}) => {
    const [customerName, setCustomerName] = useState('');

    // Auto-fill customer name from namingFieldId when inputData changes
    useEffect(() => {
        if (!namingFieldId || !inputData) return;
        const value = inputData[namingFieldId];
        if (value && typeof value === 'string' && value.trim()) {
            setCustomerName(value.trim());
        }
    }, [namingFieldId, inputData?.[namingFieldId]]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    
    const { toast } = useToast();
    const customerNameInputRef = useRef(null);
    const searchContainerRef = useRef(null);
    const resultsContainerRef = useRef(null); 
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const safeSavedCustomers = useMemo(() => Array.isArray(savedCustomers) ? savedCustomers : [], [savedCustomers]);
    

    const createEmptyDataForCurrentTemplate = () => {
        const emptyData = {};
        const collect = (fieldList) => {
            (fieldList || []).forEach(field => {
                if (!field?.id) return;
                if (field.type === 'list') {
                    emptyData[field.id] = [];
                } else if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
                    emptyData[field.id] = field.defaultValue;
                } else {
                    emptyData[field.id] = '';
                }
                if (field.subFields) collect(field.subFields);
            });
        };
        collect(fields);
        return emptyData;
    };

    const handleNewProfile = () => {
        toast({
            title: "Xác nhận tạo mới",
            description: "Chỉ xóa dữ liệu nhập tay trong mẫu hiện tại. Trường có giá trị mặc định sẽ quay về mặc định; cấu trúc trường/nhóm vẫn giữ nguyên.",
            variant: "warning",
            action: (
                <button
                    onClick={() => {
                        setInputData(createEmptyDataForCurrentTemplate());
                        setCustomerName('');
                        // Xóa các dữ liệu phiên cũ trong localStorage
                        localStorage.removeItem('dataInputTab_scrollPosition');
                        localStorage.removeItem('docxautomator_naming_settings');
                        toast({ title: "Sẵn sàng", description: "Đã xóa dữ liệu nhập tay và khôi phục giá trị mặc định của mẫu hiện tại." });
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                >
                    Xác nhận
                </button>
            ),
        });
    };

    const handleSaveCustomer = () => {
        let nameToSave = customerName.trim();
        
        if (!nameToSave && namingFieldId && inputData?.[namingFieldId]) {
            nameToSave = String(inputData[namingFieldId]).trim();
        }

        if (!nameToSave) {
            const fallbackField = fields?.find(f => ['kh_ho_ten', 'ho_ten', 'name'].includes(f.id)) || fields?.find(f => f?.type === 'text');
            if (fallbackField && inputData?.[fallbackField.id]) {
                nameToSave = String(inputData[fallbackField.id]).trim();
            }
        }

        if (!nameToSave) {
            nameToSave = `Hồ sơ ${new Date().toLocaleString('vi-VN')}`;
        }

        // --- THE FIX: Create a complete snapshot of the current state ---
        const snapshot = {
            inputData: JSON.parse(JSON.stringify(inputData)),
            fields: JSON.parse(JSON.stringify(fields)),
            fieldGroups: JSON.parse(JSON.stringify(fieldGroups))
        };
        // ----------------------------------------------------------------

        const existingCustomer = safeSavedCustomers.find(c => c.name.toLowerCase() === nameToSave.toLowerCase());
        
        if (existingCustomer) {
            toast({
                title: "Hồ sơ đã tồn tại",
                description: `Hồ sơ \"${nameToSave}\" đã có. Bạn có muốn ghi đè không?`,
                variant: "warning",
                action: (
                    <button
                        onClick={() => {
                            // Update existing customer with the full snapshot
                            setSavedCustomers(prev => prev.map(c => c.id === existingCustomer.id ? { ...c, ...snapshot } : c));
                            toast({ title: "Thành công", description: `Đã cập nhật hồ sơ \"${nameToSave}\".` });
                        }}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    >
                        Ghi đè
                    </button>
                ),
            });
        } else {
            // Create new customer with the full snapshot
            const newCustomer = { id: uuidv4(), name: nameToSave, ...snapshot };
            setSavedCustomers(prev => [newCustomer, ...prev]);
            toast({ title: "Thành công", description: `Đã lưu hồ sơ mới \"${nameToSave}\".` });
        }
        setCustomerName('');
        customerNameInputRef.current?.focus();
    };

    const buildSafeInputDataForCurrentTemplate = (customer) => {
        const sourceInputData = customer?.inputData || {};
        const sourceCommonData = {};

        Object.entries(sourceInputData).forEach(([sourceFieldId, value]) => {
            const commonKey = FIELD_TO_COMMON_KEY[sourceFieldId];
            if (commonKey && !isBlankValue(value) && sourceCommonData[commonKey] === undefined) {
                sourceCommonData[commonKey] = value;
            }
        });

        const nextInputData = {};
        const fillFromFields = (fieldList) => {
            (fieldList || []).forEach(field => {
                if (!field?.id) return;
                const exactValue = sourceInputData[field.id];
                const commonKey = FIELD_TO_COMMON_KEY[field.id];
                const aliasedValue = commonKey ? sourceCommonData[commonKey] : undefined;

                if (!isBlankValue(exactValue)) {
                    nextInputData[field.id] = cloneValue(exactValue);
                } else if (!isBlankValue(aliasedValue)) {
                    nextInputData[field.id] = cloneValue(aliasedValue);
                } else {
                    nextInputData[field.id] = defaultValueForField(field);
                }

                if (field.subFields) fillFromFields(field.subFields);
            });
        };

        fillFromFields(fields);
        return nextInputData;
    };

    const handleLoadCustomer = (e, customer) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Chỉ đồng bộ dữ liệu vào bộ hồ sơ đang mở. Không đổi fields/fieldGroups/template hiện tại.
        const safeInputData = buildSafeInputDataForCurrentTemplate(customer);
        setInputData(safeInputData);

        // Xóa session cache cũ khi load profile mới
        localStorage.removeItem('dataInputTab_scrollPosition');
        localStorage.removeItem('docxautomator_naming_settings');

        toast({ title: "Thành công", description: `Đã đồng bộ dữ liệu chung từ hồ sơ \"${customer.name}\" vào bộ hồ sơ hiện tại. Trường riêng dùng mặc định hoặc để trống.` });
        setSearchTerm('');
        setIsSearchFocused(false);
    };

    const handleDeleteCustomer = (e, customerToDelete) => {
        e.stopPropagation();
        
        toast({
            title: "Xác nhận xóa",
            description: `Bạn có chắc muốn xóa vĩnh viễn hồ sơ "${customerToDelete.name}" không?`,
            variant: "destructive",
            action: (
                 <button
                    onClick={() => {
                        setSavedCustomers(prev => prev.filter(c => c.id !== customerToDelete.id));
                        toast({ title: "Đã xóa", description: `Hồ sơ \"${customerToDelete.name}\" đã được xóa.` });
                    }}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                    Xác nhận xóa
                </button>
            ),
        });
    };

    const handleExportCustomer = (customer) => {
        
        // Chuẩn bị dữ liệu xuất
        const exportData = {
            tên_hồ_sơ: customer.name,
            ngày_xuất: new Date().toLocaleString('vi-VN'),
            dữ_liệu_khách_hàng: customer.inputData,
            cấu_hình_trường: customer.fields,
            nhóm_trường: customer.fieldGroups
        };
        
        // Tạo file JSON
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        // Tên file: HỒ_SỐ_[Tên]_[Ngày].json
        const fileName = `HỒ_SỐ_${customer.name}_${new Date().toISOString().slice(0, 10)}.json`;
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ 
            title: "✅ Xuất thành công", 
            description: `Đã xuất hồ sơ \"${customer.name}\" thành file JSON.\nTên file: ${fileName}` 
        });
    };

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) {
            return [];
        }
        
        const trimmedSearch = searchTerm.trim();
        
        // Nếu là wildcard (*.*  hoặc *) → Hiển thị TẤT CẢ hồ sơ
        if (trimmedSearch === '*.*' || trimmedSearch === '*') {
            return safeSavedCustomers;
        }
        
        // Tìm kiếm bình thường
        return safeSavedCustomers.filter(c => c.name.toLowerCase().includes(trimmedSearch.toLowerCase()));
    }, [searchTerm, safeSavedCustomers]);
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                searchContainerRef.current && !searchContainerRef.current.contains(event.target) &&
                resultsContainerRef.current && !resultsContainerRef.current.contains(event.target)
            ) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFocus = () => {
        if (searchContainerRef.current) {
            const rect = searchContainerRef.current.getBoundingClientRect();
            setDropdownPosition({ 
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setIsSearchFocused(true);
    };

    const showSearchResults = isSearchFocused && searchTerm.length > 0;

    const SearchResultsPortal = ({ children }) => {
        return createPortal(children, document.body);
    };

    return (
        <div className="flex items-center gap-3 ml-auto">
            <button 
                onClick={handleNewProfile} 
                title="Tạo hồ sơ mới (xóa form)"
                className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg h-10 transition-colors shadow-sm"
            >
                <FilePlus size={16} className="mr-2"/>
                <span>Tạo mới</span>
            </button>

            <div className="flex items-center shadow-sm rounded-lg">
                <input
                    ref={customerNameInputRef}
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveCustomer()}
                    placeholder="Lưu hồ sơ mới..."
                    className="px-3 py-2 border border-gray-300 rounded-l-lg text-sm w-48 h-10 focus:outline-none focus:ring-2 focus:ring-purple-500 border-r-0"
                />
                <button 
                    onClick={handleSaveCustomer} 
                    title="Lưu hồ sơ khách hàng"
                    className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-r-lg h-10 transition-colors"
                >
                    <Save size={16} className="mr-2"/>
                    <span>Lưu</span>
                </button>
            </div>

            <div className="relative" ref={searchContainerRef}>
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Tìm hồ sơ... (*.* = tất cả)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={handleFocus}
                    className="w-56 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm h-10 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                />
                {showSearchResults && (
                    <SearchResultsPortal>
                        <div 
                            ref={resultsContainerRef} 
                            style={{ 
                                position: 'fixed', 
                                top: `${dropdownPosition.top + 8}px`, 
                                left: `${dropdownPosition.left}px`,
                                width: `${dropdownPosition.width}px`,
                                zIndex: 99999,
                                pointerEvents: 'auto'
                            }}
                            className="bg-white border border-gray-200 rounded-lg shadow-xl max-h-80 overflow-y-auto"
                        >
                            <div className="p-2 text-xs text-gray-500 border-b">Click để tải hồ sơ</div>
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                    <div 
                                        key={customer.id} 
                                        onMouseDown={(e) => {
                                            // Check if click is not on delete button
                                            const isDeleteButton = e.target.closest('button');
                                            if (!isDeleteButton) {
                                                handleLoadCustomer(e, customer);
                                            }
                                        }}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        className="flex items-center justify-between p-3 hover:bg-purple-50 border-b last:border-b-0 transition-all active:bg-purple-100"
                                    >
                                        <span className="text-sm font-medium text-gray-800 truncate flex-1">{customer.name}</span>
                                        <div className="flex gap-1">
                                            <button 
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleExportCustomer(customer);
                                                }} 
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded-full flex-shrink-0 transition-colors"
                                                title={`Xuất hồ sơ \"${customer.name}\"`}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button 
                                                onMouseDown={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDeleteCustomer(e, customer);
                                                }} 
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-full flex-shrink-0 transition-colors"
                                                title={`Xóa hồ sơ \"${customer.name}\"`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-3 text-center text-sm text-gray-500">
                                    Không tìm thấy hồ sơ.
                                </div>
                            )}
                        </div>
                    </SearchResultsPortal>
                )}
            </div>
        </div>
    );
};

export default ProfileManager;
