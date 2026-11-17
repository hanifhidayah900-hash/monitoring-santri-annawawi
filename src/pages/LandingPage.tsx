import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, Megaphone } from 'lucide-react';
import { SafeImage } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

const LOGO_URL = '/assets/aistudio/Logo_Transparan_An_Nawawi_Baru_Full_HD_dcbf8622.webp';
const HERO_IMG = '/src/assets/images/hero_pesantren_annawawi_1794894202062.jpg';

interface PublicSummary {
  stats: {
    studentCount: number;
    ustadzCount: number;
    classCount: number;
    ekstraCount: number;
  };
  classes: Array<{
    id: number;
    name: string;
    category: 'Banat' | 'Banin';
    description: string;
    student_count: number;
  }>;
  photos: Array<{
    id: number;
    title: string;
    description: string;
    image_url: string;
    category: string;
    activity_date: string;
    uploader_name: string;
  }>;
  announcements: Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    published_at: string;
    author_name: string;
  }>;
}

export default function LandingPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<PublicSummary | null>(null);

  useEffect(() => {
    fetch('/api/public/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch(() => {});
  }, []);

  const dashboardPath =
    user?.role === 'admin' ? '/admin' : user?.role === 'ustadz' ? '/ustadz' : user?.role === 'user' ? '/wali' : '/login';

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900 flex flex-col">
      {/* 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <Link to="/" className="flex items-center gap-3 whitespace-nowrap shrink-0">
            <img
              src={LOGO_URL}
              alt="Logo Pondok Pesantren Modern An-Nawawi"
              className="w-9 h-9 object-contain shrink-0"
            />
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-emerald-950">
              Pondok Pesantren Modern An-Nawawi
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#tentang" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              Tentang
            </a>
            <a href="#visi-misi" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              Visi &amp; Misi
            </a>
            <a href="#galeri" className="hover:text-emerald-800 transition-colors whitespace-nowrap shrink-0">
              Galeri
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <span>{user ? 'Ke Dashboard' : 'Masuk Sistem'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <div className="flex items-center gap-4 mb-6">
                <img
                  src={LOGO_URL}
                  alt="Lambang Resmi Pondok Pesantren Modern An-Nawawi"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
                />
                <div className="text-sm text-slate-600 leading-relaxed">
                  <p className="font-semibold text-emerald-900">Sistem Monitoring Kedisiplinan &amp; Aktivitas Santri</p>
                  <p>Pusat Informasi Pendidikan &amp; Pembinaan Orang Tua</p>
                </div>
              </div>

              <h1
                className="font-display font-bold text-slate-950 tracking-tight leading-[1.12] mb-5"
                style={{ fontSize: 'clamp(2.1rem, 3.8vw, 3.35rem)', textWrap: 'balance' }}
              >
                Membina Generasi Qur’ani yang Berilmu, Disiplin, dan Berjiwa Patriotik
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl">
                Pondok Pesantren Modern An-Nawawi memadukan pendidikan agama Islam berbasis Al-Qur’an dan As-Sunnah
                dengan kurikulum pendidikan modern, penguasaan bahasa, serta pembinaan karakter santri yang terpantau
                secara transparan bersama wali santri.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  to={dashboardPath}
                  className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>{user ? 'Buka Dashboard Monitoring' : 'Masuk ke Portal Monitoring'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#visi-misi"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-emerald-900 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>Pelajari Visi &amp; Misi</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 bg-emerald-950 relative">
                <SafeImage
                  src={HERO_IMG}
                  alt="Kompleks Pondok Pesantren Modern An-Nawawi"
                  className="w-full h-full object-cover"
                  fallbackLabel="Pondok Pesantren Modern An-Nawawi"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white">
                  <p className="text-xs font-medium text-emerald-200 mb-1">Lingkungan Pendidikan Terpadu</p>
                  <p className="font-display font-semibold text-base sm:text-lg">
                    Asrama Banin &amp; Banat · Masjid Utama · Gedung Belajar Produktif
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width KPI summary strip below Hero split */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
              <p className="text-xs text-slate-500 font-medium mb-1">Santri Aktif Terdaftar</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums">
                {summary?.stats.studentCount ?? 22}
              </p>
            </div>
            <div className="border-b lg:border-b-0 lg:border-r border-slate-100 pb-4 lg:pb-0 lg:pr-6">
              <p className="text-xs text-slate-500 font-medium mb-1">Rombongan Belajar</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums">
                {summary?.stats.classCount ?? 4} Kelas
              </p>
            </div>
            <div className="lg:border-r border-slate-100 pt-2 lg:pt-0 lg:pr-6">
              <p className="text-xs text-slate-500 font-medium mb-1">Ustadz &amp; Pengampu</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums">
                {summary?.stats.ustadzCount ?? 2} Pembina
              </p>
            </div>
            <div className="pt-2 lg:pt-0">
              <p className="text-xs text-slate-500 font-medium mb-1">Ekstrakurikuler Aktif</p>
              <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-900 tabular-nums">
                {summary?.stats.ekstraCount ?? 6} Bidang
              </p>
            </div>
          </div>
        </section>

        {/* Tentang An-Nawawi & Visi Misi */}
        <section id="tentang" className="bg-white border-y border-slate-200 py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
              <div className="lg:col-span-5">
                <p className="text-xs font-semibold text-emerald-800 tracking-wide mb-2">
                  Profil Lembaga Pendidikan
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight mb-4">
                  Tentang Pondok Pesantren Modern An-Nawawi
                </h2>
                <p className="text-slate-600 leading-relaxed mb-4">
                  Pondok Pesantren Modern An-Nawawi adalah lembaga pendidikan Islam berasrama yang berkomitmen mencetak
                  santri berakhlak mulia, hafidz Al-Qur’an, cakap berbahasa, dan adaptif terhadap perkembangan ilmu
                  pengetahuan serta teknologi.
                </p>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Melalui sistem <strong>Monitoring Santri</strong> berbasis web ini, pengasuh, dewan ustadz/ustadzah,
                  dan orang tua/wali santri dapat bersinergi memantau kehadiran per kelas, perkembangan setoran tahfidz,
                  kedisiplinan harian, kegiatan ekstrakurikuler, hingga dokumentasi aktivitas santri secara terstruktur.
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                  <img
                    src={LOGO_URL}
                    alt="Logo Pondok Pesantren Modern An-Nawawi"
                    className="w-12 h-12 object-contain shrink-0"
                  />
                  <div className="text-xs text-slate-500 leading-relaxed">
                    <p className="font-semibold text-slate-800">Pondok Pesantren Modern An-Nawawi</p>
                    <p>Pendidikan Terpadu · Tahfidz · Kedisiplinan · Karakter Patriotik</p>
                  </div>
                </div>
              </div>

              <div id="visi-misi" className="lg:col-span-7 space-y-6">
                {/* Visi */}
                <div className="bg-emerald-950 text-white rounded-2xl p-7 sm:p-8">
                  <p className="text-xs font-semibold text-amber-300 tracking-wide mb-2">
                    Visi Pondok Pesantren Modern An-Nawawi
                  </p>
                  <blockquote className="font-display text-xl sm:text-2xl font-bold leading-snug">
                    “Terwujudnya Generasi Islam Terbaik yang Soleh Berilmu dan Berjiwa Patriotik.”
                  </blockquote>
                </div>

                {/* Misi */}
                <div className="bg-[#F8FAF9] border border-slate-200 rounded-2xl p-7 sm:p-8">
                  <p className="text-xs font-semibold text-emerald-800 tracking-wide mb-4">
                    Misi Pondok Pesantren Modern An-Nawawi
                  </p>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-4">
                      <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        1
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        Menyelenggarakan Pendidikan yang Mengacu pada nilai nilai Islam, Perkembangan Dunia Pendidikan,
                        Ilmu Pengetahuan dan Teknologi
                      </p>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        2
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        Membina Santri Berakhlaq Al Quram dan As-sunah.
                      </p>
                    </li>
                    <li className="flex items-start gap-4">
                      <span className="w-7 h-7 rounded-lg bg-emerald-800 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                        3
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        Menciptakan Lingkungan Sekolah Sebagai Sarana Belajar yang Produktif.
                      </p>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Galeri & Pengumuman Publik */}
        <section id="galeri" className="bg-[#F8FAF9] py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Galeri Foto */}
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800 mb-1">Aktivitas Keseharian</p>
                    <h2 className="font-display text-2xl font-bold text-slate-950">Dokumentasi Kegiatan Santri</h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(summary?.photos || []).slice(0, 4).map((photo) => (
                    <div key={photo.id} className="border border-slate-200 rounded-xl overflow-hidden bg-[#F8FAF9]">
                      <div className="aspect-[4/3] overflow-hidden">
                        <SafeImage
                          src={photo.image_url}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                          fallbackLabel={photo.title}
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <span>{photo.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{photo.activity_date}</span>
                        </div>
                        <h3 className="font-display font-semibold text-sm text-slate-900 line-clamp-1">{photo.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{photo.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pengumuman Resmi */}
              <div className="lg:col-span-5">
                <div className="mb-6">
                  <p className="text-xs font-semibold text-emerald-800 mb-1">Informasi Pondok</p>
                  <h2 className="font-display text-2xl font-bold text-slate-950">Pengumuman Terbaru</h2>
                </div>
                <div className="space-y-4">
                  {(summary?.announcements || []).map((ann) => (
                    <article key={ann.id} className="border border-slate-200 rounded-xl p-5 bg-[#F8FAF9]">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{ann.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{ann.published_at}</span>
                      </div>
                      <h3 className="font-display font-semibold text-base text-slate-950 mb-2">{ann.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{ann.content}</p>
                    </article>
                  ))}
                  {(!summary?.announcements || summary.announcements.length === 0) && (
                    <div className="border border-slate-200 rounded-xl p-6 text-sm text-slate-500">
                      Belum ada pengumuman publik terbaru.
                    </div>
                  )}
                </div>

                <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Award className="w-5 h-5 text-emerald-800 shrink-0" />
                    <h3 className="font-display font-semibold text-sm text-emerald-950">
                      Portal Masuk Orang Tua &amp; Pengajar
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-900/80 leading-relaxed mb-4">
                    Gunakan akun resmi Admin, Ustadz/Ustadzah, atau Orang Tua/Wali yang telah terdaftar untuk mengakses
                    data monitoring santri secara penuh.
                  </p>
                  <Link
                    to={dashboardPath}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors"
                  >
                    <span>{user ? 'Buka Dashboard' : 'Masuk ke Akun Anda'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-emerald-950 text-emerald-100/80 border-t border-emerald-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={LOGO_URL}
              alt="Logo An-Nawawi"
              className="w-8 h-8 object-contain bg-white/95 rounded-lg p-0.5"
            />
            <div className="text-xs">
              <p className="font-semibold text-white">Pondok Pesantren Modern An-Nawawi</p>
              <p>Sistem Monitoring Kedisiplinan dan Aktivitas Santri</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs">
            <a href="#tentang" className="hover:text-white transition-colors">
              Tentang
            </a>
            <a href="#visi-misi" className="hover:text-white transition-colors">
              Visi &amp; Misi
            </a>
            <Link to="/login" className="hover:text-white transition-colors font-medium text-amber-300">
              Masuk Sistem
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
