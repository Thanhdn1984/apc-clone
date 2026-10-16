
// electron/main.js
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
const fs = require('fs');
const https = require('https');

const APP_VERSION = require('../package.json').version;
console.log("============================================================");
console.log(`🚀 MAIN.JS V37 - PORTABLE + NSIS AUTO-UPDATE`);
console.log(`📦 App Version: ${APP_VERSION}`);
console.log(`📅 Start Time: ${new Date().toISOString()}`);
console.log("============================================================");

// --- Detect if running as Portable ---
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const portableDir = process.env.PORTABLE_EXECUTABLE_DIR || '';
const portableFile = process.env.PORTABLE_EXECUTABLE_FILE || '';
console.log('[APP] Running as Portable:', isPortable);
if (isPortable) {
  console.log('[APP] Portable Dir:', portableDir);
  console.log('[APP] Portable File:', portableFile);
}

// --- Logic Imports ---
const { addTemplates } = require('./logic/templates.js');
const { startGeneration, executeGeneration } = require('./logic/generate.js'); 
const { reverseGenerateTemplate } = require('./logic/reverse.js');

const isDev = process.env.NODE_ENV === 'development';
const defaultOutputDir = path.join(app.getPath('documents'), 'APCCloneOutput');
let reverseOutputDir = defaultOutputDir;
let mainWindow;

// Helper function to send logs to renderer
const sendLogToRenderer = (type, message, data = null) => {
  const logEntry = { type, message, data, timestamp: new Date().toISOString() };
  console.log(`[${type}] ${message}`, data || '');
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update_log', logEntry);
  }
};

// --- Auto-Updater Configuration (PRIVATE REPO SUPPORT) ---
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

autoUpdater.autoDownload = true;      // Tự động tải cập nhật
autoUpdater.autoInstallOnAppQuit = false; // Người dùng chọn khi cài
autoUpdater.allowDowngrade = false;   // Không cho downgrade

console.log('[AUTO-UPDATE] 🔧 Configuring autoUpdater...');
console.log('[AUTO-UPDATE] autoDownload:', autoUpdater.autoDownload);
console.log('[AUTO-UPDATE] autoInstallOnAppQuit:', autoUpdater.autoInstallOnAppQuit);
console.log('[AUTO-UPDATE] GITHUB_TOKEN present:', !!GITHUB_TOKEN);
console.log('[AUTO-UPDATE] Token length:', GITHUB_TOKEN.length);

// Set GitHub token for private repo
const feedURL = {
  provider: 'github',
  owner: 'Thanhdn1984',
  repo: 'apc-clone',
  token: GITHUB_TOKEN,
  private: true
};
console.log('[AUTO-UPDATE] 🔗 Feed URL config:', JSON.stringify({ ...feedURL, token: '***HIDDEN***' }));

try {
  autoUpdater.setFeedURL(feedURL);
  console.log('[AUTO-UPDATE] ✅ setFeedURL successful');
} catch (err) {
  console.error('[AUTO-UPDATE] ❌ setFeedURL FAILED:', err);
}

// --- Auto-Updater Event Handlers ---
autoUpdater.on('checking-for-update', () => {
  sendLogToRenderer('INFO', '🔍 Đang kiểm tra cập nhật...');
});

autoUpdater.on('update-available', (info) => {
  sendLogToRenderer('SUCCESS', `✅ Có bản cập nhật mới: v${info.version}`, {
    version: info.version,
    releaseDate: info.releaseDate,
    files: info.files?.map(f => ({ url: f.url, size: f.size }))
  });
  mainWindow.webContents.send('update_available', info);
});

autoUpdater.on('update-not-available', (info) => {
  sendLogToRenderer('INFO', `📦 Đang dùng phiên bản mới nhất: v${info.version}`, {
    currentVersion: APP_VERSION,
    latestVersion: info.version
  });
  mainWindow.webContents.send('update_not_available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  sendLogToRenderer('SUCCESS', `📥 Đã tải xong bản cập nhật: v${info.version}`, info);
  mainWindow.webContents.send('update_downloaded', info);
});

autoUpdater.on('error', (error) => {
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall
  };
  sendLogToRenderer('ERROR', `❌ Lỗi auto-update: ${error.message}`, errorDetails);
  console.error('[AUTO-UPDATE] Full error object:', error);
  mainWindow.webContents.send('update_error', error.message);
});

autoUpdater.on('download-progress', (progress) => {
  const msg = `⬇️ Đang tải: ${Math.round(progress.percent)}% (${(progress.transferred / 1024 / 1024).toFixed(1)}MB/${(progress.total / 1024 / 1024).toFixed(1)}MB)`;
  sendLogToRenderer('PROGRESS', msg, {
    percent: progress.percent,
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond
  });
  mainWindow.webContents.send('update_progress', progress);
});

ipcMain.on('restart_app', () => {
  sendLogToRenderer('INFO', '🔄 Đang khởi động lại để cài đặt...');
  if (isPortable) {
    // Portable: Mở thư mục chứa file mới và thoát app
    const downloadDir = path.join(portableDir, 'updates');
    shell.openPath(downloadDir);
    app.quit();
  } else {
    // NSIS: Sử dụng quitAndInstall bình thường
    autoUpdater.quitAndInstall();
  }
});

// --- Portable Update: Download full exe ---
let portableUpdateInfo = null;

async function downloadPortableUpdate(updateInfo) {
  return new Promise(async (resolve, reject) => {
    try {
      const version = updateInfo.version;
      const portableFileName = `APC Clone Portable ${version}.exe`;
      
      // Tìm file portable trong danh sách files
      const portableFile = updateInfo.files?.find(f => 
        f.url.includes('Portable') && f.url.endsWith('.exe')
      );
      
      if (!portableFile) {
        reject(new Error('Không tìm thấy file Portable trong release'));
        return;
      }

      sendLogToRenderer('INFO', `📦 Đang chuẩn bị tải Portable v${version}...`);
      
      // Tạo thư mục updates trong portable dir
      const downloadDir = path.join(portableDir, 'updates');
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      
      const downloadPath = path.join(downloadDir, portableFileName);
      
      // Lấy URL download từ GitHub releases
      const downloadUrl = `https://github.com/Thanhdn1984/apc-clone/releases/download/v${version}/${encodeURIComponent(portableFileName)}`;
      
      sendLogToRenderer('INFO', `⬇️ Đang tải từ: ${downloadUrl}`);
      
      // Download file với progress
      const file = fs.createWriteStream(downloadPath);
      let receivedBytes = 0;
      
      const makeRequest = (url) => {
        const options = {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/octet-stream',
            'User-Agent': 'APC-Clone'
          }
        };
        
        https.get(url, options, (response) => {
          // Handle redirect
          if (response.statusCode === 302 || response.statusCode === 301) {
            makeRequest(response.headers.location);
            return;
          }
          
          if (response.statusCode !== 200) {
            reject(new Error(`Download failed: HTTP ${response.statusCode}`));
            return;
          }
          
          const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
          
          response.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0) {
              const percent = (receivedBytes / totalBytes) * 100;
              mainWindow.webContents.send('update_progress', {
                percent,
                transferred: receivedBytes,
                total: totalBytes,
                bytesPerSecond: 0
              });
              sendLogToRenderer('PROGRESS', `⬇️ Đang tải: ${percent.toFixed(1)}% (${(receivedBytes/1024/1024).toFixed(1)}MB/${(totalBytes/1024/1024).toFixed(1)}MB)`);
            }
          });
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            sendLogToRenderer('SUCCESS', `✅ Đã tải xong: ${portableFileName}`);
            sendLogToRenderer('INFO', `📁 Lưu tại: ${downloadPath}`);
            resolve({
              downloadPath,
              version,
              fileName: portableFileName
            });
          });
        }).on('error', (err) => {
          fs.unlink(downloadPath, () => {}); // Delete partial file
          reject(err);
        });
      };
      
      makeRequest(downloadUrl);
      
    } catch (err) {
      reject(err);
    }
  });
}

ipcMain.on('check_for_updates', async () => {
  console.log('============================================');
  console.log('[AUTO-UPDATE] 👆 CHECK_FOR_UPDATES IPC RECEIVED!');
  console.log('[AUTO-UPDATE] isPortable:', isPortable);
  console.log('============================================');
  sendLogToRenderer('INFO', `👆 Đang kiểm tra cập nhật... (${isPortable ? 'Portable' : 'NSIS'})`);
  console.log('[AUTO-UPDATE] Current app version:', APP_VERSION);
  console.log('[AUTO-UPDATE] isDev:', isDev);
  
  if (isPortable) {
    // --- PORTABLE MODE: Manual check via GitHub API ---
    sendLogToRenderer('INFO', '📡 Đang kết nối GitHub API...');
    
    try {
      const releaseInfo = await fetchLatestRelease();
      const latestVersion = releaseInfo.tag_name.replace('v', '');
      
      sendLogToRenderer('SUCCESS', `📡 GitHub: Phiên bản mới nhất là v${latestVersion}`);
      
      if (isNewerVersion(latestVersion, APP_VERSION)) {
        sendLogToRenderer('SUCCESS', `✅ Có bản cập nhật mới: v${latestVersion}`);
        
        // Tìm file portable trong assets
        const portableAsset = releaseInfo.assets?.find(a => 
          a.name.includes('Portable') && a.name.endsWith('.exe')
        );
        
        const updateInfo = {
          version: latestVersion,
          releaseDate: releaseInfo.published_at,
          releaseNotes: releaseInfo.body,
          files: releaseInfo.assets?.map(a => ({
            url: a.browser_download_url,
            size: a.size,
            name: a.name
          }))
        };
        
        portableUpdateInfo = updateInfo;
        mainWindow.webContents.send('update_available', updateInfo);
        
        // Hỏi người dùng có muốn tải không
        const result = await dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Cập nhật mới',
          message: `Có phiên bản mới: v${latestVersion}`,
          detail: `Phiên bản hiện tại: v${APP_VERSION}\n\nBạn có muốn tải bản cập nhật không?\n\nFile mới sẽ được lưu trong thư mục "updates" cùng vị trí với app.`,
          buttons: ['Tải ngay', 'Để sau'],
          defaultId: 0
        });
        
        if (result.response === 0) {
          // Tải file portable mới
          try {
            const downloadResult = await downloadPortableUpdate(updateInfo);
            
            mainWindow.webContents.send('update_downloaded', {
              version: latestVersion,
              downloadPath: downloadResult.downloadPath
            });
            
            // Hỏi mở thư mục
            const openResult = await dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tải thành công',
              message: `Đã tải xong v${latestVersion}!`,
              detail: `File được lưu tại:\n${downloadResult.downloadPath}\n\nBạn có muốn mở thư mục chứa file không?`,
              buttons: ['Mở thư mục', 'Đóng'],
              defaultId: 0
            });
            
            if (openResult.response === 0) {
              shell.showItemInFolder(downloadResult.downloadPath);
            }
            
          } catch (downloadErr) {
            sendLogToRenderer('ERROR', `❌ Lỗi tải file: ${downloadErr.message}`);
            mainWindow.webContents.send('update_error', downloadErr.message);
          }
        }
        
      } else {
        sendLogToRenderer('INFO', `📦 Đang dùng phiên bản mới nhất: v${APP_VERSION}`);
        mainWindow.webContents.send('update_not_available', {
          version: latestVersion,
          currentVersion: APP_VERSION
        });
      }
      
    } catch (err) {
      sendLogToRenderer('ERROR', `❌ Lỗi kiểm tra cập nhật: ${err.message}`);
      mainWindow.webContents.send('update_error', err.message);
    }
    
  } else {
    // --- NSIS MODE: Use electron-updater ---
    const feedURLInfo = autoUpdater.getFeedURL();
    console.log('[AUTO-UPDATE] Feed URL:', feedURLInfo);
    
    // Kiểm tra xem có app-update.yml không
    const appUpdatePath = path.join(__dirname, 'app-update.yml');
    const resourcesPath = path.join(process.resourcesPath || __dirname, 'app-update.yml');
    console.log('[AUTO-UPDATE] Checking app-update.yml at:', appUpdatePath);
    console.log('[AUTO-UPDATE] Checking app-update.yml at resources:', resourcesPath);
    console.log('[AUTO-UPDATE] app-update.yml exists in electron:', fs.existsSync(appUpdatePath));
    console.log('[AUTO-UPDATE] app-update.yml exists in resources:', fs.existsSync(resourcesPath));
    
    console.log('[AUTO-UPDATE] Calling autoUpdater.checkForUpdates()...');
    
    try {
      const result = await autoUpdater.checkForUpdates();
      console.log('[AUTO-UPDATE] ✅ checkForUpdates() SUCCESS:', JSON.stringify(result, null, 2));
      
      if (result && result.updateInfo) {
        const latestVersion = result.updateInfo.version;
        const currentVersion = APP_VERSION;
        
        sendLogToRenderer('SUCCESS', `📡 Đã kết nối GitHub thành công!`, {
          currentVersion,
          latestVersion,
          isUpdateAvailable: latestVersion !== currentVersion
        });
        
        // Nếu version giống nhau, gửi thông báo "đã là mới nhất"
        if (latestVersion === currentVersion) {
          console.log('[AUTO-UPDATE] Already on latest version');
          mainWindow.webContents.send('update_not_available', {
            version: latestVersion,
            currentVersion: currentVersion
          });
        }
      } else {
        sendLogToRenderer('WARNING', '⚠️ Không nhận được thông tin phiên bản từ GitHub');
      }
    } catch (err) {
      console.error('[AUTO-UPDATE] ❌ checkForUpdates() FAILED:', err);
      sendLogToRenderer('ERROR', `❌ Lỗi kiểm tra cập nhật: ${err.message}`, {
        error: err.message,
        stack: err.stack
      });
      // Gửi event lỗi đến renderer
      mainWindow.webContents.send('update_error', err.message);
    }
  }
});

// --- Helper: Fetch latest release from GitHub API ---
async function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: '/repos/Thanhdn1984/apc-clone/releases/latest',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'APC-Clone'
      }
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// --- Helper: Compare versions ---
function isNewerVersion(latest, current) {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

// --- Utility Functions ---
const findDocxFilesRecursive = (dirPath, fileList = []) => {
    try {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            try {
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    findDocxFilesRecursive(fullPath, fileList);
                } else if (path.extname(fullPath).toLowerCase() === '.docx') {
                    fileList.push(fullPath);
                }
            } catch (e) { /* ignore */ }
        }
    } catch(e) { /* ignore */ }
    return fileList;
};

// --- Main Window & Menu ---
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 900,
        webPreferences: { 
            preload: path.join(__dirname, 'preload.js') 
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5000');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        // The updater is now called in whenReady() for all environments.
    }
}

function createMenu() {
     const menuTemplate = [
        {
            label: 'Tệp',
            submenu: [
                {
                    label: 'Kiểm tra cập nhật...',
                    click() {
                        autoUpdater.checkForUpdates();
                    }
                },
                { type: 'separator' },
                { role: 'about', label: 'Giới thiệu' },
                { type: 'separator' },
                { role: 'quit', label: 'Thoát', accelerator: 'CmdOrCtrl+Q' }
            ]
        },
        {
            label: 'Công cụ',
            submenu: [
                {
                    label: 'Mở Thư Mục Output Mặc Định',
                    click: () => {
                        shell.openPath(defaultOutputDir).catch(err => console.error("Failed to open default output folder:", err));
                    }
                }
            ]
        },
        {
            label: 'Nhà phát triển',
            submenu: [
                { role: 'reload', label: 'Tải lại' },
                { role: 'forceReload', label: 'Buộc tải lại' },
                { role: 'toggleDevTools', label: 'Bật/Tắt Công cụ Phát triển' }
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

// --- App Lifecycle ---
if (require('electron-squirrel-startup')) app.quit();

app.whenReady().then(() => {
    if (!fs.existsSync(defaultOutputDir)) {
        fs.mkdirSync(defaultOutputDir, { recursive: true });
    }

    createWindow();
    createMenu();
    
    // --- AUTO-UPDATE SETUP ---
    if (!isDev) {
        console.log('[AUTO-UPDATE] Kiểm tra cập nhật...');
        autoUpdater.checkForUpdates().catch(err => {
            console.error('[AUTO-UPDATE] Lỗi kiểm tra:', err);
        });
        
        // Kiểm tra lại mỗi 60 phút
        setInterval(() => {
            autoUpdater.checkForUpdates();
        }, 60 * 60 * 1000);
    }

    // --- CENTRALIZED IPC HANDLERS (KEPT INTACT) ---
    ipcMain.handle('add-templates', addTemplates);
    ipcMain.handle('start-generation', (event, request) => startGeneration(event, request));
    ipcMain.handle('execute-generation-strategies', (event, request) => executeGeneration(event, request));
    ipcMain.handle('reverse-generate-template', (event, request) => reverseGenerateTemplate(event, { ...request, outputDir: reverseOutputDir }));

    ipcMain.handle('select-source-dialog', async () => {
        const choice = await dialog.showMessageBox({ type: 'question', buttons: ['Chọn Từng File', 'Chọn Cả Thư Mục', 'Hủy'], title: 'Chọn Nguồn Dữ Liệu', message: 'Bạn muốn chọn các file nguồn riêng lẻ hay chọn từ một thư mục?', defaultId: 0, cancelId: 2 });
        if (choice.response === 2) return { canceled: true, filePaths: [] };
        let dialogResult;
        let allDocxPaths = [];
        if (choice.response === 0) {
            dialogResult = await dialog.showOpenDialog({ title: 'Chọn file nguồn (.docx)', properties: ['openFile', 'multiSelections'], filters: [{ name: 'Word Documents', extensions: ['docx'] }] });
            if (!dialogResult.canceled) allDocxPaths = dialogResult.filePaths;
        } else {
            dialogResult = await dialog.showOpenDialog({ title: 'Chọn thư mục chứa file nguồn', properties: ['openDirectory', 'multiSelections'] });
            if (!dialogResult.canceled) {
                for (const dirPath of dialogResult.filePaths) {
                    allDocxPaths = allDocxPaths.concat(findDocxFilesRecursive(dirPath));
                }
            }
        }
        return { canceled: dialogResult.canceled, filePaths: [...new Set(allDocxPaths)] };
    });

    ipcMain.handle('select-save-directory-dialog', async () => {
        const result = await dialog.showOpenDialog({ title: 'Chọn thư mục để lưu file', properties: ['openDirectory', 'createDirectory'] });
        if (!result.canceled && result.filePaths.length > 0) {
            reverseOutputDir = result.filePaths[0];
        }
        return result;
    });

    // --- PROFILE CONFIGURATION MANAGEMENT (KEPT INTACT) ---
    ipcMain.handle('profiles:select-directory', async () => {
        const result = await dialog.showOpenDialog(mainWindow, { title: 'Chọn Kho Cấu Hình', properties: ['openDirectory'] });
        return result.canceled ? null : result.filePaths[0];
    });

    ipcMain.handle('profiles:get-list', async (event, dirPath) => {
        if (!dirPath || typeof dirPath !== 'string' || !fs.existsSync(dirPath)) return [];
        try {
            const files = fs.readdirSync(dirPath);
            return files.filter(f => path.extname(f).toLowerCase() === '.json').map(f => path.parse(f).name);
        } catch (error) {
            console.error('[PROFILES] Error reading profile list:', error.message);
            return [];
        }
    });

    ipcMain.handle('profiles:load', async (event, filePath) => {
        try {
            if (!filePath || typeof filePath !== 'string') throw new Error('Invalid filePath');
            if (!fs.existsSync(filePath)) return null;
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return data;
        } catch (error) {
            console.error('[PROFILES] Error loading profile:', error.message);
            return null;
        }
    });

    ipcMain.handle('profiles:save', async (event, filePath, data, isOverwrite) => {
        try {
            if (!filePath || typeof filePath !== 'string') throw new Error('Invalid filePath');
            if (!data || typeof data !== 'object') throw new Error('Invalid data');
            
            if (!isOverwrite && fs.existsSync(filePath)) {
                 const choice = await dialog.showMessageBox(mainWindow, {
                    type: 'question',
                    buttons: ['Ghi đè', 'Hủy'],
                    title: 'Xác nhận ghi đè',
                    message: `Hồ sơ \"${path.parse(filePath).name}\" đã tồn tại. Bạn có muốn ghi đè không?`,
                    defaultId: 1,
                    cancelId: 1
                 });
                 if(choice.response === 1) return { success: false, canceled: true };
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return { success: true };
        } catch (error) {
            console.error('[PROFILES] Error saving profile:', error.message);
            return { success: false, error: error.message };
        }
    });
    
    ipcMain.handle('profiles:delete', async (event, filePath) => {
        try {
            if (!filePath || typeof filePath !== 'string') throw new Error('Invalid filePath');
            const choice = await dialog.showMessageBox(mainWindow, {
                type: 'warning',
                buttons: ['Xóa', 'Hủy'],
                title: 'Xác nhận xóa',
                message: `Bạn có chắc muốn xóa vĩnh viễn hồ sơ này không?\n${path.basename(filePath)}`,
                defaultId: 1,
                cancelId: 1
            });
            if (choice.response === 0) {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                return { success: true, canceled: false };
            }
            return { success: false, canceled: true };
        } catch (error) {
            console.error('[PROFILES] Error deleting profile:', error.message);
            return { success: false, error: error.message };
        }
    });

    ipcMain.on('open-output-folder', () => {
        shell.openPath(defaultOutputDir).catch(err => console.error("Failed to open default output folder:", err));
    });

    // --- MISSING HANDLERS: File System ---
    ipcMain.on('open-reverse-output-folder', () => {
        shell.openPath(reverseOutputDir).catch(err => console.error("Failed to open reverse output folder:", err));
    });

    ipcMain.handle('readDirectoryFiles', async (event, dirPath, extension) => {
        try {
            if (!dirPath || !fs.existsSync(dirPath)) return { success: false, files: [], error: 'Thư mục không tồn tại' };
            const ext = (extension || '').toLowerCase();
            const items = fs.readdirSync(dirPath);
            const files = items
                .filter(name => !ext || name.toLowerCase().endsWith(ext))
                .map(name => ({ name, path: path.join(dirPath, name) }))
                .filter(f => fs.statSync(f.path).isFile());
            return { success: true, files };
        } catch (err) {
            return { success: false, files: [], error: err.message };
        }
    });

    ipcMain.handle('readFileAsBuffer', async (event, filePath) => {
        try {
            if (!filePath || !fs.existsSync(filePath)) throw new Error('File không tồn tại: ' + filePath);
            const buffer = fs.readFileSync(filePath);
            return { success: true, buffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('saveFileDialog', async (event, options) => {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Lưu file',
            defaultPath: options?.defaultPath || '',
            filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }]
        });
        return result;
    });

    ipcMain.handle('writeFile', async (event, filePath, data) => {
        try {
            const buffer = Buffer.from(data);
            fs.writeFileSync(filePath, buffer);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('clearCache', async () => {
        try {
            await mainWindow.webContents.session.clearCache();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    // --- MISSING HANDLERS: Excel ---
    const XLSX = require('xlsx');

    ipcMain.handle('excel:selectFile', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Chọn file Excel',
            properties: ['openFile'],
            filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls', 'csv'] }]
        });
        return result;
    });

    ipcMain.handle('excel:detectMapping', async (event, filePath, fields) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetNames = workbook.SheetNames;
            const firstSheet = workbook.Sheets[sheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            const headers = rows[0] || [];
            const sampleRows = rows.slice(1, 4);

            const suggestedMapping = {};
            if (Array.isArray(fields)) {
                fields.forEach(field => {
                    const fieldNameLower = (field.name || '').toLowerCase();
                    const fieldLabelLower = (field.label || '').toLowerCase();
                    const matchedIdx = headers.findIndex(h =>
                        String(h).toLowerCase() === fieldNameLower ||
                        String(h).toLowerCase() === fieldLabelLower
                    );
                    if (matchedIdx >= 0) {
                        suggestedMapping[field.name] = { columnIndex: matchedIdx, columnName: headers[matchedIdx] };
                    }
                });
            }

            return { success: true, sheetNames, headers, preview: { sampleRows }, suggestedMapping };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('excel:importBatch', async (event, filePath, columnMapping, fields) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            const dataRows = rows.slice(1);

            const customers = [];
            let skippedCount = 0;
            dataRows.forEach((row, idx) => {
                if (!row || row.every(cell => cell === undefined || cell === '')) { skippedCount++; return; }
                const customer = { _rowIndex: idx + 2 };
                Object.entries(columnMapping).forEach(([fieldName, colIdx]) => {
                    if (colIdx !== undefined && colIdx !== null && colIdx !== '') {
                        customer[fieldName] = row[colIdx] !== undefined ? String(row[colIdx]) : '';
                    }
                });
                customers.push(customer);
            });

            return { success: true, importedCount: customers.length, skippedCount, customers };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('excel:exportCustomers', async (event, customers, fields, options) => {
        try {
            const saveResult = await dialog.showSaveDialog(mainWindow, {
                title: 'Lưu file Excel',
                defaultPath: options?.defaultFileName || 'export.xlsx',
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });
            if (saveResult.canceled) return { canceled: true };

            const headers = Array.isArray(fields) ? fields.map(f => f.label || f.name) : [];
            const fieldNames = Array.isArray(fields) ? fields.map(f => f.name) : [];
            const rows = customers.map(c => fieldNames.map(name => c[name] || ''));

            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, options?.sheetName || 'Sheet1');
            XLSX.writeFile(wb, saveResult.filePath);

            return { success: true, filePath: saveResult.filePath };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('excel:createTemplate', async (event, fields, options) => {
        try {
            const saveResult = await dialog.showSaveDialog(mainWindow, {
                title: 'Lưu file Excel mẫu',
                defaultPath: options?.defaultFileName || 'template.xlsx',
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            });
            if (saveResult.canceled) return { canceled: true };

            const headers = Array.isArray(fields) ? fields.map(f => f.label || f.name) : [];
            const sampleCount = options?.sampleRows || 3;
            const sampleRows = Array(sampleCount).fill(headers.map(() => ''));

            const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template');
            XLSX.writeFile(wb, saveResult.filePath);

            return { success: true, filePath: saveResult.filePath };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
