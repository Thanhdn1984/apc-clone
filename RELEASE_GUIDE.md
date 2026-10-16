# 🚀 Hướng Dẫn Build và Release

## 📋 Quy Trình Tự Động (KHUYẾN NGHỊ)

### Cách 1: Sử dụng File BAT (Đơn giản nhất)

```bash
.\build-and-release.bat
```

Script sẽ tự động:
1. ✅ Hỏi version mới cần build
2. ✅ Cập nhật version trong `package.json`
3. ✅ Xóa build cũ
4. ✅ Build React application
5. ✅ Build Electron portable (.exe)
6. ✅ Commit và push code lên GitHub
7. ✅ Tạo và push Git tag
8. ✅ Hiển thị hướng dẫn tạo GitHub Release

**Output:** `build-output\DocX Automation Tool Portable [VERSION].exe`

---

### Cách 2: Sử dụng PowerShell Script

```powershell
.\scripts\safe-build.ps1 -Version "2.1.8"
```

**Lưu ý:** Script này dùng `--publish always` nên sẽ cố upload lên GitHub. Nếu không muốn, dùng Cách 1.

---

## 🛠️ Quy Trình Thủ Công

### Bước 1: Build React App
```bash
npm run build
```

### Bước 2: Build Electron Portable
```powershell
.\node_modules\.bin\electron-builder --win portable --config.directories.output=build-output
```

### Bước 3: Commit và Push
```bash
git add .
git commit -m "chore: release version X.X.X"
git push origin main
```

### Bước 4: Tạo Tag
```bash
git tag -a vX.X.X -m "Release version X.X.X"
git push origin vX.X.X
```

### Bước 5: Tạo GitHub Release
1. Vào: https://github.com/Thanhdn1984/docxautomator/releases
2. Click **"Create a new release"**
3. Chọn tag vừa tạo
4. Upload file `.exe` từ `build-output\`
5. Viết release notes
6. Click **"Publish release"**

---

## 🔧 Các Script NPM Có Sẵn

```json
{
  "start": "Dev mode với Electron",
  "build": "Build React app (dist/)",
  "dist": "Build + Package Electron",
  "dist:portable": "Build portable exe",
  "safe-build": "Build an toàn với PowerShell script",
  "clean": "Xóa cache build",
  "release": "Clean + Build + Publish"
}
```

---

## 📝 Lưu Ý Quan Trọng

### ❌ Vấn đề thường gặp:

1. **File Lock Error**
   - Đóng tất cả instance của app đang chạy
   - Đóng File Explorer nếu đang mở folder `dist` hoặc `release-builds`
   - Restart máy nếu cần

2. **BOM Error trong package.json**
   - Đã được tự động fix trong script
   - Nếu vẫn lỗi, chạy:
     ```powershell
     $content = Get-Content ".\package.json" -Raw
     $utf8 = New-Object System.Text.UTF8Encoding $false
     [System.IO.File]::WriteAllText("$PWD\package.json", $content, $utf8)
     ```

3. **Build vào folder bị lock**
   - Script tự động build vào `build-output` để tránh conflict
   - Không build vào `release-builds` nếu folder đang bị lock

---

## 🎯 Checklist Trước Khi Release

- [ ] Code đã được test kỹ
- [ ] Version number đã tăng (semantic versioning)
- [ ] CHANGELOG đã được cập nhật (nếu có)
- [ ] Tất cả tests pass
- [ ] Không có uncommitted changes
- [ ] Build thành công và file .exe chạy được

---

## 📦 Version Naming Convention

Sử dụng **Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (2.0.0 → 3.0.0)
- **MINOR**: New features (2.1.0 → 2.2.0)  
- **PATCH**: Bug fixes (2.1.7 → 2.1.8)

**Ví dụ:**
- Fix bugs: `2.1.7` → `2.1.8`
- New feature: `2.1.8` → `2.2.0`
- Breaking change: `2.2.0` → `3.0.0`

---

## 🆘 Hỗ Trợ

Nếu gặp vấn đề, kiểm tra:
1. [BUILD_PROCESS.md](BUILD_PROCESS.md) - Chi tiết quy trình build
2. [BUILD_GUIDE.md](BUILD_GUIDE.md) - Hướng dẫn chi tiết
3. GitHub Issues

---

**Cập nhật lần cuối:** 20/12/2025
