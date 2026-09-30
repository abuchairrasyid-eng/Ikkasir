import React, { useState } from 'react';
import { Transaksi } from '../types';
import { formatRupiah, formatDateTime } from '../services/storage';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  transaksi: Transaksi | null;
  namaToko: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaksi,
  namaToko,
  onClose,
}) => {
  const [activeSlip, setActiveSlip] = useState<'pelanggan' | 'dapur' | 'bar'>('pelanggan');

  if (!transaksi) return null;

  const itemsMakanan = transaksi.items.filter(i => i.kategori.toLowerCase() !== 'minuman');
  const itemsMinuman = transaksi.items.filter(i => i.kategori.toLowerCase() === 'minuman');

  const handlePrintCurrent = () => {
    window.print();
  };

  const handlePrintAllSlips = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-[#FCFBF7] rounded-2xl w-full max-w-md shadow-2xl border border-[#D8DED6] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
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

        {/* Tab Selection for 3 slips */}
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
            Pelanggan
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

        {/* Thermal Slip Preview Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-[#1B2521] space-y-3 bg-[#FCFBF7] select-text">
          <div className="text-center space-y-0.5">
            <h4 className="font-bold text-base tracking-wider uppercase">{namaToko}</h4>
            <div className="text-[11px] text-gray-500 uppercase">
              {activeSlip === 'pelanggan'
                ? 'STRUK PEMBAYARAN'
                : activeSlip === 'dapur'
                ? 'TIKET PESANAN DAPUR'
                : 'TIKET PESANAN BAR'}
            </div>
            <div className="text-[10px] text-gray-500">
              {formatDateTime(transaksi.tanggal)} &bull; {transaksi.id}
            </div>
            <div className="text-[10px] text-gray-500">Kasir: {transaksi.kasir}</div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          {/* Items breakdown based on active slip */}
          {activeSlip === 'pelanggan' && (
            <div className="space-y-1.5">
              {transaksi.items.map((it, idx) => (
                <div key={it.cartItemId || idx} className="flex justify-between items-start">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{it.nama}</span>
                      {it.suhu && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            it.suhu === 'Dingin'
                              ? 'bg-sky-100 text-sky-800 border border-sky-300'
                              : 'bg-orange-100 text-orange-800 border border-orange-300'
                          }`}
                        >
                          {it.suhu === 'Dingin' ? '❄️ Dingin' : '🔥 Panas'}
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
                  <div className="font-semibold shrink-0">
                    {formatRupiah(it.harga * it.qty)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSlip === 'dapur' && (
            <div className="space-y-2">
              {itemsMakanan.length === 0 ? (
                <div className="text-center text-gray-400 py-4 italic">
                  Tidak ada menu dapur (makanan/snack) dalam pesanan ini.
                </div>
              ) : (
                itemsMakanan.map((it, idx) => (
                  <div key={it.cartItemId || idx} className="flex justify-between items-center text-sm font-semibold">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{it.nama}</span>
                        {it.suhu && (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-gray-100">
                            [{it.suhu}]
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
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : 'bg-orange-100 text-orange-800 border border-orange-300'
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

          {/* Totals on Customer Slip */}
          {activeSlip === 'pelanggan' && (
            <>
              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="space-y-1">
                {transaksi.diskon > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Diskon</span>
                    <span>-{formatRupiah(transaksi.diskon)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL</span>
                  <span>{formatRupiah(transaksi.total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Bayar ({transaksi.metodeBayar})</span>
                  <span>{formatRupiah(transaksi.bayar)}</span>
                </div>
                {transaksi.kembalian > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Kembali</span>
                    <span>{formatRupiah(transaksi.kembalian)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 my-2" />
              <div className="text-center text-[11px] text-gray-500 pt-1">
                Terima kasih atas kunjungan Anda!<br />
                Silakan datang kembali.
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#D8DED6] bg-[#F1F3EF] flex gap-2 justify-end">
          <button
            type="button"
            onClick={handlePrintAllSlips}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] text-[#F3EBDD] font-medium text-xs shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[#D8DED6] hover:bg-white text-[#1B2521] font-medium text-xs cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>

      {/* Hidden Thermal Print Output Area */}
      <div id="print-area" className="hidden">
        <div style={{ textAlign: 'center', fontWeight: 'bold' }}>{namaToko}</div>
        <div style={{ textAlign: 'center' }}>
          {activeSlip === 'pelanggan'
            ? 'STRUK PELANGGAN'
            : activeSlip === 'dapur'
            ? 'TIKET DAPUR'
            : 'TIKET BAR'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px' }}>
          {formatDateTime(transaksi.tanggal)} - {transaksi.id}
        </div>
        <div style={{ textAlign: 'center', fontSize: '10px' }}>Kasir: {transaksi.kasir}</div>
        <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '6px 0' }} />
        {activeSlip === 'pelanggan' ? (
          <>
            {transaksi.items.map((it, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    {it.nama} {it.suhu ? `[${it.suhu}]` : ''} x{it.qty}
                  </span>
                  <span>{formatRupiah(it.harga * it.qty)}</span>
                </div>
                {it.catatan && (
                  <div style={{ fontSize: '10px', fontStyle: 'italic' }}>
                    * {it.catatan}
                  </div>
                )}
              </div>
            ))}
            <hr style={{ border: 'none', borderTop: '1px dashed #000', margin: '6px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>Total</span>
              <span>{formatRupiah(transaksi.total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Bayar ({transaksi.metodeBayar})</span>
              <span>{formatRupiah(transaksi.bayar)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Kembali</span>
              <span>{formatRupiah(transaksi.kembalian)}</span>
            </div>
          </>
        ) : activeSlip === 'dapur' ? (
          itemsMakanan.map((it, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>
                  {it.nama} {it.suhu ? `[${it.suhu}]` : ''}
                </span>
                <span>x{it.qty}</span>
              </div>
              {it.catatan && (
                <div style={{ fontSize: '10px', fontStyle: 'italic' }}>
                  * {it.catatan}
                </div>
              )}
            </div>
          ))
        ) : (
          itemsMinuman.map((it, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>
                  {it.nama} {it.suhu ? `[${it.suhu}]` : ''}
                </span>
                <span>x{it.qty}</span>
              </div>
              {it.catatan && (
                <div style={{ fontSize: '10px', fontStyle: 'italic' }}>
                  * {it.catatan}
                </div>
              )}
            </div>
          ))
        )}
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px' }}>
          Terima kasih
        </div>
      </div>
    </div>
  );
};
