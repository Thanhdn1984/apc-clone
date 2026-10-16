#!/usr/bin/env powershell

<#
.SYNOPSIS
    Build Process An Toàn - Safe Release Build Script
    
.DESCRIPTION
    Đảm bảo build sạch sẽ, không bị vướng phiên bản cũ
    
.EXAMPLE
    .\scripts\safe-build.ps1 -Version "2.1.4"
#>

param(
    [string]$Version
)

function Write-Status {
    param([string]$Message, [string]$Type = "info")
    $colors = @{
        "info"    = "Cyan"
        "success" = "Green"
        "warning" = "Yellow"
        "error"   = "Red"
    }
    Write-Host "[$Type] $Message" -ForegroundColor $colors[$Type]
}

try {
    # Step 1: Kiểm tra prerequisites
    Write-Status "Kiểm tra prerequisites..." "info"
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw "npm không được tìm thấy!"
    }
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        throw "git không được tìm thấy!"
    }
    Write-Status "✅ Prerequisites OK" "success"

    # Step 2: Cập nhật version (nếu được chỉ định)
    if ($Version) {
        Write-Status "Cập nhật version thành $Version..." "info"
        
        # Đọc package.json
        $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
        $oldVersion = $packageJson.version
        $packageJson.version = $Version
        
        # Ghi lại
        $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8
        Write-Status "✅ Version cập nhật: $oldVersion → $Version" "success"
        
        # Commit git
        Write-Status "Commit version change..." "info"
        git add package.json
        git commit -m "chore: bump version to $Version"
        git tag "v$Version"
        Write-Status "✅ Git tag created: v$Version" "success"
    }

    # Step 3: Xóa cache cũ
    Write-Status "Xóa cache build cũ..." "info"
    npm run clean
    Write-Status "✅ Cache đã xóa" "success"

    # Step 4: Cài dependencies
    Write-Status "Cài npm dependencies..." "info"
    npm ci  # Use ci thay vì install để reproducible builds
    Write-Status "✅ Dependencies đã cài" "success"

    # Step 5: Build React
    Write-Status "Build React application..." "info"
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Vite build thất bại!"
    }
    Write-Status "✅ React build thành công" "success"

    # Step 6: Check dist folder
    Write-Status "Kiểm tra dist folder..." "info"
    $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Sum -Property Length).Sum / 1MB
    Write-Status "Dist size: $([math]::Round($distSize, 2))MB" "info"

    # Step 7: Build Electron
    Write-Status "Build & Publish Electron..." "info"
    electron-builder --publish always
    if ($LASTEXITCODE -ne 0) {
        throw "Electron builder thất bại!"
    }
    Write-Status "✅ Electron build & publish thành công" "success"

    # Step 8: Kiểm tra release-builds
    Write-Status "Kiểm tra release-builds..." "info"
    $releaseSize = (Get-ChildItem -Path "release-builds" -Recurse | Measure-Object -Sum -Property Length).Sum / 1GB
    $releaseCount = (Get-ChildItem -Path "release-builds" -Filter "*.exe" | Measure-Object).Count
    Write-Status "Release builds: $releaseCount files, $([math]::Round($releaseSize, 2))GB" "success"

    # Step 9: Git push
    if ($Version) {
        Write-Status "Push changes lên GitHub..." "info"
        git push origin main
        git push origin "v$Version"
        Write-Status "✅ Push thành công" "success"
    }

    Write-Status "🎉 Build process hoàn tất thành công!" "success"
    Write-Status "Phiên bản $Version đã được phát hành!" "success"

} catch {
    Write-Status "❌ LỖI: $_" "error"
    exit 1
}
