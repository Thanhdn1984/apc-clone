
const { contextBridge, ipcRenderer } = require('electron');

const createListener = (channel) => (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
};

console.log("--- PRELOAD ĐANG CHẠY PHIÊN BẢN V31.0-UPDATE-DEBUG ---");

contextBridge.exposeInMainWorld('electronAPI', {
    // === FROM OLDER VERSION (HEART OF THE SYSTEM) ===
    savePreset: (name, data) => ipcRenderer.invoke('save-preset', name, data),
    loadPreset: (name) => ipcRenderer.invoke('load-preset', name),
    loadPresetDialog: () => ipcRenderer.invoke('load-preset-dialog'),
    savePresetDialog: (data) => ipcRenderer.invoke('save-preset-dialog', data),
    openOutputFolder: () => ipcRenderer.send('open-output-folder'),
    openReverseOutputFolder: () => ipcRenderer.send('open-reverse-output-folder'),

    // === FILE SYSTEM APIs ===
    readDirectoryFiles: (dirPath, extension) => ipcRenderer.invoke('readDirectoryFiles', dirPath, extension),
    readFileAsBuffer: (filePath) => ipcRenderer.invoke('readFileAsBuffer', filePath),
    saveFileDialog: (options) => ipcRenderer.invoke('saveFileDialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('writeFile', filePath, data),
    clearCache: () => ipcRenderer.invoke('clearCache'),

    // === EXCEL APIs ===
    excel: {
        selectFile: () => ipcRenderer.invoke('excel:selectFile'),
        detectMapping: (filePath, fields) => ipcRenderer.invoke('excel:detectMapping', filePath, fields),
        importBatch: (filePath, columnMapping, fields) => ipcRenderer.invoke('excel:importBatch', filePath, columnMapping, fields),
        exportCustomers: (customers, fields, options) => ipcRenderer.invoke('excel:exportCustomers', customers, fields, options),
        createTemplate: (fields, options) => ipcRenderer.invoke('excel:createTemplate', fields, options),
    },

    // === FROM NEWER VERSION (BRAIN OF CONFIGURATION) ===
    profiles: {
        selectDirectory: () => ipcRenderer.invoke('profiles:select-directory'),
        getList: (dirPath) => ipcRenderer.invoke('profiles:get-list', dirPath),
        load: (filePath) => ipcRenderer.invoke('profiles:load', filePath),
        save: (filePath, data, isOverwrite) => ipcRenderer.invoke('profiles:save', filePath, data, isOverwrite),
        delete: (filePath) => ipcRenderer.invoke('profiles:delete', filePath),
    },

    // === COMMON/MERGED APIS ===
    addTemplates: () => ipcRenderer.invoke('add-templates'),
    startGeneration: (request) => ipcRenderer.invoke('start-generation', request),
    executeGenerationStrategies: (request) => ipcRenderer.invoke('execute-generation-strategies', request),
    selectSourceDialog: () => ipcRenderer.invoke('select-source-dialog'),
    selectSaveDirectoryDialog: () => ipcRenderer.invoke('select-save-directory-dialog'),
    reverseGenerateTemplate: (request) => ipcRenderer.invoke('reverse-generate-template', request),

    // === MERGED EVENT LISTENERS ===
    onGenerateProgress: createListener('generate-progress'),
    onReverseGenerateProgress: createListener('reverse-generate-progress'),
    onGenerateStatus: createListener('generate-status'), // Resurrected
    onOpenGenerationControlPanel: createListener('open-generation-control-panel'), // Resurrected

    // === AUTO-UPDATE APIs ===
    onUpdateAvailable: createListener('update_available'),
    onUpdateNotAvailable: createListener('update_not_available'),
    onUpdateDownloaded: createListener('update_downloaded'),
    onUpdateError: createListener('update_error'),
    onUpdateProgress: createListener('update_progress'),
    onUpdateLog: createListener('update_log'),  // NEW: Debug log listener
    restartApp: () => ipcRenderer.send('restart_app'),
    checkForUpdates: () => ipcRenderer.send('check_for_updates'),
});
