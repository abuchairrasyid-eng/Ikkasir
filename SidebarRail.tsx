import React from 'react';
import { ActiveView, User } from '../types';
import { Receipt, BarChart3, UtensilsCrossed, Package, Users, SlidersHorizontal, LogOut } from 'lucide-react';

interface SidebarRailProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  user: User;
  onLogout: () => void;
  onOpenSettings: () => void;
  namaToko: string;
  pendingAccCount?: number;
  openBillsCount?: number;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  activeView,
  setActiveView,
  user,
  onLogout,
  onOpenSettings,
  namaToko,
  pendingAccCount = 0,
  openBillsCount = 0,
}) => {
  const isOwner = user.peran === 'Owner' || user.peran === 'Admin';
  const initial = user.nama.slice(0, 2).toUpperCase();

  const navItems: { id: ActiveView; label: string; icon: React.ReactNode; ownerOnly?: boolean; badge?: number }[] = [
    { id: 'menu', label: 'Menu', icon: <UtensilsCrossed className="w-5 h-5" /> },
    {
      id: 'transaksi',
      label: 'Transaksi',
      icon: <Receipt className="w-5 h-5" />,
      badge: openBillsCount > 0 ? openBillsCount : undefined,
    },
    {
      id: 'laporan',
      label: 'Laporan',
      icon: <BarChart3 className="w-5 h-5" />,
      badge: isOwner && pendingAccCount > 0 ? pendingAccCount : undefined,
      ownerOnly: true,
    },
    { id: 'produk', label: 'Produk', icon: <Package className="w-5 h-5" />, ownerOnly: true },
    { id: 'akun', label: 'Akun', icon: <Users className="w-5 h-5" />, ownerOnly: true },
  ];

  return (
    <>
      {/* Desktop Left Rail */}
      <aside className="hidden md:flex flex-col items-center bg-[#12241E] text-[#8FA098] w-[88px] shrink-0 py-6 select-none z-20">
        {/* Brand Mark */}
        <div
          title={`${namaToko} - ikkasir`}
          className="w-11 h-11 border border-[#C2A06A] rounded-full flex items-center justify-center font-serif text-base font-bold text-[#C2A06A] mb-8 shrink-0 shadow-sm"
        >
          ik
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col w-full gap-2">
          {navItems.map(item => {
            if (item.ownerOnly && !isOwner) return null;
            const isActive =
              activeView === item.id ||
              (item.id === 'menu' && (activeView as string) === 'kasir') ||
              (item.id === 'kasir' && (activeView as string) === 'menu');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`relative w-full py-3.5 flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium ${
                  isActive
                    ? 'text-[#C2A06A]'
                    : 'text-[#8FA098] hover:text-[#F3EBDD]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-[#C2A06A] rounded-r-md" />
                )}
                <div className="relative inline-flex items-center justify-center">
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="tracking-wide">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenSettings}
            className="relative w-full py-3.5 flex flex-col items-center gap-1.5 transition-colors cursor-pointer text-xs font-medium text-[#8FA098] hover:text-[#F3EBDD]"
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
            className="p-2 text-[#8FA098] hover:text-rose-300 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#12241E] text-[#8FA098] border-t border-white/10 flex items-center justify-around h-16 pb-safe">
        {navItems.map(item => {
          if (item.ownerOnly && !isOwner) return null;
          const isActive =
            activeView === item.id ||
            (item.id === 'menu' && (activeView as string) === 'kasir') ||
            (item.id === 'kasir' && (activeView as string) === 'menu');
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
              <div className="relative inline-flex items-center justify-center">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-white text-[9px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
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
