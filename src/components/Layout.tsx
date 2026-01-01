import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield,
  ChevronRight
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/users', icon: Users, label: 'Whitelist Users' },
    { path: '/admins', icon: UserCog, label: 'Admin Management' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-slate-900">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-dark-card/80 backdrop-blur-xl border-b border-slate-800/50 shadow-xl">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-lg shadow-accent-primary/20">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Stockity</h1>
              <p className="text-xs text-slate-400">Admin Dashboard</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors active:scale-95"
          >
            {sidebarOpen ? <X size={24} className="text-slate-300" /> : <Menu size={24} className="text-slate-300" />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-dark-card/50 backdrop-blur-xl border-r border-slate-800/50 z-40 
        transform transition-all duration-300 ease-in-out shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl blur-lg opacity-50"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="text-white" size={24} />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Stockity</h1>
              <p className="text-xs text-slate-400 font-medium">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="p-4">
          <div className="p-4 bg-gradient-to-br from-dark-hover to-dark-hover/50 rounded-xl border border-slate-800/50 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-full flex items-center justify-center">
                <span className="text-accent-primary font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                <p className="text-xs text-slate-400">Administrator</p>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/50">
                <Shield size={14} className="text-yellow-500" />
                <span className="text-xs font-semibold text-yellow-500">Super Admin Access</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-2 flex-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Navigation
          </p>
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-gradient-to-r from-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/25' 
                      : 'text-slate-400 hover:bg-dark-hover hover:text-white'
                    }
                  `}
                >
                  <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                  <span className="font-semibold text-sm flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={16} className="text-white/70" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-red-500/10 group"
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen pt-20 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};