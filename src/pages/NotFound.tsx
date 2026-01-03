import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search, AlertCircle, Shield, Users, Settings, LayoutDashboard } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [floatingItems, setFloatingItems] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Generate random floating items
    const items = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 2,
    }));
    setFloatingItems(items);
  }, []);

  const quickLinks = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'blue' },
    { path: '/users', icon: Users, label: 'Users', color: 'green' },
    { path: '/admins', icon: Shield, label: 'Admins', color: 'yellow' },
    { path: '/settings', icon: Settings, label: 'Settings', color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingItems.map((item) => (
          <div
            key={item.id}
            className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-400/10 to-indigo-400/10 backdrop-blur-sm animate-float"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              animationDelay: `${item.delay}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <div className="max-w-4xl w-full text-center relative z-10">
        {/* Main Content */}
        <div className="animate-fade-in">
          {/* 404 Number with Icon */}
          <div className="mb-8 relative">
            <h1 className="text-[120px] sm:text-[180px] lg:text-[220px] font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 leading-none select-none animate-pulse-slow">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl animate-scale-in">
                  <Search className="text-white" size={40} />
                </div>
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-3xl border-4 border-blue-400 animate-ping opacity-20" />
                <div className="absolute inset-0 rounded-3xl border-4 border-indigo-400 animate-ping opacity-10" style={{ animationDelay: '0.5s' }} />
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="mb-10 space-y-4 animate-slide-up">
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900">
              Oops! Lost in Space
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              The page you're searching for has drifted into the digital void. 
              Don't worry, we'll help you find your way back!
            </p>
          </div>

          {/* Quick Links */}
          <div className="mb-10">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Quick Navigation
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                const colors = {
                  blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
                  green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
                  yellow: 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
                  purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
                };
                
                return (
                  <button
                    key={link.path}
                    onClick={() => navigate(link.path)}
                    className={`
                      bg-gradient-to-br ${colors[link.color as keyof typeof colors]}
                      text-white p-4 rounded-2xl shadow-lg hover:shadow-xl 
                      transition-all duration-300 hover:scale-105 active:scale-95
                      flex flex-col items-center gap-2 animate-scale-in
                    `}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <Icon size={24} />
                    <span className="text-sm font-semibold">{link.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Card */}
          <div className="card max-w-2xl mx-auto mb-8 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-3 text-lg">What happened?</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Page may have been moved</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>URL might be incorrect</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Link might be outdated</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>Access may be restricted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary flex items-center justify-center gap-2 h-12"
            >
              <ArrowLeft size={20} />
              <span>Go Back</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn-primary flex items-center justify-center gap-2 h-12"
            >
              <Home size={20} />
              <span>Home</span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-12 text-sm text-slate-500 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <p className="mb-2">Error Code: <span className="font-mono font-bold text-blue-600">404</span></p>
            <p className="text-xs">Need help? Contact support at stcautotrade</p>
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-5deg);
          }
          75% {
            transform: translateY(-30px) rotate(3deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .animate-float {
          animation: float 12s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};