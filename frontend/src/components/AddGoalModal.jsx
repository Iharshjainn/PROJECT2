import React, { useState } from 'react';
import { X, AlertCircle, Target } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AddGoalModal({ isOpen, onClose, onSuccess, initialData = null }) {
  const { currency } = useAuth();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    target_amount: initialData?.target_amount || '',
    current_amount: initialData?.current_amount || '',
    target_date: initialData?.target_date || '',
    category: initialData?.category || 'emergency_fund',
    notes: initialData?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Please enter goal name');
      return;
    }
    if (!formData.target_amount || Number(formData.target_amount) <= 0) {
      setError('Please enter a target amount greater than zero');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        target_amount: Number(formData.target_amount),
        current_amount: Number(formData.current_amount) || 0.0,
        target_date: formData.target_date || null,
        category: formData.category,
        notes: formData.notes
      };

      if (initialData?.id) {
        await api.put(`/goals/${initialData.id}`, payload);
      } else {
        await api.post('/goals', payload);
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save financial goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>{initialData ? 'Edit Financial Goal' : 'Create Financial Goal'}</span>
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
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Goal Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. 6-Month Emergency Fund, Europe Vacation"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Amount ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.target_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Current Saved ({currency})</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.current_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Date</label>
              <input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="emergency_fund">Emergency Fund</option>
                <option value="retirement">Retirement</option>
                <option value="vacation">Travel & Vacation</option>
                <option value="home">Home / Down Payment</option>
                <option value="vehicle">Vehicle Purchase</option>
                <option value="gadget">Tech & Gadgets</option>
                <option value="general">General Savings</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
            <textarea
              rows={2}
              placeholder="Why this goal matters..."
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
              {loading ? 'Saving...' : initialData ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
