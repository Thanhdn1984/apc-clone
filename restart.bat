@echo off
echo Đang dừng tất cả process Electron/Node...
taskkill /f /im electron.exe 2>nul
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak
echo Đang khởi động lại app...
cd /d D:\docxautomator
npm start
