import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { AdminUser } from '../types';
import {
  Plus, Edit, Trash2, UserCog, Save, X,
  Crown, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const Admins: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [admins, setAdmins]         = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingAdmin, setEditingAdmin]   = useState<AdminUser | null>(null);

  useEffect(() => { loadAdmins(); }, []);

  const loadAdmins = async () => {
    try {
      setAdmins(await firebaseService.getAdminUsers());
    } catch { toast.error('Failed to load admins'); }
    finally  { setLoading(false); }
  };

  const handleDelete = async (adminId: string) => {
    if (!isSuperAdmin) { toast.error('Only super admins can delete'); return; }
    if (!confirm('Delete this admin? This cannot be undone.')) return;
    try {
      await firebaseService.deleteAdminUser(adminId);
      toast.success('Admin deleted');
      loadAdmins();
    } catch (error: any) { toast.error(error.message || 'Failed to delete'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5">Admins</h1>
          <p className="text-xs text-slate-400">{admins.length} administrator{admins.length !== 1 ? 's' : ''}</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus size={14} />
            Add Admin
          </button>
        )}
      </div>

      {/* View-only notice */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900">View only</p>
            <p className="text-xs text-amber-700 mt-0.5">Only super admins can manage admin accounts.</p>
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {admins.map(admin => {
          const isSuper       = admin.role === 'super_admin';
          const isCurrentUser = admin.email === user?.email;
          return (
            <div key={admin.id} className="card p-4 hover:shadow-md transition-shadow duration-200">
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isSuper ? 'bg-amber-50' : 'bg-blue-50'
                }`}>
                  {isSuper
                    ? <Crown size={16} className="text-amber-600" />
                    : <UserCog size={16} className="text-blue-600" />}
                </div>
                {isCurrentUser && (
                  <span className="badge-blue">You</span>
                )}
              </div>

              {/* Info */}
              <div className="mb-4">
                <p className="text-sm font-bold text-slate-900 mb-0.5">{admin.name}</p>
                <p className="text-xs text-slate-500 break-all">{admin.email}</p>
              </div>

              {/* Badges */}
              <div className="flex gap-2 mb-4">
                <span className={isSuper ? 'badge-yellow' : 'badge-blue'}>
                  {isSuper ? 'Super Admin' : 'Admin'}
                </span>
                <span className={admin.isActive ? 'badge-green' : 'badge-slate'}>
                  {admin.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Dates */}
              <div className="pt-3 border-t border-slate-100 space-y-1">
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400">Created</span>
                  <span className="text-[11px] font-medium text-slate-600">
                    {format(new Date(admin.createdAt), 'dd MMM yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-slate-400">Last login</span>
                  <span className="text-[11px] font-medium text-slate-600">
                    {admin.lastLogin > 0
                      ? format(new Date(admin.lastLogin), 'dd MMM, HH:mm')
                      : 'Never'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {isSuperAdmin && !isCurrentUser && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setEditingAdmin(admin)}
                    className="btn-secondary flex-1"
                  >
                    <Edit size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {admins.length === 0 && (
        <div className="card text-center py-16">
          <UserCog size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">No administrators found</p>
        </div>
      )}

      {(showAddModal || editingAdmin) && (
        <AdminModal
          admin={editingAdmin}
          onClose={() => { setShowAddModal(false); setEditingAdmin(null); }}
          onSave={loadAdmins}
          currentUserEmail={user?.email || ''}
        />
      )}
    </div>
  );
};

// ─── Admin Modal ─────────────────────────────────────────────
const AdminModal: React.FC<{
  admin: AdminUser | null;
  onClose: () => void;
  onSave: () => void;
  currentUserEmail: string;
}> = ({ admin, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name:   admin?.name   || '',
    email:  admin?.email  || '',
    userId: admin?.userId || '',
    role:   admin?.role   || ('admin' as 'admin' | 'super_admin'),
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
        await firebaseService.addAdminUser(formData as any, formData.email);
        toast.success('Admin added');
      }
      onSave();
      onClose();
    } catch (error: any) { toast.error(error.message || 'Operation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-slate-900">
            {admin ? 'Edit Admin' : 'Add Admin'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Full Name', field: 'name', type: 'text', ph: 'John Doe', dis: false },
            { label: 'Email', field: 'email', type: 'email', ph: 'admin@example.com', dis: !!admin },
            { label: 'User ID (Firebase UID)', field: 'userId', type: 'text', ph: 'Firebase UID', dis: false },
          ].map(({ label, field, type, ph, dis }) => (
            <div key={field}>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {label}
              </label>
              <input
                type={type}
                value={(formData as any)[field]}
                onChange={e => setFormData(f => ({ ...f, [field]: e.target.value }))}
                className="input"
                placeholder={ph}
                required
                disabled={loading || dis}
              />
              {field === 'email' && admin && (
                <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed</p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={formData.role}
              onChange={e => setFormData(f => ({ ...f, role: e.target.value as any }))}
              className="input"
              disabled={loading}
            >
              <option value="admin">Regular Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              ) : (
                <><Save size={13} />{admin ? 'Update' : 'Add'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};