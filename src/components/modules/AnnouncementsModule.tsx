import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Announcement } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Plus, Pencil, Trash2, X, Megaphone } from 'lucide-react';

const CATEGORIES = [
  'Informasi pondok',
  'Jadwal kegiatan',
  'Informasi tahfidz',
  'Informasi asrama',
  'Kegiatan khusus',
  'Informasi wali santri',
];

export const AnnouncementsModule: React.FC = () => {
  const { user, notify } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canManage = isAdmin || (user?.role === 'ustadz' && Boolean(user?.permissions?.canManageAnnouncements));

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'Informasi pondok',
    target_audience: 'Semua' as 'Semua' | 'Wali Santri' | 'Ustadz' | 'Internal',
    published_at: new Date().toISOString().slice(0, 10),
    status: 'Diterbitkan' as 'Diterbitkan' | 'Draf',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<Announcement[]>('/api/announcements');
      setItems(res);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      title: '',
      content: '',
      category: 'Informasi pondok',
      target_audience: 'Semua',
      published_at: new Date().toISOString().slice(0, 10),
      status: 'Diterbitkan',
    });
    setModalOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title,
      content: a.content,
      category: a.category,
      target_audience: a.target_audience,
      published_at: a.published_at,
      status: a.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiFetch(`/api/announcements/${editing.id}`, { method: 'PUT', body: JSON.stringify(form) });
        notify('Pengumuman berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/announcements', { method: 'POST', body: JSON.stringify(form) });
        notify('Pengumuman baru berhasil diterbitkan.', 'success');
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' });
      notify('Pengumuman dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-950">Pengumuman Resmi Pondok Pesantren</h2>
          <p className="text-xs text-slate-500">
            Informasi resmi jadwal kegiatan, ujian tahfidz, asrama, dan agenda wali santri.
          </p>
        </div>
        {canManage && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Pengumuman</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">Memuat pengumuman...</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">Belum ada pengumuman yang tersedia.</div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <article key={a.id} className="border border-slate-200 rounded-2xl p-5 bg-[#F8FAF9]">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Megaphone className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="font-medium text-emerald-800">{a.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{a.published_at}</span>
                    <span aria-hidden="true">·</span>
                    <span>Target: {a.target_audience}</span>
                    {canManage && <StatusBadge status={a.status} />}
                  </div>
                  <h3 className="font-display font-bold text-base text-slate-950">{a.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{a.content}</p>
                  <p className="text-xs text-slate-500">Diterbitkan oleh: {a.author_name}</p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-white"
                      title="Edit Pengumuman"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-white"
                        title="Hapus Pengumuman"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {canManage && modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editing ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Judul Pengumuman *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kategori *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Target Penerima *</label>
                  <select
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Semua">Semua (Publik &amp; Wali)</option>
                    <option value="Wali Santri">Wali Santri</option>
                    <option value="Ustadz">Ustadz / Ustadzah</option>
                    <option value="Internal">Internal Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Publikasi</label>
                  <input
                    type="date"
                    required
                    value={form.published_at}
                    onChange={(e) => setForm({ ...form, published_at: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Diterbitkan">Diterbitkan</option>
                    <option value="Draf">Draf</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Isi Pengumuman *</label>
                <textarea
                  rows={4}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 text-white font-semibold">
                  Simpan Pengumuman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
