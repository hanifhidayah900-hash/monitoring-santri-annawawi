import React, { useEffect, useState, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { apiFetch } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, AttendanceStatus, PondokClass } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { Save, CheckCheck } from 'lucide-react';

interface ClassSheetRow {
  student_id: number;
  nis: string;
  full_name: string;
  gender: 'L' | 'P';
  dormitory: string;
  attendance_id: number | null;
  status: AttendanceStatus;
  notes: string;
  is_recorded: number;
  recorded_by: string | null;
}

const SESSIONS = ['KBM Pagi', 'Subuh & Tahfidz', 'KBM Siang', 'Kajian Malam'];
const STATUSES: AttendanceStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

export const AttendanceModule: React.FC = () => {
  const { user, selectedChildId, notify } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'ustadz';
  const isParent = user?.role === 'user';

  const [tab, setTab] = useState<'sheet' | 'history'>(canWrite ? 'sheet' : 'history');
  const [classes, setClasses] = useState<PondokClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [sheetDate, setSheetDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [sheetSession, setSheetSession] = useState<string>('KBM Pagi');
  const [sheetRows, setSheetRows] = useState<ClassSheetRow[]>([]);
  const [savingSheet, setSavingSheet] = useState(false);

  // History & Summary
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<PondokClass[]>('/api/classes')
      .then((res) => {
        setClasses(res);
        if (res.length > 0 && !selectedClassId) {
          setSelectedClassId(String(res[0].id));
        }
      })
      .catch(() => {});
  }, [selectedClassId]);

  const loadSheet = useCallback(async () => {
    if (!canWrite || !selectedClassId) return;
    setLoading(true);
    try {
      const res = await apiFetch<ClassSheetRow[]>(
        `/api/attendance/class-sheet?classId=${selectedClassId}&date=${sheetDate}&session=${encodeURIComponent(sheetSession)}`
      );
      setSheetRows(res);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [canWrite, selectedClassId, sheetDate, sheetSession, notify]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (isParent && selectedChildId) qs.set('studentId', String(selectedChildId));
      else {
        if (filterClass) qs.set('classId', filterClass);
        if (filterDate) qs.set('date', filterDate);
        if (filterStatus) qs.set('status', filterStatus);
      }
      const res = await apiFetch<AttendanceRecord[]>(`/api/attendance?${qs.toString()}`);
      setHistory(res);
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isParent, selectedChildId, filterClass, filterDate, filterStatus, notify]);

  useEffect(() => {
    if (tab === 'sheet' && canWrite) {
      loadSheet();
    } else {
      loadHistory();
    }
  }, [tab, canWrite, loadSheet, loadHistory]);

  const updateRowStatus = (studentId: number, status: AttendanceStatus) => {
    setSheetRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
  };

  const updateRowNotes = (studentId: number, notes: string) => {
    setSheetRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, notes } : r)));
  };

  const markAllPresent = () => {
    setSheetRows((prev) => prev.map((r) => ({ ...r, status: 'Hadir', notes: r.notes || 'Hadir tertib' })));
  };

  const handleSaveSheet = async () => {
    if (sheetRows.length === 0) return;
    setSavingSheet(true);
    try {
      const res = await apiFetch<{ message: string }>('/api/attendance/bulk', {
        method: 'POST',
        body: JSON.stringify({
          date: sheetDate,
          session: sheetSession,
          entries: sheetRows.map((r) => ({
            student_id: r.student_id,
            status: r.status,
            notes: r.notes,
          })),
        }),
      });
      notify(res.message, 'success');
      loadSheet();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSavingSheet(false);
    }
  };

  // Summary Stats for History
  const totalCount = history.length;
  const hadirCount = history.filter((h) => h.status === 'Hadir').length;
  const izinCount = history.filter((h) => h.status === 'Izin').length;
  const sakitCount = history.filter((h) => h.status === 'Sakit').length;
  const alpaCount = history.filter((h) => h.status === 'Alpa').length;
  const hadirRate = totalCount > 0 ? Math.round((hadirCount / totalCount) * 100) : 100;

  // Group history by date for chart
  const chartMap = new Map<string, { date: string; hadir: number; izin: number; sakit: number; alpa: number }>();
  history.forEach((h) => {
    const cur = chartMap.get(h.date) || { date: h.date, hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    if (h.status === 'Hadir') cur.hadir++;
    else if (h.status === 'Izin') cur.izin++;
    else if (h.status === 'Sakit') cur.sakit++;
    else if (h.status === 'Alpa') cur.alpa++;
    chartMap.set(h.date, cur);
  });
  const chartData = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  return (
    <div className="space-y-6">
      {/* Segmented Control for Admin/Ustadz */}
      {canWrite && (
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit">
          <button
            onClick={() => setTab('sheet')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'sheet' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Absensi Per Kelas (Input Massal)
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === 'history' ? 'bg-white text-emerald-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat &amp; Rekap Kehadiran
          </button>
        </div>
      )}

      {/* TAB 1: BATCH CLASS ATTENDANCE SHEET */}
      {canWrite && tab === 'sheet' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Kelas</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name} ({c.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Absensi</label>
                <input
                  type="date"
                  value={sheetDate}
                  onChange={(e) => setSheetDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Sesi / Kegiatan</label>
                <select
                  value={sheetSession}
                  onChange={(e) => setSheetSession(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                >
                  {SESSIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={markAllPresent}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                <CheckCheck className="w-4 h-4 text-emerald-700" />
                <span>Tandai Semua Hadir</span>
              </button>
              <button
                type="button"
                disabled={savingSheet || sheetRows.length === 0}
                onClick={handleSaveSheet}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-xs font-semibold whitespace-nowrap"
              >
                <Save className="w-4 h-4" />
                <span>{savingSheet ? 'Menyimpan...' : 'Simpan Absensi Kelas'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="py-3 pr-3">No</th>
                  <th className="py-3 pr-4">NIS</th>
                  <th className="py-3 pr-4">Nama Santri</th>
                  <th className="py-3 pr-4">Status Kehadiran</th>
                  <th className="py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Memuat daftar santri kelas...
                    </td>
                  </tr>
                ) : sheetRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Belum ada santri aktif di kelas ini.
                    </td>
                  </tr>
                ) : (
                  sheetRows.map((row, index) => (
                    <tr key={row.student_id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-3 font-mono text-xs text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">{row.nis}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{row.full_name}</div>
                        <div className="text-xs text-slate-500">
                          {row.dormitory} · {row.is_recorded ? `Tercatat (${row.recorded_by})` : 'Belum disimpan hari ini'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                          {STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateRowStatus(row.student_id, st)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                                row.status === st
                                  ? st === 'Hadir'
                                    ? 'bg-emerald-800 text-white'
                                    : st === 'Izin'
                                      ? 'bg-amber-600 text-white'
                                      : st === 'Sakit'
                                        ? 'bg-sky-600 text-white'
                                        : 'bg-rose-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRowNotes(row.student_id, e.target.value)}
                          placeholder="Tambahkan catatan kehadiran..."
                          className="w-full min-w-[200px] px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-700"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY, STATS & CHART (AND SOLE VIEW FOR PARENTS) */}
      {(tab === 'history' || isParent) && (
        <div className="space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Persentase Hadir</p>
              <p className="font-display text-2xl font-bold text-emerald-900 tabular-nums">{hadirRate}%</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Hadir</p>
              <p className="font-display text-2xl font-bold text-emerald-700 tabular-nums">{hadirCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Izin</p>
              <p className="font-display text-2xl font-bold text-amber-600 tabular-nums">{izinCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Sakit</p>
              <p className="font-display text-2xl font-bold text-sky-600 tabular-nums">{sakitCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <p className="text-xs text-slate-500 mb-1">Alpa</p>
              <p className="font-display text-2xl font-bold text-rose-600 tabular-nums">{alpaCount}</p>
            </div>
          </div>

          {/* Attendance Chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="font-display font-bold text-base text-slate-900 mb-4">
              {isParent ? 'Grafik Kehadiran Putra/Putri Anda' : 'Grafik Rekap Kehadiran Santri'}
            </h3>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
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

          {/* History Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <h3 className="font-display font-bold text-lg text-slate-950">Riwayat Absensi</h3>
              {canWrite && (
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                  />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Semua Status</option>
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 pr-4">Tanggal</th>
                    <th className="py-3 pr-4">Sesi</th>
                    <th className="py-3 pr-4">Santri</th>
                    <th className="py-3 pr-4">Kelas</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Keterangan</th>
                    <th className="py-3">Pencatat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Memuat riwayat absensi...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Belum ada data absensi untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">{h.date}</td>
                        <td className="py-3 pr-4 text-xs font-medium text-slate-800 whitespace-nowrap">{h.session}</td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-900">{h.student_name}</div>
                          <div className="text-xs font-mono text-slate-500 tabular-nums">{h.student_nis}</div>
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-700 whitespace-nowrap">
                          {h.class_name} ({h.class_category})
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={h.status} />
                        </td>
                        <td className="py-3 pr-4 text-xs text-slate-600">{h.notes || '-'}</td>
                        <td className="py-3 text-xs text-slate-500">{h.ustadz_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
