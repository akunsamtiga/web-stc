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
      toast.success('Settings updated');
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
        <div className="w-12 h-12 border-3 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-600">Manage application configuration</p>
      </div>

      {/* Warning */}
      {!isSuperAdmin && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-bold text-yellow-900 mb-1">Read-Only Mode</h3>
              <p className="text-sm text-yellow-800">
                Only super administrators can modify these settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registration URL */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Link className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Registration URL</h2>
            <p className="text-sm text-slate-600">Default link for new users</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Registration Link
            </label>
            <div className="relative">
              <input
                type="url"
                value={formData.registrationUrl}
                onChange={(e) => setFormData({ ...formData, registrationUrl: e.target.value })}
                className="input pr-10"
                placeholder="https://stockity.id/registered?a=..."
                disabled={!isSuperAdmin}
              />
              {formData.registrationUrl && (
                <a
                  href={formData.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          {config && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-800 mb-1">Current Active URL:</p>
                  <p className="text-sm text-green-700 break-all">{config.registrationUrl}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WhatsApp URL */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <MessageCircle className="text-green-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">WhatsApp Support</h2>
            <p className="text-sm text-slate-600">Contact link for support</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              WhatsApp Link
            </label>
            <div className="relative">
              <input
                type="url"
                value={formData.whatsappHelpUrl}
                onChange={(e) => setFormData({ ...formData, whatsappHelpUrl: e.target.value })}
                className="input pr-10"
                placeholder="https://wa.me/..."
                disabled={!isSuperAdmin}
              />
              {formData.whatsappHelpUrl && (
                <a
                  href={formData.whatsappHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-green-600 transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
              )}
            </div>
          </div>

          {config && (
            <div className="p-3 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-800 mb-1">Current Active URL:</p>
                  <p className="text-sm text-green-700 break-all">{config.whatsappHelpUrl}</p>
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
            className="btn-secondary disabled:opacity-50"
          >
            Reset Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Info */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-slate-700 space-y-2">
            <p className="font-semibold text-blue-900">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>Changes take effect immediately</li>
              <li>Ensure URLs are valid before saving</li>
              <li>Test links using the external icon</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};