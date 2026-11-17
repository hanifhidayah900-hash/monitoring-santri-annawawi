import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, uploadImageFile } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { PondokClass, Profile, Student } from '../../types';
import { StatusBadge, SafeImage } from '../StatusBadge';
import { Plus, Search, Pencil, Trash2, Eye, X, Building2, Upload } from 'lucide-react';

export const StudentsAndClassesModule: React.FC = () => {
  const { user, notify } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isParent = user?.role === 'user';

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<PondokClass[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [ustadzList, setUstadzList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDorm, setFilterDorm] = useState('');

  // Student Modal
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  // Class Modal (Admin Conditional Class Management)
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<PondokClass | null>(null);
  const [classForm, setClassForm] = useState({
    name: '',
    category: 'Banat' as 'Banat' | 'Banin',
    homeroom_ustadz_id: '',
    description: '',
  });

  const [studentForm, setStudentForm] = useState({
    nis: '',
    full_name: '',
    gender: 'P' as 'L' | 'P',
    birth_place: '',
    birth_date: '2013-01-01',
    address: '',
    photo_url: '',
    class_id: '',
    dormitory: '',
    enrollment_year: 2026,
    status: 'Aktif' as 'Aktif' | 'Cuti' | 'Lulus' | 'Nonaktif',
    parent_id: '',
    relationship: 'Orang Tua',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([apiFetch<Student[]>('/api/students'), apiFetch<PondokClass[]>('/api/classes')]);
      setStudents(sRes);
      setClasses(cRes);
      if (isAdmin) {
        const [pRes, uRes] = await Promise.all([
          apiFetch<Profile[]>('/api/users?role=user'),
          apiFetch<Profile[]>('/api/users?role=ustadz'),
        ]);
        setParents(pRes);
        setUstadzList(uRes);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dormList = Array.from(new Set(students.map((s) => s.dormitory))).sort();

  const filteredStudents = students.filter((s) => {
    const matchSearch =
      !search ||
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      s.nis.toLowerCase().includes(search.toLowerCase());
    const matchClass = !filterClass || String(s.class_id) === filterClass;
    const matchDorm = !filterDorm || s.dormitory === filterDorm;
    return matchSearch && matchClass && matchDorm;
  });

  const openAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      nis: `ANW-${Math.floor(2630 + Math.random() * 500)}`,
      full_name: '',
      gender: 'P',
      birth_place: '',
      birth_date: '2013-01-01',
      address: '',
      photo_url: '',
      class_id: classes[0] ? String(classes[0].id) : '',
      dormitory: 'Asrama Khadijah 01',
      enrollment_year: 2026,
      status: 'Aktif',
      parent_id: '',
      relationship: 'Orang Tua',
    });
    setStudentModalOpen(true);
  };

  const openEditStudent = (s: Student) => {
    setEditingStudent(s);
    setStudentForm({
      nis: s.nis,
      full_name: s.full_name,
      gender: s.gender,
      birth_place: s.birth_place,
      birth_date: s.birth_date,
      address: s.address,
      photo_url: s.photo_url || '',
      class_id: String(s.class_id),
      dormitory: s.dormitory,
      enrollment_year: s.enrollment_year,
      status: s.status,
      parent_id: s.parent_id ? String(s.parent_id) : '',
      relationship: s.relationship || 'Orang Tua',
    });
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...studentForm,
        class_id: Number(studentForm.class_id),
        parent_id: studentForm.parent_id ? Number(studentForm.parent_id) : null,
      };
      if (editingStudent) {
        await apiFetch(`/api/students/${editingStudent.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify('Data santri berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/students', { method: 'POST', body: JSON.stringify(payload) });
        notify('Santri baru berhasil ditambahkan.', 'success');
      }
      setStudentModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteStudent = async (s: Student) => {
    try {
      await apiFetch(`/api/students/${s.id}`, { method: 'DELETE' });
      notify(`Data santri ${s.full_name} dihapus.`, 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadImageFile(file);
      setStudentForm((prev) => ({ ...prev, photo_url: url }));
      notify('Foto santri berhasil diunggah.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Class CRUD (Admin Conditional)
  const openAddClass = () => {
    setEditingClass(null);
    setClassForm({ name: '', category: 'Banat', homeroom_ustadz_id: '', description: '' });
    setClassModalOpen(true);
  };

  const openEditClass = (c: PondokClass) => {
    setEditingClass(c);
    setClassForm({
      name: c.name,
      category: c.category,
      homeroom_ustadz_id: c.homeroom_ustadz_id ? String(c.homeroom_ustadz_id) : '',
      description: c.description || '',
    });
    setClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...classForm,
        homeroom_ustadz_id: classForm.homeroom_ustadz_id ? Number(classForm.homeroom_ustadz_id) : null,
      };
      if (editingClass) {
        await apiFetch(`/api/classes/${editingClass.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify('Data kelas berhasil diperbarui.', 'success');
      } else {
        await apiFetch('/api/classes', { method: 'POST', body: JSON.stringify(payload) });
        notify(`Kelas ${classForm.name} berhasil ditambahkan.`, 'success');
      }
      setClassModalOpen(false);
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteClass = async (c: PondokClass) => {
    try {
      await apiFetch(`/api/classes/${c.id}`, { method: 'DELETE' });
      notify(`Kelas ${c.name} berhasil dihapus.`, 'success');
      loadData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Conditional Class Management Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="font-display font-bold text-lg text-slate-950">Manajemen Kelas (Kondisional)</h2>
              <p className="text-xs text-slate-500">
                Kelas bawaan 7A &amp; 7B (Banat) serta 7C &amp; 7D (Banin). Admin dapat menambah atau menyesuaikan kelas
                sesuai kebutuhan pondok.
              </p>
            </div>
            <button
              onClick={openAddClass}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {classes.map((c) => (
              <div key={c.id} className="border border-slate-200 rounded-xl p-4 bg-[#F8FAF9] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-display font-bold text-base text-emerald-950">Kelas {c.name}</span>
                    <span className="text-xs font-semibold text-amber-800">{c.category}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-2">{c.description || '-'}</p>
                  <p className="text-xs text-slate-500">
                    Wali Kelas: <span className="font-medium text-slate-700">{c.homeroom_ustadz_name || 'Belum ditentukan'}</span>
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 tabular-nums">{c.student_count ?? 0} Santri</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditClass(c)}
                      className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-white"
                      title="Edit Kelas"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClass(c)}
                      className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-white"
                      title="Hapus Kelas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Roster Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display font-bold text-lg text-slate-950">
              {isParent ? 'Profil Putra / Putri Anda' : 'Data Santri Pondok Pesantren Modern An-Nawawi'}
            </h2>
            <p className="text-xs text-slate-500">
              {isParent
                ? 'Informasi lengkap data diri anak yang terhubung dengan akun wali Anda (Hanya Baca).'
                : `Menampilkan ${filteredStudents.length} dari ${students.length} data santri (Data Contoh & Aktif).`}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openAddStudent}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold transition-colors whitespace-nowrap self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Santri</span>
            </button>
          )}
        </div>

        {/* Filters */}
        {!isParent && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau NIS santri..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name} ({c.category})
                </option>
              ))}
            </select>
            <select
              value={filterDorm}
              onChange={(e) => setFilterDorm(e.target.value)}
              className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="">Semua Asrama</option>
              {dormList.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                <th className="py-3 pr-4">NIS</th>
                <th className="py-3 pr-4">Nama Santri</th>
                <th className="py-3 pr-4">Kelas</th>
                <th className="py-3 pr-4">Asrama</th>
                <th className="py-3 pr-4">Orang Tua / Wali</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Memuat data santri...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada data santri yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">{s.nis}</td>
                    <td className="py-3 pr-4 font-medium text-slate-900">{s.full_name}</td>
                    <td className="py-3 pr-4 text-slate-700 whitespace-nowrap">
                      {s.class_name} ({s.class_category})
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{s.dormitory}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {s.parent_name ? (
                        <div>
                          <span className="font-medium text-slate-800 block text-xs">{s.parent_name}</span>
                          <span className="text-xs text-slate-500">{s.parent_phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Belum ditautkan</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setDetailStudent(s)}
                          className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-slate-100"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditStudent(s)}
                              className="p-1.5 text-slate-500 hover:text-emerald-800 rounded-lg hover:bg-slate-100"
                              title="Edit Santri"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(s)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 rounded-lg hover:bg-slate-100"
                              title="Hapus Santri"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {detailStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                {detailStudent.photo_url ? (
                  <SafeImage
                    src={detailStudent.photo_url}
                    alt={detailStudent.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-900 text-white font-display font-bold text-2xl flex items-center justify-center shrink-0">
                    {detailStudent.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-950">{detailStudent.full_name}</h3>
                  <p className="text-xs font-mono text-slate-500 tabular-nums">NIS {detailStudent.nis}</p>
                </div>
              </div>
              <button onClick={() => setDetailStudent(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
              <div>
                <dt className="text-xs text-slate-500">Kelas</dt>
                <dd className="font-medium text-slate-900">
                  {detailStudent.class_name} ({detailStudent.class_category})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Jenis Kelamin</dt>
                <dd className="font-medium text-slate-900">{detailStudent.gender === 'L' ? 'Laki-laki (Banin)' : 'Perempuan (Banat)'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Tempat, Tanggal Lahir</dt>
                <dd className="font-medium text-slate-900">
                  {detailStudent.birth_place}, {detailStudent.birth_date}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Asrama</dt>
                <dd className="font-medium text-slate-900">{detailStudent.dormitory}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Tahun Masuk</dt>
                <dd className="font-medium text-slate-900 tabular-nums">{detailStudent.enrollment_year}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <StatusBadge status={detailStudent.status} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Alamat Rumah</dt>
                <dd className="font-medium text-slate-900">{detailStudent.address}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Orang Tua / Wali Terhubung</dt>
                <dd className="font-medium text-slate-900">
                  {detailStudent.parent_name ? `${detailStudent.parent_name} (${detailStudent.parent_phone})` : 'Belum ditautkan'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal (Admin) */}
      {isAdmin && studentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">
                {editingStudent ? 'Edit Data Santri' : 'Tambah Santri Baru'}
              </h3>
              <button onClick={() => setStudentModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">NIS *</label>
                <input
                  required
                  value={studentForm.nis}
                  onChange={(e) => setStudentForm({ ...studentForm, nis: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  required
                  value={studentForm.full_name}
                  onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
                <select
                  value={studentForm.gender}
                  onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as 'L' | 'P' })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="P">Perempuan (Banat)</option>
                  <option value="L">Laki-laki (Banin)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kelas *</label>
                <select
                  required
                  value={studentForm.class_id}
                  onChange={(e) => setStudentForm({ ...studentForm, class_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tempat Lahir</label>
                <input
                  value={studentForm.birth_place}
                  onChange={(e) => setStudentForm({ ...studentForm, birth_place: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={studentForm.birth_date}
                  onChange={(e) => setStudentForm({ ...studentForm, birth_date: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Asrama</label>
                <input
                  value={studentForm.dormitory}
                  onChange={(e) => setStudentForm({ ...studentForm, dormitory: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Masuk</label>
                <input
                  type="number"
                  value={studentForm.enrollment_year}
                  onChange={(e) => setStudentForm({ ...studentForm, enrollment_year: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status Santri</label>
                <select
                  value={studentForm.status}
                  onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value as any })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Cuti">Cuti</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Akun Orang Tua / Wali</label>
                <select
                  value={studentForm.parent_id}
                  onChange={(e) => setStudentForm({ ...studentForm, parent_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">-- Belum ditautkan --</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Lengkap</label>
                <input
                  value={studentForm.address}
                  onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Foto Santri (Opsional)</label>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium cursor-pointer hover:bg-slate-50">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto'}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {studentForm.photo_url && <span className="text-xs text-emerald-700">Foto terunggah</span>}
                </div>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold">
                  Simpan Data Santri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Class Modal (Admin Conditional) */}
      {isAdmin && classModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-800" />
                <h3 className="font-display font-bold text-lg text-slate-950">
                  {editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}
                </h3>
              </div>
              <button onClick={() => setClassModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Kelas (Contoh: 8A, 8B) *</label>
                <input
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="Misal: 8A"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kelompok *</label>
                <select
                  value={classForm.category}
                  onChange={(e) => setClassForm({ ...classForm, category: e.target.value as 'Banat' | 'Banin' })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="Banat">Banat (Putri)</option>
                  <option value="Banin">Banin (Putra)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Wali Kelas (Ustadz/Ustadzah)</label>
                <select
                  value={classForm.homeroom_ustadz_id}
                  onChange={(e) => setClassForm({ ...classForm, homeroom_ustadz_id: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">-- Pilih Wali Kelas --</option>
                  {ustadzList.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deskripsi Kelas</label>
                <textarea
                  rows={2}
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold">
                  Simpan Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
