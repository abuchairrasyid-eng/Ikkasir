import React, { useState, useMemo } from 'react';
import { Transaksi, User } from '../types';
import { formatRupiah, formatDateTime } from '../services/storage';
import {
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

interface LaporanViewProps {
  transaksi: Transaksi[];
  user: User;
  onBukaLaporSalahInput: (tx: Transaksi) => void;
  onKoreksi: (id: string) => void;
  onTolakKoreksi?: (id: string) => void;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  transaksi,
  user,
  onBukaLaporSalahInput,
  onKoreksi,
  onTolakKoreksi,
}) => {
  const isOwner = user.peran === 'Owner';
  const [rangeMode, setRangeMode] = useState<'hari' | 'minggu' | 'bulan' | 'custom'>('hari');
  const [filterKasir, setFilterKasir] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number; x: number; y: number } | null>(null);

  // Custom date range state
  const [customDari, setCustomDari] = useState('');
  const [customSampai, setCustomSampai] = useState('');

  // Cashier list for dropdown
  const cashierOptions = useMemo(() => {
    return Array.from(new Set(transaksi.map(t => t.kasir).filter(Boolean)));
  }, [transaksi]);

  // Pending correction requests
  const pendingCorrections = useMemo(() => {
    return transaksi.filter(t => t.status === 'MenungguKoreksi');
  }, [transaksi]);

  // Date range filter calculation
  const dateBounds = useMemo(() => {
    const now = new Date();
    const start = new Date(now);

    if (rangeMode === 'hari') {
      start.setHours(0, 0, 0, 0);
      return { start, end: new Date() };
    }
    if (rangeMode === 'minggu') {
      const day = now.getDay();
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      return { start, end: new Date() };
    }
    if (rangeMode === 'bulan') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: new Date() };
    }
    if (rangeMode === 'custom' && customDari && customSampai) {
      const d = new Date(customDari);
      d.setHours(0, 0, 0, 0);
      const s = new Date(customSampai);
      s.setHours(23, 59, 59, 999);
      return { start, end: s };
    }

    start.setHours(0, 0, 0, 0);
    return { start, end: new Date() };
  }, [rangeMode, customDari, customSampai]);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return transaksi.filter(t => {
      const tgl = new Date(t.tanggal);
      const withinDate = tgl >= dateBounds.start && tgl <= dateBounds.end;
      const matchKasir = isOwner
        ? (!filterKasir || t.kasir === filterKasir)
        : t.kasir.toLowerCase() === user.nama.toLowerCase();
      return withinDate && matchKasir;
    });
  }, [transaksi, dateBounds, filterKasir, isOwner, user.nama]);

  // Completed valid sales (Dikoreksi & Ditolak are excluded or separated)
  const countableTxs = useMemo(() => {
    return filteredTxs.filter(t => t.status === 'Selesai');
  }, [filteredTxs]);

  const totalPenjualan = useMemo(() => {
    return countableTxs.reduce((sum, t) => sum + t.total, 0);
  }, [countableTxs]);

  const jumlahTransaksi = countableTxs.length;
  const rataRata = jumlahTransaksi > 0 ? Math.round(totalPenjualan / jumlahTransaksi) : 0;

  // Chart data
  const chartPoints = useMemo(() => {
    const map: Record<string, number> = {};
    const sorted = [...countableTxs].sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    sorted.forEach(t => {
      const label = new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      map[label] = (map[label] || 0) + t.total;
    });

    const entries = Object.entries(map);
    if (entries.length === 0) return [];

    const maxVal = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([label, value], idx) => {
      const x = entries.length === 1 ? 50 : (idx / (entries.length - 1)) * 100;
      const y = 100 - (value / maxVal) * 80;
      return { label, value, x, y };
    });
  }, [countableTxs]);

  const polylineCoords = useMemo(() => {
    return chartPoints.map(p => `${p.x},${p.y}`).join(' ');
  }, [chartPoints]);

  const areaCoords = useMemo(() => {
    if (chartPoints.length === 0) return '';
    const firstX = chartPoints[0].x;
    const lastX = chartPoints[chartPoints.length - 1].x;
    return `${firstX},100 ${polylineCoords} ${lastX},100`;
  }, [chartPoints, polylineCoords]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['ID Transaksi', 'Tanggal', 'Kasir', 'Metode Bayar', 'Status', 'Total (Rp)', 'Dibayar (Rp)', 'Item Pesanan', 'Catatan / Alasan Salah'];
    const rows = filteredTxs.map(t => [
      t.id,
      t.tanggal,
      t.kasir,
      t.metodeBayar,
      t.status,
      t.total,
      t.bayar,
      t.items.map(i => `${i.nama}${i.suhu ? ` (${i.suhu})` : ''} x${i.qty}`).join('; '),
      t.alasanSalahInput || t.catatan || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderStatus = (status: Transaksi['status'], alasan?: string) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            Selesai
          </span>
        );
      case 'MenungguKoreksi':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
            Menunggu ACC Owner
          </span>
        );
      case 'Dikoreksi':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <X className="w-3 h-3 text-rose-600" />
            Dikoreksi (Batal)
          </span>
        );
      case 'Ditolak':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-300">
            Ditolak Owner
          </span>
        );
      case 'Ditahan':
      case 'OpenBill':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Open Bill
          </span>
        );
      default:
        return <span className="text-[11px] text-gray-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#D8DED6]/70">
        <div>
          <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
            Laporan Penjualan
          </h1>
          <p className="text-xs sm:text-sm text-[#56635B] mt-1 font-sans">
            {isOwner
              ? 'Kelola omzet, unduh rekap CSV, dan setujui (ACC) permintaan koreksi salah input kasir.'
              : `Riwayat transaksi kasir untuk ${user.nama}. Anda dapat melaporkan jika ada salah input.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D8DED6] hover:bg-white text-[#1B2521] text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4 text-[#1F4034]" />
          Unduh Laporan CSV
        </button>
      </div>

      {/* PERMINTAAN KOREKSI SALAH INPUT (MENUNGGU ACC OWNER) */}
      {pendingCorrections.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50/90 border-2 border-amber-300 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-amber-950">
                  {pendingCorrections.length} Transaksi Menunggu Persetujuan Koreksi (ACC)
                </h3>
                <p className="text-xs text-amber-800">
                  {isOwner
                    ? 'Kasir melaporkan adanya salah input pada transaksi berikut. Klik ACC untuk menyetujui pembatalan/koreksi.'
                    : 'Permintaan salah input yang telah Anda ajukan sedang menunggu persetujuan dari Owner.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {pendingCorrections.map(t => (
              <div
                key={t.id}
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#1B2521]">{t.id}</span>
                    <span className="text-xs text-[#7C5E2E] font-serif font-bold">
                      {formatRupiah(t.total)}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      &bull; Kasir: <b>{t.kasir}</b>
                    </span>
                  </div>

                  <div className="text-xs text-[#A8392F] font-medium mt-1">
                    Alasan: &ldquo;{t.alasanSalahInput || t.catatan || 'Salah input pesanan'}&rdquo;
                  </div>

                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Menu: {t.items.map(i => `${i.nama}${i.suhu ? ` (${i.suhu})` : ''} x${i.qty}`).join(', ')}
                  </div>
                </div>

                {/* Owner ACC Actions */}
                {isOwner ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onKoreksi(t.id)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                      title="Setujui koreksi dan kurangi dari omzet toko"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Setujui (ACC)</span>
                    </button>

                    {onTolakKoreksi && (
                      <button
                        type="button"
                        onClick={() => onTolakKoreksi(t.id)}
                        className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 active:scale-95 text-gray-700 font-semibold text-xs cursor-pointer transition-all"
                      >
                        Tolak
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-300 self-start sm:self-auto">
                    Menunggu ACC Owner
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Filter & Cashier Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[#D8DED6]">
        {/* Date Tabs */}
        <div className="flex gap-4">
          {(['hari', 'minggu', 'bulan'] as const).map(mode => {
            const label = mode === 'hari' ? 'Hari Ini' : mode === 'minggu' ? 'Minggu Ini' : 'Bulan Ini';
            const isActive = rangeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setRangeMode(mode)}
                className={`text-sm font-medium pb-1.5 relative cursor-pointer transition-colors ${
                  isActive ? 'text-[#1B2521] font-semibold' : 'text-[#56635B] hover:text-[#1B2521]'
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[#C2A06A]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Range Picker */}
        <div className="flex items-center gap-2 text-xs text-[#56635B] flex-wrap">
          <span>Rentang:</span>
          <input
            type="date"
            value={customDari}
            onChange={e => {
              setCustomDari(e.target.value);
              setRangeMode('custom');
            }}
            className="border-0 border-b border-[#D8DED6] bg-transparent py-1 text-xs focus:outline-none focus:border-b-[#1F4034]"
          />
          <span>s/d</span>
          <input
            type="date"
            value={customSampai}
            onChange={e => {
              setCustomSampai(e.target.value);
              setRangeMode('custom');
            }}
            className="border-0 border-b border-[#D8DED6] bg-transparent py-1 text-xs focus:outline-none focus:border-b-[#1F4034]"
          />
        </div>

        {/* Cashier Filter Dropdown (Owner Only) */}
        {isOwner && (
          <div className="flex items-center gap-2 text-xs text-[#56635B]">
            <span>Filter Kasir:</span>
            <select
              value={filterKasir}
              onChange={e => setFilterKasir(e.target.value)}
              className="bg-transparent border-0 border-b border-[#D8DED6] py-1 pr-6 text-xs text-[#1B2521] font-medium focus:outline-none focus:border-b-[#1F4034]"
            >
              <option value="">Semua Kasir ({cashierOptions.length})</option>
              {cashierOptions.map(c => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-[#56635B] font-semibold uppercase tracking-wider">
            Total Omzet Bersih
          </span>
          <div className="font-serif font-bold text-2xl sm:text-3xl text-[#1B2521] mt-2 font-mono">
            {formatRupiah(totalPenjualan)}
          </div>
          <span className="text-[11px] text-[#2C6A4E] mt-1 block">
            Pesanan selesai dan terverifikasi
          </span>
        </div>

        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-[#56635B] font-semibold uppercase tracking-wider">
            Total Transaksi Lunas
          </span>
          <div className="font-serif font-bold text-2xl sm:text-3xl text-[#1B2521] mt-2 font-mono">
            {jumlahTransaksi} <span className="text-sm font-sans font-normal text-gray-500">struk</span>
          </div>
          <span className="text-[11px] text-[#56635B] mt-1 block">
            Rata-rata {formatRupiah(rataRata)} / struk
          </span>
        </div>

        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-5 shadow-2xs">
          <span className="text-xs text-[#56635B] font-semibold uppercase tracking-wider">
            Status Koreksi &amp; Batal
          </span>
          <div className="font-serif font-bold text-2xl sm:text-3xl text-[#A8392F] mt-2 font-mono">
            {filteredTxs.filter(t => t.status === 'Dikoreksi').length}{' '}
            <span className="text-sm font-sans font-normal text-gray-500">dibatalkan</span>
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {pendingCorrections.length} menunggu ACC
          </span>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-6 shadow-2xs space-y-3">
        <h3 className="font-serif font-bold text-base text-[#1B2521] m-0">
          Grafik Tren Omzet Penjualan
        </h3>
        <div className="h-44 w-full relative">
          {chartPoints.length <= 1 ? (
            <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
              Data transaksi belum cukup untuk menampilkan tren grafik.
            </div>
          ) : (
            <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C2A06A" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#C2A06A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={areaCoords} fill="url(#chartGrad)" />
              <polyline points={polylineCoords} fill="none" stroke="#1F4034" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="space-y-3">
        <h2 className="font-serif font-medium text-xl text-[#1B2521] m-0">
          Riwayat Transaksi ({filteredTxs.length})
        </h2>

        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1B2521] bg-[#F1F3EF]/60 text-[#56635B]">
                  <th className="p-3.5 pl-5 font-semibold">ID &amp; Waktu</th>
                  <th className="p-3.5 font-semibold">Kasir</th>
                  <th className="p-3.5 font-semibold">Detail Menu</th>
                  <th className="p-3.5 text-right font-semibold">Total</th>
                  <th className="p-3.5 font-semibold">Metode</th>
                  <th className="p-3.5 font-semibold">Status</th>
                  <th className="p-3.5 pr-5 text-right font-semibold">Tindakan Salah Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EBE4]">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#56635B] italic">
                      Tidak ada transaksi pada periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                  filteredTxs.map(t => (
                    <tr key={t.id} className="hover:bg-black/[0.015] transition-colors">
                      <td className="p-3.5 pl-5 font-mono">
                        <div className="font-bold text-[#1B2521]">{t.id}</div>
                        <div className="text-[11px] text-gray-500">{formatDateTime(t.tanggal)}</div>
                      </td>
                      <td className="p-3.5 font-medium text-[#1B2521]">
                        {t.kasir}
                        {t.nomorMeja && (
                          <div className="text-[10px] text-[#7C5E2E]">{t.nomorMeja}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-700 max-w-xs">
                        <div className="line-clamp-2">
                          {t.items.map(i => `${i.nama}${i.suhu ? ` [${i.suhu}]` : ''} x${i.qty}`).join(', ')}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-serif font-bold text-sm text-[#7C5E2E] font-mono">
                        {formatRupiah(t.total)}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-[#1F4034]/5 text-[#1F4034] font-semibold text-[11px]">
                          {t.metodeBayar}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {renderStatus(t.status)}
                        {t.alasanSalahInput && (
                          <div className="text-[10px] text-[#A8392F] italic mt-0.5 line-clamp-1" title={t.alasanSalahInput}>
                            Alasan: {t.alasanSalahInput}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        {/* Lapor Salah Input Button */}
                        {t.status === 'Selesai' && (
                          <button
                            type="button"
                            onClick={() => onBukaLaporSalahInput(t)}
                            className="text-xs font-semibold text-[#A8392F] hover:underline underline-offset-4 cursor-pointer active:scale-95 inline-flex items-center gap-1"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Lapor Salah Input</span>
                          </button>
                        )}

                        {/* Owner ACC Actions if MenungguKoreksi */}
                        {t.status === 'MenungguKoreksi' && isOwner && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onKoreksi(t.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer active:scale-95"
                              title="Setujui Koreksi (ACC)"
                            >
                              ACC
                            </button>
                            {onTolakKoreksi && (
                              <button
                                type="button"
                                onClick={() => onTolakKoreksi(t.id)}
                                className="px-2 py-1 rounded-lg border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium text-xs cursor-pointer"
                              >
                                Tolak
                              </button>
                            )}
                          </div>
                        )}

                        {t.status === 'MenungguKoreksi' && !isOwner && (
                          <span className="text-[11px] text-amber-800 italic">
                            Menunggu ACC Owner
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
