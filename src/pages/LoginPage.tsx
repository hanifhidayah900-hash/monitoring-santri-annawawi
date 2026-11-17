import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, LogIn, Shield, BookOpenCheck, Users, HelpCircle, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const LOGO_URL = '/assets/aistudio/Logo_Transparan_An_Nawawi_Baru_Full_HD_dcbf8622.webp';

const ROLE_OPTIONS: Array<{
  role: UserRole;
  label: string;
  desc: string;
  icon: React.ReactNode;
  demoUser: string;
  demoPass: string;
}> = [
  {
    role: 'admin',
    label: 'Admin',
    desc: 'Pengelola utama data pondok, akun, kelas & laporan',
    icon: <Shield className="w-4 h-4" />,
    demoUser: 'admin',
    demoPass: 'admin123',
  },
  {
    role: 'ustadz',
    label: 'Ustadz / Ustadzah',
    desc: 'Input absensi kelas, tahfidz, pembinaan & foto',
    icon: <BookOpenCheck className="w-4 h-4" />,
    demoUser: 'hanif hidayatullah',
    demoPass: 'ustadz123',
  },
  {
    role: 'user',
    label: 'Orang Tua / Wali',
    desc: 'Pantau perkembangan anak (Akses Baca-Saja)',
    icon: <Users className="w-4 h-4" />,
    demoUser: 'ahmad',
    demoPass: 'wali123',
  },
];

export default function LoginPage() {
  const { login, notify } = useAuth();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const loggedUser = await login(identifier, password, selectedRole);
      notify(`Selamat datang, ${loggedUser.full_name}`, 'success');
      if (loggedUser.role === 'admin') navigate('/admin');
      else if (loggedUser.role === 'ustadz') navigate('/ustadz');
      else navigate('/wali');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal masuk ke sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  const applyDemoAccount = (role: UserRole, user: string, pass: string) => {
    setSelectedRole(role);
    setIdentifier(user);
    setPassword(pass);
    setErrorMsg('');
  };

  const activeMeta = ROLE_OPTIONS.find((r) => r.role === selectedRole)!;

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Profil Pondok</span>
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Institutional Panel */}
          <div className="lg:col-span-5 bg-emerald-950 text-white p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <img
                  src={LOGO_URL}
                  alt="Logo Pondok Pesantren Modern An-Nawawi"
                  className="w-14 h-14 object-contain bg-white rounded-xl p-1.5 shrink-0"
                />
                <div>
                  <p className="font-display font-bold text-base leading-tight">Monitoring Santri</p>
                  <p className="text-xs text-emerald-200">Pondok Pesantren Modern An-Nawawi</p>
                </div>
              </div>

              <h1 className="font-display text-2xl font-bold tracking-tight mb-3">
                Portal Masuk Terpadu
              </h1>
              <p className="text-sm text-emerald-100/80 leading-relaxed mb-8">
                Pilih jenis akun Anda untuk mengakses dashboard pengelolaan, pencatatan aktivitas harian, atau pemantauan
                perkembangan putra-putri Anda.
              </p>
            </div>

            {/* Quick Demo Credentials Box */}
            <div className="border-t border-emerald-800/80 pt-6">
              <p className="text-xs font-semibold text-amber-300 mb-3">
                Akun Siap Pakai (Klik untuk isi otomatis):
              </p>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => applyDemoAccount(opt.role, opt.demoUser, opt.demoPass)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${
                      selectedRole === opt.role
                        ? 'bg-emerald-900 border-emerald-600 text-white'
                        : 'bg-emerald-950/60 border-emerald-800/70 text-emerald-100 hover:bg-emerald-900/70'
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{opt.label}</span>
                      <span className="text-emerald-200/80 font-mono">
                        {opt.demoUser} / {opt.demoPass}
                      </span>
                    </div>
                    <span className="text-amber-300 font-medium shrink-0">Isi</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 p-8 sm:p-10">
            <div className="mb-6">
              <p className="text-xs font-semibold text-emerald-800 mb-2">1. Pilih Jenis Akun</p>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.role}
                    type="button"
                    onClick={() => {
                      setSelectedRole(opt.role);
                      setErrorMsg('');
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedRole === opt.role
                        ? 'bg-white text-emerald-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.icon}
                    <span className="truncate">{opt.role === 'user' ? 'Wali Santri' : opt.role === 'ustadz' ? 'Ustadz' : 'Admin'}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2.5">{activeMeta.desc}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-800 font-medium">
                  {errorMsg}
                </div>
              )}

              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username atau Email
                </label>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={`Contoh: ${activeMeta.demoUser}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-medium text-emerald-800 hover:underline"
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password Anda"
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                    aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{submitting ? 'Memverifikasi Akun...' : `Masuk sebagai ${activeMeta.label}`}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Lupa Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-800" />
                <h2 className="font-display font-bold text-lg text-slate-900">Bantuan Reset Password</h2>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Demi menjaga keamanan data santri Pondok Pesantren Modern An-Nawawi, pengaturan ulang password untuk akun{' '}
              <strong>Ustadz/Ustadzah</strong> dan <strong>Orang Tua/Wali</strong> dikelola oleh Administrator Pondok.
            </p>
            <div className="bg-[#F8FAF9] border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5 mb-5">
              <p>
                <strong>Langkah Pengajuan:</strong> Hubungi tata usaha / admin pondok dengan menyebutkan nama lengkap dan
                username akun Anda.
              </p>
              <p>
                <strong>Kontak Admin:</strong> admin@annawawi.sch.id · (0275) 321-456
              </p>
            </div>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-900"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
