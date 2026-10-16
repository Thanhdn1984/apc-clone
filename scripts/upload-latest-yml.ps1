# Upload latest.yml to GitHub Release
param(
    [string]$Version = "2.2.0"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Upload latest.yml to GitHub" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Get GitHub token
$token = (Get-Content ".env" -ErrorAction SilentlyContinue | Where-Object { $_ -match 'GITHUB_TOKEN' }) -replace '.*=\s*', '' -replace '["\']', ''

if (!$token) {
    Write-Host "Error: No GITHUB_TOKEN found in .env" -ForegroundColor Red
    exit 1
}

$owner = "Thanhdn1984"
$repo = "docxautomator"
$tag = "v$Version"
$latestFile = "D:\docxautomator\build-output\latest.yml"

if (!(Test-Path $latestFile)) {
    Write-Host "Error: File not found: $latestFile" -ForegroundColor Red
    exit 1
}

Write-Host "File: latest.yml" -ForegroundColor White
Write-Host "Size: $([math]::Round((Get-Item $latestFile).Length / 1KB, 2)) KB" -ForegroundColor White
Write-Host "Tag: $tag`n" -ForegroundColor White

# Get release
$releaseUrl = "https://api.github.com/repos/$owner/$repo/releases/tags/$tag"
$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github.v3+json"
}

try {
    Write-Host "Getting release info..." -ForegroundColor Yellow
    $release = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get
    Write-Host "Release ID: $($release.id)" -ForegroundColor Green
    
    # Upload latest.yml
    $uploadUrl = $release.upload_url -replace '\{\?.*\}', ''
    $uploadUri = "$uploadUrl?name=latest.yml"
    
    Write-Host "Uploading latest.yml..." -ForegroundColor Cyan
    $fileBytes = [System.IO.File]::ReadAllBytes($latestFile)
    $uploadHeaders = @{
        Authorization = "token $token"
        "Content-Type" = "application/x-yaml"
    }
    
    $asset = Invoke-RestMethod -Uri $uploadUri -Headers $uploadHeaders -Method Post -Body $fileBytes
    
    Write-Host "`nSuccess! Uploaded to:" -ForegroundColor Green
    Write-Host $asset.browser_download_url -ForegroundColor White
    
} catch {
    Write-Host "`nError: $_" -ForegroundColor Red
    exit 1
}
