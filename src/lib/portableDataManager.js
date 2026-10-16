// Quản lý xuất/nhập dữ liệu hàng loạt cho thư mục portable
// Auto-export tất cả hồ sơ khi load, auto-import từ thư mục data

const DATA_FOLDER = './portable_data';
const BATCH_SIZE = 60;

/**
 * Xuất tất cả hồ sơ từ localStorage thành file JSON
 * Mỗi file chứa max 60 hồ sơ
 */
export const autoExportAllProfiles = async (allProfiles) => {
    try {
        if (!Array.isArray(allProfiles) || allProfiles.length === 0) {
            console.log('📊 Không có hồ sơ nào để xuất');
            return;
        }

        console.log(`📥 Bắt đầu xuất ${allProfiles.length} hồ sơ...`);
        
        // Chia thành từng batch (mỗi batch 60 hồ sơ)
        const batches = [];
        for (let i = 0; i < allProfiles.length; i += BATCH_SIZE) {
            batches.push(allProfiles.slice(i, i + BATCH_SIZE));
        }

        // Xuất mỗi batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batchData = {
                batch_số: batchIndex + 1,
                tổng_batch: batches.length,
                số_hồ_sơ_trong_batch: batches[batchIndex].length,
                ngày_xuất: new Date().toLocaleString('vi-VN'),
                hồ_sơ_list: batches[batchIndex]
            };

            // Tạo tên file: BATCH_1_của_3_[ngày].json
            const fileName = `BATCH_${batchIndex + 1}_của_${batches.length}_${new Date().toISOString().slice(0, 10)}.json`;
            
            // Xuất file
            exportDataToFile(batchData, fileName);
            
            console.log(`✅ Batch ${batchIndex + 1}/${batches.length} xuất thành công: ${fileName}`);
        }

        console.log(`🎉 Đã xuất xong ${batches.length} batch vào thư mục Downloads`);
        return true;
    } catch (error) {
        console.error('❌ Lỗi xuất dữ liệu:', error);
        return false;
    }
};

/**
 * Hàm lưu dữ liệu vào file (gọi từ browser)
 */
const exportDataToFile = (data, fileName) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Auto-load hồ sơ từ IndexedDB (được load từ portable_data)
 * Hợp nhất với hồ sơ hiện tại
 */
export const autoImportPortableProfiles = async (currentProfiles) => {
    try {
        console.log('🔍 Quét dữ liệu portable...');
        
        // Kiểm tra localStorage có khóa portable_profiles
        const portableKey = 'portable_profiles_data';
        const portableData = localStorage.getItem(portableKey);
        
        if (!portableData) {
            console.log('ℹ️ Không tìm thấy dữ liệu portable');
            return currentProfiles || [];
        }
        
        try {
            const parsedPortable = JSON.parse(portableData);
            const importedProfiles = Array.isArray(parsedPortable) ? parsedPortable : [];
            
            console.log(`✅ Tìm ${importedProfiles.length} hồ sơ từ portable`);
            
            // Hợp nhất
            const merged = mergePortableProfiles(currentProfiles || [], importedProfiles);
            console.log(`🔗 Hợp nhất thành ${merged.length} hồ sơ`);
            
            return merged;
        } catch (parseError) {
            console.error('❌ Lỗi parse dữ liệu portable:', parseError);
            return currentProfiles || [];
        }
    } catch (error) {
        console.error('❌ Lỗi nhập dữ liệu:', error);
        return currentProfiles || [];
    }
};

/**
 * Merge hồ sơ từ portable với hồ sơ hiện tại
 * Nếu trùng ID → hồ sơ mới sẽ đè hồ sơ cũ
 */
export const mergePortableProfiles = (currentProfiles, importedProfiles) => {
    const profileMap = new Map();
    
    // Thêm hồ sơ hiện tại
    if (Array.isArray(currentProfiles)) {
        currentProfiles.forEach(p => {
            if (p && p.id) {
                profileMap.set(p.id, p);
            }
        });
    }
    
    // Thêm hồ sơ imported (đè nếu trùng ID)
    if (Array.isArray(importedProfiles)) {
        importedProfiles.forEach(p => {
            if (p && p.id) {
                profileMap.set(p.id, p);
            }
        });
    }
    
    return Array.from(profileMap.values());
};

/**
 * Hàm để nhập dữ liệu từ một file JSON (user upload)
 * Lưu vào localStorage với khóa portable_profiles_data
 */
export const importFromFile = async (file) => {
    try {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const content = e.target.result;
                    const data = JSON.parse(content);
                    
                    // Kiểm tra định dạng
                    if (data.batch_số && data.hồ_sơ_list) {
                        // Là batch file
                        const profiles = data.hồ_sơ_list;
                        console.log(`✅ Import batch ${data.batch_số}/${data.tổng_batch}: ${profiles.length} hồ sơ`);
                        resolve(profiles);
                    } else if (Array.isArray(data)) {
                        // Là array hồ sơ
                        console.log(`✅ Import ${data.length} hồ sơ`);
                        resolve(data);
                    } else {
                        reject(new Error('Định dạng file không hợp lệ'));
                    }
                } catch (parseError) {
                    reject(new Error('Lỗi parse JSON: ' + parseError.message));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Lỗi đọc file'));
            };
            
            reader.readAsText(file);
        });
    } catch (error) {
        console.error('❌ Lỗi import file:', error);
        throw error;
    }
};

/**
 * Lưu profile list vào localStorage với khóa portable
 */
export const savePortableProfiles = (profiles) => {
    try {
        if (!Array.isArray(profiles)) {
            console.warn('⚠️ Profiles phải là array');
            return false;
        }
        
        localStorage.setItem('portable_profiles_data', JSON.stringify(profiles));
        console.log(`✅ Lưu ${profiles.length} hồ sơ vào portable storage`);
        return true;
    } catch (error) {
        console.error('❌ Lỗi lưu portable profiles:', error);
        return false;
    }
};

/**
 * Tạo file hướng dẫn
 */
export const createImportTemplate = () => {
    const template = {
        loại: 'IMPORT_BATCH',
        hướng_dẫn: 'Đặt file này vào thư mục cùng cấp với app, tên folder là "portable_data"',
        định_dạng: 'BATCH_X_của_Y_[ngày].json',
        ví_dụ: {
            batch_số: 1,
            tổng_batch: 2,
            số_hồ_sơ_trong_batch: 60,
            ngày_xuất: '23/12/2025 14:30:45',
            hồ_sơ_list: [
                {
                    id: 'uuid-xxx',
                    name: 'Khách hàng A',
                    inputData: { },
                    fields: [ ],
                    fieldGroups: [ ]
                }
            ]
        }
    };
    
    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = `HƯỚNG_DẪN_NHẬP_DỮ_LIỆU.json`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('✅ Đã tạo file hướng dẫn nhập dữ liệu');
};

/**
 * Cập nhật state app với hồ sơ mới từ portable
 */
export const updateAppStateWithPortableProfiles = (appState, newProfiles) => {
    return {
        ...appState,
        savedCustomers: newProfiles || appState.savedCustomers
    };
};
