import React, { useState } from 'react';
import { CartItem, PaymentMethod } from '../types';
import { formatRupiah } from '../services/storage';
import { X, Check, Split, Users } from 'lucide-react';

interface SplitBillModalProps {
  items: CartItem[];
  subtotal: number;
  diskon: number;
  total: number;
  onConfirmSplit: (splits: { orang: number; perOrang: number; metode: PaymentMethod }[]) => void;
  onClose: () => void;
}

export const SplitBillModal: React.FC<SplitBillModalProps> = ({
  items,
  total,
  onConfirmSplit,
  onClose,
}) => {
  const [splitCount, setSplitCount] = useState<number>(2);

  // Per-person amount
  const perPersonAmount = Math.ceil(total / Math.max(1, splitCount));

  // Payments tracking for each person
  const [personPayments, setPersonPayments] = useState<
    { personIndex: number; metode: PaymentMethod; paid: boolean }[]
  >(() => [
    { personIndex: 1, metode: 'Tunai', paid: false },
    { personIndex: 2, metode: 'QRIS', paid: false },
  ]);

  const handleSetSplitCount = (count: number) => {
    const validCount = Math.max(2, Math.min(50, count));
    setSplitCount(validCount);
    setPersonPayments(prev => {
      const next = [];
      for (let i = 1; i <= validCount; i++) {
        const existing = prev.find(p => p.personIndex === i);
        next.push(existing || { personIndex: i, metode: 'Tunai' as PaymentMethod, paid: false });
      }
      return next;
    });
  };

  const togglePersonPaid = (index: number) => {
    setPersonPayments(prev =>
      prev.map(p => (p.personIndex === index ? { ...p, paid: !p.paid } : p))
    );
  };

  const setPersonMethod = (index: number, metode: PaymentMethod) => {
    setPersonPayments(prev =>
      prev.map(p => (p.personIndex === index ? { ...p, metode } : p))
    );
  };

  const allPaid = personPayments.every(p => p.paid);

  const handleFinishSplitOrder = () => {
    onConfirmSplit(
      personPayments.map(p => ({
        orang: p.personIndex,
        perOrang: perPersonAmount,
        metode: p.metode,
      }))
    );
  };

  // Cukup 3 tombol cepat yang langsung bisa diklik (2, 3, 4 Orang)
  const quickThreeButtons = [2, 3, 4];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#12241E]/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-lg shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C2A06A] text-[#12241E] flex items-center justify-center font-bold">
              <Split className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#F3EBDD] leading-tight">
                Split Bill (Pisah Tagihan)
              </h3>
              <span className="text-xs text-[#C2A06A] font-mono">
                Total Tagihan: {formatRupiah(total)}
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Opsi Jumlah Orang: Cukup 3 Tombol Cepat + Input Ketik Sendiri Bebas (>6) */}
          <div className="bg-[#F1F3EF]/60 p-4 rounded-2xl border border-[#D8DED6]">
            <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider mb-2.5">
              Pilih / Ketik Jumlah Orang:
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Cukup 3 tombol cepat */}
              {quickThreeButtons.map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSetSplitCount(num)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    splitCount === num
                      ? 'bg-[#1F4034] text-[#F3EBDD] shadow-sm ring-2 ring-[#C2A06A]'
                      : 'bg-white text-[#1B2521] border border-[#D8DED6] hover:border-[#1F4034]'
                  }`}
                >
                  {num} Orang
                </button>
              ))}

              {/* Input Ketik Sendiri (Bisa Lebih dari 6 Orang) */}
              <div className="flex items-center gap-1.5 ml-auto bg-white border border-[#D8DED6] rounded-xl px-2.5 py-1 shadow-2xs focus-within:border-[#1F4034] focus-within:ring-2 focus-within:ring-[#1F4034]/20">
                <Users className="w-3.5 h-3.5 text-[#56635B]" />
                <span className="text-xs text-[#56635B] font-medium hidden sm:inline">Ketik:</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="2"
                  max="50"
                  value={splitCount}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) handleSetSplitCount(val);
                  }}
                  className="w-12 text-center font-bold text-xs text-[#1B2521] outline-none"
                  placeholder="2-50"
                />
                <span className="text-xs font-bold text-[#1B2521]">Orang</span>
              </div>
            </div>

            {/* Nominal per person banner */}
            <div className="mt-3.5 p-3.5 rounded-xl bg-[#EBE3D3]/50 border border-[#D8DED6] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#56635B] block">Nominal per Orang ({splitCount} bagian):</span>
                <div className="font-serif font-bold text-xl sm:text-2xl text-[#7C5E2E] font-mono">
                  {formatRupiah(perPersonAmount)}
                </div>
              </div>
              <span className="text-[11px] text-[#56635B] bg-white px-2.5 py-1 rounded-lg border border-[#D8DED6]">
                {items.length} menu dipesan
              </span>
            </div>
          </div>

          {/* Checklist Pembayaran per Orang */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider">
              Status Pembayaran ({personPayments.filter(p => p.paid).length}/{splitCount} Bagian Lunas):
            </label>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {personPayments.map(person => (
                <div
                  key={person.personIndex}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    person.paid
                      ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-white border-[#D8DED6]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        person.paid ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      #{person.personIndex}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-[#1B2521]">
                        Orang ke-{person.personIndex}
                      </div>
                      <div className="font-serif font-bold text-xs sm:text-sm text-[#7C5E2E] font-mono">
                        {formatRupiah(perPersonAmount)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={person.metode}
                      onChange={e => setPersonMethod(person.personIndex, e.target.value as PaymentMethod)}
                      className="bg-[#F1F3EF] border border-[#D8DED6] rounded-lg px-2 py-1 text-xs text-[#1B2521] font-medium outline-none"
                    >
                      <option value="Tunai">Tunai</option>
                      <option value="QRIS">QRIS</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Kartu">Kartu</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => togglePersonPaid(person.personIndex)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 active:scale-95 ${
                        person.paid
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      }`}
                    >
                      {person.paid && <Check className="w-3.5 h-3.5" />}
                      <span>{person.paid ? 'Lunas' : 'Belum Bayar'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D8DED6] bg-[#F1F3EF] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-200 text-xs font-semibold cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleFinishSplitOrder}
            className="px-5 py-2.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>
              {allPaid ? 'Selesaikan Semua Pembayaran Split' : 'Simpan Pembayaran Split Bill'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
