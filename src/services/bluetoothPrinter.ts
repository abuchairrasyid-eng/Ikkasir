import { Transaksi } from '../types';
import { formatRupiah, formatDateTime } from './storage';

// Common Bluetooth Printer GATT Services & Characteristics
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Serial
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HMSoft / CC2540
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

interface BluetoothDeviceExtended extends EventTarget {
  name?: string;
  id: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<unknown>;
    disconnect: () => void;
    getPrimaryServices: () => Promise<unknown[]>;
  };
}

class BluetoothPrinterService {
  private device: BluetoothDeviceExtended | null = null;
  private characteristic: { writeValue: (data: Uint8Array) => Promise<void> } | null = null;
  private isConnecting: boolean = false;

  // Check if Web Bluetooth API is supported in this browser
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  // Current connection state
  isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.characteristic);
  }

  // Connected device name
  getDeviceName(): string {
    return this.device?.name || 'Printer Bluetooth';
  }

  // Request & Connect to Bluetooth Thermal Printer
  async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!this.isSupported()) {
      return {
        success: false,
        error: 'Browser ini belum mendukung Web Bluetooth. Gunakan Google Chrome / Edge dengan koneksi HTTPS.',
      };
    }

    if (this.isConnecting) {
      return { success: false, error: 'Sedang menghubungkan ke printer...' };
    }

    this.isConnecting = true;

    try {
      // Request device from user picker
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device) {
        this.isConnecting = false;
        return { success: false, error: 'Pencarian printer dibatalkan.' };
      }

      this.device = device;

      // Disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        this.characteristic = null;
      });

      const server = await device.gatt.connect();

      // Find usable writable characteristic across available services
      const services = await server.getPrimaryServices().catch(() => []);
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              break;
            }
          }
          if (this.characteristic) break;
        } catch {
          // continue checking next service
        }
      }

      this.isConnecting = false;

      if (!this.characteristic) {
        return {
          success: false,
          deviceName: device.name || 'Printer',
          error: 'Printer terhubung namun tidak ditemukan saluran tulis ESC/POS.',
        };
      }

      return {
        success: true,
        deviceName: device.name || 'Printer Bluetooth',
      };
    } catch (err: unknown) {
      this.isConnecting = false;
      const message = err instanceof Error ? err.message : 'Gagal menghubungkan printer bluetooth.';
      return { success: false, error: message };
    }
  }

  // Disconnect from printer
  disconnect(): void {
    try {
      if (this.device && this.device.gatt && this.device.gatt.connected) {
        this.device.gatt.disconnect();
      }
    } catch {
      // ignore
    }
    this.device = null;
    this.characteristic = null;
  }

  // Send raw bytes to thermal printer in chunks (to prevent buffer overrun)
  async sendRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (!this.characteristic) {
      // Try to re-connect if device exists
      if (this.device && this.device.gatt) {
        try {
          await this.device.gatt.connect();
        } catch {
          return false;
        }
      } else {
        return false;
      }
    }

    if (!this.characteristic) return false;

    // Send in chunks of 64 or 128 bytes (standard BLE MTU)
    const chunkSize = 64;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      try {
        await this.characteristic.writeValue(chunk);
        // Small delay between packets
        await new Promise(r => setTimeout(r, 20));
      } catch (e) {
        console.error('Error writing to thermal printer:', e);
        return false;
      }
    }

    return true;
  }

  // Build ESC/POS Thermal Receipt Bytes
  buildReceiptBytes(
    transaksi: Transaksi,
    slipType: 'pelanggan' | 'dapur' | 'bar',
    namaToko: string
  ): Uint8Array {
    const encoder = new TextEncoder();
    const parts: number[] = [];

    // ESC/POS Commands
    const ESC = 0x1b;
    const GS = 0x1d;

    // Initialize printer: ESC @
    parts.push(ESC, 0x40);

    // Code page WPC1252 / ASCII
    parts.push(ESC, 0x74, 0x00);

    // Align Center: ESC a 1
    parts.push(ESC, 0x61, 0x01);

    // Bold ON: ESC E 1
    parts.push(ESC, 0x45, 0x01);
    // Double height & width: GS ! 0x11
    parts.push(GS, 0x21, 0x11);

    // Store Name
    parts.push(...encoder.encode(`${namaToko.toUpperCase()}\n`));

    // Reset size: GS ! 0x00
    parts.push(GS, 0x21, 0x00);
    parts.push(ESC, 0x45, 0x00);

    // Slip Title
    const titleText =
      slipType === 'pelanggan'
        ? 'STRUK PEMBAYARAN'
        : slipType === 'dapur'
        ? 'PESANAN DAPUR'
        : 'PESANAN BAR';
    parts.push(...encoder.encode(`${titleText}\n`));
    parts.push(...encoder.encode('--------------------------------\n'));

    // Align Left: ESC a 0
    parts.push(ESC, 0x61, 0x00);

    // Order Info
    parts.push(...encoder.encode(`No. Nota : ${transaksi.id}\n`));
    parts.push(...encoder.encode(`Waktu    : ${formatDateTime(transaksi.tanggal)}\n`));
    parts.push(...encoder.encode(`Kasir    : ${transaksi.kasir}\n`));

    if (transaksi.namaPelanggan) {
      parts.push(...encoder.encode(`Pelanggan: ${transaksi.namaPelanggan}\n`));
    }
    if (transaksi.nomorMeja) {
      parts.push(...encoder.encode(`Meja     : ${transaksi.nomorMeja}\n`));
    }

    parts.push(...encoder.encode('--------------------------------\n'));

    // Filter items based on slip type
    const items =
      slipType === 'dapur'
        ? transaksi.items.filter(i => i.kategori.toLowerCase() !== 'minuman')
        : slipType === 'bar'
        ? transaksi.items.filter(i => i.kategori.toLowerCase() === 'minuman')
        : transaksi.items;

    // Items list (32 chars line width for 58mm printer)
    for (const item of items) {
      const itemTitle = `${item.nama}${item.suhu ? ` (${item.suhu})` : ''}`;
      parts.push(...encoder.encode(`${itemTitle}\n`));

      if (slipType === 'pelanggan') {
        const qtyPrice = ` ${item.qty} x ${item.harga.toLocaleString('id-ID')}`;
        const sub = (item.qty * item.harga).toLocaleString('id-ID');
        const spaces = Math.max(1, 32 - qtyPrice.length - sub.length);
        parts.push(...encoder.encode(`${qtyPrice}${' '.repeat(spaces)}${sub}\n`));
      } else {
        parts.push(ESC, 0x45, 0x01); // Bold for kitchen/bar
        parts.push(...encoder.encode(` JUMLAH: x${item.qty}\n`));
        parts.push(ESC, 0x45, 0x00);
      }
    }

    parts.push(...encoder.encode('--------------------------------\n'));

    // Financial breakdown for customer slip
    if (slipType === 'pelanggan') {
      const subtotalVal = transaksi.items.reduce((s, it) => s + it.harga * it.qty, 0);
      const subtotalStr = subtotalVal.toLocaleString('id-ID');
      parts.push(...encoder.encode(`Subtotal${' '.repeat(Math.max(1, 24 - subtotalStr.length))}${subtotalStr}\n`));

      if (transaksi.diskon && transaksi.diskon > 0) {
        const diskonStr = `-${transaksi.diskon.toLocaleString('id-ID')}`;
        parts.push(...encoder.encode(`Diskon${' '.repeat(Math.max(1, 26 - diskonStr.length))}${diskonStr}\n`));
      }

      // Bold Total
      parts.push(ESC, 0x45, 0x01);
      const totalStr = transaksi.total.toLocaleString('id-ID');
      parts.push(...encoder.encode(`TOTAL${' '.repeat(Math.max(1, 27 - totalStr.length))}${totalStr}\n`));
      parts.push(ESC, 0x45, 0x00);

      parts.push(...encoder.encode(`Metode   : ${transaksi.metodeBayar}\n`));

      if (transaksi.metodeBayar === 'Tunai') {
        const bayarStr = (transaksi.bayar || transaksi.total).toLocaleString('id-ID');
        parts.push(...encoder.encode(`Bayar${' '.repeat(Math.max(1, 27 - bayarStr.length))}${bayarStr}\n`));

        const kembaliStr = (transaksi.kembalian || 0).toLocaleString('id-ID');
        parts.push(...encoder.encode(`Kembali${' '.repeat(Math.max(1, 25 - kembaliStr.length))}${kembaliStr}\n`));
      }

      parts.push(...encoder.encode('--------------------------------\n'));

      // Center Align Footer
      parts.push(ESC, 0x61, 0x01);
      parts.push(...encoder.encode('Terima kasih atas kunjungan Anda!\n'));
      parts.push(...encoder.encode('Silakan datang kembali.\n'));
    } else {
      // Kitchen / Bar note
      parts.push(ESC, 0x61, 0x01);
      parts.push(...encoder.encode('** SEGERA DIPROSES **\n'));
    }

    // Feed lines & Cut paper (GS V 66 0)
    parts.push(0x0a, 0x0a, 0x0a);
    parts.push(GS, 0x56, 0x42, 0x00);

    return new Uint8Array(parts);
  }

  // Print single slip
  async printSlip(
    transaksi: Transaksi,
    slipType: 'pelanggan' | 'dapur' | 'bar',
    namaToko: string
  ): Promise<boolean> {
    const bytes = this.buildReceiptBytes(transaksi, slipType, namaToko);
    return await this.sendRawBytes(bytes);
  }

  // Test Print (Sample short slip)
  async testPrint(namaToko: string): Promise<boolean> {
    const encoder = new TextEncoder();
    const parts: number[] = [];
    const ESC = 0x1b;
    const GS = 0x1d;

    parts.push(ESC, 0x40); // Init
    parts.push(ESC, 0x61, 0x01); // Center
    parts.push(ESC, 0x45, 0x01); // Bold
    parts.push(...encoder.encode(`${namaToko.toUpperCase()}\n`));
    parts.push(ESC, 0x45, 0x00);
    parts.push(...encoder.encode('UJI CETAK PRINTER BLUETOOTH\n'));
    parts.push(...encoder.encode('--------------------------------\n'));
    parts.push(...encoder.encode(`Waktu: ${formatDateTime(new Date().toISOString())}\n`));
    parts.push(...encoder.encode('Status: KONEKSI BERHASIL (OK)\n'));
    parts.push(...encoder.encode('Printer Thermal Siap Digunakan!\n'));
    parts.push(...encoder.encode('--------------------------------\n\n\n'));
    parts.push(GS, 0x56, 0x42, 0x00); // Cut

    return await this.sendRawBytes(new Uint8Array(parts));
  }
}

export const BluetoothPrinter = new BluetoothPrinterService();
