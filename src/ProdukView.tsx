import React, { useState, useRef } from 'react';
import { Produk } from '../types';
import { formatRupiah, tintFor, KATEGORI_PRESET } from '../services/storage';
import {
  Plus,
  Image as ImageIcon,
  Search,
  Utensils,
  ThermometerSnowflake,
  Star,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Flame,
  Snowflake,
  FileText,
  AlertTriangle,
  X,
} from 'lucide-react';

interface ProdukViewProps {
  produk: Produk[];
  kategoriNonaktif?: string[];
  onAddProduk: (p: {
    nama: string;
    harga: number;
    kategori: string;
    gambar?: string;
    adaPilihanSuhu?: boolean;
    deskripsi?: string;
    favorit?: boolean;
  }) => void;
  onUpdateProduk?: (id: string, updates: Partial<Produk>) => void;
  onDeleteProduk?: (id: string) => void;
  onToggleAktif: (id: string) => void;
}

// Terbilang Rupiah Helper (e.g. 25000 -> Dua Puluh Lima Ribu Rupiah)
function terbilangRupiah(n: number): string {
  if (n <= 0) return 'Nol rupiah';
  const angka = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  function sebut(x: number): string {
    if (x < 12) return angka[x];
    if (x < 20) return sebut(x - 10) + ' Belas';
    if (x < 100) return sebut(Math.floor(x / 10)) + ' Puluh ' + sebut(x % 10);
    if (x < 200) return 'Seratus ' + sebut(x - 100);
    if (x < 1000) return sebut(Math.floor(x / 100)) + ' Ratus ' + sebut(x % 100);
    if (x < 2000) return 'Seribu ' + sebut(x - 1000);
    if (x < 1000000) return sebut(Math.floor(x / 1000)) + ' Ribu ' + sebut(x % 1000);
    if (x < 1000000000) return sebut(Math.floor(x / 1000000)) + ' Juta ' + sebut(x % 1000000);
    return String(x);
  }
  return sebut(n).replace(/\s+/g, ' ').trim() + ' Rupiah';
}

export const ProdukView: React.FC<ProdukViewProps> = ({
  produk,
  onAddProduk,
  onUpdateProduk,
  onDeleteProduk,
  onToggleAktif,
  kategoriNonaktif,
}) => {
  // References for smooth scroll & auto focus to input form
  const formRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nama, setNama] = useState('');
  const [hargaRaw, setHargaRaw] = useState('');
  const [kategori, setKategori] = useState('Makanan');
  const [adaPilihanSuhu, setAdaPilihanSuhu] = useState(false);
  const [deskripsi, setDeskripsi] = useState('');
  const [favorit, setFavorit] = useState(false);
  const [gambarBase64, setGambarBase64] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Delete modal confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Produk | null>(null);

  const categoryPresets = KATEGORI_PRESET.filter(
    k => !(kategoriNonaktif || []).includes(k)
  );

  // Common quick price shortcuts
  const priceShortcuts = [12000, 15000, 18000, 20000, 25000, 28000, 35000];

  // Numeric value of price
  const numericHarga = Number(hargaRaw.replace(/\D/g, '')) || 0;

  // Format price input with thousand separators as user types
  const handlePriceChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    if (!cleanDigits) {
      setHargaRaw('');
      return;
    }
    const num = Number(cleanDigits);
    setHargaRaw(num.toLocaleString('id-ID'));
  };

  const handlePriceIncrement = (add: number) => {
    const newPrice = numericHarga + add;
    setHargaRaw(newPrice.toLocaleString('id-ID'));
  };

  const setExactPrice = (val: number) => {
    setHargaRaw(val.toLocaleString('id-ID'));
  };

  // Start editing existing product:
  // Fulfills requirement: "jika edit langsung naik ke input data otomatis"
  const startEditProduct = (p: Produk) => {
    setEditingId(p.id);
    setNama(p.nama);
    setHargaRaw(p.harga.toLocaleString('id-ID'));
    setKategori(p.kategori);
    setAdaPilihanSuhu(Boolean(p.adaPilihanSuhu));
    setDeskripsi(p.deskripsi || '');
    setFavorit(Boolean(p.favorit));
    setGambarBase64(p.gambar || '');

    // Smoothly scroll the container directly to the form input and focus
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const mainEl = document.querySelector('main');
      if (mainEl && formRef.current) {
        mainEl.scrollTo({ top: formRef.current.offsetTop - 20, behavior: 'smooth' });
      }
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 60);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNama('');
    setHargaRaw('');
    setKategori('Makanan');
    setAdaPilihanSuhu(false);
    setDeskripsi('');
    setFavorit(false);
    setGambarBase64('');
  };

  // Compress image to max 600px width via canvas
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 600 / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setGambarBase64(canvas.toDataURL('image/jpeg', 0.8));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || numericHarga <= 0) {
      alert('Isi nama menu dan harga jual Rupiah yang valid.');
      return;
    }

    setLoading(true);

    if (editingId && onUpdateProduk) {
      onUpdateProduk(editingId, {
        nama: nama.trim(),
        harga: numericHarga,
        kategori: kategori.trim() || 'Lainnya',
        gambar: gambarBase64 || undefined,
        adaPilihanSuhu,
        deskripsi: deskripsi.trim() || undefined,
        favorit,
      });
      setEditingId(null);
    } else {
      onAddProduk({
        nama: nama.trim(),
        harga: numericHarga,
        kategori: kategori.trim() || 'Lainnya',
        gambar: gambarBase64 || undefined,
        adaPilihanSuhu,
        deskripsi: deskripsi.trim() || undefined,
        favorit,
      });
    }

    // Reset Form
    setNama('');
    setHargaRaw('');
    setDeskripsi('');
    setFavorit(false);
    setGambarBase64('');
    setAdaPilihanSuhu(false);
    setLoading(false);
  };

  const confirmDeleteAction = () => {
    if (onDeleteProduk && deleteTarget) {
      onDeleteProduk(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const filteredProduk = produk.filter(
    p =>
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.kategori.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="pb-2 border-b border-[#D8DED6]/70 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
            Katalog &amp; Manajemen Menu
          </h1>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={cancelEdit}
            className="self-start sm:self-auto text-xs px-3.5 py-1.5 rounded-xl border border-red-200 text-[#A8392F] hover:bg-red-50 flex items-center gap-1.5 cursor-pointer font-medium shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Batal Mode Edit
          </button>
        )}
      </div>

      {/* Form Input Menu Baru / Edit Menu */}
      <div
        ref={formRef}
        id="form-menu-container"
        className={`bg-[#FCFBF7] rounded-3xl p-6 sm:p-8 border shadow-2xs relative overflow-hidden transition-all duration-300 ${
          editingId
            ? 'border-amber-400 ring-2 ring-amber-300/50 shadow-md'
            : 'border-[#D8DED6]'
        }`}
      >
        {/* Banner Mode Edit Aktif */}
        {editingId && (
          <div className="mb-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-900 rounded-2xl p-4 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#1B2521]">
                  Mode Edit Menu: <u>{nama || 'Menu'}</u>
                </div>
                <div className="text-[11px] text-amber-800 font-normal mt-0.5">
                  Lakukan perubahan di bawah, lalu klik tombol &ldquo;Simpan Perubahan Menu&rdquo;.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-medium cursor-pointer shadow-2xs transition-colors"
            >
              Batalkan Edit
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 mb-6">
          <Utensils className="w-5 h-5 text-[#1F4034]" />
          <h2 className="font-serif font-medium text-xl text-[#1B2521] m-0">
            {editingId ? 'Edit Rincian Menu' : 'Tambah Menu Baru'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kolom 1 & 2: Input Data Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* Nama Menu dengan Ref untuk Auto-Focus */}
              <div>
                <label className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-1.5">
                  Nama Menu
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={nama}
                  onChange={e => setNama(e.target.value)}
                  placeholder="misal: Kopi Susu Gula Aren, Nasi Goreng Spesial..."
                  className="w-full bg-white border border-[#D8DED6] rounded-xl px-3.5 py-2.5 text-sm text-[#1B2521] focus:outline-none focus:border-[#1F4034] shadow-2xs transition-colors"
                  required
                />
              </div>

              {/* HARGA JUAL DENGAN RUPIAH LANGSUNG TERTERA */}
              <div className="p-4 rounded-2xl bg-[#F7F5EE] border border-[#D8DED6] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1F4034] uppercase tracking-wider flex items-center gap-1.5">
                    <span>Harga Jual (Rupiah Langsung Tertera)</span>
                  </label>
                  {numericHarga > 0 && (
                    <span className="text-[11px] font-mono text-[#7C5E2E] bg-white px-2 py-0.5 rounded-md border border-[#D8DED6]">
                      {terbilangRupiah(numericHarga)}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 font-serif text-base font-bold text-[#7C5E2E] select-none">
                    Rp
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={hargaRaw}
                    onChange={e => handlePriceChange(e.target.value)}
                    placeholder="25.000"
                    className="w-full bg-white border-2 border-[#C2A06A]/40 focus:border-[#1F4034] rounded-xl pl-12 pr-4 py-3 text-lg font-serif font-bold text-[#1B2521] focus:outline-none shadow-xs transition-all tracking-wide"
                    required
                  />
                  {numericHarga > 0 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#2C6A4E] bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      Tertera: {formatRupiah(numericHarga)}
                    </div>
                  )}
                </div>

                {/* Tombol Cepat Nominal Rupiah */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-[#56635B] font-medium">
                    Pilihan Nominal Cepat:
                  </div>
                  <div className="flex gap-1.5 flex-wrap items-center">
                    {priceShortcuts.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setExactPrice(val)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-mono transition-all cursor-pointer active:scale-95 ${
                          numericHarga === val
                            ? 'bg-[#1F4034] text-[#F3EBDD] border-[#1F4034] font-bold shadow-2xs'
                            : 'bg-white hover:bg-[#1F4034]/5 text-[#1B2521] border-[#D8DED6]'
                        }`}
                      >
                        {formatRupiah(val)}
                      </button>
                    ))}
                  </div>

                  {/* Tombol Step +1.000, +5.000, +10.000 */}
                  <div className="flex gap-1.5 pt-1">
                    {[1000, 5000, 10000].map(step => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => handlePriceIncrement(step)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md bg-white border border-[#D8DED6] hover:border-[#1F4034] text-[#56635B] hover:text-[#1B2521] cursor-pointer font-mono active:scale-95"
                      >
                        +{formatRupiah(step)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kategori Menu */}
              <div>
                <label className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-1.5">
                  Kategori Menu
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kategori}
                    onChange={e => {
                      setKategori(e.target.value);
                      if (e.target.value.toLowerCase().includes('minum') || e.target.value.toLowerCase().includes('kopi')) {
                        setAdaPilihanSuhu(true);
                      }
                    }}
                    placeholder="Makanan, Minuman Kopi..."
                    className="w-full bg-white border border-[#D8DED6] rounded-xl px-3.5 py-2.5 text-sm text-[#1B2521] focus:outline-none focus:border-[#1F4034] shadow-2xs transition-colors"
                    required
                  />
                </div>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {categoryPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setKategori(preset);
                        if (preset.toLowerCase().includes('minum') || preset.toLowerCase().includes('kopi') || preset.toLowerCase().includes('teh')) {
                          setAdaPilihanSuhu(true);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                        kategori === preset
                          ? 'bg-[#1F4034] text-[#F3EBDD] font-semibold shadow-2xs'
                          : 'bg-white text-[#56635B] hover:bg-gray-100 border border-[#D8DED6]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deskripsi & Catatan Singkat (Fitur Tambahan Input Menu) */}
              <div>
                <label className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#56635B]" />
                  <span>Deskripsi / Komposisi Singkat (Opsional)</span>
                </label>
                <input
                  type="text"
                  value={deskripsi}
                  onChange={e => setDeskripsi(e.target.value)}
                  placeholder="misal: Biji arabika wamena, susu oat, dan gula aren organik"
                  className="w-full bg-white border border-[#D8DED6] rounded-xl px-3.5 py-2 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034] shadow-2xs transition-colors"
                />
              </div>

              {/* Opsi Fitur Menu: Suhu Panas/Dingin & Menu Favorit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Toggle Pilihan Suhu (Panas / Dingin) */}
                <div
                  onClick={() => setAdaPilihanSuhu(!adaPilihanSuhu)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    adaPilihanSuhu
                      ? 'bg-sky-50/80 border-sky-300 ring-1 ring-sky-300 shadow-2xs'
                      : 'bg-white border-[#D8DED6] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 shrink-0">
                      <ThermometerSnowflake className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1B2521]">
                        Opsi Panas &amp; Dingin
                      </div>
                      <div className="text-[10px] text-[#56635B]">
                        Kasir bisa pilih 🔥 Panas / ❄️ Dingin
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                      adaPilihanSuhu ? 'bg-[#1F4034] justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </div>
                </div>

                {/* Toggle Menu Favorit / Best Seller */}
                <div
                  onClick={() => setFavorit(!favorit)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
                    favorit
                      ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300 shadow-2xs'
                      : 'bg-white border-[#D8DED6] hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1B2521]">
                        Menu Favorit
                      </div>
                      <div className="text-[10px] text-[#56635B]">
                        Tandai sebagai rekomendasi utama
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-10 h-6 rounded-full transition-colors flex items-center p-0.5 ${
                      favorit ? 'bg-amber-500 justify-end' : 'bg-gray-300 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom 3: Pratinjau Langsung Kartu Menu Kasir */}
            <div className="space-y-4">
              <span className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider">
                Pratinjau Tampilan Kasir
              </span>

              <div className="bg-white rounded-2xl p-3 border border-[#D8DED6] shadow-sm space-y-3">
                {/* Card Thumbnail Preview */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#EBE3D3] flex items-center justify-center">
                  {gambarBase64 ? (
                    <img
                      src={gambarBase64}
                      alt="Pratinjau"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="font-serif text-5xl font-medium text-[#7C5E2E]">
                      {nama.trim() ? nama.trim().charAt(0).toUpperCase() : 'M'}
                    </span>
                  )}

                  {/* Temperature Pill Preview */}
                  {adaPilihanSuhu && (
                    <div className="absolute top-2.5 right-2.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Snowflake className="w-2.5 h-2.5 text-sky-300" />
                      <Flame className="w-2.5 h-2.5 text-orange-300" />
                      <span>Panas / Dingin</span>
                    </div>
                  )}

                  {favorit && (
                    <div className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      <span>Favorit</span>
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div>
                  <h4 className="font-serif font-semibold text-sm text-[#1B2521] line-clamp-1">
                    {nama.trim() || 'Nama Menu Baru'}
                  </h4>
                  <div className="text-[11px] text-[#56635B] mt-0.5 flex items-center justify-between">
                    <span>{kategori || 'Kategori'}</span>
                    <span className="text-[10px] text-[#2C6A4E] font-medium">Tersedia</span>
                  </div>

                  {deskripsi && (
                    <p className="text-[10px] text-gray-500 italic mt-1 line-clamp-1">
                      {deskripsi}
                    </p>
                  )}

                  {/* Rupiah langsung tertera */}
                  <div className="mt-2 pt-2 border-t border-[#D8DED6] flex items-baseline justify-between">
                    <span className="text-xs text-[#56635B]">Harga Jual</span>
                    <span className="font-serif font-bold text-base text-[#7C5E2E] font-mono">
                      {formatRupiah(numericHarga)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload Foto Menu */}
              <div className="space-y-2">
                <label className="relative flex items-center justify-center gap-2 border border-[#D8DED6] hover:border-[#1F4034] rounded-xl px-4 py-2.5 text-xs font-medium text-[#1B2521] bg-white cursor-pointer transition-colors shadow-2xs active:scale-98">
                  <ImageIcon className="w-4 h-4 text-[#56635B]" />
                  <span>{gambarBase64 ? 'Ganti Foto Menu' : 'Unggah Foto Menu'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>

                {gambarBase64 && (
                  <button
                    type="button"
                    onClick={() => setGambarBase64('')}
                    className="w-full text-center text-xs text-[#A8392F] hover:underline cursor-pointer py-1"
                  >
                    Hapus Foto Terpilih
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#D8DED6]">
            {editingId ? (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal Edit
              </button>
            ) : (
              <div className="text-xs text-[#56635B]">
                Menu yang disimpan akan langsung muncul di katalog kasir.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-semibold text-xs tracking-wide transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{editingId ? 'Simpan Perubahan Menu' : 'Simpan Menu Baru'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Menu yang Tersedia */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif font-medium text-xl text-[#1B2521] m-0">
              Daftar Menu Aktif ({produk.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#56635B]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Saring nama atau kategori..."
              className="w-full bg-[#FCFBF7] border border-[#D8DED6] rounded-xl py-2 pl-9 pr-3 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034] shadow-2xs"
            />
          </div>
        </div>

        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1B2521] bg-[#F1F3EF]/70 text-[#56635B]">
                  <th className="p-3.5 pl-5 font-medium">Foto</th>
                  <th className="p-3.5 font-medium">Nama Menu</th>
                  <th className="p-3.5 text-right font-medium">Harga Tertera</th>
                  <th className="p-3.5 font-medium">Kategori</th>
                  <th className="p-3.5 font-medium">Opsi Suhu</th>
                  <th className="p-3.5 font-medium">Status</th>
                  <th className="p-3.5 pr-5 text-right font-medium">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE4]">
                {filteredProduk.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#56635B] italic">
                      Tidak ada menu yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredProduk.map(p => {
                    const [bg, ink] = tintFor(p.kategori || p.nama);
                    const isSelectedForEdit = editingId === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isSelectedForEdit
                            ? 'bg-amber-50/70 font-medium'
                            : 'hover:bg-black/[0.015]'
                        }`}
                      >
                        <td className="p-3 pl-5">
                          {p.gambar ? (
                            <img
                              src={p.gambar}
                              alt={p.nama}
                              className="w-11 h-11 rounded-xl object-cover border border-black/5"
                            />
                          ) : (
                            <div
                              className="w-11 h-11 rounded-xl flex items-center justify-center font-serif font-bold text-sm"
                              style={{ backgroundColor: bg, color: ink }}
                            >
                              {p.nama.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 font-semibold text-[#1B2521] text-sm">
                            <span>{p.nama}</span>
                            {p.favorit && (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            )}
                          </div>
                          {p.deskripsi && (
                            <div className="text-[11px] text-[#56635B] font-normal line-clamp-1">
                              {p.deskripsi}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-serif font-bold text-sm text-[#7C5E2E] font-mono">
                          {formatRupiah(p.harga)}
                        </td>
                        <td className="p-3 text-[#56635B]">{p.kategori || '-'}</td>
                        <td className="p-3">
                          {p.adaPilihanSuhu ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                              <ThermometerSnowflake className="w-3 h-3" />
                              Dingin / Panas
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400">Standar</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full text-xs ${
                              p.aktif
                                ? 'bg-emerald-50 text-[#2C6A4E] border border-emerald-200/50'
                                : 'bg-gray-100 text-gray-500 border border-gray-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                p.aktif ? 'bg-[#2C6A4E]' : 'bg-gray-400'
                              }`}
                            />
                            {p.aktif ? 'Tersedia' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3 pr-5 text-right space-x-2">
                          {/* Tombol Edit: langsung naik ke input data otomatis */}
                          <button
                            type="button"
                            onClick={() => startEditProduct(p)}
                            title="Edit menu"
                            className="text-xs font-semibold text-[#1F4034] hover:bg-[#1F4034]/10 px-2 py-1 rounded-lg cursor-pointer inline-flex items-center gap-1 transition-colors active:scale-95"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <span className="text-gray-300">&bull;</span>
                          <button
                            type="button"
                            onClick={() => onToggleAktif(p.id)}
                            className={`text-xs font-semibold hover:underline cursor-pointer ${
                              p.aktif ? 'text-[#A8392F]' : 'text-[#2C6A4E]'
                            }`}
                          >
                            {p.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          {onDeleteProduk && (
                            <>
                              <span className="text-gray-300">&bull;</span>
                              {/* Tombol Hapus: memunculkan popup pemberitahuan */}
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(p)}
                                title="Hapus menu secara permanen (buka popup konfirmasi)"
                                className="text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg cursor-pointer inline-flex items-center transition-colors active:scale-95"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* POPUP PEMBERITAHUAN KONFIRMASI HAPUS MENU */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#12241E]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-md shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up p-6">
            {/* Header Dialog */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-[#A8392F] flex items-center justify-center shrink-0 shadow-2xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1B2521] leading-tight">
                    Hapus Menu Restoran?
                  </h3>
                  <p className="text-xs text-[#56635B] mt-1 leading-relaxed">
                    Apakah Anda yakin ingin menghapus menu ini dari katalog? Menu yang dihapus tidak akan dapat dipesan lagi di kasir.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rincian Menu yang Hendak Dihapus */}
            <div className="mt-4 p-3.5 rounded-2xl bg-[#F1F3EF] border border-[#D8DED6] flex items-center gap-3">
              {deleteTarget.gambar ? (
                <img
                  src={deleteTarget.gambar}
                  alt={deleteTarget.nama}
                  className="w-12 h-12 rounded-xl object-cover border border-black/5 shrink-0"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-serif font-bold text-base shrink-0 shadow-2xs"
                  style={{
                    backgroundColor: tintFor(deleteTarget.kategori || deleteTarget.nama)[0],
                    color: tintFor(deleteTarget.kategori || deleteTarget.nama)[1],
                  }}
                >
                  {deleteTarget.nama.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-[#1B2521] truncate">
                  {deleteTarget.nama}
                </div>
                <div className="text-xs text-[#56635B] mt-0.5">
                  Kategori: {deleteTarget.kategori || 'Menu'} &bull;{' '}
                  <span className="font-mono font-bold text-[#7C5E2E]">
                    {formatRupiah(deleteTarget.harga)}
                  </span>
                </div>
                {deleteTarget.adaPilihanSuhu && (
                  <span className="inline-block text-[10px] text-sky-700 font-medium mt-0.5">
                    Memiliki opsi Panas &amp; Dingin
                  </span>
                )}
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-3 border-t border-[#D8DED6]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl border border-[#D8DED6] hover:bg-white text-[#1B2521] text-xs font-semibold cursor-pointer transition-colors active:scale-95"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                className="px-5 py-2.5 rounded-xl bg-[#A8392F] hover:bg-[#8D2B22] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
