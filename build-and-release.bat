@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   DocX Automation Tool - Build & Release
echo ========================================
echo.

:: Lấy version hiện tại từ package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /r "\"version\"" package.json') do (
    set CURRENT_VERSION=%%~a
)
echo [INFO] Version hiện tại: %CURRENT_VERSION%
echo.

:: Nhập version mới
set /p NEW_VERSION="Nhập version mới (ví dụ: 2.1.8): "
if "%NEW_VERSION%"=="" (
    echo [ERROR] Version không được để trống!
    pause
    exit /b 1
)

echo.
echo [INFO] Sẽ build version: %NEW_VERSION%
echo.
set /p CONFIRM="Xác nhận build và release version %NEW_VERSION%? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo [INFO] Đã hủy.
    pause
    exit /b 0
)

echo.
echo ========================================
echo   BƯỚC 1: Cập nhật version trong package.json
echo ========================================
powershell -Command "$json = Get-Content 'package.json' | ConvertFrom-Json; $json.version = '%NEW_VERSION%'; $json | ConvertTo-Json -Depth 100 | Set-Content 'package.json' -Encoding UTF8"
if errorlevel 1 goto :error
echo [SUCCESS] Version đã được cập nhật thành %NEW_VERSION%
echo.

echo ========================================
echo   BƯỚC 2: Xóa build cũ
echo ========================================
if exist "build-output" (
    echo Đang xóa build-output...
    rmdir /s /q build-output 2>nul
)
if exist "dist" (
    echo Đang xóa dist...
    rmdir /s /q dist 2>nul
)
echo [SUCCESS] Đã xóa build cũ
echo.

echo ========================================
echo   BƯỚC 3: Build React Application
echo ========================================
call npm run build
if errorlevel 1 goto :error
echo [SUCCESS] React build hoàn tất
echo.

echo ========================================
echo   BƯỚC 4: Build Electron Portable
echo ========================================
call node_modules\.bin\electron-builder --win portable --config.directories.output=build-output
if errorlevel 1 goto :error
echo [SUCCESS] Electron build hoàn tất
echo.

:: Kiểm tra file exe
if not exist "build-output\DocX Automation Tool Portable %NEW_VERSION%.exe" (
    echo [ERROR] File exe không tồn tại!
    goto :error
)

:: Hiển thị thông tin file
for %%F in ("build-output\DocX Automation Tool Portable %NEW_VERSION%.exe") do (
    set SIZE=%%~zF
    set /a SIZE_MB=!SIZE! / 1048576
    echo [INFO] File: %%~nxF
    echo [INFO] Kích thước: !SIZE_MB! MB
)
echo.

echo ========================================
echo   BƯỚC 5: Commit và Push lên GitHub
echo ========================================

:: Commit version change
git add package.json package-lock.json
git commit -m "chore: bump version to %NEW_VERSION%"
if errorlevel 1 (
    echo [WARNING] Không có thay đổi để commit hoặc đã commit rồi
)

:: Commit source code changes
git add src/
git commit -m "chore: update for version %NEW_VERSION%"
if errorlevel 1 (
    echo [INFO] Không có thay đổi source code
)

:: Push lên GitHub
echo Đang push lên GitHub...
git push origin main
if errorlevel 1 goto :error
echo [SUCCESS] Đã push code lên GitHub
echo.

echo ========================================
echo   BƯỚC 6: Tạo và Push Git Tag
echo ========================================
:: Tạo tag
git tag -a v%NEW_VERSION% -m "Release version %NEW_VERSION%"
if errorlevel 1 (
    echo [WARNING] Tag có thể đã tồn tại, đang xóa và tạo lại...
    git tag -d v%NEW_VERSION% 2>nul
    git push origin :refs/tags/v%NEW_VERSION% 2>nul
    git tag -a v%NEW_VERSION% -m "Release version %NEW_VERSION%"
)

:: Push tag lên GitHub
echo Đang push tag lên GitHub...
git push origin v%NEW_VERSION%
if errorlevel 1 goto :error
echo [SUCCESS] Đã tạo và push tag v%NEW_VERSION%
echo.

echo ========================================
echo   HOÀN TẤT!
echo ========================================
echo.
echo ✅ Build thành công version %NEW_VERSION%
echo 📦 File: build-output\DocX Automation Tool Portable %NEW_VERSION%.exe
echo 📤 Code và tag đã được push lên GitHub
echo.
echo ========================================
echo   TẠO GITHUB RELEASE
echo ========================================
echo.
set /p CREATE_RELEASE="Tạo GitHub Release ngay bây giờ? (Y/N): "
if /i "%CREATE_RELEASE%"=="Y" (
    call create-github-release.bat
) else (
    echo.
    echo Để tạo release sau, chạy: create-github-release.bat
    echo Hoặc thủ công tại: https://github.com/Thanhdn1984/docxautomator/releases
    echo.
)
pause
exit /b 0

:error
echo.
echo ========================================
echo   LỖI!
echo ========================================
echo Có lỗi xảy ra trong quá trình build!
echo Vui lòng kiểm tra lại.
echo.
pause
exit /b 1
