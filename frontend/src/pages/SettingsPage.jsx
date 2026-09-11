import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Mail, 
  Coins, 
  ShieldCheck, 
  LogOut, 
  CheckCircle2, 
  Lock,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user, currency, updateCurrency, signOut, isSupabaseConfigured } = useAuth();
  const [fullName, setFullName] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'INR');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
    setSelectedCurrency(currency || 'INR');
  }, [user, currency]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCurrency(selectedCurrency);
      await api.put('/settings/profile', {
        full_name: fullName,
        currency: selectedCurrency
      });
      setSavedMessage('Settings updated successfully!');
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Account & Platform Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your personal profile, preferred currency, and security posture
        </p>
      </div>

      {savedMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Profile & Currency Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">User Preferences</h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Registered Email</label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={user?.email || 'user@example.com'}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-400 pl-10 cursor-not-allowed"
              />
              <Mail className="w-4 h-4 text-slate-600 absolute left-3.5 top-3" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Email is verified via Supabase Auth</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 pl-10"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Default Currency</label>
            <div className="relative">
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 pl-10"
              >
                <option value="INR">INR (₹ - Indian Rupee, Lakhs & Crores)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
              </select>
              <Coins className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Architecture Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security & Privacy Architecture</span>
        </h2>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Row Level Security (RLS) enabled on all tables in Supabase. Your data is isolated to your UID.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Zero secret exposure: Gemini API keys and Supabase service role keys reside strictly in the backend.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>Authoritative Python math: Gemini is never trusted with authoritative arithmetic.</span>
          </div>
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Active Session</h3>
          <p className="text-xs text-slate-400">Sign out of this browser</p>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
