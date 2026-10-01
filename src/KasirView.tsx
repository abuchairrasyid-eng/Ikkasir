import React, { useState, useMemo } from 'react';
import { Produk, CartItem, Transaksi, User, TemperatureOption } from '../types';
import { formatRupiah, tintFor, formatTime } from '../services/storage';
import {
  Search,
  Plus,
  Minus,
  Clock,
  Utensils,
  X,
  ShoppingBag,
  Flame,
  Snowflake,
  Check,
  Star,
  Trash2,
  BookmarkPlus,
  AlertCircle,
  ShieldAlert,
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
  onUpdateQty: (cartItemId: string, delta: number) => void;
  openBills?: Transaksi[];
  onResumeOpenBill?: (id: string) => void;
  onCancelOpenBill?: (id: string) => void;
  recentTransactions?: Transaksi[];
  onBukaLaporSalahInput?: (tx: Transaksi) => void;
  user: User;
  lastAddedId: string | null;
}

export const KasirView: React.FC<KasirViewProps> = ({
  produk,
  cart,
  onAddToCart,
  onUpdateQty,
  openBills = [],
  onResumeOpenBill,
  onCancelOpenBill,
  recentTransactions = [],
  onBukaLaporSalahInput,
  user,
  lastAddedId,
}) => {
  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('Semua');

  // Customization modal state for detailed orders
  const [modalProduct, setModalProduct] = useState<Produk | null>(null);
  const [selectedSuhu, setSelectedSuhu] = useState<TemperatureOption>('Dingin');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [modalCatatan, setModalCatatan] = useState<string>('');

  const quickNotesPresets = [
    'Normal',
    'Less Sugar (Sedikit Gula)',
    'Less Ice (Sedikit Es)',
    'Tanpa Gula',
    'Extra Shot Espresso',
    'Bungkus / Takeaway',
  ];

  // Greeting based on Indonesian local hour
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const sapa =
      h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
    return `${sapa}, ${user.nama.split(' ')[0]}`;
  }, [user.nama]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Categories list with item counts
  const categoryStats = useMemo(() => {
    const activeProducts = produk.filter(p => p.aktif);
    const map: Record<string, number> = { Semua: activeProducts.length };
    const nama: Record<string, string> = {};
    activeProducts.forEach(p => {
      const raw = (p.kategori || 'Lainnya').trim();
      const key = raw.toLowerCase();
      if (!nama[key]) nama[key] = raw;
      map[key] = (map[key] || 0) + 1;
    });
    return [
      { name: 'Semua', count: map.Semua },
      ...Object.keys(nama).map(key => ({ name: nama[key], count: map[key] })),
    ];
  }, [produk]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return produk.filter(p => {
      if (!p.aktif) return false;
      const matchCat =
        selectedKategori === 'Semua' ||
        p.kategori.toLowerCase() === selectedKategori.toLowerCase();
      const matchSearch =
        p.nama.toLowerCase().includes(search.toLowerCase()) ||
        p.kategori.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [produk, selectedKategori, search]);

  // Check if a product has temperature options
  const hasTempOption = (p: Produk) => {
    return (
      Boolean(p.adaPilihanSuhu) ||
      p.kategori.toLowerCase().includes('minum') ||
      p.kategori.toLowerCase().includes('kopi') ||
      p.kategori.toLowerCase().includes('teh')
    );
  };

  // Open modal for detailed temperature / notes / quantity selection
  // Sync with current cart state so it DOES NOT blindly add on top!
  const openCustomModal = (p: Produk, defaultSuhu?: TemperatureOption) => {
    setModalProduct(p);
    const isDrink = hasTempOption(p);

    if (isDrink) {
      const dinginItem = cart[`${p.id}_Dingin`];
      const panasItem = cart[`${p.id}_Panas`];

      let targetSuhu: TemperatureOption = defaultSuhu || 'Dingin';
      if (!defaultSuhu) {
        if (dinginItem && !panasItem) {
          targetSuhu = 'Dingin';
        } else if (panasItem && !dinginItem) {
          targetSuhu = 'Panas';
        }
      }

      setSelectedSuhu(targetSuhu);
      const existing = cart[`${p.id}_${targetSuhu}`];
      setSelectedQty(existing ? existing.qty : 1);
      setModalCatatan(existing?.catatan || '');
    } else {
      const existing = cart[p.id];
      setSelectedQty(existing ? existing.qty : 1);
      setModalCatatan(existing?.catatan || '');
    }
  };

  // Change temperature in modal and sync quantity from cart if already present
  const handleSelectSuhuInModal = (suhu: TemperatureOption) => {
    setSelectedSuhu(suhu);
    if (!modalProduct) return;
    const existing = cart[`${modalProduct.id}_${suhu}`];
    if (existing) {
      setSelectedQty(existing.qty);
      setModalCatatan(existing.catatan || '');
    } else {
      setSelectedQty(1);
    }
  };

  // 1-Click direct add for hot or cold without modal
  const handleQuickAddSuhu = (e: React.MouseEvent, p: Produk, suhu: TemperatureOption) => {
    e.stopPropagation();
    onAddToCart(p, { suhu, qty: 1 });
  };

  // 1-Click add for non-drink items
  const handleQuickAddNormal = (e: React.MouseEvent, p: Produk) => {
    e.stopPropagation();
    onAddToCart(p, { qty: 1 });
  };

  const handleConfirmModal = () => {
    if (!modalProduct) return;
    const isDrink = hasTempOption(modalProduct);
    onAddToCart(modalProduct, {
      suhu: isDrink ? selectedSuhu : undefined,
      catatan: modalCatatan.trim() || undefined,
      qty: selectedQty,
      setExactQty: true, // Key: sets the exact quantity instead of endlessly adding!
    });
    setModalProduct(null);
  };

  const handleDeleteFromModal = () => {
    if (!modalProduct) return;
    const isDrink = hasTempOption(modalProduct);
    const cartItemId = isDrink ? `${modalProduct.id}_${selectedSuhu}` : modalProduct.id;
    onUpdateQty(cartItemId, -999);
    setModalProduct(null);
  };

  // Helper to count total quantity of a product in cart (and breakdown by temperature)
  const getProductCartInfo = (productId: string) => {
    const matchingItems = Object.values(cart).filter(item => item.id === productId);
    const totalQty = matchingItems.reduce((sum, item) => sum + item.qty, 0);
    const dinginItem = cart[`${productId}_Dingin`];
    const panasItem = cart[`${productId}_Panas`];
    const dinginQty = dinginItem?.qty || 0;
    const panasQty = panasItem?.qty || 0;
    const normalItem = cart[productId];
    const normalQty = normalItem?.qty || 0;

    return { totalQty, dinginQty, panasQty, normalQty };
  };

  // Check if item currently displayed in modal is already in cart
  const isModalItemInCart = useMemo(() => {
    if (!modalProduct) return false;
    const isDrink = hasTempOption(modalProduct);
    const cartItemId = isDrink ? `${modalProduct.id}_${selectedSuhu}` : modalProduct.id;
    return Boolean(cart[cartItemId]);
  }, [modalProduct, selectedSuhu, cart]);

  return (
    <div className="space-y-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#D8DED6]/70">
        <div>
          <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-[#56635B] mt-1 font-sans flex items-center gap-2 flex-wrap">
            <span>{formattedDate}</span>

          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#56635B]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari kopi, es teh, makanan, camilan..."
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
            const { totalQty, dinginQty, panasQty, normalQty } = getProductCartInfo(p.id);
            const isDrink = hasTempOption(p);
            const isJustAdded = lastAddedId?.startsWith(p.id);

            const dinginItemId = `${p.id}_Dingin`;
            const panasItemId = `${p.id}_Panas`;
            const normalItemId = p.id;

            return (
              <article
                key={p.id}
                onClick={() => openCustomModal(p)}
                className={`group select-none flex flex-col justify-between bg-[#FCFBF7] rounded-2xl p-2.5 sm:p-3 border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 relative ${
                  totalQty > 0
                    ? 'border-[#1F4034] ring-1 ring-[#1F4034]/25'
                    : 'border-[#D8DED6] hover:border-[#C2A06A]'
                } ${isJustAdded ? 'animate-flash-glow' : ''}`}
              >
                <div>
                  {/* Visual Thumbnail (4:3 aspect ratio) */}
                  <div
                    className="relative aspect-[4/3] rounded-xl overflow-hidden flex items-center justify-center shadow-inner"
                    style={{ backgroundColor: bg }}
                  >
                    {p.gambar ? (
                      <img
                        src={p.gambar}
                        alt={p.nama}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                      />
                    ) : (
                      <span
                        className="font-serif text-5xl font-medium select-none"
                        style={{ color: ink }}
                      >
                        {p.nama.trim().charAt(0).toUpperCase()}
                      </span>
                    )}

                    {/* Quantity In Cart Badge */}
                    {totalQty > 0 && (
                      <div className="absolute top-2 left-2 bg-[#1F4034] text-[#F3EBDD] text-xs font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 animate-bump">
                        <ShoppingBag className="w-3 h-3" />
                        <span>x{totalQty}</span>
                        {dinginQty > 0 && panasQty > 0 && (
                          <span className="text-[10px] opacity-80">
                            ({dinginQty}❄️ {panasQty}🔥)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Best Seller / Favorit Star */}
                    {p.favorit && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full shadow-xs">
                        <Star className="w-3 h-3 fill-white" />
                      </div>
                    )}
                  </div>

                  {/* Menu Information */}
                  <div className="pt-2 px-0.5 space-y-0.5">
                    <h3 className="font-serif text-sm sm:text-base font-semibold text-[#1B2521] leading-tight line-clamp-1 group-hover:text-[#1F4034] transition-colors">
                      {p.nama}
                    </h3>
                    <div className="text-[11px] text-[#56635B] flex items-center justify-between">
                      <span>{p.kategori || 'Menu'}</span>
                      {p.deskripsi && (
                        <span className="text-[10px] text-gray-400 italic line-clamp-1 max-w-[120px]">
                          {p.deskripsi}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price and Action Section */}
                <div className="mt-2.5 pt-2 border-t border-[#D8DED6]/60">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-serif text-sm sm:text-base font-bold text-[#7C5E2E] font-mono">
                      {formatRupiah(p.harga)}
                    </span>
                    <span className="text-[10px] text-[#2C6A4E] font-medium">Tersedia</span>
                  </div>

                  {/* STEPPER LANGSUNG PADA KARTU MENU (Mencegah bertambah terus tanpa kendali) */}
                  {isDrink ? (
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5" onClick={e => e.stopPropagation()}>
                      {/* Kontrol Opsi Dingin */}
                      {dinginQty === 0 ? (
                        <button
                          type="button"
                          onClick={e => handleQuickAddSuhu(e, p, 'Dingin')}
                          title={`Pesan 1 ${p.nama} Dingin`}
                          className="py-1.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer hover:border-sky-300"
                        >
                          <Snowflake className="w-3 h-3 text-sky-600 shrink-0" />
                          <span className="text-[11px]">Dingin</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-sky-50 border border-sky-300 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(dinginItemId, -1)}
                            className="w-6 h-6 flex items-center justify-center text-sky-900 hover:bg-sky-200/60 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            title="Kurangi 1 Dingin"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-bold text-sky-950 font-mono px-0.5 flex items-center gap-0.5">
                            <Snowflake className="w-2.5 h-2.5 text-sky-600" />
                            {dinginQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(dinginItemId, 1)}
                            className="w-6 h-6 flex items-center justify-center text-sky-900 hover:bg-sky-200/60 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            title="Tambah 1 Dingin"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Kontrol Opsi Panas */}
                      {panasQty === 0 ? (
                        <button
                          type="button"
                          onClick={e => handleQuickAddSuhu(e, p, 'Panas')}
                          title={`Pesan 1 ${p.nama} Panas`}
                          className="py-1.5 px-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all active:scale-95 shadow-2xs cursor-pointer hover:border-orange-300"
                        >
                          <Flame className="w-3 h-3 text-orange-600 shrink-0" />
                          <span className="text-[11px]">Panas</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-orange-50 border border-orange-300 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(panasItemId, -1)}
                            className="w-6 h-6 flex items-center justify-center text-orange-900 hover:bg-orange-200/60 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            title="Kurangi 1 Panas"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-bold text-orange-950 font-mono px-0.5 flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 text-orange-600" />
                            {panasQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(panasItemId, 1)}
                            className="w-6 h-6 flex items-center justify-center text-orange-900 hover:bg-orange-200/60 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            title="Tambah 1 Panas"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Kontrol Stepper untuk Makanan/Snack */
                    <div onClick={e => e.stopPropagation()}>
                      {normalQty === 0 ? (
                        <button
                          type="button"
                          onClick={e => handleQuickAddNormal(e, p)}
                          className="w-full py-1.5 px-3 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah Pesanan</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-[#1F4034]/10 border border-[#1F4034]/30 rounded-xl p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(normalItemId, -1)}
                            className="w-7 h-7 flex items-center justify-center text-[#1F4034] hover:bg-[#1F4034]/20 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            title="Kurangi 1 porsi"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-[#1F4034] px-2 font-mono">
                            {normalQty} porsi
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(normalItemId, 1)}
                            className="w-7 h-7 flex items-center justify-center text-[#1F4034] hover:bg-[#1F4034]/20 rounded-lg active:scale-90 transition-transform cursor-pointer"
                            title="Tambah 1 porsi"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal Kustomisasi Suhu (Panas / Dingin), Catatan, & Porsi */}
      {modalProduct && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-[#12241E]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-sm shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up">
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
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* PILIHAN SUHU PANAS & DINGIN */}
              {hasTempOption(modalProduct) && (
                <div>
                  <span className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-2">
                    Pilihan Suhu Minuman
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Opsi Dingin */}
                    <button
                      type="button"
                      onClick={() => handleSelectSuhuInModal('Dingin')}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        selectedSuhu === 'Dingin'
                          ? 'bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-300 font-bold shadow-xs'
                          : 'bg-white border-[#D8DED6] text-gray-700 hover:border-sky-300'
                      }`}
                    >
                      <Snowflake className="w-6 h-6 text-sky-500" />
                      <span className="text-xs sm:text-sm font-semibold">Dingin (Ice 🧊)</span>
                    </button>

                    {/* Opsi Panas */}
                    <button
                      type="button"
                      onClick={() => handleSelectSuhuInModal('Panas')}
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

              {/* Catatan Cepat untuk Kasir */}
              <div>
                <span className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider mb-2">
                  Catatan Pesanan
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {quickNotesPresets.map(tag => (
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
                  placeholder="Catatan tambahan (misal: manis sedikit, tanpa sedotan)..."
                  className="w-full mt-2.5 bg-white border border-[#D8DED6] rounded-xl px-3 py-2 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034]"
                />
              </div>

              {/* Jumlah Porsi Stepper */}
              <div className="flex items-center justify-between pt-2 border-t border-[#D8DED6]">
                <div>
                  <span className="text-xs font-semibold text-[#56635B] uppercase tracking-wider block">
                    Jumlah Porsi
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {isModalItemInCart ? 'Perbarui jumlah porsi di pesanan' : 'Tentukan jumlah porsi'}
                  </span>
                </div>
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
              {isModalItemInCart && (
                <button
                  type="button"
                  onClick={handleDeleteFromModal}
                  title="Hapus menu ini dari pesanan"
                  className="p-3 rounded-xl border border-red-200 text-[#A8392F] hover:bg-red-50 cursor-pointer active:scale-95 transition-all flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleConfirmModal}
                className="flex-1 py-3 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-98 text-[#F3EBDD] font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isModalItemInCart ? 'Perbarui Pesanan' : 'Tambah ke Pesanan'}{' '}
                  {hasTempOption(modalProduct) ? `(${selectedSuhu})` : ''} &bull;{' '}
                  {formatRupiah(modalProduct.harga * selectedQty)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Bill (Meja Aktif) Section */}
      <section className="mt-14 pt-6 border-t border-[#D8DED6]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-[#1F4034]" />
            <h2 className="font-serif font-bold text-lg text-[#1B2521] m-0">
              Open Bill &amp; Meja Aktif ({openBills.length})
            </h2>
          </div>

        </div>

        {openBills.length === 0 ? (
          <div className="text-xs text-[#56635B] py-4 italic bg-[#FCFBF7] rounded-2xl px-4 border border-[#D8DED6]/70 flex items-center gap-2">
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {openBills.map(t => {
              const totalItems = t.items.reduce((s, it) => s + it.qty, 0);
              return (
                <div
                  key={t.id}
                  className="bg-[#FCFBF7] border-2 border-[#1F4034]/25 hover:border-[#1F4034] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-[#1F4034] bg-[#1F4034]/10 px-2.5 py-0.5 rounded-lg border border-[#1F4034]/20 flex items-center gap-1">
                            <span>👤</span>
                            <span>{t.namaPelanggan || 'Pelanggan'}</span>
                          </span>
                        </div>
                        {t.catatan && (
                          <p className="text-[11px] text-gray-500 italic mt-1 line-clamp-1">
                            &ldquo;{t.catatan}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold uppercase tracking-wider">
                        Open Bill
                      </span>
                    </div>

                    <div className="text-xs text-[#56635B] mt-2 flex justify-between items-center">
                      <span>Kasir: <b>{t.kasir}</b> &bull; {totalItems} item</span>
                      <span className="text-xs text-[#7C5E2E] font-mono font-medium">
                        {formatTime(t.tanggal)}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-600 mt-1 line-clamp-1">
                      Menu: {t.items.map(i => `${i.nama}${i.suhu ? ` [${i.suhu}]` : ''} x${i.qty}`).join(', ')}
                    </div>

                    <div className="font-serif font-bold text-xl text-[#7C5E2E] mt-2">
                      {formatRupiah(t.total)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2.5 border-t border-[#D8DED6]">
                    <button
                      type="button"
                      onClick={() => onResumeOpenBill?.(t.id)}
                      className="flex-1 py-2 rounded-xl bg-[#1F4034] text-[#F3EBDD] text-xs font-bold hover:bg-[#2B5646] cursor-pointer text-center active:scale-95 transition-all shadow-2xs"
                    >
                      Buka &amp; Bayar / Tambah Menu &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => onCancelOpenBill?.(t.id)}
                      className="px-3 py-2 rounded-xl border border-red-200 text-[#A8392F] hover:bg-red-50 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
                      title="Batalkan Open Bill ini"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Transaksi Terakhir & Lapor Pesanan Salah (Kasir can report mistakes for Owner ACC) */}
      {recentTransactions.length > 0 && onBukaLaporSalahInput && (
        <section className="mt-8 pt-6 border-t border-[#D8DED6]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <h2 className="font-serif font-bold text-lg text-[#1B2521] m-0">
                Transaksi Baru Selesai &amp; Opsi Salah Input
              </h2>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentTransactions.slice(0, 3).map(t => (
              <div
                key={t.id}
                className={`bg-[#FCFBF7] border rounded-2xl p-4 flex flex-col justify-between gap-2.5 shadow-2xs ${
                  t.status === 'MenungguKoreksi'
                    ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-300'
                    : t.status === 'Dikoreksi'
                    ? 'border-rose-200 bg-rose-50/40 opacity-75'
                    : 'border-[#D8DED6]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#1B2521]">{t.id}</span>
                    <span className="font-serif font-bold text-sm text-[#7C5E2E]">
                      {formatRupiah(t.total)}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#56635B] mt-1 line-clamp-1">
                    {t.items.map(i => `${i.nama}${i.suhu ? ` [${i.suhu}]` : ''} x${i.qty}`).join(', ')}
                  </div>

                  {t.status === 'MenungguKoreksi' && (
                    <div className="mt-2 text-xs font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                      <span>Menunggu ACC Owner ({t.alasanSalahInput || 'Salah input'})</span>
                    </div>
                  )}

                  {t.status === 'Dikoreksi' && (
                    <div className="mt-2 text-xs font-semibold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-300">
                      ✓ Telah Di-ACC &amp; Dibatalkan Owner
                    </div>
                  )}
                </div>

                {t.status === 'Selesai' && (
                  <div className="pt-2 border-t border-[#D8DED6] flex justify-end">
                    <button
                      type="button"
                      onClick={() => onBukaLaporSalahInput(t)}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Lapor Pesanan Salah</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
