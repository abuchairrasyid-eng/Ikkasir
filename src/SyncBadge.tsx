import React, { useEffect, useState } from 'react';
import { CloudSync } from '../services/cloud';

// Lencana kecil: menunjukkan nota yang belum terkirim ke Google Sheets.
export const SyncBadge: React.FC = () => {
  const [pending, setPending] = useState(CloudSync.pending());
  const [failed, setFailed] = useState(CloudSync.failedCount());

  useEffect(() => {
    const refresh = () => {
      setPending(CloudSync.pending());
      setFailed(CloudSync.failedCount());
    };
    window.addEventListener('cloud-status', refresh);
    const timer = setInterval(refresh, 3000);
    // Minta browser agar tidak menghapus data lokal (antrean nota) saat penyimpanan penuh
    try { void navigator.storage?.persist?.(); } catch { /* abaikan */ }
    // Peringatan bila kasir menutup halaman padahal masih ada nota belum terkirim
    const warn = (e: BeforeUnloadEvent) => {
      if (CloudSync.pending() > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('cloud-status', refresh);
      clearInterval(timer);
      window.removeEventListener('beforeunload', warn);
    };
  }, []);

  if (!CloudSync.enabled() || (pending === 0 && failed === 0)) return null;

  return (
    <div className="fixed bottom-3 left-20 md:left-24 z-[60] max-w-[260px] rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-900 shadow-lg">
      {pending > 0 && (
        <div className="font-semibold">
          {pending} data belum terkirim ke Sheet. Jangan tutup atau hapus data browser.
        </div>
      )}
      {failed > 0 && (
        <div className="mt-1 font-semibold text-red-700">{failed} data gagal terkirim berulang kali.</div>
      )}
      <button
        type="button"
        onClick={() => {
          CloudSync.retryFailed();
          void CloudSync.flush();
        }}
        className="mt-1.5 rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white cursor-pointer"
      >
        Kirim ulang sekarang
      </button>
    </div>
  );
};
