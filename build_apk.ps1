$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:ANDROID_HOME = 'C:\Users\Nihat\Android\Sdk'
$env:NODE_ENV = 'production'
$env:GRADLE_OPTS = "-Xmx4096m -XX:MaxMetaspaceSize=1024m"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Set-Location 'C:\Users\Nihat\Documents\Gemini\GelirGiderTakibi\android'

Write-Host "APK build basliyor..."
.\gradlew.bat assembleRelease --no-daemon -x lint 2>&1

Write-Host "Build bitti. Exit code: $LASTEXITCODE"

if ($LASTEXITCODE -eq 0) {
    $apk = Get-ChildItem -Path '..\android\app\build\outputs\apk\release\' -Filter '*.apk' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($apk) {
        Copy-Item $apk.FullName -Destination 'C:\Users\Nihat\Documents\Gemini\GelirGiderTakibi\GelirGiderTakibi.apk' -Force
        Write-Host "APK kopyalandi: C:\Users\Nihat\Documents\Gemini\GelirGiderTakibi\GelirGiderTakibi.apk"
    }
}
