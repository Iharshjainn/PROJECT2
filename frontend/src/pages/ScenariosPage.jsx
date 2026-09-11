import React, { useState } from 'react';
import { 
  Calculator, 
  ShoppingBag, 
  ArrowUpRight, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SCENARIO_PRESETS = [
  {
    type: 'one_time_purchase',
    title: 'Major Purchase',
    description: 'Assess if buying an iPhone, laptop, or gadget impacts your emergency cushion',
    icon: ShoppingBag,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    defaultAmount: 80000,
    defaultName: 'iPhone 15'
  },
  {
    type: 'expense_increase',
    title: 'Rent / Expense Hike',
    description: 'Calculate how a rent increase or new recurring bill affects your savings rate',
    icon: ArrowUpRight,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    defaultAmount: 5000,
    defaultName: 'Apartment Rent Hike'
  },
  {
    type: 'salary_change',
    title: 'Salary Adjustment',
    description: 'Simulate a 15% raise or pay decrease on monthly surplus and cash flow',
    icon: TrendingUp,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    defaultAmount: 15000,
    defaultName: 'Annual Merit Raise',
    percentage: 15
  },
  {
    type: 'debt_repayment',
    title: 'Lump-Sum Debt Repay',
    description: 'See interest savings and debt relief from paying down loans',
    icon: TrendingDown,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    defaultAmount: 50000,
    defaultName: 'Credit Card Payoff'
  },
  {
    type: 'savings_increase',
    title: 'Accelerated Savings',
    description: 'Evaluate the annual compounded impact of saving an extra ₹10,000/month',
    icon: PiggyBank,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    defaultAmount: 10000,
    defaultName: 'Monthly SIP Booster'
  }
];

export default function ScenariosPage() {
  const { currency } = useAuth();
  const navigate = useNavigate();

  const [selectedScenario, setSelectedScenario] = useState(SCENARIO_PRESETS[0]);
  const [amount, setAmount] = useState(SCENARIO_PRESETS[0].defaultAmount);
  const [itemName, setItemName] = useState(SCENARIO_PRESETS[0].defaultName);
  const [percentageChange, setPercentageChange] = useState(15);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSelectPreset = (preset) => {
    setSelectedScenario(preset);
    setAmount(preset.defaultAmount);
    setItemName(preset.defaultName);
    if (preset.percentage !== undefined) {
      setPercentageChange(preset.percentage);
    }
    setResult(null);
  };

  const handleRunSimulation = async (e) => {
    e?.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setLoading(true);
    try {
      const payload = {
        scenario_type: selectedScenario.type,
        amount: Number(amount),
        item_name: itemName,
        percentage_change: selectedScenario.type === 'salary_change' ? Number(percentageChange) : null
      };

      const res = await api.post('/scenarios/calculate', payload);
      setResult(res.data);
    } catch (err) {
      console.error('Error running scenario simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">What-If Scenario Simulator</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Simulate life decisions and major purchases with deterministic Python arithmetic before spending a single rupee
        </p>
      </div>

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SCENARIO_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedScenario.type === preset.type;
          return (
            <button
              key={preset.type}
              onClick={() => handleSelectPreset(preset)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-slate-900 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${preset.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">{preset.title}</div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                  {preset.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Input & Simulation Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parameters Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <span>Configure Scenario Parameters</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic calculations based on your stored accounts & cashflow
            </p>
          </div>

          <form onSubmit={handleRunSimulation} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Description / Item Name
              </label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. iPhone 15, Rent Hike"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                step="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>

            {selectedScenario.type === 'salary_change' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Percentage Change (% e.g. +15 or -20)
                </label>
                <input
                  type="number"
                  step="1"
                  value={percentageChange}
                  onChange={(e) => setPercentageChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Calculate Authoritative Outcome</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Results Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">Authoritative Verdict</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{result.title}</h3>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border self-start sm:self-auto ${
                  result.status === 'affordable' || result.status === 'positive' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                  result.status === 'caution' || result.status === 'neutral'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                  'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}>
                  {result.status.replace('_', ' ')}
                </span>
              </div>

              {/* Summary Text */}
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 leading-relaxed">
                {result.summary}
              </div>

              {/* Before vs After Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(result.details || {}).map(([key, val]) => (
                  <div key={key} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm sm:text-base font-bold text-white mt-1 block">
                      {typeof val === 'number' && key.includes('cost') || key.includes('savings') || key.includes('amount') || key.includes('burn') || key.includes('expenses') || key.includes('income')
                        ? formatCurrency(val, currency)
                        : typeof val === 'number' && key.includes('rate') || key.includes('percentage')
                        ? `${val.toFixed(1)}%`
                        : typeof val === 'number' && key.includes('months')
                        ? `${val.toFixed(2)} mo`
                        : String(val)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              {result.recommendations && result.recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300">Prudent Financial Guidance:</span>
                  <div className="space-y-1.5">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ask AI Advisor about this result */}
              <div className="pt-2">
                <button
                  onClick={() => navigate(`/ai-advisor?prompt=${encodeURIComponent(`Can you explain what happens if I do this scenario: ${result.summary}`)}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-400 hover:text-emerald-300 border border-slate-800 rounded-xl text-xs font-semibold transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Discuss this scenario with AI Advisor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
                <Calculator className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Ready for Simulation</h4>
              <p className="text-xs text-slate-400 max-w-sm mb-4">
                Select a scenario on the left, adjust the amount, and click "Calculate Authoritative Outcome" to review the exact numerical impact.
              </p>
              <button
                onClick={handleRunSimulation}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Run Default ({selectedScenario.title})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
