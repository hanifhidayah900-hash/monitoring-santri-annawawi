import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../StatusBadge';
import { Users, BookOpen, CalendarCheck, ShieldAlert, Award, Camera, Megaphone, UserCheck } from 'lucide-react';

export const DashboardOverview: React.FC<{ onNavigate?: (tab: string) => void }> = ({ onNavigate }) => {
  const { user, childrenList, selectedChildId, setSelectedChildId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = user?.role === 'user' && selectedChildId ? `?studentId=${selectedChildId}` : '';
    apiFetch(`/api/dashboard/summary${qs}`)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.role, selectedChildId]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ==================== ORANG TUA / WALI DASHBOARD (READ-ONLY) ====================
  if (user?.role === 'user') {
    const child = data.selectedStudent;
    return (
      <div className="space-y-6">
        {/* Multi-child selector if > 1 */}
        {childrenList.length > 1 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">Pilih Putra/Putri yang Dipantau:</span>
            <div className="flex flex-wrap gap-2">
              {childrenList.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    selectedChildId === c.id
                      ? 'bg-emerald-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.full_name} · Kelas {c.class_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Profil Anak Card */}
        {child ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-900 text-white flex items-center justify-center font-display text-2xl font-bold shrink-0">
                {child.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="font-display text-xl font-bold text-slate-950">{child.full_name}</h2>
                  <StatusBadge status={child.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="font-mono tabular-nums">NIS {child.nis}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Kelas {child.class_name} ({child.class_category})
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{child.dormitory}</span>
                  {child.homeroom_ustadz_name && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Wali Kelas: {child.homeroom_ustadz_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500 border-t md:border-t-0 pt-3 md:pt-0">
              Mode Akses: <strong className="text-emerald-800">Baca-Saja (Orang Tua/Wali)</strong>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            Belum ada data santri yang terhubung dengan akun wali Anda. Hubungi admin pondok.
          </div>
        )}

        {/* Parent KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-medium text-slate-500 mb-2">Total Setoran Tahfidz</p>
            <p className="font-display text-3xl font-bold text-emerald-900 tabular-nums">{data.stats.tahfidzCount}</p>
            <p className="text-xs text-slate-500 mt-1">Catatan setoran tercatat</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-medium text-slate-500 mb-2">Persentase Kehadiran</p>
            <p className="font-display text-3xl font-bold text-emerald-900 tabular-nums">{data.stats.attendanceRate}%</p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              {data.stats.hadirCount} Hadir · {data.stats.absentCount} Tidak Hadir
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-medium text-slate-500 mb-2">Catatan Kedisiplinan</p>
            <p className="font-display text-3xl font-bold text-amber-700 tabular-nums">{data.stats.violationCount}</p>
            <p className="text-xs text-slate-500 mt-1">Laporan yang dibagikan</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs font-medium text-slate-500 mb-2">Ekstrakurikuler Diikuti</p>
            <p className="font-display text-3xl font-bold text-emerald-900 tabular-nums">{data.stats.ekstraCount}</p>
            <p className="text-xs text-slate-500 mt-1">Kegiatan aktif</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-display font-semibold text-base text-slate-900 mb-4">Grafik Kehadiran Anak</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="hadir" name="Hadir" fill="#047857" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="izin" name="Izin" fill="#D97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sakit" name="Sakit" fill="#0284C7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="alpa" name="Alpa" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-display font-semibold text-base text-slate-900 mb-4">
              Grafik Nilai Setoran Tahfidz
            </h3>
            <div className="h-64">
              {data.tahfidzTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.tahfidzTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="surah" tick={{ fontSize: 11 }} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="score"
                      name="Nilai Hafalan"
                      stroke="#047857"
                      fill="#D1FAE5"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Belum ada data setoran tahfidz untuk anak ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities Timeline */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-base text-slate-900 mb-4">
            Timeline Aktivitas Anak Terbaru
          </h3>
          <div className="divide-y divide-slate-100">
            {data.recentActivities.map((act: any, idx: number) => (
              <div key={idx} className="py-3.5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{act.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{act.detail}</p>
                  <p className="text-xs text-slate-400 mt-1">Pembimbing: {act.actor}</p>
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">{act.date}</span>
              </div>
            ))}
            {data.recentActivities.length === 0 && (
              <p className="py-4 text-sm text-slate-500">Belum ada aktivitas terbaru.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== ADMIN & USTADZ DASHBOARD ====================
  const isAdmin = user?.role === 'admin';
  const statCards = isAdmin
    ? [
        { label: 'Total Santri Aktif', value: data.stats.totalStudents, icon: <Users className="w-5 h-5 text-emerald-700" />, tab: 'santri' },
        { label: 'Ustadz / Ustadzah', value: data.stats.totalUstadz, icon: <UserCheck className="w-5 h-5 text-emerald-700" />, tab: 'ustadz' },
        { label: 'Orang Tua / Wali', value: data.stats.totalParents, icon: <Users className="w-5 h-5 text-amber-700" />, tab: 'wali' },
        { label: 'Hadir Hari Ini', value: data.stats.hadirHariIni, icon: <CalendarCheck className="w-5 h-5 text-emerald-700" />, tab: 'absensi' },
        { label: 'Tidak Hadir Hari Ini', value: data.stats.tidakHadirHariIni, icon: <ShieldAlert className="w-5 h-5 text-rose-600" />, tab: 'absensi' },
        { label: 'Total Pelanggaran', value: data.stats.totalViolations, icon: <ShieldAlert className="w-5 h-5 text-amber-700" />, tab: 'pelanggaran' },
        { label: 'Total Setoran Tahfidz', value: data.stats.totalTahfidz, icon: <BookOpen className="w-5 h-5 text-emerald-700" />, tab: 'tahfidz' },
        { label: 'Ekstrakurikuler Aktif', value: data.stats.totalEkstra, icon: <Award className="w-5 h-5 text-emerald-700" />, tab: 'ekstra' },
      ]
    : [
        { label: 'Santri Tanggung Jawab', value: data.stats.totalStudents, icon: <Users className="w-5 h-5 text-emerald-700" />, tab: 'santri' },
        { label: 'Hadir Hari Ini', value: data.stats.hadirHariIni, icon: <CalendarCheck className="w-5 h-5 text-emerald-700" />, tab: 'absensi' },
        { label: 'Tidak Hadir Hari Ini', value: data.stats.tidakHadirHariIni, icon: <ShieldAlert className="w-5 h-5 text-rose-600" />, tab: 'absensi' },
        { label: 'Setoran Tahfidz Hari Ini', value: data.stats.todayTahfidz, icon: <BookOpen className="w-5 h-5 text-emerald-700" />, tab: 'tahfidz' },
        { label: 'Total Pelanggaran Tercatat', value: data.stats.totalViolations, icon: <ShieldAlert className="w-5 h-5 text-amber-700" />, tab: 'pelanggaran' },
        { label: 'Dokumentasi Foto', value: data.stats.totalPhotos, icon: <Camera className="w-5 h-5 text-emerald-700" />, tab: 'galeri' },
      ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
        {statCards.map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onNavigate?.(card.tab)}
            className="text-left bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium text-slate-500">{card.label}</span>
              {card.icon}
            </div>
            <p className="font-display text-3xl font-bold text-slate-950 tabular-nums">{card.value}</p>
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-base text-slate-900 mb-4">
            Grafik Kehadiran Santri Harian
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.attendanceByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="hadir" name="Hadir" fill="#047857" radius={[4, 4, 0, 0]} />
                <Bar dataKey="izin" name="Izin" fill="#D97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sakit" name="Sakit" fill="#0284C7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="alpa" name="Alpa" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-base text-slate-900 mb-4">
            Perkembangan Setoran Tahfidz per Kelas
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.tahfidzByClass}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="class_name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total_setoran" name="Jumlah Setoran" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_score" name="Rata-rata Nilai" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-base text-slate-900 mb-4">
            Statistik Pelanggaran per Kategori
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.violationsByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" name="Jumlah Catatan" fill="#B45309" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="font-display font-semibold text-base text-slate-900 mb-4">
            Partisipasi Kegiatan Ekstrakurikuler
          </h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ekstraStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="members" name="Santri Terdaftar" fill="#065F46" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Aktivitas Terbaru */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-base text-slate-900">Aktivitas Terbaru Pondok</h3>
          <span className="text-xs text-slate-500">10 aktivitas terakhir</span>
        </div>
        <div className="divide-y divide-slate-100">
          {data.recentActivities.map((act: any, idx: number) => (
            <div key={idx} className="py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-emerald-700 shrink-0">
                  {act.kind === 'tahfidz' && <BookOpen className="w-4 h-4" />}
                  {act.kind === 'pelanggaran' && <ShieldAlert className="w-4 h-4 text-amber-600" />}
                  {act.kind === 'foto' && <Camera className="w-4 h-4 text-sky-600" />}
                  {act.kind === 'pengumuman' && <Megaphone className="w-4 h-4 text-emerald-700" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{act.title}</p>
                  <p className="text-xs text-slate-600">
                    {act.detail} · Oleh {act.actor}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-500 tabular-nums shrink-0">{act.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
