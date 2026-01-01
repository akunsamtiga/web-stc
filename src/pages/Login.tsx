import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Mail, Lock, Loader, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-slate-900 to-dark-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-3xl blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-3xl flex items-center justify-center shadow-2xl shadow-accent-primary/30">
              <Shield className="text-white" size={40} />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Stockity Admin</h1>
          <p className="text-slate-400 text-lg">Sign in to access your dashboard</p>
        </div>

        {/* Login Card */}
        <div className="card backdrop-blur-xl bg-dark-card/50 border-slate-800/50 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="relative input pl-12 pr-4 h-14 bg-dark-hover/50 border-slate-700 focus:border-accent-primary focus:bg-dark-hover transition-all"
                  placeholder="admin@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/20 to-accent-secondary/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative input pl-12 pr-12 h-14 bg-dark-hover/50 border-slate-700 focus:border-accent-primary focus:bg-dark-hover transition-all"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-accent-primary transition-colors z-10"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full h-14 bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-bold rounded-xl 
                transition-all duration-300 hover:shadow-2xl hover:shadow-accent-primary/30 hover:scale-[1.02] 
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-secondary to-accent-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={22} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-slate-500">
            Powered by <span className="text-accent-primary font-semibold">Stockity Trading Platform</span>
          </p>
          <p className="text-xs text-slate-600">© 2025 All rights reserved</p>
        </div>
      </div>
    </div>
  );
};