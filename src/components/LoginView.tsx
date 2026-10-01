import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Role } from '../types';
import { ApiClient } from '../services/api';
import { playTapSound } from '../services/storage';
import {
  UserCheck,
  Delete,
  ArrowRight,
  Lock,
  LogIn,
  X,
  Store,
  Clock,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  namaToko: string;
}

const PIN_LENGTH = 6;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, namaToko }) => {
  // Modal popup state: false initially for a clean welcome screen, true when popup is opened
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState(() => localStorage.getItem('kasir_last_username') || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock for clean welcome screen
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDigitPress = (digit: string) => {
    if (loading) return;
    try {
      playTapSound();
    } catch {
      // ignore
    }
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
    }
  };

  const handleBackspace = () => {
    try {
      playTapSound();
    } catch {
      // ignore
    }
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const submitLogin = useCallback(
    async (pinToUse?: string) => {
      const currentPin = pinToUse !== undefined ? pinToUse : pin;
      const cleanUsername = username.trim();

      if (!cleanUsername) {
        setError('Ketik username akun kasir terlebih dahulu.');
        return;
      }

      if (currentPin.length !== PIN_LENGTH) {
        setError('PIN harus 6 angka.');
        return;
      }

      setError('');
      setLoading(true);

      try {
        const res = await ApiClient.fetchWithCloudFallback<User>('login', {
          username: cleanUsername,
          password: currentPin,
        });

        if (!res.ok) {
          setError(res.error || 'Username atau PIN yang Anda masukkan salah.');
          setPin('');
        } else {
          // Nama dan peran dibaca otomatis dari sheet User
          const peranRaw = (res.peran as string) || (res.data?.peran as string) || 'Kasir';
          const peran: Role = peranRaw === 'Owner' || peranRaw === 'Admin' ? peranRaw : 'Kasir';
          const loggedUser: User = {
            id: String((res.id as string) || (res.data?.id as string) || 'u-' + cleanUsername),
            nama: (res.nama as string) || (res.data?.nama as string) || cleanUsername,
            username: (res.username as string) || (res.data?.username as string) || cleanUsername,
            peran,
          };
          localStorage.setItem('kasir_last_username', cleanUsername);
          onLoginSuccess(loggedUser);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal terhubung ke database.');
      } finally {
        setLoading(false);
      }
    },
    [pin, username, onLoginSuccess]
  );

  // Keyboard shortcut listener:
  // If modal closed -> Enter opens modal.
  // If modal open -> numeric keys type PIN, Escape closes modal.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) {
        if (e.key === 'Enter' || e.key === ' ') {
          setIsModalOpen(true);
        }
        return;
      }

      // If user is currently typing in the username input
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type === 'text') {
        if (e.key === 'Enter') {
          submitLogin();
        } else if (e.key === 'Escape') {
          setIsModalOpen(false);
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        submitLogin();
      } else if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, pin, submitLogin]);

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫'],
  ];

  const formattedDate = useMemo(() => {
    return currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [currentTime]);

  const formattedTime = useMemo(() => {
    return currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [currentTime]);

  return (
    <div className="relative min-h-screen w-full bg-[#F1F3EF] flex flex-col justify-between overflow-x-hidden selection:bg-[#C2A06A] selection:text-[#12241E]">
      {/* Subtle Aesthetic Background Patterns */}
      <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(#1F4034_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#1F4034]/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#C2A06A]/10 blur-3xl pointer-events-none" />

      {/* Top Bar on Clean Landing Screen */}
      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#1F4034] rounded-2xl flex items-center justify-center font-serif font-bold text-xl text-[#1F4034] bg-white shadow-2xs">
            {namaToko.trim().charAt(0).toUpperCase() || 'K'}
          </div>
          <div>
            <span className="font-serif font-bold text-base text-[#12241E] leading-tight block">
              {namaToko}
            </span>
            <span className="text-[11px] text-[#56635B] font-medium">
              Sistem Kasir Pintar POS
            </span>
          </div>
        </div>

        {/* Live Clock & Status Badge */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-[#56635B]">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Kasir Aktif</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#1B2521] bg-white px-3 py-1 rounded-full border border-[#D8DED6] shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-[#1F4034]" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </header>

      {/* Hero Content with Clean "Masuk" CTA Button */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto w-full">
        {/* Emblem Badge */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#12241E] text-[#F3EBDD] flex items-center justify-center shadow-xl border border-[#C2A06A]/40 mb-6 group transition-transform duration-300 hover:scale-105">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-dashed border-[#C2A06A]/60 flex items-center justify-center font-serif font-bold text-3xl sm:text-4xl text-[#C2A06A]">
            {namaToko.trim().charAt(0).toUpperCase() || 'K'}
          </div>
        </div>

        {/* Store Title & Slogan */}
        <h1 className="font-serif font-bold text-4xl sm:text-5xl md:text-6xl text-[#12241E] tracking-tight leading-[1.05] m-0">
          {namaToko}
        </h1>
        <p className="mt-4 text-[#56635B] text-sm sm:text-base font-normal max-w-md mx-auto leading-relaxed">
          Platform kasir cepat, pencatatan pesanan instan, dan pembukuan laporan otomatis untuk kelancaran operasional toko Anda.
        </p>

        {/* Date & Terminal Info */}
        <div className="mt-3 text-xs text-[#56635B] font-medium">
          {formattedDate} &bull; Siap melayani transaksi
        </div>

        {/* Big Prominent "Masuk" Button that triggers the Popup with Animation */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(true);
              try {
                playTapSound();
              } catch {
                // ignore
              }
            }}
            className="w-full py-4 px-6 rounded-2xl bg-[#12241E] hover:bg-[#1F4034] text-[#F3EBDD] font-bold text-base transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-3 border border-[#C2A06A]/30 group"
          >
            <div className="w-7 h-7 rounded-xl bg-[#C2A06A] text-[#12241E] flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
            <span>Masuk ke Kasir</span>
            <ArrowRight className="w-4 h-4 text-[#C2A06A] group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="mt-4 text-[11px] text-[#56635B]">
          Tekan <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#D8DED6] font-mono text-[10px] text-gray-700 shadow-2xs">Enter</kbd> atau klik tombol di atas untuk membuka login PIN.
        </div>
      </main>

      {/* Footer on Clean Landing Screen */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-[#56635B]/80">
        &copy; {new Date().getFullYear()} {namaToko}. Sistem POS Kasir Pintar.
      </footer>

      {/* ANIMATED POPUP MODAL LOGIN (Tampilan Hijau Elegan) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#12241E]/70 backdrop-blur-md overflow-y-auto p-4 animate-fade-in"
          onClick={e => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="mx-auto my-4 sm:my-10 bg-[#FCFBF7] rounded-3xl w-full max-w-sm sm:max-w-md shadow-2xl border border-[#D8DED6] overflow-hidden flex flex-col animate-spring-up"
          >
            {/* Header Hijau Elegan POS */}
            <div className="bg-[#12241E] text-[#F3EBDD] p-5 sm:p-6 border-b border-[#C2A06A]/30 relative">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#C2A06A] text-[#12241E] flex items-center justify-center font-serif font-bold text-xl shadow-md shrink-0">
                  <KeyRound className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-serif font-bold text-xl text-[#F3EBDD] leading-tight m-0">
                    Buka Akun Kasir
                  </h2>
                  <p className="text-xs text-[#C2A06A] mt-0.5">
                    {namaToko} &bull; Masukkan PIN
                  </p>
                </div>
              </div>
            </div>

            {/* Content & Numeric Keypad Form */}
            <div className="p-5 sm:p-6 space-y-4">
              {/* Username Input & Auto-Detection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#56635B] uppercase tracking-wider">
                  <span>Username Kasir</span>

                </div>

                <div className="relative">
                  <input
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    autoFocus={!username}
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    placeholder="Ketik username Anda"
                    className="w-full bg-white border border-[#D8DED6] focus:border-[#1F4034] rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold text-[#1B2521] outline-none shadow-2xs transition-colors"
                  />
                  <UserCheck className="w-4 h-4 text-[#1F4034] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* PIN Indicator Dots */}
              <div className="flex items-center justify-center gap-3 pt-1">
                {Array.from({ length: PIN_LENGTH }, (_, i) => i).map(idx => {
                  const isFilled = idx < pin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 border-2 ${
                        isFilled
                          ? 'bg-[#1F4034] border-[#1F4034] scale-110 shadow-xs'
                          : 'bg-white border-[#D8DED6]'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  className="w-full text-center text-xs text-[#A8392F] bg-red-50 border border-red-200 py-1.5 px-3 rounded-xl font-medium animate-shake"
                >
                  {error}
                </div>
              )}

              {/* Numeric Phone Keypad Grid */}
              <div className="grid grid-cols-3 gap-2">
                {keypadRows.flat().map(val => {
                  if (val === 'C') {
                    return (
                      <button
                        key="clear"
                        type="button"
                        onClick={handleClear}
                        className="h-11 sm:h-12 rounded-2xl bg-white hover:bg-red-50 text-xs font-bold text-[#A8392F] border border-[#D8DED6] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                        title="Hapus semua"
                      >
                        CLEAR
                      </button>
                    );
                  }

                  if (val === '⌫') {
                    return (
                      <button
                        key="backspace"
                        type="button"
                        onClick={handleBackspace}
                        className="h-11 sm:h-12 rounded-2xl bg-white hover:bg-gray-100 text-[#56635B] hover:text-[#1B2521] border border-[#D8DED6] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
                        title="Hapus satu angka"
                      >
                        <Delete className="w-5 h-5" />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleDigitPress(val)}
                      className="h-11 sm:h-12 rounded-2xl bg-white hover:bg-[#1F4034]/5 active:bg-[#1F4034]/10 text-[#1B2521] font-serif font-bold text-xl border border-[#D8DED6] hover:border-[#1F4034] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center justify-center select-none"
                    >
                      {val}
                    </button>
                  );
                })}
              </div>

              {/* Submit CTA Button inside Popup */}
              <button
                type="button"
                onClick={() => submitLogin()}
                disabled={loading || pin.length !== PIN_LENGTH || username.trim().length === 0}
                className="w-full py-3 px-4 rounded-2xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-[0.98] text-[#F3EBDD] font-bold text-xs tracking-wide transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                <span>
                  {loading
                    ? 'Memverifikasi Akun & PIN...'
                    : 'Masuk'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Demo Help & Dismiss */}
              <div className="flex items-center justify-between text-[11px] text-[#56635B] pt-1 border-t border-[#D8DED6]/70">
                <span>Peran dibaca otomatis dari akun Anda</span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-800 underline cursor-pointer"
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
