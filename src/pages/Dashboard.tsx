import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { StatsCard } from '../components/StatsCard';
import { Users, CheckCircle, XCircle, Clock, Activity, TrendingUp } from 'lucide-react';
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
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Welcome, <span className="text-blue-600 font-semibold">{user?.email}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard 
          icon={Users} 
          value={stats.total} 
          label="Total Users" 
          color="blue"
        />
        <StatsCard 
          icon={CheckCircle} 
          value={stats.active} 
          label="Active" 
          color="green"
        />
        <StatsCard 
          icon={XCircle} 
          value={stats.inactive} 
          label="Inactive" 
          color="red"
        />
        <StatsCard 
          icon={Clock} 
          value={stats.recent} 
          label="Active Today" 
          color="yellow"
        />
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Activity className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Activity</h2>
            <p className="text-xs sm:text-sm text-slate-500">Latest user logins</p>
          </div>
        </div>

        <div className="space-y-3">
          {recentUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">No recent activity</p>
            </div>
          ) : (
            recentUsers.map((u, index) => (
              <div 
                key={u.id} 
                className="flex items-center gap-3 p-3 sm:p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center ${
                  u.isActive ? 'bg-green-100' : 'bg-slate-200'
                }`}>
                  <Users className={u.isActive ? 'text-green-600' : 'text-slate-400'} size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate text-sm sm:text-base">{u.name}</p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{u.email}</p>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500 mb-1">
                    {u.lastLogin > 0 
                      ? format(new Date(u.lastLogin), 'MMM dd, HH:mm')
                      : 'Never'
                    }
                  </p>
                  <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-semibold ${
                    u.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm text-slate-600 font-medium">Active Rate</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm text-slate-600 font-medium">Inactive Rate</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="text-red-600" size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.total > 0 ? ((stats.inactive / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm text-slate-600 font-medium">Today Active</span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-yellow-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="text-yellow-600" size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.total > 0 ? ((stats.recent / stats.total) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};