import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPortal from './pages/DashboardPortal';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ allowedRole: UserRole; children: React.ReactNode }> = ({
  allowedRole,
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex items-center justify-center text-sm text-slate-600">
        Memuat sesi Monitoring Santri An-Nawawi...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    const target = user.role === 'admin' ? '/admin' : user.role === 'ustadz' ? '/ustadz' : '/wali';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

const LoginRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    const target = user.role === 'admin' ? '/admin' : user.role === 'ustadz' ? '/ustadz' : '/wali';
    return <Navigate to={target} replace />;
  }
  return <LoginPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginRedirect />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRole="admin">
                <DashboardPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ustadz/*"
            element={
              <ProtectedRoute allowedRole="ustadz">
                <DashboardPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wali/*"
            element={
              <ProtectedRoute allowedRole="user">
                <DashboardPortal />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
