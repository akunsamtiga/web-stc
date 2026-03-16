import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import {
  Users, CheckCircle, XCircle, Clock, Activity, TrendingUp,
  UserPlus, Shield, Copy, ExternalLink,
  MessageCircle, RefreshCw, Zap, BarChart2, Calendar,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import type { WhitelistUser, RegistrationConfig } from '../types';
import { format, subDays, startOfDay, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ─── helpers ────────────────────────────────────────────────
const pct = (n: number, total: number) =>
  total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// ─── sub-components ─────────────────────────────────────────

/** Thin horizontal progress bar */
const ProgressBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
    <div
      className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
);

/** Sparkline — 7-day bar chart (pure CSS, no lib needed) */
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm transition-all duration-500 ${color}`}
          style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? '2px' : '0' }}
        />
      ))}
    </div>
  );
};

/** Trend badge */
const TrendBadge: React.FC<{ curr: number; prev: number }> = ({ curr, prev }) => {
  if (prev === 0 && curr === 0) return <span className="text-xs text-slate-400 flex items-center gap-0.5"><Minus size={12} />—</span>;
  if (prev === 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight size={12} />New</span>;
  const diff = curr - prev;
  const diffPct = Math.abs((diff / prev) * 100).toFixed(0);
  if (diff > 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight size={12} />+{diffPct}%</span>;
  if (diff < 0) return <span className="text-xs text-red-500 flex items-center gap-0.5"><ArrowDownRight size={12} />-{diffPct}%</span>;
  return <span className="text-xs text-slate-400 flex items-center gap-0.5"><Minus size={12} />0%</span>;
};

// ─── main component ──────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [config, setConfig] = useState<RegistrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => { loadData(); }, [user, isSuperAdmin]);

  const loadData = async (silent = false) => {
    if (!user?.email) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [userData, configData] = await Promise.all([
        firebaseService.getWhitelistUsers(user.email, isSuperAdmin),
        firebaseService.getRegistrationConfig(),
      ]);
      setUsers(userData);
      setConfig(configData);
      setLastRefresh(new Date());
    } catch (error) {
      console.error(error);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => loadData(true);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
  };

  // ─── computed stats ────────────────────────────────────────
  const stats = useMemo(() => {
    const now = Date.now();
    const todayStart = startOfDay(new Date()).getTime();
    const weekAgo = now - WEEK_MS;
    const twoWeeksAgo = now - 2 * WEEK_MS;

    const active = users.filter(u => u.isActive);
    const inactive = users.filter(u => !u.isActive);
    const loginToday = users.filter(u => u.lastLogin >= todayStart);
    const loginThisWeek = users.filter(u => u.lastLogin >= weekAgo);

    // New users: created this week vs last week
    const newThisWeek = users.filter(u => u.createdAt >= weekAgo).length;
    const newLastWeek = users.filter(u => u.createdAt >= twoWeeksAgo && u.createdAt < weekAgo).length;

    // Active this week vs last week
    const activeThisWeek = users.filter(u => u.lastLogin >= weekAgo).length;
    const activeLastWeek = users.filter(u => u.lastLogin >= twoWeeksAgo && u.lastLogin < weekAgo).length;

    // 7-day login sparkline
    const loginPerDay = Array.from({ length: 7 }, (_, i) => {
      const dayStart = startOfDay(subDays(new Date(), 6 - i)).getTime();
      const dayEnd = dayStart + DAY_MS;
      return users.filter(u => u.lastLogin >= dayStart && u.lastLogin < dayEnd).length;
    });

    // 7-day new users sparkline
    const newPerDay = Array.from({ length: 7 }, (_, i) => {
      const dayStart = startOfDay(subDays(new Date(), 6 - i)).getTime();
      const dayEnd = dayStart + DAY_MS;
      return users.filter(u => u.createdAt >= dayStart && u.createdAt < dayEnd).length;
    });

    // Top active users (logged in recently, sorted by lastLogin)
    const topActive = [...users]
      .filter(u => u.isActive && u.lastLogin > 0)
      .sort((a, b) => b.lastLogin - a.lastLogin)
      .slice(0, 8);

    // Recently added users
    const recentlyAdded = [...users]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    // Never logged in
    const neverLoggedIn = users.filter(u => u.lastLogin === 0 && u.isActive).length;

    // Devices: unique device IDs
    const uniqueDevices = new Set(users.map(u => u.deviceId).filter(Boolean)).size;

    return {
      total: users.length,
      active: active.length,
      inactive: inactive.length,
      loginToday: loginToday.length,
      loginThisWeek: loginThisWeek.length,
      newThisWeek,
      newLastWeek,
      activeThisWeek,
      activeLastWeek,
      loginPerDay,
      newPerDay,
      topActive,
      recentlyAdded,
      neverLoggedIn,
      uniqueDevices,
      activeRate: pct(active.length, users.length),
      todayRate: pct(loginToday.length, users.length),
    };
  }, [users]);

  // ─── loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
      </div>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-5 animate-fade-in pb-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            {greeting()}, {isSuperAdmin ? '👑' : '👤'} {user?.email?.split('@')[0]}
          </h1>
          <p className="text-sm text-slate-500">
            Last updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            {' · '}
            <span className="text-blue-600 font-medium">{isSuperAdmin ? 'Super Admin' : 'Admin'}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm h-9 px-3 flex-shrink-0"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* ── Top 4 stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Users */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="text-blue-600" size={18} />
            </div>
            <TrendBadge curr={stats.newThisWeek} prev={stats.newLastWeek} />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Total Users</p>
          <p className="text-xs text-blue-600 mt-0.5">+{stats.newThisWeek} this week</p>
          <Sparkline data={stats.newPerDay} color="bg-blue-300" />
        </div>

        {/* Active */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={18} />
            </div>
            <span className="text-xs font-bold text-green-600">{stats.activeRate}%</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.active.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Active Users</p>
          <p className="text-xs text-slate-400 mt-0.5">{stats.neverLoggedIn} never logged in</p>
          <ProgressBar value={parseFloat(stats.activeRate)} color="bg-green-400" />
        </div>

        {/* Inactive */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="text-red-500" size={18} />
            </div>
            <span className="text-xs font-bold text-red-500">
              {pct(stats.inactive, stats.total)}%
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.inactive.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Inactive Users</p>
          <p className="text-xs text-slate-400 mt-0.5">{stats.uniqueDevices} unique devices</p>
          <ProgressBar value={parseFloat(pct(stats.inactive, stats.total))} color="bg-red-300" />
        </div>

        {/* Today Active */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Zap className="text-yellow-600" size={18} />
            </div>
            <TrendBadge curr={stats.activeThisWeek} prev={stats.activeLastWeek} />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.loginToday}</p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Active Today</p>
          <p className="text-xs text-yellow-600 mt-0.5">{stats.loginThisWeek} this week</p>
          <Sparkline data={stats.loginPerDay} color="bg-yellow-300" />
        </div>
      </div>

      {/* ── Middle row: Login chart + Recently Added ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 7-day login activity chart */}
        <div className="card lg:col-span-2 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <BarChart2 className="text-blue-600" size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Login Activity</h2>
                <p className="text-xs text-slate-500">Last 7 days</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{stats.loginThisWeek}</p>
              <p className="text-xs text-slate-500">total logins</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-2 h-28 mt-2">
            {stats.loginPerDay.map((count, i) => {
              const max = Math.max(...stats.loginPerDay, 1);
              const heightPct = (count / max) * 100;
              const dayLabel = format(subDays(new Date(), 6 - i), 'EEE');
              const isToday = i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-slate-500">{count > 0 ? count : ''}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 ${isToday ? 'bg-blue-500' : 'bg-blue-200 hover:bg-blue-300'}`}
                      style={{ height: `${heightPct}%`, minHeight: count > 0 ? '4px' : '2px' }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{dayLabel}</span>
                </div>
              );
            })}
          </div>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-base font-bold text-slate-900">{stats.todayRate}%</p>
              <p className="text-xs text-slate-500">Today's rate</p>
            </div>
            <div className="text-center border-x border-slate-100">
              <p className="text-base font-bold text-slate-900">{stats.loginThisWeek}</p>
              <p className="text-xs text-slate-500">This week</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-slate-900">
                {stats.loginPerDay.length > 0
                  ? (stats.loginPerDay.reduce((a, b) => a + b, 0) / stats.loginPerDay.length).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs text-slate-500">Daily avg</p>
            </div>
          </div>
        </div>

        {/* Recently Added */}
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <UserPlus className="text-purple-600" size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">Recently Added</h2>
              <p className="text-xs text-slate-500">Newest users</p>
            </div>
          </div>

          <div className="space-y-3">
            {stats.recentlyAdded.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No users yet</p>
            ) : (
              stats.recentlyAdded.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-slate-600">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{u.name}</p>
                    <p className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium flex-shrink-0 ${
                    u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {u.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent Logins + Quick Stats + Quick Links ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent Logins */}
        <div className="card lg:col-span-2 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <Activity className="text-green-600" size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Recent Logins</h2>
                <p className="text-xs text-slate-500">Most recently active users</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {stats.topActive.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No login activity yet</p>
              </div>
            ) : (
              stats.topActive.map((u, i) => {
                const isToday = u.lastLogin >= startOfDay(new Date()).getTime();
                const isThisWeek = u.lastLogin >= Date.now() - WEEK_MS;
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-bold text-slate-400 w-4 text-center flex-shrink-0">{i + 1}</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isToday ? 'bg-green-100' : isThisWeek ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <span className={`text-xs font-bold ${
                        isToday ? 'text-green-700' : isThisWeek ? 'text-blue-700' : 'text-slate-500'
                      }`}>
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isToday && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 mb-0.5" />
                      )}
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })}
                      </p>
                      <p className="text-xs text-slate-400">{format(new Date(u.lastLogin), 'HH:mm')}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: User Breakdown + Quick Links */}
        <div className="space-y-4">

          {/* User Breakdown */}
          <div className="card p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-slate-500" />
              User Breakdown
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Active', value: stats.active, total: stats.total, color: 'bg-green-500', textColor: 'text-green-600' },
                { label: 'Inactive', value: stats.inactive, total: stats.total, color: 'bg-red-400', textColor: 'text-red-500' },
                { label: 'Login today', value: stats.loginToday, total: stats.total, color: 'bg-blue-500', textColor: 'text-blue-600' },
                { label: 'Never login', value: stats.neverLoggedIn, total: stats.total, color: 'bg-slate-300', textColor: 'text-slate-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-600">{item.label}</span>
                    <span className={`text-xs font-bold ${item.textColor}`}>
                      {item.value} <span className="font-normal text-slate-400">({pct(item.value, item.total)}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${item.color}`}
                      style={{ width: `${parseFloat(pct(item.value, item.total))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          {config && (
            <div className="card p-4">
              <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Zap size={15} className="text-slate-500" />
                Quick Links
              </h2>
              <div className="space-y-2">
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-semibold text-blue-900 mb-1.5 flex items-center gap-1">
                    <ExternalLink size={11} />
                    Registration URL
                  </p>
                  <p className="text-xs text-blue-700 truncate mb-2">{config.registrationUrl}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopy(config.registrationUrl, 'Registration URL')}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-white rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <Copy size={11} /> Copy
                    </button>
                    <a
                      href={config.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-white rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <ExternalLink size={11} /> Open
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs font-semibold text-green-900 mb-1.5 flex items-center gap-1">
                    <MessageCircle size={11} />
                    WhatsApp Support
                  </p>
                  <p className="text-xs text-green-700 truncate mb-2">{config.whatsappHelpUrl}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleCopy(config.whatsappHelpUrl, 'WhatsApp URL')}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-white rounded-lg border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <Copy size={11} /> Copy
                    </button>
                    <a
                      href={config.whatsappHelpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-white rounded-lg border border-green-200 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      <ExternalLink size={11} /> Open
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── System status bar ── */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-slate-600 font-medium">System Online</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-blue-500" />
            <span className="text-xs text-slate-600">Firestore Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-slate-400" />
            <span className="text-xs text-slate-500">{format(new Date(), 'EEEE, dd MMMM yyyy · HH:mm')}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">{stats.total} users loaded</span>
          </div>
        </div>
      </div>

    </div>
  );
};