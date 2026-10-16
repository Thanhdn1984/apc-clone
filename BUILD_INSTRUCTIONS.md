# 🚀 QUY TRÌNH BUILD VÀ RELEASE

## ⚠️ VẤN ĐỀ ĐÃ SỬA

### **Vấn đề cũ:**
- Dữ liệu người dùng bị mất sau khi build version mới
- APP_VERSION hardcode "3.0.0-REVOLUTION" không khớp với package.json "2.1.7"
- localStorage key thay đổi → dữ liệu cũ không load được

### **Giải pháp:**
- ✅ APP_VERSION giờ tự động lấy từ package.json
- ✅ localStorage key ổn định theo version thực tế
- ✅ Dữ liệu người dùng được bảo toàn qua các version

---

## 📦 CÁCH SỬ DỤNG (ĐƠN GIẢN)

### **Bước 1: Chạy script build**

```bash
.\release.bat
```

### **Bước 2: Làm theo hướng dẫn**

Script sẽ tự động:
1. ✅ Hỏi version mới (hoặc giữ version cũ)
2. ✅ Cập nhật package.json
3. ✅ Đóng các process đang chạy
4. ✅ Xóa build cũ
5. ✅ Build React + Electron
6. ✅ Commit và push code
7. ✅ Tạo và push Git tag
8. ✅ Mở GitHub để tạo release

### **Bước 3: Tạo GitHub Release**

- Upload file `.exe` từ folder `build-output\`
- Viết release notes
- Publish

---

## 📋 CHI TIẾT QUY TRÌNH

### **Input:**
- Version mới (hoặc Enter để giữ version hiện tại)

### **Output:**
- 📦 File exe: `build-output\DocX Automation Tool Portable [VERSION].exe`
- 📤 Code đã push lên GitHub
- 🏷️ Git tag đã tạo
- 🌐 GitHub Releases đã mở

### **Thời gian:**
- Build: ~2-3 phút
- Upload lên GitHub: thủ công (~1 phút)

---

## 🔧 CÁC FILE BUILD SCRIPT

### **1. release.bat** ⭐ (KHUYẾN NGHỊ)
- Script chính, đơn giản, dễ hiểu
- Từng bước rõ ràng với progress indicator
- An toàn, không xóa nhầm dữ liệu người dùng

### **2. build-and-release.bat** (Cũ - vẫn dùng được)
- Script phức tạp hơn
- Có thêm một số tính năng nâng cao

### **3. create-github-release.bat**
- Chỉ mở GitHub và hướng dẫn tạo release
- Dùng khi đã build sẵn

### **4. scripts/safe-build.ps1** (PowerShell)
- PowerShell script cho advanced users
- Dùng: `.\scripts\safe-build.ps1 -Version "2.1.8"`

---

## ⚙️ CẤU TRÚC DỮ LIỆU

### **localStorage Keys:**
```javascript
// Version từ package.json
const APP_VERSION = packageJson.version; // "2.1.7"

// Key lưu dữ liệu
const APP_STATE_KEY = `docuGenAppState_v2.1.7`;

// Key welcome guide
const WELCOME_GUIDE_KEY = `hasSeenWelcomeGuide_v2.1.7`;
```

### **Dữ liệu được lưu:**
- ✅ Fields và groups
- ✅ Input data của người dùng
- ✅ Saved customers
- ✅ Settings (numberFormat, dateFormat)
- ✅ UI state (open tabs, accordions)

### **Migration tự động:**
- App tự động tìm và migrate dữ liệu từ version cũ
- Giữ lại cả key cũ để recovery nếu cần

---

## 🐛 XỬ LÝ LỖI

### **Lỗi: File đang bị lock**
```bash
# Đóng tất cả app đang chạy
taskkill /F /IM "DocX Automation Tool*.exe"

# Hoặc restart máy
```

### **Lỗi: BOM trong package.json**
```powershell
$content = Get-Content ".\package.json" -Raw
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$PWD\package.json", $content, $utf8)
```

### **Lỗi: Build thất bại**
```bash
# Xóa node_modules và cài lại
rmdir /s /q node_modules
npm install

# Thử build lại
.\release.bat
```

---

## 📚 TÀI LIỆU THAM KHẢO

- [BUILD_PROCESS.md](BUILD_PROCESS.md) - Chi tiết kỹ thuật
- [BUILD_GUIDE.md](BUILD_GUIDE.md) - Hướng dẫn chi tiết
- [RELEASE_GUIDE.md](RELEASE_GUIDE.md) - Các cách release khác nhau

---

## ✅ CHECKLIST TRƯỚC KHI RELEASE

- [ ] Code đã test kỹ
- [ ] Không có uncommitted changes quan trọng
- [ ] Version number hợp lý (semantic versioning)
- [ ] Build thành công
- [ ] File exe chạy được
- [ ] Dữ liệu người dùng không bị mất

---

## 🎯 LƯU Ý QUAN TRỌNG

### **⚠️ KHÔNG làm:**
- ❌ Xóa thư mục `%APPDATA%` khi build
- ❌ Clear localStorage trong code
- ❌ Thay đổi APP_VERSION thủ công trong App.jsx
- ❌ Build vào folder `release-builds` (dễ bị lock)

### **✅ NÊN làm:**
- ✅ Dùng `release.bat` để build
- ✅ Giữ version trong package.json làm nguồn duy nhất
- ✅ Build vào folder `build-output` mới
- ✅ Test app sau build trước khi release
- ✅ Backup dữ liệu quan trọng trước khi test

---

**Cập nhật:** 20/12/2025  
**Phiên bản hiện tại:** 2.1.7
