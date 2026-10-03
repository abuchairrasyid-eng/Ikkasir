import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, Produk, Transaksi, CartItem, ActiveView, AppConfig, PaymentMethod, Role, TemperatureOption } from './types';
import { CloudSync } from './services/cloud';
import { SyncBadge } from './components/SyncBadge';
import { StorageService, formatRupiah, playCashRegisterSound, playTapSound } from './services/storage';
import { LoginView } from './components/LoginView';
import { SidebarRail } from './components/SidebarRail';
import { KasirView } from './components/KasirView';
import { TransaksiView } from './components/TransaksiView';
import { OrderPanel } from './components/OrderPanel';
import { LaporanView } from './components/LaporanView';
import { ProdukView } from './components/ProdukView';
import { AkunView } from './components/AkunView';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { QRISModal } from './components/QRISModal';
import { Toast } from './components/Toast';
import { SplitBillModal } from './components/SplitBillModal';
import { OpenBillModal } from './components/OpenBillModal';
import { SalahInputModal } from './components/SalahInputModal';
import { WelcomeBanner } from './components/WelcomeBanner';
import { ShoppingBag } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(() => StorageService.getStoredUser());
  const [welcomeUser, setWelcomeUser] = useState<User | null>(null);
  const [config, setConfig] = useState<AppConfig>(() => StorageService.getConfig());
  const [activeView, setActiveView] = useState<ActiveView>('menu');

  const [produk, setProduk] = useState<Produk[]>(() => StorageService.getProduk());
  const [transaksi, setTransaksi] = useState<Transaksi[]>(() => StorageService.getTransaksi());
  const [users, setUsers] = useState<User[]>(() => StorageService.getUsers());

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const [kategoriNonaktif, setKategoriNonaktif] = useState<string[]>(() => StorageService.getKategoriNonaktif());

  const [isOrderPanelOpenMobile, setIsOrderPanelOpenMobile] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSplitBillOpen, setIsSplitBillOpen] = useState(false);
  const [isOpenBillModalOpen, setIsOpenBillModalOpen] = useState(false);
  const [selectedTxForSalahInput, setSelectedTxForSalahInput] = useState<Transaksi | null>(null);
  const [resumedTxId, setResumedTxId] = useState<string | null>(null);

  const [receiptModalTx, setReceiptModalTx] = useState<Transaksi | null>(null);
  const [qrisPending, setQrisPending] = useState<{
    diskon: number;
    bayar: number;
    kembalian: number;
    tip?: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Sync document title and mark
  useEffect(() => {
    document.title = config.namaToko;
  }, [config.namaToko]);

  // Reload data from local storage
  const reloadData = useCallback(() => {
    setProduk(StorageService.getProduk());
    setTransaksi(StorageService.getTransaksi());
    setUsers(StorageService.getUsers());
    setKategoriNonaktif(StorageService.getKategoriNonaktif());
  }, []);

  const handleToggleKategoriAktif = (cat: string) => {
    const updated = StorageService.toggleKategoriAktif(cat);
    setKategoriNonaktif(updated);
    const isInactive = updated.includes(cat);
    showToast(
      isInactive
        ? `Kategori "${cat}" dinonaktifkan dari kasir.`
        : `Kategori "${cat}" diaktifkan kembali di kasir.`
    );
  };

  // Sinkronisasi dengan Google Sheets (aktif jika Mode Cloud)
  useEffect(() => {
    const onPulled = () => reloadData();
    const onStatus = (e: Event) => {
      const d = (e as CustomEvent).detail as { error?: string } | undefined;
      if (d?.error) showToast('Sinkron gagal: ' + d.error);
    };
    window.addEventListener('cloud-pulled', onPulled);
    window.addEventListener('cloud-status', onStatus);
    return () => {
      window.removeEventListener('cloud-pulled', onPulled);
      window.removeEventListener('cloud-status', onStatus);
    };
  }, [reloadData, showToast]);

  useEffect(() => {
    if (!user || !CloudSync.enabled()) return;
    const sync = () => { void CloudSync.flush().then(() => CloudSync.pullAll()); };
    sync();
    const timer = setInterval(sync, 45000);
    window.addEventListener('online', sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', sync);
    };
  }, [user, config.mode, config.apiUrl]);

  // Add or update product in cart with optional temperature, notes, and exact quantity option
  const handleAddToCart = (
    p: Produk,
    options?: {
      suhu?: TemperatureOption;
      catatan?: string;
      qty?: number;
      setExactQty?: boolean;
    }
  ) => {
    const suhu = options?.suhu !== undefined ? options.suhu : (p.adaPilihanSuhu ? 'Dingin' : undefined);
    const cartItemId = suhu ? `${p.id}_${suhu}` : p.id;
    const existing = cart[cartItemId];
    const curQty = existing?.qty || 0;

    let targetQty: number;
    if (options?.setExactQty) {
      targetQty = options.qty ?? 1;
    } else {
      const addQty = options?.qty ?? 1;
      targetQty = curQty + addQty;
    }

    if (config.soundEnabled) playTapSound();

    if (targetQty <= 0) {
      setCart(prev => {
        const copy = { ...prev };
        delete copy[cartItemId];
        return copy;
      });
      return;
    }

    // Maximum quantity protection
    targetQty = Math.min(99, targetQty);

    setCart(prev => ({
      ...prev,
      [cartItemId]: {
        cartItemId,
        id: p.id,
        nama: p.nama,
        harga: p.harga,
        qty: targetQty,
        kategori: p.kategori,
        suhu: suhu || null,
        catatan: options?.catatan !== undefined ? options.catatan : (existing?.catatan || ''),
      },
    }));

    setLastAddedId(cartItemId);
    setTimeout(() => setLastAddedId(null), 500);
  };

  // Modify cart quantity freely by cartItemId
  const handleUpdateQty = (cartItemId: string, delta: number) => {
    const item = cart[cartItemId];
    if (!item) return;

    if (config.soundEnabled) playTapSound();

    setCart(prev => {
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[cartItemId];
        return copy;
      }
      return {
        ...prev,
        [cartItemId]: { ...item, qty: Math.min(99, newQty) },
      };
    });
  };

  // Update item note (e.g. "Pedas", "Tanpa Es", "Takeaway")
  const handleUpdateItemNote = (cartItemId: string, catatan: string) => {
    setCart(prev => {
      if (!prev[cartItemId]) return prev;
      return {
        ...prev,
        [cartItemId]: { ...prev[cartItemId], catatan },
      };
    });
  };

  // Toggle item temperature directly from cart
  const handleToggleItemSuhu = (cartItemId: string) => {
    setCart(prev => {
      const current = prev[cartItemId];
      if (!current || !current.suhu) return prev;
      const newSuhu: TemperatureOption = current.suhu === 'Dingin' ? 'Panas' : 'Dingin';
      const newCartItemId = `${current.id}_${newSuhu}`;

      const copy = { ...prev };
      delete copy[cartItemId];

      const existingAtTarget = copy[newCartItemId];
      copy[newCartItemId] = {
        ...current,
        cartItemId: newCartItemId,
        suhu: newSuhu,
        qty: (existingAtTarget?.qty || 0) + current.qty,
      };

      return copy;
    });
  };

  // Clear current cart
  const handleClearCart = () => {
    setCart({});
    setResumedTxId(null);
    setIsOrderPanelOpenMobile(false);
    showToast('Pesanan dikosongkan.');
  };

  // Split bill confirmation
  const handleConfirmSplitBill = (
    splits: import('./types').SplitBillDetail[],
    printMode: 'combined' | 'separate' = 'combined'
  ) => {
    if (!user) return;
    const items = Object.values(cart);
    if (items.length === 0) return;

    const subtotal = items.reduce((s, it) => s + it.harga * it.qty, 0);
    const splitNotes = splits
      .map(
        s =>
          `${s.label || `Orang #${s.orang}`}: ${formatRupiah(s.perOrang)} (${s.metode})${
            s.itemsSummary ? ` [${s.itemsSummary}]` : ''
          }`
      )
      .join(' | ');

    let newTx: Transaksi;

    if (resumedTxId) {
      const updated = StorageService.updateTransaksi(resumedTxId, {
        kasir: user.nama,
        items,
        diskon: 0,
        metodeBayar: splits[0]?.metode || 'Tunai',
        total: subtotal,
        bayar: subtotal,
        kembalian: 0,
        status: 'Selesai',
        isSplitBill: true,
        splitDetails: splits,
        splitPrintMode: printMode,
        catatan: `Split Bill: ${splitNotes}`,
      });
      newTx =
        updated ||
        StorageService.addTransaksi({
          kasir: user.nama,
          items,
          diskon: 0,
          metodeBayar: splits[0]?.metode || 'Tunai',
          total: subtotal,
          bayar: subtotal,
          kembalian: 0,
          status: 'Selesai',
          isSplitBill: true,
          splitDetails: splits,
          splitPrintMode: printMode,
          catatan: `Split Bill: ${splitNotes}`,
        });
      setResumedTxId(null);
    } else {
      newTx = StorageService.addTransaksi({
        kasir: user.nama,
        items,
        diskon: 0,
        metodeBayar: splits[0]?.metode || 'Tunai',
        total: subtotal,
        bayar: subtotal,
        kembalian: 0,
        status: 'Selesai',
        isSplitBill: true,
        splitDetails: splits,
        splitPrintMode: printMode,
        catatan: `Split Bill: ${splitNotes}`,
      });
    }

    if (config.soundEnabled) playCashRegisterSound();
    setCart({});
    setIsOrderPanelOpenMobile(false);
    setIsSplitBillOpen(false);
    reloadData();
    setReceiptModalTx(newTx);
    showToast(`Split Bill ${splits.length} bagian berhasil diselesaikan.`);
  };

  // Open bill (input nama pelanggan saja)
  const handleConfirmOpenBill = (data: { namaPelanggan: string; catatan: string }) => {
    if (!user) return;
    const items = Object.values(cart);
    if (items.length === 0) return;

    const subtotal = items.reduce((s, it) => s + it.harga * it.qty, 0);
    // Jika ini Open Bill yang dibuka kembali, perbarui nota yang sama (jangan buat nota baru)
    const saved =
      (resumedTxId &&
        StorageService.updateTransaksi(resumedTxId, {
          items,
          total: subtotal,
          status: 'OpenBill',
          namaPelanggan: data.namaPelanggan,
          catatan: data.catatan,
        })) ||
      StorageService.addTransaksi({
        kasir: user.nama,
        items,
        diskon: 0,
        metodeBayar: 'Tunai',
        total: subtotal,
        bayar: 0,
        kembalian: 0,
        status: 'OpenBill',
        namaPelanggan: data.namaPelanggan,
        catatan: data.catatan,
      });

    setCart({});
    setResumedTxId(null);
    setIsOrderPanelOpenMobile(false);
    setIsOpenBillModalOpen(false);
    reloadData();
    showToast(`Open Bill atas nama "${data.namaPelanggan}" tersimpan.`);
  };

  // Execute order completion (handles held orders properly without bug)
  const executeOrderCompletion = (
    metode: PaymentMethod,
    diskon: number,
    bayar: number,
    kembalian: number,
    tip?: number
  ) => {
    if (!user) return;
    const items = Object.values(cart);
    if (items.length === 0) return;

    const subtotal = items.reduce((s, it) => s + it.harga * it.qty, 0);
    const total = Math.max(0, subtotal - diskon);

    let finalTx: Transaksi;
    if (resumedTxId) {
      const updated = StorageService.updateTransaksi(resumedTxId, {
        kasir: user.nama,
        items,
        diskon,
        metodeBayar: metode,
        total,
        bayar,
        kembalian,
        tip: tip || 0,
        status: 'Selesai',
      });
      finalTx = updated || StorageService.addTransaksi({
        kasir: user.nama,
        items,
        diskon,
        metodeBayar: metode,
        total,
        bayar,
        kembalian,
        tip: tip || 0,
        status: 'Selesai',
      });
      setResumedTxId(null);
    } else {
      finalTx = StorageService.addTransaksi({
        kasir: user.nama,
        items,
        diskon,
        metodeBayar: metode,
        total,
        bayar,
        kembalian,
        tip: tip || 0,
        status: 'Selesai',
      });
    }

    if (config.soundEnabled) playCashRegisterSound();

    setCart({});
    setIsOrderPanelOpenMobile(false);
    reloadData();

    showToast(
      tip && tip > 0
        ? `Pesanan Selesai. Tip diterima: ${formatRupiah(tip)}. Terima kasih!`
        : kembalian > 0
        ? `Pesanan Selesai. Kembalian: ${formatRupiah(kembalian)}`
        : 'Pesanan Selesai.'
    );

    // Open receipt modal for printing/viewing
    setReceiptModalTx(finalTx);
  };

  // Trigger order checkout
  const handleFinishOrder = (
    metode: PaymentMethod,
    diskon: number,
    bayar: number,
    kembalian: number,
    tip?: number
  ) => {
    // If barcode popup is enabled (default true), display QR code pop-up for cashier/customer
    const showBarcode = Boolean(config.qrisBarcodeEnabled ?? config.qrisPopupEnabled ?? true);
    if (metode === 'QRIS' && showBarcode) {
      setQrisPending({ diskon, bayar, kembalian, tip });
    } else {
      executeOrderCompletion(metode, diskon, bayar, kembalian, tip);
    }
  };

  // Preview / Manual trigger QRIS on screen
  const handleShowQrisModal = () => {
    const subtotal = Object.values(cart).reduce((s, it) => s + it.harga * it.qty, 0);
    setQrisPending({ diskon: 0, bayar: subtotal, kembalian: 0 });
  };

  // Confirm QRIS payment
  const handleConfirmQRIS = () => {
    if (!qrisPending) return;
    executeOrderCompletion(
      'QRIS',
      qrisPending.diskon,
      qrisPending.bayar,
      qrisPending.kembalian,
      qrisPending.tip
    );
    setQrisPending(null);
  };

  // Product management actions
  const handleAddProduk = (newP: {
    nama: string;
    harga: number;
    kategori: string;
    gambar?: string;
    adaPilihanSuhu?: boolean;
    deskripsi?: string;
    favorit?: boolean;
  }) => {
    StorageService.addProduk({
      ...newP,
      aktif: true,
      adaPilihanSuhu: Boolean(newP.adaPilihanSuhu),
    });
    reloadData();
    showToast(`Menu "${newP.nama}" berhasil ditambahkan.`);
  };

  const handleUpdateProduk = (id: string, updates: Partial<Produk>) => {
    StorageService.updateProduk(id, updates);
    reloadData();
    showToast('Perubahan menu berhasil disimpan.');
  };

  const handleDeleteProduk = (id: string) => {
    const target = produk.find(p => p.id === id);
    StorageService.deleteProduk(id);
    reloadData();
    showToast(target ? `Menu "${target.nama}" berhasil dihapus.` : 'Menu telah dihapus.');
  };

  const handleToggleProdukAktif = (id: string) => {
    StorageService.toggleProdukAktif(id);
    reloadData();
    showToast('Status menu diperbarui.');
  };

  // User management actions
  const handleAddUser = (newUser: { nama: string; username: string; password?: string; peran: Role }) => {
    StorageService.addUser(newUser);
    reloadData();
    showToast(`Akun ${newUser.nama} berhasil dibuat.`);
  };

  const handleDeleteUser = (id: string) => {
    StorageService.deleteUser(id);
    reloadData();
    showToast('Akun telah dihapus.');
  };

  // Transaction correction actions
  const handleTandaiSalah = (id: string, catatan: string) => {
    StorageService.tandaiSalahInput(id, catatan, user?.nama);
    reloadData();
    showToast('Transaksi ditandai salah input. Menunggu konfirmasi ACC owner.');
  };

  const handleKoreksi = (id: string) => {
    StorageService.koreksiTransaksi(id);
    reloadData();
    showToast('Transaksi telah di-ACC & status diubah menjadi Dikoreksi (Batal).');
  };

  const handleTolakKoreksi = (id: string) => {
    StorageService.tolakKoreksi(id);
    reloadData();
    showToast('Permintaan koreksi transaksi ditolak.');
  };

  // Open Bill resume / cancel
  const handleResumeOpenBill = (id: string) => {
    const data = StorageService.lanjutkanOpenBill(id);
    if (!data) {
      showToast('Gagal memulihkan Open Bill.');
      return;
    }
    const newCart: Record<string, CartItem> = {};
    data.items.forEach(it => {
      const key = it.cartItemId || it.id;
      newCart[key] = { ...it, cartItemId: key };
    });
    setCart(newCart);
    setResumedTxId(id); // pembayaran nanti memperbarui nota yang sama, bukan membuat nota baru
    reloadData();
    setActiveView('menu');
    setIsOrderPanelOpenMobile(true);
    showToast(`Open Bill ${data.namaPelanggan || id} dibuka ke keranjang.`);
  };

  const handleCancelOpenBill = (id: string) => {
    StorageService.batalkanOpenBill(id);
    if (resumedTxId === id) {
      setResumedTxId(null);
      setCart({});
    }
    reloadData();
    showToast(`Open Bill ${id} dibatalkan.`);
  };

  // Complete held / open bill order from report history when paid
  const handleSelesaikanPesananDitahan = (id: string, metode: PaymentMethod) => {
    const ok = StorageService.selesaikanTahan(id, metode);
    if (ok) {
      if (resumedTxId === id) {
        setResumedTxId(null);
        setCart({});
      }
      reloadData();
      showToast(`Pesanan #${id} berhasil diselesaikan (${metode}).`);
      if (config.soundEnabled) playCashRegisterSound();
    } else {
      showToast('Gagal menyelesaikan pesanan.');
    }
  };

  // Config update
  const handleSaveConfig = (newConfig: AppConfig) => {
    StorageService.saveConfig(newConfig);
    setConfig(newConfig);
    showToast('Pengaturan berhasil disimpan.');
  };

  // Reset to default
  const handleResetData = () => {
    StorageService.resetToDefault();
    reloadData();
    setCart({});
    showToast('Data demo berhasil dipulihkan.');
  };

  // Logout
  const handleLogout = () => {
    StorageService.saveStoredUser(null);
    setUser(null);
    setWelcomeUser(null);
    setCart({});
    setIsOrderPanelOpenMobile(false);
    setIsSettingsOpen(false);
  };

  // Cart stats for mobile bar
  const cartItemCount = useMemo(() => {
    return Object.values(cart).reduce((sum, it) => sum + it.qty, 0);
  }, [cart]);

  const cartTotalAmount = useMemo(() => {
    return Object.values(cart).reduce((sum, it) => sum + it.harga * it.qty, 0);
  }, [cart]);

  const openBills = useMemo(() => {
    return (transaksi || []).filter(t => t.status === 'OpenBill' || t.status === 'Ditahan');
  }, [transaksi]);

  const pendingAccCount = useMemo(() => {
    return transaksi.filter(t => t.status === 'MenungguKoreksi').length;
  }, [transaksi]);

  // Guard: jika akun kasir mencoba membuka tab khusus admin (laporan, produk, akun), alihkan ke menu
  useEffect(() => {
    const role = (user?.peran || '').toLowerCase();
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';
    if (!isOwnerOrAdmin && (activeView === 'laporan' || activeView === 'produk' || activeView === 'akun')) {
      setActiveView('menu');
    }
  }, [user?.peran, activeView]);

  // If not logged in, show Login view
  if (!user) {
    return (
      <>
        <LoginView
          onLoginSuccess={logged => {
            StorageService.saveStoredUser(logged);
            setUser(logged);
            setWelcomeUser(logged);
          }}
          namaToko={config.namaToko}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    );
  }

  return (
    <div className="flex h-screen h-dvh bg-[#F1F3EF] overflow-hidden text-[#1B2521]">
      {/* Sidebar Rail */}
      <SidebarRail
        activeView={activeView}
        setActiveView={view => {
          setActiveView(view);
          setIsOrderPanelOpenMobile(false);
        }}
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        namaToko={config.namaToko}
        pendingAccCount={pendingAccCount}
        openBillsCount={openBills.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 md:py-8 max-w-full">
        <div className="max-w-6xl mx-auto">
          {(activeView === 'menu' || (activeView as string) === 'kasir') && (
            <KasirView
              produk={produk}
              cart={cart}
              onAddToCart={handleAddToCart}
              onUpdateQty={handleUpdateQty}
              kategoriNonaktif={kategoriNonaktif}
              user={user}
              lastAddedId={lastAddedId}
            />
          )}

          {activeView === 'transaksi' && (
            <TransaksiView
              openBills={openBills}
              onResumeOpenBill={handleResumeOpenBill}
              onCancelOpenBill={handleCancelOpenBill}
              recentTransactions={transaksi}
              onBukaLaporSalahInput={tx => setSelectedTxForSalahInput(tx)}
              onViewReceipt={tx => setReceiptModalTx(tx)}
              user={user}
            />
          )}

          {activeView === 'laporan' && (user.peran === 'Owner' || user.peran === 'Admin') && (
            <LaporanView
              transaksi={transaksi}
              user={user}
              onBukaLaporSalahInput={tx => setSelectedTxForSalahInput(tx)}
              onKoreksi={handleKoreksi}
              onTolakKoreksi={handleTolakKoreksi}
              onSelesaikanPesananDitahan={handleSelesaikanPesananDitahan}
              onResumeHold={handleResumeOpenBill}
            />
          )}

          {activeView === 'produk' && (user.peran === 'Owner' || user.peran === 'Admin') && (
            <ProdukView
              produk={produk}
              onAddProduk={handleAddProduk}
              onUpdateProduk={handleUpdateProduk}
              onDeleteProduk={handleDeleteProduk}
              onToggleAktif={handleToggleProdukAktif}
              kategoriNonaktif={kategoriNonaktif}
              onToggleKategoriAktif={handleToggleKategoriAktif}
            />
          )}

          {activeView === 'akun' && (user.peran === 'Owner' || user.peran === 'Admin') && (
            <AkunView
              users={users}
              currentUser={user}
              onAddUser={handleAddUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </div>
      </main>

      {/* Right Order Panel (Receipt Bon on Desktop / Slide-up Sheet on Mobile) */}
      {(activeView === 'menu' || (activeView as string) === 'kasir' || activeView === 'transaksi') && (
        <OrderPanel
          cart={cart}
          onUpdateQty={handleUpdateQty}
          onClearCart={handleClearCart}
          onFinishOrder={handleFinishOrder}
          isOpenMobile={isOrderPanelOpenMobile}
          onCloseMobile={() => setIsOrderPanelOpenMobile(false)}
          autoPrint={config.autoPrint}
          onUpdateItemNote={handleUpdateItemNote}
          onToggleSuhu={handleToggleItemSuhu}
          onOpenSplitBill={() => setIsSplitBillOpen(true)}
          onOpenOpenBill={() => setIsOpenBillModalOpen(true)}
          qrisEnabled={config.qrisEnabled !== false}
          qrisBarcodeEnabled={Boolean(config.qrisBarcodeEnabled ?? config.qrisPopupEnabled ?? true)}
          onShowQrisModal={handleShowQrisModal}
          diskonEnabled={config.diskonEnabled !== false}
          tipEnabled={config.tipEnabled !== false}
        />
      )}

      {/* Mobile Floating Cart Action Bar */}
      {(activeView === 'menu' || (activeView as string) === 'kasir' || activeView === 'transaksi') && cartItemCount > 0 && !isOrderPanelOpenMobile && (
        <button
          type="button"
          onClick={() => setIsOrderPanelOpenMobile(true)}
          className="md:hidden fixed left-4 right-4 bottom-20 z-30 h-14 rounded-2xl bg-[#1F4034] text-[#F3EBDD] px-5 flex items-center justify-between shadow-xl border border-[#C2A06A]/40 transition-transform active:scale-98 animate-line-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#C2A06A] text-[#12241E] font-bold text-xs flex items-center justify-center animate-bump">
              {cartItemCount}
            </div>
            <span className="font-semibold text-sm">Lihat Pesanan</span>
          </div>
          <span className="font-serif font-semibold text-base text-[#F3EBDD]">
            {formatRupiah(cartTotalAmount)}
          </span>
        </button>
      )}

      {/* Modals & Dialogs */}
      {/* Split Bill Modal */}
      {isSplitBillOpen && (
        <SplitBillModal
          items={Object.values(cart)}
          subtotal={cartTotalAmount}
          diskon={0}
          total={cartTotalAmount}
          onConfirmSplit={handleConfirmSplitBill}
          onClose={() => setIsSplitBillOpen(false)}
        />
      )}

      {/* Open Bill Modal */}
      {isOpenBillModalOpen && (
        <OpenBillModal
          items={Object.values(cart)}
          subtotal={cartTotalAmount}
          onConfirmOpenBill={handleConfirmOpenBill}
          onClose={() => setIsOpenBillModalOpen(false)}
        />
      )}

      {/* Salah Input Modal (Lapor Kasir ke Owner) */}
      {selectedTxForSalahInput && (
        <SalahInputModal
          transaksi={selectedTxForSalahInput}
          onConfirmSalahInput={(id, alasan) => {
            handleTandaiSalah(id, alasan);
            setSelectedTxForSalahInput(null);
          }}
          onClose={() => setSelectedTxForSalahInput(null)}
        />
      )}

      {/* Bar Selamat Datang Halus & Langsung Hilang Seketika Saat Aplikasi Ditekan */}
      <WelcomeBanner
        user={welcomeUser}
        onDismiss={() => setWelcomeUser(null)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        config={config}
        onSaveConfig={handleSaveConfig}
        onLogout={handleLogout}
        onResetData={handleResetData}
      />

      <ReceiptModal
        transaksi={receiptModalTx}
        namaToko={config.namaToko}
        bluetoothPrinterEnabled={config.bluetoothPrinterEnabled}
        onClose={() => setReceiptModalTx(null)}
      />

      {qrisPending && (
        <QRISModal
          amount={Math.max(
            0,
            Object.values(cart).reduce((s, it) => s + it.harga * it.qty, 0) -
              qrisPending.diskon
          )}
          namaToko={config.namaToko}
          onConfirm={handleConfirmQRIS}
          onCancel={() => setQrisPending(null)}
        />
      )}

      <SyncBadge />

      {/* Toast Notification */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}
