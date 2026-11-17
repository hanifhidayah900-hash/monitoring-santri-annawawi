import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  CalendarCheck,
  ShieldAlert,
  ClipboardList,
  Camera,
  Megaphone,
  Award,
  FileBarChart,
  Settings,
  UserCircle,
  LogOut,
  Menu,
  X,
  Home,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DashboardOverview } from '../components/modules/DashboardOverview';
import { StudentsAndClassesModule } from '../components/modules/StudentsAndClassesModule';
import { UsersManagementModule } from '../components/modules/UsersManagementModule';
import { TahfidzModule } from '../components/modules/TahfidzModule';
import { AttendanceModule } from '../components/modules/AttendanceModule';
import { ViolationsAndCoachingModule } from '../components/modules/ViolationsAndCoachingModule';
import { GalleryModule } from '../components/modules/GalleryModule';
import { AnnouncementsModule } from '../components/modules/AnnouncementsModule';
import { ExtracurricularsModule } from '../components/modules/ExtracurricularsModule';
import { ReportsModule, SettingsAndAuditModule, ProfileSettingsModule } from '../components/modules/ReportsAndSettingsModule';

const LOGO_URL = '/assets/aistudio/Logo_Transparan_An_Nawawi_Baru_Full_HD_dcbf8622.webp';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export default function DashboardPortal() {
  const { user, childrenList, selectedChildId, setSelectedChildId, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'santri', label: 'Data Santri & Kelas', icon: <Users className="w-4 h-4" /> },
    { id: 'ustadz', label: 'Data Ustadz/Ustadzah', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'wali', label: 'Data Orang Tua/Wali', icon: <Users className="w-4 h-4" /> },
    { id: 'tahfidz', label: 'Data Tahfidz', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'absensi', label: 'Data Absensi', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'pelanggaran', label: 'Data Pelanggaran', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'galeri', label: 'Dokumentasi Kegiatan', icon: <Camera className="w-4 h-4" /> },
    { id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'ekstra', label: 'Ekstrakurikuler', icon: <Award className="w-4 h-4" /> },
    { id: 'laporan', label: 'Laporan', icon: <FileBarChart className="w-4 h-4" /> },
    { id: 'pengaturan', label: 'Pengaturan', icon: <Settings className="w-4 h-4" /> },
  ];

  const ustadzNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'santri', label: 'Data Santri', icon: <Users className="w-4 h-4" /> },
    { id: 'tahfidz', label: 'Input Tahfidz', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'absensi', label: 'Input Absensi', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'pelanggaran', label: 'Input Pelanggaran', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'pembinaan', label: 'Catatan Pembinaan', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'galeri', label: 'Dokumentasi Kegiatan', icon: <Camera className="w-4 h-4" /> },
    ...(user.permissions?.canManageAnnouncements
      ? [{ id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-4 h-4" /> }]
      : []),
    ...(user.permissions?.canManageExtracurriculars
      ? [{ id: 'ekstra', label: 'Ekstrakurikuler', icon: <Award className="w-4 h-4" /> }]
      : []),
    { id: 'profil', label: 'Profil Saya', icon: <UserCircle className="w-4 h-4" /> },
  ];

  const parentNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'santri', label: 'Profil Anak', icon: <Users className="w-4 h-4" /> },
    { id: 'tahfidz', label: 'Data Tahfidz', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'absensi', label: 'Data Absensi', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'pelanggaran', label: 'Data Pelanggaran', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'galeri', label: 'Dokumentasi Kegiatan', icon: <Camera className="w-4 h-4" /> },
    { id: 'pengumuman', label: 'Pengumuman', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'ekstra', label: 'Ekstrakurikuler', icon: <Award className="w-4 h-4" /> },
    { id: 'profil', label: 'Profil Akun', icon: <UserCircle className="w-4 h-4" /> },
  ];

  const navItems = user.role === 'admin' ? adminNav : user.role === 'ustadz' ? ustadzNav : parentNav;
  const activeItem = navItems.find((n) => n.id === activeTab) || navItems[0];

  const roleBadgeLabel =
    user.role === 'admin' ? 'Administrator' : user.role === 'ustadz' ? 'Ustadz / Ustadzah' : 'Orang Tua / Wali';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview onNavigate={setActiveTab} />;
      case 'santri':
        return <StudentsAndClassesModule />;
      case 'ustadz':
        return user.role === 'admin' ? <UsersManagementModule targetRole="ustadz" /> : <DashboardOverview />;
      case 'wali':
        return user.role === 'admin' ? <UsersManagementModule targetRole="user" /> : <DashboardOverview />;
      case 'tahfidz':
        return <TahfidzModule />;
      case 'absensi':
        return <AttendanceModule />;
      case 'pelanggaran':
        return <ViolationsAndCoachingModule initialTab="violations" />;
      case 'pembinaan':
        return <ViolationsAndCoachingModule initialTab="coaching" />;
      case 'galeri':
        return <GalleryModule />;
      case 'pengumuman':
        return <AnnouncementsModule />;
      case 'ekstra':
        return <ExtracurricularsModule />;
      case 'laporan':
        return user.role === 'admin' ? <ReportsModule /> : <DashboardOverview />;
      case 'pengaturan':
        return user.role === 'admin' ? <SettingsAndAuditModule /> : <ProfileSettingsModule />;
      case 'profil':
        return <ProfileSettingsModule />;
      default:
        return <DashboardOverview onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden no-print"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[264px] bg-emerald-950 text-emerald-100 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-5 border-b border-emerald-900 flex items-center justify-between gap-2 shrink-0">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <img
                src={LOGO_URL}
                alt="Logo An-Nawawi"
                className="w-9 h-9 object-contain bg-white rounded-lg p-1 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-display font-bold text-sm text-white truncate">Monitoring Santri</p>
                <p className="text-[11px] text-emerald-300 truncate">Ponpes Modern An-Nawawi</p>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-emerald-200 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                    active
                      ? 'bg-emerald-800 text-white font-semibold'
                      : 'text-emerald-100/80 hover:bg-emerald-900/70 hover:text-white'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Footer Profile & Logout */}
          <div className="p-3 border-t border-emerald-900 space-y-1.5 shrink-0">
            <Link
              to="/"
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-emerald-200 hover:bg-emerald-900/70 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4 shrink-0" />
              <span>Halaman Profil Pondok</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-rose-200 hover:bg-rose-950/60 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Keluar Sistem</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>{roleBadgeLabel}</span>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-emerald-800 truncate">{activeItem.label}</span>
              </div>
              <h1 className="font-display font-bold text-base sm:text-lg text-slate-950 truncate">
                {activeItem.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user.role === 'user' && childrenList.length > 1 && (
              <select
                value={selectedChildId || ''}
                onChange={(e) => setSelectedChildId(Number(e.target.value))}
                className="hidden sm:block px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-[#F8FAF9] text-slate-800"
              >
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    Anak: {c.full_name} ({c.class_name})
                  </option>
                ))}
              </select>
            )}

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</p>
              <p className="text-[11px] text-slate-500">{roleBadgeLabel}</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-800 text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
              {user.full_name.charAt(0)}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
