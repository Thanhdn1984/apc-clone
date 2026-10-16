# ========================================
# GitHub Release Upload Script
# Tự động tạo release và upload file exe
# ========================================

param(
    [string]$Version,
    [string]$ExeFile,
    [string]$ReleaseNotes = ""
)

# Đọc GitHub token từ .env
function Get-GitHubToken {
    if (!(Test-Path ".env")) {
        Write-Host "❌ Không tìm thấy file .env" -ForegroundColor Red
        return $null
    }
    
    $envContent = Get-Content ".env"
    foreach ($line in $envContent) {
        if ($line -match "^GITHUB_TOKEN=(.+)$") {
            return $matches[1].Trim('"').Trim("'")
        }
        if ($line -match "^GH_TOKEN=(.+)$") {
            return $matches[1].Trim('"').Trim("'")
        }
    }
    
    Write-Host "❌ Không tìm thấy GITHUB_TOKEN trong .env" -ForegroundColor Red
    return $null
}

# Main
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GitHub Release Upload" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Lấy token
$token = Get-GitHubToken
if (!$token) {
    Write-Host "Vui lòng thêm GITHUB_TOKEN vào file .env" -ForegroundColor Yellow
    Write-Host "Format: GITHUB_TOKEN=ghp_xxxxx`n" -ForegroundColor Yellow
    exit 1
}

# Thông tin repository
$owner = "Thanhdn1984"
$repo = "docxautomator"
$tag = "v$Version"

# Kiểm tra file exe
if (!(Test-Path $ExeFile)) {
    Write-Host "❌ File không tồn tại: $ExeFile" -ForegroundColor Red
    exit 1
}

$fileName = Split-Path $ExeFile -Leaf
$fileSize = [math]::Round((Get-Item $ExeFile).Length / 1MB, 2)

Write-Host "📦 File: $fileName" -ForegroundColor White
Write-Host "📊 Size: $fileSize MB" -ForegroundColor White
Write-Host "🏷️  Tag: $tag`n" -ForegroundColor White

# Release notes mặc định
if (!$ReleaseNotes) {
    $ReleaseNotes = @"
## 🎉 What's New in v$Version

### 🐛 Bug Fixes
* Fixed: Preserve leading zeros in text fields
* Fixed: Data loss when switching tabs
* Fixed: Build process improvements

### 🚀 Improvements
* Improved data stability
* Better state management
* Enhanced build scripts

### 📦 Installation
Download the portable executable below - **no installation required**!

### ✨ Full Changelog
[View changes](https://github.com/$owner/$repo/compare/v$Version...v$Version)
"@
}

# Headers cho API
$headers = @{
    "Authorization" = "token $token"
    "Accept" = "application/vnd.github.v3+json"
}

try {
    Write-Host "🔍 Kiểm tra release đã tồn tại..." -ForegroundColor Yellow
    
    # Kiểm tra release đã có chưa
    $releaseUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$tag"
    $existingRelease = $null
    
    try {
        $existingRelease = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "⚠️  Release $tag đã tồn tại (ID: $($existingRelease.id))" -ForegroundColor Yellow
        
        $overwrite = Read-Host "Xóa và tạo lại? (Y/N)"
        if ($overwrite -eq "Y" -or $overwrite -eq "y") {
            Write-Host "🗑️  Đang xóa release cũ..." -ForegroundColor Yellow
            $deleteUrl = "https://api.github.com/repos/$owner/$repo/releases/$($existingRelease.id)"
            Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete | Out-Null
            Write-Host "✅ Đã xóa release cũ`n" -ForegroundColor Green
            $existingRelease = $null
        } else {
            Write-Host "❌ Đã hủy" -ForegroundColor Red
            exit 0
        }
    } catch {
        # Release chưa tồn tại - OK
    }
    
    # Tạo release mới
    Write-Host "🚀 Đang tạo release $tag..." -ForegroundColor Yellow
    
    $createUrl = "https://api.github.com/repos/$owner/$repo/releases"
    $releaseData = @{
        tag_name = $tag
        name = "DocX Automation Tool v$Version"
        body = $ReleaseNotes
        draft = $false
        prerelease = $false
    } | ConvertTo-Json
    
    $release = Invoke-RestMethod -Uri $createUrl -Headers $headers -Method Post -Body $releaseData -ContentType "application/json"
    Write-Host "✅ Đã tạo release (ID: $($release.id))`n" -ForegroundColor Green
    
    # Upload file exe
    Write-Host "📤 Đang upload $fileName..." -ForegroundColor Yellow
    
    $uploadUrl = $release.upload_url -replace '\{\?name,label\}', "?name=$fileName"
    $fileBytes = [System.IO.File]::ReadAllBytes($ExeFile)
    
    $uploadHeaders = @{
        "Authorization" = "token $token"
        "Content-Type" = "application/octet-stream"
    }
    
    $asset = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $fileBytes
    Write-Host "✅ Đã upload file ($fileSize MB)`n" -ForegroundColor Green
    
    # TẠO latest.yml tự động
    Write-Host "📝 Đang tạo latest.yml..." -ForegroundColor Yellow
    
    # Tính SHA512
    $hash = Get-FileHash $ExeFile -Algorithm SHA512
    $hashBytes = [byte[]]::new($hash.Hash.Length / 2)
    for($i = 0; $i -lt $hash.Hash.Length; $i += 2) {
        $hashBytes[$i/2] = [Convert]::ToByte($hash.Hash.Substring($i, 2), 16)
    }
    $base64Hash = [Convert]::ToBase64String($hashBytes)
    
    # Tạo nội dung latest.yml
    $releaseDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $latestYmlContent = @"
version: $Version
files:
  - url: $fileName
    sha512: $base64Hash
    size: $($fileBytes.Length)
path: $fileName
sha512: $base64Hash
releaseDate: '$releaseDate'
"@
    
    # Lưu file
    $latestYmlPath = "build-output\latest.yml"
    if (!(Test-Path "build-output")) {
        New-Item -ItemType Directory -Path "build-output" -Force | Out-Null
    }
    [System.IO.File]::WriteAllText((Join-Path $PWD $latestYmlPath), $latestYmlContent)
    Write-Host "✅ Đã tạo latest.yml`n" -ForegroundColor Green
    
    # Upload latest.yml
    Write-Host "📤 Đang upload latest.yml..." -ForegroundColor Yellow
    $ymlFileName = "latest.yml"
    $ymlUploadUrl = $release.upload_url -replace '\{\?name,label\}', "?name=$ymlFileName"
    $ymlBytes = [System.IO.File]::ReadAllBytes((Join-Path $PWD $latestYmlPath))
    
    $ymlAsset = Invoke-RestMethod -Uri $ymlUploadUrl -Headers $uploadHeaders -Method Post -Body $ymlBytes
    Write-Host "✅ Đã upload latest.yml (cần cho auto-update)`n" -ForegroundColor Green
    
    # Thành công
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ RELEASE THÀNH CÔNG!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    Write-Host "🔗 Release URL:" -ForegroundColor Cyan
    Write-Host "   $($release.html_url)`n" -ForegroundColor White
    
    Write-Host "📥 Download URL:" -ForegroundColor Cyan
    Write-Host "   $($asset.browser_download_url)`n" -ForegroundColor White
    
    # Mở release trong browser
    $open = Read-Host "Mở release trong trình duyệt? (Y/N)"
    if ($open -eq "Y" -or $open -eq "y") {
        Start-Process $release.html_url
    }
    
} catch {
    Write-Host "`n❌ LỖI: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nChi tiết:" -ForegroundColor Yellow
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host $errorDetail.message -ForegroundColor Yellow
    }
    
    exit 1
}
