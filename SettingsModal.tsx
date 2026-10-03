import React, { useState, useEffect } from 'react';
import { User, AppConfig } from '../types';
import { X, Volume2, Printer, Store, RefreshCw, LogOut, QrCode, Percent, Bluetooth, CheckCircle2, AlertCircle, Heart } from 'lucide-react';
import { BluetoothPrinter } from '../services/bluetoothPrinter';

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
      : (config.qrisPopupEnabled !== undefined ? config.qrisPopupEnabled : true)
  );
  const [diskonEnabled, setDiskonEnabled] = useState(config.diskonEnabled !== false);
  const [tipEnabled, setTipEnabled] = useState(config.tipEnabled !== false);
  const [bluetoothPrinterEnabled, setBluetoothPrinterEnabled] = useState(config.bluetoothPrinterEnabled || false);
  const [btConnected, setBtConnected] = useState(BluetoothPrinter.isConnected());
  const [btDeviceName, setBtDeviceName] = useState(BluetoothPrinter.getDeviceName());
  const [btStatusMsg, setBtStatusMsg] = useState('');
  const [btLoading, setBtLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNamaToko(config.namaToko);
      setAutoPrint(config.autoPrint);
      setSoundEnabled(config.soundEnabled);
      setQrisBarcodeEnabled(
        config.qrisBarcodeEnabled !== undefined 
          ? config.qrisBarcodeEnabled 
          : (config.qrisPopupEnabled !== undefined ? config.qrisPopupEnabled : true)
      );
      setDiskonEnabled(config.diskonEnabled !== false);
      setTipEnabled(config.tipEnabled !== false);
      setBluetoothPrinterEnabled(config.bluetoothPrinterEnabled || false);
      setBtConnected(BluetoothPrinter.isConnected());
      setBtDeviceName(BluetoothPrinter.getDeviceName());
      setBtStatusMsg('');
    }
  }, [isOpen, config]);

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
      qrisEnabled: true,
      qrisBarcodeEnabled,
      qrisPopupEnabled: qrisBarcodeEnabled,
      diskonEnabled,
      tipEnabled,
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

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#1F4034]" />
                  Cetak Struk Otomatis
                </div>
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

            {/* Opsi Tampilkan QR di Layar Kasir */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#D8DED6]/70">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#1F4034]" />
                  Tampilkan QR di Layar Kasir
                </div>
                <p className="text-xs text-[#56635B] mt-0.5">
                  Tampilkan pop-up kode QR di layar saat kasir memilih pembayaran QRIS.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={qrisBarcodeEnabled}
                  onChange={e => setQrisBarcodeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1F4034]"></div>
              </label>
            </div>

            {/* Toggle Fitur Tip Kasir */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#D8DED6]/70">
              <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-amber-600" />
                Fitur Tip Kasir
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={tipEnabled}
                  onChange={e => setTipEnabled(e.target.checked)}
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
