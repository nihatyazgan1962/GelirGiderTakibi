import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, StatusBar, ScrollView,
  TouchableOpacity, Modal, TextInput, Alert, Platform,
  KeyboardAvoidingView, Dimensions, Linking, Share
} from 'react-native';

import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  clearAllTransactions, getAccounts, getActiveAccountId, setActiveAccountId,
  addAccount, deleteAccount, getCurrency, setCurrency, CURRENCIES,
  getCategories, addCategory, deleteCategory,
  getPinCode, setPinCode, isPinEnabled, setPinEnabled,
  getRecurringTransactions, addRecurringTransaction, deleteRecurringTransaction,
  getCategoryBudgets, setCategoryBudget, deleteCategoryBudget,
  exportAllData, importAllData
} from './src/database';

import {
  triggerAutoBackup, getAutoBackups, restoreAutoBackup,
  exportToGoogleDriveOrFile, importFromGoogleDriveOrFile,
  getLastCloudBackupDate
} from './src/backupManager';

import {
  generateReportHtml, generateExcelXml, exportReportToPdf,
  exportReportToExcel, sharePdfFile, shareExcelFile, formatReportDate
} from './src/reportGenerator';

const GREEN = '#0F4C3A';
const GREEN_DARK = '#0A3327';
const GREEN_ACCENT = '#00897B';
const GREEN_LIGHT = '#E0F2F1';
const RED = '#D32F2F';
const { width: W } = Dimensions.get('window');

const MONTHS_TR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const MONTHS_FULL = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

const CATEGORY_MAP = {
  'Maaş': { icon: '💼', bg: '#E8F5E9', color: '#2E7D32' },
  'Ek Gelir': { icon: '💰', bg: '#E0F2F1', color: '#00796B' },
  'Kira Geliri': { icon: '🏢', bg: '#E0F7FA', color: '#00838F' },
  'Prim & İkramiye': { icon: '🎁', bg: '#FFF8E1', color: '#F57F17' },
  'Yatırım': { icon: '📈', bg: '#E1F5FE', color: '#0288D1' },
  'Harçlık': { icon: '🪙', bg: '#FFFDE7', color: '#FBC02D' },
  'Ödemeler': { icon: '💳', bg: '#EDE7F6', color: '#512DA8' },
  'Market': { icon: '🛒', bg: '#FFF3E0', color: '#E65100' },
  'Kira': { icon: '🏠', bg: '#FFEBEE', color: '#C62828' },
  'Fatura': { icon: '💡', bg: '#F3E5F5', color: '#7B1FA2' },
  'Ulaşım': { icon: '🚗', bg: '#E8EAF6', color: '#303F9F' },
  'Yemek': { icon: '🍽️', bg: '#FBE9E7', color: '#D84315' },
  'Sağlık': { icon: '🏥', bg: '#FFEBEE', color: '#D32F2F' },
  'Eğlence': { icon: '🎬', bg: '#FCE4EC', color: '#C2185B' },
  'Giyim': { icon: '👕', bg: '#EDE7F6', color: '#512DA8' },
  'Eğitim': { icon: '🎓', bg: '#E1F5FE', color: '#0288D1' },
  'Transfer': { icon: '💸', bg: '#E0F7FA', color: '#00838F' },
  'Diğer': { icon: '📌', bg: '#ECEFF1', color: '#455A64' },
};

function getCategoryMeta(title, type) {
  if (CATEGORY_MAP[title]) return CATEGORY_MAP[title];
  const t = (title || '').toLowerCase();
  if (type === 'gelir') {
    if (t.includes('maaş')) return { icon: '💼', bg: '#E8F5E9', color: '#2E7D32' };
    if (t.includes('kira')) return { icon: '🏢', bg: '#E0F2F1', color: '#00796B' };
    if (t.includes('prim') || t.includes('ikramiye')) return { icon: '🎁', bg: '#FFF8E1', color: '#F57F17' };
    if (t.includes('yatırım')) return { icon: '📈', bg: '#E1F5FE', color: '#0288D1' };
    return { icon: '💰', bg: '#E8F5E9', color: '#2E7D32' };
  } else {
    if (t.includes('market') || t.includes('alışveriş')) return { icon: '🛒', bg: '#FFF3E0', color: '#E65100' };
    if (t.includes('kira')) return { icon: '🏠', bg: '#FFEBEE', color: '#C62828' };
    if (t.includes('fatura') || t.includes('elektrik') || t.includes('su') || t.includes('doğalgaz')) return { icon: '💡', bg: '#F3E5F5', color: '#7B1FA2' };
    if (t.includes('ulaşım') || t.includes('benzin') || t.includes('yakıt')) return { icon: '🚗', bg: '#E8EAF6', color: '#303F9F' };
    if (t.includes('yemek') || t.includes('restoran') || t.includes('cafe')) return { icon: '🍽️', bg: '#FBE9E7', color: '#D84315' };
    if (t.includes('sağlık') || t.includes('eczane') || t.includes('hastane')) return { icon: '🏥', bg: '#FFEBEE', color: '#D32F2F' };
    if (t.includes('eğlence') || t.includes('sinema')) return { icon: '🎬', bg: '#FCE4EC', color: '#C2185B' };
    if (t.includes('giyim')) return { icon: '👕', bg: '#EDE7F6', color: '#512DA8' };
    if (t.includes('transfer') || t.includes('virman')) return { icon: '💸', bg: '#E0F7FA', color: '#00838F' };
    return { icon: '📌', bg: '#ECEFF1', color: '#455A64' };
  }
}

function isToday(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

function formatDate(dateStr) {
  if (!dateStr) return 'Bugün';
  if (isToday(dateStr)) return 'Bugün';
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Bar Chart Bileşeni ────────────────────────────────────────────────────────
function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const barH = 120;
  return (
    <View style={bcs.wrap}>
      <View style={bcs.chartArea}>
        {data.map((d, i) => (
          <View key={i} style={bcs.col}>
            <View style={bcs.barPair}>
              <View style={[bcs.bar, { height: Math.max(3, (d.income / maxVal) * barH), backgroundColor: '#4CAF50' }]} />
              <View style={[bcs.bar, { height: Math.max(3, (d.expense / maxVal) * barH), backgroundColor: '#E57373' }]} />
            </View>
            <Text style={bcs.label}>{d.label}</Text>
          </View>
        ))}
      </View>
      <View style={bcs.legend}>
        <View style={bcs.legendItem}><View style={[bcs.dot, { backgroundColor: '#4CAF50' }]} /><Text style={bcs.legendTxt}>Gelir</Text></View>
        <View style={bcs.legendItem}><View style={[bcs.dot, { backgroundColor: '#E57373' }]} /><Text style={bcs.legendTxt}>Gider</Text></View>
      </View>
    </View>
  );
}
const bcs = StyleSheet.create({
  wrap: { paddingTop: 8 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  col: { alignItems: 'center', flex: 1 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 10, borderRadius: 4 },
  label: { fontSize: 10, color: '#888', marginTop: 6 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 13, color: '#555', fontWeight: '600' },
});

// ── Tarih Seçici (alt sheet) ──────────────────────────────────────────────────
function DatePickerSheet({ visible, value, onClose, onSelect }) {
  const dt = value ? new Date(value) : new Date();
  const [day, setDay] = useState(dt.getDate());
  const [month, setMonth] = useState(dt.getMonth());
  const [year, setYear] = useState(dt.getFullYear());

  useEffect(() => {
    if (visible && value) {
      const d = new Date(value);
      setDay(d.getDate());
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    }
  }, [visible, value]);

  const apply = () => {
    const d = String(day).padStart(2,'0');
    const m = String(month+1).padStart(2,'0');
    onSelect(`${year}-${m}-${d}`);
    onClose();
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={dps.overlay} activeOpacity={1} onPress={onClose} />
      <View style={dps.sheet}>
        <View style={dps.header}>
          <Text style={dps.title}>Tarih Seç</Text>
          <TouchableOpacity onPress={onClose}><Text style={dps.close}>✕</Text></TouchableOpacity>
        </View>
        <Text style={dps.sectionLabel}>Gün</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dps.chipRow}>
          {Array.from({length:31},(_,i)=>i+1).map(d=>(
            <TouchableOpacity key={d} style={[dps.chip, day===d && dps.chipActive]} onPress={()=>setDay(d)}>
              <Text style={[dps.chipTxt, day===d && dps.chipActiveTxt]}>{d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={dps.sectionLabel}>Ay</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dps.chipRow}>
          {MONTHS_TR.map((m,i)=>(
            <TouchableOpacity key={i} style={[dps.chip, month===i && dps.chipActive]} onPress={()=>setMonth(i)}>
              <Text style={[dps.chipTxt, month===i && dps.chipActiveTxt]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={dps.sectionLabel}>Yıl</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={dps.chipRow}>
          {years.map(y=>(
            <TouchableOpacity key={y} style={[dps.chip, year===y && dps.chipActive]} onPress={()=>setYear(y)}>
              <Text style={[dps.chipTxt, year===y && dps.chipActiveTxt]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={dps.applyBtn} onPress={apply}>
          <Text style={dps.applyBtnTxt}>Tamam</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
const dps = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { backgroundColor: '#FFF', padding: 20, paddingBottom: Platform.OS==='android' ? 36 : 32 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight:'700', color:'#222' },
  close: { fontSize: 20, color:'#888', padding: 4 },
  sectionLabel: { fontSize: 12, color:'#888', marginTop: 12, marginBottom: 6, fontWeight:'600' },
  chipRow: { flexDirection:'row', gap: 6, paddingBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor:'#F0F0F0' },
  chipActive: { backgroundColor: GREEN },
  chipTxt: { fontSize: 14, color:'#555', fontWeight:'600' },
  chipActiveTxt: { color:'#FFF', fontWeight:'700' },
  applyBtn: { marginTop: 16, backgroundColor: GREEN, borderRadius: 8, paddingVertical: 14, alignItems:'center' },
  applyBtnTxt: { color:'#FFF', fontWeight:'700', fontSize: 15 },
});

// ── Dönem Seçici (Ay / Yıl Gezintisi) ──────────────────────────────────────────
function PeriodModal({ visible, currentYear, currentMonth, onClose, onSelect }) {
  const currentActualYear = new Date().getFullYear();
  const currentActualMonth = new Date().getMonth();
  const prevMonthIndex = currentActualMonth === 0 ? 11 : currentActualMonth - 1;
  const prevMonthYear = currentActualMonth === 0 ? currentActualYear - 1 : currentActualYear;
  const years = Array.from({ length: 6 }, (_, i) => currentActualYear - i);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose}>
        <View style={pm.box}>
          <View style={pm.header}>
            <Text style={pm.title}>📅 Dönem Seçimi</Text>
            <TouchableOpacity onPress={onClose}><Text style={pm.close}>✕</Text></TouchableOpacity>
          </View>

          {/* Hızlı Dönem Butonları */}
          <Text style={pm.subLabel}>HIZLI DÖNEMLER</Text>
          <View style={pm.quickRow}>
            <TouchableOpacity
              style={[pm.quickBtn, currentYear === currentActualYear && currentMonth === currentActualMonth && pm.quickBtnActive]}
              onPress={() => { onSelect(currentActualYear, currentActualMonth); onClose(); }}>
              <Text style={[pm.quickBtnTxt, currentYear === currentActualYear && currentMonth === currentActualMonth && pm.quickBtnActiveTxt]}>⚡ Bu Ay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[pm.quickBtn, currentYear === prevMonthYear && currentMonth === prevMonthIndex && pm.quickBtnActive]}
              onPress={() => { onSelect(prevMonthYear, prevMonthIndex); onClose(); }}>
              <Text style={[pm.quickBtnTxt, currentYear === prevMonthYear && currentMonth === prevMonthIndex && pm.quickBtnActiveTxt]}>⏮️ Geçen Ay</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[pm.quickBtn, currentYear === currentActualYear && currentMonth === -1 && pm.quickBtnActive]}
              onPress={() => { onSelect(currentActualYear, -1); onClose(); }}>
              <Text style={[pm.quickBtnTxt, currentYear === currentActualYear && currentMonth === -1 && pm.quickBtnActiveTxt]}>📅 {currentActualYear} (Tüm Yıl)</Text>
            </TouchableOpacity>
          </View>

          <Text style={pm.subLabel}>AYLAR ({currentYear})</Text>
          <View style={pm.monthsGrid}>
            {MONTHS_FULL.map((m, idx) => (
              <TouchableOpacity
                key={m}
                style={[pm.monthBtn, currentMonth === idx && pm.monthBtnActive]}
                onPress={() => { onSelect(currentYear, idx); onClose(); }}>
                <Text style={[pm.monthTxt, currentMonth === idx && pm.monthTxtActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={pm.subLabel}>YIL SEÇİN</Text>
          <View style={pm.yearsRow}>
            {years.map(y => (
              <TouchableOpacity
                key={y}
                style={[pm.yearBtn, currentYear === y && pm.yearBtnActive]}
                onPress={() => onSelect(y, currentMonth === -1 ? -1 : currentMonth)}>
                <Text style={[pm.yearTxt, currentYear === y && pm.yearTxtActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  box: { backgroundColor: '#FFF', borderRadius: 12, padding: 18, elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700', color: '#222' },
  close: { fontSize: 20, color: '#888', padding: 4 },
  subLabel: { fontSize: 11, color: '#888', marginTop: 12, marginBottom: 6, fontWeight: '700', letterSpacing: 0.5 },
  quickRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 6, backgroundColor: '#F0F0F0', alignItems: 'center' },
  quickBtnActive: { backgroundColor: GREEN_LIGHT, borderWidth: 1.5, borderColor: GREEN },
  quickBtnTxt: { fontSize: 12, fontWeight: '700', color: '#333' },
  quickBtnActiveTxt: { color: GREEN },
  monthsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  monthBtn: { width: '31%', paddingVertical: 9, borderRadius: 6, backgroundColor: '#F8F8F8', alignItems: 'center' },
  monthBtnActive: { backgroundColor: GREEN },
  monthTxt: { fontSize: 13, color: '#444', fontWeight: '600' },
  monthTxtActive: { color: '#FFF', fontWeight: '700' },
  yearsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  yearBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, backgroundColor: '#EEE' },
  yearBtnActive: { backgroundColor: GREEN },
  yearTxt: { fontSize: 13, color: '#555', fontWeight: '600' },
  yearTxtActive: { color: '#FFF', fontWeight: '700' },
});

// ── Tür / Kategori Seçici ────────────────────────────────────────────────────
function CategoryPicker({ visible, items, onSelect, onClose, onAddNew }) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={tp.overlay} activeOpacity={1} onPress={onClose} />
      <View style={tp.box}>
        <ScrollView style={{ maxHeight: 320 }}>
          {items.map((item, i) => (
            <TouchableOpacity key={i} style={[tp.item, i < items.length-1 && tp.itemBorder]} onPress={()=>{ onSelect(item); onClose(); }}>
              <Text style={tp.itemTxt}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {onAddNew && (
          <TouchableOpacity style={tp.addBtn} onPress={onAddNew}>
            <Text style={tp.addBtnTxt}>+ Yeni Kategori Ekle</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}
const tp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  box: {
    position:'absolute', top: 140, left: 16, right: 16,
    backgroundColor:'#FFF', borderRadius: 8,
    elevation: 8, shadowColor:'#000', shadowOpacity:0.15, shadowRadius:8,
    overflow: 'hidden'
  },
  item: { paddingVertical: 14, paddingHorizontal: 18 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor:'#F0F0F0' },
  itemTxt: { fontSize: 15, color:'#222', fontWeight: '500' },
  addBtn: { backgroundColor: GREEN_LIGHT, paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#C8E6C9' },
  addBtnTxt: { color: GREEN, fontWeight: '700', fontSize: 14 },
});

// ── TAM EKRAN İŞLEM FORMU ─────────────────────────────────────────────────────
function TransactionScreen({ visible, editData, accounts, categories, currency, onClose, onSave, onAddNewCategory }) {
  const isEdit = !!editData;
  const [txType, setTxType] = useState('gider'); // 'gider' | 'gelir' | 'transfer'
  const [tur, setTur] = useState('Ödemeler');
  const [miktar, setMiktar] = useState('');
  const [tarih, setTarih] = useState(new Date().toISOString().split('T')[0]);
  const [not, setNot] = useState('');
  const [accountId, setAccountId] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [turPickerOpen, setTurPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editData) {
        setTxType(editData.type || 'gider');
        setTur(editData.title || (editData.type === 'gelir' ? categories.gelir[0] : categories.gider[0]));
        setMiktar(String(editData.amount || ''));
        setTarih(editData.date || new Date().toISOString().split('T')[0]);
        setNot(editData.note || '');
        setAccountId(editData.accountId || (accounts[0]?.id || ''));
        setTargetAccountId(accounts.length > 1 ? accounts[1].id : (accounts[0]?.id || ''));
      } else {
        setTxType('gider');
        setTur(categories.gider[0] || 'Ödemeler');
        setMiktar('');
        setTarih(new Date().toISOString().split('T')[0]);
        setNot('');
        setAccountId(accounts[0]?.id || '');
        setTargetAccountId(accounts.length > 1 ? accounts[1].id : (accounts[0]?.id || ''));
      }
    }
  }, [visible, editData, categories, accounts]);

  const turListesi = txType === 'gelir' ? (categories.gelir || []) : (categories.gider || []);

  const handleAddAmount = (addVal) => {
    const current = parseFloat(miktar.replace(',', '.')) || 0;
    const next = current + addVal;
    setMiktar(Number.isInteger(next) ? String(next) : next.toFixed(2));
  };

  const handleSave = () => {
    const amt = parseFloat(miktar.replace(',','.'));
    if (isNaN(amt) || amt <= 0) { Alert.alert('Hata', 'Geçerli bir tutar girin.'); return; }
    
    if (txType === 'transfer') {
      if (!accountId || !targetAccountId || accountId === targetAccountId) {
        Alert.alert('Hata', 'Lütfen farklı çıkış ve giriş hesapları seçin.');
        return;
      }
    }

    const tx = {
      id: editData?.id || Date.now().toString(),
      accountId: accountId || (accounts[0]?.id || 'acc_nakit'),
      targetAccountId: targetAccountId || '',
      type: txType,
      title: txType === 'transfer' ? 'Hesap Transferi' : tur,
      amount: amt,
      date: tarih,
      note: not.trim(),
    };
    onSave(tx, isEdit);
  };

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={ts.safe}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

        {/* Header */}
        <View style={ts.header}>
          <TouchableOpacity onPress={onClose} style={ts.backBtn}>
            <Text style={ts.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={ts.typeToggle}>
            <TouchableOpacity
              style={[ts.toggleTab, txType === 'gider' && ts.toggleTabActiveGider]}
              onPress={() => { setTxType('gider'); setTur(categories.gider[0] || 'Ödemeler'); }}>
              <Text style={[ts.toggleTabTxt, txType === 'gider' && ts.toggleTabTxtActive]}>Gider</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ts.toggleTab, txType === 'gelir' && ts.toggleTabActiveGelir]}
              onPress={() => { setTxType('gelir'); setTur(categories.gelir[0] || 'Maaş'); }}>
              <Text style={[ts.toggleTabTxt, txType === 'gelir' && ts.toggleTabTxtActive]}>Gelir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ts.toggleTab, txType === 'transfer' && ts.toggleTabActiveTransfer]}
              onPress={() => { setTxType('transfer'); }}>
              <Text style={[ts.toggleTabTxt, txType === 'transfer' && ts.toggleTabTxtActive]}>Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView style={ts.scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>

            {/* Normal Hesap veya Transfer Çıkış Hesabı */}
            <View style={ts.formSection}>
              <Text style={ts.sectionTitle}>{txType === 'transfer' ? 'ÇIKIŞ HESABI (Nereden)' : 'HESAP / CÜZDAN'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ts.accountRow}>
                {accounts.map(acc => (
                  <TouchableOpacity key={acc.id} style={[ts.accPill, accountId===acc.id && ts.accPillActive]} onPress={()=>setAccountId(acc.id)}>
                    <Text style={[ts.accPillTxt, accountId===acc.id && ts.accPillTxtActive]}>{acc.icon} {acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Transfer Giriş Hesabı */}
            {txType === 'transfer' && (
              <View style={ts.formSection}>
                <Text style={ts.sectionTitle}>GİRİŞ HESABI (Nereye)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ts.accountRow}>
                  {accounts.map(acc => (
                    <TouchableOpacity key={acc.id} style={[ts.accPill, targetAccountId===acc.id && ts.accPillActiveTarget]} onPress={()=>setTargetAccountId(acc.id)}>
                      <Text style={[ts.accPillTxt, targetAccountId===acc.id && ts.accPillTxtActive]}>{acc.icon} {acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Tür / Kategori (Transferde gizlenir) */}
            {txType !== 'transfer' && (
              <TouchableOpacity style={ts.formRow} onPress={()=>setTurPickerOpen(true)}>
                <Text style={ts.rowLabel}>Tür</Text>
                <View style={ts.rowRight}>
                  <Text style={ts.rowValue}>{tur}</Text>
                  <Text style={ts.rowArrow}>▼</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Miktar */}
            <View style={ts.formRow}>
              <Text style={ts.rowLabel}>Miktar</Text>
              <View style={ts.rowRight}>
                <TextInput
                  style={ts.miktarInput}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#CCC"
                  value={miktar}
                  onChangeText={setMiktar}
                  autoFocus={!isEdit}
                />
                <Text style={ts.currencySymbol}>{currency.symbol}</Text>
              </View>
            </View>

            {/* Hızlı Tutar Butonları */}
            <View style={ts.quickAmtRow}>
              {[50, 100, 250, 500, 1000, 5000].map(val => (
                <TouchableOpacity key={val} style={ts.quickAmtBtn} onPress={() => handleAddAmount(val)}>
                  <Text style={ts.quickAmtTxt}>+{val}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[ts.quickAmtBtn, { backgroundColor: '#FFEBEE' }]} onPress={() => setMiktar('')}>
                <Text style={[ts.quickAmtTxt, { color: RED }]}>C</Text>
              </TouchableOpacity>
            </View>

            {/* Tarih */}
            <TouchableOpacity style={ts.formRow} onPress={()=>setDatePickerOpen(true)}>
              <Text style={ts.rowLabel}>Tarih</Text>
              <View style={ts.rowRight}>
                <Text style={ts.tarihValue}>{formatDate(tarih)}</Text>
                <Text style={ts.rowArrow}>📅</Text>
              </View>
            </TouchableOpacity>

            {/* Hızlı Tarih Butonları */}
            <View style={ts.quickDateRow}>
              <TouchableOpacity
                style={ts.quickDateBtn}
                onPress={() => setTarih(new Date().toISOString().split('T')[0])}>
                <Text style={ts.quickDateTxt}>Bugün</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ts.quickDateBtn}
                onPress={() => setTarih(new Date(Date.now() - 86400000).toISOString().split('T')[0])}>
                <Text style={ts.quickDateTxt}>Dün</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ts.quickDateBtn}
                onPress={() => setTarih(new Date(Date.now() - 172800000).toISOString().split('T')[0])}>
                <Text style={ts.quickDateTxt}>Önceki Gün</Text>
              </TouchableOpacity>
            </View>

            {/* Not */}
            <View style={ts.formRow}>
              <Text style={ts.rowLabel}>Not</Text>
              <TextInput
                style={ts.notInput}
                placeholder="İsteğe bağlı not veya açıklama..."
                placeholderTextColor="#AAA"
                value={not}
                onChangeText={setNot}
              />
            </View>

          </ScrollView>

          {/* Alt Butonlar */}
          <View style={ts.bottomRow}>
            <TouchableOpacity style={ts.kaydetBtn} onPress={handleSave}>
              <Text style={ts.kaydetTxt}>KAYDET</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ts.vazgecBtn} onPress={onClose}>
              <Text style={ts.vazgecTxt}>VAZGEÇ</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Tür Picker */}
      <CategoryPicker
        visible={turPickerOpen}
        items={turListesi}
        onSelect={setTur}
        onClose={()=>setTurPickerOpen(false)}
        onAddNew={() => {
          setTurPickerOpen(false);
          onAddNewCategory(txType);
        }}
      />

      {/* Tarih Picker */}
      <DatePickerSheet visible={datePickerOpen} value={tarih} onClose={()=>setDatePickerOpen(false)} onSelect={setTarih} />
    </Modal>
  );
}
const ts = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Platform.OS==='android' ? 36 : 14,
    paddingBottom: 14,
  },
  backBtn: { padding: 6, marginRight: 8 },
  backArrow: { fontSize: 24, color: '#FFF', fontWeight: '600' },
  typeToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  toggleTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  toggleTabActiveGider: { backgroundColor: '#C62828' },
  toggleTabActiveGelir: { backgroundColor: '#1B5E20' },
  toggleTabActiveTransfer: { backgroundColor: '#1565C0' },
  toggleTabTxt: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  toggleTabTxtActive: { color: '#FFF', fontWeight: '800' },

  scroll: { flex: 1 },
  formSection: { backgroundColor: '#FFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  sectionTitle: { fontSize: 11, color: '#888', paddingHorizontal: 16, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  accountRow: { flexDirection:'row', gap: 8, paddingHorizontal: 16 },
  accPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#F0F0F0' },
  accPillActive: { backgroundColor: GREEN },
  accPillActiveTarget: { backgroundColor: '#1565C0' },
  accPillTxt: { fontSize: 13, color: '#555', fontWeight: '600' },
  accPillTxtActive: { color: '#FFF', fontWeight: '700' },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  rowLabel: { fontSize: 15, color: '#555', width: 70 },
  rowRight: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  rowValue: { flex: 1, fontSize: 16, fontWeight: '600', color: '#222' },
  rowArrow: { fontSize: 14, color: '#888' },
  miktarInput: {
    flex: 1,
    fontSize: 22,
    color: '#222',
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 2,
    paddingHorizontal: 0,
    minWidth: 120,
  },
  currencySymbol: { fontSize: 20, color: '#555', marginLeft: 8, fontWeight: '700' },
  quickAmtRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  quickAmtBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#F0F0F0' },
  quickAmtTxt: { fontSize: 12, fontWeight: '700', color: '#444' },
  tarihValue: { flex: 1, fontSize: 16, fontWeight: '700', color: '#222' },
  quickDateRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  quickDateBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 4, backgroundColor: '#E8F5E9' },
  quickDateTxt: { fontSize: 12, color: GREEN, fontWeight: '700' },
  notInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
    paddingVertical: 2,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'android' ? 44 : 28,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E8ECEB',
    gap: 12,
  },
  kaydetBtn: {
    flex: 1.6,
    backgroundColor: GREEN,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: GREEN,
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  kaydetTxt: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  vazgecBtn: {
    flex: 1,
    backgroundColor: '#ECEFF1',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vazgecTxt: { color: '#546E7A', fontWeight: '700', fontSize: 15 },
});

// ─── Rapor Tarih Seçici ───────────────────────────────────────────────────────
function ReportDateRow({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={rd.row} onPress={() => setOpen(true)}>
        <Text style={rd.label}>{label}</Text>
        <Text style={rd.value}>{formatDate(value)}</Text>
      </TouchableOpacity>
      <DatePickerSheet visible={open} value={value} onClose={() => setOpen(false)} onSelect={onChange} />
    </View>
  );
}
const rd = StyleSheet.create({
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  label: { fontSize: 12, color: '#888', marginBottom: 2 },
  value: { fontSize: 18, fontWeight: '700', color: '#222' },
});

// ─── PIN KİLİDİ MODALI ────────────────────────────────────────────────────────
function PinLockModal({ visible, correctPin, onSuccess }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const handleNum = (n) => {
    if (pin.length < 4) {
      const next = pin + n;
      setPin(next);
      if (next.length === 4) {
        if (next === correctPin) {
          setErr('');
          setPin('');
          onSuccess();
        } else {
          setErr('Hatalı PIN Kodu!');
          setTimeout(() => { setPin(''); setErr(''); }, 600);
        }
      }
    }
  };

  const handleDel = () => {
    setPin(pin.slice(0, -1));
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <SafeAreaView style={pl.safe}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
        <View style={pl.content}>
          <Text style={pl.logo}>🔒</Text>
          <Text style={pl.title}>Hesabım</Text>
          <Text style={pl.sub}>Lütfen 4 haneli PIN kodunuzu girin</Text>

          <View style={pl.dotsRow}>
            {[0,1,2,3].map(i => (
              <View key={i} style={[pl.dot, pin.length > i && pl.dotFilled]} />
            ))}
          </View>
          {!!err && <Text style={pl.err}>{err}</Text>}

          <View style={pl.keypad}>
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <TouchableOpacity key={n} style={pl.key} onPress={() => handleNum(String(n))}>
                <Text style={pl.keyTxt}>{n}</Text>
              </TouchableOpacity>
            ))}
            <View style={pl.keyEmpty} />
            <TouchableOpacity style={pl.key} onPress={() => handleNum('0')}>
              <Text style={pl.keyTxt}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pl.key} onPress={handleDel}>
              <Text style={pl.keyTxt}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const pl = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GREEN },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  logo: { fontSize: 50, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#FFF' },
  dotFilled: { backgroundColor: '#FFF' },
  err: { color: '#FFCDD2', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  keypad: { width: 280, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  key: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  keyEmpty: { width: 76, height: 76 },
  keyTxt: { fontSize: 28, color: '#FFF', fontWeight: '700' },
});

// ─── ANA UYGULAMA BİLEŞENİ ────────────────────────────────────────────────────
export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategoriesState] = useState({ gider: [], gelir: [] });
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [currency, setCurrencyState] = useState(CURRENCIES[0]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());

  // Arama durumu
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTypeFilter, setSearchTypeFilter] = useState('all'); // 'all' | 'gelir' | 'gider'

  // PIN Güvenlik durumu
  const [pinLocked, setPinLocked] = useState(false);
  const [appPin, setAppPin] = useState(null);

  // Akordiyon açılır/kapanır durumları
  const [bakiyeExpanded, setBakiyeExpanded] = useState(true);
  const [gelirExpanded, setGelirExpanded] = useState(false);
  const [giderExpanded, setGiderExpanded] = useState(true);

  // Modallar
  const [menuVisible, setMenuVisible] = useState(false);
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [txScreenVisible, setTxScreenVisible] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [newAccountModalVisible, setNewAccountModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [newCategoryModalVisible, setNewCategoryModalVisible] = useState(false);
  const [newCategoryType, setNewCategoryType] = useState('gider');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [aboutModalVisible, setAboutModalVisible] = useState(false);
  const [ayarlarModalVisible, setAyarlarModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [pinSettingsModalVisible, setPinSettingsModalVisible] = useState(false);
  const [reportMethodOpen, setReportMethodOpen] = useState(false);
  const [reportAccountOpen, setReportAccountOpen] = useState(false);

  // İşlem İşlem Seçenekleri Modalı (Dokununca: Düzenle / Çoğalt / Sil)
  const [actionTxModalVisible, setActionTxModalVisible] = useState(false);
  const [selectedActionTx, setSelectedActionTx] = useState(null);

  // Yeni Hesap Alanları
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountIcon, setNewAccountIcon] = useState('💳');

  // Rapor Seçimleri
  const [reportStart, setReportStart] = useState(() => { const d=new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);
  const [reportAccountId, setReportAccountId] = useState('all');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState('excel'); // 'excel' | 'pdf'
  const [excelActiveSheet, setExcelActiveSheet] = useState('Bakiye'); // 'Bakiye' | 'Gelir Tablosu' | 'Gider Tablosu'

  // Yedekleme Alanları
  const [backupActiveTab, setBackupActiveTab] = useState('cloud'); // 'cloud' | 'auto' | 'json'
  const [autoBackupsList, setAutoBackupsList] = useState([]);
  const [lastCloudBackup, setLastCloudBackup] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupJsonText, setBackupJsonText] = useState('');

  // PIN Yönetimi Alanları
  const [pinEnabledState, setPinEnabledState] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');

  // Tekrarlayan İşlemler / Abonelikler Alanları
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [recurringList, setRecurringList] = useState([]);
  const [newRecurringModalVisible, setNewRecurringModalVisible] = useState(false);
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecType, setNewRecType] = useState('gider');
  const [newRecAmount, setNewRecAmount] = useState('');
  const [newRecAccountId, setNewRecAccountId] = useState('');
  const [newRecDay, setNewRecDay] = useState('1');

  // Kategori Bütçe Hedefleri Alanları
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgets, setBudgets] = useState({});
  const [editingBudgetCat, setEditingBudgetCat] = useState(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');

  // Sıralama
  const [sortOrder, setSortOrder] = useState('date_desc'); // 'date_desc' | 'amount_desc' | 'amount_asc'

  useEffect(() => { loadAll(); }, []);

  const refreshBackupData = async () => {
    try {
      const [snaps, lastDate] = await Promise.all([
        getAutoBackups(),
        getLastCloudBackupDate()
      ]);
      setAutoBackupsList(snaps || []);
      setLastCloudBackup(lastDate);
    } catch (e) {
      console.error('Backup data refresh error:', e);
    }
  };

  const loadAll = async () => {
    const [txs, accs, cats, cur, activeAcc, pin, pinActive, recs, bgts] = await Promise.all([
      getTransactions(),
      getAccounts(),
      getCategories(),
      getCurrency(),
      getActiveAccountId(),
      getPinCode(),
      isPinEnabled(),
      getRecurringTransactions(),
      getCategoryBudgets(),
    ]);
    setTransactions(txs || []);
    setAccounts(accs || []);
    setCategoriesState(cats || { gider: [], gelir: [] });
    setCurrencyState(cur || CURRENCIES[0]);
    setAppPin(pin);
    setPinEnabledState(pinActive);
    setRecurringList(recs || []);
    setBudgets(bgts || {});
    if (pinActive && pin) {
      setPinLocked(true);
    }
    await triggerAutoBackup();
    await refreshBackupData();
  };

  // Tüm hesapların gerçek zamanlı bakiyeleri
  const accountBalances = useMemo(() => {
    const map = {};
    accounts.forEach(acc => { map[acc.id] = 0; });
    transactions.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      if (map[t.accountId] !== undefined) {
        if (t.type === 'gelir') map[t.accountId] += amt;
        else map[t.accountId] -= amt;
      }
    });
    return map;
  }, [accounts, transactions]);

  // Son 6 ay diyagram verisi
  const chartData = useMemo(() => {
    const now = new Date();
    const labels = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      let income = 0, expense = 0;
      transactions.forEach(tx => {
        if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return;
        const td = new Date(tx.date);
        if (td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()) {
          const val = parseFloat(tx.amount) || 0;
          if (tx.type === 'gelir') income += val; else expense += val;
        }
      });
      return { label: labels[d.getMonth()], income, expense };
    });
  }, [transactions, selectedAccountId]);

  // Kategori bazlı harcama dağılımı
  const categoryStats = useMemo(() => {
    const expenses = transactions.filter(tx => {
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
      const d = new Date(tx.date);
      if (filterMonth === -1) return d.getFullYear() === filterYear && tx.type === 'gider';
      return d.getFullYear() === filterYear && d.getMonth() === filterMonth && tx.type === 'gider';
    });
    const map = {};
    let total = 0;
    expenses.forEach(t => {
      const amt = parseFloat(t.amount) || 0;
      total += amt;
      map[t.title] = (map[t.title] || 0) + amt;
    });
    return Object.keys(map)
      .map(k => ({ title: k, amount: map[k], percent: total > 0 ? (map[k]/total)*100 : 0 }))
      .sort((a,b) => b.amount - a.amount);
  }, [transactions, selectedAccountId, filterYear, filterMonth]);

  // Filtrelenmiş işlemler (ve sıralama)
  const filteredTransactions = useMemo(() => {
    let list = transactions.filter(tx => {
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) return false;
      const d = new Date(tx.date);
      const matchesPeriod = filterMonth === -1
        ? d.getFullYear() === filterYear
        : d.getFullYear() === filterYear && d.getMonth() === filterMonth;
      if (!matchesPeriod) return false;

      if (searchTypeFilter !== 'all' && tx.type !== searchTypeFilter) return false;

      if (searchOpen && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (tx.title || '').toLowerCase().includes(q);
        const matchesNote = (tx.note || '').toLowerCase().includes(q);
        const matchesAmt = String(tx.amount || '').includes(q);
        return matchesTitle || matchesNote || matchesAmt;
      }
      return true;
    });

    if (sortOrder === 'amount_desc') {
      return [...list].sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
    } else if (sortOrder === 'amount_asc') {
      return [...list].sort((a, b) => (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0));
    } else {
      return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
  }, [transactions, selectedAccountId, filterYear, filterMonth, searchOpen, searchQuery, searchTypeFilter, sortOrder]);

  const gelirTxs = useMemo(() => filteredTransactions.filter(t => t.type === 'gelir'), [filteredTransactions]);
  const giderTxs = useMemo(() => filteredTransactions.filter(t => t.type === 'gider'), [filteredTransactions]);
  const totalIncome = useMemo(() => gelirTxs.reduce((s,t) => s+(parseFloat(t.amount)||0), 0), [gelirTxs]);
  const totalExpense = useMemo(() => giderTxs.reduce((s,t) => s+(parseFloat(t.amount)||0), 0), [giderTxs]);
  const balance = totalIncome - totalExpense;

  const fmt = (val) => `${(Math.abs(val)||0).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})} ${currency.symbol}`;

  // Başlık altı bilgisi
  const headerSubtitle = useMemo(() => {
    const acc = selectedAccountId==='all' ? 'Tüm kayıtlar' : (accounts.find(a=>a.id===selectedAccountId)?.name || '');
    return filterMonth===-1
      ? `${filterYear} (TÜM YIL) · ${acc}`
      : `${filterYear} ${MONTHS_FULL[filterMonth].toUpperCase()} · ${acc}`;
  }, [filterYear, filterMonth, selectedAccountId, accounts]);

  // Ay İleri / Geri Hızlı Gezinti
  const handlePrevMonth = () => {
    if (filterMonth === -1) {
      setFilterYear(filterYear - 1);
    } else if (filterMonth === 0) {
      setFilterMonth(11);
      setFilterYear(filterYear - 1);
    } else {
      setFilterMonth(filterMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (filterMonth === -1) {
      setFilterYear(filterYear + 1);
    } else if (filterMonth === 11) {
      setFilterMonth(0);
      setFilterYear(filterYear + 1);
    } else {
      setFilterMonth(filterMonth + 1);
    }
  };

  // ── İşlem Kaydet/Güncelle ──────────────────────────────────────────────────
  const handleTxSave = async (tx, isEdit) => {
    if (tx.type === 'transfer') {
      const fromAcc = accounts.find(a => a.id === tx.accountId);
      const toAcc = accounts.find(a => a.id === tx.targetAccountId);
      const fromName = fromAcc ? fromAcc.name : 'Hesap';
      const toName = toAcc ? toAcc.name : 'Hesap';

      const outTx = {
        id: Date.now().toString(),
        accountId: tx.accountId,
        type: 'gider',
        title: `Transfer: ${toName}`,
        amount: tx.amount,
        date: tx.date,
        note: tx.note ? `${tx.note} (${fromName} ➔ ${toName})` : `Virman (${fromName} ➔ ${toName})`
      };
      const inTx = {
        id: (Date.now() + 1).toString(),
        accountId: tx.targetAccountId,
        type: 'gelir',
        title: `Transfer: ${fromName}`,
        amount: tx.amount,
        date: tx.date,
        note: tx.note ? `${tx.note} (${fromName} ➔ ${toName})` : `Virman (${fromName} ➔ ${toName})`
      };
      await addTransaction(outTx);
      const updated = await addTransaction(inTx);
      if (updated) {
        setTransactions(updated);
        setTxScreenVisible(false);
        setEditingTx(null);
        await triggerAutoBackup();
        await refreshBackupData();
      }
      return;
    }

    let updated;
    if (isEdit) { updated = await updateTransaction(tx); }
    else { updated = await addTransaction(tx); }
    if (updated) {
      setTransactions(updated);
      setTxScreenVisible(false);
      setEditingTx(null);
      await triggerAutoBackup();
      await refreshBackupData();
    }
  };

  // ── İşlem Çoğalt (Tekrarla) ─────────────────────────────────────────────────
  const handleDuplicateTx = async (tx) => {
    const newTx = {
      ...tx,
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
    };
    const updated = await addTransaction(newTx);
    if (updated) {
      setTransactions(updated);
      setActionTxModalVisible(false);
      await triggerAutoBackup();
      await refreshBackupData();
      Alert.alert('Başarılı', `"${tx.title}" bugünün tarihine kopyalandı.`);
    }
  };

  // ── Sil ───────────────────────────────────────────────────────────────────
  const handleDelete = (id, title) => {
    Alert.alert('Sil', `"${title}" silinsin mi?`, [
      { text: 'Vazgeç', style:'cancel' },
      { text:'Sil', style:'destructive', onPress: async () => {
        const u = await deleteTransaction(id);
        if(u) {
          setTransactions(u);
          await triggerAutoBackup();
          await refreshBackupData();
        }
        setActionTxModalVisible(false);
      }}
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Tüm Kayıtları Sil', 'Tüm gelir ve gider kayıtlarınız kalıcı olarak silinecektir. Bu işlem geri alınamaz!\n\nEmin misiniz?', [
      { text:'Vazgeç', style:'cancel' },
      { text:'Evet, Hepsini Sil', style:'destructive', onPress: async () => {
        const u = await clearAllTransactions();
        if(u!==null) {
          setTransactions(u);
          await triggerAutoBackup();
          await refreshBackupData();
        }
        setMenuVisible(false);
        setAyarlarModalVisible(false);
      }}
    ]);
  };

  // ── Kategori Ekle / Sil ────────────────────────────────────────────────────
  const handleAddCategorySubmit = async () => {
    if (!newCategoryName.trim()) { Alert.alert('Eksik', 'Kategori adı giriniz.'); return; }
    const res = await addCategory(newCategoryType, newCategoryName.trim());
    if (res) {
      setCategoriesState(res);
      setNewCategoryName('');
      setNewCategoryModalVisible(false);
      await triggerAutoBackup();
      await refreshBackupData();
      Alert.alert('Başarılı', 'Yeni kategori eklendi.');
    }
  };

  const handleDeleteCategorySubmit = async (type, name) => {
    Alert.alert('Kategoriyi Sil', `"${name}" kategorisi silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const res = await deleteCategory(type, name);
        if (res) {
          setCategoriesState(res);
          await triggerAutoBackup();
          await refreshBackupData();
        }
      }}
    ]);
  };

  // ── Tekrarlayan İşlemler / Abonelikler ────────────────────────────────────
  const handleAddRecurringSubmit = async () => {
    const amt = parseFloat(newRecAmount.replace(',', '.'));
    if (!newRecTitle.trim()) { Alert.alert('Eksik', 'Lütfen bir başlık/kategori girin.'); return; }
    if (isNaN(amt) || amt <= 0) { Alert.alert('Eksik', 'Geçerli bir tutar girin.'); return; }

    const item = {
      id: 'rec_' + Date.now(),
      title: newRecTitle.trim(),
      type: newRecType,
      amount: amt,
      accountId: newRecAccountId || (accounts[0]?.id || 'acc_nakit'),
      day: parseInt(newRecDay, 10) || 1,
      period: 'monthly',
      createdAt: new Date().toISOString(),
    };

    const updated = await addRecurringTransaction(item);
    if (updated) {
      setRecurringList(updated);
      setNewRecTitle('');
      setNewRecAmount('');
      setNewRecurringModalVisible(false);
      await triggerAutoBackup();
      await refreshBackupData();
      Alert.alert('Başarılı', `"${item.title}" sabit işlem listesine eklendi.`);
    }
  };

  const handleDeleteRecurring = async (id, title) => {
    Alert.alert('Sil', `"${title}" sabit işlem listesinden silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const updated = await deleteRecurringTransaction(id);
        if (updated) {
          setRecurringList(updated);
          await triggerAutoBackup();
          await refreshBackupData();
        }
      }}
    ]);
  };

  const handleApplyRecurring = async (item) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(Math.min(item.day || 1, 28)).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;

    const newTx = {
      id: Date.now().toString(),
      accountId: item.accountId || (accounts[0]?.id || 'acc_nakit'),
      type: item.type,
      title: item.title,
      amount: item.amount,
      date: dateStr,
      note: '🔁 Sabit İşlem / Abonelik',
    };

    const updated = await addTransaction(newTx);
    if (updated) {
      setTransactions(updated);
      await triggerAutoBackup();
      await refreshBackupData();
      Alert.alert('Başarılı', `"${item.title}" bu ayın işlemlerine eklendi.`);
    }
  };

  // ── Bütçe Hedefleri Kaydet / Sil ──────────────────────────────────────────
  const handleSaveBudget = async (catName, amountStr) => {
    const amt = parseFloat((amountStr || '').replace(',', '.'));
    const updated = await setCategoryBudget(catName, amt);
    if (updated) {
      setBudgets(updated);
      setEditingBudgetCat(null);
      setEditingBudgetAmount('');
      await triggerAutoBackup();
      await refreshBackupData();
    }
  };

  const handleDeleteBudget = async (catName) => {
    const updated = await deleteCategoryBudget(catName);
    if (updated) {
      setBudgets(updated);
      await triggerAutoBackup();
      await refreshBackupData();
    }
  };

  // ── Hesap Kaydet / Sil ────────────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) { Alert.alert('Eksik','Hesap adı girin.'); return; }
    const newAcc = { id:'acc_'+Date.now(), name:newAccountName.trim(), icon:newAccountIcon };
    const updated = await addAccount(newAcc);
    if (updated) {
      setAccounts(updated);
      setSelectedAccountId(newAcc.id);
      await setActiveAccountId(newAcc.id);
      setNewAccountName('');
      setNewAccountModalVisible(false);
      await triggerAutoBackup();
      await refreshBackupData();
    }
  };

  const handleDeleteAccount = (accId, accName) => {
    if (accounts.length <= 1) {
      Alert.alert('Uyarı', 'En az bir hesap bulunmalıdır.');
      return;
    }
    Alert.alert('Hesabı Sil', `"${accName}" hesabını silmek istediğinize emin misiniz?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const updated = await deleteAccount(accId);
        if (updated) {
          setAccounts(updated);
          if (selectedAccountId === accId) {
            setSelectedAccountId('all');
            await setActiveAccountId('all');
          }
          await triggerAutoBackup();
          await refreshBackupData();
        }
      }}
    ]);
  };

  // ── Google Drive, Lokal Snapshot & JSON Yedekleme / Geri Yükleme ──────────
  const handleCloudExport = async () => {
    setBackupLoading(true);
    const res = await exportToGoogleDriveOrFile();
    setBackupLoading(false);
    if (res.success) {
      await refreshBackupData();
      Alert.alert('Yedek Paylaşıldı / Kaydedildi', 'Yedek dosyanız Google Drive, E-posta veya cihaz hafızasına aktarılmak üzere paylaşıldı.');
    } else if (res.message) {
      Alert.alert('Yedekleme Hatası', res.message);
    }
  };

  const handleCloudImport = async () => {
    Alert.alert(
      'Dosyadan / Google Drive\'dan Yükle',
      'Google Drive veya cihazınızdan seçeceğiniz .json yedek dosyası mevcut verilerinize geri yüklenecek. Devam etmek istiyor musunuz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Dosya Seç & Yükle',
          onPress: async () => {
            setBackupLoading(true);
            const res = await importFromGoogleDriveOrFile();
            setBackupLoading(false);
            if (res.success) {
              await loadAll();
              setBackupModalVisible(false);
              Alert.alert('Başarılı 🎉', `"${res.fileName}" yedeği başarıyla geri yüklendi!`);
            } else if (!res.canceled) {
              Alert.alert('Geri Yükleme Hatası', res.message || 'Dosya yüklenemedi.');
            }
          }
        }
      ]
    );
  };

  const handleRestoreAutoSnapshot = (snapshot) => {
    Alert.alert(
      'Otomatik Yedeğe Dön',
      `${snapshot.dateStr} tarihli anlık duruma dönmek istediğinize emin misiniz?\n\n(${snapshot.txCount} İşlem, ${snapshot.accCount} Hesap)`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geri Yükle',
          style: 'destructive',
          onPress: async () => {
            const ok = await restoreAutoBackup(snapshot.id);
            if (ok) {
              await loadAll();
              setBackupModalVisible(false);
              Alert.alert('Başarılı', `${snapshot.dateStr} tarihli otomatik yedek başarıyla geri yüklendi.`);
            } else {
              Alert.alert('Hata', 'Yedek yüklenirken bir sorun oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleGenerateBackup = async () => {
    const json = await exportAllData();
    if (json) {
      setBackupJsonText(json);
      try {
        await Share.share({
          message: json,
          title: 'Hesabım Veritabanı Yedeği'
        });
      } catch (e) {}
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupJsonText.trim()) { Alert.alert('Hata', 'Lütfen geçerli bir JSON yedek metni yapıştırın.'); return; }
    Alert.alert('Yedekten Yükle', 'Mevcut verilerinizin üzerine bu yedek yüklenecek. Onaylıyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Yükle', onPress: async () => {
        const ok = await importAllData(backupJsonText);
        if (ok) {
          await loadAll();
          setBackupModalVisible(false);
          setBackupJsonText('');
          Alert.alert('Başarılı', 'Tüm veritabanı başarıyla geri yüklendi!');
        } else {
          Alert.alert('Hata', 'Yedek verisi geçersiz veya bozuk formatta.');
        }
      }}
    ]);
  };

  // ── PIN Ayarları ───────────────────────────────────────────────────────────
  const handleSavePinSettings = async () => {
    if (pinEnabledState && newPinInput.length !== 4) {
      Alert.alert('Hata', 'Lütfen 4 basamaklı bir PIN kodu girin.');
      return;
    }
    if (pinEnabledState) {
      await setPinCode(newPinInput);
      await setPinEnabled(true);
      setAppPin(newPinInput);
      Alert.alert('Güvenlik Aktif', 'PIN kilidi başarıyla güncellendi.');
    } else {
      await setPinEnabled(false);
      await setPinCode(null);
      setAppPin(null);
      Alert.alert('Güvenlik', 'PIN kilidi devre dışı bırakıldı.');
    }
    setPinSettingsModalVisible(false);
  };

  // ── Rapor Aksiyonu (PDF ve Çok Sayfalı Excel .xls) ─────────────────────────
  const handleReportAction = async (action) => {
    const start = new Date(reportStart);
    const end = new Date(reportEnd); end.setHours(23,59,59);
    const txs = transactions.filter(tx => {
      if (reportAccountId!=='all' && tx.accountId!==reportAccountId) return false;
      const d = new Date(tx.date);
      return d>=start && d<=end;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));

    const inc = txs.filter(t=>t.type==='gelir').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
    const exp = txs.filter(t=>t.type==='gider').reduce((s,t)=>s+(parseFloat(t.amount)||0),0);
    const accObj = accounts.find(a=>a.id===reportAccountId);
    const accLabel = reportAccountId==='all' ? 'Tüm Hesaplar' : (accObj ? accObj.name : '');
    const dateTag = new Date().toISOString().slice(0,10);
    const targetEmail = '1962nihat.ny@gmail.com';

    setReportModalVisible(false);
    setReportMethodOpen(false);
    setReportAccountOpen(false);

    // 1. PDF veya Excel İnceleme (Uygulama İçi Önizleme)
    if (action === 'PDF Belge İncele' || action === 'Excel Tablo İncele') {
      const type = action.includes('PDF') ? 'pdf' : 'excel';
      setPreviewType(type);
      setExcelActiveSheet('Gider Tablosu');
      setPreviewData({
        txs, inc, exp, balance: inc - exp,
        accLabel, start: reportStart, end: reportEnd,
        dateTag, targetEmail,
        currencySymbol: currency.symbol
      });
      setPreviewModalVisible(true);
      return;
    }

    // 2. PDF Olarak Kaydet / Gönder (Birebir Format)
    if (action === 'PDF Kaydet' || action === 'PDF Mail') {
      try {
        const pdfUri = await exportReportToPdf({
          transactions: txs,
          accounts,
          accountLabel: accLabel,
          startDate: reportStart,
          endDate: reportEnd,
          currencySymbol: currency.symbol
        });

        if (pdfUri) {
          const isMail = action === 'PDF Mail';
          await sharePdfFile(pdfUri, isMail ? 'Hesabım PDF Raporu Gönder' : 'Hesabım PDF Kaydet');
        } else {
          Alert.alert('Hata', 'PDF dosyası oluşturulamadı.');
        }
      } catch (e) {
        Alert.alert('Hata', 'PDF işlemi sırasında bir sorun oluştu.');
      }
      return;
    }

    // 3. XLS Excel Kaydet / Gönder (Bakiye, Gelir Tablosu, Gider Tablosu Çoklu Sayfa)
    if (action === 'XLS Kaydet' || action === 'XLS Mail') {
      try {
        const excelUri = await exportReportToExcel({
          transactions: txs,
          accounts,
          accountLabel: accLabel,
          startDate: reportStart,
          endDate: reportEnd,
          currencySymbol: currency.symbol
        });

        if (excelUri) {
          const isMail = action === 'XLS Mail';
          await shareExcelFile(excelUri, isMail ? 'Hesabım Excel Raporu Gönder' : 'Hesabım Excel Kaydet');
        } else {
          Alert.alert('Hata', 'Excel dosyası oluşturulamadı.');
        }
      } catch (e) {
        Alert.alert('Hata', 'Excel işlemi sırasında bir sorun oluştu.');
      }
      return;
    }
  };

  // ── İşlem Satırı (Yeni Özgün Kart Tasarımı) ───────────────────────────────
  const renderTxItem = (item) => {
    const acc = accounts.find(a => a.id === item.accountId);
    const cat = getCategoryMeta(item.title, item.type);
    const isIncome = item.type === 'gelir';
    return (
      <TouchableOpacity
        key={item.id}
        style={s.modernTxCard}
        onPress={() => {
          setSelectedActionTx(item);
          setActionTxModalVisible(true);
        }}
        activeOpacity={0.75}>
        <View style={[s.modernTxIconBox, { backgroundColor: cat.bg }]}>
          <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
        </View>
        <View style={s.modernTxInfo}>
          <Text style={s.modernTxTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.modernTxSub} numberOfLines={1}>
            {acc ? acc.name : 'Hesap'} • {formatDate(item.date)}
            {item.note ? ` • ${item.note}` : ''}
          </Text>
        </View>
        <View style={s.modernTxAmountBox}>
          <Text style={[s.modernTxAmount, { color: isIncome ? '#2E7D32' : '#C62828' }]}>
            {isIncome ? '+' : '-'}{fmt(parseFloat(item.amount) || 0)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* PIN Giriş Ekranı */}
      <PinLockModal
        visible={pinLocked}
        correctPin={appPin}
        onSuccess={() => setPinLocked(false)}
      />

      {/* ── HEADER (YENİ HESABIM ÜST BARI) ── */}
      <View style={s.header}>
        <View style={s.brandRow}>
          <View style={s.brandLogo}>
            <Text style={s.brandLogoTxt}>H</Text>
          </View>
          <Text style={s.headerTitle}>Hesabım</Text>
        </View>

        <TouchableOpacity onPress={() => setPeriodModalVisible(true)} style={s.periodPill}>
          <Text style={s.periodPillTxt}>
            {filterMonth === -1 ? `${filterYear} (Tüm Yıl)` : `${MONTHS_FULL[filterMonth]} ${filterYear}`}
          </Text>
          <Text style={s.periodPillArrow}>▾</Text>
        </TouchableOpacity>

        <View style={s.headerIcons}>
          <TouchableOpacity style={s.headerIcon} onPress={() => setSearchOpen(!searchOpen)}>
            <Text style={s.headerIconTxt}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerIcon} onPress={() => setMenuVisible(true)}>
            <Text style={s.headerIconTxt}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── ARAMA ÇUBUĞU ── */}
      {searchOpen && (
        <View style={s.searchWrap}>
          <View style={s.searchBar}>
            <TextInput
              style={s.searchInput}
              placeholder="İşlem adı, not veya tutar ara..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={s.searchClear}>
                <Text style={{color: '#888', fontWeight: 'bold'}}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.searchFilterRow}>
            {[
              { id: 'all', label: 'Tümü' },
              { id: 'gelir', label: '🟢 Gelirler' },
              { id: 'gider', label: '🔴 Giderler' }
            ].map(f => (
              <TouchableOpacity
                key={f.id}
                style={[s.searchChip, searchTypeFilter === f.id && s.searchChipActive]}
                onPress={() => setSearchTypeFilter(f.id)}>
                <Text style={[s.searchChipTxt, searchTypeFilter === f.id && s.searchChipActiveTxt]}>{f.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Sıralama Seçici */}
            <TouchableOpacity
              style={[s.searchChip, { backgroundColor: '#E0F2F1', borderColor: '#80CBC4', borderWidth: 1 }]}
              onPress={() => {
                if (sortOrder === 'date_desc') setSortOrder('amount_desc');
                else if (sortOrder === 'amount_desc') setSortOrder('amount_asc');
                else setSortOrder('date_desc');
              }}>
              <Text style={[s.searchChipTxt, { color: '#00695C', fontWeight: '700' }]}>
                {sortOrder === 'date_desc' && '📅 Tarih (Yeni)'}
                {sortOrder === 'amount_desc' && '💰 Tutar: Azalan'}
                {sortOrder === 'amount_asc' && '📉 Tutar: Artan'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ANA İÇERİK ── */}
      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 140 : 110 }}>
        
        {/* ── HERO BAKİYE KARTI (ZÜMRÜT YEŞİLİ) ── */}
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>NET TOPLAM VARLIK</Text>
          <Text style={s.heroAmount}>{fmt(balance)}</Text>

          {/* Gelir / Gider Hapları */}
          <View style={s.heroBadgesRow}>
            <View style={s.heroBadgeInc}>
              <Text style={s.heroBadgeIncTxt}>↑ Gelir: +{fmt(totalIncome)}</Text>
            </View>
            <View style={s.heroBadgeExp}>
              <Text style={s.heroBadgeExpTxt}>↓ Gider: -{fmt(totalExpense)}</Text>
            </View>
          </View>

          {/* Hızlı Butonlar */}
          <View style={s.heroActionsRow}>
            <TouchableOpacity
              style={s.heroActionBtn}
              onPress={() => {
                setEditingTx({ type: 'transfer' });
                setTxScreenVisible(true);
              }}>
              <Text style={s.heroActionIcon}>💸</Text>
              <Text style={s.heroActionTxt}>Virman</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.heroActionBtn}
              onPress={() => setRecurringModalVisible(true)}>
              <Text style={s.heroActionIcon}>🔁</Text>
              <Text style={s.heroActionTxt}>Sabitler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.heroActionBtn}
              onPress={() => setBudgetModalVisible(true)}>
              <Text style={s.heroActionIcon}>🎯</Text>
              <Text style={s.heroActionTxt}>Bütçeler</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.heroActionBtn} onPress={() => setReportModalVisible(true)}>
              <Text style={s.heroActionIcon}>📊</Text>
              <Text style={s.heroActionTxt}>Raporlar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── HESAPLAR YATAY ŞERİDİ (ACCOUNTS CAROUSEL) ── */}
        <View style={s.accountSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.accountChipsRow}>
            <TouchableOpacity
              style={[s.accountChip, selectedAccountId === 'all' && s.accountChipActive]}
              onPress={() => {
                setSelectedAccountId('all');
                setActiveAccountId('all');
              }}>
              <Text style={s.accountChipIcon}>🏛️</Text>
              <View>
                <Text style={[s.accountChipName, selectedAccountId === 'all' && s.accountChipActiveTxt]}>Tüm Hesaplar</Text>
                <Text style={s.accountChipBal}>{fmt(balance)}</Text>
              </View>
            </TouchableOpacity>

            {accounts.map(acc => {
              const accBal = accountBalances[acc.id] || 0;
              const isSelected = selectedAccountId === acc.id;
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={[s.accountChip, isSelected && s.accountChipActive]}
                  onPress={() => {
                    setSelectedAccountId(acc.id);
                    setActiveAccountId(acc.id);
                  }}>
                  <Text style={s.accountChipIcon}>{acc.icon || '💳'}</Text>
                  <View>
                    <Text style={[s.accountChipName, isSelected && s.accountChipActiveTxt]}>{acc.name}</Text>
                    <Text style={[s.accountChipBal, { color: accBal >= 0 ? '#1B5E20' : '#C62828' }]}>
                      {fmt(accBal)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[s.accountChip, { borderStyle: 'dashed', borderColor: '#80CBC4', backgroundColor: '#F0FAF8' }]}
              onPress={() => setNewAccountModalVisible(true)}>
              <Text style={s.accountChipIcon}>➕</Text>
              <Text style={[s.accountChipName, { color: '#00796B', marginTop: 2 }]}>Hesap Ekle</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── İŞLEMLER LİSTESİ (ÖZGÜN KARTLAR) ── */}
        <View style={s.txSection}>
          <View style={s.txSectionHeader}>
            <Text style={s.txSectionTitle}>
              {filterMonth === -1 ? `${filterYear} Yılı İşlemleri` : `${MONTHS_FULL[filterMonth]} ${filterYear} İşlemleri`}
            </Text>
            <Text style={s.txCountBadge}>{filteredTransactions.length} Kayıt</Text>
          </View>

          {filteredTransactions.length === 0 ? (
            <View style={s.emptyStateBox}>
              <Text style={s.emptyStateIcon}>📋</Text>
              <Text style={s.emptyStateTitle}>Bu dönemde henüz işlem bulunmuyor</Text>
              <Text style={s.emptyStateSubtitle}>Aşağıdaki (+) butonuna basarak ilk gelirinizi veya giderinizi ekleyin.</Text>
            </View>
          ) : (
            filteredTransactions.map(renderTxItem)
          )}
        </View>
      </ScrollView>

      {/* ── FAB + ── */}
      <TouchableOpacity style={s.fab} onPress={() => { setEditingTx(null); setTxScreenVisible(true); }}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── TAM EKRAN İŞLEM FORMU ── */}
      <TransactionScreen
        visible={txScreenVisible}
        editData={editingTx}
        accounts={accounts}
        categories={categories}
        currency={currency}
        onClose={() => { setTxScreenVisible(false); setEditingTx(null); }}
        onSave={handleTxSave}
        onAddNewCategory={(type) => {
          setNewCategoryType(type);
          setNewCategoryName('');
          setNewCategoryModalVisible(true);
        }}
      />

      {/* ── İŞLEM SEÇENEKLERİ MODALI (DOKUNUNCA AÇILIR) ── */}
      <Modal transparent animationType="fade" visible={actionTxModalVisible} onRequestClose={() => setActionTxModalVisible(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setActionTxModalVisible(false)}>
          <View style={[s.centerCard, { marginHorizontal: 30 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle} numberOfLines={1}>{selectedActionTx?.title}</Text>
              <TouchableOpacity onPress={() => setActionTxModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              Tarih: {selectedActionTx?.date} · Tutar: {selectedActionTx ? fmt(selectedActionTx.amount) : ''}
            </Text>

            <TouchableOpacity
              style={act.btn}
              onPress={() => {
                setActionTxModalVisible(false);
                setEditingTx({ ...selectedActionTx });
                setTxScreenVisible(true);
              }}>
              <Text style={act.btnTxt}>✏️ İşlemi Düzenle</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={act.btn}
              onPress={() => handleDuplicateTx(selectedActionTx)}>
              <Text style={act.btnTxt}>📋 Bugünün Tarihine Çoğalt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[act.btn, { backgroundColor: '#FFEBEE' }]}
              onPress={() => handleDelete(selectedActionTx?.id, selectedActionTx?.title)}>
              <Text style={[act.btnTxt, { color: RED }]}>🗑️ İşlemi Sil</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── DİYAGRAM & İSTATİSTİKLER MODALİ ── */}
      <Modal transparent animationType="fade" visible={chartModalVisible} onRequestClose={() => setChartModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={[s.centerCard, { paddingBottom: 20 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>📊 Gelir & Gider İstatistikleri</Text>
              <TouchableOpacity onPress={() => setChartModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <Text style={s.sectionHeaderTxt}>Son 6 Ay Karşılaştırması</Text>
              <BarChart data={chartData} />

              <View style={{ marginTop: 14, gap: 6 }}>
                {chartData.map((d, i) => (
                  <View key={i} style={ch.row}>
                    <Text style={ch.month}>{d.label}</Text>
                    <Text style={ch.inc}>+{(d.income||0).toLocaleString('tr-TR', {maximumFractionDigits:0})}</Text>
                    <Text style={ch.exp}>-{(d.expense||0).toLocaleString('tr-TR', {maximumFractionDigits:0})}</Text>
                    <Text style={[ch.net, {color: d.income-d.expense>=0 ? '#2E7D32' : RED}]}>
                      {d.income-d.expense>=0?'+':''}{(d.income-d.expense).toLocaleString('tr-TR', {maximumFractionDigits:0})}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Kategori Bazlı Dağılım */}
              <Text style={[s.sectionHeaderTxt, { marginTop: 20 }]}>
                {filterMonth === -1 ? `${filterYear} Yılı` : MONTHS_FULL[filterMonth]} Harcama Dağılımı
              </Text>
              {categoryStats.length === 0 ? (
                <Text style={{ color: '#888', fontStyle: 'italic', paddingVertical: 10 }}>Bu dönemde harcama bulunamadı.</Text>
              ) : (
                categoryStats.map((cs, idx) => (
                  <View key={idx} style={csStyle.row}>
                    <View style={csStyle.top}>
                      <Text style={csStyle.title}>{cs.title}</Text>
                      <Text style={csStyle.amt}>{fmt(cs.amount)} (%{cs.percent.toFixed(1)})</Text>
                    </View>
                    <View style={csStyle.barBg}>
                      <View style={[csStyle.barFill, { width: `${Math.min(100, Math.max(4, cs.percent))}%` }]} />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MENÜ (3 NOKTA) ── */}
      <Modal transparent animationType="fade" visible={menuVisible} onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={s.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={s.menuBox}>
            {[
              { label:'Dönem Değiştir', icon:'📅', onPress:()=>{ setMenuVisible(false); setPeriodModalVisible(true); } },
              { label:'Hesap Değiştir', icon:'🏦', onPress:()=>{ setMenuVisible(false); setAccountModalVisible(true); } },
              { label:'Sabit & Tekrarlayan İşlemler', icon:'🔁', onPress:()=>{ setMenuVisible(false); setRecurringModalVisible(true); } },
              { label:'Kategori Bütçe Hedefleri', icon:'🎯', onPress:()=>{ setMenuVisible(false); setBudgetModalVisible(true); } },
              { label:'Kategori Yönetimi', icon:'🏷️', onPress:()=>{ setMenuVisible(false); setCategoryModalVisible(true); } },
              { label:'Kur Değiştir', icon:'💱', onPress:()=>{ setMenuVisible(false); setCurrencyModalVisible(true); } },
              { label:'Raporla & Dışa Aktar', icon:'📊', onPress:()=>{ setMenuVisible(false); setReportModalVisible(true); } },
              { label:'Yedekleme & Bulut Senkron', icon:'☁️', onPress:()=>{ setMenuVisible(false); refreshBackupData(); setBackupModalVisible(true); } },
              { label:'PIN Güvenlik Kilidi', icon:'🔒', onPress:()=>{ setMenuVisible(false); setPinSettingsModalVisible(true); } },
              ...(pinEnabledState ? [{ label:'Ekranı Kilitle', icon:'🔐', onPress:()=>{ setMenuVisible(false); setPinLocked(true); } }] : []),
              { label:'Ayarlar', icon:'⚙️', onPress:()=>{ setMenuVisible(false); setAyarlarModalVisible(true); } },
              { label:'Kayıtları Sil', icon:'🗑️', onPress:handleClearAll },
              { label:'Hakkımızda', icon:'ℹ️', onPress:()=>{ setMenuVisible(false); setAboutModalVisible(true); } },
            ].map((item,i,arr)=>(
              <TouchableOpacity key={i} style={[s.menuItem, i<arr.length-1 && s.menuItemBorder]} onPress={item.onPress}>
                <Text style={s.menuItemTxt}>{item.icon} {item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── DÖNEM SEÇİCİ MODALİ ── */}
      <PeriodModal
        visible={periodModalVisible}
        currentYear={filterYear}
        currentMonth={filterMonth}
        onClose={() => setPeriodModalVisible(false)}
        onSelect={(y, m) => { setFilterYear(y); setFilterMonth(m); }}
      />

      {/* ── HESAP DEĞİŞTİR ── */}
      <Modal transparent animationType="fade" visible={accountModalVisible} onRequestClose={() => setAccountModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Hesap Değiştir</Text>
              <TouchableOpacity onPress={() => setAccountModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.accOpt, selectedAccountId==='all' && s.accOptActive]}
              onPress={async()=>{ setSelectedAccountId('all'); await setActiveAccountId('all'); setAccountModalVisible(false); }}>
              <Text style={[s.accOptTxt, { flex: 1 }]}>🌐 Tüm Hesaplar</Text>
              <Text style={[s.accOptBalance, { color: balance >= 0 ? GREEN : RED }]}>{fmt(balance)}</Text>
              {selectedAccountId==='all' && <Text style={s.accOptCheck}>✓</Text>}
            </TouchableOpacity>
            {accounts.map(acc=>(
              <View key={acc.id} style={{flexDirection:'row', alignItems:'center', gap: 6}}>
                <TouchableOpacity style={[s.accOpt, {flex:1}, selectedAccountId===acc.id && s.accOptActive]}
                  onPress={async()=>{ setSelectedAccountId(acc.id); await setActiveAccountId(acc.id); setAccountModalVisible(false); }}>
                  <Text style={[s.accOptTxt, { flex: 1 }]}>{acc.icon} {acc.name}</Text>
                  <Text style={[s.accOptBalance, { color: (accountBalances[acc.id] || 0) >= 0 ? GREEN : RED }]}>
                    {fmt(accountBalances[acc.id] || 0)}
                  </Text>
                  {selectedAccountId===acc.id && <Text style={s.accOptCheck}>✓</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAccount(acc.id, acc.name)} style={s.delAccIcon}>
                  <Text style={{color: '#999', fontSize: 13}}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.newAccBtn} onPress={()=>{ setAccountModalVisible(false); setNewAccountModalVisible(true); }}>
              <Text style={s.newAccBtnTxt}>+ Yeni Hesap Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── YENİ HESAP EKLE ── */}
      <Modal transparent animationType="slide" visible={newAccountModalVisible} onRequestClose={() => setNewAccountModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Yeni Hesap Oluştur</Text>
              <TouchableOpacity onPress={() => setNewAccountModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={s.fLabel}>Hesap Adı</Text>
            <TextInput style={s.txtInput} placeholder="Örn: Birikim Hesabı, Şirket Kartı..." placeholderTextColor="#AAA" value={newAccountName} onChangeText={setNewAccountName} />
            <Text style={s.fLabel}>Simge Seçin</Text>
            <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:6}}>
              {['💵','🏦','💳','🪙','💰','💼','🛒','📈','🏠','🚗'].map(ic=>(
                <TouchableOpacity key={ic} style={[s.iconBtn, newAccountIcon===ic && s.iconBtnActive]} onPress={()=>setNewAccountIcon(ic)}>
                  <Text style={{fontSize:22}}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.formBtns}>
              <TouchableOpacity style={s.btnVazgec} onPress={() => setNewAccountModalVisible(false)}><Text style={s.btnVazgecTxt}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnKaydet,{backgroundColor:GREEN}]} onPress={handleCreateAccount}><Text style={s.btnKaydetTxt}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── KATEGORİ YÖNETİMİ ── */}
      <Modal transparent animationType="fade" visible={categoryModalVisible} onRequestClose={() => setCategoryModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={[s.centerCard, { maxHeight: '85%' }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>🏷️ Kategori Yönetimi</Text>
              <TouchableOpacity onPress={() => setCategoryModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={catM.sectionHeader}>
                <Text style={catM.sectionTitle}>GİDER KATEGORİLERİ</Text>
                <TouchableOpacity onPress={() => { setNewCategoryType('gider'); setNewCategoryName(''); setNewCategoryModalVisible(true); }}>
                  <Text style={catM.addBtnTxt}>+ Ekle</Text>
                </TouchableOpacity>
              </View>
              {categories.gider.map((c, i) => (
                <View key={i} style={catM.itemRow}>
                  <Text style={catM.itemName}>{c}</Text>
                  <TouchableOpacity onPress={() => handleDeleteCategorySubmit('gider', c)}>
                    <Text style={catM.delTxt}>Sil</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={[catM.sectionHeader, { marginTop: 16 }]}>
                <Text style={catM.sectionTitle}>GELİR KATEGORİLERİ</Text>
                <TouchableOpacity onPress={() => { setNewCategoryType('gelir'); setNewCategoryName(''); setNewCategoryModalVisible(true); }}>
                  <Text style={catM.addBtnTxt}>+ Ekle</Text>
                </TouchableOpacity>
              </View>
              {categories.gelir.map((c, i) => (
                <View key={i} style={catM.itemRow}>
                  <Text style={catM.itemName}>{c}</Text>
                  <TouchableOpacity onPress={() => handleDeleteCategorySubmit('gelir', c)}>
                    <Text style={catM.delTxt}>Sil</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── YENİ KATEGORİ EKLEME POPUP ── */}
      <Modal transparent animationType="slide" visible={newCategoryModalVisible} onRequestClose={() => setNewCategoryModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Yeni {newCategoryType === 'gelir' ? 'Gelir' : 'Gider'} Kategorisi</Text>
              <TouchableOpacity onPress={() => setNewCategoryModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={s.fLabel}>Kategori Adı</Text>
            <TextInput
              style={s.txtInput}
              placeholder="Örn: Evcil Hayvan, Abonelikler..."
              placeholderTextColor="#AAA"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <View style={s.formBtns}>
              <TouchableOpacity style={s.btnVazgec} onPress={() => setNewCategoryModalVisible(false)}><Text style={s.btnVazgecTxt}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnKaydet,{backgroundColor:GREEN}]} onPress={handleAddCategorySubmit}><Text style={s.btnKaydetTxt}>Ekle</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── KUR DEĞİŞTİR ── */}
      <Modal transparent animationType="fade" visible={currencyModalVisible} onRequestClose={() => setCurrencyModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Para Birimi Seçin</Text>
              <TouchableOpacity onPress={() => setCurrencyModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>
            {CURRENCIES.map(cur=>(
              <TouchableOpacity key={cur.code} style={[s.accOpt, currency.code===cur.code && s.accOptActive]}
                onPress={async()=>{ await setCurrency(cur); setCurrencyState(cur); setCurrencyModalVisible(false); }}>
                <Text style={s.accOptTxt}>{cur.symbol} {cur.name}</Text>
                {currency.code===cur.code && <Text style={s.accOptCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ── RAPORLA ── */}
      <Modal transparent animationType="fade" visible={reportModalVisible} onRequestClose={() => { setReportModalVisible(false); setReportMethodOpen(false); setReportAccountOpen(false); }}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <Text style={s.reportTitle}>Raporla & Dışa Aktar</Text>
            <Text style={s.fLabel}>Hesap</Text>
            <TouchableOpacity style={s.reportDropRow} onPress={() => { setReportAccountOpen(!reportAccountOpen); setReportMethodOpen(false); }}>
              <Text style={s.reportDropVal}>
                {reportAccountId==='all' ? '🌐 Tüm Hesaplar' : `${accounts.find(a=>a.id===reportAccountId)?.icon || '💳'} ${accounts.find(a=>a.id===reportAccountId)?.name || ''}`}
              </Text>
              <Text style={s.reportDropArrow}>{reportAccountOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {reportAccountOpen && (
              <View style={s.reportMethodList}>
                <TouchableOpacity
                  style={[s.methodItem, s.methodItemBorder, reportAccountId==='all' && { backgroundColor: '#E8F5E9' }]}
                  onPress={() => { setReportAccountId('all'); setReportAccountOpen(false); }}>
                  <Text style={[s.methodItemTxt, reportAccountId==='all' && { fontWeight: '700' }]}>🌐 Tüm Hesaplar</Text>
                </TouchableOpacity>
                {accounts.map((acc, i, arr) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[s.methodItem, i < arr.length - 1 && s.methodItemBorder, reportAccountId===acc.id && { backgroundColor: '#E8F5E9' }]}
                    onPress={() => { setReportAccountId(acc.id); setReportAccountOpen(false); }}>
                    <Text style={[s.methodItemTxt, reportAccountId===acc.id && { fontWeight: '700' }]}>{acc.icon} {acc.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <ReportDateRow label="Başlangıç" value={reportStart} onChange={setReportStart} />
            <ReportDateRow label="Bitiş" value={reportEnd} onChange={setReportEnd} />
            <Text style={s.fLabel}>Çıktı Formatı</Text>
            <TouchableOpacity style={s.reportDropRow} onPress={() => { setReportMethodOpen(!reportMethodOpen); setReportAccountOpen(false); }}>
              <Text style={s.reportDropVal}>Seçiniz...</Text>
              <Text style={s.reportDropArrow}>{reportMethodOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {reportMethodOpen && (
              <View style={s.reportMethodList}>
                {[
                  {label:'📄 PDF Belgesi Olarak Gör (İncele)', action:'PDF Belge İncele'},
                  {label:'📊 Excel Tablo Olarak Gör (İncele)', action:'Excel Tablo İncele'},
                  {label:'📄 (.pdf) PDF olarak kaydet', action:'PDF Kaydet'},
                  {label:'📄 (.pdf) PDF mail gönder', action:'PDF Mail'},
                  {label:'📊 (.xls) Excel olarak kaydet', action:'XLS Kaydet'},
                  {label:'📊 (.xls) Excel mail gönder', action:'XLS Mail'},
                ].map((item,i,arr)=>(
                  <TouchableOpacity key={i} style={[s.methodItem, i<arr.length-1 && s.methodItemBorder]} onPress={()=>handleReportAction(item.action)}>
                    <Text style={[s.methodItemTxt, (item.action.includes('İncele')) && { fontWeight: '700' }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={[s.btnVazgec,{marginTop:16}]} onPress={() => { setReportModalVisible(false); setReportMethodOpen(false); setReportAccountOpen(false); }}>
              <Text style={s.btnVazgecTxt}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── YEDEKLEME VE GERİ YÜKLEME (BULUT, OTOMATİK LOKAL & JSON) ── */}
      <Modal transparent animationType="fade" visible={backupModalVisible} onRequestClose={() => setBackupModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={[s.centerCard, { maxHeight: '90%', paddingBottom: 16 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>💾 Yedekleme & Bulut</Text>
              <TouchableOpacity onPress={() => setBackupModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>

            {/* TAB SEÇİCİ */}
            <View style={bkStyle.tabContainer}>
              <TouchableOpacity
                style={[bkStyle.tabBtn, backupActiveTab === 'cloud' && bkStyle.tabBtnActive]}
                onPress={() => setBackupActiveTab('cloud')}>
                <Text style={[bkStyle.tabTxt, backupActiveTab === 'cloud' && bkStyle.tabTxtActive]}>☁️ Google Drive</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bkStyle.tabBtn, backupActiveTab === 'auto' && bkStyle.tabBtnActive]}
                onPress={() => setBackupActiveTab('auto')}>
                <Text style={[bkStyle.tabTxt, backupActiveTab === 'auto' && bkStyle.tabTxtActive]}>
                  💾 Lokal ({autoBackupsList.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[bkStyle.tabBtn, backupActiveTab === 'json' && bkStyle.tabBtnActive]}
                onPress={() => setBackupActiveTab('json')}>
                <Text style={[bkStyle.tabTxt, backupActiveTab === 'json' && bkStyle.tabTxtActive]}>📋 JSON Metin</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
              {/* TAB 1: GOOGLE DRIVE & BULUT */}
              {backupActiveTab === 'cloud' && (
                <View style={{ gap: 12, paddingTop: 4 }}>
                  <View style={bkStyle.cloudBanner}>
                    <Text style={bkStyle.cloudBannerTitle}>☁️ Google Drive & Bulut Yedekleme</Text>
                    <Text style={bkStyle.cloudBannerSubtitle}>
                      {lastCloudBackup
                        ? `Son Bulut Yedeği: ${lastCloudBackup}`
                        : 'Henüz Google Drive veya buluta yedek alınmadı.'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[s.btnKaydet, { backgroundColor: '#1B5E20', paddingVertical: 14 }]}
                    onPress={handleCloudExport}
                    disabled={backupLoading}>
                    <Text style={[s.btnKaydetTxt, { fontSize: 14 }]}>
                      {backupLoading ? '⏳ Hazırlanıyor...' : '📤 Google Drive\'a / Buluta Yedekle'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.btnKaydet, { backgroundColor: '#1565C0', paddingVertical: 14 }]}
                    onPress={handleCloudImport}
                    disabled={backupLoading}>
                    <Text style={[s.btnKaydetTxt, { fontSize: 14 }]}>
                      {backupLoading ? '⏳ Dosya Seçiliyor...' : '📥 Google Drive / Dosyadan Yükle'}
                    </Text>
                  </TouchableOpacity>

                  <View style={bkStyle.infoBox}>
                    <Text style={bkStyle.infoBoxTitle}>💡 Nasıl Çalışır?</Text>
                    <Text style={bkStyle.infoBoxTxt}>
                      • <Text style={{ fontWeight: 'bold' }}>Yedekle:</Text> Veritabanınızı tek tıkla standart .json formatında dışa aktarır. Açılan sistem paylaşım menüsünden doğrudan Google Drive klasörünüze kaydedebilir veya WhatsApp / Mail ile gönderebilirsiniz.
                    </Text>
                    <Text style={[bkStyle.infoBoxTxt, { marginTop: 4 }]}>
                      • <Text style={{ fontWeight: 'bold' }}>Geri Yükle:</Text> Cihazınızdaki veya Google Drive'ınızdaki .json yedeğini seçerek tüm hesap ve işlemlerinizi anında geri yükler.
                    </Text>
                  </View>
                </View>
              )}

              {/* TAB 2: OTOMATİK LOKAL SNAPSHOTLAR */}
              {backupActiveTab === 'auto' && (
                <View style={{ gap: 10, paddingTop: 4 }}>
                  <View style={bkStyle.autoHeaderBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={bkStyle.liveDot} />
                      <Text style={bkStyle.autoHeaderTitle}>Otomatik Lokal Snapshot Koruması</Text>
                    </View>
                    <Text style={bkStyle.autoHeaderSubtitle}>
                      Hesabım, yaptığınız her işlemde verilerinizin son 10 anlık durumunu otomatik olarak depolar.
                    </Text>
                  </View>

                  {autoBackupsList.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', paddingVertical: 20 }}>
                      Henüz otomatik yedek kaydı bulunmuyor.
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {autoBackupsList.map((snap, idx) => (
                        <View key={snap.id || idx} style={bkStyle.snapRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={bkStyle.snapDate}>🕒 {snap.dateStr}</Text>
                            <Text style={bkStyle.snapInfo}>
                              {snap.txCount} İşlem · {snap.accCount} Hesap
                              {idx === 0 ? ' (En Son Durum)' : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={bkStyle.snapRestoreBtn}
                            onPress={() => handleRestoreAutoSnapshot(snap)}>
                            <Text style={bkStyle.snapRestoreTxt}>Geri Dön</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 3: JSON METİN */}
              {backupActiveTab === 'json' && (
                <View style={{ gap: 10, paddingTop: 4 }}>
                  <Text style={{ fontSize: 13, color: '#666' }}>
                    Yedek verisini doğrudan metin olarak kopyalayabilir veya yapıştırarak geri yükleyebilirsiniz.
                  </Text>

                  <TouchableOpacity
                    style={[s.btnKaydet, { backgroundColor: GREEN }]}
                    onPress={handleGenerateBackup}>
                    <Text style={s.btnKaydetTxt}>📤 JSON Yedek Metni Oluştur & Paylaş</Text>
                  </TouchableOpacity>

                  <Text style={[s.fLabel, { marginTop: 6 }]}>Yedek Kodu (Geri Yüklemek İçin Yapıştırın)</Text>
                  <TextInput
                    style={[s.txtInput, { height: 80, textAlignVertical: 'top', backgroundColor: '#FAFAFA', borderRadius: 4, padding: 8 }]}
                    placeholder="JSON yedek metnini buraya yapıştırın..."
                    placeholderTextColor="#AAA"
                    multiline
                    value={backupJsonText}
                    onChangeText={setBackupJsonText}
                  />

                  <TouchableOpacity
                    style={[s.btnKaydet, { backgroundColor: '#1565C0', marginTop: 4 }]}
                    onPress={handleRestoreBackup}>
                    <Text style={s.btnKaydetTxt}>📥 Metinden Geri Yükle</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={[s.btnVazgec, { marginTop: 14 }]} onPress={() => setBackupModalVisible(false)}>
              <Text style={s.btnVazgecTxt}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PIN GÜVENLİK AYARLARI ── */}
      <Modal transparent animationType="fade" visible={pinSettingsModalVisible} onRequestClose={() => setPinSettingsModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>🔒 PIN Güvenlik Kilidi</Text>
              <TouchableOpacity onPress={() => setPinSettingsModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#222' }}>PIN Korumasını Aç</Text>
              <TouchableOpacity
                style={[s.toggleBtn, pinEnabledState && s.toggleBtnActive]}
                onPress={() => setPinEnabledState(!pinEnabledState)}>
                <View style={[s.toggleKnob, pinEnabledState && s.toggleKnobActive]} />
              </TouchableOpacity>
            </View>

            {pinEnabledState && (
              <View style={{ marginTop: 8 }}>
                <Text style={s.fLabel}>4 Haneli Yeni PIN Kodu</Text>
                <TextInput
                  style={[s.txtInput, { fontSize: 22, letterSpacing: 8, textAlign: 'center' }]}
                  placeholder="••••"
                  placeholderTextColor="#CCC"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  value={newPinInput}
                  onChangeText={setNewPinInput}
                />
              </View>
            )}

            <View style={s.formBtns}>
              <TouchableOpacity style={s.btnVazgec} onPress={() => setPinSettingsModalVisible(false)}><Text style={s.btnVazgecTxt}>Vazgeç</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnKaydet, { backgroundColor: GREEN }]} onPress={handleSavePinSettings}><Text style={s.btnKaydetTxt}>Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── AYARLAR ── */}
      <Modal transparent animationType="fade" visible={ayarlarModalVisible} onRequestClose={() => setAyarlarModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>⚙️ Ayarlar</Text>
              <TouchableOpacity onPress={() => setAyarlarModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {/* Para Birimi */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); setCurrencyModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>💱</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>Para Birimi</Text>
                  <Text style={ayr.settingSubtitle}>{currency.symbol} - {currency.name}</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>

              {/* Hesap Yönetimi */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); setAccountModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>🏦</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>Hesap Yönetimi</Text>
                  <Text style={ayr.settingSubtitle}>{accounts.length} Hesap ({selectedAccountId === 'all' ? 'Tüm Hesaplar Aktif' : accounts.find(a => a.id === selectedAccountId)?.name})</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>

              {/* Kategori Yönetimi */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); setCategoryModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>🏷️</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>Kategori Yönetimi</Text>
                  <Text style={ayr.settingSubtitle}>Gelir ve Gider Kategorilerini Özelleştir</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>

              {/* Yedekleme */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); refreshBackupData(); setBackupModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>☁️</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>Yedekleme & Bulut Senkron</Text>
                  <Text style={ayr.settingSubtitle}>Google Drive, Lokal Anlık & JSON</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>

              {/* PIN Kilidi */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); setPinSettingsModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>🔒</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>PIN Güvenlik Kilidi</Text>
                  <Text style={ayr.settingSubtitle}>{pinEnabledState ? 'Aktif (Korumalı)' : 'Devre Dışı'}</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>

              {/* Rapor ve Dışa Aktarma */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); setReportModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>📊</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>Raporlama ve Dışa Aktarma</Text>
                  <Text style={ayr.settingSubtitle}>PDF / Excel (.xls) Raporları</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>

              {/* Tüm Kayıtları Sil */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); handleClearAll(); }}>
                <View style={[ayr.settingIconBox, { backgroundColor: '#FFEBEE' }]}><Text style={ayr.settingIcon}>🗑️</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={[ayr.settingTitle, { color: RED }]}>Tüm Kayıtları Sıfırla</Text>
                  <Text style={ayr.settingSubtitle}>Tüm gelir ve gider geçmişini sil</Text>
                </View>
                <Text style={[ayr.settingArrow, { color: RED }]}>›</Text>
              </TouchableOpacity>

              {/* Hakkında */}
              <TouchableOpacity style={ayr.settingRow} onPress={() => { setAyarlarModalVisible(false); setAboutModalVisible(true); }}>
                <View style={ayr.settingIconBox}><Text style={ayr.settingIcon}>ℹ️</Text></View>
                <View style={ayr.settingTexts}>
                  <Text style={ayr.settingTitle}>Uygulama Bilgisi</Text>
                  <Text style={ayr.settingSubtitle}>v1.0.0 · Geliştirici: Nihat Yazgan</Text>
                </View>
                <Text style={ayr.settingArrow}>›</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={[s.btnVazgec, { marginTop: 16 }]} onPress={() => setAyarlarModalVisible(false)}>
              <Text style={s.btnVazgecTxt}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── HAKKIMIZDA ── */}
      <Modal transparent animationType="fade" visible={aboutModalVisible} onRequestClose={() => setAboutModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Hakkımızda</Text>
              <TouchableOpacity onPress={() => setAboutModalVisible(false)}><Text style={s.cardClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={s.aboutEmoji}>💰</Text>
            <Text style={s.aboutApp}>Hesabım</Text>
            <Text style={s.aboutVer}>Sürüm 1.0.0</Text>
            <View style={s.aboutDivider} />
            <Text style={s.aboutDevLabel}>Geliştirici</Text>
            <Text style={s.aboutDevName}>Nihat Yazgan</Text>
            <View style={s.aboutDivider} />
            <Text style={s.aboutDesc}>Kişisel gelir ve gider takibi, bütçe yönetimi ve raporlama uygulaması.</Text>
            <TouchableOpacity style={[s.btnKaydet,{backgroundColor:GREEN,marginTop:16}]}
              onPress={() => Alert.alert('Güncelleme','Uygulamanız en güncel sürümdedir! (v1.0.0)')}>
              <Text style={s.btnKaydetTxt}>🔄 Güncelleme Kontrolü</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── RAPOR DETAYLI İNCELEME (EXCEL & PDF - BİREBİR ORİJİNAL ÇIKTI TASARIMI) ── */}
      <Modal transparent={false} animationType="slide" visible={previewModalVisible} onRequestClose={() => setPreviewModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
          {/* Header */}
          <View style={[rpt.header, { backgroundColor: previewType === 'excel' ? '#1E7145' : '#333333' }]}>
            <TouchableOpacity style={rpt.headerBack} onPress={() => setPreviewModalVisible(false)}>
              <Text style={rpt.headerBackTxt}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={rpt.headerTitle}>
                {previewType === 'excel' ? '📊 Excel Tablo Raporu (.xls)' : '📄 PDF Belge Raporu (.pdf)'}
              </Text>
              <Text style={rpt.headerSub}>
                {previewData ? `${previewData.start} – ${previewData.end} · ${previewData.accLabel}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={rpt.headerMailBtn}
              onPress={async () => {
                if (!previewData) return;
                if (previewType === 'pdf') {
                  const pdfUri = await exportReportToPdf({
                    transactions: previewData.txs,
                    accounts,
                    accountLabel: previewData.accLabel,
                    startDate: previewData.start,
                    endDate: previewData.end,
                    currencySymbol: previewData.currencySymbol
                  });
                  if (pdfUri) {
                    await sharePdfFile(pdfUri, 'Hesabım PDF Raporunu Paylaş');
                  }
                } else {
                  const excelUri = await exportReportToExcel({
                    transactions: previewData.txs,
                    accounts,
                    accountLabel: previewData.accLabel,
                    startDate: previewData.start,
                    endDate: previewData.end,
                    currencySymbol: previewData.currencySymbol
                  });
                  if (excelUri) {
                    await shareExcelFile(excelUri, 'Hesabım Excel Raporunu Paylaş');
                  }
                }
              }}>
              <Text style={rpt.headerMailTxt}>📤 Paylaş</Text>
            </TouchableOpacity>
          </View>

          {/* EXCEL ÇOKLU SAYFA SEKMELERİ (Bakiye | Gelir Tablosu | Gider Tablosu) */}
          {previewType === 'excel' && (
            <View style={xlsTabs.tabBar}>
              {['Bakiye', 'Gelir Tablosu', 'Gider Tablosu'].map(tabName => (
                <TouchableOpacity
                  key={tabName}
                  style={[xlsTabs.tabBtn, excelActiveSheet === tabName && xlsTabs.tabBtnActive]}
                  onPress={() => setExcelActiveSheet(tabName)}>
                  <Text style={[xlsTabs.tabTxt, excelActiveSheet === tabName && xlsTabs.tabTxtActive]}>
                    {tabName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* İÇERİK: EXCEL VEYA PDF GÖRÜNÜMÜ */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 30 }} showsVerticalScrollIndicator={true}>
            {previewData && (
              previewType === 'excel' ? (
                /* EXCEL SPREADSHEET GÖRÜNÜMÜ (Birebir Excel Sayfaları) */
                <View style={xlsGrid.container}>
                  {excelActiveSheet === 'Bakiye' && (
                    <View>
                      <View style={xlsGrid.row}>
                        <Text style={[xlsGrid.headerCell, { width: 100 }]}>Gelir ({previewData.currencySymbol || 'TL'})</Text>
                        <Text style={[xlsGrid.headerCell, { width: 100 }]}>Gider ({previewData.currencySymbol || 'TL'})</Text>
                        <Text style={[xlsGrid.headerCell, { width: 110 }]}>Bakiye ({previewData.currencySymbol || 'TL'})</Text>
                      </View>
                      <View style={xlsGrid.row}>
                        <Text style={[xlsGrid.cell, { width: 100 }]}>{previewData.inc.toFixed(2)}</Text>
                        <Text style={[xlsGrid.cell, { width: 100 }]}>{previewData.exp.toFixed(2)}</Text>
                        <Text style={[xlsGrid.cell, { width: 110, fontWeight: '700', color: previewData.balance >= 0 ? '#1B5E20' : RED }]}>
                          {(previewData.balance).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  )}

                  {excelActiveSheet === 'Gelir Tablosu' && (
                    <View>
                      <View style={xlsGrid.row}>
                        <Text style={[xlsGrid.headerCell, { width: 85 }]}>Tür</Text>
                        <Text style={[xlsGrid.headerCell, { width: 95 }]}>Miktar ({previewData.currencySymbol || 'TL'})</Text>
                        <Text style={[xlsGrid.headerCell, { width: 95 }]}>Tarih</Text>
                        <Text style={[xlsGrid.headerCell, { flex: 1, minWidth: 120 }]}>Not</Text>
                      </View>
                      {previewData.txs.filter(t => t.type === 'gelir').length === 0 ? (
                        <View style={xlsGrid.row}>
                          <Text style={[xlsGrid.cell, { width: 85 }]}>-</Text>
                          <Text style={[xlsGrid.cell, { width: 95 }]}>0</Text>
                          <Text style={[xlsGrid.cell, { width: 95 }]}>-</Text>
                          <Text style={[xlsGrid.cell, { flex: 1 }]}>Kayıt yok</Text>
                        </View>
                      ) : (
                        previewData.txs.filter(t => t.type === 'gelir').map((t, idx) => (
                          <View key={idx} style={xlsGrid.row}>
                            <Text style={[xlsGrid.cell, { width: 85 }]}>{t.title}</Text>
                            <Text style={[xlsGrid.cell, { width: 95 }]}>{parseFloat(t.amount).toFixed(2)}</Text>
                            <Text style={[xlsGrid.cell, { width: 95 }]}>{formatReportDate(t.date)}</Text>
                            <Text style={[xlsGrid.cell, { flex: 1 }]}>{t.note || ''}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}

                  {excelActiveSheet === 'Gider Tablosu' && (
                    <View>
                      <View style={xlsGrid.row}>
                        <Text style={[xlsGrid.headerCell, { width: 85 }]}>Tür</Text>
                        <Text style={[xlsGrid.headerCell, { width: 95 }]}>Miktar ({previewData.currencySymbol || 'TL'})</Text>
                        <Text style={[xlsGrid.headerCell, { width: 95 }]}>Tarih</Text>
                        <Text style={[xlsGrid.headerCell, { flex: 1, minWidth: 120 }]}>Not</Text>
                      </View>
                      {previewData.txs.filter(t => t.type === 'gider').length === 0 ? (
                        <View style={xlsGrid.row}>
                          <Text style={[xlsGrid.cell, { width: 85 }]}>-</Text>
                          <Text style={[xlsGrid.cell, { width: 95 }]}>0</Text>
                          <Text style={[xlsGrid.cell, { width: 95 }]}>-</Text>
                          <Text style={[xlsGrid.cell, { flex: 1 }]}>Kayıt yok</Text>
                        </View>
                      ) : (
                        previewData.txs.filter(t => t.type === 'gider').map((t, idx) => (
                          <View key={idx} style={xlsGrid.row}>
                            <Text style={[xlsGrid.cell, { width: 85 }]}>{t.title}</Text>
                            <Text style={[xlsGrid.cell, { width: 95 }]}>{parseFloat(t.amount).toFixed(2)}</Text>
                            <Text style={[xlsGrid.cell, { width: 95 }]}>{formatReportDate(t.date)}</Text>
                            <Text style={[xlsGrid.cell, { flex: 1 }]}>{t.note || ''}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              ) : (
                /* PDF BELGESİ KAĞIT GÖRÜNÜMÜ */
                <View style={pdfDoc.paper}>
                  {/* Başlık Satırı */}
                  <View style={pdfDoc.headerRow}>
                    <Text style={pdfDoc.headerLeft}>
                      Hesabım ({previewData.accLabel})
                    </Text>
                    <Text style={pdfDoc.headerRight}>
                      {formatReportDate(previewData.start)}-{formatReportDate(previewData.end)}
                    </Text>
                  </View>

                  {/* Özet Tablosu */}
                  <View style={pdfDoc.table}>
                    <View style={pdfDoc.tableHeadRow}>
                      <Text style={[pdfDoc.th, { flex: 1 }]}>Gelir ({previewData.currencySymbol || 'TL'})</Text>
                      <Text style={[pdfDoc.th, { flex: 1 }]}>Gider ({previewData.currencySymbol || 'TL'})</Text>
                      <Text style={[pdfDoc.th, { flex: 1 }]}>Bakiye ({previewData.currencySymbol || 'TL'})</Text>
                    </View>
                    <View style={pdfDoc.tableRow}>
                      <Text style={[pdfDoc.td, { flex: 1 }]}>{previewData.inc.toFixed(2)}</Text>
                      <Text style={[pdfDoc.td, { flex: 1 }]}>{previewData.exp.toFixed(2)}</Text>
                      <Text style={[pdfDoc.td, { flex: 1 }]}>{(previewData.balance).toFixed(2)}</Text>
                    </View>
                  </View>

                  {/* Gelir Tablosu */}
                  <Text style={pdfDoc.sectionTitle}>Gelir Tablosu</Text>
                  <View style={pdfDoc.table}>
                    <View style={pdfDoc.tableHeadRow}>
                      <Text style={[pdfDoc.th, { width: 80 }]}>Tür</Text>
                      <Text style={[pdfDoc.th, { width: 85 }]}>Miktar ({previewData.currencySymbol || 'TL'})</Text>
                      <Text style={[pdfDoc.th, { width: 90 }]}>Tarih</Text>
                      <Text style={[pdfDoc.th, { flex: 1 }]}>Not</Text>
                    </View>
                    {previewData.txs.filter(t => t.type === 'gelir').length === 0 ? (
                      <View style={pdfDoc.tableRow}>
                        <Text style={[pdfDoc.td, { width: 80 }]}>-</Text>
                        <Text style={[pdfDoc.td, { width: 85 }]}>0</Text>
                        <Text style={[pdfDoc.td, { width: 90 }]}>-</Text>
                        <Text style={[pdfDoc.td, { flex: 1 }]}>Kayıt yok</Text>
                      </View>
                    ) : (
                      previewData.txs.filter(t => t.type === 'gelir').map((t, idx) => (
                        <View key={idx} style={pdfDoc.tableRow}>
                          <Text style={[pdfDoc.td, { width: 80 }]}>{t.title}</Text>
                          <Text style={[pdfDoc.td, { width: 85 }]}>{parseFloat(t.amount).toFixed(2)}</Text>
                          <Text style={[pdfDoc.td, { width: 90 }]}>{formatReportDate(t.date)}</Text>
                          <Text style={[pdfDoc.td, { flex: 1 }]}>{t.note || ''}</Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Gider Tablosu */}
                  <Text style={pdfDoc.sectionTitle}>Gider Tablosu</Text>
                  <View style={pdfDoc.table}>
                    <View style={pdfDoc.tableHeadRow}>
                      <Text style={[pdfDoc.th, { width: 80 }]}>Tür</Text>
                      <Text style={[pdfDoc.th, { width: 85 }]}>Miktar ({previewData.currencySymbol || 'TL'})</Text>
                      <Text style={[pdfDoc.th, { width: 90 }]}>Tarih</Text>
                      <Text style={[pdfDoc.th, { flex: 1 }]}>Not</Text>
                    </View>
                    {previewData.txs.filter(t => t.type === 'gider').length === 0 ? (
                      <View style={pdfDoc.tableRow}>
                        <Text style={[pdfDoc.td, { width: 80 }]}>-</Text>
                        <Text style={[pdfDoc.td, { width: 85 }]}>0</Text>
                        <Text style={[pdfDoc.td, { width: 90 }]}>-</Text>
                        <Text style={[pdfDoc.td, { flex: 1 }]}>Kayıt yok</Text>
                      </View>
                    ) : (
                      previewData.txs.filter(t => t.type === 'gider').map((t, idx) => (
                        <View key={idx} style={pdfDoc.tableRow}>
                          <Text style={[pdfDoc.td, { width: 80 }]}>{t.title}</Text>
                          <Text style={[pdfDoc.td, { width: 85 }]}>{parseFloat(t.amount).toFixed(2)}</Text>
                          <Text style={[pdfDoc.td, { width: 90 }]}>{formatReportDate(t.date)}</Text>
                          <Text style={[pdfDoc.td, { flex: 1 }]}>{t.note || ''}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )
            )}
          </ScrollView>

          {/* Alt Kapat / İlet Butonları */}
          <View style={rpt.footer}>
            <TouchableOpacity style={rpt.footerCloseBtn} onPress={() => setPreviewModalVisible(false)}>
              <Text style={rpt.footerCloseTxt}>Kapat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[rpt.footerExportBtn, { backgroundColor: previewType === 'excel' ? '#1E7145' : '#D32F2F' }]}
              onPress={async () => {
                if (!previewData) return;
                if (previewType === 'pdf') {
                  const pdfUri = await exportReportToPdf({
                    transactions: previewData.txs,
                    accounts,
                    accountLabel: previewData.accLabel,
                    startDate: previewData.start,
                    endDate: previewData.end,
                    currencySymbol: previewData.currencySymbol
                  });
                  if (pdfUri) {
                    await sharePdfFile(pdfUri, 'Hesabım PDF Raporu');
                  } else {
                    Alert.alert('Hata', 'PDF dosyası oluşturulamadı.');
                  }
                } else {
                  const excelUri = await exportReportToExcel({
                    transactions: previewData.txs,
                    accounts,
                    accountLabel: previewData.accLabel,
                    startDate: previewData.start,
                    endDate: previewData.end,
                    currencySymbol: previewData.currencySymbol
                  });
                  if (excelUri) {
                    await shareExcelFile(excelUri, 'Hesabım Excel Raporu (.xls)');
                  } else {
                    Alert.alert('Hata', 'Excel dosyası oluşturulamadı.');
                  }
                }
              }}>
              <Text style={rpt.footerExportTxt}>
                {previewType === 'excel' ? '📊 Excel (.xls) Oluştur & Gönder' : '📄 PDF Oluştur & Gönder'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── TEKRARLAYAN İŞLEMLER & ABONELİKLER MODALI ── */}
      <Modal transparent animationType="fade" visible={recurringModalVisible} onRequestClose={() => setRecurringModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={[s.centerCard, { maxHeight: '90%', paddingBottom: 16 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>🔁 Sabit & Tekrarlayan İşlemler</Text>
              <TouchableOpacity onPress={() => setRecurringModalVisible(false)}>
                <Text style={s.cardClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Kira, maaş, aidat, internet, abonelik gibi her ay tekrarlayan işlemlerinizi kaydedin ve tek tıkla uygulayın.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {recurringList.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📌</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#555', textAlign: 'center' }}>
                    Henüz kayıtlı sabit işlem yok
                  </Text>
                  <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 4 }}>
                    Aşağıdaki "+ Yeni Sabit İşlem Ekle" butonuna basarak ekleyebilirsiniz.
                  </Text>
                </View>
              ) : (
                recurringList.map((item) => {
                  const acc = accounts.find(a => a.id === item.accountId);
                  const isInc = item.type === 'gelir';
                  return (
                    <View key={item.id} style={recStyle.itemCard}>
                      <View style={recStyle.itemLeft}>
                        <Text style={recStyle.itemTitle}>{item.title}</Text>
                        <Text style={recStyle.itemSub}>
                          {acc?.name || 'Hesap'} • Her ayın {item.day}. günü
                        </Text>
                        <Text style={[recStyle.itemAmount, { color: isInc ? '#2E7D32' : '#C62828' }]}>
                          {isInc ? '+' : '-'}{fmt(item.amount)}
                        </Text>
                      </View>
                      <View style={recStyle.itemActions}>
                        <TouchableOpacity
                          style={recStyle.applyBtn}
                          onPress={() => handleApplyRecurring(item)}>
                          <Text style={recStyle.applyBtnTxt}>⚡ Bu Ay Ekle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={recStyle.deleteBtn}
                          onPress={() => handleDeleteRecurring(item.id, item.title)}>
                          <Text style={recStyle.deleteBtnTxt}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={[s.newAccBtn, { marginTop: 14, backgroundColor: GREEN, borderColor: GREEN }]}
              onPress={() => {
                setNewRecTitle('');
                setNewRecAmount('');
                setNewRecType('gider');
                setNewRecDay('1');
                setNewRecAccountId(accounts[0]?.id || 'acc_nakit');
                setNewRecurringModalVisible(true);
              }}>
              <Text style={[s.newAccBtnTxt, { color: '#FFF' }]}>+ Yeni Sabit İşlem Ekle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── YENİ SABİT İŞLEM EKLEME MODALI ── */}
      <Modal transparent animationType="slide" visible={newRecurringModalVisible} onRequestClose={() => setNewRecurringModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>Yeni Sabit / Tekrarlayan İşlem</Text>
              <TouchableOpacity onPress={() => setNewRecurringModalVisible(false)}>
                <Text style={s.cardClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Tür Seçimi */}
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
              <TouchableOpacity
                style={[recStyle.typeTab, newRecType === 'gider' && { backgroundColor: '#C62828' }]}
                onPress={() => setNewRecType('gider')}>
                <Text style={[recStyle.typeTabTxt, newRecType === 'gider' && { color: '#FFF', fontWeight: '800' }]}>
                  🔴 Gider
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[recStyle.typeTab, newRecType === 'gelir' && { backgroundColor: '#2E7D32' }]}
                onPress={() => setNewRecType('gelir')}>
                <Text style={[recStyle.typeTabTxt, newRecType === 'gelir' && { color: '#FFF', fontWeight: '800' }]}>
                  🟢 Gelir
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fLabel}>Başlık / Açıklama</Text>
            <TextInput
              style={s.txtInput}
              placeholder="Örn: Ev Kirası, Maaş, Netflix, Aidat..."
              placeholderTextColor="#AAA"
              value={newRecTitle}
              onChangeText={setNewRecTitle}
            />

            <Text style={s.fLabel}>Tutar ({currency.symbol})</Text>
            <TextInput
              style={s.txtInput}
              placeholder="0.00"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={newRecAmount}
              onChangeText={setNewRecAmount}
            />

            <Text style={s.fLabel}>Hesap</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 4 }}>
              {accounts.map(acc => (
                <TouchableOpacity
                  key={acc.id}
                  style={[ts.accPill, newRecAccountId === acc.id && ts.accPillActive]}
                  onPress={() => setNewRecAccountId(acc.id)}>
                  <Text style={[ts.accPillTxt, newRecAccountId === acc.id && ts.accPillTxtActive]}>
                    {acc.icon} {acc.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.fLabel}>Her Ayın Hangi Günü? (1 - 31)</Text>
            <TextInput
              style={s.txtInput}
              placeholder="1"
              placeholderTextColor="#AAA"
              keyboardType="number-pad"
              value={newRecDay}
              onChangeText={setNewRecDay}
            />

            <View style={s.formBtns}>
              <TouchableOpacity style={s.btnVazgec} onPress={() => setNewRecurringModalVisible(false)}>
                <Text style={s.btnVazgecTxt}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnKaydet, { backgroundColor: GREEN }]} onPress={handleAddRecurringSubmit}>
                <Text style={s.btnKaydetTxt}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── KATEGORİ BÜTÇE HEDEFLERİ MODALI ── */}
      <Modal transparent animationType="fade" visible={budgetModalVisible} onRequestClose={() => setBudgetModalVisible(false)}>
        <View style={s.modalWrap}>
          <View style={[s.centerCard, { maxHeight: '90%', paddingBottom: 16 }]}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>🎯 Kategori Bütçe Hedefleri</Text>
              <TouchableOpacity onPress={() => setBudgetModalVisible(false)}>
                <Text style={s.cardClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Harcama kategorilerinize aylık limit belirleyin, harcamalarınızı kontrol altında tutun.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {categories.gider.map(catName => {
                const bgt = budgets[catName] || 0;
                const currentSpent = transactions
                  .filter(t => {
                    if (t.type !== 'gider' || t.title !== catName) return false;
                    const d = new Date(t.date);
                    return filterMonth === -1
                      ? d.getFullYear() === filterYear
                      : d.getFullYear() === filterYear && d.getMonth() === filterMonth;
                  })
                  .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

                const percent = bgt > 0 ? (currentSpent / bgt) * 100 : 0;
                const isExceeded = bgt > 0 && currentSpent > bgt;
                const isWarning = bgt > 0 && percent >= 75 && !isExceeded;

                return (
                  <View key={catName} style={bgtStyle.card}>
                    <View style={bgtStyle.topRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={bgtStyle.catName}>{catName}</Text>
                        <Text style={bgtStyle.spentTxt}>
                          Bu ay harcanan: <Text style={{ fontWeight: '800', color: '#222' }}>{fmt(currentSpent)}</Text>
                        </Text>
                      </View>

                      {bgt > 0 ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={bgtStyle.limitTxt}>Limit: {fmt(bgt)}</Text>
                          <Text style={[bgtStyle.statusTxt, isExceeded ? { color: RED } : isWarning ? { color: '#E65100' } : { color: '#2E7D32' }]}>
                            {isExceeded ? `⚠️ Aşım: +${fmt(currentSpent - bgt)}` : `Kalan: ${fmt(bgt - currentSpent)}`}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={bgtStyle.setBtn}
                          onPress={() => {
                            setEditingBudgetCat(catName);
                            setEditingBudgetAmount('');
                          }}>
                          <Text style={bgtStyle.setBtnTxt}>🎯 Limit Belirle</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {bgt > 0 && (
                      <View style={{ marginTop: 8 }}>
                        <View style={bgtStyle.barBg}>
                          <View
                            style={[
                              bgtStyle.barFill,
                              {
                                width: `${Math.min(100, percent)}%`,
                                backgroundColor: isExceeded ? RED : isWarning ? '#FB8C00' : '#43A047',
                              },
                            ]}
                          />
                        </View>
                        <View style={bgtStyle.barBottom}>
                          <Text style={{ fontSize: 11, color: '#777' }}>%{percent.toFixed(0)} kullanıldı</Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                              onPress={() => {
                                setEditingBudgetCat(catName);
                                setEditingBudgetAmount(String(bgt));
                              }}>
                              <Text style={{ fontSize: 12, color: GREEN, fontWeight: '700' }}>✏️ Düzenle</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteBudget(catName)}>
                              <Text style={{ fontSize: 12, color: RED, fontWeight: '700' }}>🗑️ Sil</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── BÜTÇE LİMİTİ AYARLAMA MODALI ── */}
      <Modal transparent animationType="fade" visible={!!editingBudgetCat} onRequestClose={() => setEditingBudgetCat(null)}>
        <View style={s.modalWrap}>
          <View style={s.centerCard}>
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>"{editingBudgetCat}" Bütçe Limiti</Text>
              <TouchableOpacity onPress={() => setEditingBudgetCat(null)}>
                <Text style={s.cardClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.fLabel}>Aylık Hedef Bütçe Tutarı ({currency.symbol})</Text>
            <TextInput
              style={s.txtInput}
              placeholder="Örn: 5000"
              placeholderTextColor="#AAA"
              keyboardType="numeric"
              value={editingBudgetAmount}
              onChangeText={setEditingBudgetAmount}
              autoFocus
            />
            <View style={s.formBtns}>
              <TouchableOpacity style={s.btnVazgec} onPress={() => setEditingBudgetCat(null)}>
                <Text style={s.btnVazgecTxt}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnKaydet, { backgroundColor: GREEN }]}
                onPress={() => handleSaveBudget(editingBudgetCat, editingBudgetAmount)}>
                <Text style={s.btnKaydetTxt}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stiller ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F7F6' },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: Platform.OS==='android' ? 36 : 14,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECEB',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#0F4C3A', justifyContent: 'center', alignItems: 'center' },
  brandLogoTxt: { color: '#80CBC4', fontWeight: '900', fontSize: 18 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F4C3A', letterSpacing: -0.3 },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  periodPillTxt: { fontSize: 12, fontWeight: '700', color: '#1B5E20' },
  periodPillArrow: { fontSize: 11, color: '#2E7D32', fontWeight: '800' },
  headerIcons: { flexDirection:'row', gap: 6 },
  headerIcon: { width: 34, height: 34, justifyContent:'center', alignItems:'center', borderRadius: 17, backgroundColor: '#F0F4F3' },
  headerIconTxt: { fontSize: 16, color:'#333', fontWeight:'700' },

  searchWrap: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E8ECEB', paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F3',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#222', paddingVertical: 8 },
  searchClear: { padding: 4 },
  searchFilterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginTop: 4 },
  searchChip: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#F0F4F3' },
  searchChipActive: { backgroundColor: '#0F4C3A' },
  searchChipTxt: { fontSize: 12, color: '#555', fontWeight: '600' },
  searchChipActiveTxt: { color: '#FFF', fontWeight: '700' },

  scroll: { flex: 1 },

  // Hero Bakiye Kartı
  heroCard: {
    backgroundColor: '#0F4C3A',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 14,
    elevation: 5,
    shadowColor: '#0F4C3A',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  heroLabel: { fontSize: 11, fontWeight: '800', color: '#80CBC4', letterSpacing: 1.2, textAlign: 'center' },
  heroAmount: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginVertical: 6 },
  heroBadgesRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4 },
  heroBadgeInc: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(128,203,196,0.3)',
  },
  heroBadgeIncTxt: { color: '#A7F3D0', fontSize: 12, fontWeight: '700' },
  heroBadgeExp: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(239,154,154,0.3)',
  },
  heroBadgeExpTxt: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  heroActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 14,
  },
  heroActionBtn: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 10,
  },
  heroActionIcon: { fontSize: 16, marginBottom: 2 },
  heroActionTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  // Hesaplar Şeridi
  accountSection: { marginTop: 16, marginBottom: 4 },
  accountChipsRow: { paddingHorizontal: 16, gap: 10 },
  accountChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#ECEFF1',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  accountChipActive: { borderColor: '#00897B', backgroundColor: '#E0F2F1' },
  accountChipIcon: { fontSize: 20, marginRight: 10 },
  accountChipName: { fontSize: 12, fontWeight: '700', color: '#37474F' },
  accountChipActiveTxt: { color: '#004D40' },
  accountChipBal: { fontSize: 12, fontWeight: '800', color: '#1B5E20', marginTop: 1 },

  // İşlemler Bölümü
  txSection: { marginTop: 16, paddingHorizontal: 16 },
  txSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  txSectionTitle: { fontSize: 13, fontWeight: '800', color: '#37474F', textTransform: 'uppercase', letterSpacing: 0.5 },
  txCountBadge: { fontSize: 11, fontWeight: '700', color: '#00897B', backgroundColor: '#E0F2F1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  // Modern İşlem Kartı
  modernTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  modernTxIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modernTxInfo: { flex: 1 },
  modernTxTitle: { fontSize: 15, fontWeight: '700', color: '#212121' },
  modernTxSub: { fontSize: 12, color: '#757575', marginTop: 3 },
  modernTxAmountBox: { alignItems: 'flex-end', marginLeft: 8 },
  modernTxAmount: { fontSize: 15, fontWeight: '800' },

  // Boş Durum
  emptyStateBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  emptyStateIcon: { fontSize: 40, marginBottom: 10 },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', color: '#37474F' },
  emptyStateSubtitle: { fontSize: 12, color: '#78909C', textAlign: 'center', marginTop: 4, lineHeight: 17 },

  fab: {
    position:'absolute', bottom: Platform.OS==='android' ? 52 : 32, right:20,
    width:56, height:56, borderRadius:28,
    backgroundColor: '#00897B', justifyContent:'center', alignItems:'center',
    elevation:6, shadowColor: '#00897B', shadowOpacity:0.4, shadowRadius:8,
  },
  fabText: { fontSize:32, color:'#FFF', lineHeight:34, fontWeight:'300' },

  menuOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.25)', justifyContent: 'center' },
  menuBox: {
    position:'absolute', top: Platform.OS==='android'?80:90, right:10,
    backgroundColor:'#FFF', minWidth:220, borderRadius: 8,
    elevation:8, shadowColor:'#000', shadowOpacity:0.18, shadowRadius:8,
  },
  menuItem: { paddingVertical:14, paddingHorizontal:18 },
  menuItemBorder: { borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  menuItemTxt: { fontSize:15, color:'#222', fontWeight: '500' },

  modalWrap: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:20, paddingBottom: Platform.OS === 'android' ? 40 : 20 },
  centerCard: { backgroundColor:'#FFF', borderRadius:10, padding:20, maxHeight:'85%' },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  cardTitle: { fontSize:17, fontWeight:'700', color:'#222' },
  cardClose: { fontSize:20, color:'#888', padding:4 },
  sectionHeaderTxt: { fontSize: 13, fontWeight: '700', color: '#666', textTransform: 'uppercase', marginBottom: 8 },

  fLabel: { fontSize:13, color:'#888', marginTop:10, marginBottom:4 },
  txtInput: { borderBottomWidth:1, borderBottomColor:'#DDD', fontSize:15, color:'#222', paddingVertical:8 },
  formBtns: { flexDirection:'row', gap:10, marginTop:20 },
  btnVazgec: { flex:1, paddingVertical:13, borderRadius:8, alignItems:'center', backgroundColor:'#F0F0F0' },
  btnVazgecTxt: { color:'#555', fontWeight:'700', fontSize:14 },
  btnKaydet: { flex:2, paddingVertical:13, borderRadius:8, alignItems:'center', backgroundColor: '#00897B' },
  btnKaydetTxt: { color:'#FFF', fontWeight:'700', fontSize:14 },

  accOpt: { flexDirection:'row', alignItems:'center', paddingVertical:12, paddingHorizontal:12, borderRadius:6, marginBottom:4, backgroundColor:'#F8F8F8' },
  accOptActive: { backgroundColor:'#E8F5E9', borderWidth:1, borderColor: '#00897B' },
  accOptTxt: { fontSize:15, color:'#222', fontWeight: '500' },
  accOptBalance: { fontSize:13, fontWeight:'700', marginRight: 8 },
  accOptCheck: { fontSize:16, color:GREEN, fontWeight:'bold' },
  delAccIcon: { padding: 8 },
  newAccBtn: { marginTop:10, paddingVertical:12, alignItems:'center', borderRadius:6, borderWidth:1, borderColor:GREEN, borderStyle:'dashed' },
  newAccBtnTxt: { color:GREEN, fontWeight:'700' },

  iconBtn: { width:42, height:42, borderRadius:8, backgroundColor:'#F0F0F0', justifyContent:'center', alignItems:'center' },
  iconBtnActive: { backgroundColor:'#E8F5E9', borderWidth:2, borderColor:GREEN },

  reportTitle: { fontSize:20, fontWeight:'700', color:'#222', marginBottom:4 },
  reportDropRow: { flexDirection:'row', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderBottomColor:'#E0E0E0' },
  reportDropVal: { flex:1, fontSize:16, fontWeight:'600', color:'#222' },
  reportDropArrow: { fontSize:14, color:'#888' },
  reportMethodList: { backgroundColor:'#FFF', borderWidth:1, borderColor:'#E0E0E0', borderRadius:4, marginTop:4, elevation:4 },
  methodItem: { paddingVertical:14, paddingHorizontal:16 },
  methodItemBorder: { borderBottomWidth:1, borderBottomColor:'#F0F0F0' },
  methodItemTxt: { fontSize:14, color:GREEN, fontWeight:'600' },

  aboutEmoji: { fontSize:48, textAlign:'center', marginTop:8 },
  aboutApp: { fontSize:22, fontWeight:'800', color:'#222', textAlign:'center', marginTop:6 },
  aboutVer: { fontSize:13, color:'#888', textAlign:'center', marginBottom:4 },
  aboutDivider: { height:1, backgroundColor:'#EEE', marginVertical:12 },
  aboutDevLabel: { fontSize:11, color:'#888', textAlign:'center', textTransform:'uppercase', letterSpacing:0.5 },
  aboutDevName: { fontSize:20, fontWeight:'800', color:GREEN, textAlign:'center', marginTop:2 },
  aboutDesc: { fontSize:13, color:'#666', textAlign:'center', lineHeight:19 },

  toggleBtn: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#CCC', padding: 2 },
  toggleBtnActive: { backgroundColor: GREEN },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF' },
  toggleKnobActive: { transform: [{ translateX: 22 }] },
});

// İşlem Aksiyonları (Düzenle / Kopyala / Sil)
const act = StyleSheet.create({
  btn: { paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F5F5F5', borderRadius: 8, marginBottom: 8 },
  btnTxt: { fontSize: 15, fontWeight: '700', color: '#333' },
});

// Kategori Modal Stilleri
const catM = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F0F0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#555' },
  addBtnTxt: { color: GREEN, fontWeight: '800', fontSize: 13 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemName: { fontSize: 14, color: '#333', fontWeight: '500' },
  delTxt: { fontSize: 12, color: RED, fontWeight: '700' },
});

// Kategori İstatistik Çubuk Stilleri
const csStyle = StyleSheet.create({
  row: { marginBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 13, fontWeight: '600', color: '#333' },
  amt: { fontSize: 13, fontWeight: '700', color: '#666' },
  barBg: { height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#E57373', borderRadius: 4 },
});

// Diyagram tablo satır stilleri
const ch = StyleSheet.create({
  row: { flexDirection:'row', alignItems:'center', paddingVertical: 6, borderBottomWidth:1, borderBottomColor:'#F5F5F5' },
  month: { width: 36, fontSize:13, fontWeight:'700', color:'#555' },
  inc: { flex:1, fontSize:12, color:'#2E7D32', fontWeight:'600', textAlign:'right' },
  exp: { flex:1, fontSize:12, color:RED, fontWeight:'600', textAlign:'right' },
  net: { flex:1, fontSize:12, fontWeight:'700', textAlign:'right' },
});

// Ayarlar modal stilleri
const ayr = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: { fontSize: 18 },
  settingTexts: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  settingSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
  settingArrow: { fontSize: 20, color: '#BBB', paddingHorizontal: 4 },
});

// Detaylı Rapor (PDF & Excel) stilleri
const rpt = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBack: { padding: 6, marginRight: 8 },
  headerBackTxt: { fontSize: 24, color: '#FFF', fontWeight: 'bold' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#FFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerMailBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  headerMailTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    padding: 12,
    paddingBottom: Platform.OS === 'android' ? 36 : 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  footerCloseBtn: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center', backgroundColor: '#ECEFF1' },
  footerCloseTxt: { color: '#546E7A', fontWeight: '800', fontSize: 14 },
  footerExportBtn: { flex: 2, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  footerExportTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});

// Excel Sayfa Sekmeleri Stilleri
const xlsTabs = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  tabTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTxtActive: {
    color: '#1B5E20',
    fontWeight: '800',
  },
});

// Excel Tablo Hücre Stilleri (Birebir Excel Sayfası)
const xlsGrid = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerCell: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  cell: {
    fontSize: 13,
    color: '#222',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
    backgroundColor: '#FFF',
  },
});

// Görseldeki Birebir PDF Kağıt Tasarımı Stilleri
const pdfDoc = StyleSheet.create({
  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
    paddingBottom: 4,
    marginBottom: 12,
  },
  headerLeft: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    textDecorationLine: 'underline',
  },
  headerRight: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000',
    textDecorationLine: 'underline',
  },
  table: {
    borderWidth: 1,
    borderColor: '#000000',
    marginBottom: 14,
  },
  tableHeadRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  th: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  td: {
    fontSize: 12,
    color: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: '#000000',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#000000',
    textDecorationLine: 'underline',
    marginBottom: 4,
    marginTop: 6,
  },
});

const bkStyle = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#607D8B',
  },
  tabTxtActive: {
    color: '#1B5E20',
    fontWeight: 'bold',
  },
  cloudBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  cloudBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  cloudBannerSubtitle: {
    fontSize: 12,
    color: '#388E3C',
    marginTop: 3,
  },
  infoBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoBoxTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  infoBoxTxt: {
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
  },
  autoHeaderBox: {
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  autoHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  autoHeaderSubtitle: {
    fontSize: 11,
    color: '#558B2F',
    marginTop: 4,
  },
  snapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  snapDate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  snapInfo: {
    fontSize: 11,
    color: '#777',
    marginTop: 2,
  },
  snapRestoreBtn: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  snapRestoreTxt: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
});

// Sabit & Tekrarlayan İşlemler Stilleri
const recStyle = StyleSheet.create({
  itemCard: {
    backgroundColor: '#F8FAF9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E8E6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLeft: { flex: 1, marginRight: 8 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#222' },
  itemSub: { fontSize: 11, color: '#666', marginTop: 2 },
  itemAmount: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  applyBtn: { backgroundColor: '#E8F5E9', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#A5D6A7' },
  applyBtnTxt: { fontSize: 11, color: '#2E7D32', fontWeight: '800' },
  deleteBtn: { padding: 6 },
  deleteBtnTxt: { fontSize: 16 },
  typeTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#EEEEEE' },
  typeTabTxt: { fontSize: 13, color: '#555', fontWeight: '600' },
});

// Bütçe Hedefleri Stilleri
const bgtStyle = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 14, fontWeight: '700', color: '#263238' },
  spentTxt: { fontSize: 11, color: '#607D8B', marginTop: 2 },
  limitTxt: { fontSize: 12, fontWeight: '700', color: '#37474F' },
  statusTxt: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  setBtn: { backgroundColor: '#E0F2F1', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#80CBC4' },
  setBtnTxt: { fontSize: 11, color: '#00695C', fontWeight: '700' },
  barBg: { height: 8, backgroundColor: '#ECEFF1', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
});


