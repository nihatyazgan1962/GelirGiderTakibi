@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "ANDROID_HOME=C:\Users\Nihat\Android\Sdk"
set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
set "APK=%~dp0GelirGiderTakibi.apk"
set "BUILD_SCRIPT=%~dp0build_apk.ps1"
set "PACKAGE=com.nihat.gelirgidertakibi"

echo Android SDK kontrol ediliyor...

if not exist "%ADB%" (
    echo HATA: adb.exe bulunamadi:
    echo %ADB%
    pause
    exit /b 1
)

echo Emulator bekleniyor...
"%ADB%" wait-for-device

echo Emulator baslangici kontrol ediliyor...

:WAIT_BOOT
set "BOOT_STATUS="
for /f "tokens=*" %%A in ('"%ADB%" shell getprop sys.boot_completed 2^>nul') do set "BOOT_STATUS=%%A"

if not "%BOOT_STATUS%"=="1" (
    timeout /t 3 /nobreak >nul
    goto WAIT_BOOT
)

echo Emulator hazir.

if not exist "%APK%" (
    echo APK bulunamadi. Build baslatiliyor...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%BUILD_SCRIPT%"

    if errorlevel 1 (
        echo HATA: APK build basarisiz oldu.
        pause
        exit /b 1
    )
)

if not exist "%APK%" (
    echo HATA: Build tamamlandi ancak APK bulunamadi:
    echo %APK%
    pause
    exit /b 1
)

echo APK emulatore yukleniyor...
"%ADB%" install -r "%APK%"

if errorlevel 1 (
    echo HATA: APK yuklenemedi.
    pause
    exit /b 1
)

echo Uygulama baslatiliyor...
"%ADB%" shell monkey -p "%PACKAGE%" 1

if errorlevel 1 (
    echo HATA: Uygulama baslatilamadi.
    pause
    exit /b 1
)

echo.
echo Uygulama emulatorde basariyla acildi.
pause