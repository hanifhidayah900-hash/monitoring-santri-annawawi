import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, uploadImageFile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { ActivityPhoto, PondokClass } from '../../types';
import { SafeImage } from '../StatusBadge';
import { Plus, Trash2, X, Upload, Maximize2 } from 'lucide-react';

const PHOTO_CATEGORIES = [
  'Semua',
  'Kegiatan belajar',
  'Kegiatan tahfidz',
  'Kegiatan ibadah',
  'Kegiatan olahraga',
  'Kegiatan kebersihan',
  'Kegiatan ekstrakurikuler',
  'Kegiatan asrama',
  'Kegiatan pondok lainnya',
];

export const GalleryModule: React.FC = () => {
  const { user, notify } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'ustadz';

  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [classes, setClasses] = useState<PondokClass[]>([]);
  const [category, setCategory] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<ActivityPhoto | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    category: 'Kegiatan belajar',
    class_id: '',
    activity_date: new Date().toISOString().slice(0, 10),
    visibility: 'Wali Santri' as 'Publik' | 'Wali Santri' | 'Internal',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = category !== 'Semua' ? `?category=${encodeURIComponent(category)}` : '';
      const [pRes, cRes] = await Promise.all([
        apiFetch<ActivityPhoto[]>(`/api/photos${qs}`),
        canWrite ? apiFetch<PondokClass[]>('/api/classes') : Promise.resolve([]),
      ]);
      setPhotos(pRes);
      setClasses(cRes);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [category, canWrite, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      setForm((prev) => ({ ...prev, image_url: url }));
      notify('Foto berhasil diunggah ke server.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url) {
      notify('Silakan pilih atau unggah foto kegiatan terlebih dahulu.', 'error');
      return;
    }
    try {
      await apiFetch('/api/photos', { method: 'POST', body: JSON.stringify(form) });
      notify('Dokumentasi kegiatan berhasil ditambahkan.', 'success');
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiFetch(`/api/photos/${id}`, { method: 'DELETE' });
      notify('Dokumentasi foto dihapus.', 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-950">Dokumentasi Foto Keseharian Santri</h2>
            <p className="text-xs text-slate-500">
              Galeri kegiatan belajar, tahfidz, ibadah, dan pembinaan santri Pondok Pesantren Modern An-Nawawi.
            </p>
          </div>
          {canWrite && (
            <button
              onClick={() => {
                setForm({
                  title: '',
                  description: '',
                  image_url: '',
                  category: 'Kegiatan belajar',
                  class_id: '',
                  activity_date: new Date().toISOString().slice(0, 10),
                  visibility: 'Wali Santri',
                });
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Unggah Foto Kegiatan</span>
            </button>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {PHOTO_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                category === cat
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat galeri dokumentasi...</div>
        ) : photos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Belum ada dokumentasi foto untuk kategori ini.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {photos.map((p) => (
              <div key={p.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-[#F8FAF9] flex flex-col">
                <div className="aspect-[4/3] relative group overflow-hidden bg-slate-100">
                  <SafeImage
                    src={p.image_url}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    fallbackLabel={p.title}
                  />
                  <button
                    onClick={() => setLightbox(p)}
                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/70 text-white hover:bg-black transition-colors"
                    title="Perbesar Gambar"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span>{p.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{p.activity_date}</span>
                      {p.class_name && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Kelas {p.class_name}</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-sm text-slate-950 mb-1">{p.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{p.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>Oleh {p.uploader_name}</span>
                    {canWrite && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-400 hover:text-rose-700 p-1"
                        title="Hapus Foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[16/10] bg-slate-950">
              <SafeImage src={lightbox.image_url} alt={lightbox.title} className="w-full h-full object-contain" />
            </div>
            <div className="p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span>{lightbox.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{lightbox.activity_date}</span>
                  <span aria-hidden="true">·</span>
                  <span>Diunggah oleh {lightbox.uploader_name}</span>
                </div>
                <h3 className="font-display font-bold text-lg text-slate-950">{lightbox.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{lightbox.description}</p>
              </div>
              <button onClick={() => setLightbox(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {canWrite && modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">Unggah Dokumentasi Kegiatan</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">File Foto Kegiatan *</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-700 rounded-xl p-5 cursor-pointer bg-[#F8FAF9]">
                  <Upload className="w-6 h-6 text-emerald-700 mb-1.5" />
                  <span className="text-xs font-medium text-slate-700">
                    {uploading ? 'Mengunggah foto...' : form.image_url ? 'Foto siap disimpan (Klik untuk ganti)' : 'Klik untuk pilih foto (PNG/JPG/WEBP)'}
                  </span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="mt-3 h-36 w-full object-cover rounded-xl border border-slate-200" />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Judul Kegiatan *</label>
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
                    {PHOTO_CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    required
                    value={form.activity_date}
                    onChange={(e) => setForm({ ...form, activity_date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kelas (Opsional)</label>
                  <select
                    value={form.class_id}
                    onChange={(e) => setForm({ ...form, class_id: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Seluruh Pondok</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Visibilitas Privasi *</label>
                  <select
                    value={form.visibility}
                    onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Wali Santri">Wali Santri</option>
                    <option value="Publik">Publik (Profil Pondok)</option>
                    <option value="Internal">Internal Pengurus</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi Kegiatan</label>
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
                  Publikasikan Foto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
