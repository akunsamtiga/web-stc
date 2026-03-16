import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Users, UserCog, Settings,
  LogOut, Menu, X, Shield, ChevronRight, Crown,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [open, setOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const nav = [
    { path: '/',         icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/users',    icon: Users,            label: 'Users' },
    { path: '/admins',   icon: UserCog,          label: 'Admins' },
    { path: '/settings', icon: Settings,         label: 'Settings' },
  ];

  const initial = user?.email?.charAt(0).toUpperCase() ?? 'A';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Mobile topbar — visible only below lg */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 h-14">
        <div className="flex items-center justify-between px-4 h-full">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="text-white" size={13} strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">STC AutoTrade</span>
          </div>
          <button
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-60 bg-white border-r border-slate-200 z-40
        flex flex-col transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Brand */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20">
            <Shield className="text-white" size={13} strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <p className="text-sm font-bold text-slate-900 tracking-tight">STC AutoTrade</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* User chip */}
        <div className="px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-white">{initial}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate leading-none mb-0.5">
                {user?.email}
              </p>
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600">
                  <Crown size={9} /> Super Admin
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Administrator</span>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pb-2 overflow-y-auto">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] px-3 mb-1.5 mt-1">
            Menu
          </p>
          <div className="space-y-0.5">
            {nav.map(({ path, icon: Icon, label }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setOpen(false)}
                  className={`
                    flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm
                    transition-all duration-150 min-h-[40px]
                    ${active
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    }
                  `}
                >
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1 leading-none">{label}</span>
                  {active && <ChevronRight size={12} className="opacity-50" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium
                       text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg
                       transition-all duration-150 min-h-[40px]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Overlay — closes sidebar on tap outside, lg+ never shown */}
      {open && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <main className="lg:ml-60 min-h-screen pt-14 lg:pt-0">
        <div className="w-full max-w-6xl mx-auto p-3 sm:p-5 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};