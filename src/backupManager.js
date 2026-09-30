import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  exportAllData,
  importAllData,
  getTransactions,
  getAccounts,
  getCategories,
  getCurrency
} from './database';

const AUTO_BACKUPS_KEY = '@hesabim_auto_snapshots_v1';
const LAST_CLOUD_BACKUP_KEY = '@hesabim_last_cloud_backup_v1';
const MAX_SNAPSHOTS = 10;

// ── 1. OTOMATİK LOKAL SNAPSHOT YEDEKLEME ────────────────────────────────────
export async function triggerAutoBackup() {
  try {
    const dataStr = await exportAllData();
    if (!dataStr) return false;

    const dataObj = JSON.parse(dataStr);
    const txCount = (dataObj.transactions || []).length;
    const accCount = (dataObj.accounts || []).length;
    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;

    const newSnapshot = {
      id: `snap_${Date.now()}`,
      timestamp: now.getTime(),
      dateStr: dateFormatted,
      txCount,
      accCount,
      data: dataObj,
    };

    // Mevcut snapshot listesini al
    const existingStr = await AsyncStorage.getItem(AUTO_BACKUPS_KEY);
    let list = existingStr ? JSON.parse(existingStr) : [];
    
    // Aynı veriyi arka arkaya mükerrer kaydetmemek için kontrol
    if (list.length > 0) {
      const last = list[0];
      if (last.txCount === txCount && JSON.stringify(last.data) === JSON.stringify(dataObj)) {
        return true; // Değişiklik yok, yeni snapshot gerekmez
      }
    }

    list = [newSnapshot, ...list].slice(0, MAX_SNAPSHOTS);
    await AsyncStorage.setItem(AUTO_BACKUPS_KEY, JSON.stringify(list));

    // Fiziksel dosya olarak da kaydet
    const autoFileUri = `${FileSystem.documentDirectory}Hesabim_Otomatik_Yedek.json`;
    await FileSystem.writeAsStringAsync(autoFileUri, dataStr, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return true;
  } catch (e) {
    console.error('Auto backup error:', e);
    return false;
  }
}

export async function getAutoBackups() {
  try {
    const existingStr = await AsyncStorage.getItem(AUTO_BACKUPS_KEY);
    if (!existingStr) return [];
    return JSON.parse(existingStr);
  } catch (e) {
    return [];
  }
}

export async function restoreAutoBackup(snapshotId) {
  try {
    const list = await getAutoBackups();
    const target = list.find(s => s.id === snapshotId);
    if (!target || !target.data) return false;
    return await importAllData(JSON.stringify(target.data));
  } catch (e) {
    console.error('Restore snapshot error:', e);
    return false;
  }
}

// ── 2. GOOGLE DRIVE & DOSYA YEDEKLEME (PAYLAŞIM / BULUT) ─────────────────────
export async function exportToGoogleDriveOrFile() {
  try {
    const dataStr = await exportAllData();
    if (!dataStr) return { success: false, message: 'Veriler hazırlanamadı.' };

    const now = new Date();
    const dateTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `Hesabim_GoogleDrive_Yedek_${dateTag}.json`;
    const targetDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const fileUri = `${targetDir}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, dataStr, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Hesabım Veritabanını Google Drive veya Dosyalara Kaydet',
        UTI: 'public.json',
      });

      const dateStr = `${now.toLocaleDateString('tr-TR')} ${now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
      await AsyncStorage.setItem(LAST_CLOUD_BACKUP_KEY, dateStr);

      return { success: true, fileUri, fileName };
    } else {
      return { success: false, message: 'Cihaz paylaşım servisi desteklemiyor.' };
    }
  } catch (e) {
    console.error('Export error:', e);
    return { success: false, message: e.message };
  }
}

export async function importFromGoogleDriveOrFile() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, canceled: true };
    }

    const file = result.assets[0];
    const fileContent = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const ok = await importAllData(fileContent);
    if (ok) {
      // Yükleme başarılı, hemen yeni bir otomatik snapshot al
      await triggerAutoBackup();
      return { success: true, fileName: file.name };
    } else {
      return { success: false, message: 'Seçilen dosya geçerli bir Hesabım yedek formatı değil.' };
    }
  } catch (e) {
    console.error('Import error:', e);
    return { success: false, message: 'Dosya okunurken bir hata oluştu: ' + e.message };
  }
}

// ── 3. BULUT YEDEKLEME BİLGİLERİ ────────────────────────────────────────────
export async function getLastCloudBackupDate() {
  try {
    return await AsyncStorage.getItem(LAST_CLOUD_BACKUP_KEY);
  } catch (e) {
    return null;
  }
}
