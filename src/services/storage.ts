import { User, Produk, Transaksi, AppConfig, CartItem, PaymentMethod } from '../types';
import { CloudSync } from './cloud';
import { CLOUD_URL, CLOUD_TOKEN } from '../config';

function readList<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

const CLOUD_ON = CLOUD_URL.startsWith('http');

const STORAGE_KEYS = {
  USER: 'kasir_user',
  USERS_LIST: 'kasir_users_db',
  PRODUK: 'kasir_produk_db',
  TRANSAKSI: 'kasir_transaksi_db',
  CONFIG: 'kasir_config_db',
};

export const DEFAULT_CONFIG: AppConfig = {
  namaToko: 'Kasir',
  autoPrint: true,
  apiUrl: CLOUD_ON ? CLOUD_URL : '',
  apiToken: CLOUD_ON ? CLOUD_TOKEN : '',
  mode: CLOUD_ON ? 'cloud' : 'local',
  soundEnabled: true,
  qrisEnabled: true,
  qrisBarcodeEnabled: false, // Default false: barcode tidak muncul jika kasir memakai EDC/ADC fisik, metode tetap aktif
  qrisPopupEnabled: false,
  diskonEnabled: true,
  bluetoothPrinterEnabled: false,
  bluetoothDeviceName: '',
};

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    nama: 'Rasyid Al-Farabi',
    username: 'owner',
    password: '123',
    peran: 'Owner',
  },
  {
    id: 'u-2',
    nama: 'Siti Rahma',
    username: 'kasir',
    password: '123',
    peran: 'Kasir',
  },
  {
    id: 'u-3',
    nama: 'Budi Santoso',
    username: 'budi',
    password: '123',
    peran: 'Kasir',
  },
];

export const INITIAL_PRODUK: Produk[] = [
  {
    id: 'p-1',
    nama: 'Nasi Goreng Spesial',
    harga: 28000,
    kategori: 'Makanan',
    gambar: '/src/assets/images/menu_nasi_goreng_1790658883032.jpg',
    aktif: true,
  },
  {
    id: 'p-2',
    nama: 'Ayam Geprek Sambal Korek',
    harga: 25000,
    kategori: 'Makanan',
    aktif: true,
  },
  {
    id: 'p-3',
    nama: 'Mie Goreng Jawa Klasik',
    harga: 24000,
    kategori: 'Makanan',
    aktif: true,
  },
  {
    id: 'p-4',
    nama: 'Soto Ayam Lamongan',
    harga: 26000,
    kategori: 'Makanan',
    aktif: true,
  },
  {
    id: 'p-5',
    nama: 'Kopi Susu Gula Aren',
    harga: 18000,
    kategori: 'Minuman',
    aktif: true,
    adaPilihanSuhu: true,
  },
  {
    id: 'p-6',
    nama: 'Matcha Latte Espresso',
    harga: 24000,
    kategori: 'Minuman',
    aktif: true,
    adaPilihanSuhu: true,
  },
  {
    id: 'p-7',
    nama: 'Es Teh Manis Melati',
    harga: 8000,
    kategori: 'Minuman',
    aktif: true,
    adaPilihanSuhu: true,
  },
  {
    id: 'p-8',
    nama: 'Fresh Lemon Tea Honey',
    harga: 14000,
    kategori: 'Minuman',
    aktif: true,
    adaPilihanSuhu: true,
  },
  {
    id: 'p-9',
    nama: 'Croissant Butter Almond',
    harga: 22000,
    kategori: 'Snack',
    aktif: true,
  },
  {
    id: 'p-10',
    nama: 'Kentang Goreng Truffle',
    harga: 20000,
    kategori: 'Snack',
    aktif: true,
  },
  {
    id: 'p-11',
    nama: 'Pisang Goreng Keju Aren',
    harga: 16000,
    kategori: 'Snack',
    aktif: true,
  },
  {
    id: 'p-12',
    nama: 'Basque Burnt Cheesecake',
    harga: 28000,
    kategori: 'Dessert',
    aktif: true,
  },
  {
    id: 'p-13',
    nama: 'Waffle Ice Cream Berry',
    harga: 24000,
    kategori: 'Dessert',
    aktif: true,
  },
  {
    id: 'p-14',
    nama: 'Tiramisu Klasik Jar',
    harga: 26000,
    kategori: 'Dessert',
    aktif: true,
  },
];

// Generate past 7 days of realistic transactions
function generateSeedTransactions(): Transaksi[] {
  const now = new Date();
  const txs: Transaksi[] = [];

  const daysAgo = (days: number, hoursOffset: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    d.setHours(11 + (hoursOffset % 10), 15 + (hoursOffset * 7) % 45, 0, 0);
    return d.toISOString();
  };

  // Day 0 (today)
  txs.push({
    id: 'TRX-1001',
    tanggal: daysAgo(0, 1),
    kasir: 'Siti Rahma',
    items: [
      { cartItemId: 'p-1', id: 'p-1', nama: 'Nasi Goreng Spesial', harga: 28000, qty: 2, kategori: 'Makanan' },
      { cartItemId: 'p-5_Dingin', id: 'p-5', nama: 'Kopi Susu Gula Aren', harga: 18000, qty: 2, kategori: 'Minuman', suhu: 'Dingin' },
    ],
    diskon: 0,
    metodeBayar: 'QRIS',
    total: 92000,
    bayar: 92000,
    kembalian: 0,
    status: 'Selesai',
  });

  txs.push({
    id: 'TRX-1002',
    tanggal: daysAgo(0, 3),
    kasir: 'Siti Rahma',
    items: [
      { cartItemId: 'p-2', id: 'p-2', nama: 'Ayam Geprek Sambal Korek', harga: 25000, qty: 1, kategori: 'Makanan' },
      { cartItemId: 'p-7_Dingin', id: 'p-7', nama: 'Es Teh Manis Melati', harga: 8000, qty: 1, kategori: 'Minuman', suhu: 'Dingin' },
      { cartItemId: 'p-10', id: 'p-10', nama: 'Kentang Goreng Truffle', harga: 20000, qty: 1, kategori: 'Snack' },
    ],
    diskon: 5000,
    metodeBayar: 'Tunai',
    total: 48000,
    bayar: 50000,
    kembalian: 2000,
    status: 'Selesai',
  });

  txs.push({
    id: 'TRX-1003',
    tanggal: daysAgo(0, 4),
    kasir: 'Budi Santoso',
    items: [
      { cartItemId: 'p-6_Panas', id: 'p-6', nama: 'Matcha Latte Espresso', harga: 24000, qty: 1, kategori: 'Minuman', suhu: 'Panas' },
      { cartItemId: 'p-12', id: 'p-12', nama: 'Basque Burnt Cheesecake', harga: 28000, qty: 1, kategori: 'Dessert' },
    ],
    diskon: 0,
    metodeBayar: 'Kartu',
    total: 52000,
    bayar: 52000,
    kembalian: 0,
    status: 'Selesai',
  });

  // Example of order with status 'Ditahan'
  txs.push({
    id: 'TRX-1004',
    tanggal: daysAgo(0, 5),
    kasir: 'Siti Rahma',
    items: [
      { cartItemId: 'p-4', id: 'p-4', nama: 'Soto Ayam Lamongan', harga: 26000, qty: 2, kategori: 'Makanan' },
      { cartItemId: 'p-8_Dingin', id: 'p-8', nama: 'Fresh Lemon Tea Honey', harga: 14000, qty: 2, kategori: 'Minuman', suhu: 'Dingin' },
    ],
    diskon: 0,
    metodeBayar: 'Tunai',
    total: 80000,
    bayar: 0,
    kembalian: 0,
    status: 'Ditahan',
  });

  // Example of order marked 'MenungguKoreksi' so owner can test koreksi flow
  txs.push({
    id: 'TRX-1005',
    tanggal: daysAgo(0, 6),
    kasir: 'Budi Santoso',
    items: [
      { cartItemId: 'p-1', id: 'p-1', nama: 'Nasi Goreng Spesial', harga: 28000, qty: 3, kategori: 'Makanan' },
    ],
    diskon: 0,
    metodeBayar: 'Tunai',
    total: 84000,
    bayar: 100000,
    kembalian: 16000,
    status: 'MenungguKoreksi',
    catatan: 'Salah input meja, customer pesan 1 bukan 3',
  });

  // Past days for rich charts
  const historyTemplates = [
    { day: 1, kasir: 'Siti Rahma', total: 174000, method: 'QRIS' as const },
    { day: 1, kasir: 'Budi Santoso', total: 240000, method: 'Tunai' as const },
    { day: 2, kasir: 'Siti Rahma', total: 320000, method: 'Kartu' as const },
    { day: 2, kasir: 'Budi Santoso', total: 185000, method: 'Kartu' as const },
    { day: 3, kasir: 'Siti Rahma', total: 410000, method: 'Tunai' as const },
    { day: 3, kasir: 'Budi Santoso', total: 295000, method: 'QRIS' as const },
    { day: 4, kasir: 'Siti Rahma', total: 220000, method: 'QRIS' as const },
    { day: 5, kasir: 'Budi Santoso', total: 360000, method: 'Tunai' as const },
    { day: 6, kasir: 'Siti Rahma', total: 480000, method: 'QRIS' as const },
    { day: 6, kasir: 'Budi Santoso', total: 310000, method: 'Kartu' as const },
  ];

  historyTemplates.forEach((h, idx) => {
    txs.push({
      id: `TRX-${900 - idx}`,
      tanggal: daysAgo(h.day, idx + 1),
      kasir: h.kasir,
      items: [
        { cartItemId: 'p-1', id: 'p-1', nama: 'Nasi Goreng Spesial', harga: 28000, qty: Math.max(1, Math.floor(h.total / 80000)), kategori: 'Makanan' },
        { cartItemId: 'p-5_Dingin', id: 'p-5', nama: 'Kopi Susu Gula Aren', harga: 18000, qty: Math.max(2, Math.floor(h.total / 60000)), kategori: 'Minuman', suhu: 'Dingin' },
        { cartItemId: 'p-10', id: 'p-10', nama: 'Kentang Goreng Truffle', harga: 20000, qty: 1, kategori: 'Snack' },
      ],
      diskon: 0,
      metodeBayar: h.method,
      total: h.total,
      bayar: h.total,
      kembalian: 0,
      status: 'Selesai',
    });
  });

  return txs;
}

// Storage Access & Sync
export const StorageService = {
  getConfig(): AppConfig {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
      return DEFAULT_CONFIG;
    }
    try {
      const saved = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      // URL di src/config.ts selalu menang, supaya semua perangkat memakai server yang sama
      return CLOUD_ON ? { ...saved, apiUrl: CLOUD_URL, apiToken: CLOUD_TOKEN, mode: 'cloud' } : saved;
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: AppConfig) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  saveStoredUser(user: User | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  },

  getUsers(): User[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (!raw) {
      if (CloudSync.enabled()) return []; // mode cloud: tunggu data dari Sheet
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: User[]) {
    const old = readList<User>(STORAGE_KEYS.USERS_LIST);
    localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(users));
    CloudSync.onUsersSaved(old, users);
  },

  addUser(user: Omit<User, 'id'>): User {
    const users = this.getUsers();
    const newUser: User = {
      ...user,
      id: 'u-' + Date.now(),
    };
    users.push(newUser);
    this.saveUsers(users);
    return newUser;
  },

  deleteUser(id: string): boolean {
    const users = this.getUsers().filter(u => u.id !== id);
    this.saveUsers(users);
    return true;
  },

  getProduk(): Produk[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUK);
    if (!raw) {
      if (CloudSync.enabled()) return [];
      localStorage.setItem(STORAGE_KEYS.PRODUK, JSON.stringify(INITIAL_PRODUK));
      return INITIAL_PRODUK;
    }
    try {
      const items: Produk[] = JSON.parse(raw);
      // Ensure all initial items are active and not blocked by old zero stock values
      return items.map(p => ({ ...p, aktif: p.aktif !== false }));
    } catch {
      return INITIAL_PRODUK;
    }
  },

  saveProduk(produk: Produk[]) {
    const old = readList<Produk>(STORAGE_KEYS.PRODUK);
    localStorage.setItem(STORAGE_KEYS.PRODUK, JSON.stringify(produk));
    CloudSync.onProdukSaved(old, produk);
  },

  addProduk(item: Omit<Produk, 'id'>): Produk {
    const list = this.getProduk();
    const newProduk: Produk = {
      ...item,
      id: 'p-' + Date.now(),
    };
    list.unshift(newProduk);
    this.saveProduk(list);
    return newProduk;
  },

  updateProduk(id: string, updates: Partial<Produk>) {
    const list = this.getProduk().map(p => (p.id === id ? { ...p, ...updates } : p));
    this.saveProduk(list);
  },

  deleteProduk(id: string) {
    const list = this.getProduk().filter(p => p.id !== id);
    this.saveProduk(list);
  },

  toggleProdukAktif(id: string) {
    const list = this.getProduk().map(p => (p.id === id ? { ...p, aktif: !p.aktif } : p));
    this.saveProduk(list);
  },

  getTransaksi(): Transaksi[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSAKSI);
    if (!raw) {
      if (CloudSync.enabled()) return [];
      const seeds = generateSeedTransactions();
      localStorage.setItem(STORAGE_KEYS.TRANSAKSI, JSON.stringify(seeds));
      return seeds;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveTransaksi(list: Transaksi[]) {
    const old = readList<Transaksi>(STORAGE_KEYS.TRANSAKSI);
    localStorage.setItem(STORAGE_KEYS.TRANSAKSI, JSON.stringify(list));
    CloudSync.onTransaksiSaved(old, list);
  },

  addTransaksi(tx: Omit<Transaksi, 'id' | 'tanggal'>): Transaksi {
    const list = this.getTransaksi();
    const newTx: Transaksi = {
      ...tx,
      id: 'TRX-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      tanggal: new Date().toISOString(),
    };

    list.unshift(newTx);
    this.saveTransaksi(list);
    return newTx;
  },

  updateTransaksi(id: string, updates: Partial<Transaksi>): Transaksi | null {
    const list = this.getTransaksi();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...updates };
    this.saveTransaksi(list);
    return list[idx];
  },

  koreksiTransaksi(id: string): boolean {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target) return false;

    target.status = 'Dikoreksi';
    this.saveTransaksi(list);
    return true;
  },

  tolakKoreksi(id: string): boolean {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target) return false;

    target.status = 'Ditolak';
    this.saveTransaksi(list);
    return true;
  },

  tandaiSalahInput(id: string, catatan: string, pelapor?: string): boolean {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target) return false;
    target.status = 'MenungguKoreksi';
    target.alasanSalahInput = catatan;
    if (pelapor) target.pelaporSalahInput = pelapor;
    this.saveTransaksi(list);
    return true;
  },

  lanjutkanTahan(id: string): CartItem[] | null {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target || (target.status !== 'Ditahan' && target.status !== 'OpenBill')) return null;
    target.status = 'Dilanjutkan';
    this.saveTransaksi(list);
    return target.items;
  },

  lanjutkanOpenBill(id: string): { items: CartItem[]; nomorMeja?: string; namaPelanggan?: string; catatan?: string } | null {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target || (target.status !== 'OpenBill' && target.status !== 'Ditahan')) return null;
    // Status TIDAK diubah: Open Bill tetap terlihat di daftar sampai benar-benar dibayar atau dibatalkan.
    return {
      items: target.items,
      nomorMeja: target.nomorMeja,
      namaPelanggan: target.namaPelanggan,
      catatan: target.catatan,
    };
  },

  batalkanOpenBill(id: string): boolean {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target) return false;
    target.status = 'Dikoreksi';
    this.saveTransaksi(list);
    return true;
  },

  selesaikanTahan(id: string, metodeBayar: PaymentMethod = 'Tunai', bayar?: number): boolean {
    const list = this.getTransaksi();
    const target = list.find(t => t.id === id);
    if (!target || (target.status !== 'Ditahan' && target.status !== 'OpenBill')) return false;
    target.status = 'Selesai';
    target.metodeBayar = metodeBayar;
    target.bayar = bayar !== undefined ? bayar : target.total;
    target.kembalian = Math.max(0, target.bayar - target.total);
    target.tanggal = new Date().toISOString();
    this.saveTransaksi(list);
    return true;
  },

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.PRODUK);
    localStorage.removeItem(STORAGE_KEYS.TRANSAKSI);
    localStorage.removeItem(STORAGE_KEYS.USERS_LIST);
    this.getProduk();
    this.getUsers();
    this.getTransaksi();
  },
};

// Color palettes for item category cards
export const TINTS: [string, string][] = [
  ['#E2EAE3', '#2A5344'],
  ['#EBE3D3', '#7C5E2E'],
  ['#DDE5EA', '#35566A'],
  ['#EDDFDA', '#8A4B3F'],
  ['#E6E8D5', '#5A5F2C'],
];

export const KAT_TINT: Record<string, number> = {
  makanan: 1,
  minuman: 2,
  snack: 3,
  dessert: 4,
};

export function tintFor(key: string): [string, string] {
  const k = String(key || '').trim().toLowerCase();
  if (k in KAT_TINT) return TINTS[KAT_TINT[k]];
  let h = 0;
  for (const c of String(key || '')) h = ((h * 31 + c.charCodeAt(0)) >>> 0);
  return TINTS[h % TINTS.length];
}

export function formatRupiah(n: number): string {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function formatTime(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  } catch {
    return '00.00';
  }
}

export function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function formatDateTime(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
    return `${dateStr}, ${timeStr}`;
  } catch {
    return '';
  }
}

export function playCashRegisterSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  } catch {
    // AudioContext not allowed or not supported, ignore silently
  }
}

export function playTapSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch {
    // Ignore
  }
}
