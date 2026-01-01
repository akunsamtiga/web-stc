import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { AdminUser } from '../types';
import { Plus, Edit, Trash2, Shield, UserCog, Mail, Hash, User as UserIcon, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const Admins: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const data = await firebaseService.getAdminUsers();
      setAdmins(data);
    } catch (error) {
      toast.error('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can delete admins');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this admin? This action cannot be undone.')) return;
    
    try {
      await firebaseService.deleteAdminUser(adminId);
      toast.success('Admin deleted successfully');
      loadAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete admin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-accent-primary/30 rounded-full animate-spin border-t-accent-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">Admin Management</h1>
          <p className="text-slate-400">
            <span className="text-accent-primary font-semibold">{admins.length}</span> administrators
          </p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary flex items-center justify-center gap-2 px-6 py-3 shadow-xl shadow-accent-primary/25 hover:shadow-2xl hover:shadow-accent-primary/30 hover:scale-105 transition-all"
          >
            <Plus size={20} />
            <span className="font-semibold">Add Admin</span>
          </button>
        )}
      </div>

      {/* Super Admin Only Notice */}
      {!isSuperAdmin && (
        <div className="card backdrop-blur-sm bg-yellow-500/10 border-yellow-500/30 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-yellow-500 mb-1">View-Only Access</h3>
              <p className="text-sm text-yellow-500/80">
                Only super administrators can add, edit, or remove admin accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {admins.map((admin, index) => {
          const isSuperAdminUser = admin.role === 'super_admin';
          const isCurrentUser = admin.email === user?.email;
          
          return (
            <div 
              key={admin.id} 
              className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 hover:border-slate-700 shadow-xl hover:shadow-2xl transition-all group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="relative">
                  <div className={`absolute inset-0 ${
                    isSuperAdminUser ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                  } rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                  <div className={`relative w-14 h-14 rounded-2xl ${
                    isSuperAdminUser ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-blue-500/20 border border-blue-500/30'
                  } flex items-center justify-center transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                    {isSuperAdminUser ? (
                      <Shield className="text-yellow-500" size={28} strokeWidth={2.5} />
                    ) : (
                      <UserCog className="text-blue-500" size={28} strokeWidth={2.5} />
                    )}
                  </div>
                </div>
                
                {isSuperAdmin && !isCurrentUser && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingAdmin(admin)}
                      className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all hover:scale-110"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all hover:scale-110"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                )}
                
                {isCurrentUser && (
                  <span className="px-3 py-1 bg-accent-primary/20 text-accent-primary text-xs font-semibold rounded-lg border border-accent-primary/30">
                    You
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{admin.name}</h3>
                  <p className="text-sm text-slate-400 break-all">{admin.email}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-dark-hover/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Role</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                      isSuperAdminUser
                        ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                        : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                    }`}>
                      {isSuperAdminUser ? (
                        <>
                          <Shield size={12} />
                          <span>Super</span>
                        </>
                      ) : (
                        <>
                          <UserCog size={12} />
                          <span>Admin</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="p-3 bg-dark-hover/30 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                      admin.isActive
                        ? 'bg-green-500/20 text-green-500 border border-green-500/30'
                        : 'bg-red-500/20 text-red-500 border border-red-500/30'
                    }`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Info */}
              <div className="pt-4 border-t border-slate-800/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-400 font-medium">
                    {format(new Date(admin.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Last Login</span>
                  <span className="text-slate-400 font-medium">
                    {admin.lastLogin > 0 
                      ? format(new Date(admin.lastLogin), 'MMM dd, HH:mm')
                      : 'Never'
                    }
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {admins.length === 0 && (
        <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl text-center py-16">
          <UserCog size={64} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 text-lg">No administrators found</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingAdmin) && (
        <AdminModal
          admin={editingAdmin}
          onClose={() => {
            setShowAddModal(false);
            setEditingAdmin(null);
          }}
          onSave={loadAdmins}
          currentUserEmail={user?.email || ''}
        />
      )}
    </div>
  );
};

// Admin Modal Component
const AdminModal: React.FC<{
  admin: AdminUser | null;
  onClose: () => void;
  onSave: () => void;
  currentUserEmail: string;
}> = ({ admin, onClose, onSave, currentUserEmail }) => {
  const [formData, setFormData] = useState({
    name: admin?.name || '',
    email: admin?.email || '',
    userId: admin?.userId || '',
    role: admin?.role || ('admin' as 'admin' | 'super_admin'),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (admin) {
        await firebaseService.updateAdminUser(admin.id, formData);
        toast.success('Admin updated successfully');
      } else {
        await firebaseService.addAdminUser(formData as any, currentUserEmail);
        toast.success('Admin added successfully');
      }
      onSave();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-md w-full backdrop-blur-xl bg-dark-card/90 border-slate-800/50 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 rounded-xl flex items-center justify-center">
              <UserCog className="text-accent-primary" size={20} />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {admin ? 'Edit Admin' : 'Add New Admin'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">Full Name</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors" size={18} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input pl-11 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all"
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
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors" size={18} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input pl-11 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all"
                placeholder="admin@example.com"
                required
                disabled={loading || !!admin}
              />
            </div>
            {admin && (
              <p className="text-xs text-slate-500">Email cannot be changed after creation</p>
            )}
          </div>

          {/* User ID Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">User ID (UID)</label>
            <div className="relative group">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors" size={18} />
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="input pl-11 h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all"
                placeholder="Firebase UID"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Role Field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="input h-12 bg-dark-hover/50 border-slate-700 focus:border-accent-primary cursor-pointer"
              disabled={loading}
            >
              <option value="admin">Regular Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <p className="text-xs text-slate-500">
              Super admins have full access to all features
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 btn-secondary py-3 hover:border-slate-600 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading} 
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>{admin ? 'Update Admin' : 'Add Admin'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};