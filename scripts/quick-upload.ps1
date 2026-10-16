param(
    [string]$Version = "2.1.7"
)

$ErrorActionPreference = "Stop"

# Đọc token từ .env
$token = $null
if (Test-Path ".\.env") {
    $envContent = Get-Content ".\.env" -Raw
    if ($envContent -match 'GITHUB_TOKEN=([^\r\n]+)') {
        $token = $matches[1]
    } elseif ($envContent -match 'GH_TOKEN=([^\r\n]+)') {
        $token = $matches[1]
    }
}

if (!$token) {
    Write-Host "❌ Không tìm thấy GITHUB_TOKEN trong .env" -ForegroundColor Red
    exit 1
}

$owner = "Thanhdn1984"
$repo = "docxautomator"
$tag = "v$Version"
$exePath = ".\build-output\DocX Automation Tool Portable $Version.exe"

if (!(Test-Path $exePath)) {
    Write-Host "❌ Không tìm thấy file: $exePath" -ForegroundColor Red
    exit 1
}

$fileName = Split-Path $exePath -Leaf
$fileSize = [math]::Round((Get-Item $exePath).Length / 1MB, 2)

Write-Host "`n=== UPLOAD TO GITHUB ===" -ForegroundColor Yellow
Write-Host "📦 File: $fileName" -ForegroundColor Cyan
Write-Host "📊 Size: $fileSize MB" -ForegroundColor Cyan
Write-Host "🏷️  Tag: $tag`n" -ForegroundColor Cyan

$headers = @{
    "Authorization" = "Bearer $token"
    "Accept" = "application/vnd.github+json"
}

try {
    # Get release ID
    Write-Host "🔍 Lấy thông tin release..." -ForegroundColor Yellow
    $releaseUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$tag"
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get
    $releaseId = $release.id
    
    Write-Host "✅ Tìm thấy release ID: $releaseId" -ForegroundColor Green
    
    # Check if asset already exists
    $existingAsset = $release.assets | Where-Object { $_.name -eq $fileName }
    if ($existingAsset) {
        Write-Host "⚠️  File đã tồn tại, đang xóa..." -ForegroundColor Yellow
        $deleteUrl = "https://api.github.com/repos/$owner/$repo/releases/assets/$($existingAsset.id)"
        Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method Delete | Out-Null
        Write-Host "✅ Đã xóa file cũ" -ForegroundColor Green
    }
    
    # Upload new asset
    Write-Host "📤 Đang upload file..." -ForegroundColor Yellow
    $uploadUrl = "https://uploads.github.com/repos/$owner/$repo/releases/$releaseId/assets?name=$fileName"
    
    $uploadHeaders = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/octet-stream"
        "Accept" = "application/vnd.github+json"
    }
    
    $fileBytes = [System.IO.File]::ReadAllBytes($exePath)
    $response = Invoke-RestMethod -Uri $uploadUrl -Headers $uploadHeaders -Method Post -Body $fileBytes
    
    Write-Host "✅ Upload thành công!" -ForegroundColor Green
    Write-Host "🔗 Link: $($response.browser_download_url)" -ForegroundColor Cyan
    Write-Host "`n🎉 Hoàn thành! Mở release trong browser..." -ForegroundColor Green
    
    Start-Process "https://github.com/$owner/$repo/releases/tag/$tag"
    
} catch {
    Write-Host "❌ Lỗi: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode -ForegroundColor Red
    exit 1
}
