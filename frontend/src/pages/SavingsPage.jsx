import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Plus, 
  PiggyBank, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  TrendingUp,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import AddGoalModal from '../components/AddGoalModal';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function SavingsPage() {
  const { currency } = useAuth();
  const [goals, setGoals] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, analyticsRes] = await Promise.all([
        api.get('/goals'),
        api.get('/analytics')
      ]);
      setGoals(goalsRes.data || []);
      setAnalytics(analyticsRes.data || null);
    } catch (err) {
      console.error('Error fetching savings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Are you sure you want to delete this financial goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch {
      alert('Failed to delete goal.');
    }
  };

  const handleUpdateProgress = async (goal) => {
    const newAmountStr = window.prompt(`Enter updated saved amount for "${goal.name}" (${currency}):`, goal.current_amount);
    if (newAmountStr !== null) {
      const amt = Number(newAmountStr);
      if (!isNaN(amt) && amt >= 0) {
        try {
          const res = await api.put(`/goals/${goal.id}`, { current_amount: amt });
          setGoals(prev => prev.map(g => g.id === goal.id ? res.data : g));
        } catch {
          alert('Failed to update goal progress.');
        }
      }
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating savings and goal progress..." />;
  }

  const totalGoalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount || 0), 0);
  const totalGoalCurrent = goals.reduce((sum, g) => sum + Number(g.current_amount || 0), 0);
  const overallGoalProgress = totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget * 100) : 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Savings & Financial Goals</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your emergency cushion, automate monthly contributions, and achieve milestones
          </p>
        </div>

        <button
          onClick={() => {
            setEditingGoal(null);
            setGoalModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Monthly Savings"
          value={formatCurrency(analytics?.total_savings, currency)}
          subtitle={`Savings Rate: ${analytics?.savings_rate?.toFixed(1) || 0}%`}
          trend={analytics?.total_savings >= 0 ? "positive" : "negative"}
          icon={PiggyBank}
          color="emerald"
        />

        <StatCard
          title="Goal Target Accumulated"
          value={formatCurrency(totalGoalCurrent, currency)}
          subtitle={`Out of ${formatCurrency(totalGoalTarget, currency)} (${overallGoalProgress.toFixed(0)}%)`}
          icon={Target}
          color="sky"
        />

        <StatCard
          title="Liquid Emergency Cushion"
          value={formatCurrency(analytics?.liquid_savings, currency)}
          subtitle="Available for unexpected shocks"
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* Goals List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">Active Savings Goals</h2>
          <span className="text-xs text-slate-400">{goals.length} target milestones</span>
        </div>

        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {goals.map((goal) => {
              const progress = Math.min(100, goal.progress_percentage || 0);
              const isComplete = progress >= 100;

              return (
                <div 
                  key={goal.id} 
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700/80 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{goal.name}</h3>
                        {isComplete && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reached</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 capitalize">{goal.category.replace('_', ' ')}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingGoal(goal);
                          setGoalModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
                        title="Edit Goal"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{formatCurrency(goal.current_amount, currency)}</span>
                      <span className="text-slate-400">Target: {formatCurrency(goal.target_amount, currency)}</span>
                    </div>

                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>{progress.toFixed(1)}% funded</span>
                      <span>Remaining: {formatCurrency(goal.remaining_amount, currency)}</span>
                    </div>
                  </div>

                  {/* Target Date & Required Monthly Contribution */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{goal.target_date ? `Target: ${formatDate(goal.target_date)}` : 'Open timeline'}</span>
                    </div>

                    {goal.required_monthly_saving ? (
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        Save {formatCurrency(goal.required_monthly_saving, currency)}/mo
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpdateProgress(goal)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold"
                      >
                        Update Saved Amount
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No financial goals created"
            description="Create concrete targets like a 3-6 month emergency fund, vacation, or down payment."
            primaryAction={{
              label: "Create First Goal",
              onClick: () => {
                setEditingGoal(null);
                setGoalModalOpen(true);
              }
            }}
          />
        )}
      </div>

      <AddGoalModal
        isOpen={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        initialData={editingGoal}
        onSuccess={() => {
          setGoalModalOpen(false);
          setEditingGoal(null);
          fetchData();
        }}
      />
    </div>
  );
}
