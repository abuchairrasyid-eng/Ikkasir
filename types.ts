export type Role = 'Kasir' | 'Owner' | 'Admin';

export type TemperatureOption = 'Dingin' | 'Panas';

export interface User {
  id: string;
  nama: string;
  username: string;
  password?: string;
  peran: Role;
}

export interface Produk {
  id: string;
  nama: string;
  harga: number;
  stok?: number;
  kategori: string;
  gambar?: string;
  aktif: boolean;
  adaPilihanSuhu?: boolean; // Pilihan Dingin / Panas
  deskripsi?: string;
  favorit?: boolean;
}

export interface CartItem {
  cartItemId: string; // ID unik kombinasi produk + suhu (misal: "p-5_Dingin")
  id: string; // ID produk asli
  nama: string;
  harga: number;
  qty: number;
  kategori: string;
  suhu?: TemperatureOption | null; // Pilihan Panas / Dingin
  catatan?: string;
}

export type PaymentMethod = 'Tunai' | 'QRIS' | 'Kartu';

export type TransactionStatus = 
  | 'Selesai' 
  | 'Ditahan' 
  | 'OpenBill'
  | 'MenungguKoreksi' 
  | 'Dikoreksi' 
  | 'Ditolak'
  | 'Dilanjutkan';

export interface Transaksi {
  id: string;
  tanggal: string; // ISO string
  kasir: string;
  items: CartItem[];
  diskon: number;
  metodeBayar: PaymentMethod;
  total: number;
  bayar: number;
  kembalian: number;
  tip?: number; // Tip dari pelanggan (kembalian tidak diambil / dijadikan tip kasir)
  status: TransactionStatus;
  catatan?: string;
  nomorMeja?: string;
  namaPelanggan?: string;
  alasanSalahInput?: string;
  pelaporSalahInput?: string;
  isSplitBill?: boolean;
  splitDetails?: SplitBillDetail[];
  splitPrintMode?: 'combined' | 'separate';
}

export interface SplitBillDetail {
  orang: number;
  label?: string;
  perOrang: number;
  metode: PaymentMethod;
  itemsSummary?: string;
  items?: CartItem[];
}

export interface AppConfig {
  namaToko: string;
  autoPrint: boolean;
  apiUrl: string;
  apiToken: string;
  mode: 'local' | 'cloud';
  soundEnabled: boolean;
  qrisEnabled?: boolean;
  qrisBarcodeEnabled?: boolean;
  qrisPopupEnabled?: boolean;
  diskonEnabled?: boolean;
  tipEnabled?: boolean; // Fitur alihkan kembalian jadi tip kasir (bisa diaktifkan/nonaktifkan)
  bluetoothPrinterEnabled?: boolean; // Fitur printer termal bluetooth (bisa diaktifkan/nonaktifkan)
  bluetoothDeviceName?: string;
}

export type ActiveView = 'menu' | 'transaksi' | 'laporan' | 'produk' | 'akun' | 'kasir';
