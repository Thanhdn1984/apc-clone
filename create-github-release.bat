@echo off
chcp 65001 >nul

:: Lấy version từ package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /r "\"version\"" package.json') do (
    set VERSION=%%~a
)

echo ========================================
echo   Tạo GitHub Release cho v%VERSION%
echo ========================================
echo.

:: Kiểm tra file exe
set EXE_FILE=build-output\DocX Automation Tool Portable %VERSION%.exe
if not exist "%EXE_FILE%" (
    echo [ERROR] File không tồn tại: %EXE_FILE%
    echo Vui lòng chạy build-and-release.bat trước!
    pause
    exit /b 1
)

echo [INFO] File exe: %EXE_FILE%
for %%F in ("%EXE_FILE%") do (
    set SIZE=%%~zF
    set /a SIZE_MB=!SIZE! / 1048576
)
echo [INFO] Kích thước: %SIZE_MB% MB
echo.

:: Mở GitHub releases với tag tương ứng
set GITHUB_URL=https://github.com/Thanhdn1984/docxautomator/releases/new?tag=v%VERSION%

echo Đang mở GitHub Releases trong trình duyệt...
start "" "%GITHUB_URL%"

echo.
echo ========================================
echo   HƯỚNG DẪN TẠO RELEASE
echo ========================================
echo.
echo 1. Trình duyệt đã mở GitHub Releases
echo 2. Điền thông tin:
echo    - Tag: v%VERSION% (đã chọn sẵn)
echo    - Title: DocX Automation Tool v%VERSION%
echo.
echo 3. Mô tả (Release notes):
echo.
echo    ## 🎉 What's New in v%VERSION%
echo.
echo    ### 🐛 Bug Fixes
echo    - [Liệt kê các bug đã fix]
echo.
echo    ### ✨ New Features
echo    - [Liệt kê tính năng mới]
echo.
echo    ### 🚀 Improvements
echo    - [Liệt kê cải tiến]
echo.
echo 4. Kéo thả file để upload:
echo    %EXE_FILE%
echo.
echo 5. Click "Publish release"
echo.
echo ========================================

:: Mở folder chứa file exe
echo.
set /p OPEN_FOLDER="Mở folder chứa file exe? (Y/N): "
if /i "%OPEN_FOLDER%"=="Y" (
    explorer /select,"%CD%\%EXE_FILE%"
)

echo.
echo Hoàn tất!
pause
