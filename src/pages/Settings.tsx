import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { RegistrationConfig } from '../types';
import { Link, MessageCircle, Save, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [config, setConfig] = useState<RegistrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    registrationUrl: '',
    whatsappHelpUrl: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (config) {
      const changed = 
        formData.registrationUrl !== config.registrationUrl ||
        formData.whatsappHelpUrl !== config.whatsappHelpUrl;
      setHasChanges(changed);
    }
  }, [formData, config]);

  const loadConfig = async () => {
    try {
      const data = await firebaseService.getRegistrationConfig();
      setConfig(data);
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

  const handleReset = () => {
    if (config) {
      setFormData({
        registrationUrl: config.registrationUrl,
        whatsappHelpUrl: config.whatsappHelpUrl,
      });
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
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400">Manage application configuration and links</p>
      </div>

      {/* Super Admin Warning */}
      {!isSuperAdmin && (
        <div className="card backdrop-blur-sm bg-yellow-500/10 border-yellow-500/30 shadow-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-500 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-yellow-500 mb-1">Read-Only Mode</h3>
              <p className="text-sm text-yellow-500/80">
                Only super administrators can modify these settings. You can view but not edit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registration URL */}
      <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30">
              <Link className="text-blue-500" size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Registration URL</h2>
            <p className="text-sm text-slate-400">Default registration link for new users</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              Registration Link
            </label>
            <div className="relative group">
              <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={18} />
              <input
                type="url"
                value={formData.registrationUrl}
                onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
                className="input pl-12 pr-12 h-14 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all"
                placeholder="https://stockity.id/registered?a=..."
                disabled={!isSuperAdmin}
              />
              {formData.registrationUrl && (
                <a
                  href={formData.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-accent-primary transition-colors z-10"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Current URL Display */}
          {config && (
            <div className="p-4 bg-dark-hover/30 rounded-xl border border-slate-800/50">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Current Active URL:</p>
                  <p className="text-sm text-slate-300 break-all">{config.registrationUrl}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp Help URL */}
      <div className="card backdrop-blur-sm bg-dark-card/50 border-slate-800/50 shadow-xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/50">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-xl blur-lg"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center border border-green-500/30">
              <MessageCircle className="text-green-500" size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">WhatsApp Support</h2>
            <p className="text-sm text-slate-400">Contact link for user support</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-300">
              WhatsApp Link
            </label>
            <div className="relative group">
              <MessageCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-accent-primary transition-colors z-10" size={18} />
              <input
                type="url"
                value={formData.whatsappHelpUrl}
                onChange={(e) => setFormData({ ...formData, whatsappHelpUrl: e.target.value })}
                className="input pl-12 pr-12 h-14 bg-dark-hover/50 border-slate-700 focus:border-accent-primary transition-all"
                placeholder="https://wa.me/..."
                disabled={!isSuperAdmin}
              />
              {formData.whatsappHelpUrl && (
                <a
                  href={formData.whatsappHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-accent-primary transition-colors z-10"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Current URL Display */}
          {config && (
            <div className="p-4 bg-dark-hover/30 rounded-xl border border-slate-800/50">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-400 mb-1">Current Active URL:</p>
                  <p className="text-sm text-slate-300 break-all">{config.whatsappHelpUrl}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isSuperAdmin && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="flex-1 sm:flex-none btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex-1 sm:flex-none btn-primary px-8 py-3 flex items-center justify-center gap-2 shadow-xl shadow-accent-primary/25 hover:shadow-2xl hover:shadow-accent-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={20} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Info Card */}
      <div className="card backdrop-blur-sm bg-blue-500/5 border-blue-500/20 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-500 flex-shrink-0 mt-1" size={20} />
          <div className="text-sm text-slate-300 space-y-2">
            <p className="font-semibold text-blue-400">Important Information:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Changes take effect immediately after saving</li>
              <li>These URLs are used throughout the application</li>
              <li>Ensure URLs are valid and accessible before saving</li>
              <li>Test links using the external link icon before saving</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};