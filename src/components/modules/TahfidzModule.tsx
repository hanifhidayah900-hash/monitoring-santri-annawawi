import React, { useEffect, useState, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { PondokClass, Student, TahfidzRecord } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

export const TahfidzModule: React.FC = () => {
  const { user, selectedChildId, notify } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'ustadz';
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'user';

  const [records, setRecords] = useState<TahfidzRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<PondokClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterClass, setFilterClass] = useState('');
  const [filterStudent, setFilterStudent] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TahfidzRecord | null>(null);
  const [form, setForm] = useState({
    student_id: '',
    date: new Date().toISOString().slice(0, 10),
    surah: 'An-Naba',
    juz: 30,
    start_ayah: 1,
    end_ayah: 15,
    type: 'Hafalan Baru' as 'Hafalan Baru' | 'Murajaah' | "Tasmi'",
    score: 90,
    quality: 'Mumtaz' as 'Mumtaz' | 'Jayyid Jiddan' | 'Jayyid' | 'Perlu Bimbingan',
    notes: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (isParent && selectedChildId) qs.set('studentId', String(selectedChildId));
      else {
        if (filterClass) qs.set('classId', filterClass);
        if (filterStudent) qs.set('studentId', filterStudent);
      }
      const [recRes, sRes, cRes] = await Promise.all([
        apiFetch<TahfidzRecord[]>(`/api/tahfidz?${qs.toString()}`),
        canWrite ? apiFetch<Student[]>('/api/students') : Promise.resolve([]),
        canWrite ? apiFetch<PondokClass[]>('/api/classes') : Promise.resolve([]),
      ]);
      setRecords(recRes);
      setStudents(sRes);
      setClasses(cRes);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isParent, selectedChildId, filterClass, filterStudent, canWrite, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      student_id: students[0] ? String(students[0].id) : '',
      date: new Date().toISOString().slice(0, 10),
      surah: 'An-Naba',
      juz: 30,
      start_ayah: 1,
      end_ayah: 20,
      type: 'Hafalan Baru',
      score: 90,
      quality: 'Mumtaz',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (r: TahfidzRecord) => {
    setEditing(r);
    setForm({
      student_id: String(r.student_id),
      date: r.date,
      surah: r.surah,
      juz: r.juz,
      start_ayah: r.start_ayah,
      end_ayah: r.end_ayah,
      type: r.type,
      score: r.score,
      quality: r.quality,
      notes: r.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiFetch(`/api/tahfidz/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('Data setoran tahfidz berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/tahfidz', { method: 'POST', body: JSON.stringify(form) });
        notify('Setoran tahfidz berhasil ditambahkan.', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/tahfidz/${id}`, { method: 'DELETE' });
      notify('Catatan tahfidz dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const chartData = [...records]
    .slice(0, 12)
    .reverse()
    .map((r) => ({
      label: `${r.surah} (${r.date.slice(5)})`,
      score: r.score,
    }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-950">Perkembangan Setoran Tahfidz Al-Qur’an</h2>
            <p className="text-xs text-slate-500">
              {isParent
                ? 'Grafik nilai setoran hafalan dan murajaah putra/putri Anda.'
                : 'Monitoring kualitas hafalan baru, murajaah, dan tasmi’ santri.'}
            </p>
          </div>
          {canWrite && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors whitespace-nowrap self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Input Setoran Tahfidz</span>
            </button>
          )}
        </div>
        <div className="h-56">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" name="Nilai Hafalan" stroke="#047857" fill="#D1FAE5" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">
              Belum ada data grafik tahfidz.
            </div>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {canWrite && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} ({c.category})
                </option>
              ))}
            </select>
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
            >
              <option value="">Semua Santri</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.class_name})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">Tanggal</th>
                <th className="py-3 pr-4">Santri</th>
                <th className="py-3 pr-4">Surah &amp; Ayat</th>
                <th className="py-3 pr-4">Jenis</th>
                <th className="py-3 pr-4">Nilai / Kualitas</th>
                <th className="py-3 pr-4">Pembimbing &amp; Catatan</th>
                {canWrite && <th className="py-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Memuat data tahfidz...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Belum ada catatan setoran tahfidz.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">{r.date}</td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{r.student_name}</div>
                      <div className="text-xs text-slate-500">Kelas {r.class_name}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium text-slate-900">{r.surah}</div>
                      <div className="text-xs text-slate-500 tabular-nums">
                        Juz {r.juz} · Ayat {r.start_ayah}–{r.end_ayah}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-700">{r.type}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">{r.score}</span>
                        <StatusBadge status={r.quality} />
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600 max-w-xs">
                      <div className="font-medium text-slate-800">{r.ustadz_name}</div>
                      <div>{r.notes || '-'}</div>
                    </td>
                    {canWrite && (
                      <td className="py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-slate-100 mr-1"
                          title="Edit Setoran"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-slate-100"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal (Admin & Ustadz only) */}
      {canWrite && modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editing ? 'Edit Setoran Tahfidz' : 'Input Setoran Tahfidz'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Santri *</label>
                <select
                  required
                  disabled={Boolean(editing)}
                  value={form.student_id}
                  onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white disabled:bg-slate-100"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — Kelas {s.class_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Setoran *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Setoran *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Hafalan Baru">Hafalan Baru</option>
                  <option value="Murajaah">Murajaah</option>
                  <option value="Tasmi'">Tasmi&apos;</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Surah *</label>
                <input
                  required
                  value={form.surah}
                  onChange={(e) => setForm({ ...form, surah: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Juz *</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={form.juz}
                  onChange={(e) => setForm({ ...form, juz: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ayat Mulai *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.start_ayah}
                  onChange={(e) => setForm({ ...form, start_ayah: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ayat Selesai *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={form.end_ayah}
                  onChange={(e) => setForm({ ...form, end_ayah: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nilai (0-100) *</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={form.score}
                  onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kualitas Hafalan *</label>
                <select
                  value={form.quality}
                  onChange={(e) => setForm({ ...form, quality: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Mumtaz">Mumtaz</option>
                  <option value="Jayyid Jiddan">Jayyid Jiddan</option>
                  <option value="Jayyid">Jayyid</option>
                  <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Pembimbing</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold">
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
