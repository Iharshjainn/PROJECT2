import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const LIABILITY_TYPES = [
  { value: 'credit_card', label: 'Credit Card Balance' },
  { value: 'personal_loan', label: 'Personal Loan' },
  { value: 'home_loan', label: 'Home Loan / Mortgage' },
  { value: 'car_loan', label: 'Car / Auto Loan' },
  { value: 'education_loan', label: 'Education Loan' },
  { value: 'other', label: 'Other Debt' },
];

export default function AddLiabilityModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const { currency } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    liability_type: initialData?.liability_type || 'personal_loan',
    outstanding_amount: initialData?.outstanding_amount || '',
    interest_rate: initialData?.interest_rate || '',
    monthly_payment: initialData?.monthly_payment || '',
    due_date: initialData?.due_date || '',
    notes: initialData?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter liability / loan name');
      return;
    }
    if (!formData.outstanding_amount || Number(formData.outstanding_amount) < 0) {
      setError('Please enter outstanding amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        liability_type: formData.liability_type,
        outstanding_amount: Number(formData.outstanding_amount),
        interest_rate: formData.interest_rate ? Number(formData.interest_rate) : null,
        monthly_payment: Number(formData.monthly_payment) || 0.0,
        due_date: formData.due_date ? Number(formData.due_date) : null,
        notes: formData.notes
      };

      if (initialData?.id) {
        await api.put(`/liabilities/${initialData.id}`, payload);
      } else {
        await api.post('/liabilities', payload);
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save liability');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            {initialData ? 'Edit Liability' : 'Record Liability / Loan'}
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Debt / Loan Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Auto Loan, SBI Credit Card"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Liability Type</label>
            <select
              value={formData.liability_type}
              onChange={(e) => setFormData(prev => ({ ...prev, liability_type: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
            >
              {LIABILITY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Outstanding Amount ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.outstanding_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, outstanding_amount: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Monthly EMI ({currency})</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.monthly_payment}
                onChange={(e) => setFormData(prev => ({ ...prev, monthly_payment: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Interest Rate (%)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 10.5"
                value={formData.interest_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Monthly Due Day (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 5"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>
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
              className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialData ? 'Update Liability' : 'Save Liability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
