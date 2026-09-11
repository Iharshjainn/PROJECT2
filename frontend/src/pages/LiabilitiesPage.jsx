import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  Plus, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Calendar,
  Percent,
  CreditCard
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import AddLiabilityModal from '../components/AddLiabilityModal';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function LiabilitiesPage() {
  const { currency } = useAuth();
  const [liabilities, setLiabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState(null);

  const fetchLiabilities = async () => {
    try {
      setLoading(true);
      const res = await api.get('/liabilities');
      setLiabilities(res.data || []);
    } catch (err) {
      console.error('Error fetching liabilities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiabilities();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this liability record?')) return;
    try {
      await api.delete(`/liabilities/${id}`);
      setLiabilities(prev => prev.filter(l => l.id !== id));
      window.dispatchEvent(new CustomEvent('financial_data_updated'));
    } catch {
      alert('Failed to delete liability.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Evaluating liabilities and debt obligations..." />;
  }

  const totalDebt = liabilities.reduce((sum, l) => sum + Number(l.outstanding_amount || 0), 0);
  const totalMonthlyEmi = liabilities.reduce((sum, l) => sum + Number(l.monthly_payment || 0), 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Liabilities & Debt Burden</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor loans, interest rates, and monthly EMI drag on cashflow
          </p>
        </div>

        <button
          onClick={() => {
            setEditingLiability(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Liability</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Outstanding Debt"
          value={formatCurrency(totalDebt, currency)}
          subtitle="Cumulative principal remaining"
          icon={TrendingDown}
          color="rose"
        />

        <StatCard
          title="Monthly EMI Commitment"
          value={formatCurrency(totalMonthlyEmi, currency)}
          subtitle="Recurring monthly debt service"
          icon={CreditCard}
          color="amber"
        />

        <StatCard
          title="Active Loan Accounts"
          value={liabilities.length}
          subtitle={liabilities.length === 0 ? "Completely debt free!" : "Manageable obligations"}
          icon={AlertTriangle}
          color={liabilities.length === 0 ? "emerald" : "sky"}
        />
      </div>

      {liabilities.length > 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="pb-3">Liability / Loan</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Interest Rate</th>
                  <th className="pb-3">Monthly EMI</th>
                  <th className="pb-3">Due Day</th>
                  <th className="pb-3 text-right">Outstanding</th>
                  <th className="pb-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {liabilities.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-white">
                      <div>{l.name}</div>
                      {l.notes && <div className="text-[10px] text-slate-500 font-normal">{l.notes}</div>}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700 capitalize">
                        {(l.liability_type || 'other').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-300">
                      {l.interest_rate ? `${l.interest_rate}% p.a.` : '-'}
                    </td>
                    <td className="py-3 font-semibold text-amber-400">
                      {formatCurrency(l.monthly_payment, currency)}
                    </td>
                    <td className="py-3 text-slate-400">
                      {l.due_date ? `${l.due_date}th of month` : '-'}
                    </td>
                    <td className="py-3 text-right font-bold text-rose-400">
                      {formatCurrency(l.outstanding_amount, currency)}
                    </td>
                    <td className="py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingLiability(l);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          title="Zero liabilities recorded"
          description="If you have credit card balances, auto loans, or home loans, recording them helps calculate your true debt-to-income ratio."
          primaryAction={{
            label: "Record Liability",
            onClick: () => {
              setEditingLiability(null);
              setModalOpen(true);
            }
          }}
        />
      )}

      <AddLiabilityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingLiability}
        onSuccess={() => {
          setModalOpen(false);
          setEditingLiability(null);
          fetchLiabilities();
        }}
      />
    </div>
  );
}
