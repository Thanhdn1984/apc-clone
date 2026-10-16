
import React, { useState, useMemo } from 'react';
import { useToast } from "../ui/use-toast.js";
import { Save, FolderOpen, Briefcase, Settings, Trash2, ChevronRight, AlertTriangle, Database, Upload, HardDrive } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group.jsx";
import { Input } from "../ui/input.jsx";

const DataAndSettingsTab = ({ isElectron, appData, loadStateFromPreset, numberFormat, setNumberFormat }) => {
    const { toast } = useToast();
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [pendingRestoreData, setPendingRestoreData] = useState(null);

    const handleSavePreset = async () => {
        if (!isElectron) {
            const dataToSave = {
                ...appData,
                selectedTemplateIds: Array.from(appData.selectedTemplateIds || [])
            };
            const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToSave, null, 2))}`;
            const link = document.createElement("a");
            link.href = jsonString;
            link.download = "config.json";
            link.click();
        } else {
            const result = await window.electronAPI.savePresetDialog(appData);
            if (result.success) {
                toast({ title: "Thành công", description: `Cấu hình đã được lưu tại: ${result.filePath}` });
            } else if (result.error) {
                toast({ title: "Lỗi", description: result.error, variant: "destructive" });
            }
        }
    };

    const handleLoadPreset = async () => {
        if (!isElectron) {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = readerEvent => {
                    try {
                        const content = readerEvent.target.result;
                        const parsedData = JSON.parse(content);
                        loadStateFromPreset(parsedData);
                        toast({ title: "Thành công", description: "Đã tải và áp dụng cấu hình." });
                    } catch (error) {
                        toast({ title: "Lỗi", description: "File cấu hình không hợp lệ: " + error.message, variant: "destructive" });
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        } else {
            const result = await window.electronAPI.loadPresetDialog();
            if (result.success) {
                loadStateFromPreset(result.data);
                toast({ title: "Thành công", description: "Đã tải và áp dụng cấu hình." });
            } else if (result.error) {
                toast({ title: "Lỗi", description: result.error, variant: "destructive" });
            }
        }
    };

    const handleResetApp = () => setIsResetModalOpen(true);
    const confirmReset = async () => {
        localStorage.clear();
        if (window.electronAPI) await window.electronAPI.clearCache();
        window.location.reload();
    };

    // ========== BACKUP TOÀN HỆ THỐNG ==========
    const handleFullBackup = () => {
        try {
            // Thu thập toàn bộ localStorage
            const fullBackup = {
                _meta: {
                    type: 'docugen_full_backup',
                    version: '1.0',
                    createdAt: new Date().toISOString(),
                    appVersion: window.APP_VERSION || 'unknown'
                },
                localStorage: {}
            };
            
            // Lưu tất cả keys từ localStorage
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    try {
                        const value = localStorage.getItem(key);
                        // Thử parse JSON nếu có thể
                        try {
                            fullBackup.localStorage[key] = JSON.parse(value);
                        } catch {
                            fullBackup.localStorage[key] = value;
                        }
                    } catch (e) {
                        console.warn(`Không thể backup key: ${key}`, e);
                    }
                }
            }
            
            // Tính toán thống kê
            const stats = {
                totalKeys: Object.keys(fullBackup.localStorage).length,
                customerProfiles: 0,
                configKeys: 0
            };
            
            Object.keys(fullBackup.localStorage).forEach(key => {
                if (key.startsWith('docuGenAppState_')) {
                    const data = fullBackup.localStorage[key];
                    if (data?.savedCustomers) {
                        stats.customerProfiles = data.savedCustomers.length;
                    }
                    stats.configKeys++;
                }
            });
            
            fullBackup._meta.stats = stats;
            
            // Tạo file download
            const jsonString = JSON.stringify(fullBackup, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = `DocuGen_FullBackup_${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast({ 
                title: "Backup thành công! 🎉", 
                description: `Đã sao lưu ${stats.customerProfiles} hồ sơ khách hàng và ${stats.totalKeys} cài đặt.`,
                duration: 5000
            });
        } catch (error) {
            toast({ 
                title: "Lỗi backup", 
                description: error.message, 
                variant: "destructive" 
            });
        }
    };

    // ========== RESTORE TOÀN HỆ THỐNG ==========
    const handleFullRestore = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (readerEvent) => {
                try {
                    const content = readerEvent.target.result;
                    const backupData = JSON.parse(content);
                    
                    // Validate backup file
                    if (!backupData._meta || backupData._meta.type !== 'docugen_full_backup') {
                        toast({ 
                            title: "File không hợp lệ", 
                            description: "Đây không phải file backup của DocuGen.", 
                            variant: "destructive" 
                        });
                        return;
                    }
                    
                    // Show confirmation modal
                    setPendingRestoreData(backupData);
                    setIsRestoreModalOpen(true);
                    
                } catch (error) {
                    toast({ 
                        title: "Lỗi đọc file", 
                        description: "File JSON không hợp lệ: " + error.message, 
                        variant: "destructive" 
                    });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const confirmRestore = () => {
        if (!pendingRestoreData) return;
        
        try {
            // Xóa localStorage hiện tại
            localStorage.clear();
            
            // Khôi phục từ backup
            Object.entries(pendingRestoreData.localStorage).forEach(([key, value]) => {
                try {
                    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                    localStorage.setItem(key, stringValue);
                } catch (e) {
                    console.warn(`Không thể restore key: ${key}`, e);
                }
            });
            
            toast({ 
                title: "Khôi phục thành công! 🎉", 
                description: "Ứng dụng sẽ tải lại để áp dụng dữ liệu...",
                duration: 3000
            });
            
            // Reload sau 1.5s
            setTimeout(() => {
                window.location.reload();
            }, 1500);
            
        } catch (error) {
            toast({ 
                title: "Lỗi khôi phục", 
                description: error.message, 
                variant: "destructive" 
            });
        }
        
        setIsRestoreModalOpen(false);
        setPendingRestoreData(null);
    };

    const selectedLocale = useMemo(() => numberFormat?.locale || 'vi-VN', [numberFormat]);
    
    const handleFormatChange = (newLocale) => {
        if (newLocale && newLocale !== selectedLocale) {
            setNumberFormat(prev => ({...prev, locale: newLocale }));
        }
    };

    const handleDecimalChange = (e) => {
        const value = e.target.value;
        const parsedValue = value === '' ? 0 : parseInt(value, 10);
        if (!isNaN(parsedValue) && parsedValue >= 0) {
            setNumberFormat(prev => ({ ...prev, decimalPlaces: parsedValue }));
        }
    };

    return (
        <>
            <div className="w-full flex flex-col gap-6">
                {/* ROW 1: FULL-WIDTH MERGED SETTINGS CARD */}
                <div className="bg-white p-5 rounded-lg shadow-md w-full">
                    <div className="flex items-center mb-4">
                        <Settings size={20} className="mr-3 text-banking-green" />
                        <h3 className="text-lg font-semibold text-banking-navy">Cài đặt Chung</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-10 gap-x-8 items-center">
                        {/* Left Setting: 60% width */}
                        <div className="md:col-span-6 flex justify-between items-center">
                            <div className="pr-4">
                                <h4 className="font-semibold text-gray-800 text-sm">Định dạng hàng nghìn</h4>
                                <p className="text-sm text-gray-500 mt-1">Chọn kiểu phân cách (dấu thập phân sẽ tự động được xác định).</p>
                            </div>
                            <div className="flex-shrink-0">
                                <ToggleGroup 
                                    type="single" 
                                    value={selectedLocale} 
                                    onValueChange={handleFormatChange}
                                    className="p-1 rounded-full bg-gray-100 border gap-0"
                                >
                                    <ToggleGroupItem value="vi-VN" aria-label="Định dạng Việt Nam" className="rounded-full text-sm px-3 py-1.5 data-[state=on]:bg-white data-[state=on]:shadow-sm">1.000.000,12</ToggleGroupItem>
                                    <ToggleGroupItem value="en-US" aria-label="Định dạng Hoa Kỳ" className="rounded-full text-sm px-3 py-1.5 data-[state=on]:bg-white data-[state=on]:shadow-sm">1,000,000.12</ToggleGroupItem>
                                </ToggleGroup>
                            </div>
                        </div>
                        {/* Right Setting: 40% width */}
                        <div className="md:col-span-4 flex justify-between items-center">
                             <div className="pr-4">
                                <h4 className="font-semibold text-gray-800 text-sm">Số chữ số thập phân</h4>
                                <p className="text-sm text-gray-500 mt-1">Số chữ số sau dấu phẩy cho các hàm tính toán.</p>
                            </div>
                            <div className="flex-shrink-0">
                                <Input
                                    type="number"
                                    value={numberFormat?.decimalPlaces ?? 2}
                                    onChange={handleDecimalChange}
                                    className="w-20 text-center text-sm"
                                    min="0"
                                    max="10"
                                    placeholder="2"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ROW 2: FULL SYSTEM BACKUP */}
                <div className="w-full bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 p-5 rounded-lg shadow-md">
                    <div className="flex items-center mb-2">
                        <Database size={22} className="mr-3 text-purple-600" />
                        <h3 className="text-lg font-semibold text-purple-800">🛡️ Backup Toàn Hệ Thống</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Sao lưu <strong>TOÀN BỘ</strong> dữ liệu: tất cả hồ sơ khách hàng, cấu hình trường, nhóm, liên kết và cài đặt vào một file duy nhất.
                    </p>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleFullBackup} 
                            className="flex-1 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <HardDrive size={18} className="mr-2" />
                            Tạo Backup Toàn Bộ
                        </button>
                        <button 
                            onClick={handleFullRestore} 
                            className="flex-1 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <Upload size={18} className="mr-2" />
                            Khôi Phục từ Backup
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">
                        💡 Nên backup định kỳ để tránh mất dữ liệu quan trọng
                    </p>
                </div>

                {/* ROW 3: CONFIG BACKUP AND DANGER ZONE CARDS */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Backup & Restore Card */}
                    <div className="lg:col-span-2 bg-white p-5 rounded-lg shadow-md">
                        <div className="flex items-center">
                            <Briefcase size={20} className="mr-3 text-banking-green" />
                            <h3 className="text-lg font-semibold text-banking-navy">Sao lưu Cấu Hình Hiện Tại</h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 mb-4">Lưu hoặc tải cấu hình hiện tại (trường, nhóm, cài đặt) - không bao gồm danh sách hồ sơ đã lưu.</p>
                        <div className="flex items-center gap-4">
                            <button onClick={handleSavePreset} className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm">
                                <Save size={16} className="mr-2" />Lưu Cấu Hình
                            </button>
                            <button onClick={handleLoadPreset} className="flex-1 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm">
                                <FolderOpen size={16} className="mr-2" />Tải Cấu Hình
                            </button>
                        </div>
                    </div>

                    {/* Danger Zone Card */}
                    <div className="lg:col-span-1 bg-red-50 border border-red-200 p-5 rounded-lg flex flex-col">
                        <div>
                             <h4 className="font-bold text-red-700 text-base flex items-center"><AlertTriangle size={18} className="mr-2"/>Khu vực nguy hiểm</h4>
                            <p className="text-sm text-red-600 mt-2 mb-4">Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu. <strong className="font-bold">Không thể hoàn tác.</strong></p>
                        </div>
                        <button onClick={handleResetApp} className="w-full mt-auto flex items-center justify-center bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm">
                            Reset Toàn Bộ Ứng Dụng <ChevronRight size={18} className="ml-1.5" />
                        </button>
                    </div>
                </div>
            </div>

            {isResetModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md m-4">
                        <div className='flex items-center mb-4'>
                             <div className="w-12 h-12 flex-shrink-0 bg-red-100 rounded-full flex items-center justify-center mr-4">
                                <AlertTriangle size={28} className="text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-red-700">Bạn có chắc chắn?</h3>
                        </div>
                        <p className="text-gray-700 mb-6 ml-16">Toàn bộ dữ liệu ứng dụng bao gồm khách hàng đã lưu, cấu hình trường và các cài đặt khác sẽ bị xóa vĩnh viễn.</p>
                        <div className="flex justify-end space-x-4">
                            <button onClick={() => setIsResetModalOpen(false)} className="px-6 py-2 rounded text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold">Hủy</button>
                            <button onClick={confirmReset} className="px-6 py-2 rounded bg-red-600 text-white hover:bg-red-800 font-bold flex items-center">
                                <Trash2 size={18} className="mr-2" />Tôi hiểu, hãy Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restore Confirmation Modal */}
            {isRestoreModalOpen && pendingRestoreData && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg m-4">
                        <div className='flex items-center mb-4'>
                            <div className="w-12 h-12 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                                <Database size={28} className="text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-purple-800">Xác Nhận Khôi Phục</h3>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>📅 Thời gian backup:</strong> {new Date(pendingRestoreData._meta?.createdAt).toLocaleString('vi-VN')}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                                <strong>📦 Phiên bản:</strong> {pendingRestoreData._meta?.version || 'N/A'}
                            </p>
                            {pendingRestoreData._meta?.stats && (
                                <div className="text-sm text-gray-600">
                                    <strong>📊 Dữ liệu:</strong>
                                    <ul className="ml-4 mt-1">
                                        <li>• Số trường: {pendingRestoreData._meta.stats.fieldsCount}</li>
                                        <li>• Số nhóm: {pendingRestoreData._meta.stats.groupsCount}</li>
                                        <li>• Số hồ sơ đã lưu: {pendingRestoreData._meta.stats.savedCustomersCount}</li>
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg mb-6">
                            <p className="text-sm text-orange-700">
                                <strong>⚠️ Lưu ý:</strong> Khôi phục sẽ <strong>thay thế toàn bộ</strong> dữ liệu hiện tại. 
                                Ứng dụng sẽ tự động tải lại sau khi khôi phục.
                            </p>
                        </div>

                        <div className="flex justify-end space-x-4">
                            <button 
                                onClick={() => {
                                    setIsRestoreModalOpen(false);
                                    setPendingRestoreData(null);
                                }} 
                                className="px-6 py-2 rounded text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={confirmRestore} 
                                className="px-6 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 font-bold flex items-center"
                            >
                                <Upload size={18} className="mr-2" />Xác Nhận Khôi Phục
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DataAndSettingsTab;
