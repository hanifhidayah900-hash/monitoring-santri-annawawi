import React, { useState } from 'react';
import { Check, Clock, HeartPulse, AlertTriangle, ShieldAlert, Award, Image as ImageIcon } from 'lucide-react';

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { bg: string; icon: React.ReactNode }> = {
    Hadir: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <Check className="w-3.5 h-3.5 text-emerald-700" />,
    },
    Izin: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <Clock className="w-3.5 h-3.5 text-amber-700" />,
    },
    Sakit: {
      bg: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: <HeartPulse className="w-3.5 h-3.5 text-sky-700" />,
    },
    Alpa: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />,
    },
    Mumtaz: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <Award className="w-3.5 h-3.5 text-emerald-700" />,
    },
    'Jayyid Jiddan': {
      bg: 'bg-teal-50 text-teal-800 border-teal-200',
      icon: <Award className="w-3.5 h-3.5 text-teal-700" />,
    },
    Jayyid: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <Award className="w-3.5 h-3.5 text-amber-700" />,
    },
    'Perlu Bimbingan': {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />,
    },
    Ringan: {
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />,
    },
    Sedang: {
      bg: 'bg-orange-50 text-orange-800 border-orange-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-orange-700" />,
    },
    Berat: {
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />,
    },
    Aktif: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <Check className="w-3.5 h-3.5 text-emerald-700" />,
    },
    Diterbitkan: {
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      icon: <Check className="w-3.5 h-3.5 text-emerald-700" />,
    },
    Draf: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: <Clock className="w-3.5 h-3.5 text-slate-600" />,
    },
    Nonaktif: {
      bg: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
    },
  };

  const style = map[status] || {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: null,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-medium whitespace-nowrap ${style.bg}`}>
      {style.icon}
      <span>{status}</span>
    </span>
  );
};

export const SafeImage: React.FC<{
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}> = ({ src, alt, className = '', fallbackLabel }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-emerald-800/70 p-4 text-center ${className}`}
      >
        <ImageIcon className="w-8 h-8 mb-1.5 opacity-60" />
        {fallbackLabel && <span className="text-xs font-medium line-clamp-2">{fallbackLabel}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
