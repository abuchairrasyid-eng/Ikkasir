import React, { useState } from 'react';
import { Transaksi, SplitBillDetail } from '../types';
import { formatRupiah, formatDateTime } from '../services/storage';
import { Printer, X, CheckCircle2, Bluetooth, Loader2, Files, FileText } from 'lucide-react';
import { BluetoothPrinter } from '../services/bluetoothPrinter';

interface ReceiptModalProps {
  transaksi: Transaksi | null;
  namaToko: string;
  bluetoothPrinterEnabled?: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaksi,
  namaToko,
  bluetoothPrinterEnabled = false,
  onClose,
}) => {
  const [activeSlip, setActiveSlip] = useState<'pelanggan' | 'dapur' | 'bar'>('pelanggan');

  // Format nota split bill: 'combined' (Menyatu) atau 'separate' (Terpisah per Orang)
  const [splitViewMode, setSplitViewMode] = useState<'combined' | 'separate'>(() => {
    return transaksi?.splitPrintMode === 'separate' ? 'separate' : 'combined';
  });

  // Indeks orang yang sedang dilihat struknya pada mode terpisah (1..N)
  const [selectedPersonIndex, setSelectedPersonIndex] = useState<number>(1);

  const [btPrinting, setBtPrinting] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string>('');

  if (!transaksi) return null;

  const isSplit = Boolean(transaksi.isSplitBill && transaksi.splitDetails && transaksi.splitDetails.length > 0);
  const splitDetails: SplitBillDetail[] = transaksi.splitDetails || [];

  const currentPersonDetail = splitDetails.find(d => d.orang === selectedPersonIndex) || splitDetails[0] || null;

  const itemsMakanan = transaksi.items.filter(i => i.kategori.toLowerCase() !== 'minuman');
  const itemsMinuman = transaksi.items.filter(i => i.kategori.toLowerCase() === 'minuman');

  const handlePrintCurrent = () => {
    window.print();
  };

  const handlePrintBluetooth = async () => {
    setBtPrinting(true);
    setPrintFeedback('Mempersiapkan printer Bluetooth...');

    // Pastikan terhubung
    if (!BluetoothPrinter.isConnected()) {
      const conn = await BluetoothPrinter.connect();
      if (!conn.success) {
        setBtPrinting(false);
        setPrintFeedback(conn.error || 'Gagal terhubung ke printer Bluetooth.');
        return;
      }
    }

    if (activeSlip === 'pelanggan' && isSplit && splitViewMode === 'separate' && currentPersonDetail) {
      setPrintFeedback(`Mencetak struk ${currentPersonDetail.label || `Orang #${currentPersonDetail.orang}`}...`);
      const ok = await BluetoothPrinter.printPersonSlip(transaksi, currentPersonDetail, namaToko);
      setBtPrinting(false);
      if (ok) {
        setPrintFeedback('Struk perorangan berhasil dicetak!');
        setTimeout(() => setPrintFeedback(''), 4000);
      } else {
        setPrintFeedback('Gagal mengirim ke printer. Periksa Bluetooth.');
      }
    } else {
      setPrintFeedback(`Mencetak ${activeSlip === 'pelanggan' ? 'struk pembayaran' : `bon ${activeSlip}`}...`);
      const ok = await BluetoothPrinter.printSlip(transaksi, activeSlip, namaToko);
      setBtPrinting(false);
      if (ok) {
        setPrintFeedback('Struk berhasil dicetak via Bluetooth!');
        setTimeout(() => setPrintFeedback(''), 4000);
      } else {
        setPrintFeedback('Gagal mengirim ke printer. Periksa Bluetooth.');
      }
    }
  };

  // Cetak semua nota terpisah via Bluetooth berurutan
  const handlePrintAllSeparateBluetooth = async () => {
    if (!splitDetails.length) return;
    setBtPrinting(true);
    setPrintFeedback('Mempersiapkan cetak semua nota terpisah...');

    if (!BluetoothPrinter.isConnected()) {
      const conn = await BluetoothPrinter.connect();
      if (!conn.success) {
        setBtPrinting(false);
        setPrintFeedback(conn.error || 'Gagal terhubung ke printer Bluetooth.');
        return;
      }
    }

    for (let idx = 0; idx < splitDetails.length; idx++) {
      const d = splitDetails[idx];
      setPrintFeedback(`Mencetak nota ${d.label || `Orang #${d.orang}`} (${idx + 1}/${splitDetails.length})...`);
      await BluetoothPrinter.printPersonSlip(transaksi, d, namaToko);
      await new Promise(r => setTimeout(r, 600)); // jeda pemotong kertas
    }

    setBtPrinting(false);
    setPrintFeedback(`Semua ${splitDetails.length} nota terpisah berhasil dicetak!`);
    setTimeout(() => setPrintFeedback(''), 4000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-md shadow-2xl border border-[#D8DED6] flex flex-col max-h-[92vh] overflow-hidden animate-spring-up">
        {/* Header Modal */}
        <div className="p-4 px-6 border-b border-[#D8DED6] flex items-center justify-between bg-[#12241E] text-[#F3EBDD]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#C2A06A]" />
            <div>
              <h3 className="font-serif font-medium text-lg leading-tight">
                Transaksi Berhasil
              </h3>
              <p className="text-[11px] text-[#9FB0A7]">{transaksi.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9FB0A7] hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pilihan Slip: Pelanggan, Dapur, Bar */}
        <div className="grid grid-cols-3 border-b border-[#D8DED6] bg-[#F1F3EF] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveSlip('pelanggan')}
            className={`py-2.5 transition-colors cursor-pointer ${
              activeSlip === 'pelanggan'
                ? 'bg-[#FCFBF7] text-[#1F4034] font-semibold border-b-2 border-[#1F4034]'
                : 'text-[#56635B] hover:text-[#1B2521]'
            }`}
          >
            Pelanggan {isSplit && '(Split)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSlip('dapur')}
            className={`py-2.5 transition-colors cursor-pointer ${
              activeSlip === 'dapur'
                ? 'bg-[#FCFBF7] text-[#1F4034] font-semibold border-b-2 border-[#1F4034]'
                : 'text-[#56635B] hover:text-[#1B2521]'
            }`}
          >
            Dapur ({itemsMakanan.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSlip('bar')}
            className={`py-2.5 transition-colors cursor-pointer ${
              activeSlip === 'bar'
                ? 'bg-[#FCFBF7] text-[#1F4034] font-semibold border-b-2 border-[#1F4034]'
                : 'text-[#56635B] hover:text-[#1B2521]'
            }`}
          >
            Bar ({itemsMinuman.length})
          </button>
        </div>

        {/* Pilihan Opsi Nota Split Bill (Menyatu vs Terpisah) */}
        {activeSlip === 'pelanggan' && isSplit && (
          <div className="bg-[#EAEFE9] p-2.5 border-b border-[#D8DED6] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#1F4034] flex items-center gap-1.5">
                <Files className="w-3.5 h-3.5 text-[#C2A06A]" />
                <span>Format Nota Split Bill:</span>
              </span>
              <div className="flex gap-1 bg-white p-0.5 rounded-lg border border-[#D8DED6]">
                <button
                  type="button"
                  onClick={() => setSplitViewMode('combined')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    splitViewMode === 'combined'
                      ? 'bg-[#1F4034] text-[#F3EBDD] shadow-2xs'
                      : 'text-[#56635B] hover:text-[#1B2521]'
                  }`}
                >
                  Menyatu
                </button>
                <button
                  type="button"
                  onClick={() => setSplitViewMode('separate')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    splitViewMode === 'separate'
                      ? 'bg-[#1F4034] text-[#F3EBDD] shadow-2xs'
                      : 'text-[#56635B] hover:text-[#1B2521]'
                  }`}
                >
                  Terpisah ({splitDetails.length})
                </button>
              </div>
            </div>

            {/* Jika mode terpisah: Pilih orang yang ingin dilihat struknya */}
            {splitViewMode === 'separate' && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none">
                <span className="text-[10px] text-[#56635B] font-medium mr-1 shrink-0">Lihat:</span>
                {splitDetails.map(d => (
                  <button
                    key={d.orang}
                    type="button"
                    onClick={() => setSelectedPersonIndex(d.orang)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold shrink-0 cursor-pointer transition-all ${
                      selectedPersonIndex === d.orang
                        ? 'bg-[#1F4034] text-[#F3EBDD] shadow-2xs'
                        : 'bg-white text-[#56635B] border border-[#D8DED6] hover:bg-gray-100'
                    }`}
                  >
                    #{d.orang} {d.label || `Orang ${d.orang}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Thermal Slip Preview Body */}
        <div className="p-5 sm:p-6 overflow-y-auto font-mono text-xs text-[#1B2521] space-y-3 bg-[#FCFBF7] select-text flex-1">
          {/* Header Struk Toko */}
          <div className="text-center space-y-0.5">
            <h4 className="font-bold text-base tracking-wider uppercase">{namaToko}</h4>
            <div className="text-[11px] text-gray-600 font-bold uppercase">
              {activeSlip === 'pelanggan'
                ? isSplit && splitViewMode === 'separate' && currentPersonDetail
                  ? `STRUK SPLIT - ${currentPersonDetail.label || `ORANG #${currentPersonDetail.orang}`}`
                  : 'STRUK PEMBAYARAN'
                : activeSlip === 'dapur'
                ? 'TIKET PESANAN DAPUR'
                : 'TIKET PESANAN BAR'}
            </div>
            <div className="text-[10px] text-gray-500">
              {formatDateTime(transaksi.tanggal)} &bull; {transaksi.id}
            </div>
            <div className="text-[10px] text-gray-500">Kasir: {transaksi.kasir}</div>
            {isSplit && splitViewMode === 'separate' && currentPersonDetail && (
              <div className="text-[11px] font-bold text-[#1F4034] bg-emerald-50 py-0.5 px-2 rounded mt-1 border border-emerald-200 inline-block">
                Bagian: {currentPersonDetail.label || `Orang #${currentPersonDetail.orang}`}
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* KONTEN SLIP PELANGGAN */}
          {activeSlip === 'pelanggan' && (
            <>
              {/* OPSI 1: NOTA TERPISAH PER ORANG */}
              {isSplit && splitViewMode === 'separate' && currentPersonDetail ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    {currentPersonDetail.items && currentPersonDetail.items.length > 0 ? (
                      currentPersonDetail.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold">{it.nama}</span>
                              {it.suhu && (
                                <span className="text-[9px] font-bold px-1 rounded bg-gray-100">
                                  [{it.suhu}]
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500">
                              {it.qty} x {formatRupiah(it.harga)}
                            </div>
                          </div>
                          <span className="font-semibold shrink-0">
                            {formatRupiah(it.harga * it.qty)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-600 text-xs py-1">
                        Rincian: {currentPersonDetail.itemsSummary || 'Bagi Rata Tagihan'}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-gray-400 my-2" />

                  {/* Total Tagihan Orang Ini */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-bold text-sm text-[#1F4034]">
                      <span>TOTAL BAGIAN #{currentPersonDetail.orang}</span>
                      <span>{formatRupiah(currentPersonDetail.perOrang)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Metode Bayar</span>
                      <span className="font-bold">{currentPersonDetail.metode}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Status</span>
                      <span className="text-emerald-700 font-bold">LUNAS</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* OPSI 2: NOTA MENYATU (GABUNGAN SEMUA ITEM) */
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    {transaksi.items.map((it, idx) => (
                      <div key={it.cartItemId || idx} className="flex justify-between items-start">
                        <div className="pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold">{it.nama}</span>
                            {it.suhu && (
                              <span className="text-[9px] font-bold px-1 rounded bg-gray-100">
                                [{it.suhu}]
                              </span>
                            )}
                          </div>
                          {it.catatan && (
                            <div className="text-[10px] text-[#7C5E2E] italic">
                              Catatan: {it.catatan}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-500">
                            {it.qty} x {formatRupiah(it.harga)}
                          </div>
                        </div>
                        <span className="font-semibold shrink-0">
                          {formatRupiah(it.harga * it.qty)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-gray-400 my-2" />

                  {/* Financial Breakdown */}
                  <div className="space-y-1">
                    {transaksi.diskon > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Diskon</span>
                        <span>-{formatRupiah(transaksi.diskon)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL PESANAN</span>
                      <span>{formatRupiah(transaksi.total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Bayar ({transaksi.metodeBayar})</span>
                      <span>{formatRupiah(transaksi.bayar)}</span>
                    </div>
                    {Boolean(transaksi.tip && transaksi.tip > 0) && (
                      <div className="flex justify-between text-[#1F4034] font-semibold">
                        <span>Tip / Ikhlas</span>
                        <span>+{formatRupiah(transaksi.tip || 0)}</span>
                      </div>
                    )}
                    {transaksi.kembalian > 0 ? (
                      <div className="flex justify-between text-gray-600">
                        <span>Kembali</span>
                        <span>{formatRupiah(transaksi.kembalian)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-gray-400">
                        <span>Kembali</span>
                        <span>Rp 0</span>
                      </div>
                    )}
                  </div>

                  {/* Rincian Tambahan Split Bill pada Nota Menyatu */}
                  {isSplit && (
                    <div className="pt-2 border-t border-dashed border-gray-400 space-y-1">
                      <div className="font-bold text-[11px] text-[#1F4034] uppercase">
                        Rincian Pembagian Split Bill ({splitDetails.length} Orang):
                      </div>
                      {splitDetails.map(d => (
                        <div key={d.orang} className="flex justify-between text-[11px] py-0.5">
                          <span>
                            #{d.orang} {d.label || `Orang ${d.orang}`} ({d.metode})
                            {d.itemsSummary ? ` [${d.itemsSummary}]` : ''}
                          </span>
                          <span className="font-bold font-mono">{formatRupiah(d.perOrang)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="text-center text-[11px] text-gray-500 pt-1">
                Terima kasih atas kunjungan Anda!<br />
                Silakan datang kembali.
              </div>
            </>
          )}

          {/* KONTEN TIKET DAPUR */}
          {activeSlip === 'dapur' && (
            <div className="space-y-2">
              {itemsMakanan.length === 0 ? (
                <div className="text-center text-gray-400 py-4 italic">
                  Tidak ada menu makanan/snack dalam pesanan ini.
                </div>
              ) : (
                itemsMakanan.map((it, idx) => (
                  <div key={it.cartItemId || idx} className="flex justify-between items-center text-sm font-semibold">
                    <div>
                      <span>{it.nama}</span>
                      {it.catatan && (
                        <div className="text-xs text-[#7C5E2E] font-normal italic">
                          Catatan: {it.catatan}
                        </div>
                      )}
                    </div>
                    <span className="text-base px-2 py-0.5 bg-gray-100 rounded">
                      x{it.qty}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* KONTEN TIKET BAR */}
          {activeSlip === 'bar' && (
            <div className="space-y-2">
              {itemsMinuman.length === 0 ? (
                <div className="text-center text-gray-400 py-4 italic">
                  Tidak ada menu bar (minuman) dalam pesanan ini.
                </div>
              ) : (
                itemsMinuman.map((it, idx) => (
                  <div key={it.cartItemId || idx} className="flex justify-between items-center text-sm font-semibold">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{it.nama}</span>
                        {it.suhu && (
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              it.suhu === 'Dingin'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {it.suhu === 'Dingin' ? '❄️ Dingin' : '🔥 Panas'}
                          </span>
                        )}
                      </div>
                      {it.catatan && (
                        <div className="text-xs text-[#7C5E2E] font-normal italic">
                          Catatan: {it.catatan}
                        </div>
                      )}
                    </div>
                    <span className="text-base px-2 py-0.5 bg-gray-100 rounded">
                      x{it.qty}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#D8DED6] bg-[#F1F3EF] flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {printFeedback ? (
            <div className="text-[11px] font-semibold text-[#1F4034] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              {printFeedback}
            </div>
          ) : (
            <div className="text-[11px] text-gray-500 hidden sm:block">
              {bluetoothPrinterEnabled ? 'Printer Bluetooth Aktif' : 'Printer Browser / USB'}
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            {/* Opsi Cetak Bluetooth Semua Nota Terpisah */}
            {bluetoothPrinterEnabled && isSplit && splitViewMode === 'separate' && (
              <button
                type="button"
                onClick={handlePrintAllSeparateBluetooth}
                disabled={btPrinting}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                title="Cetak struk semua orang sekaligus via Bluetooth"
              >
                {btPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Files className="w-3.5 h-3.5" />}
                <span>Cetak Semua ({splitDetails.length})</span>
              </button>
            )}

            {bluetoothPrinterEnabled && (
              <button
                type="button"
                onClick={handlePrintBluetooth}
                disabled={btPrinting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-medium text-xs shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                title="Cetak langsung ke printer thermal 58/80mm via Bluetooth"
              >
                {btPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bluetooth className="w-3.5 h-3.5" />}
                <span>
                  {isSplit && splitViewMode === 'separate' && currentPersonDetail
                    ? `Cetak #${currentPersonDetail.orang}`
                    : 'Cetak Bluetooth'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintCurrent}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] text-[#F3EBDD] font-medium text-xs shadow-sm cursor-pointer active:scale-95"
              title="Cetak lewat dialog browser / USB"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                {isSplit && splitViewMode === 'separate' && currentPersonDetail
                  ? `Cetak #${currentPersonDetail.orang}`
                  : bluetoothPrinterEnabled
                  ? 'Cetak Browser'
                  : 'Cetak Struk'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-[#D8DED6] hover:bg-white text-[#1B2521] font-medium text-xs cursor-pointer"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
