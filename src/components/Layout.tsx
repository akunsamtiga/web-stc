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
  Shield
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
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/admins', icon: UserCog, label: 'Admins' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">STC AutoTrade</h1>
              <p className="text-xs text-slate-500">Admin Panel</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-40 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">STC AutoTrade</h1>
              <p className="text-xs text-slate-500 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.email}</p>
                <p className="text-xs text-slate-500">Administrator</p>
              </div>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <Shield size={14} className="text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Super Admin</span>
              </div>
            )}
          </div>
        </div>

        <nav className="px-4 py-2">
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
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="lg:ml-72 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};