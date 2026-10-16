#!/usr/bin/env node

/**
 * After Pack Script - Electron Builder Hook
 * Kiểm tra tính toàn vẹn của build package
 */

const fs = require('fs');
const path = require('path');

async function afterPack(context) {
  console.log('[BUILD CHECK] Kiểm tra package sau khi pack...');
  console.log(`[BUILD CHECK] App Directory: ${context.appOutDir}`);
  
  // Kiểm tra app.asar tồn tại
  const asarPath = path.join(context.appOutDir, 'resources/app.asar');
  if (fs.existsSync(asarPath)) {
    const size = fs.statSync(asarPath).size;
    console.log(`[BUILD CHECK] ✅ app.asar tồn tại (${(size / 1024 / 1024).toFixed(2)}MB)`);
  } else {
    console.warn(`[BUILD CHECK] ⚠️  CẢNH BÁO: app.asar không tìm thấy`);
  }

  // Kiểm tra không có node_modules trong resources/app (nếu unpacked)
  const nodeModulesPath = path.join(context.appOutDir, 'resources/app/node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.error('[BUILD CHECK] ❌ LỖI: node_modules không nên được pack!');
    process.exit(1);
  }

  console.log('[BUILD CHECK] ✅ Kiểm tra package hoàn tất - OK');
}

module.exports = afterPack;
