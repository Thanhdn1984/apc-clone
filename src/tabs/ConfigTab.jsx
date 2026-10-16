import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, UploadCloud, DownloadCloud, Settings, Trash2, PlusCircle, Save, Briefcase, Zap, ChevronsRight, Loader2, FileText, AlertTriangle, CheckCircle, Info, Search, Wrench, RefreshCw, Package, Database, HardDrive, Upload, FileSpreadsheet } from 'lucide-react';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "../components/ui/dialog";
import defaultState from '../defaultState.js';

// APP_VERSION sẽ được pass từ App.jsx qua props
const UtilitiesTab = ({ isElectron, appState, setAppState, logs, progress, setLogs, setProgress }) => {
    const { toast } = useToast();
    const { inputData, fields, linkedFieldConfig, sourcePaths, destinationPath, numberFormat } = appState;

    const appendLog = useCallback((message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        setLogs(prev => [{ timestamp, message, type }, ...prev]);
    }, [setLogs]);

    const resetLogs = useCallback(() => {
        setLogs([]);
        setProgress(defaultState.progress);
        appendLog("Nhật ký đã được xóa.", "info");
    }, [setLogs, setProgress, appendLog]);

    useEffect(() => {
        if (!isElectron || !window.electronAPI) return;
        const removeListener = window.electronAPI.onReverseGenerateProgress((payload) => {
            setProgress(prev => ({ ...prev, isRunning: !['done', 'error', 'idle'].includes(payload.status), ...payload }));
            if (payload.log) {
                appendLog(payload.log.message, payload.log.type);
            }
        });

        // Auto-update listeners
        const removeUpdateAvailable = window.electronAPI.onUpdateAvailable((info) => {
            console.log('🟢 [UPDATE] Update available:', info);
            toast({
                title: "✨ Có bản cập nhật mới!",
                description: `Phiên bản ${info.version} đang được tải xuống...`,
                duration: 5000
            });
        });

        const removeUpdateNotAvailable = window.electronAPI.onUpdateNotAvailable((info) => {
            console.log('🔵 [UPDATE] No update available:', info);
            toast({
                title: "✅ Bạn đang dùng phiên bản mới nhất!",
                description: "Không có bản cập nhật nào khả dụng.",
                duration: 3000
            });
        });

        const removeUpdateDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
            console.log('🟢 [UPDATE] Update downloaded:', info);
            toast({
                title: "🎉 Cập nhật đã sẵn sàng!",
                description: `Phiên bản ${info.version} đã tải xong. Khởi động lại để cài đặt?`,
                action: (
                    <Button onClick={() => window.electronAPI.restartApp()} size="sm">
                        Khởi động lại
                    </Button>
                ),
                duration: 10000
            });
        });

        const removeUpdateError = window.electronAPI.onUpdateError((message) => {
            console.error('🔴 [UPDATE] Error:', message);
            toast({
                title: "❌ Lỗi kiểm tra cập nhật",
                description: message,
                variant: "destructive",
                duration: 5000
            });
        });

        // DEBUG: Listen for detailed update logs
        const removeUpdateLog = window.electronAPI.onUpdateLog?.((logEntry) => {
            const style = logEntry.type === 'ERROR' ? 'color: red; font-weight: bold' 
                : logEntry.type === 'SUCCESS' ? 'color: green; font-weight: bold'
                : logEntry.type === 'PROGRESS' ? 'color: blue'
                : 'color: gray';
            console.log(`%c[AUTO-UPDATE] ${logEntry.message}`, style, logEntry.data || '');
        }) || (() => {});

        return () => {
            removeListener();
            removeUpdateAvailable();
            removeUpdateNotAvailable();
            removeUpdateDownloaded();
            removeUpdateError();
            removeUpdateLog();
        };
    }, [isElectron, setProgress, appendLog, toast]);

    const handleSelectSources = async () => {
        const result = await window.electronAPI.selectSourceDialog();
        if (!result.canceled) {
            setAppState(s => ({...s, sourcePaths: result.filePaths}));
            appendLog(`Đã chọn ${result.filePaths.length} nguồn.`, "success");
        }
    };

    const handleSelectDestination = async () => {
        const result = await window.electronAPI.selectSaveDirectoryDialog();
        if (!result.canceled) {
            const path = result.filePaths[0];
             setAppState(s => ({...s, destinationPath: path}));
            appendLog(`Đích được đặt thành: ${path}`, "success");
        }
    };
    
    const handleInitiateReverseGenerate = async () => {
         if (progress.isRunning || !sourcePaths?.length || !destinationPath) return;
        if (!inputData || Object.keys(inputData).length === 0) {
            appendLog('Lỗi: Dữ liệu tại tab "Nhập Dữ Liệu" trống.', 'error');
            return;
        }
        
        resetLogs();
        appendLog("Bắt đầu luồng 'Tạo Hàng Loạt'.", "special");
        await window.electronAPI.reverseGenerateTemplate({ inputData, fields, linkedFieldConfig, sourcePaths, destinationPath, settings: { numberFormat } });
    };

    const getLogStyle = (type) => {
        switch (type) {
            case 'error': return 'text-red-500';
            case 'success': return 'text-green-500';
            case 'special': return 'text-purple-500 font-medium';
            case 'warning': return 'text-yellow-500';
            default: return 'text-gray-600';
        }
    };

    const LogIcon = ({type}) => {
        switch (type) {
            case 'error': return <AlertTriangle size={14} className="mr-2 flex-shrink-0 text-red-400"/>;
            case 'success': return <CheckCircle size={14} className="mr-2 flex-shrink-0 text-green-400"/>;
            case 'warning': return <AlertTriangle size={14} className="mr-2 flex-shrink-0 text-yellow-400"/>;
            case 'special': return <Zap size={14} className="mr-2 flex-shrink-0 text-purple-400"/>;
            default: return <Info size={14} className="mr-2 flex-shrink-0 text-gray-400"/>;
        }
    }

    if (!isElectron) return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 h-full">
            <div className="xl:col-span-8 bg-white p-4 rounded-xl shadow-sm border space-y-3 min-h-0 overflow-auto">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold flex items-center"><FileSpreadsheet size={18} className="mr-2 text-green-600" />Tải Excel làm báo cáo</h3>
                        <p className="text-xs text-gray-500">Khu vực chuẩn bị import Excel, map dữ liệu và tạo báo cáo hàng loạt.</p>
                    </div>
                    <Button variant="outline" className="h-8 text-xs" disabled><Upload size={14} className="mr-1.5"/>Tải file Excel</Button>
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500 bg-gray-50">
                    Chưa bật xử lý Excel. Sau này kéo/thả file Excel ở đây để sinh báo cáo, đối chiếu hoặc tạo hồ sơ hàng loạt.
                </div>
            </div>

            <div className="xl:col-span-4 overflow-y-auto">
                <ProfileManagementTab
                    appState={appState}
                    setAppState={setAppState}
                    appVersion={null}
                    isElectron={isElectron}
                    settingsOnly={true}
                    webTools={{ appendLog, resetLogs, logs, getLogStyle, LogIcon }}
                />
            </div>
        </div>
    );

    return (
         <div className="grid grid-cols-5 gap-6 h-full">
            <div className="col-span-2 flex flex-col bg-white p-6 rounded-xl shadow-sm border space-y-4">
                <h3 className="text-lg font-semibold flex items-center"><Settings size={20} className="mr-2 text-purple-600" />Cài đặt luồng</h3>
                 <div>
                    <Label className="text-sm font-medium">1. Chọn nguồn dữ liệu</Label>
                    <Button onClick={handleSelectSources} disabled={progress.isRunning} variant="outline" className="w-full mt-1.5 justify-start text-gray-700">
                        <Folder size={16} className="mr-2"/> {sourcePaths.length > 0 ? `${sourcePaths.length} nguồn đã chọn` : "Chọn File hoặc Thư Mục Nguồn..."}
                    </Button>
                </div>
                <div>
                    <Label className="text-sm font-medium">2. Chọn nơi lưu kết quả</Label>
                     <Button onClick={handleSelectDestination} disabled={progress.isRunning} variant="outline" className="w-full mt-1.5 justify-start text-gray-700">
                        <Save size={16} className="mr-2"/> {destinationPath ? "Đã chọn đích" : "Chọn Thư Mục Đích..."}
                    </Button>
                     <p className="text-xs text-gray-500 mt-1.5 truncate">{destinationPath || "Chưa chọn"}</p>
                </div>
                <div className="pt-4 mt-auto">
                     <Button onClick={handleInitiateReverseGenerate} disabled={progress.isRunning || !sourcePaths?.length || !destinationPath} className="w-full text-base py-6 bg-purple-600 hover:bg-purple-700 text-white">
                        {progress.isRunning ? <Loader2 className="animate-spin mr-3" size={22}/> : <ChevronsRight className="mr-2" size={22}/>}
                        {progress.isRunning ? `Đang xử lý... (${progress.current}/${progress.total})` : "Bắt Đầu Tạo Hàng Loạt"}
                    </Button>
                </div>
            </div>

            <div className="col-span-3 flex flex-col bg-white rounded-xl shadow-sm border min-h-0">
                <CardHeader className="flex-row items-center justify-between py-4">
                     <CardTitle className='text-base'>Nhật Ký Hệ Thống</CardTitle>
                     <Button onClick={resetLogs} disabled={progress.isRunning} variant="ghost" size="sm"><Trash2 size={14} className='mr-1.5'/> Xóa</Button>
                </CardHeader>
                <CardContent className="flex-grow overflow-y-auto p-4 font-mono text-xs">
                    {logs.map((entry, index) => 
                        <div key={index} className={`flex items-start mb-1.5 ${getLogStyle(entry.type)}`}>
                            <LogIcon type={entry.type} />
                            <p className="flex-grow"><span className="text-gray-400">[{entry.timestamp}]</span> {entry.message}</p>
                        </div>
                    )}
                </CardContent>
            </div>
        </div>
    );
};
const ProfileManagementTab = ({ appState, setAppState, appVersion, isElectron, settingsOnly = false, webTools = null }) => {
    const { toast } = useToast();
    const [configDir, setConfigDir] = useState(isElectron ? (localStorage.getItem('configDirectory') || '') : 'Server web');
    const [profiles, setProfiles] = useState([]);
    const [selectedProfileName, setSelectedProfileName] = useState('');
    const [newProfileName, setNewProfileName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [pendingRestoreData, setPendingRestoreData] = useState(null);
    const [mergeStats, setMergeStats] = useState(null); // Stats for merge preview

    // === FULL SYSTEM BACKUP FUNCTIONS ===
    const handleFullBackup = () => {
        try {
            // Collect ALL localStorage data
            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    try {
                        const value = localStorage.getItem(key);
                        // Try to parse as JSON, if fails store as string
                        try {
                            allData[key] = JSON.parse(value);
                        } catch {
                            allData[key] = value;
                        }
                    } catch (e) {
                        console.warn(`Skipping key ${key}:`, e);
                    }
                }
            }

            // Count stats
            let fieldsCount = 0;
            let groupsCount = 0;
            let savedCustomersCount = 0;
            
            // Find app state key - check STABLE key first, then fallback to versioned keys
            const appStateKey = Object.keys(allData).find(k => k === 'docuGenAppState_STABLE') 
                || Object.keys(allData).find(k => k.startsWith('docuGenAppState_v'));
            if (appStateKey && allData[appStateKey]) {
                const appData = allData[appStateKey];
                fieldsCount = appData.fields?.length || 0;
                groupsCount = appData.fieldGroups?.length || 0;
                savedCustomersCount = appData.savedCustomers?.length || 0;
            }

            // Create backup object with metadata
            const backupData = {
                _meta: {
                    type: 'docxautomator_full_backup',
                    version: appVersion,
                    createdAt: new Date().toISOString(),
                    stats: { fieldsCount, groupsCount, savedCustomersCount }
                },
                localStorage: allData
            };

            // Download as JSON file
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            link.download = `DocxAutomator_FullBackup_${timestamp}.json`;
            link.click();
            URL.revokeObjectURL(url);

            toast({
                title: "✅ Backup thành công!",
                description: `Đã sao lưu ${fieldsCount} trường, ${groupsCount} nhóm, ${savedCustomersCount} hồ sơ khách hàng.`,
            });
        } catch (error) {
            console.error('Backup error:', error);
            toast({
                title: "❌ Lỗi backup",
                description: error.message,
                variant: "destructive"
            });
        }
    };

    const handleFullRestore = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const content = await file.text();
                const data = JSON.parse(content);

                // Validate backup file
                if (!data._meta || data._meta.type !== 'docxautomator_full_backup') {
                    toast({
                        title: "❌ File không hợp lệ",
                        description: "Đây không phải file backup toàn hệ thống của APC Clone.",
                        variant: "destructive"
                    });
                    return;
                }

                if (!data.localStorage) {
                    toast({
                        title: "❌ File backup bị hỏng",
                        description: "Không tìm thấy dữ liệu localStorage trong file backup.",
                        variant: "destructive"
                    });
                    return;
                }

                // Show confirmation modal with stats
                setPendingRestoreData(data);
                setIsRestoreModalOpen(true);

            } catch (error) {
                console.error('Restore error:', error);
                toast({
                    title: "❌ Lỗi đọc file",
                    description: "Không thể đọc file backup. Vui lòng kiểm tra lại file.",
                    variant: "destructive"
                });
            }
        };
        input.click();
    };

    const confirmRestore = () => {
        if (!pendingRestoreData?.localStorage) return;

        try {
            // Clear ALL current localStorage
            localStorage.clear();

            // Restore all data from backup
            const localStorageData = pendingRestoreData.localStorage;
            
            // CRITICAL: Find app state data in backup (could be old key or STABLE key)
            const oldAppStateKey = Object.keys(localStorageData).find(k => k.startsWith('docuGenAppState_v'));
            const stableKey = 'docuGenAppState_STABLE';
            
            for (const [key, value] of Object.entries(localStorageData)) {
                try {
                    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                    
                    // If this is an old versioned key, ALSO save to STABLE key
                    if (key.startsWith('docuGenAppState_v')) {
                        localStorage.setItem(stableKey, stringValue);
                        console.log(`✅ Migrated ${key} → ${stableKey}`);
                    }
                    
                    // Also save original key for backwards compatibility
                    localStorage.setItem(key, stringValue);
                } catch (e) {
                    console.warn(`Could not restore key ${key}:`, e);
                }
            }
            
            // If backup had old key but no STABLE key, ensure data is in STABLE
            if (oldAppStateKey && !localStorageData[stableKey]) {
                console.log(`📊 Auto-migrated old key ${oldAppStateKey} to STABLE key`);
            }

            toast({
                title: "✅ Khôi phục thành công!",
                description: "Ứng dụng sẽ tải lại trong 2 giây...",
            });

            // Reload app after short delay
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Restore error:', error);
            toast({
                title: "❌ Lỗi khôi phục",
                description: error.message,
                variant: "destructive"
            });
        }

        setIsRestoreModalOpen(false);
        setPendingRestoreData(null);
    };

    // === MERGE FUNCTION - KẾT HỢP DỮ LIỆU TỪ 2 NGUỒN ===
    const confirmMerge = () => {
        if (!pendingRestoreData?.localStorage) return;

        try {
            const stableKey = 'docuGenAppState_STABLE';
            
            // 1. Lấy dữ liệu hiện tại
            const currentDataStr = localStorage.getItem(stableKey);
            const currentData = currentDataStr ? JSON.parse(currentDataStr) : { fields: [], fieldGroups: [], savedCustomers: [] };
            
            // 2. Lấy dữ liệu từ backup
            const backupLocalStorage = pendingRestoreData.localStorage;
            const backupAppStateKey = Object.keys(backupLocalStorage).find(k => k === stableKey) 
                || Object.keys(backupLocalStorage).find(k => k.startsWith('docuGenAppState_v'));
            
            if (!backupAppStateKey) {
                toast({ title: "❌ Không tìm thấy dữ liệu", description: "File backup không chứa dữ liệu hồ sơ.", variant: "destructive" });
                return;
            }
            
            const backupData = typeof backupLocalStorage[backupAppStateKey] === 'string' 
                ? JSON.parse(backupLocalStorage[backupAppStateKey]) 
                : backupLocalStorage[backupAppStateKey];

            // 3. MERGE FIELDS - Kết hợp trường (theo key)
            const currentFieldsMap = new Map((currentData.fields || []).map(f => [f.key, f]));
            const backupFields = backupData.fields || [];
            let newFieldsCount = 0;
            
            for (const field of backupFields) {
                if (!currentFieldsMap.has(field.key)) {
                    currentFieldsMap.set(field.key, field);
                    newFieldsCount++;
                }
            }
            const mergedFields = Array.from(currentFieldsMap.values());

            // 4. MERGE FIELD GROUPS - Kết hợp nhóm trường (theo name)
            const currentGroupsMap = new Map((currentData.fieldGroups || []).map(g => [g.name, g]));
            const backupGroups = backupData.fieldGroups || [];
            let newGroupsCount = 0;
            
            for (const group of backupGroups) {
                if (!currentGroupsMap.has(group.name)) {
                    currentGroupsMap.set(group.name, group);
                    newGroupsCount++;
                } else {
                    // Merge fields trong group
                    const existingGroup = currentGroupsMap.get(group.name);
                    const existingFieldKeys = new Set(existingGroup.fields || []);
                    for (const fieldKey of (group.fields || [])) {
                        if (!existingFieldKeys.has(fieldKey)) {
                            existingGroup.fields.push(fieldKey);
                        }
                    }
                }
            }
            const mergedGroups = Array.from(currentGroupsMap.values());

            // 5. MERGE CUSTOMERS - Kết hợp khách hàng (theo id hoặc tên)
            const currentCustomersMap = new Map();
            for (const c of (currentData.savedCustomers || [])) {
                const uniqueKey = c.id || c.name || JSON.stringify(c.data);
                currentCustomersMap.set(uniqueKey, c);
            }
            const backupCustomers = backupData.savedCustomers || [];
            let newCustomersCount = 0;
            
            for (const customer of backupCustomers) {
                const uniqueKey = customer.id || customer.name || JSON.stringify(customer.data);
                if (!currentCustomersMap.has(uniqueKey)) {
                    // Generate new ID if needed
                    const newCustomer = { ...customer, id: customer.id || `merged_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
                    currentCustomersMap.set(uniqueKey, newCustomer);
                    newCustomersCount++;
                }
            }
            const mergedCustomers = Array.from(currentCustomersMap.values());

            // 6. Tạo merged state
            const mergedState = {
                ...currentData,
                fields: mergedFields,
                fieldGroups: mergedGroups,
                savedCustomers: mergedCustomers
            };

            // 7. Lưu vào localStorage
            localStorage.setItem(stableKey, JSON.stringify(mergedState));
            
            // 8. Restore các key khác (không phải appState) từ backup
            for (const [key, value] of Object.entries(backupLocalStorage)) {
                if (!key.startsWith('docuGenAppState')) {
                    try {
                        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
                        // Only set if not exists
                        if (!localStorage.getItem(key)) {
                            localStorage.setItem(key, stringValue);
                        }
                    } catch (e) {
                        console.warn(`Could not merge key ${key}:`, e);
                    }
                }
            }

            toast({
                title: "✅ Kết hợp thành công!",
                description: `Đã thêm ${newFieldsCount} trường, ${newGroupsCount} nhóm, ${newCustomersCount} khách hàng mới. Tải lại trong 2s...`,
            });

            console.log(`🔀 MERGE COMPLETE: +${newFieldsCount} fields, +${newGroupsCount} groups, +${newCustomersCount} customers`);

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('Merge error:', error);
            toast({
                title: "❌ Lỗi kết hợp",
                description: error.message,
                variant: "destructive"
            });
        }

        setIsRestoreModalOpen(false);
        setPendingRestoreData(null);
        setMergeStats(null);
    };

    // Calculate merge preview stats
    const calculateMergeStats = useCallback(() => {
        if (!pendingRestoreData?.localStorage) return null;
        
        try {
            const stableKey = 'docuGenAppState_STABLE';
            const currentDataStr = localStorage.getItem(stableKey);
            const currentData = currentDataStr ? JSON.parse(currentDataStr) : { fields: [], fieldGroups: [], savedCustomers: [] };
            
            const backupLocalStorage = pendingRestoreData.localStorage;
            const backupAppStateKey = Object.keys(backupLocalStorage).find(k => k === stableKey) 
                || Object.keys(backupLocalStorage).find(k => k.startsWith('docuGenAppState_v'));
            
            if (!backupAppStateKey) return null;
            
            const backupData = typeof backupLocalStorage[backupAppStateKey] === 'string' 
                ? JSON.parse(backupLocalStorage[backupAppStateKey]) 
                : backupLocalStorage[backupAppStateKey];

            // Count new items
            const currentFieldKeys = new Set((currentData.fields || []).map(f => f.key));
            const newFields = (backupData.fields || []).filter(f => !currentFieldKeys.has(f.key)).length;
            
            const currentGroupNames = new Set((currentData.fieldGroups || []).map(g => g.name));
            const newGroups = (backupData.fieldGroups || []).filter(g => !currentGroupNames.has(g.name)).length;
            
            const currentCustomerIds = new Set((currentData.savedCustomers || []).map(c => c.id || c.name));
            const newCustomers = (backupData.savedCustomers || []).filter(c => !currentCustomerIds.has(c.id) && !currentCustomerIds.has(c.name)).length;

            return {
                current: {
                    fields: (currentData.fields || []).length,
                    groups: (currentData.fieldGroups || []).length,
                    customers: (currentData.savedCustomers || []).length
                },
                backup: {
                    fields: (backupData.fields || []).length,
                    groups: (backupData.fieldGroups || []).length,
                    customers: (backupData.savedCustomers || []).length
                },
                newItems: { fields: newFields, groups: newGroups, customers: newCustomers }
            };
        } catch (e) {
            console.error('Error calculating merge stats:', e);
            return null;
        }
    }, [pendingRestoreData]);

    // Update merge stats when modal opens
    useEffect(() => {
        if (isRestoreModalOpen && pendingRestoreData) {
            setMergeStats(calculateMergeStats());
        }
    }, [isRestoreModalOpen, pendingRestoreData, calculateMergeStats]);
    // === END BACKUP FUNCTIONS ===

    const filteredProfiles = useMemo(() => {
        if (!searchTerm) return profiles;
        return profiles.filter(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [profiles, searchTerm]);

    const refreshProfiles = useCallback(async () => {
        try {
            const profileList = isElectron
                ? await window.electronAPI.profiles.getList(configDir)
                : ((await (await fetch('/api/docx/profiles')).json())?.profiles || []);
            setProfiles(profileList.sort());
            if (!profileList.includes(selectedProfileName)) {
                setSelectedProfileName('');
            }
        } catch (error) {
            toast({ title: "Lỗi", description: isElectron ? "Không thể đọc danh sách hồ sơ từ kho." : "Không thể đọc hồ sơ từ server.", variant: "destructive" });
            setProfiles([]);
        }
    }, [configDir, selectedProfileName, toast, isElectron]);

    useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

    const handleSelectDirectory = async () => {
        const dir = await window.electronAPI.profiles.selectDirectory();
        if (dir) {
            setConfigDir(dir);
            localStorage.setItem('configDirectory', dir);
        }
    };

    const handleLoadToWorkspace = async (confirmed = false) => {
        if (!configDir) {
            toast({ title: "Chưa chọn kho", description: "Vui lòng chọn kho cấu hình trước khi tải.", variant: "warning" });
            return;
        }
        if (!selectedProfileName) {
            toast({ title: "Chưa chọn hồ sơ", description: "Vui lòng chọn một hồ sơ từ danh sách để tải.", variant: "warning" });
            return;
        }
        
        if (!confirmed) {
            setConfirmDialog({ open: true, action: 'load' });
            return;
        }
        
        try {
            const loadedData = isElectron
                ? await window.electronAPI.profiles.load(`${configDir}/${selectedProfileName}.json`)
                : await (await fetch(`/api/docx/profile?name=${encodeURIComponent(selectedProfileName)}`)).json();
            const payload = loadedData?.state || loadedData;
            if (payload) {
                setAppState(currentState => {
                    const schema = payload.profileSchema || {};
                    const numberFormat = payload.numberFormat || {};
                    return {
                        ...currentState,
                        fields: schema.fields || payload.fields || defaultState.fields,
                        fieldGroups: schema.fieldGroups || payload.fieldGroups || defaultState.fieldGroups,
                        templates: schema.templates || payload.templates || defaultState.templates,
                        linkedFieldConfig: schema.linkedFieldConfig || payload.linkedFieldConfig || defaultState.linkedFieldConfig,
                        inputData: payload.inputData || currentState.inputData,
                        savedCustomers: payload.savedCustomers || currentState.savedCustomers,
                        customTemplates: payload.customTemplates || currentState.customTemplates,
                        namingFieldId: payload.namingFieldId || currentState.namingFieldId,
                        numberFormat: { ...currentState.numberFormat, ...numberFormat, ...(payload.numberFormat || {}) },
                        managementOpenListFieldIds: defaultState.managementOpenListFieldIds,
                        managementOpenGroupIds: defaultState.managementOpenGroupIds,
                    };
                });
                toast({ title: "Thành công", description: `Đã tải hồ sơ "${selectedProfileName}".`, variant: "success" });
            } else {
                 toast({ title: "Lỗi", description: `Không thể tải hoặc file hồ sơ "${selectedProfileName}" bị rỗng.`, variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Lỗi nghiêm trọng", description: `Không thể đọc file hồ sơ: ${error.message}`, variant: "destructive" });
        }
    };
    
    const createDataToSave = () => ({
        profileSchema: { 
            fields: appState.fields, 
            fieldGroups: appState.fieldGroups, 
            linkedFieldConfig: appState.linkedFieldConfig, 
            templates: appState.templates 
        },
        numberFormat: appState.numberFormat
    });

    const handleOverwrite = async (confirmed = false) => {
        if (!configDir) {
            toast({ title: "Chưa chọn kho", description: "Vui lòng chọn kho cấu hình trước khi ghi đè.", variant: "warning" });
            return;
        }
        if (!selectedProfileName) {
            toast({ title: "Chưa chọn hồ sơ", description: "Vui lòng chọn một hồ sơ từ danh sách để ghi đè.", variant: "warning" });
            return;
        }
        
        if (!confirmed) {
            setConfirmDialog({ open: true, action: 'overwrite' });
            return;
        }
        
        const dataToSave = createDataToSave();
        const fPath = `${configDir}/${selectedProfileName}.json`;
        const response = await window.electronAPI.profiles.save(fPath, dataToSave, true);
        if (response.success) {
            toast({ title: "Thành công", description: `Đã ghi đè hồ sơ "${selectedProfileName}".` });
        } else if (!response.canceled) {
            toast({ title: "Lỗi Ghi Đè", description: response.error || "Không thể ghi đè hồ sơ.", variant: "destructive" });
        }
    };

    const handleSaveNew = async (confirmed = false) => {
        if (isElectron && !configDir) {
            toast({ title: "Chưa chọn kho", description: "Vui lòng chọn kho cấu hình để lưu hồ sơ.", variant: "warning" });
            return;
        }
        const name = newProfileName.trim();
        if (!name) {
            toast({ title: "Lỗi", description: "Tên hồ sơ mới không được để trống.", variant: "destructive"});
            return;
        }
        
        if (!confirmed) {
            setConfirmDialog({ open: true, action: 'save', profileName: name });
            return;
        }
        
        const dataToSave = createDataToSave();
        if (isElectron) {
            const fPath = `${configDir}/${name}.json`;
            const response = await window.electronAPI.profiles.save(fPath, dataToSave, false);
            if (response.success && !response.canceled) {
                toast({ title: "Thành công", description: `Đã lưu hồ sơ mới "${name}".`, variant: "success" });
                setNewProfileName('');
                await refreshProfiles();
                setSelectedProfileName(name); 
            } else if (!response.canceled) {
                 toast({ title: "Lỗi Lưu", description: response.error || "Hồ sơ có thể đã tồn tại.", variant: "destructive" });
            }
            return;
        }
        const response = await fetch(`/api/docx/profile?name=${encodeURIComponent(name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: appState, profileSchema: dataToSave.profileSchema, numberFormat: dataToSave.numberFormat })
        });
        const result = await response.json();
        if (result?.ok) {
            toast({ title: "Thành công", description: `Đã lưu hồ sơ mới "${name}".`, variant: "success" });
            setNewProfileName('');
            await refreshProfiles();
            setSelectedProfileName(name);
        } else {
            toast({ title: "Lỗi Lưu", description: result?.error || "Không thể lưu hồ sơ lên server.", variant: "destructive" });
        }
    };

    const handleDelete = async (confirmed = false) => {
        if (!selectedProfileName || !configDir) return;
        
        if (!confirmed) {
            setConfirmDialog({ open: true, action: 'delete' });
            return;
        }
        
        const filePath = `${configDir}/${selectedProfileName}.json`;
        const response = await window.electronAPI.profiles.delete(filePath);
        if (response.success && !response.canceled) {
            toast({ title: "Thành công", description: `Đã xóa hồ sơ "${selectedProfileName}".` });
            refreshProfiles();
        } else if (!response.canceled) {
             toast({ title: "Lỗi Xóa", description: response.error || "Không thể xóa hồ sơ.", variant: "destructive" });
        }
    };

    const handleLocaleChange = (newLocale) => {
        setAppState(s => ({ ...s, numberFormat: { ...s.numberFormat, locale: newLocale }}));
    };

    const handleDecimalPlacesChange = (e) => {
        const value = e.target.value;
        const newPlaces = value === '' ? null : parseInt(value, 10);
        setAppState(s => ({ ...s, numberFormat: { ...s.numberFormat, decimalPlaces: newPlaces }}));
    };

    if (settingsOnly) {
        return (
            <div className="space-y-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-800">Định dạng số</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <Label className='text-xs font-medium text-gray-700 mb-1 block'>Kiểu gõ</Label>
                            <RadioGroup value={appState.numberFormat?.locale || 'vi-VN'} onValueChange={handleLocaleChange} className="flex flex-wrap gap-3">
                                <div className="flex items-center space-x-1"><RadioGroupItem value="vi-VN" id="n-locale-vn-settings" className="h-3 w-3" /><Label htmlFor="n-locale-vn-settings" className="font-normal text-xs text-gray-700 cursor-pointer">1.234,56</Label></div>
                                <div className="flex items-center space-x-1"><RadioGroupItem value="en-US" id="n-locale-us-settings" className="h-3 w-3" /><Label htmlFor="n-locale-us-settings" className="font-normal text-xs text-gray-700 cursor-pointer">1,234.56</Label></div>
                            </RadioGroup>
                        </div>
                        <div>
                            <Label className='text-xs font-medium text-gray-700 mb-1 block'>Số chữ số thập phân</Label>
                            <Input type="number" min="0" max="10" value={appState.numberFormat?.decimalPlaces ?? ''} onChange={handleDecimalPlacesChange} placeholder="Tự động" className="text-xs h-8" />
                        </div>
                    </CardContent>
                </Card>


                {webTools && (
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-800 flex items-center"><Settings className="mr-2 h-4 w-4 text-purple-600"/>Cấu hình web</CardTitle></CardHeader>
                        <CardContent className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Button onClick={async () => {
                                    try {
                                        const r = await fetch('/api/docx/profiles');
                                        const d = await r.json();
                                        const list = d?.profiles || [];
                                        if (!list.length) { webTools.appendLog('Chưa có hồ sơ trên server', 'warning'); return; }
                                        const name = prompt(`Hồ sơ hiện có:\n- ${list.join('\n- ')}\n\nNhập tên hồ sơ cần tải:`);
                                        if (!name) return;
                                        const r2 = await fetch(`/api/docx/profile?name=${encodeURIComponent(name)}`);
                                        if (!r2.ok) { webTools.appendLog('Không tìm thấy hồ sơ: ' + name, 'error'); return; }
                                        const d2 = await r2.json();
                                        if (d2?.state) { setAppState(prev => ({ ...prev, ...d2.state })); webTools.appendLog(`Đã tải hồ sơ: ${name}`, 'success'); }
                                    } catch (e) { webTools.appendLog('Lỗi tải hồ sơ: ' + e.message, 'error'); }
                                }} variant="outline" className="h-8 justify-center text-xs text-gray-700">
                                    <Database size={14} className="mr-1.5"/> Tải hồ sơ
                                </Button>
                                <Button onClick={async () => {
                                    try {
                                        const r = await fetch('/api/docx/state?key=***');
                                        const d = await r.json();
                                        if (d?.state) { setAppState(prev => ({ ...prev, ...d.state })); webTools.appendLog('Đã đồng bộ state từ server', 'success'); }
                                        else webTools.appendLog('Server chưa có state để đồng bộ', 'warning');
                                    } catch (e) { webTools.appendLog('Lỗi sync từ server: ' + e.message, 'error'); }
                                }} variant="outline" className="h-8 justify-center text-xs text-gray-700">
                                    <RefreshCw size={14} className="mr-1.5"/> Đồng bộ server
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-purple-800 flex items-center"><Database className="mr-2 h-4 w-4 text-purple-600"/>Backup / khôi phục toàn hệ thống</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-xs text-gray-600">Sao lưu toàn bộ hồ sơ, trường, nhóm, liên kết, cấu hình và dữ liệu cục bộ.</p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button onClick={handleFullBackup} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"><HardDrive className="h-3 w-3 mr-1.5"/>Tạo backup</Button>
                            <Button onClick={handleFullRestore} className="bg-orange-500 hover:bg-orange-600 text-white text-xs h-8"><Upload className="h-3 w-3 mr-1.5"/>Khôi phục</Button>
                        </div>
                    </CardContent>
                </Card>

                {webTools && (
                    <Card className="min-h-[220px] flex flex-col">
                        <CardHeader className="flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-gray-800">Nhật ký hệ thống</CardTitle>
                            <Button onClick={webTools.resetLogs} variant="ghost" size="sm" className="h-7 text-xs"><Trash2 size={13} className="mr-1"/>Xóa</Button>
                        </CardHeader>
                        <CardContent className="flex-grow max-h-64 overflow-y-auto p-3 font-mono text-xs">
                            {webTools.logs.map((entry, index) =>
                                <div key={index} className={`flex items-start mb-1.5 ${webTools.getLogStyle(entry.type)}`}>
                                    <webTools.LogIcon type={entry.type} />
                                    <p className="flex-grow"><span className="text-gray-400">[{entry.timestamp}]</span> {entry.message}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }
    
    return (
         <div className="flex flex-col h-full gap-2 p-3 overflow-auto">
            {/* Main Content Grid - 2 Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 flex-shrink-0">
                {/* Left Column - Profile List with Actions Below */}
                <div className="lg:col-span-6 flex flex-col gap-2">
                    {/* Header with Search and Kho Cấu Hình Button */}
                    <div className="flex gap-2 items-end flex-shrink-0">
                        <div className="flex-grow">
                            <div className="relative">
                                <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                                <Input 
                                    placeholder="Tìm kiếm hồ sơ..." 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-7 text-xs h-8"
                                />
                            </div>
                        </div>
                        <Button 
                            onClick={isElectron ? handleSelectDirectory : undefined} 
                            disabled={!isElectron}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-2 flex-shrink-0"
                        >
                            <Folder className="h-3 w-3" /> {isElectron ? (configDir ? "Đổi Kho" : "Chọn") : "Server"}
                        </Button>
                    </div>

                    {/* Profile List Card */}
                    <Card className="flex flex-col flex-grow min-h-0">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-700 flex items-center"><Briefcase className="mr-2 h-4 w-4 text-purple-600"/>Danh Sách Hồ Sơ</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col min-h-0 p-2">
                            {/* Profile List - No Scroll */}
                            <div className="flex-grow min-h-0">
                                <div className="space-y-1 overflow-y-auto max-h-full pr-1">
                                    {filteredProfiles.length > 0 ? (
                                        filteredProfiles.map(profile => (
                                            <button
                                                key={profile}
                                                onClick={() => setSelectedProfileName(profile)}
                                                className={`w-full text-left px-2 py-1.5 rounded-md transition-colors text-xs font-medium ${ 
                                                    selectedProfileName === profile 
                                                    ? 'bg-purple-100 text-purple-700 border border-purple-400' 
                                                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-transparent'
                                                }`}
                                            >
                                                {profile}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 text-center py-2">Chưa có hồ sơ</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Buttons - Appears when profile selected */}
                    {selectedProfileName && (
                        <div className="flex-shrink-0 space-y-1">
                            <p className="text-xs font-semibold text-gray-600">Thao Tác: <span className="text-purple-700 font-bold">{selectedProfileName}</span></p>
                            <div className="grid grid-cols-3 gap-2">
                                <Dialog open={confirmDialog.open && confirmDialog.action === 'load'} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null })}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            onClick={() => handleLoadToWorkspace(false)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 p-1 flex items-center justify-center"
                                        >
                                            <DownloadCloud className="h-3 w-3 mr-1"/>
                                            <span>Tải hồ sơ</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="text-sm">Xác nhận tải hồ sơ</DialogTitle>
                                            <DialogDescription className="text-xs">
                                                Bạn có chắc muốn tải hồ sơ "<strong>{selectedProfileName}</strong>"? Cấu hình hiện tại sẽ được thay thế.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline" className="text-xs h-8">Hủy</Button>
                                            </DialogClose>
                                            <Button 
                                                onClick={() => {
                                                    handleLoadToWorkspace(true);
                                                    setConfirmDialog({ open: false, action: null });
                                                }}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
                                            >
                                                Tải Hồ Sơ
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={confirmDialog.open && confirmDialog.action === 'overwrite'} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null })}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            onClick={() => handleOverwrite(false)}
                                            variant="outline"
                                            className="text-xs h-8 p-1 flex items-center justify-center"
                                        >
                                            <UploadCloud className="h-3 w-3 mr-1"/>
                                            <span>Ghi Đè</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="text-sm">Xác nhận ghi đè hồ sơ</DialogTitle>
                                            <DialogDescription className="text-xs">
                                                Bạn có chắc muốn ghi đè hồ sơ "<strong>{selectedProfileName}</strong>"? Dữ liệu cũ sẽ bị mất.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline" className="text-xs h-8">Hủy</Button>
                                            </DialogClose>
                                            <Button 
                                                onClick={() => {
                                                    handleOverwrite(true);
                                                    setConfirmDialog({ open: false, action: null });
                                                }}
                                                className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8"
                                            >
                                                Ghi Đè
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={confirmDialog.open && confirmDialog.action === 'delete'} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null })}>
                                    <DialogTrigger asChild>
                                        <Button 
                                            onClick={() => handleDelete(false)}
                                            variant="destructive"
                                            className="text-xs h-8 p-1 flex items-center justify-center"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1"/>
                                            <span>Xóa</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="text-sm">Xác nhận xóa hồ sơ</DialogTitle>
                                            <DialogDescription className="text-xs">
                                                Bạn có chắc muốn xóa hồ sơ "<strong>{selectedProfileName}</strong>"? Hành động này không thể hoàn tác.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter>
                                            <DialogClose asChild>
                                                <Button variant="outline" className="text-xs h-8">Hủy</Button>
                                            </DialogClose>
                                            <Button 
                                                onClick={() => {
                                                    handleDelete(true);
                                                    setConfirmDialog({ open: false, action: null });
                                                }}
                                                className="bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                                            >
                                                Xóa Hồ Sơ
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Settings (Compact) */}
                <div className="lg:col-span-4 flex flex-col gap-2 min-h-0">
                    {/* Kho Cấu Hình Info - Direct Path Display */}
                    <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 break-all line-clamp-2 leading-snug">{configDir || "Chưa chọn kho"}</p>
                    </div>

                    {/* Number Format Card */}
                    <Card>
                        <CardHeader className="pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-700">Định Dạng Số</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-2">
                            {/* Horizontal Layout - Same Row */}
                            <div className="flex gap-3 items-center">
                                {/* Kiểu Phân Cách */}
                                <div className="flex-1">
                                    <Label className='text-xs font-medium text-gray-700 mb-1 block'>Kiểu gõ:</Label>
                                    <RadioGroup value={appState.numberFormat?.locale || 'vi-VN'} onValueChange={handleLocaleChange} className="flex gap-2">
                                        <div className="flex items-center space-x-1"><RadioGroupItem value="vi-VN" id="n-locale-vn" className="h-3 w-3" /><Label htmlFor="n-locale-vn" className="font-normal text-xs text-gray-700 cursor-pointer">1.234,56</Label></div>
                                        <div className="flex items-center space-x-1"><RadioGroupItem value="en-US" id="n-locale-us" className="h-3 w-3" /><Label htmlFor="n-locale-us" className="font-normal text-xs text-gray-700 cursor-pointer">1,234.56</Label></div>
                                    </RadioGroup>
                                </div>
                                {/* Decimal Places */}
                                <div className="flex-1">
                                    <Label className='text-xs font-medium text-gray-700 mb-1 block'>Số chữ số thập phân:</Label>
                                    <Input type="number" min="0" max="10" value={appState.numberFormat?.decimalPlaces ?? ''} onChange={handleDecimalPlacesChange} placeholder="Tự động" className="text-xs h-7 p-1.5 w-full" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save New Profile Card - Flex Grow to Match Left Column Height */}
                    <Card className="flex flex-col flex-grow min-h-0">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-xs font-semibold text-gray-700">Gõ tên hồ sơ để lưu</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-2 flex flex-col flex-grow min-h-0">
                            {/* Profile Name Input */}
                            <Input
                                value={newProfileName}
                                onChange={e => setNewProfileName(e.target.value)}
                                placeholder="Tên hồ sơ..."
                                className="text-xs h-7 p-1.5"
                                onKeyPress={e => e.key === 'Enter' && handleSaveNew()}
                            />

                            {/* Save Button - Full Width */}
                            <Dialog open={confirmDialog.open && confirmDialog.action === 'save'} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null })}>
                                <DialogTrigger asChild>
                                    <Button 
                                        onClick={() => handleSaveNew(false)}
                                        disabled={!newProfileName.trim() || (isElectron && !configDir)}
                                        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8 font-medium"
                                    >
                                        <Save className="h-3 w-3 mr-1.5"/>Lưu Hồ Sơ
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle className="text-sm">Xác nhận lưu hồ sơ mới</DialogTitle>
                                        <DialogDescription className="text-xs">
                                            Bạn có chắc muốn lưu hồ sơ mới với tên "<strong>{confirmDialog.profileName}</strong>"?
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button variant="outline" className="text-xs h-8">Hủy</Button>
                                        </DialogClose>
                                        <Button 
                                            onClick={() => {
                                                handleSaveNew(true);
                                                setConfirmDialog({ open: false, action: null });
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-8"
                                        >
                                            Lưu Hồ Sơ
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            {/* Current Settings Summary - Horizontal - Flex Grow to Push Down */}
                            <div className="flex-grow"></div>
                            
                            {/* App Info Card with Check Update Button */}
                            <Card className="flex-shrink-0 border-blue-200 bg-blue-50/50">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-blue-600" />
                                            <div>
                                                <p className="text-xs font-semibold text-blue-900">APC Clone</p>
                                                <p className="text-xs text-blue-700">Phiên bản {appVersion}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Toggle Auto-Update */}
                                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 rounded-md border border-gray-300">
                                                <label className="text-xs font-medium text-gray-700 cursor-pointer flex items-center gap-1.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={appState.autoUpdateEnabled !== false}
                                                        onChange={(e) => setAppState(s => ({ ...s, autoUpdateEnabled: e.target.checked }))}
                                                        className="w-3 h-3 rounded"
                                                    />
                                                    Tự động cập nhật
                                                </label>
                                            </div>
                                            {window.electronAPI && (
                                                <Button 
                                                    onClick={() => {
                                                        console.log('🔘 [DEBUG] Button clicked - calling checkForUpdates()');
                                                        console.log('🔘 [DEBUG] electronAPI:', window.electronAPI);
                                                        console.log('🔘 [DEBUG] checkForUpdates function:', window.electronAPI.checkForUpdates);
                                                        toast({
                                                            title: "🔍 Đang kiểm tra cập nhật...",
                                                            description: "Vui lòng đợi trong giây lát."
                                                        });
                                                        window.electronAPI.checkForUpdates();
                                                        console.log('🔘 [DEBUG] checkForUpdates() called');
                                                    }}
                                                    variant="outline"
                                                    className="h-7 text-xs bg-white hover:bg-blue-100 border-blue-300"
                                                >
                                                    <RefreshCw className="h-3 w-3 mr-1" />
                                                    Kiểm tra cập nhật
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* FULL SYSTEM BACKUP SECTION */}
            <Card className="flex-shrink-0 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-purple-800 flex items-center">
                        <Database className="mr-2 h-4 w-4 text-purple-600"/>
                        🛡️ Backup Toàn Hệ Thống
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <p className="text-xs text-gray-600 mb-3">
                        Sao lưu <strong>TOÀN BỘ</strong> dữ liệu: hồ sơ khách hàng, trường, nhóm, liên kết và cài đặt.
                    </p>
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleFullBackup}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs h-8"
                        >
                            <HardDrive className="h-3 w-3 mr-1.5"/>
                            Tạo Backup
                        </Button>
                        <Button 
                            onClick={handleFullRestore}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs h-8"
                        >
                            <Upload className="h-3 w-3 mr-1.5"/>
                            Khôi Phục
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Restore Confirmation Modal */}
            {isRestoreModalOpen && pendingRestoreData && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md m-4">
                        <div className='flex items-center mb-4'>
                            <div className="w-10 h-10 flex-shrink-0 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                <Database size={20} className="text-purple-600" />
                            </div>
                            <h3 className="text-lg font-bold text-purple-800">Xác Nhận Khôi Phục</h3>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg mb-3 text-sm">
                            <p className="text-gray-600 mb-1">
                                <strong>📅 Thời gian:</strong> {new Date(pendingRestoreData._meta?.createdAt).toLocaleString('vi-VN')}
                            </p>
                            <p className="text-gray-600 mb-1">
                                <strong>📦 Phiên bản:</strong> {pendingRestoreData._meta?.version || 'N/A'}
                            </p>
                            {pendingRestoreData._meta?.stats && (
                                <div className="text-gray-600">
                                    <strong>📊 Dữ liệu:</strong> {pendingRestoreData._meta.stats.fieldsCount} trường, {pendingRestoreData._meta.stats.groupsCount} nhóm, {pendingRestoreData._meta.stats.savedCustomersCount} hồ sơ
                                </div>
                            )}
                        </div>

                        {/* Merge Preview Stats */}
                        {mergeStats && (
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-3">
                                <p className="text-xs font-semibold text-blue-800 mb-2">🔀 Xem trước khi KẾT HỢP:</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                        <div className="text-gray-500">Máy hiện tại</div>
                                        <div className="font-medium">{mergeStats.current.fields} trường</div>
                                        <div className="font-medium">{mergeStats.current.groups} nhóm</div>
                                        <div className="font-medium">{mergeStats.current.customers} KH</div>
                                    </div>
                                    <div className="text-center text-green-600">
                                        <div className="text-gray-500">Sẽ thêm mới</div>
                                        <div className="font-bold">+{mergeStats.newItems.fields} trường</div>
                                        <div className="font-bold">+{mergeStats.newItems.groups} nhóm</div>
                                        <div className="font-bold">+{mergeStats.newItems.customers} KH</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-gray-500">Từ backup</div>
                                        <div className="font-medium">{mergeStats.backup.fields} trường</div>
                                        <div className="font-medium">{mergeStats.backup.groups} nhóm</div>
                                        <div className="font-medium">{mergeStats.backup.customers} KH</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-orange-50 border border-orange-200 p-2 rounded-lg mb-4">
                            <p className="text-xs text-orange-700 mb-1">
                                <strong>🔄 Ghi đè:</strong> Xóa hết dữ liệu cũ, thay bằng backup
                            </p>
                            <p className="text-xs text-green-700">
                                <strong>🔀 Kết hợp:</strong> Giữ dữ liệu cũ + thêm mới từ backup (không trùng)
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button 
                                onClick={() => {
                                    setIsRestoreModalOpen(false);
                                    setPendingRestoreData(null);
                                    setMergeStats(null);
                                }} 
                                variant="outline"
                                className="text-xs"
                            >
                                Hủy
                            </Button>
                            <Button 
                                onClick={confirmMerge} 
                                className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                                🔀 Kết Hợp
                            </Button>
                            <Button 
                                onClick={confirmRestore} 
                                className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                            >
                                🔄 Ghi Đè
                            </Button>
                        </div>
                    </div>
                </div>
            )}
         </div>
    );
}

const ConfigTab = ({ appState, setAppState, isElectron, logs, progress, setLogs, setProgress, appVersion }) => {
    return (
        <div className="h-full flex flex-col bg-gray-50/70">
            <div className="flex-shrink-0 sticky top-0 bg-gray-50/70 z-10 backdrop-blur-sm shadow-sm border-b">
                <div className="p-3">
                    <div className="flex items-center gap-2 text-purple-700">
                        <Zap className="h-4 w-4" />
                        <h2 className="text-sm font-semibold">Tạo hàng loạt & báo cáo Excel</h2>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Khu vực xử lý nguồn dữ liệu, xuất hàng loạt và chuẩn bị mở rộng import Excel làm báo cáo. Quản lý mẫu hồ sơ đã chuyển sang Nhập dữ liệu → Quản lý → Mẫu hồ sơ.
                    </p>
                </div>
            </div>
            <div className="flex-grow p-3 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
                <div className="xl:col-span-8 min-h-0 flex flex-col">
                    <div className="bg-white p-4 rounded-xl shadow-sm border space-y-3 min-h-0 overflow-auto">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold flex items-center"><FileSpreadsheet size={18} className="mr-2 text-green-600" />Tải Excel làm báo cáo</h3>
                                <p className="text-xs text-gray-500">Khu vực chuẩn bị import Excel, map dữ liệu và tạo báo cáo hàng loạt.</p>
                            </div>
                            <Button variant="outline" className="h-8 text-xs" disabled><Upload size={14} className="mr-1.5"/>Tải file Excel</Button>
                        </div>
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500 bg-gray-50">
                            Chưa bật xử lý Excel. Sau này kéo/thả file Excel ở đây để sinh báo cáo, đối chiếu hoặc tạo hồ sơ hàng loạt.
                        </div>
                    </div>
                </div>
                <div className="xl:col-span-4 overflow-y-auto">
                    <ProfileManagementTab
                        appState={appState}
                        setAppState={setAppState}
                        appVersion={appVersion}
                        isElectron={isElectron}
                        settingsOnly={true}
                        webTools={!isElectron ? {
                            appendLog: (message, type = 'info') => setLogs(prev => [{ timestamp: new Date().toLocaleTimeString('vi-VN'), message, type }, ...prev]),
                            resetLogs: () => setLogs([]),
                            logs,
                            getLogStyle: (type) => type === 'error' ? 'text-red-500' : type === 'success' ? 'text-green-500' : type === 'warning' ? 'text-yellow-500' : type === 'special' ? 'text-purple-500 font-medium' : 'text-gray-600',
                            LogIcon: ({ type }) => type === 'error' ? <AlertTriangle size={14} className="mr-2 flex-shrink-0 text-red-400"/> : type === 'success' ? <CheckCircle size={14} className="mr-2 flex-shrink-0 text-green-400"/> : type === 'warning' ? <AlertTriangle size={14} className="mr-2 flex-shrink-0 text-yellow-400"/> : type === 'special' ? <Zap size={14} className="mr-2 flex-shrink-0 text-purple-400"/> : <Info size={14} className="mr-2 flex-shrink-0 text-gray-400"/>
                        } : null}
                    />
                </div>
            </div>
        </div>
    );
};

export default ConfigTab;
