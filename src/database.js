import AsyncStorage from '@react-native-async-storage/async-storage';

const TRANSACTIONS_KEY = '@gelir_gider_tx_v2';
const ACCOUNTS_KEY = '@gelir_gider_accounts_v2';
const ACTIVE_ACCOUNT_KEY = '@gelir_gider_active_account_v2';
const CURRENCY_KEY = '@gelir_gider_currency_v1';
const CATEGORIES_KEY = '@gelir_gider_categories_v1';
const PIN_KEY = '@gelir_gider_pin_v1';
const PIN_ENABLED_KEY = '@gelir_gider_pin_enabled_v1';
const RECURRING_KEY = '@gelir_gider_recurring_v1';
const BUDGETS_KEY = '@gelir_gider_budgets_v1';

export const DEFAULT_ACCOUNTS = [
  { id: 'acc_nakit', name: 'Nakit Cüzdan', icon: '💵' },
  { id: 'acc_banka', name: 'Banka Hesabı', icon: '🏦' },
  { id: 'acc_kredikarti', name: 'Kredi Kartı', icon: '💳' },
];

export const DEFAULT_GIDER_CATEGORIES = [
  'Ödemeler',
  'Market',
  'Kira',
  'Fatura',
  'Ulaşım',
  'Yemek',
  'Sağlık',
  'Eğlence',
  'Giyim',
  'Eğitim',
  'Diğer',
];

export const DEFAULT_GELIR_CATEGORIES = [
  'Maaş',
  'Ek Gelir',
  'Kira Geliri',
  'Prim & İkramiye',
  'Yatırım',
  'Harçlık',
  'Diğer',
];

export const CURRENCIES = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası' },
  { code: 'USD', symbol: '$', name: 'Amerikan Doları' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'İngiliz Sterlini' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaycan Manatı' },
  { code: 'RUB', symbol: '₽', name: 'Rus Rublesi' },
  { code: 'KZT', symbol: '₸', name: 'Kazakistan Tengesi' },
  { code: 'CHF', symbol: 'CHF', name: 'İsviçre Frangı' },
  { code: 'SAR', symbol: '﷼', name: 'Suudi Arabistan Riyali' },
  { code: 'AED', symbol: 'AED', name: 'BAE Dirhemi' },
];

export const INITIAL_TRANSACTIONS = [];

// ── HESAPLAR ────────────────────────────────────────────────────────────────
export async function getAccounts() {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    if (data) return JSON.parse(data);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
    return DEFAULT_ACCOUNTS;
  } catch (e) {
    return DEFAULT_ACCOUNTS;
  }
}

export async function getActiveAccountId() {
  try {
    const id = await AsyncStorage.getItem(ACTIVE_ACCOUNT_KEY);
    return id || 'acc_nakit';
  } catch (e) {
    return 'acc_nakit';
  }
}

export async function setActiveAccountId(id) {
  try {
    await AsyncStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    return true;
  } catch (e) {
    return false;
  }
}

export async function addAccount(account) {
  try {
    const accounts = await getAccounts();
    const updated = [...accounts, account];
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

export async function deleteAccount(id) {
  try {
    const accounts = await getAccounts();
    const updated = accounts.filter(a => a.id !== id);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

// ── KATEGORİLER ─────────────────────────────────────────────────────────────
export async function getCategories() {
  try {
    const data = await AsyncStorage.getItem(CATEGORIES_KEY);
    if (data) return JSON.parse(data);
    const initial = {
      gider: DEFAULT_GIDER_CATEGORIES,
      gelir: DEFAULT_GELIR_CATEGORIES,
    };
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(initial));
    return initial;
  } catch (e) {
    return { gider: DEFAULT_GIDER_CATEGORIES, gelir: DEFAULT_GELIR_CATEGORIES };
  }
}

export async function addCategory(type, categoryName) {
  try {
    const categories = await getCategories();
    const list = categories[type] || [];
    if (!list.includes(categoryName.trim())) {
      const updatedList = [...list, categoryName.trim()];
      const updatedCategories = { ...categories, [type]: updatedList };
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));
      return updatedCategories;
    }
    return categories;
  } catch (e) {
    return null;
  }
}

export async function deleteCategory(type, categoryName) {
  try {
    const categories = await getCategories();
    const list = categories[type] || [];
    const updatedList = list.filter(c => c !== categoryName);
    const updatedCategories = { ...categories, [type]: updatedList };
    await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(updatedCategories));
    return updatedCategories;
  } catch (e) {
    return null;
  }
}

// ── İŞLEMLER (TRANSACTIONS) ─────────────────────────────────────────────────
export async function getTransactions() {
  try {
    const data = await AsyncStorage.getItem(TRANSACTIONS_KEY);
    if (data !== null) return JSON.parse(data);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
    return INITIAL_TRANSACTIONS;
  } catch (e) {
    return [];
  }
}

export async function addTransaction(transaction) {
  try {
    const current = await getTransactions();
    const updated = [transaction, ...current];
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

export async function updateTransaction(transaction) {
  try {
    const current = await getTransactions();
    const updated = current.map(tx => tx.id === transaction.id ? transaction : tx);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

export async function deleteTransaction(id) {
  try {
    const current = await getTransactions();
    const updated = current.filter(item => item.id !== id);
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

export async function clearAllTransactions() {
  try {
    await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([]));
    return [];
  } catch (e) {
    return null;
  }
}

// ── PARA BİRİMİ ─────────────────────────────────────────────────────────────
export async function getCurrency() {
  try {
    const data = await AsyncStorage.getItem(CURRENCY_KEY);
    if (data) return JSON.parse(data);
    return CURRENCIES[0];
  } catch (e) {
    return CURRENCIES[0];
  }
}

export async function setCurrency(currency) {
  try {
    await AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(currency));
    return true;
  } catch (e) {
    return false;
  }
}

// ── PIN GÜVENLİK ────────────────────────────────────────────────────────────
export async function getPinCode() {
  try {
    return await AsyncStorage.getItem(PIN_KEY);
  } catch (e) {
    return null;
  }
}

export async function setPinCode(pin) {
  try {
    if (!pin) {
      await AsyncStorage.removeItem(PIN_KEY);
    } else {
      await AsyncStorage.setItem(PIN_KEY, pin);
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function isPinEnabled() {
  try {
    const val = await AsyncStorage.getItem(PIN_ENABLED_KEY);
    return val === 'true';
  } catch (e) {
    return false;
  }
}

export async function setPinEnabled(enabled) {
  try {
    await AsyncStorage.setItem(PIN_ENABLED_KEY, enabled ? 'true' : 'false');
    return true;
  } catch (e) {
    return false;
  }
}

// ── TEKRARLAYAN İŞLEMLER (ABONELİKLER & SABİT GELİR/GİDER) ────────────────
export async function getRecurringTransactions() {
  try {
    const data = await AsyncStorage.getItem(RECURRING_KEY);
    if (data) return JSON.parse(data);
    return [];
  } catch (e) {
    return [];
  }
}

export async function addRecurringTransaction(item) {
  try {
    const current = await getRecurringTransactions();
    const updated = [item, ...current];
    await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

export async function deleteRecurringTransaction(id) {
  try {
    const current = await getRecurringTransactions();
    const updated = current.filter(r => r.id !== id);
    await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return null;
  }
}

// ── KATEGORİ BÜTÇE LİMİTLERİ (HEDEF BÜTÇE) ─────────────────────────────────
export async function getCategoryBudgets() {
  try {
    const data = await AsyncStorage.getItem(BUDGETS_KEY);
    if (data) return JSON.parse(data);
    return {};
  } catch (e) {
    return {};
  }
}

export async function setCategoryBudget(categoryName, amount) {
  try {
    const budgets = await getCategoryBudgets();
    if (amount <= 0 || isNaN(amount)) {
      delete budgets[categoryName];
    } else {
      budgets[categoryName] = amount;
    }
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    return budgets;
  } catch (e) {
    return null;
  }
}

export async function deleteCategoryBudget(categoryName) {
  try {
    const budgets = await getCategoryBudgets();
    delete budgets[categoryName];
    await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
    return budgets;
  } catch (e) {
    return null;
  }
}

// ── YEDEKLEME VE GERİ YÜKLEME ───────────────────────────────────────────────
export async function exportAllData() {
  try {
    const [txs, accs, cats, curr, recurring, budgets] = await Promise.all([
      getTransactions(),
      getAccounts(),
      getCategories(),
      getCurrency(),
      getRecurringTransactions(),
      getCategoryBudgets(),
    ]);
    return JSON.stringify({
      version: '1.1',
      exportedAt: new Date().toISOString(),
      transactions: txs,
      accounts: accs,
      categories: cats,
      currency: curr,
      recurring: recurring || [],
      budgets: budgets || {},
    }, null, 2);
  } catch (e) {
    return null;
  }
}

export async function importAllData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    if (data.transactions && Array.isArray(data.transactions)) {
      await AsyncStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(data.transactions));
    }
    if (data.accounts && Array.isArray(data.accounts)) {
      await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data.accounts));
    }
    if (data.categories && typeof data.categories === 'object') {
      await AsyncStorage.setItem(CATEGORIES_KEY, JSON.stringify(data.categories));
    }
    if (data.currency) {
      await AsyncStorage.setItem(CURRENCY_KEY, JSON.stringify(data.currency));
    }
    if (data.recurring && Array.isArray(data.recurring)) {
      await AsyncStorage.setItem(RECURRING_KEY, JSON.stringify(data.recurring));
    }
    if (data.budgets && typeof data.budgets === 'object') {
      await AsyncStorage.setItem(BUDGETS_KEY, JSON.stringify(data.budgets));
    }
    return true;
  } catch (e) {
    return false;
  }
}
