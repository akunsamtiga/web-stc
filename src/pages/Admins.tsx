import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { AdminUser } from '../types';
import { Plus, Edit, Trash2, Shield, UserCog } from 'lucide-react';
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
    
    if (!confirm('Are you sure you want to delete this admin?')) return;
    
    try {
      await firebaseService.deleteAdminUser(adminId);
      toast.success('Admin deleted successfully');
      loadAdmins();
    } catch (error) {
      toast.error('Failed to delete admin');
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Management</h1>
          <p className="text-slate-400">{admins.length} admins</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} />
            Add Admin
          </button>
        )}
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {admins.map((admin) => (
          <div key={admin.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                admin.role === 'super_admin' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
              }`}>
                {admin.role === 'super_admin' ? (
                  <Shield className="text-yellow-500" size={24} />
                ) : (
                  <UserCog className="text-blue-500" size={24} />
                )}
              </div>
              
              {isSuperAdmin && admin.email !== user?.email && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingAdmin(admin)}
                    className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold text-white mb-1">{admin.name}</h3>
            <p className="text-sm text-slate-400 mb-3">{admin.email}</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Role:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  admin.role === 'super_admin'
                    ? 'bg-yellow-500/20 text-yellow-500'
                    : 'bg-blue-500/20 text-blue-500'
                }`}>
                  {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Status:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  admin.isActive
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-red-500/20 text-red-500'
                }`}>
                  {admin.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-800">
                <span className="text-slate-400">Created:</span>
                <span className="text-slate-300">{format(new Date(admin.createdAt), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {admins.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400">No admins found</p>
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
    role: admin?.role || 'admin',
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-6">
          {admin ? 'Edit Admin' : 'Add New Admin'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">User ID</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="input"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">
              {loading ? 'Saving...' : admin ? 'Update' : 'Add Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};