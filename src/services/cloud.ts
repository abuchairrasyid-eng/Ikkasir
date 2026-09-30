import { Produk, Transaksi, User } from '../types';

const K = {
  CFG: 'kasir_config_db',
  PRODUK: 'kasir_produk_db',
  TX: 'kasir_transaksi_db',
  USERS: 'kasir_users_db',
  Q: 'kasir_sync_queue',
};

type Job = { action: string; payload: Record<string, unknown> };
interface Cfg { apiUrl: string; apiToken: string }
type Row = Record<string, unknown>;

function cfg(): Cfg | null {
  try {
    const c = JSON.parse(localStorage.getItem(K.CFG) || '{}');
    if (c.mode === 'cloud' && typeof c.apiUrl === 'string' && c.apiUrl.startsWith('http')) {
      return { apiUrl: c.apiUrl, apiToken: c.apiToken || '' };
    }
  } catch { /* abaikan */ }
  return null;
}

async function call(c: Cfg, action: string, payload?: Record<string, unknown>): Promise<Row> {
  let res: Response;
  if (payload) {
    res = await fetch(c.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari preflight CORS
      body: JSON.stringify({ ...payload, action, token: c.apiToken }),
    });
  } else {
    const sep = c.apiUrl.includes('?') ? '&' : '?';
    res = await fetch(`${c.apiUrl}${sep}token=${encodeURIComponent(c.apiToken)}&action=${action}`);
  }
  return res.json();
}

const loadQ = (): Job[] => { try { return JSON.parse(localStorage.getItem(K.Q) || '[]'); } catch { return []; } };
const saveQ = (q: Job[]) => localStorage.setItem(K.Q, JSON.stringify(q));
const emit = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));
const bool = (v: unknown) => v === true || v === 'TRUE' || v === 'true';

function mapProduk(r: Row): Produk {
  return {
    id: String(r.ID),
    nama: String(r.Nama || ''),
    harga: Number(r.Harga) || 0,
    kategori: String(r.Kategori || 'Lainnya'),
    gambar: r.Gambar ? String(r.Gambar) : undefined,
    aktif: bool(r.Aktif),
    adaPilihanSuhu: bool(r.AdaSuhu),
    favorit: bool(r.Favorit),
    deskripsi: r.Deskripsi ? String(r.Deskripsi) : undefined,
  };
}

function mapTransaksi(r: Row): Transaksi {
  if (r.Data && typeof r.Data === 'object') return { ...(r.Data as Transaksi), id: String(r.ID) };
  return {
    id: String(r.ID),
    tanggal: String(r.Tanggal || new Date().toISOString()),
    kasir: String(r.Kasir || ''),
    items: Array.isArray(r.Items) ? (r.Items as Transaksi['items']) : [],
    diskon: Number(r.Diskon) || 0,
    metodeBayar: (r.MetodeBayar as Transaksi['metodeBayar']) || 'Tunai',
    total: Number(r.Total) || 0,
    bayar: Number(r.Bayar) || 0,
    kembalian: Number(r.Kembalian) || 0,
    status: (r.Status as Transaksi['status']) || 'Selesai',
    catatan: r.Catatan ? String(r.Catatan) : undefined,
  };
}

function mapUser(r: Row): User {
  return {
    id: String(r.ID),
    nama: String(r.Nama || ''),
    username: String(r.Username || ''),
    peran: r.Peran === 'Owner' ? 'Owner' : 'Kasir',
  };
}

let flushing = false;

export const CloudSync = {
  enabled(): boolean { return cfg() !== null; },
  pending(): number { return loadQ().length; },

  queue(action: string, payload: Record<string, unknown>) {
    const q = loadQ();
    q.push({ action, payload });
    saveQ(q);
  },

  // Kirim antrean ke Google Sheets satu per satu. Jika offline, antrean tetap tersimpan.
  async flush(): Promise<void> {
    const c = cfg();
    if (!c || flushing) return;
    flushing = true;
    const done = new Set<string>();
    try {
      for (;;) {
        const q = loadQ();
        if (!q.length) break;
        const job = q[0];
        let r: Row;
        try {
          r = await call(c, job.action, job.payload);
        } catch {
          emit('cloud-status', { pending: q.length, offline: true });
          return; // offline: coba lagi nanti
        }
        if (!r.ok) emit('cloud-status', { pending: q.length - 1, error: String(r.error || 'Server menolak data') });
        done.add(job.action);
        saveQ(loadQ().slice(1));
      }
      if (done.has('upsertProduk')) await this.pullProduk();
      if (done.has('tambahUser') || done.has('hapusUser')) await this.pullUsers();
      emit('cloud-status', { pending: 0 });
    } finally {
      flushing = false;
    }
  },

  async pullProduk() {
    const c = cfg(); if (!c) return;
    const r = await call(c, 'getProduk');
    if (!r.ok) throw new Error(String(r.error));
    const list = (r.data as Row[]).filter(x => !bool(x.Dihapus)).map(mapProduk);
    localStorage.setItem(K.PRODUK, JSON.stringify(list));
    emit('cloud-pulled');
  },

  async pullTransaksi() {
    const c = cfg(); if (!c) return;
    const r = await call(c, 'getTransaksi');
    if (!r.ok) throw new Error(String(r.error));
    const list = (r.data as Row[]).map(mapTransaksi)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    localStorage.setItem(K.TX, JSON.stringify(list));
    emit('cloud-pulled');
  },

  async pullUsers() {
    const c = cfg(); if (!c) return;
    const r = await call(c, 'getUser');
    if (!r.ok) throw new Error(String(r.error));
    localStorage.setItem(K.USERS, JSON.stringify((r.data as Row[]).map(mapUser)));
    emit('cloud-pulled');
  },

  // Ambil data terbaru dari Sheet. Dilewati jika masih ada data yang belum terkirim.
  async pullAll() {
    if (!cfg() || loadQ().length) return;
    try {
      await Promise.all([this.pullProduk(), this.pullTransaksi(), this.pullUsers()]);
      emit('cloud-status', { pending: 0 });
    } catch {
      emit('cloud-status', { pending: 0, offline: true });
    }
  },

  // ---- dipanggil dari StorageService setiap kali data disimpan ----
  onProdukSaved(oldList: Produk[], newList: Produk[]) {
    if (!cfg()) return;
    const oldMap = new Map(oldList.map(p => [p.id, p]));
    const newIds = new Set(newList.map(p => p.id));
    newList.forEach(p => {
      const o = oldMap.get(p.id);
      if (!o || JSON.stringify(o) !== JSON.stringify(p)) this.queue('upsertProduk', { produk: p });
    });
    oldList.forEach(o => {
      if (!newIds.has(o.id)) this.queue('upsertProduk', { produk: { ...o, aktif: false, dihapus: true } });
    });
    void this.flush();
  },

  onTransaksiSaved(oldList: Transaksi[], newList: Transaksi[]) {
    if (!cfg()) return;
    const oldMap = new Map(oldList.map(t => [t.id, t]));
    newList.forEach(t => {
      const o = oldMap.get(t.id);
      if (!o || JSON.stringify(o) !== JSON.stringify(t)) this.queue('upsertTransaksi', { tx: t });
    });
    void this.flush();
  },

  onUsersSaved(oldList: User[], newList: User[]) {
    if (!cfg()) return;
    const oldIds = new Set(oldList.map(u => u.id));
    const newIds = new Set(newList.map(u => u.id));
    newList.forEach(u => {
      if (!oldIds.has(u.id)) {
        this.queue('tambahUser', { nama: u.nama, username: u.username, password: u.password || '', peran: u.peran });
      }
    });
    oldList.forEach(u => {
      if (!newIds.has(u.id)) this.queue('hapusUser', { id: u.id });
    });
    void this.flush();
  },
};
