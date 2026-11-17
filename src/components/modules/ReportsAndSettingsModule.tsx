import React, { useEffect, useState } from 'react';
import { apiFetch, exportToCsv } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { AuditLog, PondokClass } from '../../types';
import { Download, Printer, Save } from 'lucide-react';

type ReportKind = 'santri' | 'tahfidz' | 'absensi' | 'pelanggaran' | 'ekstra' | 'foto';

export const ReportsModule: React.FC = () => {
  const { notify } = useAuth();
  const [kind, setKind] = useState<ReportKind>('absensi');
  const [classes, setClasses] = useState<PondokClass[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch<PondokClass[]>('/api/classes').then(setClasses).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filterClass) qs.set('classId', filterClass);
    if (filterDate) qs.set('date', filterDate);

    const endpointMap: Record<ReportKind, string> = {
      santri: `/api/students?${qs.toString()}`,
      tahfidz: `/api/tahfidz?${qs.toString()}`,
      absensi: `/api/attendance?${qs.toString()}`,
      pelanggaran: `/api/violations`,
      ekstra: `/api/extracurricular-members`,
      foto: `/api/photos`,
    };

    apiFetch<any[]>(endpointMap[kind])
      .then((res) => setRows(res))
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [kind, filterClass, filterDate, notify]);

  const handleExport = () => {
    if (kind === 'santri') {
      exportToCsv(
        'laporan-santri-annawawi.csv',
        ['NIS', 'Nama Santri', 'Kelas', 'Asrama', 'Status', 'Wali'],
        rows.map((r) => [r.nis, r.full_name, r.class_name, r.dormitory, r.status, r.parent_name || '-'])
      );
    } else if (kind === 'tahfidz') {
      exportToCsv(
        'laporan-tahfidz-annawawi.csv',
        ['Tanggal', 'Santri', 'Kelas', 'Surah', 'Juz', 'Ayat', 'Jenis', 'Nilai', 'Kualitas', 'Pembimbing'],
        rows.map((r) => [r.date, r.student_name, r.class_name, r.surah, r.juz, `${r.start_ayah}-${r.end_ayah}`, r.type, r.score, r.quality, r.ustadz_name])
      );
    } else if (kind === 'absensi') {
      exportToCsv(
        'laporan-absensi-annawawi.csv',
        ['Tanggal', 'Sesi', 'NIS', 'Santri', 'Kelas', 'Status', 'Keterangan', 'Pencatat'],
        rows.map((r) => [r.date, r.session, r.student_nis, r.student_name, r.class_name, r.status, r.notes, r.ustadz_name])
      );
    } else if (kind === 'pelanggaran') {
      exportToCsv(
        'laporan-pelanggaran-annawawi.csv',
        ['Tanggal', 'Santri', 'Kelas', 'Kategori', 'Pelanggaran', 'Tingkat', 'Pembinaan', 'Pencatat'],
        rows.map((r) => [r.date, r.student_name, r.class_name, r.category_name, r.title, r.severity, r.coaching_action, r.ustadz_name])
      );
    } else if (kind === 'ekstra') {
      exportToCsv(
        'laporan-ekstrakurikuler-annawawi.csv',
        ['Ekstrakurikuler', 'Santri', 'Kelas', 'Jadwal', 'Status', 'Catatan'],
        rows.map((r) => [r.extracurricular_name, r.student_name, r.class_name, r.schedule, r.status, r.notes])
      );
    } else {
      exportToCsv(
        'laporan-dokumentasi-annawawi.csv',
        ['Tanggal', 'Judul', 'Kategori', 'Pengunggah', 'Visibilitas'],
        rows.map((r) => [r.activity_date, r.title, r.category, r.uploader_name, r.visibility])
      );
    }
    notify('Laporan CSV berhasil diunduh.', 'success');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-950">Laporan &amp; Rekapitulasi Pondok</h2>
          <p className="text-xs text-slate-500">
            Ekspor CSV atau cetak laporan resmi Pondok Pesantren Modern An-Nawawi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 no-print">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ReportKind)}
          className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white font-medium"
        >
          <option value="absensi">Laporan Absensi Santri</option>
          <option value="tahfidz">Laporan Setoran Tahfidz</option>
          <option value="santri">Laporan Data Santri</option>
          <option value="pelanggaran">Laporan Pelanggaran &amp; Pembinaan</option>
          <option value="ekstra">Laporan Ekstrakurikuler</option>
          <option value="foto">Laporan Dokumentasi Kegiatan</option>
        </select>

        {(kind === 'santri' || kind === 'tahfidz' || kind === 'absensi') && (
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
        )}

        {(kind === 'tahfidz' || kind === 'absensi') && (
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
          />
        )}
      </div>

      {/* Print Header */}
      <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-slate-950">
            Rekap Data: {kind.toUpperCase()} — Pondok Pesantren Modern An-Nawawi
          </h3>
          <p className="text-xs text-slate-500 tabular-nums">Total Baris Data: {rows.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 font-semibold text-slate-500">
              <th className="py-2.5 pr-3">No</th>
              <th className="py-2.5 pr-3">Ringkasan Utama</th>
              <th className="py-2.5 pr-3">Detail</th>
              <th className="py-2.5">Keterangan / Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-500">
                  Menyiapkan laporan...
                </td>
              </tr>
            ) : (
              rows.slice(0, 100).map((r, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-3 font-mono tabular-nums text-slate-500">{i + 1}</td>
                  <td className="py-2.5 pr-3 font-medium text-slate-900">
                    {r.full_name || r.student_name || r.title || r.extracurricular_name}
                  </td>
                  <td className="py-2.5 pr-3 text-slate-600">
                    {kind === 'santri' && `NIS ${r.nis} · Kelas ${r.class_name} · ${r.dormitory}`}
                    {kind === 'tahfidz' && `${r.date} · ${r.surah} (${r.start_ayah}-${r.end_ayah}) · Nilai ${r.score}`}
                    {kind === 'absensi' && `${r.date} · ${r.session} · Kelas ${r.class_name}`}
                    {kind === 'pelanggaran' && `${r.date} · ${r.category_name} · ${r.title}`}
                    {kind === 'ekstra' && `${r.extracurricular_name} · Kelas ${r.class_name} · ${r.schedule}`}
                    {kind === 'foto' && `${r.activity_date} · ${r.category} · ${r.uploader_name}`}
                  </td>
                  <td className="py-2.5 text-slate-700">
                    {r.status || r.quality || r.severity || r.visibility || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SettingsAndAuditModule: React.FC = () => {
  const { notify } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    Promise.all([apiFetch<Record<string, string>>('/api/settings'), apiFetch<AuditLog[]>('/api/audit-logs')])
      .then(([s, l]) => {
        setSettings(s);
        setLogs(l);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
      notify('Pengaturan pondok berhasil disimpan.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="font-display font-bold text-lg text-slate-950 mb-4">Pengaturan Informasi Pondok</h2>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lembaga</label>
            <input
              value={settings.pondok_name || ''}
              onChange={(e) => setSettings({ ...settings, pondok_name: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Ajaran Aktif</label>
            <input
              value={settings.academic_year || ''}
              onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Semester</label>
            <input
              value={settings.semester || ''}
              onChange={(e) => setSettings({ ...settings, semester: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Telepon Kantor</label>
            <input
              value={settings.phone || ''}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Pondok</label>
            <input
              value={settings.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold">
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h3 className="font-display font-bold text-base text-slate-950 mb-4">Riwayat Audit Perubahan Sistem</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 font-semibold text-slate-500">
                <th className="py-2.5 pr-4">Waktu</th>
                <th className="py-2.5 pr-4">Pengguna</th>
                <th className="py-2.5 pr-4">Aksi</th>
                <th className="py-2.5">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 pr-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">{l.created_at}</td>
                  <td className="py-2.5 pr-4 font-medium text-slate-900">
                    {l.actor_name || 'Sistem'} ({l.actor_role || '-'})
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-emerald-800">{l.action}</td>
                  <td className="py-2.5 text-slate-600">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const ProfileSettingsModule: React.FC = () => {
  const { user, refreshAuth, notify } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          phone,
          current_password: currentPassword || undefined,
          new_password: newPassword || undefined,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      await refreshAuth();
      notify('Profil akun berhasil diperbarui.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl">
      <h2 className="font-display font-bold text-lg text-slate-950 mb-1">Pengaturan Profil Akun</h2>
      <p className="text-xs text-slate-500 mb-6">
        Perbarui nama tampilan, nomor telepon, atau password akun pribadi Anda.
      </p>

      <form onSubmit={handleSave} className="space-y-4 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
            <input disabled value={user?.username || ''} className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Hak Akses</label>
            <input
              disabled
              value={user?.role === 'admin' ? 'Administrator' : user?.role === 'ustadz' ? 'Ustadz / Ustadzah' : 'Orang Tua / Wali (Baca-Saja)'}
              className="w-full px-3.5 py-2 border border-slate-200 rounded-xl bg-slate-100 text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Nomor HP / WhatsApp</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password Saat Ini (Jika ganti password)</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
