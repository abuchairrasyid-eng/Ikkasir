import React, { useState } from 'react';
import { User, AppConfig } from '../types';
import { ApiClient, APPS_SCRIPT_TEMPLATE } from '../services/api';
import { X, Copy, Check, Database, Volume2, Printer, Store, RefreshCw, LogOut, QrCode, Percent } from 'lucide-react';

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
  const [qrisEnabled, setQrisEnabled] = useState(config.qrisEnabled !== false);
  const [diskonEnabled, setDiskonEnabled] = useState(config.diskonEnabled !== false);
  const [mode, setMode] = useState<'local' | 'cloud'>(config.mode);
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [apiToken, setApiToken] = useState(config.apiToken);

  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig({
      namaToko: namaToko.trim() || 'Kasir',
      autoPrint,
      soundEnabled,
      qrisEnabled,
      diskonEnabled,
      mode,
      apiUrl: apiUrl.trim(),
      apiToken: apiToken.trim(),
    });
    onClose();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await ApiClient.testCloudConnection(apiUrl.trim(), apiToken.trim());
    setTestResult(res);
    setIsTesting(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            <p className="text-[11px] text-gray-400">
              Tampil di struk pembayaran, bon dapur/bar, dan logo aplikasi.
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

            {/* Toggle QRIS Payment Option */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-[#D8DED6]/70">
              <div>
                <div className="text-sm font-medium text-[#1B2521] flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#1F4034]" />
                  Metode Bayar QRIS
                </div>
                <p className="text-xs text-[#56635B]">
                  Aktifkan atau sembunyikan opsi pembayaran QRIS di kasir.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={qrisEnabled}
                  onChange={e => setQrisEnabled(e.target.checked)}
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

          {/* Google Sheets / Apps Script Integration */}
          <div className="p-4 rounded-2xl bg-[#F1F3EF] border border-[#D8DED6] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1F4034]" />
                <span className="font-semibold text-xs text-[#1B2521] uppercase tracking-wider">
                  Koneksi Google Sheets (Apps Script)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800">
                {mode === 'cloud' && apiUrl ? 'Mode Cloud' : 'Mode Offline Lokal'}
              </span>
            </div>

            <p className="text-xs text-[#56635B] leading-relaxed">
              Secara bawaan kasir menyimpan data offline di peramban. Jika Anda ingin menghubungkan Google Sheets sebagai database sentral kasir:
            </p>

            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-[#56635B]">
                  URL Web App Google Apps Script (/exec)
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={e => {
                    setApiUrl(e.target.value);
                    if (e.target.value) setMode('cloud');
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-white border border-[#D8DED6] rounded-xl px-3 py-1.5 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#56635B]">
                  Token Rahasia (Samakan dengan di Code.gs)
                </label>
                <input
                  type="text"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder="kode_rahasia_anda"
                  className="w-full bg-white border border-[#D8DED6] rounded-xl px-3 py-1.5 text-xs text-[#1B2521] focus:outline-none focus:border-[#1F4034]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiUrl}
                  className="px-3 py-1.5 rounded-lg border border-[#D8DED6] bg-white hover:bg-gray-50 text-xs font-medium text-[#1B2521] disabled:opacity-40 cursor-pointer"
                >
                  {isTesting ? 'Menguji...' : 'Uji Koneksi'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="text-xs text-[#1F4034] hover:underline underline-offset-4 font-medium"
                >
                  {showCode ? 'Sembunyikan Kode Apps Script' : 'Lihat Kode Code.gs'}
                </button>
              </div>

              {testResult && (
                <div
                  className={`text-xs p-2.5 rounded-lg ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {testResult.message}
                </div>
              )}

              {showCode && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#1B2521]">
                      Script Google Apps Script (Code.gs):
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 text-[11px] text-[#1F4034] font-semibold hover:underline"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Tersalin!' : 'Salin Kode'}
                    </button>
                  </div>
                  <pre className="p-3 bg-[#1B2521] text-[#F3EBDD] rounded-xl text-[10px] overflow-x-auto max-h-36 font-mono">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Kembalikan semua menu, stok, dan contoh riwayat transaksi ke data bawaan demo?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="text-xs text-[#56635B] hover:text-[#1B2521] hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Data Contoh (Pulihkan Menu &amp; Stok Demo)
            </button>
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
