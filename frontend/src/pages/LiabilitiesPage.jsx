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

  const [strategy, setStrategy] = useState('avalanche');

  const totalDebt = liabilities.reduce((sum, l) => sum + Number(l.outstanding_amount || 0), 0);
  const totalMonthlyEmi = liabilities.reduce((sum, l) => sum + Number(l.monthly_payment || 0), 0);
  const totalAnnualInterestDrag = liabilities.reduce(
    (sum, l) => sum + (Number(l.outstanding_amount || 0) * (Number(l.interest_rate || 0) / 100)),
    0
  );

  // Ranked debts
  const rankedDebts = [...liabilities].sort((a, b) => {
    if (strategy === 'avalanche') {
      return (Number(b.interest_rate || 0)) - (Number(a.interest_rate || 0));
    } else {
      return (Number(a.outstanding_amount || 0)) - (Number(b.outstanding_amount || 0));
    }
  });

  const topPriority = rankedDebts.length > 0 ? rankedDebts[0] : null;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Liabilities & Debt Intelligence</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Surface the true cost of loans, eliminate interest drag, and rank repayment priority
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outstanding Debt"
          value={formatCurrency(totalDebt, currency)}
          subtitle="Cumulative principal balance"
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
          title="Annual Interest Cost Drag"
          value={formatCurrency(totalAnnualInterestDrag, currency)}
          subtitle="True cost paid to lenders each year"
          icon={Percent}
          color="rose"
        />

        <StatCard
          title="Active Loan Accounts"
          value={liabilities.length}
          subtitle={liabilities.length === 0 ? "Completely debt free!" : `${liabilities.length} active obligations`}
          icon={AlertTriangle}
          color={liabilities.length === 0 ? "emerald" : "sky"}
        />
      </div>

      {/* Debt Ranking Recommendation Engine */}
      {liabilities.length > 1 && (
        <div className="bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 border border-rose-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/30">
                  Priority Payoff Intelligence
                </span>
                <h3 className="text-sm font-bold text-white">Which Balance Should You Clear First?</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {strategy === 'avalanche'
                  ? "Debt Avalanche: Ranks by highest interest rate to mathematically minimize total interest paid."
                  : "Debt Snowball: Ranks by lowest principal balance to build rapid psychological momentum."}
              </p>
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
              <button
                onClick={() => setStrategy('avalanche')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  strategy === 'avalanche' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Avalanche (Save Most ₹)
              </button>
              <button
                onClick={() => setStrategy('snowball')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  strategy === 'snowball' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Snowball (Fastest Wins)
              </button>
            </div>
          </div>

          {topPriority && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 font-black flex items-center justify-center text-xs">
                  1
                </span>
                <div>
                  <span className="font-bold text-white">{topPriority.name}</span>
                  <span className="text-slate-400 ml-2">
                    ({topPriority.interest_rate ? `${topPriority.interest_rate}% APR` : '0% APR'} · Outstanding: {formatCurrency(topPriority.outstanding_amount, currency)})
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                Recommended #1 Priority to Clear First
              </span>
            </div>
          )}
        </div>
      )}

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
