# 💰 Gelir Gider Takibi — Kişisel Bütçe Yönetimi

Gelir ve giderlerinizi kolayca takip etmenizi sağlayan, PDF/Excel raporu çıkarabilen bir Android uygulamasıdır.

## ✨ Özellikler

- ➕ Gelir ve gider kaydı ekleme
- 📊 Aylık/yıllık özet grafikler
- 📄 PDF raporu dışa aktarma (expo-print)
- 📁 Dosya paylaşımı (expo-sharing)
- 💾 Yerel depolama (AsyncStorage)
- 📱 Android APK

## 🛠️ Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| Framework | React Native (Expo) |
| Depolama | @react-native-async-storage |
| PDF | expo-print |
| Dosya | expo-file-system, expo-document-picker |
| Paylaşım | expo-sharing |
| Platform | Android (Expo build) |

## 📋 Gereksinimler

- Node.js 18+
- Expo CLI
- Android Studio (native build için)
- Java 17+

## 🚀 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Expo Go ile geliştirme ortamında çalıştır
npx expo start

# Android APK derle
npx expo run:android
```

### APK Derleme
```powershell
.\apk_yap.ps1
# veya
.\apk_yap.bat
```

## 📁 Proje Yapısı

```
├── src/              # React Native bileşenleri
├── assets/           # Görseller ve fontlar
├── android/          # Native Android proje
├── package.json
└── app.json          # Expo konfigürasyonu
```

## 👨‍💻 Geliştirici

**Yazgan Bilişim**  
E-posta: yazganbilisim2026@gmail.com
GitHub: [@nihatyazgan1962](https://github.com/nihatyazgan1962)
