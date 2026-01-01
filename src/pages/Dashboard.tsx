import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { StatsCard } from '../components/StatsCard';
import { Users, CheckCircle, XCircle, Clock, TrendingUp, Activity } from 'lucide-react';
import type { WhitelistUser } from '../types';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user, isSuperAdmin]);

  const loadData = async () => {
    if (!user?.email) return;
    
    try {
      const data = await firebaseService.getWhitelistUsers(user.email, isSuperAdmin);
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    recent: users.filter(u => Date.now() - u.lastLogin < 24 * 60 * 60 * 1000).length,
  };

  const recentUsers = users
    .sort((a, b) => b.lastLogin - a.lastLogin)
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-accent-primary/30 rounded-full animate-spin border-t-accent-primary"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-accent-secondary/30 rounded-full animate-ping"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-400 text-base sm:text-lg">
          Welcome back, <span className="text-accent-primary font-semibold">{user?.email}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard 
          icon={Users} 
          value={stats.total} 
          label="Total Users" 
          color="blue"
        />
        <StatsCard 
          icon={CheckCircle} 
          value={stats.active} 
          label="Active Users" 
          color="green"
        />
        <StatsCard 
          icon={XCircle} 
          value={stats.inactive} 
          label="Inactive Users" 
          color="red"
        />
        <StatsCard 
          icon={Clock} 
          value={stats.recent} 
          label="Active Today" 
          color="yellow"
        />
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-xl flex items-center justify-center">
              <Activity className="text-accent-primary" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
              <p className="text-sm text-slate-400">Latest user activities</p>
            </div>
          </div>

          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-slate-700 mb-4" />
                <p className="text-slate-400">No recent activity</p>
              </div>
            ) : (
              recentUsers.map((user, index) => (
                <div 
                  key={user.id} 
                  className="group flex items-center justify-between p-4 bg-dark-hover/30 hover:bg-dark-hover/60 
                    rounded-xl transition-all duration-200 hover:shadow-lg border border-transparent hover:border-slate-700/50"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                      user.isActive 
                        ? 'bg-green-500/20 border border-green-500/30' 
                        : 'bg-red-500/20 border border-red-500/30'
                    }`}>
                      <Users className={user.isActive ? 'text-green-500' : 'text-red-500'} size={20} />
                      {user.isActive && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-dark-hover animate-pulse"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{user.name}</p>
                      <p className="text-sm text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm text-slate-400 mb-1">
                      {user.lastLogin > 0 
                        ? format(new Date(user.lastLogin), 'MMM dd, HH:mm')
                        : 'Never'
                      }
                    </p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                      user.isActive 
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-500 border border-red-500/30'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          {/* Activity Chart */}
          <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white">User Status</h3>
                <p className="text-xs text-slate-400">Overview</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-dark-hover/30 rounded-lg">
                <span className="text-sm text-slate-400">Active Rate</span>
                <span className="text-sm font-bold text-green-500">
                  {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-hover/30 rounded-lg">
                <span className="text-sm text-slate-400">Inactive Rate</span>
                <span className="text-sm font-bold text-red-500">
                  {stats.total > 0 ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-hover/30 rounded-lg">
                <span className="text-sm text-slate-400">Today Active</span>
                <span className="text-sm font-bold text-yellow-500">
                  {stats.total > 0 ? ((stats.recent / stats.total) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl">
            <h3 className="font-bold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-3 bg-dark-hover/50 hover:bg-accent-primary/10 text-slate-300 hover:text-accent-primary rounded-lg transition-all text-sm font-medium text-left border border-transparent hover:border-accent-primary/30">
                View All Users
              </button>
              <button className="w-full px-4 py-3 bg-dark-hover/50 hover:bg-accent-primary/10 text-slate-300 hover:text-accent-primary rounded-lg transition-all text-sm font-medium text-left border border-transparent hover:border-accent-primary/30">
                Export Data
              </button>
              <button className="w-full px-4 py-3 bg-dark-hover/50 hover:bg-accent-primary/10 text-slate-300 hover:text-accent-primary rounded-lg transition-all text-sm font-medium text-left border border-transparent hover:border-accent-primary/30">
                System Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};