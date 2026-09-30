import React from 'react';
import { formatRupiah } from '../services/storage';
import { QrCode, X, Check, ShieldCheck } from 'lucide-react';

interface QRISModalProps {
  amount: number;
  namaToko: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const QRISModal: React.FC<QRISModalProps> = ({
  amount,
  namaToko,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-gray-200 overflow-hidden flex flex-col text-center">
        {/* QRIS Header */}
        <div className="bg-[#A8392F] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-sm">
            <QrCode className="w-5 h-5" />
            <span>QRIS NASIONAL</span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/80 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QRIS Body */}
        <div className="p-6 flex flex-col items-center space-y-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900 uppercase tracking-tight">
              {namaToko}
            </h3>
            <p className="text-xs text-gray-500 font-mono">NMID: ID1029384756182</p>
          </div>

          {/* Realistic SVG Simulated QR Code */}
          <div className="p-3 bg-white border-2 border-dashed border-gray-300 rounded-2xl shadow-inner relative group">
            <svg
              className="w-48 h-48 mx-auto"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="100" height="100" fill="white" />
              {/* Corner 1 */}
              <rect x="5" y="5" width="26" height="26" rx="4" fill="#1B2521" />
              <rect x="9" y="9" width="18" height="18" rx="2" fill="white" />
              <rect x="13" y="13" width="10" height="10" rx="1" fill="#1B2521" />
              {/* Corner 2 */}
              <rect x="69" y="5" width="26" height="26" rx="4" fill="#1B2521" />
              <rect x="73" y="9" width="18" height="18" rx="2" fill="white" />
              <rect x="77" y="13" width="10" height="10" rx="1" fill="#1B2521" />
              {/* Corner 3 */}
              <rect x="5" y="69" width="26" height="26" rx="4" fill="#1B2521" />
              <rect x="9" y="73" width="18" height="18" rx="2" fill="white" />
              <rect x="13" y="77" width="10" height="10" rx="1" fill="#1B2521" />
              {/* QR Matrix Details */}
              <rect x="36" y="8" width="8" height="8" fill="#1B2521" />
              <rect x="48" y="8" width="6" height="6" fill="#1B2521" />
              <rect x="58" y="10" width="6" height="6" fill="#1B2521" />
              <rect x="36" y="20" width="6" height="14" fill="#1B2521" />
              <rect x="46" y="18" width="10" height="8" fill="#1B2521" />
              <rect x="8" y="36" width="14" height="6" fill="#1B2521" />
              <rect x="8" y="48" width="8" height="12" fill="#1B2521" />
              <rect x="20" y="44" width="8" height="6" fill="#1B2521" />
              <rect x="36" y="38" width="28" height="28" rx="4" fill="#1F4034" />
              <circle cx="50" cy="52" r="8" fill="#C2A06A" />
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fontSize="8"
                fontWeight="bold"
                fill="#12241E"
                fontFamily="sans-serif"
              >
                Q
              </text>
              <rect x="70" y="38" width="10" height="10" fill="#1B2521" />
              <rect x="84" y="42" width="8" height="18" fill="#1B2521" />
              <rect x="72" y="52" width="6" height="12" fill="#1B2521" />
              <rect x="36" y="72" width="12" height="6" fill="#1B2521" />
              <rect x="52" y="72" width="8" height="14" fill="#1B2521" />
              <rect x="42" y="82" width="6" height="8" fill="#1B2521" />
              <rect x="68" y="70" width="8" height="8" fill="#1B2521" />
              <rect x="80" y="74" width="12" height="8" fill="#1B2521" />
              <rect x="70" y="84" width="14" height="8" fill="#1B2521" />
            </svg>
          </div>

          <div>
            <div className="text-xs text-gray-500">Total Pembayaran</div>
            <div className="font-serif font-bold text-2xl text-[#1B2521]">
              {formatRupiah(amount)}
            </div>
            <p className="text-[11px] text-gray-400 mt-1 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Dukungan GoPay, OVO, Dana, BCA, Mandiri, ShopeePay
            </p>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-gray-100 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[#2C6A4E] hover:bg-[#1F4034] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Check className="w-4 h-4" />
            Konfirmasi Lunas
          </button>
        </div>
      </div>
    </div>
  );
};
