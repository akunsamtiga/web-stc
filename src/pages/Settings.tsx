import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { firebaseService } from '../services/firebaseService';
import type { RegistrationConfig } from '../types';
import {
  Link2, MessageCircle, Save, Info,
  CheckCircle, ExternalLink, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Settings: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [config, setConfig]   = useState<RegistrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ registrationUrl: '', whatsappHelpUrl: '' });

  useEffect(() => { loadConfig(); }, []);

  const hasChanges = config
    ? form.registrationUrl !== config.registrationUrl ||
      form.whatsappHelpUrl !== config.whatsappHelpUrl
    : false;

  const loadConfig = async () => {
    try {
      const data = await firebaseService.getRegistrationConfig();
      setConfig(data);
      setForm({ registrationUrl: data.registrationUrl, whatsappHelpUrl: data.whatsappHelpUrl });
    } catch { toast.error('Failed to load settings'); }
    finally  { setLoading(false); }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) { toast.error('Only super admins can update settings'); return; }
    setSaving(true);
    try {
      await firebaseService.updateRegistrationConfig(form);
      toast.success('Settings saved');
      loadConfig();
    } catch { toast.error('Failed to save settings'); }
    finally  { setSaving(false); }
  };

  const handleReset = () => {
    if (config) setForm({ registrationUrl: config.registrationUrl, whatsappHelpUrl: config.whatsappHelpUrl });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const fields = [
    {
      key:   'registrationUrl' as const,
      icon:  Link2,
      label: 'Registration URL',
      desc:  'Default link for new user registration',
      ph:    'https://stockity.id/registered?a=…',
      bg:    'bg-blue-50',
      ic:    'text-blue-600',
    },
    {
      key:   'whatsappHelpUrl' as const,
      icon:  MessageCircle,
      label: 'WhatsApp Support',
      desc:  'Contact link for user support',
      ph:    'https://wa.me/62…',
      bg:    'bg-emerald-50',
      ic:    'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-5 animate-fade-in pb-6 max-w-2xl">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-0.5">Settings</h1>
        <p className="text-xs text-slate-400">Manage application configuration</p>
      </div>

      {/* Read-only notice */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-900">Read-only</p>
            <p className="text-xs text-amber-700 mt-0.5">Only super admins can modify settings.</p>
          </div>
        </div>
      )}

      {/* URL fields */}
      {fields.map(({ key, icon: Icon, label, desc, ph, bg, ic }) => (
        <div key={key} className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>
              <Icon className={ic} size={14} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-none">{label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="input pr-9"
                placeholder={ph}
                disabled={!isSuperAdmin}
              />
              {form[key] && (
                <a
                  href={form[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </div>

          {/* Current active */}
          {config && config[key] && (
            <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
              <CheckCircle size={12} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-emerald-800 mb-0.5">Current active URL</p>
                <p className="text-[11px] text-emerald-700 break-all">{config[key]}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Save / Reset */}
      {isSuperAdmin && (
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="btn-secondary"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn-primary"
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            ) : (
              <><Save size={13} />Save Changes</>
            )}
          </button>
        </div>
      )}

      {/* Info notice */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
        <Info size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-600 space-y-0.5">
          <p className="font-semibold text-blue-900 mb-1">Important</p>
          <p>Changes take effect immediately after saving.</p>
          <p>Ensure all URLs are valid before saving. Use the external link icon to test each URL.</p>
        </div>
      </div>
    </div>
  );
};