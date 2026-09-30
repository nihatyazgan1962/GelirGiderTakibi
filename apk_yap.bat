@echo off
setlocal

cd /d "%~dp0"

echo APK build baslatiliyor...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_apk.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build basarisiz oldu. Hata kodu: %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Build tamamlandi.
pause