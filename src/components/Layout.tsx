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
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Stockity</h1>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors active:scale-95"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? 
              <X size={24} className="text-slate-700" /> : 
              <Menu size={24} className="text-slate-700" />
            }
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-40 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              <Shield className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Stockity</h1>
              <p className="text-xs text-slate-500 font-medium">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* User Info */}
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

        {/* Navigation */}
        <nav className="px-4 py-2 flex-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Menu
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

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-200 safe-bottom">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 font-medium"
          >
            <LogOut size={20} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-72 min-h-screen">
        <div className="pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 pb-20 safe-bottom">
          <Outlet />
        </div>
      </main>
    </div>
  );
};