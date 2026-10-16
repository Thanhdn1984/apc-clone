# Hướng dẫn Build DocX Automator

## Tổng quan

Build process sử dụng:
- **Vite 5.4.21**: Minification JS tự động (esbuild) → 470KB (từ 949KB)
- **Electron 31.7.7**: Desktop app packaging
- **electron-builder 24.13.3**: Tạo installer và portable exe
- **Delta Updates**: Chỉ tải phần thay đổi (~15MB thay vì 160MB)

## Chuẩn bị

### 1. Cài đặt dependencies
```bash
npm install
```

### 2. Cấu trúc project
```
d:\docxautomator/
├── src/              # React source code
├── electron/         # Electron main & preload
├── dist/             # Built assets (tự động tạo)
├── release-builds/   # Executable outputs
├── scripts/          # Build utilities
└── package.json      # Build config
```

## Build Commands

### Development
```bash
npm start            # Chạy Electron + Vite dev server
npm run dev          # Chỉ Vite dev server (port 5000)
```

### Production Build

#### 1. Build Web Assets (Vite)
```bash
npm run build
```
- Output: `dist/` folder
- JS: 470KB (minified)
- CSS: 49.33KB
- Gzip: 149.31KB

#### 2. Build & Package (Vite + Electron)
```bash
npm run dist
```
- Output: `release-builds/DocX Automation Tool Portable 2.1.3.exe`
- Kích thước: ~173MB
- Chứa: app.asar (40.54MB) + Electron runtime

#### 3. Clean Artifacts
```bash
npm run clean        # Xóa dist + release-builds + cache
```

## Build Configuration

### vite.config.js
```javascript
build: {
  target: 'esnext'
  // Vite 5 mặc định minify với esbuild
  // Tự động drop console.log, debugger trong production
}
```

### package.json > build
```json
{
  "files": ["dist", "electron", "package.json"],
  "win": {
    "target": ["portable"],  // Chỉ portable exe (bỏ NSIS)
    "arch": ["x64"]          // 64-bit only
  },
  "nsis": {
    "differentialPackage": true  // Delta updates
  }
}
```

## Build Verification

Build script tự động kiểm tra:
- ✅ app.asar tồn tại (chứa dist + electron)
- ✅ Không có node_modules trong package
- ✅ Icon settings

Output:
```
[BUILD CHECK] ✅ app.asar tồn tại (40.54MB)
[BUILD CHECK] ✅ Kiểm tra package hoàn tất - OK
```

## Performance Metrics

| Metric | Giá trị |
|--------|--------|
| JS minified | 470KB (gzip: 149KB) |
| CSS | 49.33KB (gzip: 9.13KB) |
| app.asar | 40.54MB |
| Portable EXE | ~173MB |
| Build time | ~15-30 giây |
| Delta update | ~15-20MB |

## Troubleshooting

### 1. Build bị lock (7zip timeout)
```bash
# Kill 7zip process
taskkill /F /IM 7za.exe

# Rebuild
npm run clean && npm run dist
```

### 2. PowerShell pipe issue
Luôn dùng `cmd /c` để chạy npm:
```bash
cmd /c "npm run build"
```

### 3. File không được package vào app.asar
Kiểm tra `files` array trong package.json:
```json
"files": ["dist", "electron", "package.json"]
```

### 4. Icon warning
Cấu hình icon trong nsis:
```json
"nsis": {
  "installerIcon": null,
  "uninstallerIcon": null
}
```

## Publishing to GitHub

### 1. Tag release
```bash
git tag -a v2.1.3 -m "Release 2.1.3"
git push origin v2.1.3
```

### 2. Auto-update configuration
Electron-updater tự động:
- Kiểm tra updates từ GitHub releases
- Download delta packages khi có sẵn
- Install on next app restart

## Next Steps

- [ ] Thêm custom icon (icon.ico, icon.png)
- [ ] Cấu hình GitHub Actions CI/CD
- [ ] Thêm code signing cho installer
- [ ] NSIS installer UI customization
- [ ] Auto-update progress UI

---
**Last Updated**: December 20, 2025
**Optimized by**: Build Config Refactor
**Status**: ✅ Production Ready
