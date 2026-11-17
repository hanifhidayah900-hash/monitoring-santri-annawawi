import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Extracurricular, ExtracurricularMember, Profile, Student } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Plus, Pencil, Trash2, X, Users, Calendar, MapPin } from 'lucide-react';

export const ExtracurricularsModule: React.FC = () => {
  const { user, selectedChildId, notify } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'user';
  const canManage = isAdmin || (user?.role === 'ustadz' && Boolean(user?.permissions?.canManageExtracurriculars));

  const [list, setList] = useState<Extracurricular[]>([]);
  const [members, setMembers] = useState<ExtracurricularMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [ustadzList, setUstadzList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Extracurricular | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    schedule: '',
    location: '',
    supervisor_id: '',
    status: 'Aktif' as 'Aktif' | 'Nonaktif',
  });

  // Member assignment modal
  const [memberModalEkstra, setMemberModalEkstra] = useState<Extracurricular | null>(null);
  const [newMemberStudentId, setNewMemberStudentId] = useState('');
  const [newMemberNotes, setNewMemberNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mQs = isParent && selectedChildId ? `?studentId=${selectedChildId}` : '';
      const [eRes, mRes] = await Promise.all([
        apiFetch<Extracurricular[]>('/api/extracurriculars'),
        apiFetch<ExtracurricularMember[]>(`/api/extracurricular-members${mQs}`),
      ]);
      setList(eRes);
      setMembers(mRes);
      if (canManage) {
        const [sRes, uRes] = await Promise.all([
          apiFetch<Student[]>('/api/students'),
          apiFetch<Profile[]>('/api/users?role=ustadz'),
        ]);
        setStudents(sRes);
        setUstadzList(uRes);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isParent, selectedChildId, canManage, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      schedule: '',
      location: '',
      supervisor_id: ustadzList[0] ? String(ustadzList[0].id) : '',
      status: 'Aktif',
    });
    setModalOpen(true);
  };

  const openEdit = (eItem: Extracurricular) => {
    setEditing(eItem);
    setForm({
      name: eItem.name,
      description: eItem.description,
      schedule: eItem.schedule,
      location: eItem.location,
      supervisor_id: eItem.supervisor_id ? String(eItem.supervisor_id) : '',
      status: eItem.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiFetch(`/api/extracurriculars/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('Data ekstrakurikuler diperbarui.', 'success');
      } else {
        await apiFetch('/api/extracurriculars', { method: 'POST', body: JSON.stringify(form) });
        notify('Ekstrakurikuler baru ditambahkan.', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/extracurriculars/${id}`, { method: 'DELETE' });
      notify('Ekstrakurikuler dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberModalEkstra || !newMemberStudentId) return;
    try {
      await apiFetch('/api/extracurricular-members', {
        method: 'POST',
        body: JSON.stringify({
          extracurricular_id: memberModalEkstra.id,
          student_id: Number(newMemberStudentId),
          notes: newMemberNotes,
        }),
      });
      notify('Peserta berhasil ditambahkan.', 'success');
      setNewMemberNotes('');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      await apiFetch(`/api/extracurricular-members/${memberId}`, { method: 'DELETE' });
      notify('Peserta dihapus dari ekstrakurikuler.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  if (isParent) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="font-display font-bold text-lg text-slate-950 mb-1">
            Ekstrakurikuler yang Diikuti Putra/Putri Anda
          </h2>
          <p className="text-xs text-slate-500 mb-5">
            Daftar kegiatan pengembangan bakat dan minat santri beserta catatan pembina.
          </p>
          {loading ? (
            <p className="text-sm text-slate-500 py-6">Memuat data ekstrakurikuler...</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-slate-500 py-6">Anak Anda belum terdaftar pada ekstrakurikuler tertentu.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((m) => (
                <div key={m.id} className="border border-slate-200 rounded-xl p-5 bg-[#F8FAF9]">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-display font-bold text-base text-emerald-950">{m.extracurricular_name}</h3>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{m.schedule}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{m.location}</span>
                    </div>
                    <p>Pembina: {m.supervisor_name || '-'}</p>
                  </div>
                  <p className="text-xs text-slate-700 border-t border-slate-200 pt-2.5">
                    <strong>Catatan Perkembangan:</strong> {m.notes || 'Mengikuti kegiatan dengan baik.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-950">Kegiatan Ekstrakurikuler Santri</h2>
            <p className="text-xs text-slate-500">
              Pengelolaan jadwal, lokasi, pembina, dan daftar santri peserta ekstrakurikuler.
            </p>
          </div>
          {canManage && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Ekstrakurikuler</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((item) => (
            <div key={item.id} className="border border-slate-200 rounded-2xl p-5 bg-[#F8FAF9] flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-base text-slate-950">{item.name}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">{item.description}</p>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{item.schedule}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>{item.location}</span>
                  </div>
                  <div>Pembina: {item.supervisor_name || '-'}</div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => {
                    setMemberModalEkstra(item);
                    setNewMemberStudentId(students[0] ? String(students[0].id) : '');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:underline"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{item.member_count ?? 0} Peserta</span>
                </button>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-white">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ekstrakurikuler Modal */}
      {canManage && modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editing ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Ekstrakurikuler *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jadwal *</label>
                <input
                  required
                  value={form.schedule}
                  onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                  placeholder="Contoh: Sabtu, 15:30 - 17:00 WIB"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Lokasi *</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pembina</label>
                  <select
                    value={form.supervisor_id}
                    onChange={(e) => setForm({ ...form, supervisor_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">-- Pilih Pembina --</option>
                    {ustadzList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 text-white font-semibold">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {memberModalEkstra && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-950">Peserta: {memberModalEkstra.name}</h3>
                <p className="text-xs text-slate-500">{memberModalEkstra.schedule}</p>
              </div>
              <button onClick={() => setMemberModalEkstra(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {canManage && (
              <form onSubmit={handleAddMember} className="space-y-2.5 mb-5 p-4 bg-[#F8FAF9] border border-slate-200 rounded-xl text-sm">
                <select
                  value={newMemberStudentId}
                  onChange={(e) => setNewMemberStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — Kelas {s.class_name}
                    </option>
                  ))}
                </select>
                <input
                  value={newMemberNotes}
                  onChange={(e) => setNewMemberNotes(e.target.value)}
                  placeholder="Catatan pembina (opsional)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
                <button type="submit" className="w-full py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold">
                  Daftarkan Santri
                </button>
              </form>
            )}

            <div className="divide-y divide-slate-100 text-sm">
              {members
                .filter((m) => m.extracurricular_id === memberModalEkstra.id)
                .map((m) => (
                  <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {m.student_name} <span className="text-xs text-slate-500">(Kelas {m.class_name})</span>
                      </div>
                      <div className="text-xs text-slate-500">{m.notes || 'Aktif mengikuti latihan'}</div>
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-slate-400 hover:text-rose-700 p-1"
                        title="Hapus Peserta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
