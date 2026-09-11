import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieIcon, 
  ShieldCheck, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft,
  Sparkles
} from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const CATEGORY_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#64748b'
];

export default function AnalyticsPage() {
  const { currency } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics')
      .then(res => setAnalytics(res.data))
      .catch(err => console.error('Error fetching analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating deterministic analytics..." />;
  }

  const hasData = analytics && (analytics.total_income > 0 || analytics.total_expenses > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Financial Analytics</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Deep-dive analysis of your spending velocity, discretionary ratios, and cashflow patterns
        </p>
      </div>

      {!hasData ? (
        <EmptyState
          title="No analytics available yet"
          description="Record or import transactions to view detailed spending patterns and cashflow metrics."
        />
      ) : (
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Savings Rate"
              value={`${analytics.savings_rate.toFixed(1)}%`}
              subtitle={analytics.savings_rate >= 20 ? "Meets 20% benchmark" : "Below recommended target"}
              trend={analytics.savings_rate >= 20 ? "positive" : "negative"}
              color="emerald"
            />

            <StatCard
              title="Essential Expenses"
              value={formatCurrency(analytics.essential_expenses, currency)}
              subtitle="Housing, Groceries, Utilities, Health"
              color="sky"
            />

            <StatCard
              title="Discretionary Spend"
              value={formatCurrency(analytics.discretionary_expenses, currency)}
              subtitle="Dining, Shopping, Entertainment"
              color="violet"
            />

            <StatCard
              title="Debt-To-Income"
              value={`${analytics.debt_to_income_ratio.toFixed(1)}%`}
              subtitle={analytics.debt_to_income_ratio <= 15 ? "Comfortable ratio" : "Monitor EMI commitments"}
              trend={analytics.debt_to_income_ratio <= 15 ? "positive" : "neutral"}
              color="amber"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Inflow / Outflow Trends */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Monthly Cash Flow Trend</h3>
                <p className="text-xs text-slate-400">Comparison of earnings versus outflows</p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.monthly_trends}>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                      formatter={(val) => [formatCurrency(val, currency), '']}
                    />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Spending Categories Distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Category Allocation</h3>
                <p className="text-xs text-slate-400">Share of total monthly expenses</p>
              </div>

              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.top_categories}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {analytics.top_categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                      formatter={(val) => [formatCurrency(val, currency), 'Spent']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 mt-3 max-h-36 overflow-y-auto">
                {analytics.top_categories.map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                      />
                      <span className="text-slate-300">{c.category}</span>
                    </div>
                    <div className="font-semibold text-white">
                      {formatCurrency(c.amount, currency)} ({c.percentage.toFixed(1)}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Largest Expenses Table */}
          {analytics.largest_expenses && analytics.largest_expenses.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white">Largest Outflows</h3>
                <p className="text-xs text-slate-400">Top individual transactions impacting your budget</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {analytics.largest_expenses.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-3 font-mono text-[11px] text-slate-400">{formatDate(tx.date)}</td>
                        <td className="py-3 font-semibold text-white">{tx.description}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-slate-100">
                          {formatCurrency(tx.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recurring Subscriptions Intelligence (PS #3) */}
          {analytics?.recurring_subscriptions && analytics.recurring_subscriptions.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Detected Recurring Subscriptions</h3>
                  <p className="text-xs text-slate-400">
                    Recurring monthly commitments, streaming memberships, and utilities
                  </p>
                </div>
                <div className="text-xs font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-1 rounded-xl self-start sm:self-auto">
                  Total Drain: {formatCurrency(analytics.total_monthly_subscriptions, currency)}/mo ({formatCurrency(analytics.total_monthly_subscriptions * 12, currency)}/yr)
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 font-semibold">
                    <tr>
                      <th className="pb-3">Subscription</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3">Frequency</th>
                      <th className="pb-3">Last Billed</th>
                      <th className="pb-3 text-right">Monthly Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {analytics.recurring_subscriptions.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{sub.name}</span>
                            {sub.is_dormant_risk && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Review Usage
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] border border-slate-700">
                            {sub.category}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">{sub.billing_frequency}</td>
                        <td className="py-3 font-mono text-[11px] text-slate-400">{formatDate(sub.last_billed)}</td>
                        <td className="py-3 text-right font-bold text-sky-400">
                          {formatCurrency(sub.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
