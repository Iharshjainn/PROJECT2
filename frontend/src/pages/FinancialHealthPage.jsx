import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Activity,
  Info,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import HealthScoreGauge from '../components/HealthScoreGauge';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FinancialHealthPage() {
  const { currency } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/financial-health');
      setHealthData(res.data);
    } catch (err) {
      console.error('Error fetching financial health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating transparent 0-100 financial health score..." />;
  }

  const components = healthData?.components || {};

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Financial Health Indicator</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            A transparent 0–100 wellness indicator evaluating savings resilience, stability, and solvency
          </p>
        </div>

        <button
          onClick={fetchHealthData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recalculate</span>
        </button>
      </div>

      {/* Main Score Hero Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-lg flex flex-col md:flex-row items-center gap-8">
        <div className="flex-shrink-0">
          <HealthScoreGauge score={healthData?.overall_score || 0} rating={healthData?.rating || "Good"} size="large" />
        </div>

        <div className="flex-1 space-y-4 text-center md:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Wellness Indicator (Not a Credit Score)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Your Financial Wellness is Ranked "{healthData?.rating}"
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            This score reflects deterministic Python analysis of your actual savings rate, month-to-month expense consistency, debt obligations, emergency runway, and asset equity.
          </p>

          <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs text-slate-400">
            <span>• 100% Deterministic Arithmetic</span>
            <span>• Zero Hallucination</span>
            <span>• Privacy Protected</span>
          </div>
        </div>
      </div>

      {/* 5 Component Pillars */}
      <div>
        <h2 className="text-base font-bold text-white mb-4">Five Weighted Wellness Pillars</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(components).map(([key, comp]) => {
            const scorePct = (comp.score / comp.max_score) * 100;
            return (
              <div 
                key={key} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{comp.name}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">
                    Weight: {comp.weight_percentage}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-white">
                    {comp.score.toFixed(0)} <span className="text-xs font-medium text-slate-500">/ {comp.max_score}</span>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    comp.status === 'excellent' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    comp.status === 'good' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                    comp.status === 'fair' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {comp.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${scorePct}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  {comp.details}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Positive Drivers & Improvement Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Positive Factors */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Positive Financial Strengths</span>
          </div>
          <div className="space-y-2">
            {healthData?.positive_factors?.map((pos, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                <span>{pos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Areas For Improvement */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Areas Needing Attention</span>
          </div>
          <div className="space-y-2">
            {healthData?.areas_for_improvement?.map((imp, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                <span>{imp}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      {healthData?.actionable_recommendations && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-white font-bold text-sm mb-3">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Actionable Next Steps</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {healthData.actionable_recommendations.map((rec, i) => (
              <div key={i} className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-300">
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
