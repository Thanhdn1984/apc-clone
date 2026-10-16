@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       ONE-CLICK RELEASE - DocX Automation Tool               ║
echo ║       Tự động: Clean → Build → Upload GitHub + Auto-Update   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Load GITHUB_TOKEN từ .env
if exist ".env" (
    for /f "tokens=1,* delims==" %%a in (.env) do (
        if "%%a"=="GITHUB_TOKEN" set GITHUB_TOKEN=%%b
    )
)

if "%GITHUB_TOKEN%"=="" (
    echo [ERROR] Không tìm thấy GITHUB_TOKEN trong file .env
    echo Vui lòng tạo file .env với nội dung: GITHUB_TOKEN=your_token_here
    pause
    exit /b 1
)

echo [OK] GITHUB_TOKEN đã được load từ .env
echo.

:: Lấy version hiện tại từ package.json
for /f "tokens=2 delims=:, " %%a in ('findstr /r "\"version\"" package.json') do (
    set VERSION=%%~a
)
set VERSION=%VERSION:"=%

echo ═══════════════════════════════════════════════════════════════
echo [INFO] Đang build và release version: v%VERSION%
echo ═══════════════════════════════════════════════════════════════
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 1: DỌN DẸP
:: ═══════════════════════════════════════════════════════════════
echo [1/7] 🧹 Dọn dẹp build cũ...
if exist "build-output" rmdir /s /q build-output 2>nul
if exist "dist" rmdir /s /q dist 2>nul
if exist "release-builds" rmdir /s /q release-builds 2>nul
if exist "release_response.json" del /f /q release_response.json 2>nul
if exist "upload_response.json" del /f /q upload_response.json 2>nul
echo      ✓ Đã dọn dẹp
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 2: BUILD REACT
:: ═══════════════════════════════════════════════════════════════
echo [2/7] ⚛️  Build React application...
call npm run build >nul 2>&1
if errorlevel 1 (
    echo      ✗ Lỗi build React!
    goto :error
)
echo      ✓ React build hoàn tất
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 3: BUILD ELECTRON PORTABLE
:: ═══════════════════════════════════════════════════════════════
echo [3/7] 📦 Build Electron Portable...
call node_modules\.bin\electron-builder --win portable --config.directories.output=build-output >nul 2>&1
if errorlevel 1 (
    echo      ✗ Lỗi build Electron!
    goto :error
)

:: Kiểm tra file exe
set "EXE_FILE=build-output\DocX Automation Tool Portable %VERSION%.exe"
if not exist "%EXE_FILE%" (
    echo      ✗ File exe không tồn tại!
    goto :error
)

for %%F in ("%EXE_FILE%") do (
    set SIZE=%%~zF
    set /a SIZE_MB=!SIZE! / 1048576
)
echo      ✓ Electron build hoàn tất (!SIZE_MB! MB)
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 4: GIT COMMIT & PUSH
:: ═══════════════════════════════════════════════════════════════
echo [4/7] 📤 Commit và Push lên GitHub...
git add -A >nul 2>&1
git commit -m "Release v%VERSION%" >nul 2>&1
git push origin main >nul 2>&1
echo      ✓ Đã push code
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 5: TẠO VÀ PUSH TAG
:: ═══════════════════════════════════════════════════════════════
echo [5/7] 🏷️  Tạo và Push Git Tag v%VERSION%...

:: Xóa tag cũ nếu có
git tag -d v%VERSION% >nul 2>&1
git push origin :refs/tags/v%VERSION% >nul 2>&1

:: Tạo tag mới
git tag -a v%VERSION% -m "Release version %VERSION%" >nul 2>&1
git push origin v%VERSION% >nul 2>&1
if errorlevel 1 (
    echo      ✗ Lỗi push tag!
    goto :error
)
echo      ✓ Đã tạo tag v%VERSION%
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 6: TẠO GITHUB RELEASE VÀ UPLOAD FILE
:: ═══════════════════════════════════════════════════════════════
echo [6/7] 🚀 Tạo GitHub Release và Upload file exe...

:: Xóa release cũ nếu có
curl.exe -s -X DELETE -H "Authorization: token %GITHUB_TOKEN%" -H "Accept: application/vnd.github.v3+json" "https://api.github.com/repos/Thanhdn1984/docxautomator/releases/tags/v%VERSION%" >nul 2>&1

:: Tạo release mới
echo      Đang tạo release...
curl.exe -s -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Accept: application/vnd.github.v3+json" -d "{\"tag_name\":\"v%VERSION%\",\"name\":\"DocX Automation Tool v%VERSION%\",\"body\":\"## DocX Automation Tool v%VERSION%\\n\\n### Changelog\\n- Bug fixes and improvements\\n\\n### Download\\n- Tai file portable ben duoi\\n- Chay truc tiep, khong can cai dat\",\"draft\":false,\"prerelease\":false}" "https://api.github.com/repos/Thanhdn1984/docxautomator/releases" > release_response.json 2>nul

:: Lấy release ID từ response
for /f "tokens=2 delims=:," %%a in ('findstr /c:"\"id\":" release_response.json') do (
    set RELEASE_ID=%%a
    goto :got_id
)
:got_id
set RELEASE_ID=%RELEASE_ID: =%

if "%RELEASE_ID%"=="" (
    echo      ✗ Không thể tạo release!
    type release_response.json
    goto :error
)
echo      ✓ Release created (ID: %RELEASE_ID%)

:: Upload file exe
echo      Đang upload file exe (!SIZE_MB! MB)... Có thể mất vài phút...
set "UPLOAD_FILENAME=DocX_Automation_Tool_Portable_%VERSION%.exe"

curl.exe -# -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Content-Type: application/octet-stream" --data-binary "@%EXE_FILE%" "https://uploads.github.com/repos/Thanhdn1984/docxautomator/releases/%RELEASE_ID%/assets?name=%UPLOAD_FILENAME%" > upload_response.json 2>&1

:: Kiểm tra upload exe thành công
findstr /c:"\"state\":\"uploaded\"" upload_response.json >nul 2>&1
if errorlevel 1 (
    findstr /c:"\"id\":" upload_response.json >nul 2>&1
    if errorlevel 1 (
        echo      ✗ Upload exe thất bại!
        type upload_response.json
        goto :error
    )
)
echo      ✓ Upload exe thành công!
echo.

:: ═══════════════════════════════════════════════════════════════
:: BƯỚC 7: TẠO VÀ UPLOAD LATEST.YML (CHO AUTO-UPDATE)
:: ═══════════════════════════════════════════════════════════════
echo [7/7] 📋 Tạo và Upload latest.yml cho Auto-Update...

:: Tính SHA512 của file exe
echo      Đang tính SHA512...
for /f "tokens=*" %%h in ('powershell -Command "$hash = Get-FileHash -Path '%EXE_FILE%' -Algorithm SHA512; [Convert]::ToBase64String([byte[]]($hash.Hash -split '(..)' | Where-Object {$_} | ForEach-Object {[byte]::Parse($_, 'HexNumber')}))"') do set SHA512=%%h

:: Lấy size file
for %%F in ("%EXE_FILE%") do set FILE_SIZE=%%~zF

:: Lấy ngày giờ hiện tại
for /f "tokens=*" %%d in ('powershell -Command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ss.000Z'"') do set RELEASE_DATE=%%d

:: Tạo file latest.yml
echo version: %VERSION%> latest.yml
echo files:>> latest.yml
echo   - url: %UPLOAD_FILENAME%>> latest.yml
echo     sha512: %SHA512%>> latest.yml
echo     size: %FILE_SIZE%>> latest.yml
echo path: %UPLOAD_FILENAME%>> latest.yml
echo sha512: %SHA512%>> latest.yml
echo releaseDate: '%RELEASE_DATE%'>> latest.yml

echo      ✓ Đã tạo latest.yml

:: Upload latest.yml
echo      Đang upload latest.yml...
curl.exe -s -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Content-Type: application/octet-stream" --data-binary "@latest.yml" "https://uploads.github.com/repos/Thanhdn1984/docxautomator/releases/%RELEASE_ID%/assets?name=latest.yml" > upload_yml_response.json 2>&1

findstr /c:"\"state\":\"uploaded\"" upload_yml_response.json >nul 2>&1
if errorlevel 1 (
    findstr /c:"\"id\":" upload_yml_response.json >nul 2>&1
    if errorlevel 1 (
        echo      ⚠ Upload latest.yml thất bại (có thể đã tồn tại)
    ) else (
        echo      ✓ Upload latest.yml thành công!
    )
) else (
    echo      ✓ Upload latest.yml thành công!
)

:: Dọn dẹp file tạm
del /f /q release_response.json upload_response.json upload_yml_response.json 2>nul
echo.

:: ═══════════════════════════════════════════════════════════════
:: HOÀN TẤT
:: ═══════════════════════════════════════════════════════════════
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ✅ HOÀN TẤT!                              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  📦 Version: v%VERSION%
echo ║  📁 File: %UPLOAD_FILENAME%
echo ║  📋 Auto-Update: latest.yml đã được upload
echo ║  🌐 GitHub: github.com/Thanhdn1984/docxautomator/releases
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Mở GitHub releases trong browser
start "" "https://github.com/Thanhdn1984/docxautomator/releases/tag/v%VERSION%"

echo Đã mở GitHub Releases trong trình duyệt!
echo.
timeout /t 5
exit /b 0

:error
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ❌ LỖI!                                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Có lỗi xảy ra trong quá trình build/release.
echo Vui lòng kiểm tra lại.
echo.
del /f /q release_response.json upload_response.json upload_yml_response.json 2>nul
pause
exit /b 1
