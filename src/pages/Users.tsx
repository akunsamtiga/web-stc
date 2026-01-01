import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { WhitelistUser } from '../types';
import { 
  Plus, Search, Edit, Trash2, Download, Upload,
  CheckCircle, XCircle, Filter, Users as UsersIcon,
  Mail, User as UserIcon, Hash, Smartphone,
  Save, X, Calendar, Clock
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

    if (filter === 'active') {
      filtered = filtered.filter(u => u.isActive);
    } else if (filter === 'inactive') {
      filtered = filtered.filter(u => !u.isActive);
    }

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
    if (!confirm('Delete this user? This cannot be undone.')) return;
    
    try {
      await firebaseService.deleteWhitelistUser(userId);
      toast.success('User deleted');
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
      a.download = `users-${Date.now()}.${format}`;
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
        <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
            Users
          </h1>
          <p className="text-slate-600">
            {filteredUsers.length} of {users.length} users
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-600 mt-1">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-slate-600 mt-1">Active</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
          <p className="text-xs text-slate-600 mt-1">Inactive</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="input pl-10 h-11"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="input h-11 w-32"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button 
              onClick={() => handleExport('csv')} 
              className="btn-secondary px-3 h-11"
              title="Export CSV"
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Users List - Card View for Mobile, Table for Desktop */}
      <div className="space-y-3">
        {/* Mobile View */}
        <div className="sm:hidden space-y-3">
          {filteredUsers.map((user) => (
            <div key={user.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    user.isActive ? 'bg-green-100' : 'bg-slate-200'
                  }`}>
                    <UserIcon className={user.isActive ? 'text-green-600' : 'text-slate-400'} size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                    <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleStatus(user)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${
                    user.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">User ID:</span>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {user.userId}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Last Login:</span>
                  <span className="text-slate-700">
                    {user.lastLogin > 0 
                      ? format(new Date(user.lastLogin), 'MMM dd, HH:mm')
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setEditingUser(user)}
                  className="flex-1 btn-secondary text-sm h-9"
                >
                  <Edit size={16} />
                  <span className="ml-2">Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="px-3 h-9 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          user.isActive ? 'bg-green-100' : 'bg-slate-200'
                        }`}>
                          <UserIcon className={user.isActive ? 'text-green-600' : 'text-slate-400'} size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{user.name}</p>
                          <p className="text-sm text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {user.userId}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                          user.isActive 
                            ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.lastLogin > 0 
                        ? format(new Date(user.lastLogin), 'MMM dd, yyyy HH:mm')
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-16">
              <UsersIcon size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No users found</p>
            </div>
          )}
        </div>

        {/* Mobile Empty State */}
        {filteredUsers.length === 0 && (
          <div className="sm:hidden text-center py-16 card">
            <UsersIcon size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No users found</p>
          </div>
        )}
      </div>

      {/* Modals */}
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
        toast.success('User updated');
      } else {
        await firebaseService.addWhitelistUser(formData as any, currentUserEmail);
        toast.success('User added');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {user ? 'Edit User' : 'Add User'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
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
              className="input"
              placeholder="John Doe"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="john@example.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">User ID</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="input"
              placeholder="user_123"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Device ID</label>
            <input
              type="text"
              value={formData.deviceId}
              onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
              className="input"
              placeholder="device_abc"
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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