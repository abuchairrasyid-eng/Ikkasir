import React, { useState } from 'react';
import { User, Role } from '../types';
import { UserPlus, Trash2, Shield, User as UserIcon } from 'lucide-react';

interface AkunViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (u: { nama: string; username: string; password?: string; peran: Role }) => void;
  onDeleteUser: (id: string) => void;
}

export const AkunView: React.FC<AkunViewProps> = ({
  users,
  currentUser,
  onAddUser,
  onDeleteUser,
}) => {
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [peran, setPeran] = useState<Role>('Kasir');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !username.trim() || !password) {
      alert('Isi nama, username, dan password.');
      return;
    }

    onAddUser({
      nama: nama.trim(),
      username: username.trim().toLowerCase(),
      password,
      peran,
    });

    setNama('');
    setUsername('');
    setPassword('');
    setPeran('Kasir');
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="pb-2 border-b border-[#D8DED6]/70">
        <h1 className="font-serif font-medium text-2xl sm:text-3xl text-[#1B2521] tracking-tight m-0">
          Manajemen Akun &amp; Staf
        </h1>
        <p className="text-xs sm:text-sm text-[#56635B] mt-1 font-sans">
          Tambahkan staf kasir baru atau atur hak akses peran Owner.
        </p>
      </div>

      {/* Add User Paper Form */}
      <div className="bg-[#FCFBF7] rounded-2xl p-5 sm:p-7 border border-[#D8DED6] shadow-2xs">
        <h2 className="font-serif font-medium text-lg text-[#1B2521] mb-4">
          Tambah Akun Pengguna
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-[#56635B] uppercase tracking-wider mb-1">
                Nama Lengkap
              </span>
              <input
                type="text"
                value={nama}
                onChange={e => setNama(e.target.value)}
                placeholder="misal: Siti Nurhaliza"
                className="w-full bg-transparent border-0 border-b border-[#D8DED6] py-1.5 text-sm text-[#1B2521] focus:outline-none focus:border-b-[#1F4034]"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-[#56635B] uppercase tracking-wider mb-1">
                Username
              </span>
              <input
                type="text"
                autoCapitalize="none"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="siti"
                className="w-full bg-transparent border-0 border-b border-[#D8DED6] py-1.5 text-sm text-[#1B2521] focus:outline-none focus:border-b-[#1F4034]"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-[#56635B] uppercase tracking-wider mb-1">
                Password
              </span>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full bg-transparent border-0 border-b border-[#D8DED6] py-1.5 text-sm text-[#1B2521] focus:outline-none focus:border-b-[#1F4034]"
                required
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-[#56635B] uppercase tracking-wider mb-1">
                Peran Akses
              </span>
              <select
                value={peran}
                onChange={e => setPeran(e.target.value as Role)}
                className="w-full bg-transparent border-0 border-b border-[#D8DED6] py-1.5 text-sm text-[#1B2521] focus:outline-none focus:border-b-[#1F4034]"
              >
                <option value="Kasir">Kasir</option>
                <option value="Owner">Owner (Pemilik)</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#1F4034] hover:bg-[#2B5646] active:scale-95 text-[#F3EBDD] font-semibold text-xs tracking-wide transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Tambah Akun
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div>
        <h2 className="font-serif font-medium text-xl text-[#1B2521] mb-3">
          Daftar Pengguna ({users.length})
        </h2>

        <div className="bg-[#FCFBF7] border border-[#D8DED6] rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1B2521] bg-[#F1F3EF]/60 text-[#56635B]">
                <th className="p-3.5 pl-5 font-medium">Nama</th>
                <th className="p-3.5 font-medium">Username</th>
                <th className="p-3.5 font-medium">Peran</th>
                <th className="p-3.5 pr-5 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EBE4]">
              {users.map(u => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-black/[0.015] transition-colors">
                    <td className="p-3.5 pl-5 font-semibold text-[#1B2521] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1B362C] text-[#C2A06A] flex items-center justify-center font-bold text-[10px]">
                        {u.nama.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{u.nama}</span>
                      {isSelf && (
                        <span className="text-[10px] text-gray-400 font-normal">
                          (Kamu)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[#56635B]">{u.username}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          u.peran === 'Owner'
                            ? 'bg-[#C2A06A]/15 text-[#7C5E2E]'
                            : 'bg-[#1F4034]/10 text-[#1F4034]'
                        }`}
                      >
                        {u.peran === 'Owner' ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <UserIcon className="w-3 h-3" />
                        )}
                        {u.peran}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      {!isSelf ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus akun ${u.nama}? Kasir tidak dapat masuk lagi.`)) {
                              onDeleteUser(u.id);
                            }
                          }}
                          className="text-[#A8392F] hover:underline underline-offset-4 cursor-pointer text-xs font-medium"
                        >
                          Hapus
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs italic">Aktif</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
