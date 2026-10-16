
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
    FilePlus2, FileText, Trash2, Search, DownloadCloud, FolderOpen,
    RefreshCw, CheckCircle, XCircle, Loader2, Save, Cloud
} from 'lucide-react';
import { useToast } from "../components/ui/use-toast.js";
import { Checkbox } from "../components/ui/checkbox.jsx";
import { Button } from "../components/ui/button.jsx";
import { Input } from "../components/ui/input.jsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip.jsx";
import GenerationControlPanel from '../components/generation/GenerationControlPanel.jsx';
import { evaluateAllFormulas } from '../lib/formulaEngine.js';
import { addLegacyPlaceholderAliases } from '../lib/legacyPlaceholderAliases.js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { apcApi } from '../lib/apcApi.js';

const sanitizeFileNamePart = (value = '') => String(value).replace(/[\\/:*?"<>|]/g, '-').trim();

const buildFieldTypeMap = (fields = []) => {
    const map = new Map();
    const walk = (list = []) => {
        list.forEach((f) => {
            if (!f?.id) return;
            map.set(f.id, f.type);
            if (Array.isArray(f.subFields)) walk(f.subFields);
        });
    };
    walk(fields);
    return map;
};

const parseAsNumber = (value, numberFormat = {}) => {
    if (typeof value !== 'string') return value;
    const { thousand = ',', decimal = '.' } = numberFormat;
    const thousandRegex = new RegExp(`\\${thousand}`, 'g');
    const normalized = value.replace(thousandRegex, '').replace(decimal, '.');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : value;
};


const filterListItemsForPrint = (data, fields = []) => {
    const cloned = JSON.parse(JSON.stringify(data || {}));
    (fields || []).forEach((field) => {
        if (field?.type !== 'list' || !Array.isArray(field.subFields)) return;
        const printFlag = field.subFields.find(sf => sf?.type === 'boolean' && /^in_/.test(sf.id));
        if (!printFlag || !Array.isArray(cloned[field.id])) return;
        cloned[field.id] = cloned[field.id].filter(item => item?.[printFlag.id] === true || item?.[printFlag.id] === 'true' || item?.[printFlag.id] === undefined);
    });
    return cloned;
};

const addUppercaseToScopeWeb = (scope) => {
    if (!scope || typeof scope !== 'object') return;
    Object.keys(scope).forEach((key) => {
        const value = scope[key];
        if (value && typeof value === 'object') {
            addUppercaseToScopeWeb(value);
        } else if (typeof value === 'string' && !key.endsWith('_in_hoa')) {
            const upperKey = `${key}_in_hoa`;
            if (!Object.prototype.hasOwnProperty.call(scope, upperKey)) {
                scope[upperKey] = value.toLocaleUpperCase('vi-VN');
            }
        }
    });
};

const getFormattedScopeForRenderWeb = (originalScope, fields, numberFormat) => {
    const fieldTypeMap = buildFieldTypeMap(fields);
    const formatted = JSON.parse(JSON.stringify(originalScope || {}));
    addUppercaseToScopeWeb(formatted);

    const walk = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach((key) => {
            let value = obj[key];
            if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
                obj[key] = '';
                return;
            }
            if (typeof value === 'object') {
                walk(value);
                return;
            }

            const fieldType = fieldTypeMap.get(key);
            if (fieldType === 'number' || fieldType === 'currency') {
                if (typeof value === 'string') value = parseAsNumber(value, numberFormat);
                if (typeof value === 'number' && Number.isFinite(value)) {
                    obj[key] = new Intl.NumberFormat(numberFormat?.locale || 'vi-VN', {
                        useGrouping: true,
                        maximumFractionDigits: numberFormat?.decimalPlaces ?? 2
                    }).format(value);
                    return;
                }
            }

            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
                const date = new Date(value);
                if (!Number.isNaN(date.getTime())) {
                    obj[key] = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                }
            }
        });
    };

    walk(formatted);
    return formatted;
};

const GeneratorTab = ({
    templates,
    setTemplates,
    selectedTemplateIds,
    setSelectedTemplateIds,
    inputData, // This is RAW data
    isElectron,
    numberFormat,
    dateFormat,
    fields,
    setFields,
    fieldGroups,
    setFieldGroups,
    inputRawData,
    onInputDataChange,
    onOpenDataInput,
    autoTemplateBundleUrl
}) => {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [logs, setLogs] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [controlPanelData, setControlPanelData] = useState(null);

    const logContainerRef = useRef(null);
    const webFileInputRef = useRef(null);

    const derivedInputData = useMemo(() => {
        if (!fields || !inputData) return {};
        const dataClone = filterListItemsForPrint(inputData, fields);
        const evaluated = evaluateAllFormulas(dataClone, fields, numberFormat?.decimalPlaces);
        return addLegacyPlaceholderAliases(evaluated);
    }, [inputData, fields, numberFormat?.decimalPlaces]);

    const addLog = useCallback((message, type = 'info') => {
        const now = new Date();
        const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setLogs(prev => [...prev, { timestamp, message, type }]);
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    // V29: Restore listeners to match the resurrected preload.js
    useEffect(() => {
        if (!isElectron || !window.electronAPI) return;

        const handleGenerateStatus = (status) => {
             // The backend now sends { state: 'done' } or { state: 'error', error: '...' }
            if (status.state === 'done') {
                setIsGenerating(false);
            } else if (status.state === 'error') {
                addLog(`Lỗi hệ thống: ${status.error}`, 'error');
                setIsGenerating(false);
            }
        };

        const handleGenerateProgress = (progress) => {
            addLog(progress.log.message, progress.log.type);
        };

        const handleOpenControlPanel = (data) => {
            setIsGenerating(false);
            setControlPanelData(data);
        };

        const unsubStatus = window.electronAPI.onGenerateStatus(handleGenerateStatus);
        const unsubProgress = window.electronAPI.onGenerateProgress(handleGenerateProgress);
        const unsubControlPanel = window.electronAPI.onOpenGenerationControlPanel(handleOpenControlPanel);

        return () => {
            unsubStatus && unsubStatus();
            unsubProgress && unsubProgress();
            unsubControlPanel && unsubControlPanel();
        };
    }, [isElectron, addLog]);

    const safeTemplates = useMemo(() => Array.isArray(templates) ? templates : [], [templates]);
    
    const safeSelectedTemplateIds = useMemo(() => {
        try {
            // Validate that all selected IDs exist in templates
            const templateIds = new Set(selectedTemplateIds || []);
            const validIds = new Set();
            safeTemplates.forEach(t => {
                if (templateIds.has(t.id)) validIds.add(t.id);
            });
            // If some IDs were invalid, notify user
            if (validIds.size !== templateIds.size) {
                console.warn('Removed stale template IDs from selection');
            }
            return validIds;
        } catch (error) {
            console.error('Error validating template IDs:', error);
            return new Set();
        }
    }, [selectedTemplateIds, safeTemplates]);
    
    const filteredTemplates = useMemo(() => safeTemplates.filter(t => t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase())), [safeTemplates, searchTerm]);
    const selectedTemplates = useMemo(() => safeTemplates.filter(t => safeSelectedTemplateIds.has(t.id)), [safeTemplates, safeSelectedTemplateIds]);
    const areAllFilteredSelected = useMemo(() => filteredTemplates.length > 0 && filteredTemplates.every(t => safeSelectedTemplateIds.has(t.id)), [filteredTemplates, safeSelectedTemplateIds]);

    const resolveWebStrategies = useCallback((strategies = null) => {
        if (Array.isArray(strategies) && strategies.length) return strategies;
        return selectedTemplates.map((t) => ({ templateId: t.id, strategy: { type: 'SingleBundle' } }));
    }, [selectedTemplates]);

    const getOutputFileNameWeb = useCallback((template, baseScope, strategyInfo, item = null, index = 0) => {
        const originalName = (template.name || 'output').replace(/\.docx$/i, '');
        const ext = '.docx';
        const prefix = sanitizeFileNamePart(strategyInfo?.customPrefix || '');
        const namingFieldId = strategyInfo?.namingFieldId;

        let namingValue = '';
        if (namingFieldId && namingFieldId !== '__default__') {
            if (baseScope?.[namingFieldId]) namingValue = baseScope[namingFieldId];
            else {
                for (const key of Object.keys(baseScope || {})) {
                    if (Array.isArray(baseScope[key]) && baseScope[key]?.[0]?.[namingFieldId]) {
                        namingValue = baseScope[key][0][namingFieldId];
                        break;
                    }
                }
            }
        }

        const parts = [prefix, sanitizeFileNamePart(namingValue), sanitizeFileNamePart(originalName)].filter(Boolean);

        let itemSuffix = '';
        if (item && typeof item === 'object') {
            const firstText = Object.values(item).find(v => typeof v === 'string' && v.trim());
            itemSuffix = '_' + sanitizeFileNamePart(firstText || `muc-${index + 1}`);
        }

        return `${parts.join('_')}${itemSuffix}${ext}`;
    }, []);

    const getApcTemplateUrl = useCallback((template = {}) => {
        const path = String(template.path || '');
        if (path.startsWith('/templates/apc/')) return path;
        const fileId = template.apcMeta?.fileId || template.fileId;
        const fileName = template.name || template.fileName || template.title;
        if (!fileId || !fileName) return '';
        const safeName = String(fileName)
            .replace(/[\\/\x00-\x1f<>:"|?*]+/g, '_')
            .trim()
            .slice(0, 180) || 'document.docx';
        return `/templates/apc/${fileId}__${safeName}`;
    }, []);

    const renderTemplateWeb = useCallback(async (template, scope, outputName) => {
        if (!template.webBuffer) {
            const apcUrl = getApcTemplateUrl(template);
            if (apcUrl) {
                const fetchUrl = `${encodeURI(apcUrl)}?v=apc-native-docx-${Date.now()}`;
                const res = await fetch(fetchUrl, { cache: 'no-store' });
                if (res.ok) {
                    const blob = await res.blob();
                    template.webBuffer = await blob.arrayBuffer();
                    template.size = template.webBuffer.byteLength;
                    template.path = apcUrl;
                } else {
                    addLog(`Không tải được mẫu APC ${template.name || template.title}: HTTP ${res.status} (${apcUrl})`, 'error');
                }
            }
        }
        if (!template.webBuffer) {
            addLog(`Bỏ qua mẫu chưa có nội dung DOCX: ${template.name || template.title}`, 'error');
            return false;
        }
        const zip = new PizZip(template.webBuffer);
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{', end: '}' },
            parser: (tag) => {
                const key = String(tag || '').trim();
                const normalizedKey = key.replace(/[\[\]{}#|]/g, '').replace(/\s+/g, '_');
                return { get: (scope) => scope?.[key] ?? scope?.[normalizedKey] ?? '' };
            },
            nullGetter: () => ''
        });
        
        const restoreEscapedBraces = (value) => (typeof value === 'string'
            ? value.replace(/｛/g, '{').replace(/｝/g, '}')
            : value);
        const formattedScope = getFormattedScopeForRenderWeb(scope, fields, numberFormat);
        doc.render(formattedScope);
        doc.getZip().file(/word\/.*\.xml$/).forEach((file) => {
            const restored = restoreEscapedBraces(file.asText());
            if (restored !== file.asText()) doc.getZip().file(file.name, restored);
        });
        const out = doc.getZip().generate({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        saveAs(out, outputName);
        return true;
    }, [fields, numberFormat, addLog, getApcTemplateUrl]);

    const handleLoadProcessedTemplates = async (bundlePath = autoTemplateBundleUrl) => {
        if (!bundlePath) return;
        try {
            const res = await fetch(bundlePath);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const buffer = await blob.arrayBuffer();
            const zip = new PizZip(buffer);
            const incoming = [];
            Object.keys(zip.files).forEach((name) => {
                const entry = zip.files[name];
                if (entry.dir || !name.toLowerCase().endsWith('.docx')) return;
                const fileName = name.split('/').pop();
                const arr = entry.asArrayBuffer();
                incoming.push({
                    id: `auto-${fileName}-${arr.byteLength}`,
                    name: fileName,
                    webBuffer: arr,
                    size: arr.byteLength,
                    path: 'server-processed'
                });
            });
            // Nạp bộ mẫu cứng là THAY THẾ toàn bộ mẫu cứng cũ, không cộng dồn.
            setTemplates(prev => [
                ...prev.filter(t => t.path !== 'server-processed' && !String(t.id || '').startsWith('auto-')),
                ...incoming
            ]);
            setSelectedTemplateIds(new Set(incoming.map(t => t.id)));
            toast({ title: "Đã nạp mẫu đã gán", description: `Đã thay bộ mẫu cứng bằng ${incoming.length} mẫu mới, không cộng dồn mẫu cũ.` });
        } catch (error) {
            toast({ title: "Không nạp được mẫu đã gán", description: error.message, variant: "destructive" });
        }
    };

    const handleLoadTemplateGroup = async () => {
        const groups = [
            ['apc-ca-nhan-tieu-dung-khong-tsbd-luong', 'APC - Cá nhân tiêu dùng không TSBĐ: nguồn trả nợ từ lương'],
            ['apc-ca-nhan-tieu-dung-khong-tsbd-ndcp', 'APC - Cá nhân tiêu dùng không TSBĐ: theo NĐCP'],
            ['apc-ca-nhan-tieu-dung-co-tsbd', 'APC - Cá nhân tiêu dùng có tài sản bảo đảm'],
            ['apc-ca-nhan-tieu-dung-nhan-no', 'APC - Cá nhân tiêu dùng: hồ sơ nhận nợ'],
            ['apc-cam-co-cctg-sdtg-gia-tri-nho', 'APC - Cầm cố CCTG/SDTG: khoản vay giá trị nhỏ'],
            ['apc-cam-co-cctg-sdtg-tren-100-trieu', 'APC - Cầm cố CCTG/SDTG: mức vay trên 100 triệu'],
            ['apc-cam-co-cctg-sdtg-tctd-khac', 'APC - Cầm cố CCTG/SDTG: do TCTD khác phát hành'],
            ['apc-the-chap-trai-phieu-chua-vsdc', 'APC - Thế chấp trái phiếu Agribank: chưa ĐKGD tại VSDC'],
            ['apc-the-chap-trai-phieu-da-vsdc', 'APC - Thế chấp trái phiếu Agribank: đã ĐKGD tại VSDC'],
            ['apc-the-tin-dung-khong-tsbd', 'APC - Thẻ tín dụng không TSBĐ'],
            ['apc-the-tin-dung-co-tsbd', 'APC - Thẻ tín dụng có TSBĐ'],
            ['apc-tieu-dung-tra-no-truoc-han-tctd-khac', 'APC - Vay tiêu dùng trả nợ trước hạn TCTD khác'],
            ['apc-p29-ca-nhan-tieu-dung-ts-chinh-chu', 'APC - Cá nhân tiêu dùng: tài sản chính chủ'],
            ['apc-p29-ca-nhan-tieu-dung-ts-ben-thu-3', 'APC - Cá nhân tiêu dùng: tài sản bên thứ 3'],
            ['apc-p29-ca-nhan-kinh-doanh-ts-chinh-chu', 'APC - Cá nhân kinh doanh: tài sản chính chủ'],
            ['apc-p29-ca-nhan-kinh-doanh-ts-ben-thu-3', 'APC - Cá nhân kinh doanh: tài sản bên thứ 3'],
            ['apc-p29-doanh-nghiep-nhan-no', 'APC - Doanh nghiệp: nhận nợ'],
            ['apc-dn-phap-ly-cong-ty-co-phan', 'APC - Doanh nghiệp: pháp lý công ty cổ phần'],
            ['apc-dn-phap-ly-cong-ty-tnhh', 'APC - Doanh nghiệp: pháp lý công ty TNHH'],
            ['apc-dn-ho-so-cho-vay-phap-nhan', 'APC - Doanh nghiệp: hồ sơ cho vay pháp nhân'],
            ['apc-dn-nhan-no-phap-nhan-hmtd', 'APC - Doanh nghiệp: nhận nợ pháp nhân vay HMTD'],
            ['apc-dn-nhan-no-phap-nhan-tung-lan', 'APC - Doanh nghiệp: nhận nợ pháp nhân vay từng lần'],
            ['apc-dn-dieu-chinh-hmtd', 'APC - Doanh nghiệp: điều chỉnh hạn mức tín dụng'],
            ['apc-dn-bcdx-mau-excel', 'APC - Doanh nghiệp: BCĐX mẫu và Excel tính toán'],
            ['apc-dn-ho-so-cho-vay-chu-dntn', 'APC - Doanh nghiệp: hồ sơ cho vay chủ DNTN'],
            ['apc-dn-nhan-no-chu-dntn-hmtd', 'APC - Doanh nghiệp: nhận nợ chủ DNTN vay HMTD'],
            ['apc-dn-nhan-no-chu-dntn-tung-lan', 'APC - Doanh nghiệp: nhận nợ chủ DNTN vay từng lần'],
            ['apc-dn-thau-chi-phap-nhan', 'APC - Doanh nghiệp: thấu chi pháp nhân'],
            ['apc-dn-bao-lanh-phap-nhan', 'APC - Doanh nghiệp: bảo lãnh khách hàng pháp nhân'],
            ['ho-so-khac', 'Hồ sơ khác']
        ];
        const choiceText = groups.map((g, i) => `${i + 1}. ${g[1]}`).join('\n');
        const raw = window.prompt(`Chọn bộ mẫu cần nạp:\n${choiceText}\n\nNhập số 1-${groups.length}:`, '1');
        const idx = Number(raw) - 1;
        const selected = groups[idx];
        if (!selected) return;
        if (selected[0].startsWith('apc-')) {
            await handleLoadProcessedTemplates(`/processed-docx/apc/${selected[0]}.zip`);
            return;
        }
        await handleLoadProcessedTemplates(selected[0] === 'vay-tieu-dung-day-du' ? '/processed-docx/processed_vay-tieu-dung-day-du_v6.zip' : `/processed-docx/processed_${selected[0]}_v4.zip`);
    };

    const handleAddTemplates = async () => {
        if (!isElectron) {
            webFileInputRef.current?.click();
            return;
        }
        try {
            const result = await window.electronAPI.addTemplates();
            if (result && !result.canceled && result.success && result.data) {
                const newTemplates = result.data;
                const newKeys = new Set(newTemplates.map(t => t.path || t.name));
                setTemplates(prev => [
                    ...prev.filter(t => !newKeys.has(t.path || t.name)),
                    ...newTemplates
                ]);
                toast({ title: "Thành công", description: `Đã cập nhật ${newTemplates.length} mẫu mới, mẫu trùng tên/đường dẫn đã được thay thế.` });
            }
        } catch (error) {
            console.error('Error adding templates:', error);
            toast({ title: "Lỗi", description: "Không thể thêm mẫu. Vui lòng thử lại.", variant: "destructive" });
        }
    };

    const handleWebTemplateFiles = async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        const MAX_SIZE = 50 * 1024 * 1024; // 50MB — #20 OOM protection
        const incoming = [];
        for (const file of files) {
            if (!file.name.toLowerCase().endsWith('.docx')) { // #8 format check
                toast({ title: "Định dạng không hợp lệ", description: `${file.name} không phải file .docx`, variant: "destructive" });
                continue;
            }
            if (file.size > MAX_SIZE) { // #20 OOM protection
                toast({ title: "File quá lớn", description: `${file.name} (${(file.size/1024/1024).toFixed(1)}MB) vượt quá giới hạn 50MB`, variant: "destructive" });
                continue;
            }
            const buffer = await file.arrayBuffer();
            // Validate ZIP magic bytes (DOCX là ZIP: PK\x03\x04)
            const magic = new Uint8Array(buffer.slice(0, 4));
            if (magic[0] !== 0x50 || magic[1] !== 0x4B) { // #8
                toast({ title: "File lỗi", description: `${file.name} không phải file DOCX hợp lệ`, variant: "destructive" });
                continue;
            }
            const id = `${file.name}-${file.size}-${file.lastModified}`;
            incoming.push({ id, name: file.name, webBuffer: buffer, size: file.size, path: 'web' });
        }
        const newNames = new Set(incoming.map(t => t.name));
        setTemplates(prev => [
            ...prev.filter(t => !newNames.has(t.name)),
            ...incoming
        ]);
        if (incoming.length > 0) toast({ title: "Thành công", description: `Đã cập nhật ${incoming.length} mẫu (web), mẫu trùng tên đã được thay thế.` });
        event.target.value = '';
    };
    
    const handleDeleteSelected = () => {
        if (safeSelectedTemplateIds.size === 0) return;
        setTemplates(prev => prev.filter(t => !safeSelectedTemplateIds.has(t.id)));
        setSelectedTemplateIds(new Set());
    };

    // (3) Nap mau .docx tu server (thu muc templates/ — do AdminTab upload)
    // Fetch binary /api/templates/:name -> webBuffer -> docxtemplater render duoc.
    const handleLoadServerTemplates = async () => {
        let list = [];
        try {
            list = await apcApi.listServerTemplates();
        } catch (e) {
            toast({ title: 'Không nối được API mẫu', description: `${e.message} (chạy node server/api.js)`, variant: 'destructive' });
            return;
        }
        if (!list.length) {
            toast({ title: 'Server chưa có mẫu nào', description: 'Vào tab Quản Trị → Mẫu .docx để upload.' });
            return;
        }
        try {
            const incoming = [];
            for (const t of list) {
                const res = await fetch(`http://127.0.0.1:20246/api/templates/${encodeURIComponent(t.name)}`);
                if (!res.ok) { addLog(`Không tải được mẫu server ${t.name}: HTTP ${res.status}`, 'error'); continue; }
                const buffer = await res.arrayBuffer();
                incoming.push({ id: `server-${t.name}-${t.size}`, name: t.name, webBuffer: buffer, size: t.size, path: 'server-templates' });
            }
            const names = new Set(incoming.map(t => t.name));
            setTemplates(prev => [...prev.filter(t => !names.has(t.name)), ...incoming]);
            setSelectedTemplateIds(new Set(incoming.map(t => t.id)));
            toast({ title: 'Đã nạp mẫu từ server', description: `${incoming.length} mẫu .docx từ thư mục templates/` });
        } catch (e) {
            toast({ title: 'Lỗi nạp mẫu server', description: e.message, variant: 'destructive' });
        }
    };

    const handleToggleSelect = (id, isSelected) => {
        const newSet = new Set(safeSelectedTemplateIds);
        if (isSelected) newSet.add(id); else newSet.delete(id);
        setSelectedTemplateIds(newSet);
    };

    const handleSelectAllFiltered = (checked) => {
        const newSet = new Set(safeSelectedTemplateIds);
        filteredTemplates.forEach(t => { if (checked) newSet.add(t.id); else newSet.delete(t.id); });
        setSelectedTemplateIds(newSet);
    };
    
    // #1 #7: Validate trước khi generate
    const validateBeforeGeneration = () => {
        if (selectedTemplates.length === 0) {
            toast({ title: "Chưa chọn mẫu", description: "Vui lòng chọn ít nhất một mẫu để tạo file.", variant: "destructive" });
            return false;
        }
        // Không chặn ở đây: mẫu APC có thể chưa có webBuffer tại lúc validate,
        // nhưng renderTemplateWeb sẽ tự fetch lại từ /templates/apc trước khi tạo.
        const hasAnyData = derivedInputData && Object.values(derivedInputData).some(v => v !== '' && v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0));
        if (!hasAnyData) {
            toast({ title: "Chưa có dữ liệu", description: "Vui lòng nhập dữ liệu trước khi tạo file.", variant: "destructive" });
            return false;
        }
        // Chỉ cảnh báo trường bắt buộc, không chặn tạo file vì mẫu có thể không dùng hết placeholder.
        if (Array.isArray(fields)) {
            const emptyRequired = fields.filter(f => f.required && (!derivedInputData[f.id] || derivedInputData[f.id] === ''));
            if (emptyRequired.length > 0) {
                toast({ title: "Cảnh báo thiếu dữ liệu", description: `Thiếu: ${emptyRequired.map(f => f.name || f.id).join(', ')}. Vẫn tiếp tục tạo file.`, variant: "default" });
            }
        }
        return true;
    };

    const handleStartGeneration = async () => {
        if (!validateBeforeGeneration()) return; // #1

        setIsGenerating(true);
        setLogs([]);
        addLog(`Bắt đầu phân tích yêu cầu...`, 'system');

        if (isElectron) {
            try {
                const request = {
                    templates: selectedTemplates.map(({ id, path, name }) => ({ id, path, name })),
                    inputData: derivedInputData,
                    numberFormat: numberFormat,
                    dateFormat: dateFormat || 'DD/MM/YYYY',
                    fields: fields
                };
                await window.electronAPI.startGeneration(request);
            } catch (error) {
                console.error('Error starting generation:', error);
                addLog(`Lỗi: ${error.message}${error.stack ? '\n' + error.stack : ''}`, 'error'); // #10
                setIsGenerating(false);
            }
        } else {
            try {
                const strategies = resolveWebStrategies();
                let outputCount = 0;
                const usedFileNames = new Set(); // #15 conflict tracking

                const checkAndGetFileName = (name) => { // #15
                    if (usedFileNames.has(name)) {
                        const base = name.replace(/\.docx$/i, '');
                        let counter = 2;
                        let newName;
                        do { newName = `${base}_${counter++}.docx`; } while (usedFileNames.has(newName));
                        addLog(`Cảnh báo: Tên file trùng "${name}" → đổi thành "${newName}"`, 'error');
                        name = newName;
                    }
                    usedFileNames.add(name);
                    return name;
                };

                for (const tpl of selectedTemplates) {
                    const strategyInfo = strategies.find(s => s.templateId === tpl.id) || { strategy: { type: 'SingleBundle' } };
                    const strategy = strategyInfo.strategy || { type: 'SingleBundle' };
                    const listName = strategy.listName;
                    const listData = Array.isArray(derivedInputData?.[listName]) ? derivedInputData[listName] : [];

                    if (strategy.type === 'MailMerge' && listName) {
                        if (listData.length === 0) { addLog(`Cảnh báo: Danh sách "${listName}" trống — bỏ qua mẫu ${tpl.name}`, 'error'); continue; }
                        const indices = strategy.selectedIndices?.length ? strategy.selectedIndices : listData.map((_, i) => i);
                        for (const i of indices) {
                            const item = listData[i];
                            if (!item) continue;
                            const { [listName]: _skip, ...baseScope } = derivedInputData;
                            const scope = { ...baseScope, ...item, [listName]: [item] };
                            const outName = checkAndGetFileName(getOutputFileNameWeb(tpl, scope, strategyInfo, item, i));
                            if (await renderTemplateWeb(tpl, scope, outName)) {
                                addLog(`[Hàng loạt] Đã tạo ${outName}`, 'success');
                                outputCount++;
                            }
                        }
                        continue;
                    }

                    if (strategy.type === 'SingleItem' && listName && Number.isInteger(strategy.itemIndex)) {
                        const item = listData[strategy.itemIndex];
                        if (!item) { addLog(`Bỏ qua ${tpl.name}: không tìm thấy item index ${strategy.itemIndex}`, 'error'); continue; }
                        const { [listName]: _skip, ...baseScope } = derivedInputData;
                        const scope = { ...baseScope, ...item, [listName]: [item] };
                        const outName = checkAndGetFileName(getOutputFileNameWeb(tpl, scope, strategyInfo, item, strategy.itemIndex));
                        if (await renderTemplateWeb(tpl, scope, outName)) {
                            addLog(`[1 mục] Đã tạo ${outName}`, 'success');
                            outputCount++;
                        }
                        continue;
                    }

                    const outName = checkAndGetFileName(getOutputFileNameWeb(tpl, derivedInputData, strategyInfo));
                    if (await renderTemplateWeb(tpl, derivedInputData, outName)) {
                        addLog(`[Tổng hợp] Đã tạo ${outName}`, 'success');
                        outputCount++;
                    }
                }

                addLog(`Hoàn tất: ${outputCount} file`, outputCount ? 'success' : 'error');
            } catch (e) {
                addLog(`Lỗi tạo file web: ${e.message}${e.stack ? '\n' + e.stack : ''}`, 'error'); // #10
            } finally {
                setIsGenerating(false);
            }
        }
    };

    // V29: Send DERIVED data to the backend, this is the proper flow after control panel
    const handleConfirmStrategies = async (strategies) => {
        setControlPanelData(null);
        setIsGenerating(true);
        addLog(`Đã nhận chiến lược. Bắt đầu tạo file...`, 'system');

        if (isElectron) {
            try {
                const request = {
                    templates: selectedTemplates.map(({ id, path, name }) => ({ id, path, name })),
                    inputData: derivedInputData, 
                    numberFormat: numberFormat,
                    dateFormat: dateFormat || 'DD/MM/YYYY',
                    strategies: strategies,
                    fields: fields
                };
                await window.electronAPI.executeGenerationStrategies(request);
            } catch (error) {
                console.error('Error executing generation strategies:', error);
                addLog(`Lỗi: ${error.message}`, 'error');
                setIsGenerating(false);
            }
        } else {
            try {
                const strategyMap = resolveWebStrategies(strategies);
                let outputCount = 0;

                for (const tpl of selectedTemplates) {
                    const strategyInfo = strategyMap.find(s => s.templateId === tpl.id) || { strategy: { type: 'SingleBundle' } };
                    const strategy = strategyInfo.strategy || { type: 'SingleBundle' };
                    const listName = strategy.listName;
                    const listData = Array.isArray(derivedInputData?.[listName]) ? derivedInputData[listName] : [];

                    if (strategy.type === 'MailMerge' && listName) {
                        const indices = strategy.selectedIndices?.length
                            ? strategy.selectedIndices
                            : listData.map((_, i) => i);
                        for (const i of indices) {
                            const item = listData[i];
                            if (!item) continue;
                            const { [listName]: _skip, ...baseScope } = derivedInputData;
                            const scope = { ...baseScope, ...item, [listName]: [item] };
                            const outName = getOutputFileNameWeb(tpl, scope, strategyInfo, item, i);
                            if (await renderTemplateWeb(tpl, scope, outName)) {
                                addLog(`[Hàng loạt] Đã tạo ${outName}`, 'success');
                                outputCount++;
                            }
                        }
                        continue;
                    }

                    if (strategy.type === 'SingleItem' && listName && Number.isInteger(strategy.itemIndex)) {
                        const item = listData[strategy.itemIndex];
                        if (!item) {
                            addLog(`Bỏ qua ${tpl.name}: không tìm thấy item index ${strategy.itemIndex}`, 'error');
                            continue;
                        }
                        const { [listName]: _skip, ...baseScope } = derivedInputData;
                        const scope = { ...baseScope, ...item, [listName]: [item] };
                        const outName = getOutputFileNameWeb(tpl, scope, strategyInfo, item, strategy.itemIndex);
                        if (await renderTemplateWeb(tpl, scope, outName)) {
                            addLog(`[1 mục] Đã tạo ${outName}`, 'success');
                            outputCount++;
                        }
                        continue;
                    }

                    const outName = getOutputFileNameWeb(tpl, derivedInputData, strategyInfo);
                    if (await renderTemplateWeb(tpl, derivedInputData, outName)) {
                        addLog(`[Tổng hợp] Đã tạo ${outName}`, 'success');
                        outputCount++;
                    }
                }

                addLog(`Hoàn tất: ${outputCount} file`, outputCount ? 'success' : 'error');
            } catch (error) {
                addLog(`Lỗi web generation với strategy: ${error.message}`, 'error');
            } finally {
                setIsGenerating(false);
            }
        }
    };
    
    const handleOpenFolder = () => isElectron && window.electronAPI.openOutputFolder();
    
    return (
        <TooltipProvider>
            <input
                ref={webFileInputRef}
                type="file"
                accept=".docx"
                multiple
                onChange={handleWebTemplateFiles}
                style={{ display: 'none' }}
            />
            {controlPanelData && (
                <GenerationControlPanel 
                    controlPanelData={controlPanelData}
                    onConfirm={handleConfirmStrategies}
                    onCancel={() => setControlPanelData(null)}
                />
            )}

            <div className="h-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel: Template Selection */}
                <div className="flex flex-col bg-white dark:bg-gray-800/50 rounded-lg shadow-md min-h-0">
                    <div className="p-3 border-b dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Tooltip content="Thêm mẫu từ máy tính"><Button size="icon" onClick={handleAddTemplates} className="bg-blue-600 text-white hover:bg-blue-700"><FilePlus2 size={18}/></Button></Tooltip>
                            <Tooltip content="Chọn bộ mẫu đã gán placeholder"><Button size="icon" onClick={handleLoadTemplateGroup} className="bg-amber-600 text-white hover:bg-amber-700"><Cloud size={18}/></Button></Tooltip>
                            <Tooltip content="Nạp mẫu .docx từ server (tab Quản Trị đã upload)"><Button size="icon" onClick={handleLoadServerTemplates} className="bg-teal-600 text-white hover:bg-teal-700"><DownloadCloud size={18}/></Button></Tooltip>
                            <Tooltip content="Lưu bộ mẫu (đang phát triển)"><span><Button variant="secondary" size="icon" disabled><Save size={18}/></Button></span></Tooltip>
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input type="text" placeholder={`Tìm trong ${safeTemplates.length} mẫu...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 h-9"/>
                            </div>
                            <Tooltip content="Xóa các mẫu đã chọn"><span><Button variant="destructive" size="icon" onClick={handleDeleteSelected} disabled={safeSelectedTemplateIds.size === 0}><Trash2 size={18}/></Button></span></Tooltip>
                        </div>
                         <div className="flex items-center space-x-2 mt-3 pl-1">
                            <Checkbox id="select-all" checked={areAllFilteredSelected} onCheckedChange={handleSelectAllFiltered} />
                            <label htmlFor="select-all" className="text-sm font-medium">Chọn tất cả ({filteredTemplates.length})</label>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2 space-y-1">
                        {filteredTemplates.map(template => (
                            <TemplateItem key={template.id} template={template} onToggle={handleToggleSelect} isSelected={safeSelectedTemplateIds.has(template.id)}/>
                        ))}
                    </div>
                </div>

                {/* Right Panel: Controls & Logging */}
                <div className="flex flex-col bg-white dark:bg-gray-800/50 rounded-lg shadow-md min-h-0">
                    <div className="p-3 border-b dark:border-gray-700 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleStartGeneration}
                                disabled={selectedTemplates.length === 0 || isGenerating}
                                className="flex-grow h-9 text-base font-semibold shadow-lg disabled:shadow-none disabled:bg-gray-400 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
                            >
                                {isGenerating ? <><Loader2 className="animate-spin mr-2"/> Đang xử lý...</> : <><DownloadCloud size={20}/>Bắt Đầu</>}
                            </Button>
                            {isElectron && <Tooltip content="Mở thư mục kết quả"><span><Button variant="secondary" size="icon" onClick={handleOpenFolder} disabled={isGenerating}><FolderOpen size={18}/></Button></span></Tooltip>}
                        </div>
                    </div>

                    <div ref={logContainerRef} className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/70 font-mono text-xs">
                         {logs.length === 0 && !isGenerating && (
                             <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                                <FileText size={48} />
                                <p className="mt-4 text-base font-medium">Bảng điều khiển</p>
                                <p className="mt-1">Nhật ký tạo file sẽ xuất hiện ở đây.</p>
                            </div>
                        )}
                        {logs.map((log, index) => (
                            <div key={index} className={`flex items-start gap-3 p-1.5 rounded ${log.type === 'error' ? 'text-red-500' : log.type.startsWith('system') ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                <span className="mt-0.5"><LogIcon type={log.type} /></span>
                                <span>[{log.timestamp}]</span>
                                <span className="flex-1 whitespace-pre-wrap">{log.message}</span>
                            </div>
                        ))}
                        {!isGenerating && logs.length > 0 && (
                             <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                                <p className="font-semibold text-lg">Hoàn tất!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
};

const TemplateItem = React.memo(({ template, onToggle, isSelected }) => (
    <div className={`flex items-center p-2 rounded-md transition-colors duration-150 ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}>
        <Checkbox
            id={`template-${template.id}`}
            checked={isSelected}
            onCheckedChange={(checked) => onToggle(template.id, checked)}
            className="h-5 w-5 mx-2.5"
        />
        <label
            htmlFor={`template-${template.id}`}
            className="flex-grow min-w-0 ml-1 cursor-pointer flex items-center p-0.5"
        >
            <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="flex-grow min-w-0 ml-3">
                <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate" title={template.name}>{template.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{String(template.path || '').startsWith('apc-native:') ? 'Từ APC native (metadata)' : template.path !== 'web' ? 'Từ máy tính' : 'Từ trình duyệt'}</p> 
            </div>
        </label>
    </div>
));

const LogIcon = ({ type }) => {
    switch (type) {
        case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
        case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
        case 'system': return <RefreshCw className="h-4 w-4 text-blue-500" />;
        case 'info':
        default: return <Loader2 className="h-4 w-4 text-gray-400" />;
    }
};

export default GeneratorTab;
