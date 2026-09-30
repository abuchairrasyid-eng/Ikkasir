import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { ApiClient } from '../services/api';
import { playTapSound } from '../services/storage';
import { Delete, ArrowRight, Lock } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  namaToko: string;
}

const PIN_LENGTH = 6;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, namaToko }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('kasir_last_username') || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const submitLogin = useCallback(async (pinToUse?: string) => {
    const currentPin = pinToUse !== undefined ? pinToUse : pin;
    const namaUser = username.trim();
    if (!namaUser) {
      setError('Masukkan username Anda.');
      return;
    }
    if (!currentPin) {
      setError('Masukkan angka PIN.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await ApiClient.fetchWithCloudFallback<User>('login', {
        username: namaUser,
        password: currentPin,
      });

      if (!res.ok) {
        setError(res.error || 'Username atau PIN salah.');
        setPin('');
      } else {
        // Nama dan peran dibaca otomatis dari sheet User
        const peranSheet = ((res.peran as string) || (res.data?.peran as string) || 'Kasir') as string;
        const loggedUser: User = {
          id: String((res.id as string) || (res.data?.id as string) || 'u-' + namaUser),
          nama: (res.nama as string) || (res.data?.nama as string) || namaUser,
          username: (res.username as string) || (res.data?.username as string) || namaUser,
          peran: (peranSheet === 'Owner' ? 'Owner' : 'Kasir') as 'Kasir' | 'Owner',
        };
        localStorage.setItem('kasir_last_username', namaUser);
        onLoginSuccess(loggedUser);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung ke database.');
    } finally {
      setLoading(false);
    }
  }, [pin, username, onLoginSuccess]);

  // Listen for physical keyboard numeric input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // sedang mengetik username
      if (e.key >= '0' && e.key <= '9') {
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        submitLogin();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, submitLogin]);

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', '⌫'],
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#F1F3EF]">
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] min-h-full">
      {/* Brand Pane */}
      <div className="bg-[#12241E] text-[#F3EBDD] p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 border border-[#C2A06A] rounded-full flex items-center justify-center font-serif text-2xl text-[#C2A06A] shrink-0 shadow-sm">
            {namaToko.trim().charAt(0).toUpperCase() || 'K'}
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-[#C2A06A] font-semibold block">
              POS Kasir Pintar
            </span>
            <span className="text-xs text-[#9FB0A7]">Sistem Kasir &amp; Restoran</span>
          </div>
        </div>

        <div className="my-8 md:my-0">
          <h1 className="font-serif font-normal text-5xl sm:text-6xl md:text-7xl tracking-tight leading-[0.95] text-[#F3EBDD] m-0">
            {namaToko}
          </h1>
          <div className="w-14 h-[1px] bg-[#C2A06A] mt-6" />
          <p className="mt-4 text-[#9FB0A7] text-sm sm:text-base max-w-[32ch] font-normal leading-relaxed">
            Masuk dengan username dan PIN untuk mulai melayani pelanggan.
          </p>
        </div>

        <div className="text-xs text-[#9FB0A7]/70 hidden md:block">
          &copy; {new Date().getFullYear()} {namaToko}. Semua hak cipta dilindungi.
        </div>
      </div>

      {/* Phone PIN Pad Form Pane */}
      <div className="flex flex-col items-center justify-center p-6 pb-10 md:p-10">
        <div className="w-full max-w-[340px] flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-[#12241E] text-[#C2A06A] flex items-center justify-center mx-auto mb-2.5 shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-2xl text-[#1B2521] tracking-tight">
              Masuk ke Kasir
            </h2>
            <p className="text-xs text-[#56635B] mt-0.5">
              Ketik username, lalu masukkan 6 angka PIN
            </p>
          </div>

          {/* Kolom Username (diketik sendiri; peran dibaca otomatis dari sheet) */}
          <div className="w-full mb-5">
            <label htmlFor="login-username" className="block text-[11px] font-bold text-[#56635B] uppercase mb-1">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                setError('');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') submitLogin();
              }}
              placeholder="ketik username Anda"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus={!username}
              className="w-full bg-white border border-[#D8DED6] rounded-2xl px-4 py-3 text-sm font-medium text-[#1B2521] outline-none focus:border-[#1F4034] shadow-2xs"
            />
          </div>

          {/* Phone PIN Indicator Dots (like smartphone lock screen) */}
          <div className="flex items-center justify-center gap-2.5 my-2 mb-4">
            {Array.from({ length: PIN_LENGTH }, (_, i) => i).map(idx => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
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
              className="w-full text-center text-xs text-[#A8392F] bg-red-50 border border-red-200 py-1.5 px-3 rounded-xl font-medium mb-3 animate-shake"
            >
              {error}
            </div>
          )}

          {/* Numeric Phone Keypad Grid */}
          <div className="w-full grid grid-cols-3 gap-2.5 sm:gap-3 mb-4">
            {keypadRows.flat().map(val => {
              if (val === 'C') {
                return (
                  <button
                    key="clear"
                    type="button"
                    onClick={handleClear}
                    className="h-12 sm:h-14 rounded-2xl bg-white/70 hover:bg-white text-xs font-bold text-[#A8392F] border border-[#D8DED6] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
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
                    className="h-12 sm:h-14 rounded-2xl bg-white/70 hover:bg-white text-[#56635B] hover:text-[#1B2521] border border-[#D8DED6] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center justify-center"
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
                  className="h-12 sm:h-14 rounded-2xl bg-white hover:bg-gray-50 active:bg-gray-100 text-[#1B2521] font-serif font-bold text-2xl border border-[#D8DED6] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center justify-center select-none"
                >
                  {val}
                </button>
              );
            })}
          </div>

          {/* Masuk CTA Button */}
          <button
            type="button"
            onClick={() => submitLogin()}
            disabled={loading || pin.length !== PIN_LENGTH || username.trim().length === 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-[0.98] text-[#F3EBDD] font-bold text-sm tracking-wide transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Memverifikasi...' : 'Buka Kasir'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
};
