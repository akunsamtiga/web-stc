import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { WhitelistUser } from '../types';
import {
  Plus, Search, Edit, Trash2, Download, Upload,
  Users as UsersIcon, User as UserIcon, Save, X,
  FileSpreadsheet, Loader,
  Code, AlertTriangle, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// ✅ Debounce hook — prevents re-filtering on every keystroke
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

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
  const [statsModal, setStatsModal] = useState<'total' | 'active' | 'inactive' | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // ✅ Debounced search — 300ms delay, no re-filter on every keystroke
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadUsers();
  }, [user, isSuperAdmin]);

  // ✅ useMemo: filtered list only recomputes when data, filter, or debounced search changes
  const filteredUsers = useMemo(() => {
    let filtered = users;

    if (filter === 'active') filtered = filtered.filter(u => u.isActive);
    else if (filter === 'inactive') filtered = filtered.filter(u => !u.isActive);

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [users, filter, debouncedSearch]);

  // ✅ useMemo: stats computed once, not on every render
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  }), [users]);

  const loadUsers = async () => {
    if (!user?.email) return;
    try {
      const data = await firebaseService.getWhitelistUsers(user.email, isSuperAdmin);
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // ✅ OPTIMIZED: Optimistic delete — remove from local state, no re-fetch
  const handleDelete = useCallback(async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    // Optimistic update: remove immediately from UI
    setUsers(prev => prev.filter(u => u.id !== userId));
    try {
      await firebaseService.deleteWhitelistUser(userId);
      toast.success('User deleted');
    } catch (error) {
      toast.error('Failed to delete user');
      // Rollback: re-fetch if delete failed
      loadUsers();
    }
  }, []);

  // ✅ OPTIMIZED: Optimistic toggle — update local state, no re-fetch
  const handleToggleStatus = useCallback(async (targetUser: WhitelistUser) => {
    const newStatus = !targetUser.isActive;
    // Optimistic update
    setUsers(prev => prev.map(u =>
      u.id === targetUser.id ? { ...u, isActive: newStatus } : u
    ));
    try {
      await firebaseService.updateWhitelistUser(targetUser.id, { isActive: newStatus });
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      toast.error('Failed to update status');
      // Rollback
      setUsers(prev => prev.map(u =>
        u.id === targetUser.id ? { ...u, isActive: targetUser.isActive } : u
      ));
    }
  }, []);

  // ✅ OPTIMIZED: Export from in-memory state — no Firestore re-fetch
  const handleExport = useCallback((fmt: 'json' | 'csv') => {
    let data: string;

    if (fmt === 'json') {
      data = JSON.stringify(users, null, 2);
    } else {
      const headers = ['ID', 'Name', 'Email', 'UserID', 'DeviceID', 'IsActive', 'CreatedAt', 'AddedBy', 'AddedAt'];
      const rows = users.map(u => [
        u.id, u.name || '', u.email || '', u.userId || '',
        u.deviceId || '', u.isActive ? 'true' : 'false',
        new Date(u.createdAt || 0).toISOString(),
        u.addedBy || '', new Date(u.addedAt || 0).toISOString(),
      ].join(','));
      data = [headers.join(','), ...rows].join('\n');
    }

    const blob = new Blob([data], { type: fmt === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${Date.now()}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export successful');
  }, [users]);

  const handleDownloadTemplate = (fmt: 'csv' | 'json') => {
    let data: string;
    let filename: string;
    let type: string;

    if (fmt === 'csv') {
      data = `name,email,userId,deviceId,isActive\nJohn Doe,john@example.com,user_001,device_001,true\nJane Smith,jane@example.com,user_002,device_002,true`;
      filename = 'users-template.csv';
      type = 'text/csv';
    } else {
      data = JSON.stringify([
        { name: 'John Doe', email: 'john@example.com', userId: 'user_001', deviceId: 'device_001', isActive: true },
        { name: 'Jane Smith', email: 'jane@example.com', userId: 'user_002', deviceId: 'device_002', isActive: true },
      ], null, 2);
      filename = 'users-template.json';
      type = 'application/json';
    }

    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${fmt.toUpperCase()} template downloaded`);
  };

  // ✅ Called by UserModal after add/edit — updates local state without re-fetch
  const handleUserSaved = useCallback((savedUser: WhitelistUser, isEdit: boolean) => {
    if (isEdit) {
      setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
    } else {
      setUsers(prev => [savedUser, ...prev]);
    }
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
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Users</h1>
          <p className="text-sm text-slate-600">{filteredUsers.length} of {users.length} users</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 sm:flex-initial btn-secondary flex items-center justify-center gap-2 text-sm h-10"
          >
            <Upload size={18} />
            <span>Import</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial btn-primary flex items-center justify-center gap-2 text-sm h-10"
          >
            <Plus size={18} />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatsModal('total')}
          className="card text-center p-3 hover:border-blue-300 hover:bg-blue-50 transition-all active:scale-[0.98] cursor-pointer"
        >
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Total</p>
          <p className="text-xs text-blue-500 mt-1 font-medium">Lihat semua →</p>
        </button>
        <button
          onClick={() => setStatsModal('active')}
          className="card text-center p-3 hover:border-green-300 hover:bg-green-50 transition-all active:scale-[0.98] cursor-pointer"
        >
          <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-slate-500 mt-1">Active</p>
          <p className="text-xs text-green-500 mt-1 font-medium">Lihat →</p>
        </button>
        <button
          onClick={() => setStatsModal('inactive')}
          className="card text-center p-3 hover:border-red-300 hover:bg-red-50 transition-all active:scale-[0.98] cursor-pointer"
        >
          <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.inactive}</p>
          <p className="text-xs text-slate-500 mt-1">Inactive</p>
          <p className="text-xs text-red-500 mt-1 font-medium">Lihat →</p>
        </button>
      </div>

      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="input pl-10 h-10 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <div className="relative sm:hidden">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`btn-secondary px-4 h-10 ${filter !== 'all' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
              >
                <Filter size={18} />
              </button>
              {showFilterMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                  <div className="absolute right-0 top-12 w-40 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                    {['all', 'active', 'inactive'].map((f) => (
                      <button
                        key={f}
                        onClick={() => { setFilter(f as any); setShowFilterMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          filter === f ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="hidden sm:block input h-10 w-28 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button
              onClick={() => handleExport('csv')}
              className="btn-secondary px-3 h-10"
              title="Export CSV"
            >
              <Download size={18} />
            </button>

            {isSuperAdmin && users.length > 0 && (
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="btn-secondary px-3 h-10 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                title="Delete All"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredUsers.map((u) => (
          <div key={u.id} className="card p-3 sm:p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  u.isActive ? 'bg-green-100' : 'bg-slate-200'
                }`}>
                  <UserIcon className={u.isActive ? 'text-green-600' : 'text-slate-400'} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate text-sm">{u.name}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleStatus(u)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                  u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {u.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="space-y-2 text-xs mb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">User ID:</span>
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{u.userId}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Login:</span>
                <span className="text-slate-700">
                  {u.lastLogin > 0 ? format(new Date(u.lastLogin), 'MMM dd, HH:mm') : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingUser(u)}
                className="flex-1 btn-secondary text-sm h-9 flex items-center justify-center gap-1.5"
              >
                <Edit size={16} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(u.id)}
                className="px-3 h-9 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-16 card">
          <UsersIcon size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 font-medium">No users found</p>
        </div>
      )}

      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => { setShowAddModal(false); setEditingUser(null); }}
          onSave={handleUserSaved}
          currentUserEmail={user?.email || ''}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={loadUsers}
          currentUserEmail={user?.email || ''}
          onDownloadTemplate={handleDownloadTemplate}
        />
      )}

      {showDeleteAllModal && (
        <DeleteAllModal
          totalUsers={users.length}
          onClose={() => setShowDeleteAllModal(false)}
          onSuccess={loadUsers}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {statsModal && (
        <StatsQuickViewModal
          type={statsModal}
          users={users}
          onClose={() => setStatsModal(null)}
          onToggleStatus={handleToggleStatus}
          onEditUser={(u) => { setStatsModal(null); setEditingUser(u); }}
          onDeleteUser={handleDelete}
          onUserSaved={handleUserSaved}
        />
      )}
    </div>
  );
};

// ============================================================
// STATS QUICK VIEW MODAL
// ============================================================
const StatsQuickViewModal: React.FC<{
  type: 'total' | 'active' | 'inactive';
  users: WhitelistUser[];
  onClose: () => void;
  onToggleStatus: (user: WhitelistUser) => void;
  onEditUser: (user: WhitelistUser) => void;
  onDeleteUser: (userId: string) => void;
  onUserSaved: (user: WhitelistUser, isEdit: boolean) => void;
}> = ({ type, users, onClose, onToggleStatus, onEditUser, onDeleteUser, onUserSaved }) => {
  const [search, setSearch] = useState('');
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineForm, setInlineForm] = useState({ name: '', email: '', deviceId: '' });
  const [savingId, setSavingId] = useState<string | null>(null);

  const title = type === 'total' ? 'All Users' : type === 'active' ? 'Active Users' : 'Inactive Users';
  const accentClass = type === 'active' ? 'text-green-600' : type === 'inactive' ? 'text-red-600' : 'text-blue-600';

  const filtered = useMemo(() => {
    let list = type === 'active'
      ? users.filter(u => u.isActive)
      : type === 'inactive'
        ? users.filter(u => !u.isActive)
        : users;

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, type, search]);

  const startInlineEdit = (u: WhitelistUser) => {
    setInlineEditId(u.id);
    setInlineForm({ name: u.name, email: u.email, deviceId: u.deviceId });
  };

  const cancelInlineEdit = () => {
    setInlineEditId(null);
    setInlineForm({ name: '', email: '', deviceId: '' });
  };

  const saveInlineEdit = async (u: WhitelistUser) => {
    if (!inlineForm.name.trim()) { toast.error('Name is required'); return; }
    setSavingId(u.id);
    try {
      await firebaseService.updateWhitelistUser(u.id, inlineForm);
      onUserSaved({ ...u, ...inlineForm }, true);
      toast.success('User updated');
      cancelInlineEdit();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 flex flex-col animate-slide-up sm:animate-scale-in max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <p className={`text-sm font-semibold ${accentClass}`}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or user ID..."
              className="input pl-9 h-9 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* User list */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">{search ? 'No results found' : 'No users in this category'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(u => {
                const isEditing = inlineEditId === u.id;
                const isSaving = savingId === u.id;

                return (
                  <div
                    key={u.id}
                    className={`rounded-xl border transition-all duration-200 ${
                      isEditing
                        ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    {isEditing ? (
                      /* ── Inline edit mode ── */
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <UserIcon className="text-blue-600" size={15} />
                          </div>
                          <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 truncate flex-1">{u.userId}</code>
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Name *</label>
                            <input
                              type="text"
                              value={inlineForm.name}
                              onChange={e => setInlineForm(f => ({ ...f, name: e.target.value }))}
                              className="input h-8 text-xs"
                              placeholder="Full name"
                              disabled={isSaving}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
                            <input
                              type="email"
                              value={inlineForm.email}
                              onChange={e => setInlineForm(f => ({ ...f, email: e.target.value }))}
                              className="input h-8 text-xs"
                              placeholder="email@..."
                              disabled={isSaving}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Device ID</label>
                            <input
                              type="text"
                              value={inlineForm.deviceId}
                              onChange={e => setInlineForm(f => ({ ...f, deviceId: e.target.value }))}
                              className="input h-8 text-xs"
                              placeholder="device_..."
                              disabled={isSaving}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={cancelInlineEdit}
                            disabled={isSaving}
                            className="flex-1 btn-secondary h-8 text-xs flex items-center justify-center gap-1"
                          >
                            <X size={13} />
                            Cancel
                          </button>
                          <button
                            onClick={() => saveInlineEdit(u)}
                            disabled={isSaving}
                            className="flex-1 btn-primary h-8 text-xs flex items-center justify-center gap-1"
                          >
                            {isSaving ? (
                              <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                            ) : (
                              <><Save size={13} />Save</>
                            )}
                          </button>
                          <button
                            onClick={() => { cancelInlineEdit(); onEditUser(u); }}
                            className="px-3 h-8 btn-secondary text-xs flex items-center gap-1"
                            title="Full edit"
                          >
                            <Edit size={13} />
                            <span className="hidden sm:inline">Full</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── View mode ── */
                      <div className="flex items-center gap-3 p-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          u.isActive ? 'bg-green-100' : 'bg-slate-100'
                        }`}>
                          <UserIcon className={u.isActive ? 'text-green-600' : 'text-slate-400'} size={16} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email || '—'}</p>
                          <code className="text-xs text-slate-400">{u.userId}</code>
                        </div>

                        {/* Quick toggle status badge */}
                        <button
                          onClick={() => onToggleStatus(u)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-all hover:opacity-80 active:scale-95 ${
                            u.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                          }`}
                          title={`Click to ${u.isActive ? 'deactivate' : 'activate'}`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </button>

                        {/* Action buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startInlineEdit(u)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 transition-colors"
                            title="Quick edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => { onClose(); setTimeout(() => onDeleteUser(u.id), 50); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Klik badge <span className="font-semibold">Active/Inactive</span> untuk toggle status langsung
          </p>
          <button onClick={onClose} className="btn-secondary h-9 px-4 text-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// USER MODAL
// ============================================================
const UserModal: React.FC<{
  user: WhitelistUser | null;
  onClose: () => void;
  // ✅ Now accepts the saved user for optimistic state update
  onSave: (savedUser: WhitelistUser, isEdit: boolean) => void;
  currentUserEmail: string;
}> = ({ user, onClose, onSave, currentUserEmail }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    userId: user?.userId || '',
    deviceId: user?.deviceId || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Edit: update Firestore, then build updated user for optimistic state
        await firebaseService.updateWhitelistUser(user.id, formData);
        const updatedUser: WhitelistUser = { ...user, ...formData };
        toast.success('User updated');
        onSave(updatedUser, true);
      } else {
        // Add: get full user object back from service (includes id, createdAt, etc.)
        const newUser = await firebaseService.addWhitelistUser(formData as any, currentUserEmail);
        toast.success('User added');
        onSave(newUser, false);
      }
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            {user ? 'Edit User' : 'Add User'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input text-sm"
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email (optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input text-sm"
              placeholder="john@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">User ID</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="input text-sm"
              placeholder="user_123"
              required
              disabled={loading || !!user}
            />
            {user && <p className="text-xs text-slate-500 mt-1">User ID cannot be changed</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Device ID</label>
            <input
              type="text"
              value={formData.deviceId}
              onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
              className="input text-sm"
              placeholder="device_abc123"
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2 h-10 text-sm">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{user ? 'Update' : 'Add'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
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
  const [result, setResult] = useState<{
    success: number; failed: number; errors: string[]; skipped: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress({ current: 0, total: 0 });

    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();
      let importResult;

      if (ext === 'json') {
        importResult = await firebaseService.importWhitelistFromJSON(
          text, currentUserEmail,
          (current, total) => setProgress({ current, total })
        );
      } else if (ext === 'csv') {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const users = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, h, i) => ({ ...obj, [h]: values[i]?.trim() }), {} as any);
        });
        importResult = await firebaseService.bulkImportWhitelistUsers(
          users, currentUserEmail,
          (current, total) => setProgress({ current, total })
        );
      } else {
        toast.error('Unsupported file format. Use CSV or JSON.');
        setImporting(false);
        return;
      }

      setResult(importResult);
      if (importResult.success > 0) {
        toast.success(`Imported ${importResult.success} users`);
        onSuccess();
      }
      if (importResult.failed > 0) toast.error(`${importResult.failed} failed`);
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Import Users</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={importing}>
            <X size={20} />
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-3">Download a template first:</p>
              <div className="flex gap-2">
                <button onClick={() => onDownloadTemplate('csv')} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm h-9">
                  <FileSpreadsheet size={16} />
                  <span>CSV Template</span>
                </button>
                <button onClick={() => onDownloadTemplate('json')} className="flex-1 btn-secondary flex items-center justify-center gap-2 text-sm h-9">
                  <Code size={16} />
                  <span>JSON Template</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select File</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="input text-sm"
                disabled={importing}
              />
              {file && <p className="text-xs text-slate-500 mt-1">Selected: {file.name}</p>}
            </div>

            {importing && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Importing...</span>
                  <span className="text-sm text-slate-600">{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={importing}>Cancel</button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 btn-primary flex items-center justify-center gap-2 h-10 text-sm"
              >
                {importing ? (
                  <><Loader className="animate-spin" size={16} /><span>Importing...</span></>
                ) : (
                  <><Upload size={16} /><span>Start Import</span></>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-3 gap-2">
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
                <div className="card bg-red-50 border-red-200 max-h-40 overflow-y-auto p-3">
                  <p className="font-semibold text-red-900 mb-2 text-xs">Errors:</p>
                  <ul className="space-y-0.5">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-xs text-red-800">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm">Close</button>
            </div>
          </>
        )}
      </div>
    </div>
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
      const deleteResult = await firebaseService.deleteAllWhitelistUsers(
        isSuperAdmin,
        (current, total) => setProgress({ current, total })
      );
      setResult(deleteResult);
      if (deleteResult.success > 0) { toast.success(`Deleted ${deleteResult.success} users`); onSuccess(); }
      if (deleteResult.failed > 0) toast.error(`${deleteResult.failed} failed`);
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Delete All</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={deleting}>
            <X size={20} />
          </button>
        </div>

        {!result ? (
          <>
            <div className="card bg-red-50 border-red-200 mb-5 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <h3 className="font-bold text-red-900 mb-2 text-sm">⚠️ WARNING ⚠️</h3>
                  <div className="text-xs text-red-800 space-y-1">
                    <p className="font-semibold">Delete ALL {totalUsers} users!</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>This is IRREVERSIBLE</li>
                      <li>Export data first if needed</li>
                      <li>May take several minutes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Type "<span className="text-red-600 font-mono">{CONFIRM_TEXT}</span>" to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input text-sm"
                placeholder={CONFIRM_TEXT}
                disabled={deleting}
                autoComplete="off"
              />
            </div>

            {deleting && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Deleting...</span>
                  <span className="text-sm text-slate-600">{progress.current} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={deleting}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== CONFIRM_TEXT || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-10 text-sm"
              >
                {deleting ? (
                  <><Loader className="animate-spin" size={16} /><span>Deleting...</span></>
                ) : (
                  <><Trash2 size={16} /><span>Delete All</span></>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="card text-center bg-green-50 border-green-200 p-3">
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-slate-600 mt-1">Deleted</p>
                </div>
                <div className="card text-center bg-red-50 border-red-200 p-3">
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-xs text-slate-600 mt-1">Failed</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="card bg-red-50 border-red-200 max-h-40 overflow-y-auto p-3">
                  <p className="font-semibold text-red-900 mb-2 text-xs">Errors:</p>
                  <ul className="space-y-0.5">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-xs text-red-800">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={onClose} className="w-full btn-primary h-10 text-sm">Close</button>
          </>
        )}
      </div>
    </div>
  );
};