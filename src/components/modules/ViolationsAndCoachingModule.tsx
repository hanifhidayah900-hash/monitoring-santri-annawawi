import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { CoachingRecord, Student, ViolationCategory, ViolationRecord } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Plus, Pencil, Trash2, X, Tag } from 'lucide-react';

export const ViolationsAndCoachingModule: React.FC<{ initialTab?: 'violations' | 'coaching' }> = ({
  initialTab = 'violations',
}) => {
  const { user, selectedChildId, notify } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'ustadz';
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'user';

  const [tab, setTab] = useState<'violations' | 'coaching'>(initialTab);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [coaching, setCoaching] = useState<CoachingRecord[]>([]);
  const [categories, setCategories] = useState<ViolationCategory[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterCat, setFilterCat] = useState('');

  // Violation modal
  const [vModalOpen, setVModalOpen] = useState(false);
  const [editingV, setEditingV] = useState<ViolationRecord | null>(null);
  const [vForm, setVForm] = useState({
    student_id: '',
    violation_category_id: '',
    date: new Date().toISOString().slice(0, 10),
    time: '07:30',
    title: '',
    description: '',
    severity: 'Ringan' as 'Ringan' | 'Sedang' | 'Berat',
    coaching_action: '',
    notes: '',
    parent_visible: true,
  });

  // Coaching modal
  const [cModalOpen, setCModalOpen] = useState(false);
  const [editingC, setEditingC] = useState<CoachingRecord | null>(null);
  const [cForm, setCForm] = useState({
    student_id: '',
    date: new Date().toISOString().slice(0, 10),
    coaching_type: 'Pembinaan Kedisiplinan',
    notes: '',
    follow_up: '',
    parent_visible: true,
  });

  // Category modal (Admin)
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = isParent && selectedChildId ? `?studentId=${selectedChildId}` : '';
      const [vRes, cRes, catRes, sRes] = await Promise.all([
        apiFetch<ViolationRecord[]>(`/api/violations${qs}`),
        apiFetch<CoachingRecord[]>(`/api/coaching${qs}`),
        apiFetch<ViolationCategory[]>('/api/violation-categories'),
        canWrite ? apiFetch<Student[]>('/api/students') : Promise.resolve([]),
      ]);
      setViolations(vRes);
      setCoaching(cRes);
      setCategories(catRes);
      setStudents(sRes);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isParent, selectedChildId, canWrite, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddV = () => {
    setEditingV(null);
    setVForm({
      student_id: students[0] ? String(students[0].id) : '',
      violation_category_id: categories[0] ? String(categories[0].id) : '',
      date: new Date().toISOString().slice(0, 10),
      time: '07:30',
      title: '',
      description: '',
      severity: 'Ringan',
      coaching_action: '',
      notes: '',
      parent_visible: true,
    });
    setVModalOpen(true);
  };

  const openEditV = (v: ViolationRecord) => {
    setEditingV(v);
    setVForm({
      student_id: String(v.student_id),
      violation_category_id: String(v.violation_category_id),
      date: v.date,
      time: v.time || '',
      title: v.title,
      description: v.description,
      severity: v.severity,
      coaching_action: v.coaching_action,
      notes: v.notes || '',
      parent_visible: Boolean(v.parent_visible),
    });
    setVModalOpen(true);
  };

  const handleSaveV = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingV) {
        await apiFetch(`/api/violations/${editingV.id}`, { method: 'PUT', body: JSON.stringify(vForm) });
        notify('Catatan pelanggaran berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/violations', { method: 'POST', body: JSON.stringify(vForm) });
        notify('Catatan pelanggaran berhasil disimpan.', 'success');
      }
      setVModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteV = async (id: number) => {
    try {
      await apiFetch(`/api/violations/${id}`, { method: 'DELETE' });
      notify('Catatan pelanggaran dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const openAddC = () => {
    setEditingC(null);
    setCForm({
      student_id: students[0] ? String(students[0].id) : '',
      date: new Date().toISOString().slice(0, 10),
      coaching_type: 'Pembinaan Kedisiplinan',
      notes: '',
      follow_up: '',
      parent_visible: true,
    });
    setCModalOpen(true);
  };

  const openEditC = (c: CoachingRecord) => {
    setEditingC(c);
    setCForm({
      student_id: String(c.student_id),
      date: c.date,
      coaching_type: c.coaching_type,
      notes: c.notes,
      follow_up: c.follow_up,
      parent_visible: Boolean(c.parent_visible),
    });
    setCModalOpen(true);
  };

  const handleSaveC = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingC) {
        await apiFetch(`/api/coaching/${editingC.id}`, { method: 'PUT', body: JSON.stringify(cForm) });
        notify('Catatan pembinaan berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/coaching', { method: 'POST', body: JSON.stringify(cForm) });
        notify('Catatan pembinaan berhasil disimpan.', 'success');
      }
      setCModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteC = async (id: number) => {
    try {
      await apiFetch(`/api/coaching/${id}`, { method: 'DELETE' });
      notify('Catatan pembinaan dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/violation-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      });
      setNewCatName('');
      setNewCatDesc('');
      notify('Kategori pelanggaran ditambahkan.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteCat = async (id: number) => {
    try {
      await apiFetch(`/api/violation-categories/${id}`, { method: 'DELETE' });
      notify('Kategori dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const filteredViolations = violations.filter((v) => !filterCat || String(v.violation_category_id) === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setTab('violations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'violations' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pelanggaran &amp; Kedisiplinan
          </button>
          <button
            onClick={() => setTab('coaching')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'coaching' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Catatan Pembinaan Santri
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && tab === 'violations' && (
            <button
              onClick={() => setCatModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Kelola Kategori</span>
            </button>
          )}
          {canWrite && tab === 'violations' && (
            <button
              onClick={openAddV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pelanggaran</span>
            </button>
          )}
          {canWrite && tab === 'coaching' && (
            <button
              onClick={openAddC}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pembinaan</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB VIOLATIONS */}
      {tab === 'violations' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-950">
                {isParent ? 'Laporan Kedisiplinan & Pembinaan Anak' : 'Catatan Pelanggaran & Tindakan Pembinaan'}
              </h2>
              <p className="text-xs text-slate-500">
                {isParent
                  ? 'Disajikan secara informatif dan berorientasi pembinaan bersama orang tua.'
                  : 'Catatan internal dapat ditandai agar tidak tampil pada portal wali santri.'}
              </p>
            </div>
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl bg-white"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-4">Tanggal</th>
                  <th className="py-3 pr-4">Santri</th>
                  <th className="py-3 pr-4">Pelanggaran &amp; Kategori</th>
                  <th className="py-3 pr-4">Tingkat</th>
                  <th className="py-3 pr-4">Tindakan Pembinaan</th>
                  {canWrite && <th className="py-3 pr-4">Akses Wali</th>}
                  {canWrite && <th className="py-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Memuat catatan...
                    </td>
                  </tr>
                ) : filteredViolations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Tidak ada catatan pelanggaran. Alhamdulillah, kondisi kedisiplinan santri tertib.
                    </td>
                  </tr>
                ) : (
                  filteredViolations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 align-top">
                      <td className="py-3.5 pr-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        <div>{v.date}</div>
                        {v.time && <div className="text-slate-400">{v.time} WIB</div>}
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="font-medium text-slate-900">{v.student_name}</div>
                        <div className="text-xs text-slate-500">Kelas {v.class_name}</div>
                      </td>
                      <td className="py-3.5 pr-4 max-w-xs">
                        <div className="font-semibold text-slate-900">{v.title}</div>
                        <div className="text-xs text-emerald-800 font-medium">{v.category_name}</div>
                        <div className="text-xs text-slate-600 mt-1">{v.description}</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <StatusBadge status={v.severity} />
                      </td>
                      <td className="py-3.5 pr-4 text-xs text-slate-700 max-w-xs">
                        <div className="font-medium text-slate-900">{v.coaching_action}</div>
                        {v.notes && <div className="text-slate-500 mt-1">{v.notes}</div>}
                        <div className="text-slate-400 mt-1">Pencatat: {v.ustadz_name}</div>
                      </td>
                      {canWrite && (
                        <td className="py-3.5 pr-4 text-xs">
                          {v.parent_visible ? (
                            <span className="text-emerald-700 font-medium">Tampil ke Wali</span>
                          ) : (
                            <span className="text-slate-500">Internal Pondok</span>
                          )}
                        </td>
                      )}
                      {canWrite && (
                        <td className="py-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => openEditV(v)}
                            className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-slate-100 mr-1"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteV(v.id)}
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
      )}

      {/* TAB COACHING */}
      {tab === 'coaching' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="font-display font-bold text-lg text-slate-950">Catatan Pembinaan &amp; Arahan Santri</h2>
            <p className="text-xs text-slate-500">
              Dokumentasi bimbingan karakter, kemandirian, dan tindak lanjut perkembangan santri.
            </p>
          </div>
          <div className="space-y-4">
            {coaching.map((c) => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-5 bg-[#F8FAF9] flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono tabular-nums">{c.date}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-emerald-800">{c.coaching_type}</span>
                    {canWrite && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{c.parent_visible ? 'Dibagikan ke Wali' : 'Internal Pondok'}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-950">
                    {c.student_name} <span className="font-normal text-sm text-slate-500">(Kelas {c.class_name})</span>
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.notes}</p>
                  <p className="text-xs text-slate-600">
                    <strong>Tindak Lanjut:</strong> {c.follow_up} · <strong>Pembimbing:</strong> {c.ustadz_name}
                  </p>
                </div>
                {canWrite && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEditC(c)}
                      className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-white"
                      title="Edit Pembinaan"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDeleteC(c.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-white"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
            {coaching.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">Belum ada catatan pembinaan.</p>
            )}
          </div>
        </div>
      )}

      {/* Violation Modal */}
      {canWrite && vModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editingV ? 'Edit Catatan Pelanggaran' : 'Catat Pelanggaran & Pembinaan'}
              </h3>
              <button onClick={() => setVModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveV} className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Santri *</label>
                <select
                  required
                  disabled={Boolean(editingV)}
                  value={vForm.student_id}
                  onChange={(e) => setVForm({ ...vForm, student_id: e.target.value })}
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
                <label className="block text-xs font-medium text-slate-700 mb-1">Kategori *</label>
                <select
                  required
                  value={vForm.violation_category_id}
                  onChange={(e) => setVForm({ ...vForm, violation_category_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tingkat *</label>
                <select
                  value={vForm.severity}
                  onChange={(e) => setVForm({ ...vForm, severity: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Kejadian *</label>
                <input
                  type="date"
                  required
                  value={vForm.date}
                  onChange={(e) => setVForm({ ...vForm, date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Waktu</label>
                <input
                  type="time"
                  value={vForm.time}
                  onChange={(e) => setVForm({ ...vForm, time: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis / Judul Pelanggaran *</label>
                <input
                  required
                  value={vForm.title}
                  onChange={(e) => setVForm({ ...vForm, title: e.target.value })}
                  placeholder="Contoh: Terlambat Jamaah Subuh"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi Kejadian *</label>
                <textarea
                  rows={2}
                  required
                  value={vForm.description}
                  onChange={(e) => setVForm({ ...vForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Tindakan Pembinaan *</label>
                <textarea
                  rows={2}
                  required
                  value={vForm.coaching_action}
                  onChange={(e) => setVForm({ ...vForm, coaching_action: e.target.value })}
                  placeholder="Contoh: Dinasihati persuasif dan membaca istighfar"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                <input
                  value={vForm.notes}
                  onChange={(e) => setVForm({ ...vForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vForm.parent_visible}
                    onChange={(e) => setVForm({ ...vForm, parent_visible: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-800"
                  />
                  <span>Tampilkan catatan pembinaan ini di portal Orang Tua/Wali</span>
                </label>
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setVModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 text-white font-semibold">
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coaching Modal */}
      {canWrite && cModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editingC ? 'Edit Catatan Pembinaan' : 'Tambah Catatan Pembinaan'}
              </h3>
              <button onClick={() => setCModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveC} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Santri *</label>
                <select
                  required
                  disabled={Boolean(editingC)}
                  value={cForm.student_id}
                  onChange={(e) => setCForm({ ...cForm, student_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white disabled:bg-slate-100"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} — Kelas {s.class_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={cForm.date}
                    onChange={(e) => setCForm({ ...cForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Pembinaan *</label>
                  <input
                    required
                    value={cForm.coaching_type}
                    onChange={(e) => setCForm({ ...cForm, coaching_type: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Pembimbing *</label>
                <textarea
                  rows={3}
                  required
                  value={cForm.notes}
                  onChange={(e) => setCForm({ ...cForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rencana Tindak Lanjut</label>
                <input
                  value={cForm.follow_up}
                  onChange={(e) => setCForm({ ...cForm, follow_up: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cForm.parent_visible}
                  onChange={(e) => setCForm({ ...cForm, parent_visible: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-800"
                />
                <span>Dapat dilihat oleh Orang Tua/Wali</span>
              </label>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setCModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 text-white font-semibold">
                  Simpan Pembinaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Categories Modal (Admin) */}
      {isAdmin && catModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-slate-950">Kategori Pelanggaran</h3>
              <button onClick={() => setCatModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCat} className="space-y-3 mb-5 text-sm">
              <input
                required
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
              />
              <input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Deskripsi singkat..."
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
              />
              <button type="submit" className="w-full py-2 rounded-xl bg-emerald-800 text-white text-xs font-semibold">
                Tambah Kategori
              </button>
            </form>
            <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto text-sm">
              {categories.map((cat) => (
                <div key={cat.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">{cat.name}</div>
                    <div className="text-xs text-slate-500">{cat.description}</div>
                  </div>
                  <button onClick={() => handleDeleteCat(cat.id)} className="text-slate-400 hover:text-rose-700 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
