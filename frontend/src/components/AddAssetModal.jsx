import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ASSET_TYPES = [
  { value: 'cash', label: 'Cash & Liquid Savings' },
  { value: 'stocks', label: 'Stocks & Equities' },
  { value: 'mutual_funds', label: 'Mutual Funds / SIP' },
  { value: 'gold', label: 'Gold / Precious Metals' },
  { value: 'property', label: 'Real Estate / Property' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'other', label: 'Other Asset' },
];

export default function AddAssetModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const { currency } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    asset_type: initialData?.asset_type || 'mutual_funds',
    current_value: initialData?.current_value || '',
    purchase_value: initialData?.purchase_value || '',
    notes: initialData?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter asset name');
      return;
    }
    if (!formData.current_value || Number(formData.current_value) < 0) {
      setError('Please enter a valid current valuation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        asset_type: formData.asset_type,
        current_value: Number(formData.current_value),
        purchase_value: formData.purchase_value ? Number(formData.purchase_value) : null,
        notes: formData.notes
      };

      if (initialData?.id) {
        await api.put(`/assets/${initialData.id}`, payload);
      } else {
        await api.post('/assets', payload);
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {initialData ? 'Edit Asset' : 'Add Asset to Portfolio'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Asset Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Nifty 50 Index Fund, Emergency Reserve"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Asset Type</label>
            <select
              value={formData.asset_type}
              onChange={(e) => setFormData(prev => ({ ...prev, asset_type: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {ASSET_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Current Value ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.current_value}
                onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Purchase Cost ({currency})</label>
              <input
                type="number"
                step="0.01"
                placeholder="Optional"
                value={formData.purchase_value}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_value: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
            <textarea
              rows={2}
              placeholder="Broker or account notes..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialData ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
