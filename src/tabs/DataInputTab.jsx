
import React, { useMemo, useEffect, useRef, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion.jsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs.jsx";
import FieldManagement from '../components/data-input/management/FieldManagement.jsx';
import InputField from '../components/data-input/InputField.jsx';
import ListField from '../components/data-input/ListField.jsx';
import LinkedFieldsTab from '../components/data-input/linking/LinkedFieldsTab.jsx';
import ProfileManager from '../components/data-input/ProfileManager.jsx';
import OCRUpload from '../components/ocr/OCRUpload.jsx';
import { evaluateAllFormulas, generateSumFields } from '../lib/formulaEngine.js';
import { useToast } from '../components/ui/use-toast.js';
import { ScanText } from 'lucide-react';
import ApcNativeSchemaPanel from '../components/data-input/management/ApcNativeSchemaPanel.jsx';
import ApcDynamicFields from '../components/data-input/ApcDynamicFields.jsx';
import ApcProfileSearch from '../components/data-input/ApcProfileSearch.jsx';
import DocCheckPanel from '../components/data-input/DocCheckPanel.jsx';
import { checkProfile, groupWarningsByField } from '../lib/docCheckEngine.js';

const DataInputTab = ({
  fields,
  setFields,
  fieldGroups,
  setFieldGroups,
  linkedFieldConfig,
  setLinkedFieldConfig,
  inputData,
  onDataChange,
  numberFormat,
  dataInputOpenGroups,
  setDataInputOpenGroups,
  managementOpenGroupIds,
  setManagementOpenGroupIds,
  managementOpenListFieldIds,
  setManagementOpenListFieldIds,
  savedCustomers,
  setSavedCustomers,
  namingFieldId,
  setNamingFieldId,
  customTemplates,
  setCustomTemplates,
  apcNativeSchema,
  setTemplates,
  setSelectedTemplateIds,
  onLoadApcBundle,
  initialActiveTab = 'data-input',
}) => {

  // =========================================================================
  // ==    SCROLL POSITION MEMORY - PERSISTENT & REALTIME                    ==
  // =========================================================================
  const scrollContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [showOCR, setShowOCR] = useState(false);

  // Save scroll position to localStorage in realtime
  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    localStorage.setItem('dataInputTab_scrollPosition', scrollTop);
  };

  // Khôi phục scroll position khi chuyển về tab data-input
  // Dùng ref để theo dõi fields trước đó — nếu fields thay đổi (hồ sơ mới) thì không khôi phục scroll cũ
  const prevFieldsForScrollRef = useRef(fields);
  useEffect(() => {
    setActiveTab(initialActiveTab);
  }, [initialActiveTab]);

  useEffect(() => {
    if (activeTab === 'data-input' && scrollContainerRef.current) {
      // Nếu fields đã thay đổi (hồ sơ mới), reset scroll về đầu
      if (prevFieldsForScrollRef.current !== fields) {
        prevFieldsForScrollRef.current = fields;
        localStorage.removeItem('dataInputTab_scrollPosition');
        scrollContainerRef.current.scrollTop = 0;
        return;
      }
      const savedPosition = localStorage.getItem('dataInputTab_scrollPosition');
      if (savedPosition) {
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = parseInt(savedPosition, 10);
          }
        }, 50);
      }
    }
  }, [activeTab, fields]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
  };

  const { toast } = useToast();

  // The single, modern authority for all calculations.
  const masterDataHandler = (rawData) => {
    const evaluatedData = evaluateAllFormulas(rawData, fields, numberFormat);

    // Báo lỗi circular dependency nếu có
    if (evaluatedData._formulaEngineError) {
      const errMsg = evaluatedData._formulaEngineError;
      delete evaluatedData._formulaEngineError;
      if (toast) toast({ title: 'Lỗi công thức', description: errMsg, variant: 'destructive' });
      else console.error(errMsg);
    }

    const hasChanges = JSON.stringify(evaluatedData) !== JSON.stringify(inputData);

    if (hasChanges) {
      onDataChange(evaluatedData);
    }
  };

  // =========================================================================
  // ==    REVOLUTION V2 - IMMEDIATE REACTIVITY                             ==
  // =========================================================================
  // This is the new "nervous system". It listens for changes to the blueprint (`fields`).
  // When a formula is created or edited, this fires immediately, triggering a recalculation.
  // THIS FIXES THE "SAVE TWICE" BUG.
  const prevFieldsRef = useRef();
  const initialCleanupDone = useRef(false);
  
  useEffect(() => {
    // 🔧 v2.2.6: Force cleanup ngay khi mount để loại bỏ data rác từ trước
    if (!initialCleanupDone.current && inputData && fields) {
      initialCleanupDone.current = true;
      // Debug disabled for production
      // console.log('🧹 [INITIAL CLEANUP] Running initial data cleanup...');
      masterDataHandler(inputData);
      return;
    }
    
    // Only recalculate if fields actually changed (not on every render)
    if (inputData && prevFieldsRef.current !== fields) {
      prevFieldsRef.current = fields;
      masterDataHandler(inputData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, inputData]); 
  // =========================================================================

  // REMOVED: No longer trigger masterDataHandler on every inputData change
  // User input → handleFieldChange → onDataChange → formulas calculated by evaluateAllFormulas
  // Only recalculate when fields structure changes (above useEffect)

  const handleFieldChange = (changedId, value) => {
    // Update the raw data state with formulas evaluated
    // Debug disabled for production
    // console.log(`%c📝 [INPUT] ${changedId}`, 'color: green; font-weight: bold', `= "${value}"`);
    
    const updatedData = { ...inputData, [changedId]: value };
    masterDataHandler(updatedData);
  };

  // 🔧 v2.2.6: Handler cho linked field changes - cập nhật nhiều field cùng lúc
  // 🔧 FIX: Nhận thêm sourceFieldId và sourceValue để cập nhật cùng lúc với linked fields
  // Điều này đảm bảo cả source field và linked fields được cập nhật trong 1 atomic state update
  const handleLinkedChange = (linkedValues, sourceFieldId, sourceValue) => {
    // Debug disabled for production
    // console.log(`%c🔗 [LINKED CHANGE] Source field:`, 'color: purple; font-weight: bold', sourceFieldId, '=', sourceValue);
    
    // 🔧 FIX: Include source field in the same update to prevent race condition
    const updatedData = sourceFieldId 
      ? { ...inputData, [sourceFieldId]: sourceValue, ...linkedValues }
      : { ...inputData, ...linkedValues };
    masterDataHandler(updatedData);
  };

  const handleListChange = (id, listValue) => {
    // Update the raw data state with formulas evaluated
    // Debug disabled for production
    // console.log(`📝 [DataInputTab] List ${id}, length:`, listValue?.length);
    const updatedData = { ...inputData, [id]: listValue };
    masterDataHandler(updatedData);
  };

  const processedGroups = useMemo(() => {
    const groupsMap = new Map();
    (fieldGroups || []).forEach(g => groupsMap.set(g.id, { ...g, fields: [] }));

    const ungrouped = { id: '__ungrouped__', name: 'Thông tin chung', fields: [] };
    let hasUngrouped = false;

    // The modern formula engine handles derived fields, so we can filter them out here.
    const baseFields = (fields || []).filter(f => !f.formula);

    baseFields.forEach(field => {
        if (field.parentId && field.parentId !== '__ROOT__') return;

        if (field.group && groupsMap.has(field.group)) {
            groupsMap.get(field.group).fields.push(field);
        } else {
            ungrouped.fields.push(field);
            hasUngrouped = true;
        }
    });
    
    const result = [];
    if (hasUngrouped && ungrouped.fields.length > 0) {
        result.push(ungrouped);
    }
    result.push(...Array.from(groupsMap.values()));
    
    return result.filter(g => g.fields.length > 0);
  }, [fields, fieldGroups]);

 const processedAndEvaluatedGroups = useMemo(() => {
    const groups = processedGroups.map(group => ({ ...group, fields: [...group.fields] }));
    const formulaFields = (fields || []).filter(field => field.formula);

    formulaFields.forEach(field => {
      const targetGroup = groups.find(g => g.id === field.group) || groups.find(g => g.id === '__ungrouped__');
      if (targetGroup) {
        targetGroup.fields.push(field);
      }
    });

    // 🔧 v2.2.6: Thêm virtual sum fields vào cuối mỗi group
    const sumFields = generateSumFields(fields);
    sumFields.forEach(sumField => {
      const targetGroup = groups.find(g => g.id === sumField.group) || groups.find(g => g.id === '__ungrouped__');
      if (targetGroup) {
        // Đưa xuống cuối group
        targetGroup.fields.push(sumField);
      }
    });
    // Debug disabled for production
    // console.log(`📊 [SUM FIELDS] Generated ${sumFields.length} virtual sum fields`);

    return groups;
  }, [processedGroups, fields]);


  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-grow flex flex-col h-full">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-start px-6 py-2 border-b bg-white backdrop-blur-sm shadow-sm">
          <TabsList className="inline-flex h-auto items-center justify-center rounded-lg bg-gray-200/75 p-1">
            <TabsTrigger value="data-input">Nhập Dữ Liệu</TabsTrigger>
            <TabsTrigger value="management">Quản Lý</TabsTrigger>
            <TabsTrigger value="linked-fields">Trường Liên Kết</TabsTrigger>
          </TabsList>
          
          <ProfileManager
            inputData={inputData}
            savedCustomers={savedCustomers}
            setSavedCustomers={setSavedCustomers}
            setInputData={onDataChange}
            fields={fields}
            setFields={setFields}
            fieldGroups={fieldGroups}
            setFieldGroups={setFieldGroups}
            namingFieldId={namingFieldId}
          />
          
          {/* OCR Button */}
          <button 
            onClick={() => setShowOCR(true)}
            className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="Quét CCCD/Giấy tờ để tự động điền form"
          >
            <ScanText className="w-4 h-4" />
            Quét OCR
          </button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-6" ref={scrollContainerRef} onScroll={handleScroll}>
        
        <TabsContent value="data-input">
          <div>
            <DocCheckPanelInner fields={fields} inputData={inputData} />
            {processedAndEvaluatedGroups.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-lg">Chưa có trường dữ liệu.</p>
                <p className="text-gray-400 mt-2">Chuyển qua tab "Quản Lý" để bắt đầu thêm các trường thông tin.</p>
              </div>
            ) : (
              <Accordion type="multiple" value={dataInputOpenGroups || []} onValueChange={setDataInputOpenGroups} className="w-full space-y-4">
                {processedAndEvaluatedGroups.map(group => (
                  <AccordionItem key={group.id} value={group.id} className="bg-white rounded-xl shadow-md border-none">
                    <AccordionTrigger className="text-base font-semibold text-banking-navy px-6 py-3 hover:no-underline">
                      {group.name}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 pt-2">
                        {group.fields.map(field => {
                          if (field.type === 'list') {
                            return (
                              <div key={field.id} className="lg:col-span-3">
                                <ListField
                                  field={field}
                                  value={inputData[field.id] || []}
                                  onListChange={handleListChange}
                                  numberFormat={numberFormat}
                                  inputData={inputData}
                                  onDataChange={onDataChange}
                                  fields={fields}
                                />
                              </div>
                            );
                          } else {
                            return (
                              <InputField
                                key={field.id}
                                field={field}
                                value={inputData[field.id]}
                                onChange={value => handleFieldChange(field.id, value)}
                                onLinkedChange={handleLinkedChange}
                                numberFormat={numberFormat}
                                isFormula={!!field.formula}
                                isDisabled={!!field.formula} // Formula fields are non-editable
                              />
                            );
                          }
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
            {/* (1) Thuoc tinh dong tu API attributes -> luu vao profiles.data */}
            <ApcDynamicFields inputData={inputData} onDataChange={onDataChange} />
            {/* (2) Tim kiem ho so theo customer_code: list + xem + xoa */}
            <ApcProfileSearch inputData={inputData} onLoadProfile={(data) => onDataChange(data)} />
          </div>
        </TabsContent>

        <TabsContent value="management">
           <div>
            <ApcNativeSchemaPanel
              apcNativeSchema={apcNativeSchema}
              setFields={setFields}
              setFieldGroups={setFieldGroups}
              inputData={inputData}
              setInputData={onDataChange}
              setTemplates={setTemplates}
              setSelectedTemplateIds={setSelectedTemplateIds}
              onLoadApcBundle={onLoadApcBundle}
            />
            <FieldManagement
              isEmbedded={true}
              fields={fields}
              setFields={setFields}
              fieldGroups={fieldGroups}
              setFieldGroups={setFieldGroups}
              inputData={inputData}
              setInputData={onDataChange}
              numberFormat={numberFormat}
              openGroupIds={managementOpenGroupIds}
              setOpenGroupIds={setManagementOpenGroupIds}
              managementOpenListFieldIds={managementOpenListFieldIds}
              setManagementOpenListFieldIds={setManagementOpenListFieldIds}
              linkedFieldConfig={linkedFieldConfig}
              setLinkedFieldConfig={setLinkedFieldConfig}
              namingFieldId={namingFieldId}
              setNamingFieldId={setNamingFieldId}
              customTemplates={customTemplates}
              setCustomTemplates={setCustomTemplates}
            />
          </div>
        </TabsContent>

        <TabsContent value="linked-fields">
          <div>
            <LinkedFieldsTab 
              fields={fields}
              fieldGroups={fieldGroups}
              linkedFieldConfig={linkedFieldConfig}
              setLinkedFieldConfig={setLinkedFieldConfig}
            />
          </div>
        </TabsContent>
      </div>

      {/* OCR Modal */}
      {showOCR && (
        <OCRUpload 
          fields={fields}
          onAutoFill={(mappedFields) => {
            // Merge với inputData hiện tại và trigger update
            const updatedData = { ...inputData, ...mappedFields };
            masterDataHandler(updatedData);
          }}
          onClose={() => setShowOCR(false)}
        />
      )}
    </Tabs>
  );
};

export default DataInputTab;

// --- Wrapper: chạy checkProfile theo inputData (debounce), cuộn tới field ---
function DocCheckPanelInner({ fields, inputData }) {
  const [warnings, setWarnings] = React.useState([]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        setWarnings(checkProfile(fields, inputData));
      } catch {
        setWarnings([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [fields, inputData]);

  const jump = (fieldId) => {
    const el = document.getElementById(fieldId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus?.();
      el.classList.add('ring-2', 'ring-amber-400');
      setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 1600);
    }
  };
  void groupWarningsByField; // dùng cho highlight inline về sau
  return <DocCheckPanel warnings={warnings} onJump={jump} />;
}
