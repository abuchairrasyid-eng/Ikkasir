import React, { useState } from 'react';
import { Transaksi } from '../types';
import { formatRupiah } from '../services/storage';
import { AlertCircle, X, Check, ShieldAlert } from 'lucide-react';

interface SalahInputModalProps {
  transaksi: Transaksi;
  onConfirmSalahInput: (id: string, alasan: string) => void;
  onClose: () => void;
}

export const SalahInputModal: React.FC<SalahInputModalProps> = ({
  transaksi,
  onConfirmSalahInput,
  onClose,
}) => {
  const [alasanPilihan, setAlasanPilihan] = useState('Salah jumlah porsi / item');
  const [catatanDetail, setCatatanDetail] = useState('');

  const quickReasons = [
    'Salah jumlah porsi / item',
    'Salah pilihan Panas / Dingin',
    'Salah meja / nama pemesan',
    'Transaksi dobel terinput',
    'Pelanggan membatalkan pesanan',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = catatanDetail.trim()
      ? `${alasanPilihan} - ${catatanDetail.trim()}`
      : alasanPilihan;

    onConfirmSalahInput(transaksi.id, finalReason);
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-[#12241E]/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-md shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up">
        {/* Header */}
        <div className="p-5 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#F3EBDD] leading-tight">
                Lapor Pesanan Salah Input
              </h3>
              <span className="text-xs text-[#C2A06A] font-mono">
                {transaksi.id} &bull; {formatRupiah(transaksi.total)}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Pesanan ini akan ditandai <b>Menunggu Persetujuan Owner (ACC)</b>. Hanya pemilik toko (Owner) yang dapat menyetujui koreksi transaksi ini.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider mb-2">
              Pilih Alasan Kesalahan Input
            </label>
            <div className="space-y-1.5">
              {quickReasons.map(r => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    alasanPilihan === r
                      ? 'bg-[#1F4034]/10 border-[#1F4034] font-semibold text-[#1F4034]'
                      : 'bg-white border-[#D8DED6] hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="alasan"
                    checked={alasanPilihan === r}
                    onChange={() => setAlasanPilihan(r)}
                    className="accent-[#1F4034]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider mb-1.5">
              Penjelasan Detail untuk Owner (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatanDetail}
              onChange={e => setCatatanDetail(e.target.value)}
              placeholder="misal: Meja 4 pesan 1 soto bukan 3 soto..."
              className="w-full bg-white border border-[#D8DED6] rounded-xl p-3 text-xs text-[#1B2521] focus:border-[#1F4034] outline-none resize-none"
            />
          </div>

          <div className="pt-2 border-t border-[#D8DED6] flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-200 text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-sm cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Kirim Permintaan ACC Owner</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
