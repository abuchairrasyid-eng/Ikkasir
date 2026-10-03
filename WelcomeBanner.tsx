import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { Sparkles, X, ShieldCheck, UserCheck } from 'lucide-react';

interface WelcomeBannerProps {
  user: User | null;
  onDismiss: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user, onDismiss }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!user) return;

    const handleInstantDismiss = () => {
      setIsClosing(true);
      setTimeout(onDismiss, 180);
    };

    // Attach listeners on window to dismiss without capturing or blocking user clicks
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleInstantDismiss, { once: true });
      window.addEventListener('keydown', handleInstantDismiss, { once: true });
    }, 80);

    // Auto-dismiss fallback after 3 seconds if no touch occurs
    const autoDismiss = setTimeout(() => {
      handleInstantDismiss();
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoDismiss);
      window.removeEventListener('pointerdown', handleInstantDismiss);
      window.removeEventListener('keydown', handleInstantDismiss);
    };
  }, [user, onDismiss]);

  if (!user) return null;

  const isOwner = user.peran === 'Owner' || user.peran === 'Admin';

  return (
    <div
      onClick={e => {
        e.stopPropagation();
        setIsClosing(true);
        setTimeout(onDismiss, 180);
      }}
      role="alert"
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] transition-all duration-200 select-none cursor-pointer ${
        isClosing
          ? 'opacity-0 translate-y-4 scale-95 pointer-events-none'
          : 'opacity-100 translate-y-0 scale-100 animate-spring-up'
      }`}
      title="Ketuk layar di mana saja untuk menutup"
    >
      <div className="bg-[#12241E]/95 text-[#F3EBDD] backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-2xl border border-[#C2A06A]/45 flex items-center gap-3.5 max-w-[92vw] sm:max-w-md hover:border-[#C2A06A] transition-colors">
        {/* Avatar / Icon Badge */}
        <div className="w-9 h-9 rounded-full bg-[#1B362C] border border-[#C2A06A]/60 flex items-center justify-center shrink-0 shadow-inner">
          {isOwner ? (
            <ShieldCheck className="w-5 h-5 text-[#C2A06A]" />
          ) : (
            <UserCheck className="w-5 h-5 text-[#C2A06A]" />
          )}
        </div>

        {/* Text Details */}
        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm sm:text-base text-[#F3EBDD] truncate leading-tight">
              Selamat Datang, {user.nama}!
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                isOwner
                  ? 'bg-[#C2A06A] text-[#12241E]'
                  : 'bg-emerald-800 text-emerald-100 border border-emerald-600'
              }`}
            >
              {user.peran}
            </span>
          </div>
          <p className="text-[11px] text-[#9FB0A7] mt-0.5 font-sans flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#C2A06A] shrink-0" />
            <span>Sistem siap digunakan &bull; <i className="text-white/60">ketuk layar untuk langsung tutup</i></span>
          </p>
        </div>

        {/* Instant Close Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsClosing(true);
            setTimeout(onDismiss, 180);
          }}
          className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors ml-1"
          aria-label="Tutup bar selamat datang"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
