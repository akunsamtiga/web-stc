import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { WhitelistUser } from '../types';
import { 
  Plus, Search, Edit, Trash2, Download, Upload,
  CheckCircle, XCircle, Filter, Users as UsersIcon,
  Mail, User as UserIcon, Hash, Smartphone,
  Save, X, Calendar, Clock, FileText, AlertCircle,
  FileSpreadsheet, Loader, Code, AlertTriangle
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
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
      URL.revokeObjectURL(url);
      
      toast.success('Export successful');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleDownloadTemplate = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      const template = `name,email,userId,deviceId,isActive
John Doe,john@example.com,user_001,device_001,true
Jane Smith,jane@example.com,user_002,device_002,true
No Email,,user_003,device_003,true`;
      
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const template = JSON.stringify([
        {
          name: "John Doe",
          email: "john@example.com",
          userId: "user_001",
          deviceId: "device_001",
          isActive: true
        },
        {
          name: "Jane Smith",
          email: "jane@example.com",
          userId: "user_002",
          deviceId: "device_002",
          isActive: true
        },
        {
          name: "No Email User",
          email: "",
          userId: "user_003",
          deviceId: "device_003",
          isActive: true
        }
      ], null, 2);
      
      const blob = new Blob([template], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users-template.json';
      a.click();
      URL.revokeObjectURL(url);
    }
    
    toast.success(`${format.toUpperCase()} template downloaded`);
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
            onClick={() => setShowImportModal(true)} 
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload size={18} />
            <span>Import</span>
          </button>
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
            <button 
              onClick={() => handleExport('json')} 
              className="btn-secondary px-3 h-11"
              title="Export JSON"
            >
              <Code size={18} />
            </button>
            {isSuperAdmin && users.length > 0 && (
              <button 
                onClick={() => setShowDeleteAllModal(true)} 
                className="btn-secondary px-3 h-11 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                title="Delete All Users"
              >
                <Trash2 size={18} />
              </button>
            )}
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
              placeholder="john@example.com (optional)"
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty if no email</p>
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

// Import Modal Component
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
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileFormat, setFileFormat] = useState<'csv' | 'json' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'json') {
        toast.error('Please upload a CSV or JSON file');
        return;
      }
      setFile(selectedFile);
      setFileFormat(ext as 'csv' | 'json');
      setResult(null);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const users = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const user: any = {};
      
      headers.forEach((header, index) => {
        if (header === 'isactive') {
          user[header] = values[index]?.toLowerCase() === 'true';
        } else if (header === 'email') {
          user[header] = values[index] || '';
        } else {
          user[header] = values[index];
        }
      });
      
      users.push(user);
    }

    return users;
  };

  const parseJSON = (text: string): any[] => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON must be an array of user objects');
      }
      
      const requiredFields = ['name', 'userId', 'deviceId'];
      const validated = parsed.map((user, index) => {
        requiredFields.forEach(field => {
          if (!user[field]) {
            throw new Error(`Row ${index + 1}: Missing required field "${field}"`);
          }
        });
        return {
          ...user,
          email: user.email || '',
          isActive: user.isActive !== undefined ? Boolean(user.isActive) : true
        };
      });
      
      return validated;
    } catch (error: any) {
      throw new Error(`JSON parsing error: ${error.message}`);
    }
  };

  const handleImport = async () => {
    if (!file || !fileFormat) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);
    setProgress({ current: 0, total: 0 });

    try {
      const text = await file.text();
      const users = fileFormat === 'csv' ? parseCSV(text) : parseJSON(text);

      if (users.length === 0) {
        toast.error('No valid users found in file');
        return;
      }

      setProgress({ current: 0, total: users.length });

      const importResult = await firebaseService.bulkImportWhitelistUsers(
        users,
        currentUserEmail,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      setResult(importResult);

      if (importResult.success > 0) {
        toast.success(`Imported ${importResult.success} users successfully`);
        onSuccess();
      }

      if (importResult.failed > 0 || importResult.skipped > 0) {
        toast.error(`${importResult.failed} failed, ${importResult.skipped} skipped`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setFileFormat(null);
    setResult(null);
    setProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-2xl w-full animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="text-blue-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Import Users</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={importing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Instructions */}
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm space-y-2">
              <p className="font-semibold text-blue-900">Import Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Support both CSV and JSON formats</li>
                <li>CSV headers: name, email, userId, deviceId, isActive</li>
                <li>JSON must be an array of objects with same fields</li>
                <li>Email is optional (leave empty if not available)</li>
                <li>Duplicate userIds will be skipped</li>
                <li>Maximum 500 users per import</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Download Templates */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => onDownloadTemplate('csv')}
            className="btn-secondary flex items-center justify-center gap-2"
            disabled={importing}
          >
            <FileSpreadsheet size={18} />
            <span>CSV Template</span>
          </button>
          <button
            onClick={() => onDownloadTemplate('json')}
            className="btn-secondary flex items-center justify-center gap-2"
            disabled={importing}
          >
            <Code size={18} />
            <span>JSON Template</span>
          </button>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Select File (CSV or JSON)
          </label>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,application/json,text/csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={importing}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full input h-auto py-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500 transition-colors"
              disabled={importing}
            >
              <FileText size={32} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">
                {file ? file.name : 'Click to select file'}
              </span>
              {file && (
                <span className="text-xs text-slate-500">
                  {(file.size / 1024).toFixed(2)} KB • {fileFormat?.toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {importing && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Importing...</span>
              <span className="text-sm text-slate-600">
                {progress.current} / {progress.total}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%'
                }}
              />
            </div>
          </div>
        )}

        {/* Result Summary */}
        {result && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center bg-green-50 border-green-200">
                <p className="text-2xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-slate-600 mt-1">Success</p>
              </div>
              <div className="card text-center bg-red-50 border-red-200">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-slate-600 mt-1">Failed</p>
              </div>
              <div className="card text-center bg-yellow-50 border-yellow-200">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-slate-600 mt-1">Skipped</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="card bg-red-50 border-red-200 max-h-48 overflow-y-auto">
                <p className="font-semibold text-red-900 mb-2">Errors:</p>
                <ul className="space-y-1">
                  {result.errors.slice(0, 10).map((error, index) => (
                    <li key={index} className="text-xs text-red-800">
                      • {error}
                    </li>
                  ))}
                  {result.errors.length > 10 && (
                    <li className="text-xs text-red-600 font-semibold">
                      ... and {result.errors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {result ? (
            <>
              <button
                onClick={handleReset}
                className="flex-1 btn-secondary"
              >
                Import Another File
              </button>
              <button
                onClick={onClose}
                className="flex-1 btn-primary"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Start Import</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Delete All Modal Component
const DeleteAllModal: React.FC<{
  totalUsers: number;
  onClose: () => void;
  onSuccess: () => void;
  isSuperAdmin: boolean;
}> = ({ totalUsers, onClose, onSuccess, isSuperAdmin }) => {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const CONFIRM_TEXT = 'DELETE ALL USERS';

  const handleDelete = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admin can delete all users');
      return;
    }

    if (confirmText !== CONFIRM_TEXT) {
      toast.error('Please type the confirmation text correctly');
      return;
    }

    setDeleting(true);
    setProgress({ current: 0, total: totalUsers });

    try {
      const deleteResult = await firebaseService.deleteAllWhitelistUsers(
        isSuperAdmin,
        (current, total) => {
          setProgress({ current, total });
        }
      );

      setResult(deleteResult);

      if (deleteResult.success > 0) {
        toast.success(`Deleted ${deleteResult.success} users successfully`);
        onSuccess();
      }

      if (deleteResult.failed > 0) {
        toast.error(`${deleteResult.failed} users failed to delete`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Delete operation failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="card max-w-lg w-full animate-scale-in">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Delete All Users</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            disabled={deleting}
          >
            <X size={20} />
          </button>
        </div>

        {!result ? (
          <>
            {/* Warning */}
            <div className="card bg-red-50 border-red-200 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-bold text-red-900 mb-2">⚠️ CRITICAL WARNING ⚠️</h3>
                  <div className="text-sm text-red-800 space-y-2">
                    <p className="font-semibold">You are about to delete ALL {totalUsers} users!</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>This action is IRREVERSIBLE</li>
                      <li>All user data will be permanently deleted</li>
                      <li>Export your data first if you need a backup</li>
                      <li>This may take several minutes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Type "<span className="text-red-600 font-mono">{CONFIRM_TEXT}</span>" to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="input"
                placeholder={CONFIRM_TEXT}
                disabled={deleting}
                autoComplete="off"
              />
            </div>

            {/* Progress Bar */}
            {deleting && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">Deleting...</span>
                  <span className="text-sm text-slate-600">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all duration-300"
                    style={{
                      width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== CONFIRM_TEXT || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader className="animate-spin" size={18} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    <span>Delete All Users</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Result Summary */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center bg-green-50 border-green-200">
                  <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-slate-600 mt-1">Deleted</p>
                </div>
                <div className="card text-center bg-red-50 border-red-200">
                  <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                  <p className="text-xs text-slate-600 mt-1">Failed</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="card bg-red-50 border-red-200 max-h-48 overflow-y-auto">
                  <p className="font-semibold text-red-900 mb-2">Errors:</p>
                  <ul className="space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index} className="text-xs text-red-800">
                        • {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                onClose();
                if (result.success > 0) {
                  window.location.reload();
                }
              }}
              className="w-full btn-primary"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};