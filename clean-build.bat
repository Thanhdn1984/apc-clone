@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       CLEAN BUILD - Xóa toàn bộ cache và build lại          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo [1/6] Tắt Windows Defender Real-time (nếu có quyền admin)...
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $true" 2>nul
echo      (Bỏ qua nếu không có quyền admin)
echo.

echo [2/6] Xóa cache electron-builder...
if exist "%LOCALAPPDATA%\electron-builder\Cache" (
    echo      Đang xóa cache (có thể mất vài giây)...
    rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache" 2>nul
    echo      ✓ Đã xóa electron-builder cache
) else (
    echo      Cache không tồn tại
)
echo.

echo [3/6] Xóa cache electron...
if exist "%LOCALAPPDATA%\electron\Cache" (
    rmdir /s /q "%LOCALAPPDATA%\electron\Cache" 2>nul
    echo      ✓ Đã xóa electron cache
) else (
    echo      Cache không tồn tại  
)
echo.

echo [4/6] Xóa build cũ...
if exist "dist" rmdir /s /q dist 2>nul
if exist "release-builds" rmdir /s /q release-builds 2>nul
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
echo      ✓ Đã xóa build cũ
echo.

echo [5/6] Build React...
echo      Bắt đầu: %TIME%
call npm run build
if errorlevel 1 (
    echo      ✗ Lỗi build React!
    pause
    exit /b 1
)
echo      ✓ React build OK - %TIME%
echo.

echo [6/6] Build Electron Portable...
echo      Bắt đầu: %TIME%
echo      ⚠ LẦN ĐẦU SẼ TẢI ELECTRON + NSIS (~200MB), CÓ THỂ MẤT 10-15 PHÚT
echo.
echo ─────────────────────────────────────────────────────────────────

call npx electron-builder --win portable

echo ─────────────────────────────────────────────────────────────────
echo      Hoàn tất: %TIME%
echo.

:: Bật lại Windows Defender
powershell -Command "Set-MpPreference -DisableRealtimeMonitoring $false" 2>nul

:: Lấy version
for /f "tokens=2 delims=:, " %%a in ('findstr /r "\"version\"" package.json') do (
    set VERSION=%%~a
)
set VERSION=%VERSION:"=%

:: Kiểm tra kết quả
set "EXE_PATH=release-builds\DocX Automation Tool Portable %VERSION%.exe"
if exist "%EXE_PATH%" (
    for %%F in ("%EXE_PATH%") do (
        set SIZE=%%~zF
        set /a SIZE_MB=!SIZE! / 1048576
    )
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    ✅ BUILD THÀNH CÔNG!                      ║
    echo ╠══════════════════════════════════════════════════════════════╣
    echo ║  📦 File: DocX Automation Tool Portable %VERSION%.exe
    echo ║  📊 Size: !SIZE_MB! MB
    echo ╚══════════════════════════════════════════════════════════════╝
) else (
    echo ╔══════════════════════════════════════════════════════════════╗
    echo ║                    ❌ BUILD THẤT BẠI!                        ║
    echo ╚══════════════════════════════════════════════════════════════╝
    echo File không tồn tại: %EXE_PATH%
    echo.
    echo Kiểm tra:
    echo 1. Tắt antivirus tạm thời
    echo 2. Chạy CMD với quyền Administrator
    echo 3. Kiểm tra kết nối internet
)

echo.
pause
