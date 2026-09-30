import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const dismiss = () => {
    if (onDismiss) onDismiss();
  };

  useEffect(() => {
    if (!message) return;

    // Immediately dismiss upon any screen touch, click, or keypress
    const handleImmediateDismiss = () => {
      dismiss();
    };

    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', handleImmediateDismiss, { capture: true, once: true });
      window.addEventListener('touchstart', handleImmediateDismiss, { capture: true, once: true });
      window.addEventListener('keydown', handleImmediateDismiss, { capture: true, once: true });
    }, 50);

    // Fallback auto-dismiss after 3.5 seconds if untouched
    const fallbackTimer = setTimeout(() => {
      dismiss();
    }, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      window.removeEventListener('pointerdown', handleImmediateDismiss, { capture: true });
      window.removeEventListener('touchstart', handleImmediateDismiss, { capture: true });
      window.removeEventListener('keydown', handleImmediateDismiss, { capture: true });
    };
  }, [message]);

  if (!message) return null;

  return (
    <div
      onClick={dismiss}
      role="status"
      aria-live="polite"
      className="fixed left-1/2 bottom-8 -translate-x-1/2 z-[300] bg-[#12241E]/95 text-[#F3EBDD] backdrop-blur-md px-5 py-3 rounded-2xl text-xs sm:text-sm font-medium shadow-2xl tracking-wide max-w-[92vw] sm:max-w-md border border-[#C2A06A]/40 transition-all duration-200 animate-spring-up cursor-pointer flex items-center justify-between gap-3 select-none hover:bg-[#12241E]"
      title="Ketuk layar untuk menutup notifikasi"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-6 h-6 rounded-full bg-[#C2A06A]/20 text-[#C2A06A] flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <span className="truncate leading-tight font-sans text-[#F3EBDD]">{message}</span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 text-white/50 text-[11px] font-mono">
        <span className="hidden sm:inline text-[10px] text-white/40">tap to close</span>
        <X className="w-4 h-4 hover:text-white" />
      </div>
    </div>
  );
};
