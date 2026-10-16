// Component tự động xóa localStorage cũ khi khởi động
import { useEffect } from 'react';
import packageJson from '../../package.json';

const APP_VERSION = packageJson.version;
const CURRENT_KEY = `docuGenAppState_v${APP_VERSION}`;

const ClearOldCache = () => {
  useEffect(() => {
    // Xóa localStorage cũ (chỉ chạy 1 lần)
    const cleanupKey = `cleaned_old_storage_${APP_VERSION}`;
    
    if (localStorage.getItem(cleanupKey)) {
      return; // Đã cleanup rồi
    }

    console.log('🧹 Cleaning old localStorage keys...');
    
    // Tìm và xóa các key cũ
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('docuGenAppState_v') && key !== CURRENT_KEY) {
        keysToDelete.push(key);
      }
    }

    // Xóa keys cũ
    keysToDelete.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  ✓ Removed: ${key}`);
    });

    if (keysToDelete.length > 0) {
      console.log(`✅ Cleaned ${keysToDelete.length} old storage keys`);
    }

    // Đánh dấu đã cleanup
    localStorage.setItem(cleanupKey, 'true');
  }, []);

  return null; // Component này không render gì
};

export default ClearOldCache;
