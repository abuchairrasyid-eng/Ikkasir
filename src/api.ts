import { StorageService } from './storage';
import { User, Produk, Transaksi, CartItem, PaymentMethod, Role } from '../types';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  [key: string]: unknown;
}

export const APPS_SCRIPT_TEMPLATE = `// ========================================================
// KASIR - GOOGLE APPS SCRIPT BACKEND (Code.gs)
// Sambungkan Google Sheets sebagai database online kasir Anda!
// ========================================================

const TOKEN_RAHASIA = "GANTI_DENGAN_KODE_RAHASIA_ANDA";

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  try {
    let params = {};
    if (method === "GET") {
      params = e.parameter || {};
    } else {
      if (e.postData && e.postData.contents) {
        params = JSON.parse(e.postData.contents);
      }
    }

    if (params.token !== TOKEN_RAHASIA) {
      return jsonOutput({ ok: false, error: "Token rahasia tidak valid!" });
    }

    const action = params.action;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return jsonOutput({ ok: true, message: "Koneksi Google Apps Script berhasil!" });
    }

    if (action === "getProduk") {
      const sheet = getOrCreateSheet(ss, "Produk", ["ID", "Nama", "Harga", "Stok", "Kategori", "Gambar", "Aktif"]);
      const data = getSheetData(sheet);
      return jsonOutput({ ok: true, data: data });
    }

    if (action === "getTransaksi") {
      const sheet = getOrCreateSheet(ss, "Transaksi", ["ID", "Tanggal", "Kasir", "Items", "Diskon", "MetodeBayar", "Total", "Bayar", "Kembalian", "Status", "Catatan"]);
      const data = getSheetData(sheet);
      data.forEach(t => {
        try { t.Items = JSON.parse(t.Items); } catch(err) { t.Items = []; }
      });
      return jsonOutput({ ok: true, data: data });
    }

    if (action === "simpanTransaksi") {
      const sheet = getOrCreateSheet(ss, "Transaksi", ["ID", "Tanggal", "Kasir", "Items", "Diskon", "MetodeBayar", "Total", "Bayar", "Kembalian", "Status", "Catatan"]);
      const id = "TRX-" + new Date().getTime();
      const tanggal = new Date().toISOString();
      sheet.appendRow([
        id,
        tanggal,
        params.kasir || "",
        JSON.stringify(params.items || []),
        params.diskon || 0,
        params.metodeBayar || "Tunai",
        params.total || 0,
        params.bayar || 0,
        params.kembalian || 0,
        params.status || "Selesai",
        params.catatan || ""
      ]);

      // Kurangi stok jika status selesai
      if (params.status === "Selesai" && params.items) {
        kurangiStok(ss, params.items);
      }

      return jsonOutput({ ok: true, id: id, tanggal: tanggal });
    }

    if (action === "tambahProduk") {
      const sheet = getOrCreateSheet(ss, "Produk", ["ID", "Nama", "Harga", "Stok", "Kategori", "Gambar", "Aktif"]);
      const id = "p-" + new Date().getTime();
      sheet.appendRow([id, params.nama, params.harga, params.stok, params.kategori, params.gambar || "", "TRUE"]);
      return jsonOutput({ ok: true, id: id });
    }

    return jsonOutput({ ok: false, error: "Aksi tidak dikenal: " + action });
  } catch (err) {
    return jsonOutput({ ok: false, error: err.toString() });
  }
}

function kurangiStok(ss, items) {
  const sheet = ss.getSheetByName("Produk");
  if (!sheet) return;
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const id = values[i][0];
    const match = items.find(it => it.id == id);
    if (match) {
      let currentStok = Number(values[i][3]) || 0;
      let newStok = Math.max(0, currentStok - Number(match.qty));
      sheet.getRange(i + 1, 4).setValue(newStok);
    }
  }
}

function getOrCreateSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    list.push(obj);
  }
  return list;
}

function jsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const ApiClient = {
  async fetchWithCloudFallback<T>(
    action: string,
    payload?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    const config = StorageService.getConfig();
    const isCloud = config.mode === 'cloud' && Boolean(config.apiUrl && config.apiUrl.startsWith('http'));

    if (isCloud) {
      try {
        let res: Response;
        if (payload) {
          res = await fetch(config.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ ...payload, token: config.apiToken, action }),
          });
        } else {
          const sep = config.apiUrl.includes('?') ? '&' : '?';
          res = await fetch(`${config.apiUrl}${sep}token=${encodeURIComponent(config.apiToken)}&action=${action}`);
        }
        const data = await res.json();
        return data as ApiResponse<T>;
      } catch (err: unknown) {
        console.warn('Gagal koneksi ke Google Apps Script:', err);
        return { ok: false, error: 'Tidak bisa terhubung ke server. Periksa internet atau URL Apps Script.' } as ApiResponse<T>;
      }
    }

    // Local operations fallback
    return this.handleLocalOperation<T>(action, payload);
  },

  handleLocalOperation<T>(action: string, payload?: Record<string, unknown>): ApiResponse<T> {
    switch (action) {
      case 'ping':
        return { ok: true, data: { status: 'Database lokal aktif' } as T };

      case 'login': {
        const { username, password } = (payload || {}) as { username?: string; password?: string };
        const users = StorageService.getUsers();
        const found = users.find(u => u.username.toLowerCase() === (username || '').toLowerCase());
        if (!found) {
          return { ok: false, error: 'Username tidak ditemukan.' };
        }
        if (found.password && found.password !== password) {
          return { ok: false, error: 'Password salah.' };
        }
        return {
          ok: true,
          data: found as T,
          id: found.id,
          nama: found.nama,
          username: found.username,
          peran: found.peran,
        };
      }

      case 'getProduk': {
        const data = StorageService.getProduk();
        return { ok: true, data: data as T };
      }

      case 'getTransaksi': {
        const data = StorageService.getTransaksi();
        return { ok: true, data: data as T };
      }

      case 'simpanTransaksi': {
        const p = payload as unknown as {
          kasir: string;
          items: CartItem[];
          diskon: number;
          metodeBayar: PaymentMethod;
          total: number;
          bayar: number;
          kembalian: number;
          status: 'Selesai' | 'Ditahan';
          catatan?: string;
        };
        const saved = StorageService.addTransaksi({
          kasir: p.kasir,
          items: p.items,
          diskon: p.diskon || 0,
          metodeBayar: p.metodeBayar,
          total: p.total,
          bayar: p.bayar,
          kembalian: p.kembalian,
          status: p.status,
          catatan: p.catatan,
        });
        return { ok: true, data: saved as T, id: saved.id, tanggal: saved.tanggal };
      }

      case 'tambahProduk': {
        const p = payload as unknown as {
          nama: string;
          harga: number;
          stok?: number;
          kategori: string;
          gambar?: string;
        };
        const item = StorageService.addProduk({
          nama: p.nama,
          harga: p.harga,
          stok: p.stok,
          kategori: p.kategori,
          gambar: p.gambar,
          aktif: true,
        });
        return { ok: true, data: item as T, id: item.id };
      }

      case 'getUser': {
        const data = StorageService.getUsers();
        return { ok: true, data: data as T };
      }

      case 'tambahUser': {
        const p = payload as unknown as {
          nama: string;
          username: string;
          password?: string;
          peran: Role;
        };
        const user = StorageService.addUser({
          nama: p.nama,
          username: p.username,
          password: p.password || '123',
          peran: p.peran,
        });
        return { ok: true, data: user as T, id: user.id };
      }

      case 'hapusUser': {
        const { id } = (payload || {}) as { id: string };
        StorageService.deleteUser(id);
        return { ok: true };
      }

      case 'koreksiTransaksi': {
        const { id } = (payload || {}) as { id: string };
        const ok = StorageService.koreksiTransaksi(id);
        return { ok };
      }

      case 'tandaiSalahInput': {
        const { id, catatan } = (payload || {}) as { id: string; catatan: string };
        const ok = StorageService.tandaiSalahInput(id, catatan || 'Ditandai salah input');
        return { ok };
      }

      case 'lanjutkanTahan': {
        const { id } = (payload || {}) as { id: string };
        const items = StorageService.lanjutkanTahan(id);
        if (!items) return { ok: false, error: 'Pesanan tidak ditemukan atau sudah diproses.' };
        return { ok: true, items: items as unknown as T };
      }

      default:
        return { ok: false, error: 'Aksi lokal tidak didukung: ' + action };
    }
  },

  async testCloudConnection(url: string, token: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'URL Web App tidak valid. Harus dimulai dengan https://' };
    }
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}token=${encodeURIComponent(token)}&action=ping`);
      const data = await res.json();
      if (data && data.ok) {
        return { success: true, message: data.message || 'Koneksi ke Google Sheets berhasil!' };
      }
      return { success: false, message: data.error || 'Server menolak permintaan.' };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Gagal menghubungi Web App Google Apps Script.',
      };
    }
  },
};
