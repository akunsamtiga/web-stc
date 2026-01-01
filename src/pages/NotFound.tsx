// [file name]: NotFound.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center animate-fade-in">
        {/* 404 Graphic */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-orange-100 rounded-3xl transform rotate-6"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-red-200 to-orange-200 rounded-3xl transform -rotate-6"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={56} strokeWidth={1.5} />
            </div>
          </div>
          
          {/* Animated floating elements */}
          <div className="absolute top-0 left-1/4 w-6 h-6 bg-blue-200 rounded-full animate-pulse"></div>
          <div className="absolute top-4 right-1/4 w-4 h-4 bg-red-200 rounded-full animate-pulse delay-300"></div>
          <div className="absolute bottom-0 left-1/3 w-8 h-8 bg-orange-200 rounded-full animate-pulse delay-500"></div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-black text-slate-900 mb-4 tracking-tighter">
          4<span className="text-red-600">0</span>4
        </h1>

        {/* Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
          Page Not Found
        </h2>
        
        <p className="text-lg text-slate-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved.
          Don't worry, let's get you back on track!
        </p>

        {/* Search Suggestion */}
        <div className="card max-w-md mx-auto mb-8 bg-white/50 backdrop-blur-sm">
          <p className="text-sm text-slate-500 mb-3">Maybe you were looking for:</p>
          <ul className="space-y-2 text-left">
            <li className="flex items-center gap-2 p-3 hover:bg-slate-100 rounded-xl transition-colors">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <Link to="/" className="flex-1 text-left font-medium text-slate-900">
                Dashboard
              </Link>
            </li>
            <li className="flex items-center gap-2 p-3 hover:bg-slate-100 rounded-xl transition-colors">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <Link to="/users" className="flex-1 text-left font-medium text-slate-900">
                Users Management
              </Link>
            </li>
            <li className="flex items-center gap-2 p-3 hover:bg-slate-100 rounded-xl transition-colors">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              </div>
              <Link to="/settings" className="flex-1 text-left font-medium text-slate-900">
                Settings
              </Link>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="btn-primary flex items-center justify-center gap-2 py-3 px-6"
          >
            <Home size={20} />
            <span>Back to Dashboard</span>
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="btn-secondary flex items-center justify-center gap-2 py-3 px-6"
          >
            <ArrowLeft size={20} />
            <span>Go Back</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Need help? Contact{' '}
            <a 
              href="mailto:support@stockity.id" 
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              support@stockity.id
            </a>
          </p>
          <p className="text-xs text-slate-400 mt-2">
            © 2026 STC AutoTrade Admin Panel
          </p>
        </div>
      </div>
    </div>
  );
};
