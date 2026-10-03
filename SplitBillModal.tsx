import React, { useState, useMemo } from 'react';
import { CartItem, PaymentMethod, TemperatureOption, SplitBillDetail } from '../types';
import { formatRupiah } from '../services/storage';
import { 
  X, Check, Split, Users, UtensilsCrossed, Scale, Plus, Minus, 
  FileText, Files, Snowflake, Flame 
} from 'lucide-react';

interface SplitBillModalProps {
  items: CartItem[];
  subtotal: number;
  diskon: number;
  total: number;
  onConfirmSplit: (
    splits: SplitBillDetail[],
    printMode: 'combined' | 'separate'
  ) => void;
  onClose: () => void;
}

interface SplitItemUnit {
  unitId: string;
  cartItemId: string;
  nama: string;
  harga: number;
  suhu?: TemperatureOption | null;
  catatan?: string;
  portionIndex: number;
  totalQty: number;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  items,
  total,
  onConfirmSplit,
  onClose,
}) => {
  // Mode: 'byItem' (Pisah per Menu) atau 'equal' (Bagi Rata)
  const [splitMode, setSplitMode] = useState<'byItem' | 'equal'>('byItem');

  // Jumlah orang: bisa 2 sampai 10 orang
  const [personCount, setPersonCount] = useState<number>(2);

  // Pilihan format nota: 'combined' (Menyatu di awal) atau 'separate' (Terpisah di ke dua)
  const [printMode, setPrintMode] = useState<'combined' | 'separate'>('combined');

  // Urai item pesanan per porsi (sehingga jika pesan 2 porsi, porsi 1 & 2 bisa dipisah)
  const itemUnits: SplitItemUnit[] = useMemo(() => {
    const units: SplitItemUnit[] = [];
    items.forEach(it => {
      for (let q = 1; q <= it.qty; q++) {
        units.push({
          unitId: `${it.cartItemId}_porsi_${q}`,
          cartItemId: it.cartItemId,
          nama: it.nama,
          harga: it.harga,
          suhu: it.suhu,
          catatan: it.catatan,
          portionIndex: q,
          totalQty: it.qty,
        });
      }
    });
    return units;
  }, [items]);

  // Siapa yang bayar tiap menu (unitId -> orangIndex 1..10)
  const [assignments, setAssignments] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    itemUnits.forEach(u => {
      init[u.unitId] = 1;
    });
    return init;
  });

  // Metode bayar per orang (Tunai / QRIS) untuk orang 1 sampai 10
  const [metodePerOrang, setMetodePerOrang] = useState<Record<number, PaymentMethod>>(() => {
    const init: Record<number, PaymentMethod> = {};
    for (let i = 1; i <= 10; i++) {
      init[i] = i === 1 ? 'Tunai' : i === 2 ? 'QRIS' : 'Tunai';
    }
    return init;
  });

  // Ubah jumlah orang (2 s/d 10 orang)
  const handleSetPersonCount = (count: number) => {
    const validCount = Math.max(2, Math.min(10, count));
    if (validCount < personCount) {
      setAssignments(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (next[k] > validCount) next[k] = 1;
        });
        return next;
      });
    }
    setPersonCount(validCount);
  };

  // Hitung total belanja tiap orang (Mode Pisah per Menu)
  const billPerPerson = useMemo(() => {
    const bills: Record<number, { total: number; items: SplitItemUnit[] }> = {};
    for (let i = 1; i <= personCount; i++) {
      bills[i] = { total: 0, items: [] };
    }

    itemUnits.forEach(u => {
      const pIdx = assignments[u.unitId] || 1;
      const validIdx = pIdx <= personCount ? pIdx : 1;
      bills[validIdx].total += u.harga;
      bills[validIdx].items.push(u);
    });

    return bills;
  }, [itemUnits, assignments, personCount]);

  // Nominal per orang (Mode Bagi Rata)
  const equalAmount = Math.ceil(total / Math.max(1, personCount));

  // Simpan & Selesaikan Split Bill
  const handleFinish = () => {
    const splits: SplitBillDetail[] = [];

    if (splitMode === 'byItem') {
      for (let i = 1; i <= personCount; i++) {
        const bill = billPerPerson[i] || { total: 0, items: [] };

        // Kelompokkan kembali porsi ke bentuk CartItem[] untuk nota masing-masing
        const personCartItems: CartItem[] = [];
        const itemMap: Record<string, CartItem> = {};

        bill.items.forEach(u => {
          const key = `${u.cartItemId}_${u.suhu || ''}_${u.catatan || ''}`;
          if (!itemMap[key]) {
            itemMap[key] = {
              cartItemId: u.cartItemId,
              id: u.cartItemId,
              nama: u.nama,
              harga: u.harga,
              qty: 1,
              kategori: 'Menu',
              suhu: u.suhu,
              catatan: u.catatan,
            };
            personCartItems.push(itemMap[key]);
          } else {
            itemMap[key].qty += 1;
          }
        });

        splits.push({
          orang: i,
          perOrang: bill.total,
          metode: metodePerOrang[i] || 'Tunai',
          label: `Orang #${i}`,
          itemsSummary: bill.items.map(it => it.nama).join(', '),
          items: personCartItems,
        });
      }
    } else {
      // Bagi Rata Sama Banyak
      for (let i = 1; i <= personCount; i++) {
        splits.push({
          orang: i,
          perOrang: equalAmount,
          metode: metodePerOrang[i] || 'Tunai',
          label: `Orang #${i}`,
          itemsSummary: `Bagi rata (${formatRupiah(equalAmount)})`,
        });
      }
    }

    onConfirmSplit(splits, printMode);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-[#12241E]/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-xl shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C2A06A] text-[#12241E] flex items-center justify-center font-bold">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#F3EBDD] leading-tight">
                Split Bill (Pisah Tagihan)
              </h3>
              <span className="text-xs text-[#C2A06A] font-mono">
                Total Tagihan: {formatRupiah(total)} &bull; {items.length} menu dipesan
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pilihan Mode: Pisah per Menu vs Bagi Rata */}
        <div className="p-3 bg-[#F6F7F3] border-b border-[#D8DED6]">
          <div className="grid grid-cols-2 p-1 bg-[#E5E9E2] rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSplitMode('byItem')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                splitMode === 'byItem'
                  ? 'bg-[#1F4034] text-[#F3EBDD] shadow-xs'
                  : 'text-[#56635B] hover:text-[#1B2521]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-[#C2A06A]" />
              <span>Pisah per Menu</span>
            </button>

            <button
              type="button"
              onClick={() => setSplitMode('equal')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                splitMode === 'equal'
                  ? 'bg-[#1F4034] text-[#F3EBDD] shadow-xs'
                  : 'text-[#56635B] hover:text-[#1B2521]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Bagi Rata (Sama Banyak)</span>
            </button>
          </div>
        </div>

        {/* Modal Body Terpadu (Kembali jadi 1 tampilan utuh yang rapi) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
          {/* Jumlah Orang Stepper (Mendukung sampai 10 orang) */}
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-[#D8DED6] shadow-2xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1F4034]" />
              <div>
                <span className="text-xs font-bold text-[#1B2521] uppercase tracking-wider block">
                  Jumlah Orang
                </span>
                <span className="text-[11px] text-[#56635B]">
                  Dapat dibagi 2 sampai 10 orang
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-[#F1F3EF] p-1 rounded-xl border border-[#D8DED6]">
              <button
                type="button"
                onClick={() => handleSetPersonCount(personCount - 1)}
                disabled={personCount <= 2}
                className="w-8 h-8 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                title="Kurangi orang"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-16 text-center font-bold text-xs text-[#1F4034]">
                {personCount} Orang
              </span>
              <button
                type="button"
                onClick={() => handleSetPersonCount(personCount + 1)}
                disabled={personCount >= 10}
                className="w-8 h-8 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs active:scale-95"
                title="Tambah orang (maks. 10)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Opsi Format Nota Struk Split Bill: Menyatu di awal, Terpisah di ke dua */}
          <div className="bg-white p-3 rounded-2xl border border-[#D8DED6] shadow-2xs space-y-1.5">
            <div className="text-xs font-bold text-[#1B2521] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#1F4034]" />
              <span>Format Struk Nota:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* 1. Nota Menyatu (di awal) */}
              <button
                type="button"
                onClick={() => setPrintMode('combined')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                  printMode === 'combined'
                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-[#F6F7F3] border-[#D8DED6] hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 text-[#1F4034] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#1B2521]">Nota Menyatu</div>
                  <div className="text-[10px] text-[#56635B]">1 nota gabungan</div>
                </div>
              </button>

              {/* 2. Nota Terpisah (di ke dua) */}
              <button
                type="button"
                onClick={() => setPrintMode('separate')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                  printMode === 'separate'
                    ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                    : 'bg-[#F6F7F3] border-[#D8DED6] hover:bg-gray-100'
                }`}
              >
                <Files className="w-4 h-4 text-[#1F4034] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#1B2521]">Nota Terpisah</div>
                  <div className="text-[10px] text-[#56635B]">Struk per orang</div>
                </div>
              </button>
            </div>
          </div>

          {/* MODE 1: PISAH PER MENU */}
          {splitMode === 'byItem' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#56635B] uppercase tracking-wider">
                    Pilih Menu per Orang:
                  </label>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {itemUnits.map((u, i) => {
                    const currentPerson = assignments[u.unitId] || 1;
                    return (
                      <div
                        key={u.unitId}
                        className="p-3 bg-white rounded-2xl border border-[#D8DED6] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#1B2521] flex items-center gap-1.5 flex-wrap">
                            <span className="w-5 h-5 rounded-md bg-[#1F4034]/10 text-[#1F4034] text-[10px] font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span>{u.nama}</span>
                            {u.totalQty > 1 && (
                              <span className="text-[10px] text-gray-500 font-mono">
                                (porsi #{u.portionIndex})
                              </span>
                            )}
                            {u.suhu && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                                  u.suhu === 'Dingin'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {u.suhu === 'Dingin' ? (
                                  <Snowflake className="w-2.5 h-2.5" />
                                ) : (
                                  <Flame className="w-2.5 h-2.5" />
                                )}
                                <span>{u.suhu}</span>
                              </span>
                            )}
                          </div>
                          <span className="font-serif font-bold text-xs text-[#7C5E2E] ml-6 block mt-0.5">
                            {formatRupiah(u.harga)}
                          </span>
                        </div>

                        {/* Tombol Pilihan Orang 1 s/d 10 */}
                        <div className="flex items-center gap-1 flex-wrap self-end sm:self-auto max-w-full">
                          {Array.from({ length: personCount }, (_, idx) => idx + 1).map(pIdx => {
                            const isSelected = currentPerson === pIdx;
                            return (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() =>
                                  setAssignments(prev => ({ ...prev, [u.unitId]: pIdx }))
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                                  isSelected
                                    ? 'bg-[#1F4034] text-[#F3EBDD] shadow-xs ring-1 ring-[#1F4034]'
                                    : 'bg-[#F1F3EF] hover:bg-gray-200 text-[#56635B] border border-[#D8DED6]'
                                }`}
                                title={`Milik Orang #${pIdx}`}
                              >
                                #{pIdx}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rincian Tagihan Tiap Orang (Maks 10 Orang) */}
              <div className="space-y-2 pt-2 border-t border-[#D8DED6]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#56635B] uppercase tracking-wider">
                    Rincian Tagihan ({personCount} Orang):
                  </label>
                  <span className="text-xs font-serif font-bold text-[#1F4034]">
                    Total: {formatRupiah(total)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {Array.from({ length: personCount }, (_, idx) => idx + 1).map(pIdx => {
                    const bill = billPerPerson[pIdx] || { total: 0, items: [] };
                    const metode = metodePerOrang[pIdx] || 'Tunai';

                    return (
                      <div
                        key={pIdx}
                        className="p-3 bg-white rounded-2xl border border-[#D8DED6] shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#1F4034] flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#1F4034] text-white text-[10px] flex items-center justify-center font-bold">
                              #{pIdx}
                            </span>
                            <span>Orang #{pIdx}</span>
                          </span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            {bill.items.length} menu
                          </span>
                        </div>

                        <div className="font-serif font-bold text-lg text-[#12241E]">
                          {formatRupiah(bill.total)}
                        </div>

                        <div className="text-[11px] text-[#56635B] line-clamp-1 italic">
                          {bill.items.length > 0
                            ? bill.items.map(it => it.nama).join(', ')
                            : 'Belum ada menu'}
                        </div>

                        {/* Pilihan Metode Bayar */}
                        <div className="pt-2 border-t border-[#D8DED6]/70 flex items-center justify-between">
                          <span className="text-[11px] text-[#56635B] font-medium">Metode:</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setMetodePerOrang(prev => ({ ...prev, [pIdx]: 'Tunai' }))
                              }
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                metode === 'Tunai'
                                  ? 'bg-[#1F4034] text-[#F3EBDD]'
                                  : 'bg-[#F1F3EF] text-[#56635B]'
                              }`}
                            >
                              Tunai
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setMetodePerOrang(prev => ({ ...prev, [pIdx]: 'QRIS' }))
                              }
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                                metode === 'QRIS'
                                  ? 'bg-[#1F4034] text-[#F3EBDD]'
                                  : 'bg-[#F1F3EF] text-[#56635B]'
                              }`}
                            >
                              QRIS
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: BAGI RATA (SAMA BANYAK) */}
          {splitMode === 'equal' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#EBE3D3]/50 border border-[#D8DED6] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#56635B] block font-medium">
                    Nominal per Orang ({personCount} bagian sama):
                  </span>
                  <div className="font-serif font-bold text-2xl text-[#7C5E2E] mt-0.5">
                    {formatRupiah(equalAmount)}
                  </div>
                </div>
                <div className="text-right text-xs text-[#56635B]">
                  <div>Total Tagihan:</div>
                  <div className="font-bold text-[#1B2521] text-sm">{formatRupiah(total)}</div>
                </div>
              </div>

              {/* Rincian Metode Bayar Tiap Orang */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#56635B] uppercase tracking-wider block">
                  Metode Bayar per Orang:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {Array.from({ length: personCount }, (_, idx) => idx + 1).map(pIdx => {
                    const metode = metodePerOrang[pIdx] || 'Tunai';
                    return (
                      <div
                        key={pIdx}
                        className="p-3 bg-white rounded-2xl border border-[#D8DED6] flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-xs text-[#1B2521]">Orang #{pIdx}</div>
                          <div className="font-serif font-bold text-sm text-[#7C5E2E]">
                            {formatRupiah(equalAmount)}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setMetodePerOrang(prev => ({ ...prev, [pIdx]: 'Tunai' }))
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              metode === 'Tunai'
                                ? 'bg-[#1F4034] text-[#F3EBDD]'
                                : 'bg-[#F1F3EF] text-[#56635B]'
                            }`}
                          >
                            Tunai
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setMetodePerOrang(prev => ({ ...prev, [pIdx]: 'QRIS' }))
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                              metode === 'QRIS'
                                ? 'bg-[#1F4034] text-[#F3EBDD]'
                                : 'bg-[#F1F3EF] text-[#56635B]'
                            }`}
                          >
                            QRIS
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal Langsung Selesaikan */}
        <div className="p-4 border-t border-[#D8DED6] bg-[#F1F3EF] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-200 text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className="px-5 py-2.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Selesaikan Pembayaran Split</span>
          </button>
        </div>
      </div>
    </div>
  );
};
