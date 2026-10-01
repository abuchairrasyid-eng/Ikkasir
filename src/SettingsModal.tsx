import React, { useState } from 'react';
import { User, AppConfig } from '../types';
import { X, Volume2, Printer, Store, RefreshCw, LogOut, QrCode, Percent, Bluetooth, CheckCircle2, AlertCircle } from 'lucide-react';
import { BluetoothPrinter } from '../services/bluetoothPrinter';
import { KATEGORI_PRESET } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  onLogout: () => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  config,
  onSaveConfig,
  onLogout,
  onResetData,
}) => {
  const [namaToko, setNamaToko] = useState(config.namaToko);
  const [autoPrint, setAutoPrint] = useState(config.autoPrint);
  const [soundEnabled, setSoundEnabled] = useState(config.soundEnabled);
  const [qrisBarcodeEnabled, setQrisBarcodeEnabled] = useState(
    config.qrisBarcodeEnabled !== undefined 
      ? config.qrisBarcodeEnabled 
      : (config.qrisPopupEnabled !== undefined ? config.qrisPopupEnabled : false)
  );
  const [diskonEnabled, setDiskonEnabled] = useState(config.diskonEnabled !== false);
  const [bluetoothPrinterEnabled, setBluetoothPrinterEnabled] = useState(config.bluetoothPrinterEnabled || false);
  const [btConnected, setBtConnected] = useState(BluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState(BluetoothPrinter.getDeviceName());
  const [btStatusMsg, setBtStatusMsg] = useState('');
  const [btLoading, setBtLoading] = useState(false);
  const [kategoriNonaktif, setKategoriNonaktif] = useState<string[]>(config.kategoriNonaktif || []);

  if (!isOpen) return null;

  const handleConnectBt = async () => {
    setBtLoading(true);
    setBtStatusMsg('Mencari printer bluetooth...');
    const res = await BluetoothPrinter.connect();
    setBtLoading(false);
    if (res.success) {
      setBtConnected(true);
      setBtDeviceName(res.deviceName || 'Printer Bluetooth');
      setBtStatusMsg(`Terhubung dengan ${res.deviceName || 'Printer'}`);
    } else {
      setBtStatusMsg(res.error || 'Gagal terhubung.');
    }
  };

  const handleDisconnectBt = () => {
    BluetoothPrinter.disconnect();
    setBtConnected(false);
    setBtStatusMsg('Koneksi printer diputuskan.');
  };

  const handleTestPrintBt = async () => {
    setBtLoading(true);
    setBtStatusMsg('Mengirim data uji cetak...');
    const ok = await BluetoothPrinter.testPrint(namaToko.trim() || 'Kasir');
    setBtLoading(false);
    if (ok) {
      setBtStatusMsg('Uji cetak berhasil dikirim ke printer!');
    } else {
      setBtStatusMsg('Gagal mencetak. Pastikan printer terhubung.');
    }
  };

  const handleSave = () => {
    onSaveConfig({
      ...config,
      namaToko: namaToko.trim() || 'Kasir',
      autoPrint,
      soundEnabled,
      qrisEnabled: true, // QRIS payment is always available
      qrisBarcodeEnabled,
      qrisPopupEnabled: qrisBarcodeEnabled,
      diskonEnabled,
      kategoriNonaktif,
      bluetoothPrinterEnabled,
      bluetoothDeviceName: btConnected ? btDeviceName : config.bluetoothDeviceName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-[#12241E]/50 backdrop-blur-xs">
      <div className="bg-[#FCFBF7] rounded-3xl w-full max-w-lg shadow-2xl border border-[#D8DED6] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 px-6 border-b border-[#D8DED6] flex items-center justify-between">
          <h3 className="font-serif font-medium text-2xl text-[#1B2521] m-0">
            Pengaturan
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* User Profile Card */}
          <div className="flex items-center gap-3.5 pb-5 border-b border-[#D8DED6]">
            <div className="w-12 h-12 rounded-full bg-[#12241E] border border-[#C2A06A]/45 text-[#C2A06A] flex items-center justify-center text-sm font-bold tracking-wider">
              {user.nama.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-base text-[#1B2521]">{user.nama}</div>
              <div className="text-xs text-[#56635B] flex items-center gap-1.5">
                <span>Peran: {user.peran}</span>
                <span>&bull;</span>
                <span className="font-mono text-gray-400">@{user.username}</span>
              </div>
            </div>
          </div>

          {/* Store Name Setting */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider flex items-center gap-1.5">
              <Store className="w-4 h-4 text-[#1F4034]" />
              Nama Toko / Restoran
            </label>
            <input
              type="text"
              value={namaToko}
              onChange={e => setNamaToko(e.target.value)}
              placeholder="Kasir"
              className="w-full bg-transparent border-0 border-b border-[#D8DED6] py-1.5 text-sm text-[#1B2521] focus:outline-none focus:border-b-[#1F4034]"
            />
          </div>


          {/* Kategori Menu yang dipakai */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#56635B] uppercase tracking-wider">
              Kategori Menu yang Dipakai
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {KATEGORI_PRESET.map(k => {
                const aktif = !kategoriNonaktif.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() =>
                      setKategoriNonaktif(prev =>
                        prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
                      )
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all active:scale-95 border ${
                      aktif
                        ? 'bg-[#1F4034] text-[#F3EBDD] border-[#1F4034]'
                        : 'bg-white text-gray-400 line-through border-[#D8DED6]'
                    }`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400">
              Ketuk untuk menonaktifkan kategori yang tidak dijual (mis. Dessert).
            </p>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#1F4034]" />
                  Cetak Struk Otomatis
                </div>
                <p className="text-xs text-[#56635B]">
                  Buka dialog printer otomatis setelah pesanan selesai.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={e => setAutoPrint(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F4034]"></div>
              </label>
            </div>

            {/* Toggle Printer Thermal Bluetooth */}
            <div className="pt-3 border-t border-[#D8DED6]/70 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                    <Bluetooth className="w-4 h-4 text-blue-600" />
                    Printer Thermal Bluetooth (ESC/POS)
                  </div>
                  <p className="text-xs text-[#56635B]">
                    Aktifkan opsi cetak langsung ke printer mini/kasir 58mm atau 80mm via Bluetooth tanpa dialog browser.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bluetoothPrinterEnabled}
                    onChange={e => setBluetoothPrinterEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F4034]"></div>
                </label>
              </div>

              {/* Sub-panel when Bluetooth Printer is enabled */}
              {bluetoothPrinterEnabled && (
                <div className="p-3.5 bg-white rounded-2xl border border-[#D8DED6] space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#56635B] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${btConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                      {btConnected ? `Terhubung: ${btDeviceName}` : 'Belum Terhubung ke Printer'}
                    </span>
                    {btConnected && (
                      <button
                        type="button"
                        onClick={handleDisconnectBt}
                        className="text-[11px] text-red-600 hover:underline cursor-pointer"
                      >
                        Putuskan
                      </button>
                    )}
                  </div>

                  {btStatusMsg && (
                    <div className="text-[11px] text-[#1F4034] bg-[#F1F3EF] px-2.5 py-1 rounded-lg">
                      {btStatusMsg}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleConnectBt}
                      disabled={btLoading}
                      className="px-3 py-1.5 rounded-xl bg-[#12241E] hover:bg-[#1F4034] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Bluetooth className="w-3.5 h-3.5 text-[#C2A06A]" />
                      <span>{btConnected ? 'Ganti Printer' : 'Hubungkan Bluetooth'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestPrintBt}
                      disabled={btLoading}
                      className="px-3 py-1.5 rounded-xl border border-[#D8DED6] hover:bg-gray-100 text-gray-700 text-xs font-medium cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      Uji Cetak
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-[#1F4034]" />
                  Efek Suara Kasir
                </div>
                <p className="text-xs text-[#56635B]">
                  Denting lonceng register saat pesanan sukses diselesaikan.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={e => setSoundEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F4034]"></div>
              </label>
            </div>

            {/* Toggle Barcode QRIS di Layar */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#D8DED6]/70">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#1F4034]" />
                  Tampilkan Barcode QRIS di Layar
                </div>
                <p className="text-xs text-[#56635B]">
                  Jika dinonaktifkan, metode pembayaran QRIS tetap ada dan bisa dipilih di kasir, tetapi barcode QR tidak muncul di layar (transaksi QRIS langsung selesai sukses).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={qrisBarcodeEnabled}
                  onChange={e => setQrisBarcodeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F4034]"></div>
              </label>
            </div>

            {/* Toggle Diskon Feature */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#D8DED6]/70">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-[#1F4034]" />
                  Fitur Diskon (%)
                </div>
                <p className="text-xs text-[#56635B]">
                  Aktifkan baris diskon persentase saat pembayaran di kasir.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={diskonEnabled}
                  onChange={e => setDiskonEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F4034]"></div>
              </label>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#D8DED6] bg-[#F1F3EF] flex items-center justify-between">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs font-semibold text-[#A8392F] hover:underline underline-offset-4 flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Akun
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-semibold text-xs tracking-wide shadow-xs cursor-pointer"
          >
            Simpan &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
