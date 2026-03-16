import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import {
  Users, CheckCircle, XCircle, Zap, BarChart2,
  UserPlus, Shield, Copy, ExternalLink, MessageCircle,
  RefreshCw, TrendingUp, ArrowUpRight, ArrowDownRight,
  Minus, Crown,
} from 'lucide-react';
import type { WhitelistUser, RegistrationConfig } from '../types';
import { format, subDays, startOfDay, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const pct = (n: number, total: number) =>
  total > 0 ? ((n / total) * 100).toFixed(1) : '0.0';
const DAY_MS  = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const Bar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-1.5">
    <div className={`h-full rounded-full transition-all duration-700 ${color}`}
      style={{ width: `${Math.min(value, 100)}%` }} />
  </div>
);

const Spark: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-6 mt-2">
      {data.map((v, i) => (
        <div key={i} className={`flex-1 rounded-sm ${color} opacity-60`}
          style={{ height: `${(v / max) * 100}%`, minHeight: v > 0 ? '2px' : '0' }} />
      ))}
    </div>
  );
};

const TrendPill: React.FC<{ curr: number; prev: number }> = ({ curr, prev }) => {
  if (prev === 0 && curr === 0) return <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400"><Minus size={9} />—</span>;
  if (prev === 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600"><ArrowUpRight size={9} />New</span>;
  const diff = curr - prev;
  const p = Math.abs((diff / prev) * 100).toFixed(0);
  if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600"><ArrowUpRight size={9} />+{p}%</span>;
  if (diff < 0) return <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500"><ArrowDownRight size={9} />-{p}%</span>;
  return <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400"><Minus size={9} />0%</span>;
};

const StatCard: React.FC<{
  icon: React.ElementType; iconBg: string; iconColor: string;
  value: number | string; label: string; sub: string;
  right?: React.ReactNode; spark?: { data: number[]; color: string };
}> = ({ icon: Icon, iconBg, iconColor, value, label, sub, right, spark }) => (
  <div className="card p-3 sm:p-4 hover:shadow transition-shadow duration-200">
    <div className="flex items-start justify-between mb-2 sm:mb-3">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className={iconColor} size={14} strokeWidth={2.5} />
      </div>
      {right}
    </div>
    <p className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums leading-none">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
    <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">{sub}</p>
    {spark && <Spark data={spark.data} color={spark.color} />}
  </div>
);

const SectionHead: React.FC<{
  icon: React.ElementType; bg: string; color: string;
  title: string; sub: string; right?: React.ReactNode;
}> = ({ icon: Icon, bg, color, title, sub, right }) => (
  <div className="flex items-center justify-between mb-4">
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center`}>
        <Icon className={color} size={13} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 leading-none">{title}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
    {right}
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers]         = useState<WhitelistUser[]>([]);
  const [config, setConfig]       = useState<RegistrationConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => { loadData(); }, [user, isSuperAdmin]);

  const loadData = async (silent = false) => {
    if (!user?.email) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [ud, cd] = await Promise.all([
        firebaseService.getWhitelistUsers(user.email, isSuperAdmin),
        firebaseService.getRegistrationConfig(),
      ]);
      setUsers(ud); setConfig(cd); setLastRefresh(new Date());
    } catch { toast.error('Failed to refresh data'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const copy = (text: string, label: string) =>
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));

  const stats = useMemo(() => {
    const now = Date.now();
    const todayStart  = startOfDay(new Date()).getTime();
    const weekAgo     = now - WEEK_MS;
    const twoWeeksAgo = now - 2 * WEEK_MS;
    const newThisWeek    = users.filter(u => u.createdAt >= weekAgo).length;
    const newLastWeek    = users.filter(u => u.createdAt >= twoWeeksAgo && u.createdAt < weekAgo).length;
    const activeThisWeek = users.filter(u => u.lastLogin >= weekAgo).length;
    const activeLastWeek = users.filter(u => u.lastLogin >= twoWeeksAgo && u.lastLogin < weekAgo).length;
    const loginPerDay = Array.from({ length: 7 }, (_, i) => {
      const s = startOfDay(subDays(new Date(), 6 - i)).getTime();
      return users.filter(u => u.lastLogin >= s && u.lastLogin < s + DAY_MS).length;
    });
    const newPerDay = Array.from({ length: 7 }, (_, i) => {
      const s = startOfDay(subDays(new Date(), 6 - i)).getTime();
      return users.filter(u => u.createdAt >= s && u.createdAt < s + DAY_MS).length;
    });
    const active        = users.filter(u => u.isActive);
    const loginToday    = users.filter(u => u.lastLogin >= todayStart);
    const loginThisWeek = users.filter(u => u.lastLogin >= weekAgo);
    const neverLoggedIn = users.filter(u => u.lastLogin === 0 && u.isActive).length;
    const uniqueDevices = new Set(users.map(u => u.deviceId).filter(Boolean)).size;
    const topActive = [...users].filter(u => u.isActive && u.lastLogin > 0)
      .sort((a, b) => b.lastLogin - a.lastLogin).slice(0, 8);
    const recentlyAdded = [...users].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
    const dailyAvg = loginPerDay.reduce((a, b) => a + b, 0) / Math.max(loginPerDay.length, 1);
    return {
      total: users.length, active: active.length, inactive: users.length - active.length,
      loginToday: loginToday.length, loginThisWeek: loginThisWeek.length,
      newThisWeek, newLastWeek, activeThisWeek, activeLastWeek,
      loginPerDay, newPerDay, topActive, recentlyAdded,
      neverLoggedIn, uniqueDevices, dailyAvg,
      activeRate: pct(active.length, users.length),
      todayRate:  pct(loginToday.length, users.length),
    };
  }, [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-0.5">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {greeting}, {user?.email?.split('@')[0]}
            </h1>
            {isSuperAdmin && (
              <span className="badge-blue inline-flex items-center gap-1">
                <Crown size={9} /> Super Admin
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            Updated {formatDistanceToNow(lastRefresh, { addSuffix: true })}
            <span className="hidden sm:inline"> · {format(new Date(), 'EEE, dd MMM yyyy')}</span>
          </p>
        </div>
        <button onClick={() => loadData(true)} disabled={refreshing} className="btn-secondary flex-shrink-0">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stat cards: 2-col mobile → 4-col lg */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600"
          value={stats.total} label="Total Users" sub={`+${stats.newThisWeek} this week`}
          right={<TrendPill curr={stats.newThisWeek} prev={stats.newLastWeek} />}
          spark={{ data: stats.newPerDay, color: 'bg-blue-400' }} />
        <StatCard icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600"
          value={stats.active} label="Active Users" sub={`${stats.activeRate}% rate`}
          right={<span className="text-[10px] font-bold text-emerald-600">{stats.activeRate}%</span>} />
        <StatCard icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500"
          value={stats.inactive} label="Inactive" sub={`${stats.uniqueDevices} unique devices`}
          right={<span className="text-[10px] text-slate-400">{pct(stats.inactive, stats.total)}%</span>} />
        <StatCard icon={Zap} iconBg="bg-amber-50" iconColor="text-amber-600"
          value={stats.loginToday} label="Active Today" sub={`${stats.loginThisWeek} this week`}
          right={<TrendPill curr={stats.activeThisWeek} prev={stats.activeLastWeek} />}
          spark={{ data: stats.loginPerDay, color: 'bg-amber-400' }} />
      </div>

      {/* Middle row: 1-col mobile → 2-col md → 3-col lg */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">

        {/* Login chart — takes 2/3 width on md+ */}
        <div className="card p-4 sm:p-5 md:col-span-2">
          <SectionHead icon={BarChart2} bg="bg-blue-50" color="text-blue-600"
            title="Login Activity" sub="Last 7 days"
            right={
              <div className="text-right">
                <p className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">{stats.loginThisWeek}</p>
                <p className="text-[10px] text-slate-400">total logins</p>
              </div>
            }
          />
          <div className="flex items-end gap-1 sm:gap-1.5 h-20 sm:h-24">
            {stats.loginPerDay.map((count, i) => {
              const max     = Math.max(...stats.loginPerDay, 1);
              const isToday = i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  {count > 0 && <span className="text-[9px] text-slate-400 tabular-nums">{count}</span>}
                  <div className="w-full flex flex-col justify-end flex-1">
                    <div className={`w-full rounded-t-sm transition-all duration-700 ${isToday ? 'bg-blue-500' : 'bg-slate-200 hover:bg-blue-200'}`}
                      style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? '3px' : '2px' }} />
                  </div>
                  <span className={`text-[9px] font-medium ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>
                    {/* 1-char on mobile, 3-char on sm+ */}
                    <span className="sm:hidden">{format(subDays(new Date(), 6 - i), 'EEEEE')}</span>
                    <span className="hidden sm:inline">{format(subDays(new Date(), 6 - i), 'EEE')}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 mt-3 pt-3 border-t border-slate-100">
            {[
              { l: "Today's rate", v: `${stats.todayRate}%` },
              { l: 'This week',    v: String(stats.loginThisWeek) },
              { l: 'Daily avg',    v: stats.dailyAvg.toFixed(1) },
            ].map(item => (
              <div key={item.l} className="text-center px-1 sm:px-2">
                <p className="text-sm font-bold text-slate-900 tabular-nums">{item.v}</p>
                <p className="text-[10px] text-slate-400">{item.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recently added */}
        <div className="card p-4 sm:p-5 md:col-span-1">
          <SectionHead icon={UserPlus} bg="bg-violet-50" color="text-violet-600"
            title="Recently Added" sub="Newest users" />
          {stats.recentlyAdded.length === 0 ? (
            <div className="text-center py-8">
              <Users size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No users yet</p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {stats.recentlyAdded.map(u => (
                <div key={u.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-600">{u.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate leading-none">{u.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <span className={u.isActive ? 'badge-green' : 'badge-slate'}>
                    {u.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: 1-col mobile → 2-col md → 3-col lg */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">

        {/* Recent logins: full on mobile, 2/3 on md+ */}
        <div className="card p-4 sm:p-5 md:col-span-2">
          <SectionHead icon={CheckCircle} bg="bg-emerald-50" color="text-emerald-600"
            title="Recent Logins" sub="Most recently active users" />
          {stats.topActive.length === 0 ? (
            <div className="text-center py-10">
              <Zap size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400">No login activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {stats.topActive.map((u, i) => {
                const isToday    = u.lastLogin >= startOfDay(new Date()).getTime();
                const isThisWeek = u.lastLogin >= Date.now() - WEEK_MS;
                return (
                  <div key={u.id} className="flex items-center gap-2 sm:gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="w-4 text-[10px] font-bold text-slate-300 text-right tabular-nums flex-shrink-0">{i + 1}</span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isToday ? 'bg-emerald-100' : isThisWeek ? 'bg-blue-100' : 'bg-slate-100'
                    }`}>
                      <span className={`text-[10px] font-bold ${
                        isToday ? 'text-emerald-700' : isThisWeek ? 'text-blue-700' : 'text-slate-500'
                      }`}>{u.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate leading-none">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center justify-end gap-1">
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        <p className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 tabular-nums">{format(new Date(u.lastLogin), 'HH:mm')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right col: breakdown + quick links */}
        <div className="md:col-span-1 space-y-3 sm:space-y-4">
          {/* Breakdown */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <TrendingUp size={12} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-700">User Breakdown</p>
            </div>
            <div className="space-y-2.5 sm:space-y-3">
              {[
                { label: 'Active',       value: stats.active,        color: 'bg-emerald-500', tc: 'text-emerald-600' },
                { label: 'Inactive',     value: stats.inactive,      color: 'bg-red-400',     tc: 'text-red-500' },
                { label: 'Login today',  value: stats.loginToday,    color: 'bg-blue-500',    tc: 'text-blue-600' },
                { label: 'Never logged', value: stats.neverLoggedIn, color: 'bg-slate-300',   tc: 'text-slate-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">{item.label}</span>
                    <span className={`text-[11px] font-bold tabular-nums ${item.tc}`}>
                      {item.value}
                      <span className="font-normal text-slate-400 ml-1">({pct(item.value, stats.total)}%)</span>
                    </span>
                  </div>
                  <Bar value={parseFloat(pct(item.value, stats.total))} color={item.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          {config && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={12} className="text-slate-400" />
                <p className="text-xs font-semibold text-slate-700">Quick Links</p>
              </div>
              <div className="space-y-2">
                {[
                  { icon: ExternalLink, label: 'Registration URL', url: config.registrationUrl,
                    bg: 'bg-blue-50 border-blue-100', tc: 'text-blue-700', btn: 'border-blue-200 hover:bg-blue-100 text-blue-700' },
                  { icon: MessageCircle, label: 'WhatsApp Support', url: config.whatsappHelpUrl,
                    bg: 'bg-emerald-50 border-emerald-100', tc: 'text-emerald-700', btn: 'border-emerald-200 hover:bg-emerald-100 text-emerald-700' },
                ].map(item => (
                  <div key={item.label} className={`p-3 rounded-lg border ${item.bg}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <item.icon size={10} className={item.tc} />
                      <p className={`text-[11px] font-semibold ${item.tc}`}>{item.label}</p>
                    </div>
                    <p className={`text-[10px] ${item.tc} opacity-70 truncate mb-2`}>{item.url}</p>
                    <div className="flex gap-1.5">
                      <button onClick={() => copy(item.url, item.label)}
                        className={`flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 min-h-[32px] bg-white rounded border transition-colors ${item.btn}`}>
                        <Copy size={9} /> Copy
                      </button>
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className={`flex-1 inline-flex items-center justify-center gap-1 text-[11px] py-1.5 min-h-[32px] bg-white rounded border transition-colors ${item.btn}`}>
                        <ExternalLink size={9} /> Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="card px-3 sm:px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-medium text-slate-600">System Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={10} className="text-blue-500" />
            <span className="text-[11px] text-slate-500">Firestore Connected</span>
          </div>
          <span className="text-[11px] text-slate-400 ml-auto tabular-nums">{stats.total} users loaded</span>
        </div>
      </div>
    </div>
  );
};