
import React from 'react';
import { SaleStatus, ServiceType } from '../types';
import { translations } from '../translations';
import { AlertTriangle } from 'lucide-react';

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md ${className}`}>
    {children}
  </div>
);

// --- Badge ---
export const StatusBadge: React.FC<{ status: SaleStatus; lang?: 'en' | 'ar' }> = ({ status, lang = 'en' }) => {
  const t = translations[lang];
  const colors = {
    [SaleStatus.Lead]: 'bg-blue-50 text-blue-700 border border-blue-100',
    [SaleStatus.Contacted]: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
    [SaleStatus.InProgress]: 'bg-purple-50 text-purple-700 border border-purple-100',
    [SaleStatus.Delivered]: 'bg-green-50 text-green-700 border border-green-100',
    [SaleStatus.ClosedLost]: 'bg-slate-100 text-slate-500 border border-slate-200',
    [SaleStatus.Scammer]: 'bg-red-950 text-red-200 border border-red-900',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {t.statuses[status]}
    </span>
  );
};

export const ServiceBadge: React.FC<{ type: ServiceType; lang?: 'en' | 'ar' }> = ({ type, lang = 'en' }) => {
  const t = translations[lang];
  const colors = {
    [ServiceType.VideoAds]: 'from-indigo-50 to-blue-50 text-indigo-700 border-indigo-100',
    [ServiceType.LandingPage]: 'from-pink-50 to-rose-50 text-pink-700 border-pink-100',
    [ServiceType.VoiceOver]: 'from-orange-50 to-amber-50 text-orange-700 border-orange-100',
    [ServiceType.LogoCreation]: 'from-violet-50 to-purple-50 text-violet-700 border-violet-100',
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold border bg-gradient-to-r ${colors[type]}`}>
      {t.services[type]}
    </span>
  );
};

export const ModificationBadge: React.FC<{ lang?: 'en' | 'ar' }> = ({ lang = 'en' }) => {
  const t = translations[lang];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
       <AlertTriangle size={10} />
       {t.clientModification}
    </span>
  );
};

export const PaymentStatusBadge: React.FC<{ paidCount: number; totalCount: number; lang?: 'en' | 'ar' }> = ({ paidCount, totalCount, lang = 'en' }) => {
  const t = translations[lang];
  
  if (totalCount === 0) {
     return <span className="text-slate-400 text-[10px] font-bold uppercase">-</span>;
  }

  let statusText = '';
  let colorClass = '';

  if (paidCount === totalCount) {
    statusText = t.fullyPaid;
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
  } else if (paidCount === 0) {
    statusText = t.unpaid;
    colorClass = 'bg-red-50 text-red-700 border-red-100';
  } else {
    statusText = t.partiallyPaid;
    colorClass = 'bg-amber-50 text-amber-700 border-amber-100';
  }

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
      {statusText}
    </span>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const variants = {
    primary: "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-5 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, className = '', ...props }) => (
  <div className="w-full text-start">
    {label && <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>}
    <input id={id} className={`block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2.5 outline-none transition-all ${className}`} {...props} />
  </div>
);

// --- Select ---
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, id, options, className = '', ...props }) => (
  <div className="w-full text-start">
    {label && <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>}
    <select id={id} className={`block w-full rounded-xl border-slate-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2.5 outline-none transition-all ${className}`} {...props}>
      {options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
    </select>
  </div>
);