import React, { useState, useMemo } from 'react';
import { Transaksi, User, PaymentMethod } from '../types';
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
  CreditCard,
  QrCode,
  Banknote,
  BookmarkCheck,
  TrendingUp,
  Flame,
  Heart,
} from 'lucide-react';

interface LaporanViewProps {
  transaksi: Transaksi[];
  user: User;
  onBukaLaporSalahInput: (tx: Transaksi) => void;
  onKoreksi: (id: string) => void;
  onTolakKoreksi?: (id: string) => void;
  onSelesaikanPesananDitahan?: (id: string, metode: PaymentMethod) => void;
  onResumeHold?: (id: string) => void;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  transaksi,
  user,
  onBukaLaporSalahInput,
  onKoreksi,
  onTolakKoreksi,
  onSelesaikanPesananDitahan,
  onResumeHold,
}) => {
  const isOwner = user.peran === 'Owner' || user.peran === 'Admin';
  const [rangeMode, setRangeMode] = useState<'hari' | 'minggu' | 'bulan' | 'custom'>('hari');
  const [filterKasir, setFilterKasir] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    value: number;
    count?: number;
    x: number;
    y: number;
  } | null>(null);

  // State for completing held transaction
  const [completingTx, setCompletingTx] = useState<Transaksi | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('Tunai');

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

  const totalTip = useMemo(() => {
    return countableTxs.reduce((sum, t) => sum + (t.tip || 0), 0);
  }, [countableTxs]);

  const jumlahTransaksi = countableTxs.length;
  const rataRata = jumlahTransaksi > 0 ? Math.round(totalPenjualan / jumlahTransaksi) : 0;

  // Laporan Metode Pembayaran (Cukup Tunai dan QRIS)
  const paymentBreakdown = useMemo(() => {
    const data: Record<'Tunai' | 'QRIS', { count: number; total: number }> = {
      Tunai: { count: 0, total: 0 },
      QRIS: { count: 0, total: 0 },
    };

    countableTxs.forEach(t => {
      const m = t.metodeBayar === 'QRIS' ? 'QRIS' : 'Tunai';
      data[m].count += 1;
      data[m].total += t.total;
    });

    const totalAll = totalPenjualan || 1;
    return {
      Tunai: {
        ...data.Tunai,
        percent: Math.round((data.Tunai.total / totalAll) * 100),
      },
      QRIS: {
        ...data.QRIS,
        percent: Math.round((data.QRIS.total / totalAll) * 100),
      },
    };
  }, [countableTxs, totalPenjualan]);

  // Grafik Pesanan yang Sering Keluar (Menu Terlaris)
  const topOrderedItems = useMemo(() => {
    const map: Record<string, { nama: string; kategori: string; totalQty: number; totalOmzet: number }> = {};

    countableTxs.forEach(t => {
      t.items.forEach(item => {
        const key = item.nama;
        if (!map[key]) {
          map[key] = {
            nama: item.nama,
            kategori: item.kategori || 'Menu',
            totalQty: 0,
            totalOmzet: 0,
          };
        }
        map[key].totalQty += item.qty;
        map[key].totalOmzet += item.qty * item.harga;
      });
    });

    const list = Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
    const maxQty = list.length > 0 ? list[0].totalQty : 1;

    return {
      items: list.slice(0, 6),
      totalUniqueItems: list.length,
      maxQty,
    };
  }, [countableTxs]);

  // Perbaikan Bug Grafik Tren Omzet Penjualan (Mendukung pola jam hari ini, multi-hari, hover tooltip)
  const chartData = useMemo(() => {
    if (countableTxs.length === 0) {
      return { points: [], maxVal: 0, polyline: '', area: '', isHourly: false };
    }

    const sorted = [...countableTxs].sort(
      (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
    );

    // Jika 'hari' (Hari Ini) atau custom tanggal yang sama: kelompokkan per rentang jam
    if (rangeMode === 'hari' || (rangeMode === 'custom' && customDari && customDari === customSampai)) {
      const hourSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
      const slotValues: Record<string, number> = {};
      const slotCounts: Record<string, number> = {};
      hourSlots.forEach(s => {
        slotValues[s] = 0;
        slotCounts[s] = 0;
      });

      sorted.forEach(t => {
        const d = new Date(t.tanggal);
        const h = d.getHours();
        let matched = '08:00';
        for (let i = 0; i < hourSlots.length; i++) {
          const slotH = parseInt(hourSlots[i].split(':')[0], 10);
          if (h <= slotH || i === hourSlots.length - 1) {
            matched = hourSlots[i];
            break;
          }
        }
        slotValues[matched] = (slotValues[matched] || 0) + t.total;
        slotCounts[matched] = (slotCounts[matched] || 0) + 1;
      });

      const maxVal = Math.max(...Object.values(slotValues), 1);
      const points = hourSlots.map((slot, idx) => {
        const val = slotValues[slot];
        const x = (idx / (hourSlots.length - 1)) * 420 + 40;
        const y = 160 - (val / maxVal) * 115;
        return {
          label: `Pukul ${slot}`,
          displayLabel: slot,
          value: val,
          count: slotCounts[slot],
          x,
          y,
        };
      });

      const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
      const area = `${points[0].x},165 ${polyline} ${points[points.length - 1].x},165`;

      return { points, maxVal, polyline, area, isHourly: true };
    }

    // Untuk 'minggu', 'bulan', atau custom multi-hari: kelompokkan per tanggal
    const dayMap: Record<string, { total: number; count: number }> = {};
    sorted.forEach(t => {
      const label = new Date(t.tanggal).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });
      if (!dayMap[label]) dayMap[label] = { total: 0, count: 0 };
      dayMap[label].total += t.total;
      dayMap[label].count += 1;
    });

    const entries = Object.entries(dayMap);
    const maxVal = Math.max(...entries.map(([, v]) => v.total), 1);

    let points: { label: string; displayLabel: string; value: number; count: number; x: number; y: number }[] = [];

    if (entries.length === 1) {
      const [label, data] = entries[0];
      points = [
        { label: 'Awal', displayLabel: '', value: 0, count: 0, x: 40, y: 160 },
        { label, displayLabel: label, value: data.total, count: data.count, x: 250, y: 160 - (data.total / maxVal) * 115 },
        { label: 'Akhir', displayLabel: '', value: 0, count: 0, x: 460, y: 160 },
      ];
    } else {
      points = entries.map(([label, data], idx) => {
        const x = (idx / (entries.length - 1)) * 420 + 40;
        const y = 160 - (data.total / maxVal) * 115;
        return {
          label,
          displayLabel: label,
          value: data.total,
          count: data.count,
          x,
          y,
        };
      });
    }

    const polyline = points.map(p => `${p.x},${p.y}`).join(' ');
    const area = `${points[0].x},165 ${polyline} ${points[points.length - 1].x},165`;

    return { points, maxVal, polyline, area, isHourly: false };
  }, [countableTxs, rangeMode, customDari, customSampai]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['ID Transaksi', 'Tanggal', 'Kasir', 'Metode Bayar', 'Status', 'Total (Rp)', 'Tip (Rp)', 'Dibayar (Rp)', 'Item Pesanan', 'Catatan / Alasan Salah'];
    const rows = filteredTxs.map(t => [
      t.id,
      t.tanggal,
      t.kasir,
      t.metodeBayar,
      t.status,
      t.total,
      t.tip || 0,
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

  if (!isOwner) {
    return (
      <div className="p-8 sm:p-12 text-center bg-[#FCFBF7] rounded-3xl border border-[#D8DED6] shadow-sm max-w-lg mx-auto mt-12 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-xl text-[#1B2521]">Akses Laporan Dibatasi</h2>
        <p className="text-xs text-[#56635B] leading-relaxed">
          Laporan penjualan toko dan pembukuan hanya dapat diakses oleh akun <b>Admin / Owner</b>. Silakan masuk menggunakan akun yang berwenang.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#D8DED6]/70">
        <div>
          <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
            Laporan Penjualan
          </h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
            <span>Total Tip / Donasi</span>
          </span>
          <div className="font-serif font-bold text-2xl sm:text-3xl text-amber-900 mt-2 font-mono">
            {formatRupiah(totalTip)}
          </div>
          <span className="text-[11px] text-amber-700/80 mt-1 block">
            Dari kembalian ikhlas pelanggan
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

      {/* Laporan Metode Pembayaran */}
      <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-base text-[#1B2521] m-0 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#1F4034]" />
              Laporan Metode Pembayaran
            </h3>
          </div>
          <div className="text-xs text-[#56635B] font-mono bg-white px-3 py-1 rounded-xl border border-[#D8DED6] self-start sm:self-auto">
            Total Masuk: <b className="text-[#1F4034]">{formatRupiah(totalPenjualan)}</b>
          </div>
        </div>

        {/* Multi-segment Share Bar */}
        <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${paymentBreakdown.Tunai.percent}%` }}
            className="bg-emerald-600 transition-all duration-500"
            title={`Tunai: ${paymentBreakdown.Tunai.percent}%`}
          />
          <div
            style={{ width: `${paymentBreakdown.QRIS.percent}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`QRIS: ${paymentBreakdown.QRIS.percent}%`}
          />
        </div>

        {/* 2 Columns Cards: Tunai & QRIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Tunai */}
          <div className="p-3.5 rounded-xl bg-white border border-[#D8DED6] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Tunai (Cash)
                </span>
                <span className="font-serif font-bold text-base text-[#1B2521] font-mono">
                  {formatRupiah(paymentBreakdown.Tunai.total)}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  {paymentBreakdown.Tunai.count} transaksi
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {paymentBreakdown.Tunai.percent}%
              </span>
            </div>
          </div>

          {/* QRIS */}
          <div className="p-3.5 rounded-xl bg-white border border-[#D8DED6] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                  QRIS (Digital)
                </span>
                <span className="font-serif font-bold text-base text-[#1B2521] font-mono">
                  {formatRupiah(paymentBreakdown.QRIS.total)}
                </span>
                <span className="text-[10px] text-gray-500 block">
                  {paymentBreakdown.QRIS.count} transaksi
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                {paymentBreakdown.QRIS.percent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Grafik Tren Omzet & Grafik Pesanan Sering Keluar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Kolom 1: Grafik Tren Omzet Penjualan (Bug Fixed) */}
        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1B2521] m-0 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#1F4034]" />
                Grafik Tren Omzet Penjualan
              </h3>
              <p className="text-xs text-[#56635B] mt-0.5">
                {chartData.isHourly ? 'Pola penjualan per jam (Hari Ini)' : 'Grafik omzet harian'}
              </p>
            </div>
            {chartData.maxVal > 0 && (
              <span className="text-[11px] text-[#7C5E2E] font-mono bg-[#EBE3D3]/50 px-2 py-0.5 rounded-lg">
                Puncak: {formatRupiah(chartData.maxVal)}
              </span>
            )}
          </div>

          <div className="h-52 w-full relative pt-2">
            {chartData.points.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
                Belum ada transaksi selesai pada periode ini untuk ditampilkan pada grafik.
              </div>
            ) : (
              <>
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 500 200"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradFixed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C2A06A" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#C2A06A" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Guide Lines */}
                  <line x1="40" y1="45" x2="460" y2="45" stroke="#E5E9E2" strokeDasharray="3 3" />
                  <line x1="40" y1="102" x2="460" y2="102" stroke="#E5E9E2" strokeDasharray="3 3" />
                  <line x1="40" y1="160" x2="460" y2="160" stroke="#D8DED6" strokeWidth="1.5" />

                  {/* Area Polygon */}
                  <polygon points={chartData.area} fill="url(#chartGradFixed)" />

                  {/* Polyline Stroke */}
                  <polyline
                    points={chartData.polyline}
                    fill="none"
                    stroke="#1F4034"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Interactive Circles & X-axis Labels */}
                  {chartData.points.map((p, i) => (
                    <g key={i}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4.5"
                        fill="#FCFBF7"
                        stroke="#1F4034"
                        strokeWidth="2.5"
                        className="cursor-pointer transition-transform hover:scale-150"
                        onMouseEnter={() => setHoveredPoint(p)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {p.displayLabel && (
                        <text
                          x={p.x}
                          y="185"
                          textAnchor="middle"
                          fill="#56635B"
                          fontSize="11"
                          fontFamily="sans-serif"
                        >
                          {p.displayLabel}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>

                {/* Hover Tooltip Popup */}
                {hoveredPoint && (
                  <div
                    className="absolute z-20 pointer-events-none bg-[#12241E] text-white text-[11px] p-2 rounded-xl shadow-lg border border-[#C2A06A]/40 transform -translate-x-1/2 -translate-y-full animate-fade-in"
                    style={{
                      left: `${(hoveredPoint.x / 500) * 100}%`,
                      top: `${(hoveredPoint.y / 200) * 100}%`,
                      marginTop: '-8px',
                    }}
                  >
                    <div className="font-bold text-[#C2A06A]">{hoveredPoint.label}</div>
                    <div className="font-mono text-xs">{formatRupiah(hoveredPoint.value)}</div>
                    {hoveredPoint.count !== undefined && hoveredPoint.count > 0 && (
                      <div className="text-[10px] text-gray-300">{hoveredPoint.count} transaksi</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Kolom 2: Grafik Pesanan yang Sering Keluar (Menu Terlaris) */}
        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-[#1B2521] m-0 flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                Pesanan yang Sering Keluar
              </h3>
            </div>
            <span className="text-[11px] text-[#1F4034] font-medium bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
              {topOrderedItems.items.length} Menu Teratas
            </span>
          </div>

          <div className="space-y-2.5 pt-1">
            {topOrderedItems.items.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-gray-400 italic">
                Belum ada pesanan menu pada periode ini.
              </div>
            ) : (
              topOrderedItems.items.map((item, idx) => {
                const percent = Math.round((item.totalQty / topOrderedItems.maxQty) * 100);
                const rankBadges = [
                  'bg-[#C2A06A] text-white', // #1 Emas
                  'bg-slate-400 text-white', // #2 Perak
                  'bg-amber-700 text-white', // #3 Perunggu
                  'bg-gray-200 text-gray-700',
                  'bg-gray-200 text-gray-700',
                  'bg-gray-200 text-gray-700',
                ];

                return (
                  <div key={item.nama} className="p-2.5 rounded-xl bg-white border border-[#D8DED6] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${rankBadges[idx] || rankBadges[3]}`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[#1B2521]">{item.nama}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">({item.kategori})</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#1F4034] font-mono">{item.totalQty} terjual</span>
                        <span className="text-[10px] text-gray-500 block font-mono">{formatRupiah(item.totalOmzet)}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full transition-all duration-500 ${
                          idx === 0 ? 'bg-[#C2A06A]' : 'bg-[#1F4034]'
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
                        <div>{formatRupiah(t.total)}</div>
                        {Boolean(t.tip && t.tip > 0) && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1 mt-0.5 font-sans font-semibold">
                            <Heart className="w-2.5 h-2.5 fill-amber-600 text-amber-600" />
                            <span>Tip {formatRupiah(t.tip || 0)}</span>
                          </div>
                        )}
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
                        {/* Lapor Salah Input Button for Selesai */}
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

                        {/* Selesaikan Pesanan Ditahan / Open Bill jika pelanggan sudah bayar */}
                        {(t.status === 'Ditahan' || t.status === 'OpenBill') && (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setCompletingTx(t);
                                setSelectedPaymentMethod('Tunai');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] text-white font-bold text-xs cursor-pointer active:scale-95 shadow-2xs inline-flex items-center gap-1"
                              title="Pelanggan bayar, selesaikan pesanan sekarang"
                            >
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Selesaikan Pesanan</span>
                            </button>

                            {onResumeHold && (
                              <button
                                type="button"
                                onClick={() => onResumeHold(t.id)}
                                className="px-2 py-1.5 rounded-xl border border-[#D8DED6] hover:bg-white text-gray-700 text-xs font-medium cursor-pointer"
                                title="Buka kembali di Kasir untuk tambah item atau bayar"
                              >
                                Ke Kasir
                              </button>
                            )}
                          </div>
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

      {/* MODAL SELESAIKAN PESANAN DITAHAN (BAYAR & LUNAS) */}
      {completingTx && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-md shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up">
            <div className="p-5 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#C2A06A] text-[#12241E] flex items-center justify-center font-bold">
                  <BookmarkCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#F3EBDD] leading-tight">
                    Selesaikan Pembayaran Pesanan
                  </h3>
                  <div className="text-[11px] text-[#C2A06A] font-mono">
                    ID: {completingTx.id} &bull; {completingTx.namaPelanggan ? `Tamu: ${completingTx.namaPelanggan}` : completingTx.nomorMeja || 'Pesanan Ditahan'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletingTx(null)}
                className="text-white/70 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Order Summary Box */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#D8DED6] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#56635B]">
                  <span>Total Tagihan:</span>
                  <span className="font-serif font-bold text-base text-[#1F4034] font-mono">
                    {formatRupiah(completingTx.total)}
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 pt-1 border-t border-dashed border-[#D8DED6]">
                  {completingTx.items.map(i => `${i.nama} (x${i.qty})`).join(', ')}
                </div>
              </div>

              {/* Pilih Metode Pembayaran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#56635B] uppercase tracking-wider">
                  Pilih Metode Pembayaran:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Tunai', 'QRIS'] as PaymentMethod[]).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                        selectedPaymentMethod === method
                          ? 'bg-[#1F4034] text-[#F3EBDD] border-[#1F4034] shadow-sm ring-2 ring-[#C2A06A]'
                          : 'bg-white text-gray-700 border-[#D8DED6] hover:border-gray-400'
                      }`}
                    >
                      {method === 'Tunai' && <Banknote className="w-4 h-4" />}
                      {method === 'QRIS' && <QrCode className="w-4 h-4" />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-2">
                {onResumeHold && (
                  <button
                    type="button"
                    onClick={() => {
                      const id = completingTx.id;
                      setCompletingTx(null);
                      onResumeHold(id);
                    }}
                    className="px-3 py-2.5 rounded-xl border border-[#D8DED6] hover:bg-gray-100 text-xs font-semibold text-gray-700 cursor-pointer"
                  >
                    Buka di Kasir
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (onSelesaikanPesananDitahan) {
                      onSelesaikanPesananDitahan(completingTx.id, selectedPaymentMethod);
                    }
                    setCompletingTx(null);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Konfirmasi Pembayaran Selesai</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
