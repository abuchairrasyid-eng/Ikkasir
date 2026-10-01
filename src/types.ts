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
  status: TransactionStatus;
  catatan?: string;
  nomorMeja?: string;
  namaPelanggan?: string;
  alasanSalahInput?: string;
  pelaporSalahInput?: string;
  isSplitBill?: boolean;
}

export interface AppConfig {
  namaToko: string;
  autoPrint: boolean;
  apiUrl: string;
  apiToken: string;
  mode: 'local' | 'cloud';
  soundEnabled: boolean;
  qrisEnabled?: boolean;
  qrisBarcodeEnabled?: boolean; // false jika kasir memakai alat EDC/ADC fisik (langsung selesai tanpa muncul pop-up barcode QR)
  qrisPopupEnabled?: boolean;
  diskonEnabled?: boolean;
  bluetoothPrinterEnabled?: boolean; // Fitur printer termal bluetooth (bisa diaktifkan/nonaktifkan)
  bluetoothDeviceName?: string;
  kategoriNonaktif?: string[]; // Kategori menu yang dimatikan (mis. Dessert jika tidak jualan dessert)
}

export type ActiveView = 'kasir' | 'laporan' | 'produk' | 'akun';
