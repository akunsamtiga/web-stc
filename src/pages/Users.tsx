import React, {
  useEffect, useState, useMemo, useCallback, useRef,
  useTransition, memo
} from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { WhitelistUser } from '../types';
import {
  Plus, Search, Edit, Trash2, Download, Upload,
  Users as UsersIcon, Save, X,
  FileSpreadsheet, Loader, Code, AlertTriangle, Filter,
  CheckCircle, XCircle, Play, Pause, Square,
  Clock, LogIn, UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ─── util ─────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

// ─── Modal portal — always renders to document.body ──────────
// Guarantees fixed positioning is relative to the viewport,
// not any transformed/overflow parent in the React tree.
const ModalPortal: React.FC<{ children: React.ReactNode }> = ({ children }) =>
  createPortal(children, document.body);

// ─── UserCard — memoized ──────────────────────────────────────
// Critical: without memo, every card re-renders on every search
// keystroke. With memo, only cards whose user data changed re-render.
const UserCard = memo(({
  u, onToggle, onEdit, onDelete,
}: {
  u: WhitelistUser;
  onToggle: (u: WhitelistUser) => void;
  onEdit: (u: WhitelistUser) => void;
  onDelete: (id: string) => void;
}) => {
  const lastLoginStr = u.lastLogin > 0
    ? format(new Date(u.lastLogin), 'dd MMM, HH:mm')
    : 'Never';
  const initials = u.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all duration-150 group">

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
        u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
      }`}>
        {initials}
      </div>

      {/* Row 1: name + email  |  Row 2: userId + lastLogin */}
      <div className="flex-1 min-w-0">
        {/* Line 1 */}
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-none">{u.name}</p>
          <p className="text-xs text-slate-400 truncate hidden sm:block leading-none">{u.email}</p>
        </div>
        {/* Line 2 */}
        <div className="flex items-center gap-2 mt-0.5 min-w-0">
          <code className="text-[11px] text-slate-400 truncate leading-none">{u.userId}</code>
          <span className="text-slate-300 hidden sm:inline text-[11px]">·</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline leading-none flex-shrink-0">
            {u.lastLogin > 0 ? lastLoginStr : 'Never logged in'}
          </span>
        </div>
      </div>

      {/* Status toggle */}
      <button
        onClick={() => onToggle(u)}
        className={`badge flex-shrink-0 transition-opacity hover:opacity-70 active:scale-95 ${
          u.isActive ? 'badge-green' : 'badge-slate'
        }`}
      >
        {u.isActive ? 'Active' : 'Inactive'}
      </button>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(u)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Edit"
        >
          <Edit size={13} />
        </button>
        <button
          onClick={() => onDelete(u.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
});

// ─── main page ────────────────────────────────────────────────
export const Users: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [editingUser, setEditingUser] = useState<WhitelistUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [statsModal, setStatsModal] = useState<'total' | 'active' | 'inactive' | 'recent' | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // useTransition: keeps input responsive while React processes the
  // filter/render update in the background as low-priority work
  const [isPending, startTransition] = useTransition();

  const debouncedSearch = useDebounce(searchQuery, 250);

  useEffect(() => { startTransition(() => setPage(1)); }, [debouncedSearch, filter]);
  useEffect(() => { loadUsers(); }, [user, isSuperAdmin]);

  // Pre-lowercase once per users array change — never inside the filter loop
  const normalizedUsers = useMemo(() =>
    users.map(u => ({ ...u, _n: u.name.toLowerCase(), _e: u.email.toLowerCase(), _u: u.userId.toLowerCase() })),
  [users]);

  const filteredUsers = useMemo(() => {
    let list = normalizedUsers;
    if (filter === 'active') list = list.filter(u => u.isActive);
    else if (filter === 'inactive') list = list.filter(u => !u.isActive);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(u => u._n.includes(q) || u._e.includes(q) || u._u.includes(q));
    }
    return list;
  }, [normalizedUsers, filter, debouncedSearch]);

  const pagedUsers = useMemo(() => filteredUsers.slice(0, page * PAGE_SIZE), [filteredUsers, page]);
  const hasMore = pagedUsers.length < filteredUsers.length;

  const stats = useMemo(() => {
    const DAY7 = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return {
      total:        users.length,
      active:       users.filter(u => u.isActive).length,
      inactive:     users.filter(u => !u.isActive).length,
      recentLogin:  users.filter(u => u.lastLogin > DAY7).length,
      recentAdded:  users.filter(u => u.createdAt > DAY7).length,
    };
  }, [users]);

  const loadUsers = async () => {
    if (!user?.email) return;
    try {
      const data = await firebaseService.getWhitelistUsers(user.email, isSuperAdmin);
      setUsers(data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const handleDelete = useCallback(async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
    try {
      await firebaseService.deleteWhitelistUser(userId);
      toast.success('User deleted');
    } catch { toast.error('Failed to delete user'); loadUsers(); }
  }, []);

  const handleToggleStatus = useCallback(async (targetUser: WhitelistUser) => {
    const newStatus = !targetUser.isActive;
    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isActive: newStatus } : u));
    try {
      await firebaseService.updateWhitelistUser(targetUser.id, { isActive: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to update status');
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, isActive: targetUser.isActive } : u));
    }
  }, []);

  const handleExport = useCallback((fmt: 'json' | 'csv') => {
    let data: string;
    if (fmt === 'json') {
      data = JSON.stringify(users, null, 2);
    } else {
      const h = ['ID', 'Name', 'Email', 'UserID', 'DeviceID', 'IsActive', 'CreatedAt', 'AddedBy', 'AddedAt'];
      const rows = users.map(u => [
        u.id, u.name || '', u.email || '', u.userId || '', u.deviceId || '',
        u.isActive ? 'true' : 'false', new Date(u.createdAt || 0).toISOString(),
        u.addedBy || '', new Date(u.addedAt || 0).toISOString(),
      ].join(','));
      data = [h.join(','), ...rows].join('\n');
    }
    const blob = new Blob([data], { type: fmt === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-${Date.now()}.${fmt}`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Export successful');
  }, [users]);

  const handleDownloadTemplate = (fmt: 'csv' | 'json') => {
    const isCSV = fmt === 'csv';
    const data = isCSV
      ? `name,email,userId,deviceId,isActive\nJohn Doe,john@example.com,user_001,device_001,true`
      : JSON.stringify([{ name: 'John Doe', email: 'john@example.com', userId: 'user_001', deviceId: 'device_001', isActive: true }], null, 2);
    const blob = new Blob([data], { type: isCSV ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `users-template.${fmt}`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fmt.toUpperCase()} template downloaded`);
  };

  const handleUserSaved = useCallback((savedUser: WhitelistUser, isEdit: boolean) => {
    setUsers(prev => isEdit ? prev.map(u => u.id === savedUser.id ? savedUser : u) : [savedUser, ...prev]);
  }, []);

  const handleSetFilter = useCallback((f: 'all' | 'active' | 'inactive') => {
    startTransition(() => setFilter(f));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5">Users</h1>
          <p className="text-xs text-slate-400">
            {isPending ? 'Filtering…' : `${filteredUsers.length} of ${users.length} users`}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={() => setShowImportModal(true)} className="btn-secondary">
            <Upload size={15} /><span className="hidden sm:inline">Import</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={15} /><span>Add</span>
          </button>
        </div>
      </div>

      {/* Stats cards — 2×2 on mobile, 4-col on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {([
          { key: 'total'    as const, val: stats.total,                     label: 'Total',   hint: 'View all', hov: 'hover:border-blue-300 hover:bg-blue-50',   hc: 'text-blue-500',  nc: 'text-slate-900' },
          { key: 'active'   as const, val: stats.active,                    label: 'Active',  hint: 'View',     hov: 'hover:border-green-300 hover:bg-green-50', hc: 'text-green-500', nc: 'text-green-600' },
          { key: 'inactive' as const, val: stats.inactive,                  label: 'Inactive',hint: 'View',     hov: 'hover:border-red-300 hover:bg-red-50',     hc: 'text-red-500',   nc: 'text-red-600' },
          { key: 'recent'   as const, val: stats.recentLogin + stats.recentAdded, label: 'Recent', hint: 'View', hov: 'hover:border-violet-300 hover:bg-violet-50', hc: 'text-violet-500', nc: 'text-violet-600' },
        ]).map(s => (
          <button key={s.key} onClick={() => setStatsModal(s.key)}
            className={`card text-center p-2.5 sm:p-3 ${s.hov} transition-all active:scale-[0.98] cursor-pointer min-h-[72px]`}>
            <p className={`text-lg sm:text-2xl font-bold tabular-nums ${s.nc}`}>{s.val}</p>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{s.label}</p>
            <p className={`text-[10px] sm:text-xs mt-0.5 font-medium ${s.hc} hidden sm:block`}>{s.hint} →</p>
          </button>
        ))}
      </div>

      {/* Search + filter */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users…" className="input pl-9" />
          </div>
          <div className="flex gap-2">
            <div className="relative sm:hidden">
              <button onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`btn-secondary px-4 h-10 ${filter !== 'all' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}>
                <Filter size={18} />
              </button>
              {showFilterMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                  <div className="absolute right-0 top-12 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    {(['all', 'active', 'inactive'] as const).map(f => (
                      <button key={f} onClick={() => { handleSetFilter(f); setShowFilterMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm ${filter === f ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <select value={filter} onChange={e => handleSetFilter(e.target.value as any)}
              className="hidden sm:block input h-10 w-28 text-sm">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={() => handleExport('csv')} className="btn-secondary px-3 h-10" title="Export CSV">
              <Download size={18} />
            </button>
            {isSuperAdmin && users.length > 0 && (
              <button onClick={() => setShowDeleteAllModal(true)}
                className="btn-secondary px-3 h-10 bg-red-50 hover:bg-red-100 text-red-600 border-red-200">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User list — each card is React.memo, skips re-render if user unchanged */}
      <div className="space-y-1.5">
        {pagedUsers.map(u => (
          <UserCard key={u.id} u={u}
            onToggle={handleToggleStatus}
            onEdit={setEditingUser}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {filteredUsers.length === 0 && !isPending && (
        <div className="text-center py-16 card">
          <UsersIcon size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 font-medium">No users found</p>
        </div>
      )}

      {hasMore && (
        <div className="text-center pt-2">
          <button onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm h-10 px-6">
            Load more ({filteredUsers.length - pagedUsers.length} remaining)
          </button>
        </div>
      )}

      {!hasMore && filteredUsers.length > PAGE_SIZE && (
        <p className="text-center text-xs text-slate-400 pt-2">Showing all {filteredUsers.length} users</p>
      )}

      {(showAddModal || editingUser) && (
        <UserModal user={editingUser}
          onClose={() => { setShowAddModal(false); setEditingUser(null); }}
          onSave={handleUserSaved} currentUserEmail={user?.email || ''} />
      )}
      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onSuccess={loadUsers}
          currentUserEmail={user?.email || ''} onDownloadTemplate={handleDownloadTemplate} />
      )}
      {showDeleteAllModal && (
        <DeleteAllModal totalUsers={users.length}
          onClose={() => setShowDeleteAllModal(false)} onSuccess={loadUsers} isSuperAdmin={isSuperAdmin} />
      )}
      {statsModal && statsModal !== 'recent' && (
        <StatsQuickViewModal type={statsModal as 'total' | 'active' | 'inactive'} users={users}
          onClose={() => setStatsModal(null)}
          onToggleStatus={handleToggleStatus}
          onEditUser={u => { setStatsModal(null); setEditingUser(u); }}
          onDeleteUser={handleDelete}
          onUserSaved={handleUserSaved} />
      )}
      {statsModal === 'recent' && (
        <RecentUsersModal
          users={users}
          onClose={() => setStatsModal(null)}
          onEditUser={u => { setStatsModal(null); setEditingUser(u); }}
        />
      )}
    </div>
  );
};

// ============================================================
// STATS QUICK VIEW MODAL — fully optimized
// ============================================================

// Memoized row: only re-renders when THIS row's data changes
const ModalUserRow = memo(({
  u, isEditing, isSaving, inlineForm,
  onStartEdit, onCancelEdit, onSaveEdit, onChangeForm,
  onToggleStatus, onFullEdit, onDelete,
}: {
  u: WhitelistUser;
  isEditing: boolean;
  isSaving: boolean;
  inlineForm: { name: string; email: string; deviceId: string };
  onStartEdit: (u: WhitelistUser) => void;
  onCancelEdit: () => void;
  onSaveEdit: (u: WhitelistUser) => void;
  onChangeForm: (field: string, val: string) => void;
  onToggleStatus: (u: WhitelistUser) => void;
  onFullEdit: (u: WhitelistUser) => void;
  onDelete: (id: string) => void;
}) => {
  const initials = u.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
  <div className={`rounded-xl border transition-all duration-150 ${
    isEditing
      ? 'border-blue-200 bg-blue-50/40 shadow-sm'
      : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
  }`}>
    {isEditing ? (
      /* ── inline edit ── */
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-blue-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{u.name}</p>
            <code className="text-[10px] text-slate-400 truncate block">{u.userId}</code>
          </div>
          <span className={`badge ${u.isActive ? 'badge-green' : 'badge-slate'}`}>
            {u.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          {([
            { label: 'Name', field: 'name', type: 'text', ph: 'Full name', req: true },
            { label: 'Email', field: 'email', type: 'email', ph: 'email@...' },
            { label: 'Device ID', field: 'deviceId', type: 'text', ph: 'device_...' },
          ]).map(({ label, field, type, ph, req }) => (
            <div key={field}>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {label}{req && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              <input type={type} value={(inlineForm as any)[field]}
                onChange={e => onChangeForm(field, e.target.value)}
                className="input text-xs" placeholder={ph} disabled={isSaving} />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelEdit} disabled={isSaving} className="btn-secondary text-xs px-3">
            <X size={12} /> Cancel
          </button>
          <button onClick={() => onSaveEdit(u)} disabled={isSaving} className="btn-primary text-xs px-3 flex-1">
            {isSaving
              ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              : <><Save size={12} />Save changes</>}
          </button>
          <button onClick={() => { onCancelEdit(); onFullEdit(u); }}
            className="btn-secondary text-xs px-3" title="Open full edit">
            <Edit size={12} /><span className="hidden sm:inline">Full edit</span>
          </button>
        </div>
      </div>
    ) : (
      /* ── view row ── */
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
          u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-none mb-0.5">{u.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{u.email || <span className="italic">no email</span>}</p>
        </div>

        {/* Status toggle */}
        <button
          onClick={() => onToggleStatus(u)}
          title="Click to toggle status"
          className={`badge flex-shrink-0 transition-opacity hover:opacity-70 active:scale-95 ${
            u.isActive ? 'badge-green' : 'badge-slate'
          }`}
        >
          {u.isActive ? 'Active' : 'Inactive'}
        </button>

        {/* Actions */}
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onStartEdit(u)} title="Quick edit"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            <Edit size={13} />
          </button>
          <button onClick={() => onDelete(u.id)} title="Delete"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    )}
  </div>
  );
});

const StatsQuickViewModal: React.FC<{
  type: 'total' | 'active' | 'inactive';
  users: WhitelistUser[];
  onClose: () => void;
  onToggleStatus: (u: WhitelistUser) => void;
  onEditUser: (u: WhitelistUser) => void;
  onDeleteUser: (id: string) => void;
  onUserSaved: (u: WhitelistUser, isEdit: boolean) => void;
}> = ({ type, users, onClose, onToggleStatus, onEditUser, onDeleteUser, onUserSaved }) => {
  const [search, setSearch] = useState('');
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({ name: '', email: '', deviceId: '' });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modalPage, setModalPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const MODAL_PAGE_SIZE = 30;

  // ── Bulk operation state ──────────────────────────────────
  type BulkStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'done';
  const [bulkStatus, setBulkStatus]   = useState<BulkStatus>('idle');
  const [bulkTarget, setBulkTarget]   = useState<boolean>(true); // true = activate, false = deactivate
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, failed: 0 });
  const pausedRef  = useRef(false);
  const stoppedRef = useRef(false);

  const debouncedSearch = useDebounce(search, 250);
  useEffect(() => { startTransition(() => setModalPage(1)); }, [debouncedSearch]);

  const title = type === 'total' ? 'All Users' : type === 'active' ? 'Active Users' : 'Inactive Users';
  const accentClass = type === 'active' ? 'text-green-600' : type === 'inactive' ? 'text-red-600' : 'text-blue-600';

  const baseList = useMemo(() => {
    const src = type === 'active' ? users.filter(u => u.isActive)
      : type === 'inactive' ? users.filter(u => !u.isActive)
      : users;
    return src.map(u => ({ ...u, _n: u.name.toLowerCase(), _e: u.email.toLowerCase(), _u: u.userId.toLowerCase() }));
  }, [users, type]);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return baseList;
    const q = debouncedSearch.toLowerCase();
    return baseList.filter(u => u._n.includes(q) || u._e.includes(q) || u._u.includes(q));
  }, [baseList, debouncedSearch]);

  const pagedFiltered = useMemo(() => filtered.slice(0, modalPage * MODAL_PAGE_SIZE), [filtered, modalPage]);
  const modalHasMore = pagedFiltered.length < filtered.length;



  const startInlineEdit = useCallback((u: WhitelistUser) => {
    setInlineEditId(u.id);
    setInlineForm({ name: u.name, email: u.email, deviceId: u.deviceId });
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setInlineEditId(null);
    setInlineForm({ name: '', email: '', deviceId: '' });
  }, []);

  const handleChangeForm = useCallback((field: string, val: string) => {
    setInlineForm(f => ({ ...f, [field]: val }));
  }, []);

  const saveInlineEdit = useCallback(async (u: WhitelistUser) => {
    if (!inlineForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingId(u.id);
    try {
      await firebaseService.updateWhitelistUser(u.id, inlineForm);
      onUserSaved({ ...u, ...inlineForm }, true);
      toast.success('User updated');
      cancelInlineEdit();
    } catch { toast.error('Failed to update'); }
    finally { setSavingId(null); }
  }, [inlineForm, onUserSaved, cancelInlineEdit]);

  // ── Bulk operation runner ─────────────────────────────────
  const startBulk = useCallback(async (activate: boolean) => {
    const targets = filtered.filter(u => u.isActive !== activate);
    if (targets.length === 0) {
      toast(`All users are already ${activate ? 'active' : 'inactive'}`);
      return;
    }

    setBulkTarget(activate);
    setBulkStatus('running');
    setBulkProgress({ done: 0, total: targets.length, failed: 0 });
    pausedRef.current  = false;
    stoppedRef.current = false;

    let done = 0, failed = 0;

    for (const u of targets) {
      // Check stop
      if (stoppedRef.current) {
        setBulkStatus('stopped');
        toast(`Stopped — ${done} user${done !== 1 ? 's' : ''} updated`);
        return;
      }

      // Wait while paused
      while (pausedRef.current) {
        await new Promise(r => setTimeout(r, 200));
        if (stoppedRef.current) {
          setBulkStatus('stopped');
          toast(`Stopped — ${done} user${done !== 1 ? 's' : ''} updated`);
          return;
        }
      }

      try {
        await firebaseService.updateWhitelistUser(u.id, { isActive: activate });
        // Optimistic update in parent
        onToggleStatus(u);
        done++;
      } catch {
        failed++;
      }

      setBulkProgress({ done, total: targets.length, failed });
    }

    setBulkStatus('done');
    toast.success(`${done} user${done !== 1 ? 's' : ''} ${activate ? 'activated' : 'deactivated'}${failed > 0 ? `, ${failed} failed` : ''}`);
  }, [filtered, onToggleStatus]);

  const handlePauseResume = useCallback(() => {
    if (bulkStatus === 'paused') {
      pausedRef.current = false;
      setBulkStatus('running');
    } else {
      pausedRef.current = true;
      setBulkStatus('paused');
    }
  }, [bulkStatus]);

  const handleStop = useCallback(() => {
    stoppedRef.current = true;
    pausedRef.current  = false;
  }, []);

  const resetBulk = useCallback(() => {
    setBulkStatus('idle');
    setBulkProgress({ done: 0, total: 0, failed: 0 });
  }, []);

  const isBulkRunning = bulkStatus === 'running' || bulkStatus === 'paused';
  const progressPct   = bulkProgress.total > 0
    ? Math.round((bulkProgress.done / bulkProgress.total) * 100)
    : 0;

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-scale-in max-h-[85vh]">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          {/* Colored icon based on type */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            type === 'active'   ? 'bg-emerald-100' :
            type === 'inactive' ? 'bg-red-100'     : 'bg-blue-100'
          }`}>
            <UsersIcon className={
              type === 'active'   ? 'text-emerald-600' :
              type === 'inactive' ? 'text-red-500'     : 'text-blue-600'
            } size={18} strokeWidth={2.5} />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-none">{title}</h2>
            <p className={`text-xs font-semibold mt-0.5 ${accentClass}`}>
              {isPending ? 'Filtering…' : `${filtered.length} user${filtered.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or user ID…"
              className="input pl-9 text-sm"
              autoFocus
              disabled={isBulkRunning}
            />
            {search && !isBulkRunning && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* ── Bulk action toolbar ── */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          {bulkStatus === 'idle' ? (
            /* Idle: show activate all / deactivate all buttons */
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 mr-1 font-medium hidden sm:block">Bulk action:</span>
              <button
                onClick={() => startBulk(true)}
                disabled={filtered.filter(u => !u.isActive).length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                           bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={12} />
                Activate all
                {filtered.filter(u => !u.isActive).length > 0 && (
                  <span className="bg-emerald-500/40 px-1.5 py-0.5 rounded text-[10px]">
                    {filtered.filter(u => !u.isActive).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => startBulk(false)}
                disabled={filtered.filter(u => u.isActive).length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold
                           bg-slate-600 hover:bg-slate-700 text-white rounded-lg
                           transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <XCircle size={12} />
                Deactivate all
                {filtered.filter(u => u.isActive).length > 0 && (
                  <span className="bg-slate-500/40 px-1.5 py-0.5 rounded text-[10px]">
                    {filtered.filter(u => u.isActive).length}
                  </span>
                )}
              </button>
            </div>
          ) : bulkStatus === 'done' || bulkStatus === 'stopped' ? (
            /* Done / stopped: show result summary */
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  bulkStatus === 'done' ? 'bg-emerald-100' : 'bg-slate-200'
                }`}>
                  {bulkStatus === 'done'
                    ? <CheckCircle size={12} className="text-emerald-600" />
                    : <X size={11} className="text-slate-500" />}
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  {bulkStatus === 'done' ? 'Completed' : 'Stopped'} —{' '}
                  <span className={bulkTarget ? 'text-emerald-600' : 'text-slate-600'}>
                    {bulkProgress.done} {bulkTarget ? 'activated' : 'deactivated'}
                  </span>
                  {bulkProgress.failed > 0 && (
                    <span className="text-red-500 ml-1">, {bulkProgress.failed} failed</span>
                  )}
                </p>
              </div>
              <button onClick={resetBulk}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                New action
              </button>
            </div>
          ) : (
            /* Running / paused: progress UI */
            <div className="space-y-2">
              {/* Top row: label + count + controls */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {/* Spinning dot when running */}
                  {bulkStatus === 'running' ? (
                    <span className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin flex-shrink-0" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
                  )}
                  <p className="text-xs font-semibold text-slate-700 truncate">
                    {bulkStatus === 'paused' ? 'Paused — ' : ''}
                    {bulkTarget ? 'Activating' : 'Deactivating'}{' '}
                    <span className={bulkTarget ? 'text-emerald-600' : 'text-slate-600'}>
                      {bulkProgress.done}/{bulkProgress.total}
                    </span>
                    {bulkProgress.failed > 0 && (
                      <span className="text-red-500 ml-1">· {bulkProgress.failed} failed</span>
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold tabular-nums flex-shrink-0">
                    {progressPct}%
                  </span>
                </div>

                {/* Pause/Resume + Stop */}
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    onClick={handlePauseResume}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      bulkStatus === 'paused'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                  >
                    {bulkStatus === 'paused'
                      ? <><Play size={11} />Resume</>
                      : <><Pause size={11} />Pause</>}
                  </button>
                  <button
                    onClick={handleStop}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold
                               bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <Square size={10} />Stop
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    bulkStatus === 'paused' ? 'bg-amber-400' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── List ── */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {filtered.length === 0 && !isPending ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <UsersIcon size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">
                {search ? 'No results found' : 'No users here'}
              </p>
              <p className="text-xs text-slate-400">
                {search ? `No match for "${search}"` : 'This category is empty'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {pagedFiltered.map(u => (
                <ModalUserRow key={u.id} u={u}
                  isEditing={inlineEditId === u.id}
                  isSaving={savingId === u.id}
                  inlineForm={inlineForm}
                  onStartEdit={startInlineEdit}
                  onCancelEdit={cancelInlineEdit}
                  onSaveEdit={saveInlineEdit}
                  onChangeForm={handleChangeForm}
                  onToggleStatus={onToggleStatus}
                  onFullEdit={onEditUser}
                  onDelete={onDeleteUser}
                />
              ))}
              {modalHasMore && (
                <button
                  onClick={() => setModalPage(p => p + 1)}
                  className="w-full py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors mt-1"
                >
                  Load {Math.min(MODAL_PAGE_SIZE, filtered.length - pagedFiltered.length)} more
                  <span className="text-slate-400 font-normal ml-1">
                    ({filtered.length - pagedFiltered.length} remaining)
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/60 rounded-b-2xl">
          <p className="text-[11px] text-slate-400">
            Tap <span className="font-semibold text-slate-500">Active/Inactive</span> badge to toggle status
          </p>
          <button onClick={onClose} className="btn-secondary text-xs px-4">
            Close
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ============================================================
// RECENT USERS MODAL — tabbed: Recent Login / Recently Added
// ============================================================
const RecentUsersModal: React.FC<{
  users: WhitelistUser[];
  onClose: () => void;
  onEditUser: (u: WhitelistUser) => void;
}> = ({ users, onClose, onEditUser }) => {
  const [tab, setTab] = useState<'login' | 'added'>('login');

  const DAY_MS  = 24 * 60 * 60 * 1000;
  const WEEK_MS = 7 * DAY_MS;

  const recentLogin = useMemo(() =>
    [...users]
      .filter(u => u.lastLogin > 0)
      .sort((a, b) => b.lastLogin - a.lastLogin)
      .slice(0, 50),
  [users]);

  const recentAdded = useMemo(() =>
    [...users]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50),
  [users]);

  const list = tab === 'login' ? recentLogin : recentAdded;

  const timeLabel = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < DAY_MS)   return 'Today';
    if (diff < WEEK_MS)  return `${Math.floor(diff / DAY_MS)}d ago`;
    return format(new Date(ts), 'dd MMM, HH:mm');
  };

  const weekAgo = Date.now() - WEEK_MS;
  const loginThisWeek = users.filter(u => u.lastLogin > weekAgo).length;
  const addedThisWeek = users.filter(u => u.createdAt > weekAgo).length;

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col animate-scale-in max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-violet-600" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-none">Recent Users</h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 7 days activity</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-3 pb-0 gap-2 flex-shrink-0">
          {([
            { key: 'login' as const, label: 'Recent Login',  count: loginThisWeek, icon: LogIn },
            { key: 'added' as const, label: 'Recently Added', count: addedThisWeek, icon: UserPlus },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 ${
                tab === t.key
                  ? 'bg-white border-violet-500 text-violet-700 shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <t.icon size={13} />
              {t.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                tab === t.key ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
          {/* Tab underline track */}
          <div className="flex-1 border-b-2 border-slate-100" />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 py-3">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                <Clock size={22} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">No activity yet</p>
              <p className="text-xs text-slate-400">
                {tab === 'login' ? 'No users have logged in recently' : 'No users have been added recently'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {list.map((u, i) => {
                const ts        = tab === 'login' ? u.lastLogin : u.createdAt;
                const diff      = Date.now() - ts;
                const isToday   = diff < DAY_MS;
                const isThisWeek = diff < WEEK_MS;
                const initials  = u.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <div key={u.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                    {/* Rank */}
                    <span className="w-5 text-[10px] font-bold text-slate-300 text-right tabular-nums flex-shrink-0">
                      {i + 1}
                    </span>

                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      isToday
                        ? 'bg-violet-100 text-violet-700'
                        : isThisWeek
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}>
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate leading-none">{u.name}</p>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{u.email || '—'}</p>
                    </div>

                    {/* Status badge */}
                    <span className={`badge flex-shrink-0 ${u.isActive ? 'badge-green' : 'badge-slate'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>

                    {/* Timestamp */}
                    <div className="text-right flex-shrink-0 min-w-[56px]">
                      <div className="flex items-center justify-end gap-1">
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
                        <span className={`text-[11px] font-semibold ${
                          isToday ? 'text-violet-600' : isThisWeek ? 'text-blue-600' : 'text-slate-500'
                        }`}>
                          {timeLabel(ts)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 tabular-nums">{format(new Date(ts), 'HH:mm')}</p>
                    </div>

                    {/* Edit (shown on hover) */}
                    <button
                      onClick={() => onEditUser(u)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Edit"
                    >
                      <Edit size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50/60 rounded-b-2xl">
          <p className="text-[11px] text-slate-400">
            Showing top 50 · sorted by{' '}
            <span className="font-semibold text-slate-500">
              {tab === 'login' ? 'last login' : 'date added'}
            </span>
          </p>
          <button onClick={onClose} className="btn-secondary text-xs px-4">Close</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

// ============================================================
// USER MODAL
// ============================================================
const UserModal: React.FC<{
  user: WhitelistUser | null;
  onClose: () => void;
  onSave: (savedUser: WhitelistUser, isEdit: boolean) => void;
  currentUserEmail: string;
}> = ({ user, onClose, onSave, currentUserEmail }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '', email: user?.email || '',
    userId: user?.userId || '', deviceId: user?.deviceId || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (user) {
        await firebaseService.updateWhitelistUser(user.id, formData);
        onSave({ ...user, ...formData }, true);
        toast.success('User updated');
      } else {
        const newUser = await firebaseService.addWhitelistUser(formData as any, currentUserEmail);
        onSave(newUser, false);
        toast.success('User added');
      }
      onClose();
    } catch (error: any) { toast.error(error.message || 'Failed to save user'); }
    finally { setLoading(false); }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">{user ? 'Edit User' : 'Add User'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {([
            { label: 'Name', field: 'name', type: 'text', ph: 'John Doe', req: true, dis: false },
            { label: 'Email (optional)', field: 'email', type: 'email', ph: 'john@example.com', req: false, dis: false },
            { label: 'User ID', field: 'userId', type: 'text', ph: 'user_123', req: true, dis: !!user },
            { label: 'Device ID', field: 'deviceId', type: 'text', ph: 'device_abc123', req: true, dis: false },
          ]).map(({ label, field, type, ph, req, dis }) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
              <input type={type} value={(formData as any)[field]}
                onChange={e => setFormData(f => ({ ...f, [field]: e.target.value }))}
                className="input text-sm" placeholder={ph} required={req} disabled={loading || dis} />
              {field === 'userId' && user && <p className="text-xs text-slate-500 mt-1">User ID cannot be changed</p>}
            </div>
          ))}
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={loading}>Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2 h-10 text-sm">
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
                : <><Save size={18} /><span>{user ? 'Update' : 'Add'}</span></>}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
};

// ============================================================
// IMPORT MODAL
// ============================================================
const ImportModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
  currentUserEmail: string;
  onDownloadTemplate: (format: 'csv' | 'json') => void;
}> = ({ onClose, onSuccess, currentUserEmail, onDownloadTemplate }) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[]; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress({ current: 0, total: 0 });
    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();
      let importResult;
      if (ext === 'json') {
        importResult = await firebaseService.importWhitelistFromJSON(text, currentUserEmail,
          (c, t) => setProgress({ current: c, total: t }));
      } else if (ext === 'csv') {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const users = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i]?.trim() }), {} as any);
        });
        importResult = await firebaseService.bulkImportWhitelistUsers(users, currentUserEmail,
          (c, t) => setProgress({ current: c, total: t }));
      } else {
        toast.error('Unsupported format. Use CSV or JSON.'); setImporting(false); return;
      }
      setResult(importResult);
      if (importResult.success > 0) { toast.success(`Imported ${importResult.success} users`); onSuccess(); }
      if (importResult.failed > 0) toast.error(`${importResult.failed} failed`);
    } catch (error: any) { toast.error(error.message || 'Import failed'); }
    finally { setImporting(false); }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Import Users</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" disabled={importing}><X size={20} /></button>
        </div>
        {!result ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-3">Download template first:</p>
              <div className="flex gap-2">
                <button onClick={() => onDownloadTemplate('csv')}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm h-9">
                  <FileSpreadsheet size={16} /><span>CSV</span>
                </button>
                <button onClick={() => onDownloadTemplate('json')}
                  className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm h-9">
                  <Code size={16} /><span>JSON</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select File</label>
              <input ref={fileInputRef} type="file" accept=".csv,.json"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="input text-sm" disabled={importing} />
              {file && <p className="text-xs text-slate-500 mt-1">Selected: {file.name}</p>}
            </div>
            {importing && (
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">Importing...</span>
                  <span className="text-sm text-slate-600">{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }} />
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={importing}>Cancel</button>
              <button onClick={handleImport} disabled={!file || importing}
                className="flex-1 btn-primary flex items-center justify-center gap-2 h-10 text-sm">
                {importing
                  ? <><Loader className="animate-spin" size={16} /><span>Importing...</span></>
                  : <><Upload size={16} /><span>Start Import</span></>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="card text-center bg-green-50 border-green-200 p-3">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-slate-600 mt-1">Added</p>
              </div>
              <div className="card text-center bg-yellow-50 border-yellow-200 p-3">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-slate-600 mt-1">Skipped</p>
              </div>
              <div className="card text-center bg-red-50 border-red-200 p-3">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-slate-600 mt-1">Failed</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="card bg-red-50 border-red-200 max-h-40 overflow-y-auto p-3 mb-4">
                <p className="font-semibold text-red-900 mb-2 text-xs">Errors:</p>
                <ul className="space-y-0.5">
                  {result.errors.map((e, i) => <li key={i} className="text-xs text-red-800">• {e}</li>)}
                </ul>
              </div>
            )}
            <button onClick={onClose} className="w-full btn-secondary h-10 text-sm">Close</button>
          </>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};

// ============================================================
// DELETE ALL MODAL
// ============================================================
const DeleteAllModal: React.FC<{
  totalUsers: number;
  onClose: () => void;
  onSuccess: () => void;
  isSuperAdmin: boolean;
}> = ({ totalUsers, onClose, onSuccess, isSuperAdmin }) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const CONFIRM_TEXT = 'DELETE ALL';

  const handleDelete = async () => {
    if (!isSuperAdmin) { toast.error('Only super admin allowed'); return; }
    if (confirmText !== CONFIRM_TEXT) { toast.error('Type confirmation text'); return; }
    setDeleting(true);
    setProgress({ current: 0, total: totalUsers });
    try {
      const r = await firebaseService.deleteAllWhitelistUsers(isSuperAdmin,
        (c, t) => setProgress({ current: c, total: t }));
      setResult(r);
      if (r.success > 0) { toast.success(`Deleted ${r.success} users`); onSuccess(); }
      if (r.failed > 0) toast.error(`${r.failed} failed`);
    } catch (error: any) { toast.error(error.message || 'Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Delete All</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg" disabled={deleting}><X size={20} /></button>
        </div>
        {!result ? (
          <>
            <div className="card bg-red-50 border-red-200 mb-5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-red-800">
                  <p className="font-bold mb-1">Delete ALL {totalUsers} users — IRREVERSIBLE</p>
                  <p>Export your data first if needed.</p>
                </div>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Type "<span className="text-red-600 font-mono">{CONFIRM_TEXT}</span>" to confirm:
              </label>
              <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
                className="input text-sm" placeholder={CONFIRM_TEXT} disabled={deleting} autoComplete="off" />
            </div>
            {deleting && (
              <div className="mb-5">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">Deleting...</span>
                  <span className="text-sm">{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }} />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={deleting}>Cancel</button>
              <button onClick={handleDelete} disabled={confirmText !== CONFIRM_TEXT || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 h-10 text-sm">
                {deleting
                  ? <><Loader className="animate-spin" size={16} /><span>Deleting...</span></>
                  : <><Trash2 size={16} /><span>Delete All</span></>}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="card text-center bg-green-50 border-green-200 p-3">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-slate-600 mt-1">Deleted</p>
              </div>
              <div className="card text-center bg-red-50 border-red-200 p-3">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-slate-600 mt-1">Failed</p>
              </div>
            </div>
            <button onClick={onClose} className="w-full btn-primary h-10 text-sm">Close</button>
          </>
        )}
      </div>
    </div>
    </ModalPortal>
  );
};