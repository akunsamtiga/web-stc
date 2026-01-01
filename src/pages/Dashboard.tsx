import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { StatsCard } from '../components/StatsCard';
import { Users, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
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

  const recentUsers = users.slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Welcome back, {user?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard icon={Users} value={stats.total} label="Total Users" color="blue" />
        <StatsCard icon={CheckCircle} value={stats.active} label="Active Users" color="green" />
        <StatsCard icon={XCircle} value={stats.inactive} label="Inactive Users" color="red" />
        <StatsCard icon={Clock} value={stats.recent} label="Recent Logins (24h)" color="yellow" />
      </div>

      {/* Activity Chart */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="text-accent-primary" size={24} />
          <h2 className="text-xl font-bold text-white">Recent Activity</h2>
        </div>

        <div className="space-y-3">
          {recentUsers.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No recent activity</p>
          ) : (
            recentUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-dark-hover rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    user.isActive ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <Users className={user.isActive ? 'text-green-500' : 'text-red-500'} size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">
                    {user.lastLogin > 0 
                      ? format(new Date(user.lastLogin), 'MMM dd, HH:mm')
                      : 'Never logged in'
                    }
                  </p>
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    user.isActive 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};