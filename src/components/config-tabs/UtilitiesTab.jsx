import React, { useState, useEffect, useRef } from 'react';
import { Play, FolderOpen, Trash2, CheckCircle, XCircle, Info, Upload, Save, Loader2, HardDrive, Zap, Settings, ChevronsRight, FileText, AlertTriangle } from 'lucide-react';

const UtilitiesTab = ({ isElectron, inputData, fields, linkedFieldConfig, sourcePaths, setSourcePaths, destinationPath, setDestinationPath, numberFormat }) => {
    const [progress, setProgress] = useState({ isRunning: false, status: 'idle', total: 0, current: 0, message: '' });
    const [logs, setLogs] = useState([]);
    const [statusInfo, setStatusInfo] = useState({ message: '', type: 'idle' });
    const logContainerRef = useRef(null);

    // --- LOGIC & SIDE EFFECTS ---
    const appendLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString('vi-VN');
        setLogs(prev => [{ timestamp, message, type }, ...prev]);
    };

    const resetState = () => {
        setLogs([]);
        setProgress({ isRunning: false, status: 'idle', total: 0, current: 0, message: '' });
        setStatusInfo({ message: '', type: 'idle' });
        appendLog("Nhật ký đã được xóa.", "info");
    };

    useEffect(() => {
        logContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        if (!isElectron || !window.electronAPI) return;
        const removeListener = window.electronAPI.onReverseGenerateProgress((payload) => {
            setProgress(prev => ({ ...prev, isRunning: !['done', 'error', 'idle'].includes(payload.status), ...payload }));
            if (payload.log) appendLog(payload.log.message, payload.log.type);
            if (['done', 'error'].includes(payload.status)) setStatusInfo({ message: payload.message, type: payload.status });
            else if (statusInfo.type !== 'idle') setStatusInfo({ message: '', type: 'idle' });
        });
        return () => removeListener();
    }, [isElectron, statusInfo.type]);

    // --- API HANDLERS ---
    const handleSelectSources = async () => {
        if (!isElectron || progress.isRunning) return;
        const result = await window.electronAPI.selectSourceDialog();
        if (!result || result.canceled || result.filePaths.length === 0) {
            appendLog("[Cảnh báo] Người dùng đã hủy thao tác chọn nguồn.", "warning");
        } else {
            setSourcePaths(result.filePaths);
            appendLog(`[Cấu hình] Đã chọn ${result.filePaths.length} file/thư mục nguồn.`, "success");
        }
    };

    const handleSelectDestination = async () => {
        if (!isElectron || progress.isRunning) return;
        const result = await window.electronAPI.selectSaveDirectoryDialog();
        if (!result || result.canceled || result.filePaths.length === 0) {
            appendLog("[Cảnh báo] Người dùng đã hủy thao tác chọn thư mục đích.", "warning");
        } else {
            const path = result.filePaths[0];
            setDestinationPath(path);
            appendLog(`[Cấu hình] Thư mục đích được đặt thành: ${path}`, "success");
        }
    };
    
    const handleInitiateReverseGenerate = async () => {
        if (progress.isRunning || !sourcePaths?.length || !destinationPath) return;
        if (!inputData || Object.keys(inputData).length === 0 || Object.values(inputData).every(v => !v || (Array.isArray(v) && v.length === 0))) {
            const msg = '[Lỗi] Không thể bắt đầu. Dữ liệu tại tab "Nhập Dữ Liệu" không được để trống.';
            setStatusInfo({ message: 'Không thể bắt đầu vì dữ liệu nhập liệu đang trống.', type: 'error' });
            appendLog(msg, 'error');
            return;
        }
        
        resetState();
        appendLog("[Bắt đầu] Luồng 'Tạo Mẫu Ngược' đã được khởi tạo. Các tham số hợp lệ.", "special");
        
        await window.electronAPI.reverseGenerateTemplate({ 
            inputData, 
            fields, 
            linkedFieldConfig, 
            sourcePaths, 
            destinationPath, 
            settings: { numberFormat }
        });
    };

    // --- SUB-COMPONENTS ---
    const LogIcon = ({ type }) => {
        const iconMap = {
            success: <CheckCircle className="text-green-500" size={15} />,
            error: <XCircle className="text-red-500" size={15} />,
            warning: <AlertTriangle className="text-yellow-500" size={15} />,
            special: <Play className="text-purple-500" size={15} />,
            default: <Info className="text-gray-500" size={15} />
        };
        return iconMap[type] || iconMap.default;
    };

    const StatusNotification = ({ message, type }) => {
        if (!message || type === 'idle') return null;
        const baseClasses = "flex items-center p-3 rounded-lg text-sm mb-3 border-l-4";
        const typeClasses = {
            done: "bg-green-100 border-green-500 text-green-800",
            error: "bg-red-100 border-red-500 text-red-800",
        };
        return (
            <div className={`${baseClasses} ${typeClasses[type] || ''}`}>
                {type === 'error' ? <XCircle size={20} className="mr-3 flex-shrink-0" /> : <CheckCircle size={20} className="mr-3 flex-shrink-0" />}
                <p className="flex-grow">{message}</p>
            </div>
        );
    };

    const PathDisplay = ({ path, type }) => (
        <div className='mt-1.5 flex items-center bg-gray-100 p-2 rounded-md text-xs'>
            <div className='w-4 h-4 flex-shrink-0 mr-2 flex items-center justify-center'>
                 {type === 'source' ? <FileText size={14} className='text-gray-500'/> : <HardDrive size={14} className='text-gray-500'/>}
            </div>
            <span className='text-gray-700 truncate select-all' title={Array.isArray(path) ? path.join('; ') : path}>
                {Array.isArray(path) ? `${path.length} nguồn được chọn` : path || `Chưa chọn`}
            </span>
        </div>
    );

    // --- MAIN RENDER ---
    if (!isElectron) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center rounded-lg bg-gray-50 p-8">
                <Zap size={40} className="mb-4 text-yellow-500" />
                <h3 className="text-lg font-bold">Tính năng chỉ có trên Desktop</h3>
                <p className="max-w-md mt-2 text-gray-500">Chức năng này yêu cầu quyền truy cập hệ thống file và chỉ có trên bản Desktop.</p>
            </div>
        );
    }

    const logTypeClasses = {
        error: 'text-red-600',
        success: 'text-green-600',
        warning: 'text-yellow-600',
        special: 'text-purple-600 font-semibold',
        default: 'text-gray-800'
    };

    return (
        <div className="grid grid-cols-5 gap-4 h-full">
            {/* === CỘT TRÁI: ĐIỀU KHIỂN (40%) === */}
            <div className="col-span-2 flex flex-col bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-base font-semibold text-banking-navy mb-4 flex items-center"><Settings size={18} className="mr-2" />Cài đặt luồng ngược</h3>
                <div className='space-y-4'>
                    <div>
                        <button onClick={handleSelectSources} disabled={progress.isRunning} className="w-full flex items-center justify-center font-semibold text-sm rounded-md py-2 px-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-60">
                            <Upload size={16} className="mr-2"/> Chọn Nguồn...
                        </button>
                        <PathDisplay path={sourcePaths} type="source"/>
                    </div>
                    <div>
                        <button onClick={handleSelectDestination} disabled={progress.isRunning} className="w-full flex items-center justify-center font-semibold text-sm rounded-md py-2 px-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-60">
                            <Save size={16} className="mr-2"/> Chọn Đích...
                        </button>
                        <PathDisplay path={destinationPath} type="destination"/>
                    </div>
                </div>
                <div className="mt-auto pt-4">
                     <button onClick={handleInitiateReverseGenerate} disabled={progress.isRunning || !sourcePaths?.length || !destinationPath} className="w-full flex items-center justify-center font-bold text-lg rounded-lg py-3 px-4 bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:shadow-none shadow-lg hover:shadow-purple-500/40 transition-all duration-300">
                        {progress.isRunning ? <Loader2 className="animate-spin mr-3" size={24}/> : <ChevronsRight className="mr-2" size={24}/>}
                        {progress.isRunning ? `Đang xử lý...` : "Bắt Đầu"}
                    </button>
                    <p className='text-center text-xs text-gray-400 mt-2'>Bắt đầu quá trình tạo file hàng loạt.</p>
                </div>
            </div>

            {/* === CỘT PHẢI: NHẬT KÝ (60%) === */}
            <div className="col-span-3 flex flex-col bg-white rounded-lg shadow-md overflow-hidden min-h-0">
                <div className="flex-shrink-0 p-3 border-b border-gray-200">
                    <StatusNotification message={statusInfo.message} type={statusInfo.type} />
                    {progress.isRunning && (
                        <div className="space-y-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}></div>
                            </div>
                            <p className="text-xs text-center text-gray-500 truncate">{`(${progress.current}/${progress.total}) ${progress.message || '...'}`}</p>
                        </div>
                    )}
                </div>
                
                <div ref={logContainerRef} className="flex-grow overflow-y-auto p-4 font-mono text-xs">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center">
                            <FileText size={32} className="mb-3" />
                            <p className="font-sans text-base font-medium text-gray-500">Nhật ký hệ thống</p>
                            <p className="font-sans text-sm">Các hoạt động sẽ được ghi lại tại đây.</p>
                        </div>
                    ) : (
                        logs.map((entry, index) => (
                            <div key={index} className={`flex items-start mb-2.5 last:mb-0 ${logTypeClasses[entry.type] || logTypeClasses.default}`}>
                                <span className="text-gray-400 mr-3">[{entry.timestamp}]</span>
                                <div className="flex-shrink-0 pt-0.5"><LogIcon type={entry.type} /></div>
                                <span className="flex-1 ml-2 whitespace-pre-wrap break-words">{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>
                 <div className="flex-shrink-0 p-2 border-t border-gray-200">
                    <button onClick={resetState} disabled={progress.isRunning} className="w-full flex items-center justify-center text-xs text-gray-500 hover:text-red-600 hover:bg-red-100 rounded-md py-1 disabled:opacity-50">
                       <Trash2 size={13} className='mr-1.5'/> Xóa Nhật ký
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UtilitiesTab;
