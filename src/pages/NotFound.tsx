import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, LayoutDashboard, Users, Shield, Settings, Search } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const links = [
    { path: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/users',    icon: Users,           label: 'Users' },
    { path: '/admins',   icon: Shield,          label: 'Admins' },
    { path: '/settings', icon: Settings,        label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      {/* dot-grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgb(148 163 184 / 0.18) 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="w-full max-w-lg text-center relative z-10 animate-fade-in">

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <Search size={28} className="text-slate-400" />
        </div>

        {/* 404 */}
        <p className="text-7xl font-black text-slate-900 tracking-tight leading-none mb-3">
          404
        </p>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto leading-relaxed">
          The page you are looking for doesn't exist or has been moved.
        </p>

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8 max-w-sm mx-auto sm:max-w-none">
          {links.map(({ path, icon: Icon, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-150 text-slate-600 hover:text-blue-700"
            >
              <Icon size={16} strokeWidth={2} />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-center">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={14} />
            Go back
          </button>
          <button onClick={() => navigate('/')} className="btn-primary">
            <Home size={14} />
            Home
          </button>
        </div>

        <p className="mt-8 text-[11px] text-slate-400">
          Error code: <span className="font-mono font-bold text-slate-500">404</span>
        </p>
      </div>
    </div>
  );
};