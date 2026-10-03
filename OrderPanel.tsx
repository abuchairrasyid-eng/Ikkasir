import React, { useState, useEffect } from 'react';
import { CartItem, PaymentMethod } from '../types';
import { formatRupiah } from '../services/storage';
import { X, Plus, Minus, MessageSquare, Trash2, Snowflake, Flame, Split, BookmarkPlus, Banknote, Coins, QrCode, Heart } from 'lucide-react';

interface OrderPanelProps {
  cart: Record<string, CartItem>;
  onUpdateQty: (cartItemId: string, delta: number) => void;
  onClearCart: () => void;
  onFinishOrder: (metode: PaymentMethod, diskon: number, bayar: number, kembalian: number, tip?: number) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  autoPrint: boolean;
  onUpdateItemNote?: (cartItemId: string, note: string) => void;
  onToggleSuhu?: (cartItemId: string) => void;
  onOpenSplitBill?: () => void;
  onOpenOpenBill?: () => void;
  qrisEnabled?: boolean;
  qrisBarcodeEnabled?: boolean;
  onShowQrisModal?: () => void;
  diskonEnabled?: boolean;
  tipEnabled?: boolean;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  cart,
  onUpdateQty,
  onClearCart,
  onFinishOrder,
  isOpenMobile,
  onCloseMobile,
  autoPrint,
  onUpdateItemNote,
  onToggleSuhu,
  onOpenSplitBill,
  onOpenOpenBill,
  qrisEnabled = true,
  qrisBarcodeEnabled = true,
  onShowQrisModal,
  diskonEnabled = true,
  tipEnabled = true,
}) => {
  const [clock, setClock] = useState('');
  const [diskonPersen, setDiskonPersen] = useState<number>(0);
  const [metodeBayar, setMetodeBayar] = useState<PaymentMethod>('Tunai');
  const [inputBayarRaw, setInputBayarRaw] = useState<string>('');
  const [isTipChange, setIsTipChange] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.'));
    };
    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  const items = Object.values(cart);
  const subtotal = items.reduce((sum, item) => sum + item.harga * item.qty, 0);

  // Diskon dalam PERSEN (%)
  const effectiveDiskonPersen = diskonEnabled !== false ? Math.min(100, Math.max(0, Number(diskonPersen) || 0)) : 0;
  const nominalDiskon = Math.round((subtotal * effectiveDiskonPersen) / 100);
  const totalAkhir = Math.max(0, subtotal - nominalDiskon);

  const bayarNum = Number(inputBayarRaw) || 0;
  const kurang = totalAkhir > 0 && bayarNum > 0 && bayarNum < totalAkhir ? totalAkhir - bayarNum : 0;
  const rawKembalian = bayarNum > totalAkhir ? bayarNum - totalAkhir : 0;
  const effectiveTip = isTipChange && rawKembalian > 0 ? rawKembalian : 0;
  const displayKembalian = rawKembalian - effectiveTip;
  const kembalian = displayKembalian;

  // Tender chips for quick cash input
  const quickTenderOptions = React.useMemo(() => {
    if (totalAkhir <= 0) return [];
    const set = new Set<number>();
    set.add(totalAkhir); // Exact money
    const round20k = Math.ceil(totalAkhir / 20000) * 20000;
    if (round20k > totalAkhir) set.add(round20k);
    const round50k = Math.ceil(totalAkhir / 50000) * 50000;
    if (round50k > totalAkhir) set.add(round50k);
    const round100k = Math.ceil(totalAkhir / 100000) * 100000;
    if (round100k > totalAkhir) set.add(round100k);
    if (!set.has(50000) && totalAkhir < 50000) set.add(50000);
    if (!set.has(100000) && totalAkhir < 100000) set.add(100000);
    return Array.from(set).sort((a, b) => a - b);
  }, [totalAkhir]);

  const handleFinish = () => {
    if (items.length === 0) return;
    const finalBayar = metodeBayar === 'Tunai' ? (bayarNum || totalAkhir) : totalAkhir;
    const finalRawKembalian = metodeBayar === 'Tunai' ? (finalBayar > totalAkhir ? finalBayar - totalAkhir : 0) : 0;
    const tipAmount = isTipChange && finalRawKembalian > 0 ? finalRawKembalian : 0;
    const finalKembalian = finalRawKembalian - tipAmount;
    onFinishOrder(metodeBayar, nominalDiskon, finalBayar, finalKembalian, tipAmount);
    setInputBayarRaw('');
    setDiskonPersen(0);
    setIsTipChange(false);
  };

  // Reset metode bayar jika QRIS dinonaktifkan di pengaturan
  useEffect(() => {
    if (!qrisEnabled && metodeBayar === 'QRIS') {
      setMetodeBayar('Tunai');
    }
  }, [qrisEnabled, metodeBayar]);

  const handleCashChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '');
    setInputBayarRaw(cleanDigits);
    setIsTipChange(false);
  };

  // Payment methods: Tunai & QRIS (Fitur Kartu dihapus)
  const paymentMethods: PaymentMethod[] = qrisEnabled ? ['Tunai', 'QRIS'] : ['Tunai'];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-35 md:hidden animate-fade-in"
        />
      )}

      {/* Main Order Panel */}
      <aside
        className={`bg-[#E5E9E2] p-4 md:p-5 flex flex-col shrink-0 z-40
          fixed md:static inset-x-0 bottom-0 top-12 md:top-auto
          rounded-t-[32px] md:rounded-none transition-transform duration-300 ease-out
          ${isOpenMobile ? 'translate-y-0 pointer-events-auto' : 'translate-y-full pointer-events-none md:pointer-events-auto md:translate-y-0'}
          w-full md:w-[380px] lg:w-[410px] select-none
        `}
      >
        <div className="bon relative flex-1 min-h-0 bg-[#FCFBF7] p-5 md:p-6 flex flex-col rounded-sm">
          {/* Head & Clock */}
          <div className="flex items-baseline justify-between pb-3 border-b border-dashed border-[#D8DED6]">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[#1B2521] m-0">
                Pesanan
              </h2>
              <span className="text-[11px] text-[#56635B] font-mono">
                {items.length} jenis item dipesan
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[#56635B] font-medium">{clock}</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden text-[#56635B] hover:text-[#1B2521] p-1 cursor-pointer"
                aria-label="Tutup bon pesanan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Actions: Split Bill & Open Bill */}
          <div className="grid grid-cols-2 gap-2 pt-2.5 pb-1 border-b border-[#D8DED6]/60">
            <button
              type="button"
              onClick={onOpenSplitBill}
              disabled={items.length === 0}
              className="py-1.5 px-2.5 rounded-xl border border-[#D8DED6] hover:border-[#1F4034] bg-white hover:bg-gray-50 text-xs font-semibold text-[#1B2521] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
              title="Bagi tagihan pesanan ini"
            >
              <Split className="w-3.5 h-3.5 text-[#C2A06A]" />
              <span>Split Bill</span>
            </button>

            <button
              type="button"
              onClick={onOpenOpenBill}
              disabled={items.length === 0}
              className="py-1.5 px-2.5 rounded-xl border border-[#D8DED6] hover:border-[#1F4034] bg-white hover:bg-gray-50 text-xs font-semibold text-[#1B2521] flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-2xs cursor-pointer"
              title="Simpan pesanan sebagai Open Bill"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-[#1F4034]" />
              <span>Open Bill</span>
            </button>
          </div>

          {/* Middle Scrollable Section (Pesanan & Pembayaran) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain my-2 pr-1 space-y-3">
            {/* Items List */}
            <div className="divide-y divide-dotted divide-[#C9D0C8]">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#56635B] py-12">
                <span className="font-serif italic text-sm text-[#56635B]">
                  Belum ada item pesanan
                </span>
                <span className="text-[11px] text-gray-400 mt-1">
                  Pilih menu di katalog kasir untuk mulai transaksi.
                </span>
              </div>
            ) : (
              items.map(item => (
                <div key={item.cartItemId} className="py-2.5 space-y-1 animate-line-in">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-[#1B2521] leading-tight">
                      {item.nama}
                    </span>
                    <i className="lead-dots" />
                    <span className="text-sm font-semibold text-[#1B2521] font-mono">
                      {formatRupiah(item.harga * item.qty)}
                    </span>
                  </div>

                  {/* Temperature Badge & Notes Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.suhu && (
                      <button
                        type="button"
                        onClick={() => onToggleSuhu?.(item.cartItemId)}
                        title="Klik untuk ubah Panas / Dingin"
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition-transform active:scale-95 cursor-pointer ${
                          item.suhu === 'Dingin'
                            ? 'bg-sky-100 text-sky-800 border border-sky-300'
                            : 'bg-orange-100 text-orange-800 border border-orange-300'
                        }`}
                      >
                        {item.suhu === 'Dingin' ? (
                          <>
                            <Snowflake className="w-2.5 h-2.5 text-sky-600" />
                            <span>Dingin</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-2.5 h-2.5 text-orange-600" />
                            <span>Panas</span>
                          </>
                        )}
                      </button>
                    )}

                    {item.catatan && (
                      <span className="text-[11px] text-[#7C5E2E] italic bg-[#EBE3D3]/50 px-2 py-0.5 rounded-md">
                        &ldquo;{item.catatan}&rdquo;
                      </span>
                    )}
                  </div>

                  {/* Quantity Stepper & Price */}
                  <div className="flex items-center justify-between mt-1 text-xs">
                    <div className="inline-flex items-center border border-[#D8DED6] rounded-full bg-white shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.cartItemId, -1)}
                        className="w-7 h-6 flex items-center justify-center text-[#1B2521] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer"
                        aria-label={`Kurangi ${item.nama}`}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="min-w-6 text-center font-bold text-xs text-[#1B2521]">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.cartItemId, 1)}
                        className="w-7 h-6 flex items-center justify-center text-[#1B2521] hover:bg-black/5 active:scale-90 transition-transform cursor-pointer"
                        aria-label={`Tambah ${item.nama}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#56635B]">
                        {formatRupiah(item.harga)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingNoteId(editingNoteId === item.cartItemId ? null : item.cartItemId)}
                        className="text-[#56635B] hover:text-[#1B2521] p-1 cursor-pointer"
                        title="Tambah catatan khusus"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Note Editor */}
                  {editingNoteId === item.cartItemId && (
                    <div className="pt-1">
                      <input
                        type="text"
                        defaultValue={item.catatan || ''}
                        placeholder="Ketik catatan (misal: pedas, tanpa sedotan)..."
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            onUpdateItemNote?.(item.cartItemId, e.currentTarget.value.trim());
                            setEditingNoteId(null);
                          }
                        }}
                        onBlur={e => {
                          onUpdateItemNote?.(item.cartItemId, e.target.value.trim());
                          setEditingNoteId(null);
                        }}
                        autoFocus
                        className="w-full bg-white border border-[#D8DED6] rounded-md px-2.5 py-1 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034]"
                      />
                    </div>
                  )}
                </div>
              ))
            )}
            </div>

            {/* Calculations & Payment Methods (Scrolls with items) */}
            <div className="pt-2 border-t border-[#D8DED6] space-y-2">
              <div className="flex items-baseline justify-between text-xs text-[#56635B]">
              <span>Subtotal</span>
              <i className="lead-dots" />
              <b className="text-[#1B2521] font-semibold font-mono">{formatRupiah(subtotal)}</b>
            </div>

            {/* Diskon Section: Persen Saja, Opsi Aktif/Nonaktif di Pengaturan */}
            {diskonEnabled !== false && (
              <div className="space-y-1 py-0.5">
                <div className="flex items-center justify-between text-xs text-[#56635B]">
                  <span className="font-medium text-[#1B2521]">Diskon (%)</span>
                  <i className="lead-dots" />
                  <div className="flex items-center gap-1.5 font-mono">
                    <div className="flex items-center bg-white border border-[#D8DED6] rounded-md px-1.5 py-0.5 shadow-2xs focus-within:border-[#1F4034]">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="100"
                        value={diskonPersen || ''}
                        onChange={e => setDiskonPersen(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        placeholder="0"
                        className="w-8 text-right bg-transparent border-0 text-xs font-bold text-[#1B2521] focus:outline-none"
                      />
                      <span className="text-xs font-bold text-[#56635B] ml-0.5">%</span>
                    </div>
                    {nominalDiskon > 0 && (
                      <span className="text-[11px] font-mono font-bold text-[#A8392F]">
                        -{formatRupiah(nominalDiskon)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Preset Chips Diskon Persen */}
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {[5, 10, 15, 20, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiskonPersen(diskonPersen === pct ? 0 : pct)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        diskonPersen === pct
                          ? 'bg-[#1F4034] text-[#F3EBDD]'
                          : 'bg-white text-gray-600 border border-[#D8DED6] hover:border-[#1F4034]'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                  {diskonPersen > 0 && (
                    <button
                      type="button"
                      onClick={() => setDiskonPersen(0)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-red-600 hover:bg-red-50 cursor-pointer font-medium"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Payment Method Selector (Tunai & QRIS) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#EEF0EB] rounded-2xl mt-3 border border-[#D8DED6]/90 shadow-2xs">
              <button
                type="button"
                onClick={() => setMetodeBayar('Tunai')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  metodeBayar === 'Tunai'
                    ? 'bg-[#1F4034] text-[#F3EBDD] shadow-sm'
                    : 'text-[#56635B] hover:text-[#1B2521] hover:bg-white/60'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodeBayar('QRIS')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                  metodeBayar === 'QRIS'
                    ? 'bg-[#1F4034] text-[#F3EBDD] shadow-sm'
                    : 'text-[#56635B] hover:text-[#1B2521] hover:bg-white/60'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>QRIS</span>
              </button>
            </div>

            {/* Cash Tender Module (Rapi, Kontras Jelas, & Nyaman Dilihat) */}
            {metodeBayar === 'Tunai' && (
              <div className="mt-2.5 space-y-2.5 bg-[#F6F7F3] p-3.5 rounded-2xl border border-[#D5DCD2] shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F4034] uppercase tracking-wider">
                    <Coins className="w-3.5 h-3.5 text-[#C2A06A]" />
                    <span>Uang Diterima</span>
                  </div>
                  {/* Live Rupiah Preview Badge */}
                  <span className="text-xs font-serif font-bold text-[#1F4034] bg-white px-2.5 py-0.5 rounded-lg border border-[#D8DED6] shadow-2xs">
                    {formatRupiah(bayarNum || totalAkhir)}
                  </span>
                </div>

                {/* Input Box berbentuk display Rupiah */}
                <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border-2 border-[#1F4034]/50 focus-within:border-[#1F4034] focus-within:ring-2 focus-within:ring-[#1F4034]/20 shadow-xs transition-all">
                  <span className="font-serif font-bold text-lg md:text-xl text-[#7C5E2E] select-none pr-1">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputBayarRaw ? Number(inputBayarRaw).toLocaleString('id-ID') : ''}
                    onChange={e => handleCashChange(e.target.value)}
                    placeholder={totalAkhir ? Number(totalAkhir).toLocaleString('id-ID') : '0'}
                    className="w-full text-right font-serif font-bold text-2xl text-[#12241E] bg-transparent outline-none tracking-tight"
                  />
                </div>

                {/* Quick Tender Buttons Formatted in Rupiah */}
                {quickTenderOptions.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-0.5">
                    {quickTenderOptions.map((v, i) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setInputBayarRaw(String(v))}
                        className={`border rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
                          bayarNum === v
                            ? 'bg-[#1F4034] text-[#F3EBDD] border-[#1F4034] shadow-xs'
                            : 'bg-white hover:border-[#1F4034] text-[#1B2521] border-[#D8DED6]'
                        }`}
                      >
                        {i === 0 ? `Uang Pas (${formatRupiah(v)})` : formatRupiah(v)}
                      </button>
                    ))}
                  </div>
                )}

                {/* Fitur Tip Kasir / Pelanggan Tidak Ambil Kembalian */}
                {rawKembalian > 0 && tipEnabled && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsTipChange(!isTipChange)}
                      className={`w-full p-2.5 rounded-xl border text-xs transition-all cursor-pointer select-none active:scale-[0.99] flex items-center justify-between ${
                        isTipChange
                          ? 'bg-amber-500/15 border-amber-600/40 text-amber-950 shadow-2xs'
                          : 'bg-white hover:bg-gray-50 border-[#D8DED6] text-[#56635B]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            isTipChange ? 'bg-amber-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isTipChange ? 'fill-current' : ''}`} />
                        </span>
                        <div className="text-left">
                          <span className="font-bold block text-xs text-[#1B2521]">
                            {isTipChange ? 'Kembalian Jadi Tip' : 'Kembalian Jadi Tip?'}
                          </span>
                          <span className="text-[10px] text-[#56635B] block">
                            {isTipChange
                              ? `${formatRupiah(rawKembalian)} dicatat sebagai tip`
                              : 'Klik jika kembalian dialihkan jadi tip'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          isTipChange
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-300'
                        }`}
                      >
                        {isTipChange ? 'Tip Aktif' : 'Jadikan Tip'}
                      </span>
                    </button>
                  </div>
                )}

                <div className="space-y-1.5 pt-1.5 border-t border-[#D5DCD2]">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className={kurang > 0 ? 'text-[#A8392F] font-bold uppercase' : 'text-[#56635B] font-semibold'}>
                      {kurang > 0 ? 'Kurang Bayar:' : 'Kembalian:'}
                    </span>
                    <span
                      className={`font-serif font-bold text-xl ${
                        kurang > 0
                          ? 'text-[#A8392F]'
                          : displayKembalian > 0
                          ? 'text-[#1F4034]'
                          : 'text-[#1B2521]'
                      }`}
                    >
                      {kurang > 0 ? formatRupiah(kurang) : formatRupiah(displayKembalian)}
                    </span>
                  </div>

                  {tipEnabled && isTipChange && effectiveTip > 0 && (
                    <div className="flex items-center justify-between text-[11px] bg-amber-50 border border-amber-300/80 rounded-lg px-2.5 py-1 text-amber-900 font-semibold animate-fade-in">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        <span>Tip Diterima dari Pelanggan:</span>
                      </span>
                      <span className="font-mono font-bold text-amber-800">+{formatRupiah(effectiveTip)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* QRIS Tender Info */}
            {metodeBayar === 'QRIS' && (
              <div className="mt-2.5 bg-[#F6F7F3] p-3.5 rounded-2xl border border-[#D5DCD2] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F4034]">
                    <QrCode className="w-4 h-4 text-[#C2A06A]" />
                    <span>Pembayaran QRIS</span>
                  </div>
                  {qrisBarcodeEnabled ? (
                    onShowQrisModal && (
                      <button
                        type="button"
                        onClick={onShowQrisModal}
                        className="text-[11px] text-[#1F4034] hover:bg-[#E5E9E2] font-semibold flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-[#D5DCD2] shadow-2xs transition-colors"
                        title="Tampilkan Kode QR di layar kasir untuk discan pelanggan"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#C2A06A]" />
                        <span>Tampilkan QR di Layar</span>
                      </button>
                    )
                  ) : (
                    <span className="text-[10px] text-[#56635B] bg-white px-2 py-0.5 rounded-full border border-[#D5DCD2] font-normal">
                      Scan QR Kasir
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#D5DCD2]/70 text-xs">
                  <span className="text-[#56635B]">Tagihan QRIS:</span>
                  <span className="font-serif font-bold text-[#1B2521] text-sm">
                    {formatRupiah(totalAkhir)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Checkout Bar: Total, Selesaikan Pesanan, & Kosongkan */}
        <div className="shrink-0 pt-2.5 border-t-2 border-[#1B2521]/15 bg-[#FCFBF7] space-y-2">
          {/* Total Display */}
          <div className="flex items-baseline justify-between">
            <span className="font-serif text-base text-[#1B2521] font-medium">Total</span>
            <span className="font-serif font-bold text-2xl md:text-3xl text-[#1B2521] tracking-tight">
              {formatRupiah(totalAkhir)}
            </span>
          </div>

          {/* Checkout CTAs */}
          <button
            type="button"
            onClick={handleFinish}
            disabled={items.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-[0.98] text-[#F3EBDD] font-bold text-sm tracking-wide transition-all shadow-[inset_0_0_0_1px_rgba(197,160,89,0.55)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>
              {metodeBayar === 'QRIS'
                ? qrisBarcodeEnabled
                  ? 'Bayar via QRIS'
                  : 'Selesaikan QRIS'
                : autoPrint
                ? 'Selesaikan & Cetak'
                : 'Selesaikan Pesanan'}
            </span>
            <span>&bull;</span>
            <span>{formatRupiah(totalAkhir)}</span>
          </button>

          <div className="flex items-center justify-end text-xs">
            <button
              type="button"
              onClick={onClearCart}
              disabled={items.length === 0}
              className="text-[#A8392F] hover:underline underline-offset-4 font-semibold disabled:opacity-40 disabled:no-underline cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Kosongkan</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};
