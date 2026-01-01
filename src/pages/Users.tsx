import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { WhitelistUser } from '../types';
import { 
  Plus, Search, Edit, Trash2, Download, 
  CheckCircle, XCircle, Filter, Users as UsersIcon,
  Mail, User as UserIcon, Hash, Smartphone,
  Save, X, Calendar, Clock, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const Users: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<WhitelistUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<WhitelistUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<WhitelistUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    loadUsers();
  }, [user, isSuperAdmin]);

  useEffect(() => {
    let filtered = users;

    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter(u => u.isActive);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(u => !u.isActive);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.userId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, filter]);

  const loadUsers = async () => {
    if (!user?.email) return;
    
    try {
      const data = await firebaseService.getWhitelistUsers(user.email, isSuperAdmin);
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await firebaseService.deleteWhitelistUser(userId);
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (user: WhitelistUser) => {
    try {
      await firebaseService.updateWhitelistUser(user.id, { isActive: !user.isActive });
      toast.success(`User ${!user.isActive ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const data = format === 'json' 
        ? await firebaseService.exportWhitelistAsJSON()
        : await firebaseService.exportWhitelistAsCSV();
      
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whitelist-export-${Date.now()}.${format}`;
      a.click();
      
      toast.success('Export successful');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  };

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Whitelist Users
          </h1>
          <p className="text-slate-400 text-base sm:text-lg">
            Managing <span className="text-accent-primary font-semibold">{filteredUsers.length}</span> of <span className="text-accent-primary font-semibold">{users.length}</span> users
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn-primary flex items-center justify-center gap-2 px-6 py-3 shadow-xl shadow-accent-primary/25 hover:shadow-2xl hover:shadow-accent-primary/30 hover:scale-105 transition-all"
        >
          <Plus size={20} />
          <span className="font-semibold">Add User</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-slate-400 mt-1">Total Users</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <UsersIcon className="text-blue-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 hover:border-green-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{stats.active}</p>
              <p className="text-sm text-slate-400 mt-1">Active Users</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center border border-green-500/30">
                <CheckCircle className="text-green-500" size={24} />
              </div>
            </div>
          </div>
        </div>

        <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 hover:border-red-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-white">{stats.inactive}</p>
              <p className="text-sm text-slate-400 mt-1">Inactive Users</p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                <XCircle className="text-red-500" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or user ID..."
                className="input pl-12 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all w-full"
              />
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-dark-hover/30 rounded-lg">
              <Filter size={18} className="text-slate-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="bg-transparent text-slate-300 text-sm font-medium outline-none cursor-pointer"
              >
                <option value="all">All Users</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button 
                onClick={() => handleExport('json')} 
                className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm"
                title="Export as JSON"
              >
                <Download size={16} />
                <span className="hidden sm:inline">JSON</span>
              </button>
              <button 
                onClick={() => handleExport('csv')} 
                className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm"
                title="Export as CSV"
              >
                <Download size={16} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-hover/50 border-b border-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">User ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Device ID</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredUsers.map((user, index) => (
                <tr 
                  key={user.id} 
                  className="hover:bg-dark-hover/30 transition-all group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        user.isActive 
                          ? 'bg-green-500/20 border border-green-500/30' 
                          : 'bg-red-500/20 border border-red-500/30'
                      }`}>
                        <UserIcon className={user.isActive ? 'text-green-500' : 'text-red-500'} size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{user.name}</p>
                        <p className="text-sm text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-dark-hover/50 px-2 py-1 rounded text-accent-primary border border-slate-700/50">
                      {user.userId}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-dark-hover/50 px-2 py-1 rounded text-slate-400 border border-slate-700/50">
                      {user.deviceId || 'N/A'}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        user.isActive 
                          ? 'bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30' 
                          : 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30'
                      }`}
                    >
                      {user.isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      <span>{user.isActive ? 'Active' : 'Inactive'}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Calendar size={14} className="text-slate-500" />
                      <span>{format(new Date(user.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Clock size={14} className="text-slate-500" />
                      <span>
                        {user.lastLogin > 0 
                          ? format(new Date(user.lastLogin), 'MMM dd, HH:mm')
                          : 'Never'
                        }
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all hover:scale-110"
                        title="Edit user"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all hover:scale-110"
                        title="Delete user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <UsersIcon size={64} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-400 text-lg font-medium mb-2">No users found</p>
              <p className="text-slate-500 text-sm">
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your filters or search query'
                  : 'Add your first user to get started'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingUser) && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowAddModal(false);
            setEditingUser(null);
          }}
          onSave={loadUsers}
          currentUserEmail={user?.email || ''}
        />
      )}
    </div>
  );
};

// User Modal Component
const UserModal: React.FC<{
  user: WhitelistUser | null;
  onClose: () => void;
  onSave: () => void;
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
        await firebaseService.updateWhitelistUser(user.id, formData);
        toast.success('User updated successfully');
      } else {
        await firebaseService.addWhitelistUser(formData as any, currentUserEmail);
        toast.success('User added successfully');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(user ? 'Failed to update user' : 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-2xl w-full backdrop-blur-xl bg-dark-card/90 border-slate-800/50 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent-primary/20 rounded-xl blur-lg"></div>
              <div className="relative w-12 h-12 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-xl flex items-center justify-center border border-accent-primary/30">
                <UsersIcon className="text-accent-primary" size={24} />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {user ? 'Edit User' : 'Add New User'}
              </h2>
              <p className="text-sm text-slate-400">
                {user ? 'Update user information' : 'Create a new whitelist user'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">Full Name</label>
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={18} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input pl-12 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all w-full"
                  placeholder="John Doe"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={18} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input pl-12 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all w-full"
                  placeholder="john@example.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* User ID Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">User ID</label>
              <div className="relative group">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={18} />
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="input pl-12 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all w-full"
                  placeholder="user_123456"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Device ID Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-300">Device ID</label>
              <div className="relative group">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={18} />
                <input
                  type="text"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="input pl-12 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all w-full"
                  placeholder="device_abc123"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <TrendingUp className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-slate-300">
                <p className="font-semibold text-blue-400 mb-1">Important Information:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-xs">
                  <li>User will be activated by default upon creation</li>
                  <li>Ensure all information is accurate before saving</li>
                  <li>User ID and Device ID must be unique</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 btn-secondary py-3 hover:border-slate-600"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{user ? 'Update User' : 'Add User'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};