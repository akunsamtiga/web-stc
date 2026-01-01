import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { AdminUser } from '../types';
import { Plus, Edit, Trash2, Shield, UserCog, Mail, User as UserIcon, Save, X, AlertCircle, Hash } from 'lucide-react';
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
    
    if (!confirm('Delete this admin? This cannot be undone.')) return;
    
    try {
      await firebaseService.deleteAdminUser(adminId);
      toast.success('Admin deleted');
      loadAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete admin');
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Admins</h1>
          <p className="text-slate-600">{admins.length} administrators</p>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn-primary flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
          >
            <Plus size={18} />
            <span>Add Admin</span>
          </button>
        )}
      </div>

      {/* Warning for non-super admin */}
      {!isSuperAdmin && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-yellow-900 mb-1">View Only</h3>
              <p className="text-sm text-yellow-800">
                Only super administrators can add, edit, or remove admin accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => {
          const isSuperAdminUser = admin.role === 'super_admin';
          const isCurrentUser = admin.email === user?.email;
          
          return (
            <div key={admin.id} className="card hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isSuperAdminUser ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {isSuperAdminUser ? (
                    <Shield className="text-yellow-600" size={24} />
                  ) : (
                    <UserCog className="text-blue-600" size={24} />
                  )}
                </div>
                
                {isCurrentUser && (
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                    You
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="space-y-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{admin.name}</h3>
                  <p className="text-sm text-slate-600 break-all">{admin.email}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Role</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                      isSuperAdminUser
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {isSuperAdminUser ? 'Super' : 'Admin'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Status</p>
                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                      admin.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-medium">{format(new Date(admin.createdAt), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Login</span>
                  <span className="font-medium">
                    {admin.lastLogin > 0 
                      ? format(new Date(admin.lastLogin), 'MMM dd, HH:mm')
                      : 'Never'
                    }
                  </span>
                </div>
              </div>

              {/* Actions */}
              {isSuperAdmin && !isCurrentUser && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => setEditingAdmin(admin)}
                    className="flex-1 btn-secondary text-sm h-9"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="px-3 h-9 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {admins.length === 0 && (
        <div className="card text-center py-16">
          <UserCog size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No administrators found</p>
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
        toast.success('Admin updated');
      } else {
        await firebaseService.addAdminUser(formData as any, currentUserEmail);
        toast.success('Admin added');
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {admin ? 'Edit Admin' : 'Add Admin'}
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
            <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
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
              placeholder="admin@example.com"
              required
              disabled={loading || !!admin}
            />
            {admin && (
              <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">User ID (UID)</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="input"
              placeholder="Firebase UID"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="input"
              disabled={loading}
            >
              <option value="admin">Regular Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Super admins have full access to all features
            </p>
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
                  <span>{admin ? 'Update' : 'Add'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};