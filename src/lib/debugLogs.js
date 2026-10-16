// Debug logging helper for troubleshooting profile and formula issues
export const debugLogs = {
  // 1. Log when profile is loaded
  logProfileLoad: (customerName, inputData) => {
    console.log('%c🔵 [PROFILE LOAD]', 'color: blue; font-weight: bold', customerName);
    console.log('   lãi suất sổ tiết kiệm (kv_lai_suat_muc):', inputData?.kv_lai_suat_muc);
    console.log('   sổ tiết kiệm list (danh_sach_so_tiet_kiem):', inputData?.danh_sach_so_tiet_kiem?.length || 0, 'items');
    if (inputData?.danh_sach_so_tiet_kiem?.[0]) {
      console.log('   first item lãi suất:', inputData.danh_sach_so_tiet_kiem[0].kv_lai_suat_so_tiet_kiem);
    }
  },

  // 2. Log field value changes
  logFieldChange: (fieldId, fieldName, value) => {
    console.log(`%c📝 [INPUT] ${fieldName}`, 'color: green; font-weight: bold', `= ${value} (type: ${typeof value})`);
  },

  // 3. Log list item changes
  logListChange: (listFieldId, index, subFieldId, value) => {
    console.log(`%c📝 [LIST] ${listFieldId}[${index}].${subFieldId}`, 'color: purple; font-weight: bold', `= ${value}`);
  },

  // 4. Log formula calculation
  logFormulaCalc: (formulaField, sourceField, sourceValue, result) => {
    console.log(`%c📐 [FORMULA] ${formulaField}`, 'color: orange; font-weight: bold');
    console.log(`   Source: ${sourceField} = ${sourceValue}`);
    console.log(`   Result: ${String(result).substring(0, 80)}`);
  },

  // 5. Log linked field issue
  logLinkedFields: (groupName, sequence) => {
    console.log(`%c🔗 [LINKED FIELDS] ${groupName}`, 'color: red; font-weight: bold');
    if (sequence) {
      sequence.forEach((item, i) => {
        console.log(`   [${i}] ${item.type} - ${item.id || item.value}`);
      });
    }
  },

  // 6. Log master data handler
  logMasterDataHandler: (changedField, evaluatedFormulas) => {
    console.log(`%c🔧 [MASTER HANDLER]`, 'color: cyan; font-weight: bold', `Processing ${changedField}`);
    evaluatedFormulas.forEach(f => {
      console.log(`   ✅ ${f.id}: ${String(f.value).substring(0, 50)}`);
    });
  }
};

// Quick enable/disable
localStorage.setItem('DEBUG_PROFILE', 'true');
