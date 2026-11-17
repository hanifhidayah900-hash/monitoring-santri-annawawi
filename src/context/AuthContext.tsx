import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile, Student } from '../types';
import { apiFetch, getAuthToken, setAuthToken } from '../lib/api';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AuthContextValue {
  user: Profile | null;
  childrenList: Student[];
  selectedChildId: number | null;
  setSelectedChildId: (id: number) => void;
  loading: boolean;
  login: (identifier: string, password: string, expectedRole?: string) => Promise<Profile>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [childrenList, setChildrenList] = useState<Student[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const refreshAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setChildrenList([]);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: Profile; children: Student[] }>('/api/auth/me');
      setUser(data.user);
      setChildrenList(data.children || []);
      if (data.children?.length > 0) {
        setSelectedChildId((prev) => (prev && data.children.some((c) => c.id === prev) ? prev : data.children[0].id));
      } else {
        setSelectedChildId(null);
      }
    } catch {
      setAuthToken(null);
      setUser(null);
      setChildrenList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (identifier: string, password: string, expectedRole?: string) => {
    const data = await apiFetch<{ token: string; user: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, expectedRole }),
    });
    setAuthToken(data.token);
    await refreshAuth();
    return data.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setChildrenList([]);
    setSelectedChildId(null);
    notify('Anda telah keluar dari sistem.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        childrenList,
        selectedChildId,
        setSelectedChildId,
        loading,
        login,
        logout,
        refreshAuth,
        notify,
      }}
    >
      {children}
      {/* Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0 no-print">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm transition-all ${
              t.type === 'success'
                ? 'bg-white border-emerald-200 text-slate-900'
                : t.type === 'error'
                  ? 'bg-white border-rose-200 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            <span className="flex-1 leading-snug font-medium">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="text-slate-400 hover:text-slate-700 p-0.5"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
