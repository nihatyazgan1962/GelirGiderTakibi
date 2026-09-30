$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Yellow
Write-Host "   GELIR GIDER APK OLUSTURUCU BASLADI   " -ForegroundColor Yellow
Write-Host "=========================================" -ForegroundColor Yellow

$rootDir = $PSScriptRoot
$androidDir = Join-Path $rootDir "android"
$wwwDir = Join-Path $rootDir "www"

# 1. Web dosyalarını www klasörüne kopyala
Write-Host "
[1/4] Web dosyalari guncelleniyor (www klasorune kopyalaniyor)..." -ForegroundColor Cyan
if (-not (Test-Path $wwwDir)) {
    New-Item -ItemType Directory -Path $wwwDir -Force | Out-Null
}

$filesToCopy = @("index.html", "app.js", "style.css", "favicon.png")
foreach ($file in $filesToCopy) {
    $src = Join-Path $rootDir $file
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $wwwDir $file) -Force
    }
}

# 2. Android SDK ve Ortam Değişkenlerini Ayarla
Write-Host "[2/4] Ortam degiskenleri ve Android SDK kontrol ediliyor..." -ForegroundColor Cyan

$androidSdkPath = "C:\Users\Nihat\AppData\Local\Android\Sdk"
if (-not (Test-Path $androidSdkPath)) {
    if (Test-Path "C:\Users\Nihat\Android\Sdk") {
        $androidSdkPath = "C:\Users\Nihat\Android\Sdk"
    }
}

$env:ANDROID_HOME = $androidSdkPath
$env:ANDROID_SDK_ROOT = $androidSdkPath
$env:PATH = "$androidSdkPath\platform-tools;$androidSdkPath\tools;$env:PATH"

# local.properties güncelle
$localProperties = Join-Path $androidDir "local.properties"
$sdkDirEscaped = $androidSdkPath -replace '\\', '\\'
"sdk.dir=$sdkDirEscaped" | Out-File -FilePath $localProperties -Encoding ASCII -Force

# 3. Capacitor Senkronizasyonu
Write-Host "[3/4] Capacitor Android projesi senkronize ediliyor..." -ForegroundColor Cyan
Set-Location $rootDir
npx cap sync android

# 4. APK Derleme
Write-Host "[4/4] APK derlemesi basliyor (assembleDebug)..." -ForegroundColor Cyan
Set-Location $androidDir
.\gradlew.bat assembleDebug --no-daemon -x lint

if ($LASTEXITCODE -eq 0) {
    $apk = Get-ChildItem -Path "$androidDir\app\build\outputs\apk\debug\" -Filter '*.apk' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($apk) {
        $targetApk = Join-Path $rootDir "GelirGiderTakibi.apk"
        Copy-Item -Path $apk.FullName -Destination $targetApk -Force
        $sizeMB = [math]::Round((Get-Item $targetApk).Length / 1MB, 2)
        
        Write-Host "
========================================================" -ForegroundColor Green
        Write-Host "  TEBRIKLER! APK BASARIYLA OLUSTURULDU: GelirGiderTakibi.apk   " -ForegroundColor Green
        Write-Host "  Konum: $targetApk ($sizeMB MB)                        " -ForegroundColor Green
        Write-Host "========================================================
" -ForegroundColor Green
    } else {
        Write-Host "
HATA: APK dosyasi ciktisi bulunamadi." -ForegroundColor Red
    }
} else {
    Write-Host "
HATA: Gradle derlemesi basarisiz oldu. Exit code: $LASTEXITCODE" -ForegroundColor Red
}

Set-Location $rootDir
Write-Host "Cikmak icin ENTER tusuna basin..." -ForegroundColor Yellow
Read-Host