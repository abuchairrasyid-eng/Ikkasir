import React, { useState } from 'react';
import { Transaksi, User } from '../types';
import { formatRupiah, formatTime, formatDateTime } from '../services/storage';
import { BookmarkPlus, AlertCircle, Clock, Receipt, FileText, CheckCircle2 } from 'lucide-react';

interface TransaksiViewProps {
  openBills: Transaksi[];
  onResumeOpenBill?: (id: string) => void;
  onCancelOpenBill?: (id: string) => void;
  recentTransactions: Transaksi[];
  onBukaLaporSalahInput?: (tx: Transaksi) => void;
  onViewReceipt?: (tx: Transaksi) => void;
  user: User;
}

export const TransaksiView: React.FC<TransaksiViewProps> = ({
  openBills,
  onResumeOpenBill,
  onCancelOpenBill,
  recentTransactions,
  onBukaLaporSalahInput,
  onViewReceipt,
  user,
}) => {
  const [filterTab, setFilterTab] = useState<'semua' | 'openbill' | 'selesai'>('semua');

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#D8DED6]/70">
        <div>
          <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
            Transaksi &amp; Open Bill
          </h1>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-[#E5E9E2] p-1 rounded-2xl border border-[#D8DED6]">
          <button
            type="button"
            onClick={() => setFilterTab('semua')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'semua'
                ? 'bg-[#1F4034] text-[#F3EBDD] shadow-xs'
                : 'text-[#56635B] hover:text-[#1B2521]'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('openbill')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              filterTab === 'openbill'
                ? 'bg-[#1F4034] text-[#F3EBDD] shadow-xs'
                : 'text-[#56635B] hover:text-[#1B2521]'
            }`}
          >
            <span>Open Bill</span>
            {openBills.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {openBills.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('selesai')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'selesai'
                ? 'bg-[#1F4034] text-[#F3EBDD] shadow-xs'
                : 'text-[#56635B] hover:text-[#1B2521]'
            }`}
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Bagian 1: Open Bill Aktif */}
      {(filterTab === 'semua' || filterTab === 'openbill') && (
        <section className="bg-white p-5 rounded-3xl border border-[#D8DED6] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-[#1F4034]" />
              <h2 className="font-serif font-bold text-lg text-[#1B2521] m-0">
                Open Bill Aktif ({openBills.length})
              </h2>
            </div>
          </div>

          {openBills.length === 0 ? (
            <div className="py-8 text-center text-gray-400 bg-[#FCFBF7] rounded-2xl border border-dashed border-[#D8DED6]">
              <BookmarkPlus className="w-8 h-8 mx-auto text-gray-300 mb-1.5 opacity-60" />
              <p className="text-sm font-medium text-gray-600">Tidak ada Open Bill aktif</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Pesanan yang ditahan akan tercatat di sini dan bisa dibuka kembali.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {openBills.map(t => {
                const totalItems = (t.items || []).reduce((s, it) => s + (it.qty || 1), 0);
                return (
                  <div
                    key={t.id}
                    className="bg-[#FCFBF7] border-2 border-[#1F4034]/25 hover:border-[#1F4034] rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-xs hover:shadow-md transition-all select-none"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-sm text-[#1F4034] bg-[#1F4034]/10 px-2.5 py-0.5 rounded-lg border border-[#1F4034]/20 inline-flex items-center gap-1">
                            <span>👤</span>
                            <span>{t.namaPelanggan || 'Pelanggan'}</span>
                          </span>
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
                        <span>Kasir: <b>{t.kasir || user.nama}</b> &bull; {totalItems} item</span>
                        <span className="text-xs text-[#7C5E2E] font-mono font-medium">
                          {formatTime(t.tanggal)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                        {(t.items || []).map(i => `${i.nama}${i.suhu ? ` [${i.suhu}]` : ''} x${i.qty}`).join(', ')}
                      </div>

                      <div className="font-serif font-bold text-xl text-[#7C5E2E] mt-2 font-mono">
                        {formatRupiah(t.total)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2.5 border-t border-[#D8DED6]">
                      <button
                        type="button"
                        onClick={() => onResumeOpenBill?.(t.id)}
                        className="flex-1 py-2 rounded-xl bg-[#1F4034] text-[#F3EBDD] text-xs font-bold hover:bg-[#2B5646] cursor-pointer text-center active:scale-95 transition-all shadow-2xs flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Buka &amp; Bayar</span>
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
      )}

      {/* Bagian 2: Riwayat Transaksi Selesai (Bisa diklik untuk melihat struk bon) */}
      {(filterTab === 'semua' || filterTab === 'selesai') && (
        <section className="bg-white p-5 rounded-3xl border border-[#D8DED6] shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#1F4034]" />
              <h2 className="font-serif font-bold text-lg text-[#1B2521] m-0">
                Riwayat Transaksi ({recentTransactions.length})
              </h2>
            </div>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 bg-[#FCFBF7] rounded-2xl border border-dashed border-[#D8DED6]">
              <Clock className="w-8 h-8 mx-auto text-gray-300 mb-1.5 opacity-60" />
              <p className="text-sm font-medium text-gray-600">Belum ada transaksi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentTransactions.slice(0, 24).map(t => (
                <div
                  key={t.id}
                  onClick={() => onViewReceipt?.(t)}
                  className={`bg-[#FCFBF7] border rounded-2xl p-4 flex flex-col justify-between gap-2.5 shadow-2xs cursor-pointer hover:border-[#1F4034] hover:shadow-md transition-all active:scale-98 group ${
                    t.status === 'MenungguKoreksi'
                      ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-300'
                      : t.status === 'Dikoreksi'
                      ? 'border-rose-200 bg-rose-50/40 opacity-75'
                      : 'border-[#D8DED6]'
                  }`}
                  title="Klik untuk lihat struk"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-[#1B2521] group-hover:text-[#1F4034] transition-colors">
                        {t.id}
                      </span>
                      <span className="font-serif font-bold text-sm text-[#7C5E2E] font-mono">
                        {formatRupiah(t.total)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#56635B] mt-1">
                      <span>{t.kasir || 'Kasir'}</span>
                      <span className="font-mono">{formatDateTime(t.tanggal)}</span>
                    </div>

                    <div className="text-[11px] text-gray-600 mt-1 line-clamp-1">
                      {(t.items || []).map(i => `${i.nama}${i.suhu ? ` [${i.suhu}]` : ''} x${i.qty}`).join(', ')}
                    </div>

                    {t.status === 'MenungguKoreksi' && (
                      <div className="mt-2 text-xs font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                        <span>Menunggu ACC ({t.alasanSalahInput || 'Salah input'})</span>
                      </div>
                    )}

                    {t.status === 'Dikoreksi' && (
                      <div className="mt-2 text-xs font-semibold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-300">
                        &times; Dibatalkan
                      </div>
                    )}
                  </div>

                  {/* Tombol Aksi */}
                  <div className="pt-2 border-t border-[#D8DED6] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onViewReceipt?.(t);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[#D8DED6] bg-white hover:bg-gray-100 text-[#1B2521] text-xs font-medium flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#1F4034]" />
                      <span>Lihat Struk</span>
                    </button>

                    {t.status === 'Selesai' && onBukaLaporSalahInput && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          onBukaLaporSalahInput(t);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                        title="Lapor salah input ke owner"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Salah Input</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
