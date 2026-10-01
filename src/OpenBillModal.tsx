import React, { useState } from 'react';
import { CartItem } from '../types';
import { formatRupiah } from '../services/storage';
import { X, Check, BookmarkPlus, User } from 'lucide-react';

interface OpenBillModalProps {
  items: CartItem[];
  subtotal: number;
  onConfirmOpenBill: (data: { namaPelanggan: string; catatan: string }) => void;
  onClose: () => void;
}

export const OpenBillModal: React.FC<OpenBillModalProps> = ({
  items,
  subtotal,
  onConfirmOpenBill,
  onClose,
}) => {
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [catatan, setCatatan] = useState('');

  const quickCustomerPresets = ['Tamu Reguler', 'Pelanggan Langganan', 'Bungkus / Takeaway', 'Rombongan'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPelanggan.trim()) return;
    onConfirmOpenBill({
      namaPelanggan: namaPelanggan.trim(),
      catatan: catatan.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#12241E]/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-md shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up">
        {/* Header */}
        <div className="p-5 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C2A06A] text-[#12241E] flex items-center justify-center font-bold">
              <BookmarkPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#F3EBDD] leading-tight">
                Buka Open Bill
              </h3>
              <span className="text-xs text-[#C2A06A] font-mono">
                {items.length} item &bull; {formatRupiah(subtotal)}
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

        {/* Form Body - Hanya Input Nama Pelanggan Saja */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#1F4034]" />
              Nama Pelanggan / Tamu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={namaPelanggan}
              onChange={e => setNamaPelanggan(e.target.value)}
              placeholder="Ketik nama pelanggan (misal: Pak Dimas, Bu Maya, Tamu 1)..."
              className="w-full bg-white border border-[#D8DED6] rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#1B2521] focus:border-[#1F4034] outline-none shadow-2xs"
              required
            />

            {/* Quick Presets */}
            <div className="flex gap-1.5 flex-wrap mt-2">
              {quickCustomerPresets.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNamaPelanggan(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                    namaPelanggan === preset
                      ? 'bg-[#1F4034] text-[#F3EBDD] border-[#1F4034] font-bold'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider mb-1.5">
              Catatan Pesanan Open Bill (Opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="misal: Nambah nanti, bayar sekalian pulang..."
              className="w-full bg-white border border-[#D8DED6] rounded-xl px-3 py-2 text-xs text-[#1B2521] focus:border-[#1F4034] outline-none"
            />
          </div>

          <div className="pt-3 border-t border-[#D8DED6] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-200 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!namaPelanggan.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Open Bill</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
