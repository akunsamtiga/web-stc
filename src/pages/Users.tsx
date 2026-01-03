import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { WhitelistUser } from '../types';
import { 
  Plus, Search, Edit, Trash2, Download, Upload,
  Users as UsersIcon, User as UserIcon, Save, X, 
  FileText, AlertCircle, FileSpreadsheet, Loader, 
  Code, AlertTriangle, Filter
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
  const [showFilterMenu, setShowFilterMenu] = useState(false);

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
Jane Smith,jane@example.com,user_002,device_002,true`;
      
      const blob = new Blob([template], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'users-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const template = JSON.stringify([
        { name: "John Doe", email: "john@example.com", userId: "user_001", deviceId: "device_001", isActive: true },
        { name: "Jane Smith", email: "jane@example.com", userId: "user_002", deviceId: "device_002", isActive: true }
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
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
        <div className="card text-center p-3">
          <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-xs text-slate-600 mt-1">Total</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-xs text-slate-600 mt-1">Active</p>
        </div>
        <div className="card text-center p-3">
          <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.inactive}</p>
          <p className="text-xs text-slate-600 mt-1">Inactive</p>
        </div>
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
                        onClick={() => {
                          setFilter(f as any);
                          setShowFilterMenu(false);
                        }}
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
                  u.isActive 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {u.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
            
            <div className="space-y-2 text-xs mb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">User ID:</span>
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                  {u.userId}
                </code>
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
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Device ID</label>
            <input
              type="text"
              value={formData.deviceId}
              onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
              className="input text-sm"
              placeholder="device_abc"
              required
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary h-10" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary flex items-center justify-center gap-2 h-10">
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
        throw new Error('JSON must be an array');
      }
      
      return parsed.map((user, index) => {
        if (!user.name || !user.userId || !user.deviceId) {
          throw new Error(`Row ${index + 1}: Missing required fields`);
        }
        return {
          ...user,
          email: user.email || '',
          isActive: user.isActive !== undefined ? Boolean(user.isActive) : true
        };
      });
    } catch (error: any) {
      throw new Error(`JSON error: ${error.message}`);
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
        toast.error('No valid users found');
        return;
      }

      setProgress({ current: 0, total: users.length });

      const importResult = await firebaseService.bulkImportWhitelistUsers(
        users,
        currentUserEmail,
        (current, total) => setProgress({ current, total })
      );

      setResult(importResult);

      if (importResult.success > 0) {
        toast.success(`Imported ${importResult.success} users`);
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
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Upload className="text-blue-600" size={20} />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Import Users</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors" disabled={importing}>
            <X size={20} />
          </button>
        </div>

        <div className="card bg-blue-50 border-blue-200 mb-5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-blue-900">Instructions:</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-800">
                <li>Support CSV and JSON formats</li>
                <li>Email is optional</li>
                <li>Duplicates will be skipped</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => onDownloadTemplate('csv')}
            className="btn-secondary text-xs flex items-center justify-center gap-1.5 h-9"
            disabled={importing}
          >
            <FileSpreadsheet size={16} />
            <span>CSV Template</span>
          </button>
          <button
            onClick={() => onDownloadTemplate('json')}
            className="btn-secondary text-xs flex items-center justify-center gap-1.5 h-9"
            disabled={importing}
          >
            <Code size={16} />
            <span>JSON Template</span>
          </button>
        </div>

        <div className="mb-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
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

        {importing && (
          <div className="mb-5">
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

        {result && (
          <div className="space-y-3 mb-5">
            <div className="grid grid-cols-3 gap-2">
              <div className="card text-center bg-green-50 border-green-200 p-3">
                <p className="text-xl font-bold text-green-600">{result.success}</p>
                <p className="text-xs text-slate-600 mt-1">Success</p>
              </div>
              <div className="card text-center bg-red-50 border-red-200 p-3">
                <p className="text-xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-slate-600 mt-1">Failed</p>
              </div>
              <div className="card text-center bg-yellow-50 border-yellow-200 p-3">
                <p className="text-xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-xs text-slate-600 mt-1">Skipped</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="card bg-red-50 border-red-200 max-h-40 overflow-y-auto p-3">
                <p className="font-semibold text-red-900 mb-2 text-xs">Errors:</p>
                <ul className="space-y-0.5">
                  {result.errors.slice(0, 5).map((error, index) => (
                    <li key={index} className="text-xs text-red-800">• {error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li className="text-xs text-red-600 font-semibold">
                      ... and {result.errors.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {result ? (
            <>
              <button onClick={handleReset} className="flex-1 btn-secondary h-10 text-sm">
                Import Another
              </button>
              <button onClick={onClose} className="flex-1 btn-primary h-10 text-sm">
                Close
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={importing}>
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 btn-primary flex items-center justify-center gap-2 h-10 text-sm"
              >
                {importing ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload size={16} />
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

  const CONFIRM_TEXT = 'DELETE ALL';

  const handleDelete = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admin allowed');
      return;
    }

    if (confirmText !== CONFIRM_TEXT) {
      toast.error('Type confirmation text');
      return;
    }

    setDeleting(true);
    setProgress({ current: 0, total: totalUsers });

    try {
      const deleteResult = await firebaseService.deleteAllWhitelistUsers(
        isSuperAdmin,
        (current, total) => setProgress({ current, total })
      );

      setResult(deleteResult);

      if (deleteResult.success > 0) {
        toast.success(`Deleted ${deleteResult.success} users`);
        onSuccess();
      }

      if (deleteResult.failed > 0) {
        toast.error(`${deleteResult.failed} failed`);
      }
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
              <button onClick={onClose} className="flex-1 btn-secondary h-10 text-sm" disabled={deleting}>
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== CONFIRM_TEXT || deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-10 text-sm"
              >
                {deleting ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    <span>Delete All</span>
                  </>
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

            <button
              onClick={() => {
                onClose();
                if (result.success > 0) window.location.reload();
              }}
              className="w-full btn-primary h-10 text-sm"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};