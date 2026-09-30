$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:ANDROID_HOME = 'C:\Users\Nihat\Android\Sdk'
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:PATH"

$sdkmanager = 'C:\Users\Nihat\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat'

Write-Host "NDK yukleniyor..."
& $sdkmanager --sdk_root='C:\Users\Nihat\Android\Sdk' 'ndk;27.1.12297006'

Write-Host "NDK yukleme tamamlandi. Exit: $LASTEXITCODE"
