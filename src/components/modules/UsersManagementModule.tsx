import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Profile, Student } from '../../types';
import { Plus, Pencil, Trash2, X, ShieldCheck, Users } from 'lucide-react';

export const UsersManagementModule: React.FC<{ targetRole: 'ustadz' | 'user' }> = ({ targetRole }) => {
  const { notify } = useAuth();
  const [users, setUsers] = useState<Array<Profile & { linkedStudents?: Array<{ id: number; nis: string; full_name: string; class_name: string }> }>>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    canManageAnnouncements: false,
    canManageExtracurriculars: false,
    studentIds: [] as number[],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, sRes] = await Promise.all([
        apiFetch<any[]>(`/api/users?role=${targetRole}`),
        targetRole === 'user' ? apiFetch<Student[]>('/api/students') : Promise.resolve([]),
      ]);
      setUsers(uRes);
      setStudents(sRes);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [targetRole, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      username: '',
      full_name: '',
      email: '',
      phone: '',
      password: '',
      canManageAnnouncements: false,
      canManageExtracurriculars: true,
      studentIds: [],
    });
    setModalOpen(true);
  };

  const openEdit = (u: any) => {
    setEditing(u);
    setForm({
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      canManageAnnouncements: Boolean(u.permissions?.canManageAnnouncements),
      canManageExtracurriculars: Boolean(u.permissions?.canManageExtracurriculars),
      studentIds: (u.linkedStudents || []).map((s: any) => s.id),
    });
    setModalOpen(true);
  };

  const toggleStudentId = (id: number) => {
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(id)
        ? prev.studentIds.filter((item) => item !== id)
        : [...prev.studentIds, id],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        username: form.username,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        role: targetRole,
        permissions:
          targetRole === 'ustadz'
            ? {
                canManageAnnouncements: form.canManageAnnouncements,
                canManageExtracurriculars: form.canManageExtracurriculars,
              }
            : {},
        studentIds: targetRole === 'user' ? form.studentIds : undefined,
      };
      if (form.password) payload.password = form.password;

      if (editing) {
        await apiFetch(`/api/users/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify('Akun berhasil diperbarui.', 'success');
      } else {
        if (!form.password) {
          notify('Password wajib diisi untuk akun baru.', 'error');
          return;
        }
        await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
        notify('Akun baru berhasil dibuat.', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (u: Profile) => {
    try {
      await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' });
      notify(`Akun ${u.full_name} berhasil dihapus.`, 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const isUstadz = targetRole === 'ustadz';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-950">
            {isUstadz ? 'Manajemen Akun Ustadz / Ustadzah' : 'Manajemen Akun Orang Tua / Wali Santri'}
          </h2>
          <p className="text-xs text-slate-500">
            {isUstadz
              ? 'Kelola akun pengampu dan atur izin akses pengumuman serta ekstrakurikuler.'
              : 'Kelola akun wali santri dan tautkan dengan putra/putri yang dipantau (akses baca-saja).'}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{isUstadz ? 'Tambah Ustadz/Ustadzah' : 'Tambah Orang Tua/Wali'}</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
              <th className="py-3 pr-4">Username</th>
              <th className="py-3 pr-4">Nama Lengkap</th>
              <th className="py-3 pr-4">Kontak</th>
              <th className="py-3 pr-4">{isUstadz ? 'Izin Tambahan' : 'Santri Terhubung'}</th>
              <th className="py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Memuat data pengguna...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 pr-4 font-mono text-xs text-slate-700">{u.username}</td>
                  <td className="py-3.5 pr-4 font-medium text-slate-900">{u.full_name}</td>
                  <td className="py-3.5 pr-4 text-xs text-slate-600">
                    <div>{u.email}</div>
                    <div className="text-slate-500 tabular-nums">{u.phone || '-'}</div>
                  </td>
                  <td className="py-3.5 pr-4 text-xs text-slate-700">
                    {isUstadz ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            Pengumuman: {u.permissions?.canManageAnnouncements ? 'Diizinkan' : 'Tidak'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            Ekstrakurikuler: {u.permissions?.canManageExtracurriculars ? 'Diizinkan' : 'Tidak'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {(u.linkedStudents || []).length > 0 ? (
                          u.linkedStudents!.map((s) => (
                            <div key={s.id} className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              <span>
                                {s.full_name} (Kelas {s.class_name})
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400">Belum ada anak ditautkan</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-slate-100 mr-1"
                      title="Edit Akun"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-slate-100"
                      title="Hapus Akun"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editing ? 'Edit Akun' : isUstadz ? 'Tambah Akun Ustadz/Ustadzah' : 'Tambah Akun Orang Tua/Wali'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Username *</label>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap *</label>
                  <input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nomor HP / WhatsApp</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {editing ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password *'}
                </label>
                <input
                  type="password"
                  required={!editing}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              {isUstadz ? (
                <div className="bg-[#F8FAF9] border border-slate-200 rounded-xl p-4 space-y-2.5">
                  <p className="text-xs font-semibold text-slate-800">Izin Khusus Ustadz/Ustadzah</p>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.canManageAnnouncements}
                      onChange={(e) => setForm({ ...form, canManageAnnouncements: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Izinkan membuat &amp; memperbarui pengumuman</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.canManageExtracurriculars}
                      onChange={(e) => setForm({ ...form, canManageExtracurriculars: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                    />
                    <span>Izinkan mengelola aktivitas &amp; peserta ekstrakurikuler</span>
                  </label>
                </div>
              ) : (
                <div className="bg-[#F8FAF9] border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-800 mb-2.5">
                    Pilih Santri yang Terhubung dengan Wali Ini:
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {students.map((s) => (
                      <label key={s.id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={form.studentIds.includes(s.id)}
                          onChange={() => toggleStudentId(s.id)}
                          className="rounded border-slate-300 text-emerald-800 focus:ring-emerald-700"
                        />
                        <span>
                          {s.full_name} — Kelas {s.class_name} ({s.nis})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold">
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
