import React from 'react';
import { ActiveView, User } from '../types';
import { Receipt, BarChart3, UtensilsCrossed, Users, SlidersHorizontal, LogOut } from 'lucide-react';

interface SidebarRailProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  user: User;
  onLogout: () => void;
  onOpenSettings: () => void;
  namaToko: string;
  pendingAccCount?: number;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeView,
  setActiveView,
  user,
  onLogout,
  onOpenSettings,
  namaToko,
  pendingAccCount = 0,
}) => {
  const isOwner = user.peran === 'Owner';
  const initial = user.nama.slice(0, 2).toUpperCase();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; ownerOnly?: boolean; badge?: number }[] = [
    { id: 'kasir', label: 'Kasir', icon: <Receipt className="w-5 h-5" /> },
    {
      id: 'laporan',
      label: 'Laporan',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: isOwner && pendingAccCount > 0 ? pendingAccCount : undefined,
    },
    { id: 'produk', label: 'Produk', icon: <UtensilsCrossed className="w-5 h-5" />, ownerOnly: true },
    { id: 'akun', label: 'Akun', icon: <Users className="w-5 h-5" />, ownerOnly: true },
  ];

  return (
    <>
      {/* Desktop Left Rail */}
      <aside className="hidden md:flex flex-col items-center bg-[#12241E] text-[#8FA098] w-[88px] shrink-0 py-6 select-none z-20">
        {/* Brand Mark */}
        <div
          title={namaToko}
          className="w-11 h-11 border border-[#C2A06A] rounded-full flex items-center justify-center font-serif text-xl text-[#C2A06A] mb-8 shrink-0 shadow-sm"
        >
          {namaToko.trim().charAt(0).toUpperCase() || 'K'}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col w-full gap-2">
          {navItems.map(item => {
            if (item.ownerOnly && !isOwner) return null;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`relative w-full py-3.5 flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium ${
                  isActive
                    ? 'text-[#C2A06A]'
                    : 'text-[#8FA098] hover:text-[#C9D3CD]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C2A06A] rounded-r-md" />
                )}
                {item.icon}
                <span className="tracking-wide">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-2 right-4 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenSettings}
            className="relative w-full py-3.5 flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium text-[#8FA098] hover:text-[#C9D3CD]"
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span className="tracking-wide">Atur</span>
          </button>
        </nav>

        {/* Foot Profile & Logout */}
        <div className="mt-auto flex flex-col items-center gap-4">
          <div
            title={`${user.nama} (${user.peran})`}
            className="w-9 h-9 rounded-full bg-[#1B362C] border border-[#C2A06A]/45 text-[#C2A06A] flex items-center justify-center text-xs font-bold tracking-wider"
          >
            {initial}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            className="p-2 text-[#8FA098] hover:text-[#E8B9AE] hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12241E] text-[#8FA098] border-t border-white/10 flex items-center justify-around h-16 pb-safe">
        {navItems.map(item => {
          if (item.ownerOnly && !isOwner) return null;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              className={`relative flex-1 py-2 flex flex-col items-center justify-center gap-1 transition-colors text-[10px] font-medium ${
                isActive ? 'text-[#C2A06A]' : 'text-[#8FA098]'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C2A06A] rounded-b" />
              )}
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-1 right-3 bg-amber-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-bounce">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenSettings}
          className="flex-1 py-2 flex flex-col items-center justify-center gap-1 transition-colors text-[10px] font-medium text-[#8FA098]"
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span>Atur</span>
        </button>
      </nav>
    </>
  );
};
