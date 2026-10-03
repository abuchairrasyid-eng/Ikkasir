import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Produk, CartItem, User, TemperatureOption } from '../types';
import { formatRupiah, tintFor } from '../services/storage';
import {
  Search,
  Plus,
  Minus,
  Utensils,
  X,
  Flame,
  Snowflake,
} from 'lucide-react';

interface KasirViewProps {
  produk: Produk[];
  cart: Record<string, CartItem>;
  onAddToCart: (
    p: Produk,
    options?: {
      suhu?: TemperatureOption;
      catatan?: string;
      qty?: number;
      setExactQty?: boolean;
    }
  ) => void;
  onUpdateQty?: (cartItemId: string, delta: number) => void;
  kategoriNonaktif?: string[];
  user: User;
  lastAddedId: string | null;
}

export const KasirView: React.FC<KasirViewProps> = ({
  produk,
  cart,
  onAddToCart,
  kategoriNonaktif = [],
  user,
  lastAddedId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');

  // Customization popup modal state
  const [modalProduct, setModalProduct] = useState<Produk | null>(null);
  const [selectedSuhu, setSelectedSuhu] = useState<TemperatureOption>('Dingin');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [modalCatatan, setModalCatatan] = useState<string>('');

  const drinkNotesPresets = [
    'Normal',
    'Sedikit Gula',
    'Sedikit Es',
    'Tanpa Gula',
    'Extra Shot',
    'Bungkus',
  ];

  const foodNotesPresets = [
    'Bungkus',
    'Pedas',
    'Sedang',
    'Tidak Pedas',
    'Pisah Sambal',
    'Tanpa Bawang',
  ];

  // Greeting based on Indonesian local hour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const sapa =
      h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
    const firstName = (user?.nama || 'Kasir').split(' ')[0];
    return `${sapa}, ${firstName}`;
  }, [user?.nama]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Categories list with item counts (excluding deactivated categories)
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    (produk || []).forEach(p => {
      const cat = p.kategori || 'Lainnya';
      if (!kategoriNonaktif.includes(cat)) {
        counts[cat] = (counts[cat] || 0) + 1;
        total += 1;
      }
    });

    const activeList = Object.keys(counts).map(name => ({
      name,
      count: counts[name],
    }));

    return [{ name: 'Semua', count: total }, ...activeList];
  }, [produk, kategoriNonaktif]);

  // Filtered products based on search and selected category
  const filteredProducts = useMemo(() => {
    return (produk || []).filter(p => {
      const cat = p.kategori || 'Lainnya';
      if (kategoriNonaktif.includes(cat)) return false;

      const matchCat = selectedKategori === 'Semua' || cat === selectedKategori;
      const q = (search || '').trim().toLowerCase();
      const matchSearch =
        !q ||
        (p.nama || '').toLowerCase().includes(q) ||
        (p.kategori || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [produk, selectedKategori, search, kategoriNonaktif]);

  // Check if a product has temperature options
  const hasTempOption = (p: Produk) => {
    const cat = (p.kategori || '').toLowerCase();
    const name = (p.nama || '').toLowerCase();
    return (
      Boolean(p.adaPilihanSuhu) ||
      cat === 'kopi' ||
      cat === 'teh' ||
      cat === 'non kopi' ||
      cat.includes('kopi') ||
      cat.includes('teh') ||
      cat.includes('minum') ||
      name.includes('kopi') ||
      name.includes('tea') ||
      name.includes('teh') ||
      name.includes('latte')
    );
  };

  // Open modal - ALWAYS fresh so it never overwrites existing items in cart
  const openCustomModal = (p: Produk) => {
    setModalProduct(p);
    setSelectedSuhu('Dingin');
    setSelectedQty(1);
    setModalCatatan('');
  };

  // Confirm popup order - adds the new portion cleanly to cart
  const handleConfirmModal = () => {
    if (!modalProduct) return;
    const isDrink = hasTempOption(modalProduct);
    onAddToCart(modalProduct, {
      suhu: isDrink ? selectedSuhu : undefined,
      catatan: modalCatatan.trim(),
      qty: selectedQty,
    });
    setModalProduct(null);
  };

  // Calculate cart quantities for badges on cards
  const getProductTotalQty = (productId: string) => {
    if (!cart) return 0;
    const dinginItem = cart[`${productId}_Dingin`];
    const panasItem = cart[`${productId}_Panas`];
    const normalItem = cart[productId];

    const dinginQty = dinginItem ? dinginItem.qty : 0;
    const panasQty = panasItem ? panasItem.qty : 0;
    const normalQty = normalItem ? normalItem.qty : 0;
    return dinginQty + panasQty + normalQty;
  };

  return (
    <div className="space-y-5 pb-36 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#D8DED6]/70">
        <div>
          <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-[#56635B] mt-1 font-sans">
            {formattedDate}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#56635B]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kopi, teh, makanan..."
            className="w-full bg-[#FCFBF7] border border-[#D8DED6] focus:border-[#1F4034] rounded-xl py-2.5 pl-10 pr-8 text-xs sm:text-sm text-[#1B2521] focus:outline-none transition-all shadow-2xs placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 pt-0.5">
        {categoryStats.map(cat => {
          const isActive = selectedKategori === cat.name;
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedKategori(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 active:scale-95 ${
                isActive
                  ? 'bg-[#1F4034] text-[#F3EBDD] font-semibold shadow-xs'
                  : 'bg-[#FCFBF7] hover:bg-white text-[#56635B] hover:text-[#1B2521] border border-[#D8DED6]'
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-white/20 text-[#F3EBDD]' : 'bg-gray-100 text-[#56635B]'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Menu Catalog Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-5">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#56635B] bg-[#FCFBF7] rounded-3xl border border-dashed border-[#D8DED6] animate-fade-in">
            <Utensils className="w-10 h-10 mx-auto text-gray-400 mb-2 opacity-60" />
            <p className="text-base font-medium">Tidak ada menu yang sesuai</p>
            <p className="text-xs text-gray-400 mt-1">
              Coba kata kunci pencarian lain atau pilih kategori &ldquo;Semua&rdquo;.
            </p>
          </div>
        ) : (
          filteredProducts.map(p => {
            const [bg, ink] = tintFor(p.kategori || p.nama);
            const totalQty = getProductTotalQty(p.id);
            const isJustAdded = lastAddedId?.startsWith(p.id);

            return (
              <article
                key={p.id}
                onClick={() => openCustomModal(p)}
                className={`relative flex flex-col justify-between rounded-3xl p-4 sm:p-5 border transition-all duration-200 select-none cursor-pointer group active:scale-98 ${
                  totalQty > 0
                    ? 'bg-[#FAF8F2] border-[#1F4034] shadow-md ring-1 ring-[#1F4034]'
                    : 'bg-[#FCFBF7] border-[#D8DED6] hover:border-[#1F4034] hover:shadow-md'
                } ${isJustAdded ? 'animate-bump ring-2 ring-[#C2A06A]' : ''}`}
              >
                {/* Total Quantity Badge on Card */}
                {totalQty > 0 && (
                  <div className="absolute -top-2.5 -right-2.5 bg-[#1F4034] text-[#F3EBDD] font-mono font-bold text-xs px-2.5 py-1 rounded-full shadow-md border-2 border-[#FCFBF7] z-10 flex items-center gap-1 animate-scale-in">
                    <span>{totalQty}</span>
                    <span className="text-[10px] opacity-75 font-sans font-normal">porsi</span>
                  </div>
                )}

                <div>
                  {/* Category Chip */}
                  <span
                    style={{ backgroundColor: bg, color: ink }}
                    className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md mb-2.5 font-mono"
                  >
                    {p.kategori || 'Menu'}
                  </span>

                  {/* Menu Name */}
                  <h3 className="font-serif font-medium text-base sm:text-lg text-[#1B2521] leading-snug tracking-tight group-hover:text-[#1F4034] transition-colors">
                    {p.nama}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-[#D8DED6]/70 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-sm sm:text-base text-[#7C5E2E] font-mono">
                      {formatRupiah(p.harga)}
                    </span>
                    {totalQty > 0 && (
                      <span className="text-[11px] text-[#1F4034] font-semibold bg-[#1F4034]/10 px-2 py-0.5 rounded-lg border border-[#1F4034]/20">
                        {totalQty} dipesan
                      </span>
                    )}
                  </div>

                  {/* Tombol Tambah Pesanan (Membuka Popup) */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      openCustomModal(p);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal Popup Kustomisasi (Rendered via createPortal directly to body for 100% reliable positioning) */}
      {modalProduct && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setModalProduct(null)}
        >
          <div
            className="bg-[#FCFBF7] rounded-3xl w-full max-w-sm shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 px-5 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
              <div>
                <h3 className="font-serif font-medium text-lg leading-tight text-[#F3EBDD]">
                  {modalProduct.nama}
                </h3>
                <span className="text-xs text-[#C2A06A] font-serif font-bold font-mono">
                  {formatRupiah(modalProduct.harga)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalProduct(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Pilihan Suhu (Jika Menu Minuman) */}
              {hasTempOption(modalProduct) && (
                <div>
                  <span className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-2">
                    Suhu Minuman
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedSuhu('Dingin')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        selectedSuhu === 'Dingin'
                          ? 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-300 font-bold shadow-xs'
                          : 'bg-white border-[#D8DED6] text-gray-700 hover:border-sky-300'
                      }`}
                    >
                      <Snowflake className="w-6 h-6 text-sky-500" />
                      <span className="text-xs sm:text-sm font-semibold">Dingin (Ice 🧊)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedSuhu('Panas')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        selectedSuhu === 'Panas'
                          ? 'bg-orange-50 border-orange-400 text-orange-900 ring-2 ring-orange-300 font-bold shadow-xs'
                          : 'bg-white border-[#D8DED6] text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      <Flame className="w-6 h-6 text-orange-500" />
                      <span className="text-xs sm:text-sm font-semibold">Panas (Hot 🔥)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Catatan Cepat */}
              <div>
                <span className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-2">
                  Catatan Pesanan
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {(hasTempOption(modalProduct) ? drinkNotesPresets : foodNotesPresets).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setModalCatatan(prev =>
                          prev.includes(tag) ? prev.replace(tag, '').trim() : `${prev} ${tag}`.trim()
                        )
                      }
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer active:scale-95 ${
                        modalCatatan.includes(tag)
                          ? 'bg-[#1F4034] text-[#F3EBDD] border-[#1F4034] font-semibold'
                          : 'bg-white text-gray-600 border-[#D8DED6] hover:border-[#1F4034]'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalCatatan}
                  onChange={e => setModalCatatan(e.target.value)}
                  placeholder="Catatan tambahan..."
                  className="w-full mt-2.5 bg-white border border-[#D8DED6] rounded-xl px-3 py-2 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034]"
                />
              </div>

              {/* Jumlah Porsi Stepper */}
              <div className="flex items-center justify-between pt-2 border-t border-[#D8DED6]">
                <span className="text-xs font-semibold text-[#56635B] uppercase tracking-wider">
                  Jumlah Porsi
                </span>
                <div className="inline-flex items-center border border-[#D8DED6] rounded-full bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}
                    className="w-8 h-8 flex items-center justify-center text-[#1B2521] hover:bg-gray-100 rounded-full cursor-pointer active:scale-90 transition-transform"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="min-w-8 text-center font-bold text-sm text-[#1B2521] font-mono">
                    {selectedQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedQty(Math.min(99, selectedQty + 1))}
                    className="w-8 h-8 flex items-center justify-center text-[#1B2521] hover:bg-gray-100 rounded-full cursor-pointer active:scale-90 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer CTA */}
            <div className="p-4 border-t border-[#D8DED6] bg-[#F1F3EF] flex gap-2">
              <button
                type="button"
                onClick={() => setModalProduct(null)}
                className="py-2.5 px-4 rounded-xl border border-[#D8DED6] bg-white text-gray-700 hover:bg-gray-100 font-semibold text-xs sm:text-sm cursor-pointer active:scale-95 transition-all"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmModal}
                className="flex-1 py-2.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-98 text-[#F3EBDD] font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>
                  Tambah ke Pesanan {hasTempOption(modalProduct) ? `(${selectedSuhu})` : ''} &bull;{' '}
                  {formatRupiah(modalProduct.harga * selectedQty)}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
