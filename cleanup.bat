@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ═══════════════════════════════════════════════════════════════
echo   DỌN DẸP DỰ ÁN - Xóa file rác và thư mục không cần thiết
echo ═══════════════════════════════════════════════════════════════
echo.

:: Xóa các file rác có tên lạ
echo [1] Xóa file rác...
del /f /q "#" 2>nul
del /f /q "({" 2>nul
del /f /q "{" 2>nul
del /f /q "git" 2>nul
del /f /q "opStart" 2>nul
del /f /q "r.isLinkedField)" 2>nul
del /f /q "setIsResetModalOpen(true)" 2>nul
del /f /q "rmdir" 2>nul
del /f /q "witch main" 2>nul
del /f /q "`{${r.key}}`))" 2>nul
echo     ✓ Đã xóa file rác

:: Xóa các file tạm và không cần thiết
echo [2] Xóa file tạm...
del /f /q temp_*.js 2>nul
del /f /q *.json.tmp 2>nul
del /f /q release_response.json 2>nul
del /f /q upload_*.json 2>nul
del /f /q queryClient.ts 2>nul
echo     ✓ Đã xóa file tạm

:: Xóa thư mục build
echo [3] Xóa thư mục build cũ...
if exist "dist" rmdir /s /q dist 2>nul
if exist "release-builds" rmdir /s /q release-builds 2>nul
if exist "build-output" rmdir /s /q build-output 2>nul
echo     ✓ Đã xóa thư mục build

:: Xóa cache
echo [4] Xóa cache...
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite" 2>nul
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache" 2>nul
echo     ✓ Đã xóa cache

echo.
echo ═══════════════════════════════════════════════════════════════
echo   ✅ DỌN DẸP HOÀN TẤT
echo ═══════════════════════════════════════════════════════════════
pause
