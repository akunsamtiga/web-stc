import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import { Link, MessageCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    registrationUrl: '',
    whatsappHelpUrl: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await firebaseService.getRegistrationConfig();
      setFormData({
        registrationUrl: data.registrationUrl,
        whatsappHelpUrl: data.whatsappHelpUrl,
      });
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can update settings');
      return;
    }

    setSaving(true);
    try {
      await firebaseService.updateRegistrationConfig(formData);
      toast.success('Settings updated successfully');
      loadConfig();
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
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
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage application configuration</p>
      </div>

      {/* Registration URL */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Link className="text-blue-500" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Registration URL</h2>
            <p className="text-sm text-slate-400">URL for new user registration</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Registration URL
            </label>
            <input
              type="url"
              value={formData.registrationUrl}
              onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
              className="input"
              placeholder="https://stockity.id/registered?a=..."
              disabled={!isSuperAdmin}
            />
          </div>

          {!isSuperAdmin && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <span className="text-yellow-500 text-sm">
                Only super admins can edit this setting
              </span>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Help URL */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
            <MessageCircle className="text-green-500" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">WhatsApp Help</h2>
            <p className="text-sm text-slate-400">WhatsApp contact for support</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              WhatsApp URL
            </label>
            <input
              type="url"
              value={formData.whatsappHelpUrl}
              onChange={(e) => setFormData({ ...formData, whatsappHelpUrl: e.target.value })}
              className="input"
              placeholder="https://wa.me/..."
              disabled={!isSuperAdmin}
            />
          </div>

          {!isSuperAdmin && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <span className="text-yellow-500 text-sm">
                Only super admins can edit this setting
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {isSuperAdmin && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={20} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};