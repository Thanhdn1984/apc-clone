
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs.jsx";
import { Dna, Settings, Bot, Download, RefreshCw, Wrench, MonitorDown } from 'lucide-react';
import { useToast } from "./components/ui/use-toast.js";
import { Toaster } from "./components/ui/toaster.jsx";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./components/ui/alert-dialog.jsx";
import { Progress } from "./components/ui/progress.jsx";

import DataInputTab from './tabs/DataInputTab.jsx';
import GeneratorTab from './tabs/GeneratorTab.jsx';
import ConfigTab from './tabs/ConfigTab.jsx';
import ToolsTab from './tabs/ToolsTab.jsx';
import WelcomeGuide from './components/WelcomeGuide.jsx';
import defaultState from './defaultState.js';
import { autoExportAllProfiles } from './lib/portableDataManager.js';
import { APC_NATIVE_SCHEMA } from './apcNativeProfile.js';
// V-REVOLUTION: Legacy formula functions are no longer needed here.
// They are handled by the modern formulaEngine.
// import { evaluateCalc, DocSo, DateSub } from './lib/utils.js'; 

// Import version from package.json để đồng bộ
import packageJson from '../package.json';

const APP_VERSION = packageJson.version; // Lấy từ package.json để đồng bộ
// CRITICAL FIX: Use STABLE key to prevent data loss on version upgrade!
// Previously: docuGenAppState_v2.2.0 → docuGenAppState_v2.2.14 (different keys = data loss!)
const APP_STATE_KEY = 'docuGenAppState_STABLE'; // Single key for ALL versions
const WELCOME_GUIDE_KEY = 'hasSeenWelcomeGuide_STABLE';
const DOCX_SYNC_KEY = 'default';
const SCHEMA_SYNC_KEYS = ['fields', 'fieldGroups', 'templates', 'linkedFieldConfig', 'namingFieldId', 'schemaVersion'];
const pickSchemaState = (source = {}) => SCHEMA_SYNC_KEYS.reduce((acc, key) => {
  if (Object.prototype.hasOwnProperty.call(source, key)) acc[key] = source[key];
  return acc;
}, {});
const isElectron = !!window.electronAPI;

// Auto-migrate data from old versioned keys to STABLE key
// This handles users upgrading from v2.2.0, v2.2.14 etc. to the new STABLE key system
const migrateDataFromOldVersion = () => {
  // Check if STABLE key already has data
  if (localStorage.getItem(APP_STATE_KEY)) {
    console.log('✅ Data found in STABLE key, no migration needed');
    return null; // Already using STABLE key
  }

  console.log('🔍 Looking for data in old versioned keys...');

  // Find ALL old version keys (docuGenAppState_v2.2.0, docuGenAppState_v2.2.14, etc.)
  const oldKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Match both "docuGenAppState_v..." and "docuGenAppState_STABLE" patterns
    if (key && key.startsWith('docuGenAppState_') && key !== APP_STATE_KEY) {
      const data = localStorage.getItem(key);
      if (data) {
        oldKeys.push({
          key: key,
          data: data,
          size: data.length
        });
        console.log(`📦 Found old key: ${key} (${Math.round(data.length / 1024)} KB)`);
      }
    }
  }

  if (oldKeys.length === 0) {
    console.log('ℹ️ No old data found. Starting fresh.');
    return null;
  }

  // Sort by data size (larger = more recent/complete data)
  oldKeys.sort((a, b) => b.size - a.size);

  // Migrate from the largest dataset
  const bestKey = oldKeys[0];
  try {
    const parsedData = JSON.parse(bestKey.data);
    
    // Copy to new STABLE key
    localStorage.setItem(APP_STATE_KEY, bestKey.data);
    
    console.log(`✅ MIGRATED data from ${bestKey.key} (${Math.round(bestKey.size / 1024)} KB)`);
    console.log(`📊 Migrated ${parsedData.savedCustomers?.length || 0} khách hàng`);
    console.log(`📊 Migrated ${parsedData.fields?.length || 0} trường`);
    
    // Optional: Alert user about successful migration
    setTimeout(() => {
      alert(`✅ Đã migrate dữ liệu từ phiên bản cũ!\n\nKhách hàng: ${parsedData.savedCustomers?.length || 0}\nTrường: ${parsedData.fields?.length || 0}`);
    }, 1000);
    
    return parsedData;
  } catch (error) {
    console.error(`❌ Error migrating from ${bestKey.key}:`, error);
    return null;
  }
};

// Fortress-like state management hook to prevent data corruption
const useUnifiedState = () => {
  const { toast } = useToast();
  const [state, setInternalState] = useState(() => {
    try {
      // Try to load from current version key first
      let savedStateJSON = localStorage.getItem(APP_STATE_KEY);
      
      // If not found, try to migrate from old version
      if (!savedStateJSON) {
        console.log(`🔍 No data found for key: ${APP_STATE_KEY}`);
        console.log(`🔄 Attempting to migrate from previous versions...`);
        const migratedData = migrateDataFromOldVersion();
        if (migratedData) {
          console.log(`✅ Successfully migrated data from previous version!`);
          savedStateJSON = JSON.stringify(migratedData);
        } else {
          console.log(`ℹ️ No previous data found. Starting fresh.`);
        }
      }

      if (savedStateJSON) {
        let savedState = JSON.parse(savedStateJSON);
        
        // DEFENSE LAYER 1: Heal data on load.
        if (Array.isArray(savedState.selectedTemplateIds)) {
          savedState.selectedTemplateIds = new Set(savedState.selectedTemplateIds);
        } else {
          savedState.selectedTemplateIds = new Set();
        }

        if (!Array.isArray(savedState.managementOpenListFieldIds)) {
          console.warn('Healing corrupted managementOpenListFieldIds from localStorage. Forcing to [].');
          savedState.managementOpenListFieldIds = [];
        }
        if (!Array.isArray(savedState.managementOpenGroupIds)) {
          console.warn('Healing corrupted managementOpenGroupIds from localStorage. Forcing to [].');
          savedState.managementOpenGroupIds = [];
        }

        // CRITICAL FIX: Validate inputData against current field schema
        // Remove any cached field values that don't exist in current schema
        if (savedState.inputData && savedState.fields) {
          const validFieldIds = new Set();
          const listFieldIds = new Set();
          
          const collectFieldIds = (fieldList) => {
            if (!fieldList) return;
            fieldList.forEach(field => {
              validFieldIds.add(field.id);
              if (field.type === 'list') {
                listFieldIds.add(field.id);
                if (field.subFields) {
                  field.subFields.forEach(sf => validFieldIds.add(sf.id));
                }
              }
            });
          };
          collectFieldIds(savedState.fields);
          
          // Clean inputData - only keep valid field IDs
          const cleanedInputData = {};
          for (const key in savedState.inputData) {
            // Keep if: is a valid field, is a list field, or is a derived field (contains formula syntax)
            if (validFieldIds.has(key) || listFieldIds.has(key) || key.includes('(')) {
              cleanedInputData[key] = savedState.inputData[key];
            } else {
              console.log(`🧹 Removing invalid cached field: ${key}`);
            }
          }
          savedState.inputData = cleanedInputData;
        }

        return { ...defaultState, ...savedState };
      }
    } catch (error) {
      console.error("Error loading state from localStorage:", error);
    }
    return defaultState;
  });

  // Auto-update listeners đã được chuyển sang ConfigTab.jsx để tránh duplicate toast
  // ConfigTab sẽ xử lý tất cả các event update
  // Giữ lại state để theo dõi progress nếu cần
  useEffect(() => {
    if (!isElectron || !window.electronAPI) return;

    const unsubUpdateProgress = window.electronAPI.onUpdateProgress((progress) => {
      setDownloadProgress(Math.round(progress.percent));
    });

    return () => {
      unsubUpdateProgress?.();
    };
  }, [isElectron]);

  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        // CRITICAL FIX: Filter out formula fields from inputData before saving
        // Formula fields should be calculated fresh on every load, NOT cached!
        const cleanInputData = {};
        if (state.inputData && typeof state.inputData === 'object') {
          Object.keys(state.inputData).forEach(key => {
            // Skip formula fields (contain parentheses or are pure formula syntax)
            if (!key.includes('(') && !key.includes(')')) {
              cleanInputData[key] = state.inputData[key];
            }
          });
        }

        const stateToSave = {
          ...state,
          inputData: cleanInputData,  // Use cleaned data
          selectedTemplateIds: [], // Không lưu - reset khi thoát app
          managementOpenListFieldIds: Array.isArray(state.managementOpenListFieldIds) ? state.managementOpenListFieldIds : [],
          managementOpenGroupIds: Array.isArray(state.managementOpenGroupIds) ? state.managementOpenGroupIds : [],
          logs: [], // Không lưu logs - reset khi thoát app
          // Không lưu dữ liệu generation - reset khi thoát app
          templates: [],
          sourcePaths: [],
          destinationPath: '',
          // Reset progress để không bị kẹt trạng thái "đang xử lý"
          progress: { isRunning: false, status: 'idle', total: 0, current: 0, message: '' },
        };
        const serializedForSize = JSON.stringify(stateToSave);
        const sizeInMB = serializedForSize.length / (1024 * 1024);
        if (sizeInMB > 5) {
          console.warn('localStorage approaching limit:', sizeInMB.toFixed(2), 'MB. Clearing old logs.');
          stateToSave.logs = [];
        }
        const serialized = JSON.stringify(stateToSave);
        localStorage.setItem(APP_STATE_KEY, serialized);

        // Remote sync mode: persist unified state to VPS so web + desktop can share.
        // Electron uses the public URL because it is loaded from file:// in production.
        const syncBaseUrl = isElectron ? 'https://docx.aistacklab.org' : '';
        const now = Date.now();
        const last = Number(window.__docxLastSyncAt || 0);
        if (now - last > 5000) {
          window.__docxLastSyncAt = now;
          const syncUrl = `${syncBaseUrl}/api/docx/state?key=${encodeURIComponent(DOCX_SYNC_KEY)}`;
          (async () => {
            try {
              const remoteRes = await fetch(syncUrl);
              const remote = (await remoteRes.json())?.state;
              // Không tự kéo lại schema server chỉ vì server có nhiều trường hơn.
              // Anh có thể đã xóa trường ở máy hiện tại; nếu kéo remote theo độ dài sẽ làm F5 bị quay về cấu hình cũ.
              if (remote && remote.schemaVersion && stateToSave.schemaVersion && remote.schemaVersion > stateToSave.schemaVersion) {
                const mergedWithRemoteSchema = { ...stateToSave, ...pickSchemaState(remote) };
                localStorage.setItem(APP_STATE_KEY, JSON.stringify(mergedWithRemoteSchema));
                return;
              }
            } catch {}
            fetch(syncUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ state: pickSchemaState(state) })
            }).catch(() => {});
          })();
        }
      } catch (error) {
        console.error("Error saving state to localStorage:", error);
      }
    }, 100);

    return () => clearTimeout(handler);
  }, [state]);

  const setGuardedAppState = useCallback((newStateOrFn) => {
    setInternalState(prevState => {
      const stateUpdate = typeof newStateOrFn === 'function' ? newStateOrFn(prevState) : newStateOrFn;
      
      let nextState = { ...prevState, ...stateUpdate };

      // DEFENSE LAYER 3: Validate and correct data on every state update.
      if (Array.isArray(nextState.selectedTemplateIds)) {
          nextState.selectedTemplateIds = new Set(nextState.selectedTemplateIds);
      }
      if (nextState.managementOpenListFieldIds && !Array.isArray(nextState.managementOpenListFieldIds)) {
        console.warn('Correcting managementOpenListFieldIds from non-array to Array during state update.');
        nextState.managementOpenListFieldIds = [];
      }
      if (nextState.managementOpenGroupIds && !Array.isArray(nextState.managementOpenGroupIds)) {
        console.warn('Correcting managementOpenGroupIds from non-array to Array during state update.');
        nextState.managementOpenGroupIds = [];
      }

      return nextState;
    });
  }, []);

  return [state, setGuardedAppState];
};

function App() {
  const [appState, setAppState] = useUnifiedState();
  const { toast } = useToast();
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(false);
  
  // 🔧 v2.2.20: ToolsTab state persistence when switching tabs
  const [toolsState, setToolsState] = useState({
    activeSubTab: 'batch-generate',
    uploadedFiles: [],
    selectedFileIndex: null,
    fileContents: {},
    fileHistories: {},
    hasLoadedDestination: false
  });
  
  // 🔧 Template state for test integration
  const [templateFile, setTemplateFile] = useState(null);
  
  // Auto-update states
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const {
    activeTab, fields, fieldGroups, linkedFieldConfig, templates,
    selectedTemplateIds, inputData, numberFormat, dateFormat,
    savedCustomers, dataInputOpenGroups, managementOpenGroupIds,
    configActiveTab, managementOpenListFieldIds, logs, progress,
    autoUpdateEnabled, namingFieldId, customTemplates
  } = appState;

  const updateState = (key, value) => {
    setAppState(prevState => {
      const nextValue = typeof value === 'function' ? value(prevState[key]) : value;
      const schemaChanged = ['fields', 'fieldGroups', 'linkedFieldConfig', 'namingFieldId'].includes(key);
      return { ...prevState, [key]: nextValue, ...(schemaChanged ? { schemaVersion: Date.now() } : {}) };
    });
  };

  const loadApcBundleState = useCallback(({ fields: nextFields = [], fieldGroups: nextFieldGroups = [], inputData: nextInputData = {}, templates: nextTemplates = [], selectedTemplateIds: nextSelectedTemplateIds = new Set() }) => {
    setAppState(prevState => ({
      ...prevState,
      fields: nextFields,
      fieldGroups: nextFieldGroups,
      inputData: nextInputData,
      templates: nextTemplates,
      selectedTemplateIds: nextSelectedTemplateIds,
      schemaVersion: Date.now(),
      activeTab: 'data-input'
    }));
  }, [setAppState]);

  const handleSetSelectedTemplateIds = useCallback((ids) => {
    updateState('selectedTemplateIds', ids);
  }, []);

  // Lắng nghe sự kiện cập nhật từ Electron để hiển thị dialog
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateAvailable(true);
    });
    const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateInfo(info);
      setUpdateDownloaded(true);
    });
    const unsubProgress = window.electronAPI.onUpdateProgress((progress) => {
      setDownloadProgress(Math.round(progress.percent || 0));
    });
    return () => { unsubAvailable(); unsubDownloaded(); unsubProgress(); };
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_GUIDE_KEY)) {
      setShowWelcomeGuide(true);
    }
    
    // Auto-export tất cả hồ sơ khi load lần đầu
    const exportFlagKey = `portable_export_done_v${APP_VERSION}`;
    const isFirstLoad = !localStorage.getItem(exportFlagKey);
    
    if (isFirstLoad && Array.isArray(savedCustomers) && savedCustomers.length > 0) {
      console.log('🚀 Load lần đầu - Tự động xuất tất cả hồ sơ...');
      
      // Chạy export một chút sau để đảm bảo DOM sẵn sàng
      setTimeout(async () => {
        await autoExportAllProfiles(savedCustomers);
        localStorage.setItem(exportFlagKey, JSON.stringify({ exportedAt: new Date().toISOString(), count: savedCustomers.length }));
        console.log('✅ Xuất xong - Đặt flag để không xuất lại');
      }, 500);
    }

    // Remote sync bootstrap: web pulls shared state; Electron keeps local state stable.
    // Pulling shared web state into Electron can overwrite local typing/profile edits.
    if (!isElectron) {
      fetch(`/api/docx/state?key=${encodeURIComponent(DOCX_SYNC_KEY)}`)
        .then(r => r.json())
        .then(data => {
          const remote = data?.state;
          if (remote && typeof remote === 'object') {
            const remoteSchema = pickSchemaState(remote);
            setAppState(prev => ({ ...prev, ...remoteSchema }));
            console.log('✅ Loaded remote synced schema');
          }
        })
        .catch(() => {});
    }
  }, []);

  // =========================================================================
  // ==    REVOLUTION V1 - UNIFIED DATA DERIVATION                          ==
  // =========================================================================
  // The legacy formula engine based on field IDs has been decommissioned.
  // All formula logic is now handled by the modern engine in DataInputTab.
  // This `useMemo` is now only responsible for the `linkedFieldConfig` functionality,
  // which is a separate concern from formulas. This preserves existing functionality
  // while removing the source of conflict.
  const derivedInputData = useMemo(() => {
    const derivedData = JSON.parse(JSON.stringify(inputData));

    if (linkedFieldConfig && linkedFieldConfig.groups) {
        // #17: Lấy danh sách field IDs hợp lệ hiện tại để lọc references cũ
        const validFieldIds = new Set();
        const collectIds = (fieldList) => { (fieldList || []).forEach(f => { if (f?.id) { validFieldIds.add(f.id); if (f.subFields) collectIds(f.subFields); } }); };
        collectIds(fields);

        linkedFieldConfig.groups.forEach(group => {
            if (!group) return;
            let fieldIds = [];
            let newFieldName;
            if (Array.isArray(group.sequence)) {
                // #17: Chỉ lấy field IDs còn tồn tại
                fieldIds = group.sequence.filter(item => item.type === 'field' && validFieldIds.has(item.id)).map(item => item.id);
                newFieldName = group.id;
            } else if (Array.isArray(group.fieldIds)) {
                fieldIds = group.fieldIds.filter(id => validFieldIds.has(id));
                newFieldName = fieldIds.map(id => id.split('.').pop()).join('_');
            }
            if (newFieldName && fieldIds.length > 0) {
                const combinedValue = fieldIds.map(id => derivedData[id] || '').join(' ');
                derivedData[newFieldName] = combinedValue.replace(/\s+/g, ' ').trim();
            }
        });
    }

    return derivedData;
  }, [inputData, linkedFieldConfig, fields]); // Dependencies are now simpler.


  const handleCloseWelcomeGuide = () => {
    localStorage.setItem(WELCOME_GUIDE_KEY, 'true');
    setShowWelcomeGuide(false);
  };
  
  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {showWelcomeGuide && <WelcomeGuide onClose={handleCloseWelcomeGuide} />}
      <Tabs 
        value={activeTab}
        onValueChange={(tab) => updateState('activeTab', tab)}
        className="flex flex-col flex-grow min-h-0"
      >
        <div className="flex-shrink-0 sticky top-0 z-30 bg-gradient-to-r from-[hsl(var(--banking-green-start))] to-[hsl(var(--banking-green-end))] shadow-md">
            <header className="text-center pt-1 pb-0">
                <h1 className="text-xl font-bold text-white">DocuGen PMTT</h1>
                <p className="text-xs text-gray-100">Công cụ tạo tài liệu tự động từ file Word (.docx)</p>
            </header>
            <div className="bg-white rounded-md shadow-inner-lg p-1.5 mx-auto max-w-3xl mt-1 mb-1">
              <TabsList className="grid w-full grid-cols-4 gap-1">
                  <TabsTrigger value="data-input"><Dna size={16} /> <span className="ml-1">Nhập Dữ Liệu</span></TabsTrigger>
                  <TabsTrigger value="generator"><Bot size={16} /> <span className="ml-1">Tạo File</span></TabsTrigger>
                  <TabsTrigger value="tools"><Wrench size={16} /> <span className="ml-1">Công Cụ</span></TabsTrigger>
                  <TabsTrigger value="config"><Settings size={16} /> <span className="ml-1">Cấu hình</span></TabsTrigger>
              </TabsList>
            </div>
        </div>
        
        <main className="flex-grow min-h-0">
          <Toaster />
          <TabsContent value="data-input" className="h-full">
            <DataInputTab
              fields={fields}
              setFields={(f) => updateState('fields', f)}
              fieldGroups={fieldGroups}
              setFieldGroups={(g) => updateState('fieldGroups', g)}
              linkedFieldConfig={linkedFieldConfig}
              setLinkedFieldConfig={(lc) => updateState('linkedFieldConfig', lc)}
              // Pass the raw data. The modern engine will handle derivation.
              inputData={inputData} 
              onDataChange={(data) => updateState('inputData', data)}
              numberFormat={numberFormat}
              dataInputOpenGroups={dataInputOpenGroups}
              setDataInputOpenGroups={(groups) => updateState('dataInputOpenGroups', groups)}
              managementOpenGroupIds={managementOpenGroupIds}
              setManagementOpenGroupIds={(ids) => updateState('managementOpenGroupIds', ids)}
              managementOpenListFieldIds={managementOpenListFieldIds}
              setManagementOpenListFieldIds={(ids) => updateState('managementOpenListFieldIds', ids)}
              savedCustomers={savedCustomers}
              setSavedCustomers={(c) => updateState('savedCustomers', c)}
              namingFieldId={namingFieldId || ''}
              setNamingFieldId={(id) => updateState('namingFieldId', id)}
              customTemplates={customTemplates || []}
              setCustomTemplates={(t) => updateState('customTemplates', t)}
              apcNativeSchema={APC_NATIVE_SCHEMA}
              setTemplates={(t) => updateState('templates', t)}
              setSelectedTemplateIds={handleSetSelectedTemplateIds}
              onLoadApcBundle={loadApcBundleState}
              initialActiveTab="management"
            />
          </TabsContent>
          
          <TabsContent value="generator" className="h-full p-6">
            <GeneratorTab
              templates={templates}
              setTemplates={(t) => updateState('templates', t)}
              selectedTemplateIds={selectedTemplateIds}
              setSelectedTemplateIds={handleSetSelectedTemplateIds}
              // Pass derived data here for generation
              inputData={derivedInputData} 
              isElectron={isElectron}
              numberFormat={numberFormat}
              dateFormat={dateFormat}
              fields={fields}
              setFields={(f) => updateState('fields', f)}
              fieldGroups={fieldGroups}
              setFieldGroups={(g) => updateState('fieldGroups', g)}
              inputRawData={inputData}
              onInputDataChange={(data) => updateState('inputData', data)}
              onOpenDataInput={() => updateState('activeTab', 'data-input')}
              autoTemplateBundleUrl="/processed-docx/processed_docx_placeholders_v3.zip"
            />
          </TabsContent>

          <TabsContent value="tools" className="h-full">
            <ToolsTab
              appState={appState}
              setAppState={setAppState}
              isElectron={isElectron}
              fields={fields}
              setFields={(f) => updateState('fields', f)}
              savedCustomers={savedCustomers}
              setSavedCustomers={(c) => updateState('savedCustomers', c)}
              numberFormat={numberFormat}
              dateFormat={dateFormat}
            />
          </TabsContent>

          <TabsContent value="config" className="h-full">
            <ConfigTab
              appState={appState}
              setAppState={setAppState} // Pass the full setter function
              isElectron={isElectron}
              // Pass down specific states and setters for logs and progress
              logs={logs} 
              progress={progress}
              setLogs={(l) => updateState('logs', l)}
              setProgress={(p) => updateState('progress', p)}
              appVersion={APP_VERSION}
            />
          </TabsContent>
        </main>
      </Tabs>
      <footer className="text-center flex-shrink-0 py-2 text-gray-500 text-sm bg-gray-100 border-t dark:bg-gray-800 dark:text-gray-700">
        <p>Phiên bản {APP_VERSION} {isElectron ? '(Electron)' : '(Web)'}. phát triển bởi PMTT.</p>
      </footer>

      {!isElectron && (
        <div className="fixed top-1 right-2 z-40 flex gap-2">
          <a
            href="/downloads/DocXAutomationTool-Latest-Setup.exe"
            onClick={(event) => {
              if (!window.confirm('Tải bản cài đặt APC Clone mới nhất?')) event.preventDefault();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-green-700"
            title="Tải bản cài đặt APC Clone mới nhất cho Windows"
          >
            <MonitorDown size={16} />
            Cài đặt
          </a>
          <a
            href="/downloads/DocXAutomationTool-Latest-Portable.exe"
            onClick={(event) => {
              if (!window.confirm('Tải bản portable APC Clone mới nhất?')) event.preventDefault();
            }}
            className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:bg-blue-700"
            title="Tải bản portable APC Clone mới nhất cho Windows"
          >
            <MonitorDown size={16} />
            Portable
          </a>
        </div>
      )}

      {/* Update downloading dialog */}
      <AlertDialog open={updateAvailable && !updateDownloaded}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-600" />
              Đang tải phiên bản mới
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phiên bản {updateInfo?.version} đang được tải xuống...
              <div className="mt-4">
                <Progress value={downloadProgress} className="h-2" />
                <p className="text-xs text-center mt-2 text-gray-600">{downloadProgress}%</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUpdateAvailable(false)}>Ẩn thông báo</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update ready dialog */}
      <AlertDialog open={updateDownloaded}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              Cập nhật đã sẵn sàng!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Phiên bản {updateInfo?.version} đã tải xong.
              <br />
              Bạn có muốn khởi động lại ứng dụng để cài đặt phiên bản mới không?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUpdateDownloaded(false)}>Để sau</AlertDialogCancel>
            <AlertDialogAction onClick={() => window.electronAPI?.restartApp?.()}>
              Khởi động lại ngay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
