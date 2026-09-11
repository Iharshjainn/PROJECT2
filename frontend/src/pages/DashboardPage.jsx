import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank, 
  Activity, 
  ShieldCheck, 
  Bot, 
  UploadCloud, 
  Plus, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  PieChart as PieIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import HealthScoreGauge from '../components/HealthScoreGauge';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import CsvImportModal from '../components/CsvImportModal';
import PdfImportModal from '../components/PdfImportModal';

const CATEGORY_COLORS = [
  '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#64748b'
];

export default function DashboardPage() {
  const { user, currency } = useAuth();
  const navigate = useNavigate();
  const { openAddTransaction } = useOutletContext() || {};
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load financial data. Backend may be offline or starting up.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for custom transaction update events
    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('financial_data_updated', handleUpdate);
    return () => window.removeEventListener('financial_data_updated', handleUpdate);
  }, []);

  if (loading) {
    return <LoadingSpinner message="Calculating authoritative financial metrics..." />;
  }

  const hasTransactions = data?.recent_transactions && data.recent_transactions.length > 0;
  const hasCategories = data?.category_spending && data.category_spending.length > 0;
  const hasTrends = data?.monthly_trends && data.monthly_trends.length > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome & Quick Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Welcome back, {data?.profile?.full_name || user?.user_metadata?.full_name || 'there'}. Here is your financial health status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Statement</span>
          </button>
          
          <button
            onClick={openAddTransaction}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
          <button onClick={fetchDashboardData} className="underline hover:text-white font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* 1. Summary KPI Cards (6 Key Pillars) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Balance"
          value={formatCurrency(data?.total_balance, currency)}
          subtitle="Liquid accounts"
          icon={Wallet}
          color="emerald"
        />

        <StatCard
          title="Monthly Income"
          value={formatCurrency(data?.monthly_income, currency)}
          trend={data?.monthly_income > 0 ? "positive" : "neutral"}
          trendLabel={data?.monthly_income > 0 ? "Earnings recorded" : "No income recorded"}
          icon={ArrowDownLeft}
          color="sky"
        />

        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(data?.monthly_expenses, currency)}
          trend={data?.monthly_expenses > 0 ? "neutral" : "neutral"}
          trendLabel={`${data?.category_spending?.length || 0} categories`}
          icon={ArrowUpRight}
          color="rose"
        />

        <StatCard
          title="Monthly Savings"
          value={formatCurrency(data?.monthly_savings, currency)}
          trend={data?.monthly_savings >= 0 ? "positive" : "negative"}
          trendLabel={`Rate: ${data?.savings_rate?.toFixed(1) || 0}%`}
          icon={PiggyBank}
          color="violet"
        />

        <StatCard
          title="Net Worth"
          value={formatCurrency(data?.net_worth, currency)}
          subtitle={`Assets - Debt`}
          trend={data?.net_worth >= 0 ? "positive" : "negative"}
          trendLabel={data?.net_worth >= 0 ? "Positive equity" : "Debt exceeds assets"}
          icon={Activity}
          color="amber"
        />

        <StatCard
          title="Health Score"
          value={`${data?.health_score || 0}/100`}
          subtitle={data?.health_rating || "Good"}
          trend={data?.health_score >= 65 ? "positive" : "neutral"}
          trendLabel={data?.health_rating || "Wellness"}
          icon={ShieldCheck}
          color="emerald"
        />
      </div>

      {/* If brand new user with NO transactions yet, display onboarding checklist */}
      {!hasTransactions && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">Your Financial Dashboard is Ready</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mb-6">
            To generate personalized financial health scores, deep analytics, and conversational AI advice, begin by recording your transactions or importing an account statement.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={openAddTransaction}
              className="p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-all group"
            >
              <Plus className="w-4 h-4 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Add Transaction</div>
              <div className="text-[11px] text-slate-400">Manual entry</div>
            </button>

            <button
              onClick={() => setCsvModalOpen(true)}
              className="p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-all group"
            >
              <UploadCloud className="w-4 h-4 text-sky-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Import CSV</div>
              <div className="text-[11px] text-slate-400">From bank portal</div>
            </button>

            <button
              onClick={() => navigate('/assets')}
              className="p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-all group"
            >
              <Wallet className="w-4 h-4 text-violet-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Add Assets</div>
              <div className="text-[11px] text-slate-400">Savings & funds</div>
            </button>

            <button
              onClick={() => navigate('/savings')}
              className="p-3 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-xl text-left transition-all group"
            >
              <TrendingUp className="w-4 h-4 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-white">Set Goal</div>
              <div className="text-[11px] text-slate-400">Emergency fund</div>
            </button>
          </div>
        </div>
      )}

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Income vs Expenses</h3>
              <p className="text-xs text-slate-400">Monthly authoritative cashflow trend</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Savings: {formatCurrency(data?.monthly_savings, currency)}
            </span>
          </div>

          {hasTrends ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly_trends}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val) => [formatCurrency(val, currency), '']}
                  />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400 max-w-sm mb-3">
                Monthly trend charts will render once you import or record transactions across one or more months.
              </p>
              <button
                onClick={openAddTransaction}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Add First Transaction
              </button>
            </div>
          )}
        </div>

        {/* Expense Categories Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Expense Categories</h3>
                <p className="text-xs text-slate-400">Spending breakdown</p>
              </div>
              <PieIcon className="w-4 h-4 text-slate-400" />
            </div>

            {hasCategories ? (
              <>
                <div className="h-44 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.category_spending}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {data.category_spending.map((entry, index) => (
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

                {/* Legend list */}
                <div className="space-y-2 mt-2">
                  {data.category_spending.slice(0, 4).map((c, i) => (
                    <div key={c.category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        />
                        <span className="text-slate-300 truncate">{c.category}</span>
                      </div>
                      <div className="font-semibold text-white whitespace-nowrap">
                        {formatCurrency(c.amount, currency)} ({c.percentage.toFixed(0)}%)
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-56 flex items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400">
                  No expense categories recorded yet.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/analytics')}
            className="w-full mt-4 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Deep Dive Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Financial Health Card & AI Advisor Quick Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Health Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <HealthScoreGauge score={data?.health_score || 0} rating={data?.health_rating || "Good"} size="large" />
          </div>

          <div className="flex-1 space-y-3 text-left">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Pillar Assessment</span>
                <span className="text-xs font-semibold text-slate-400">• Deterministic 0-100</span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                Financial Health: {data?.health_rating}
              </h3>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              {data?.health_positives?.map((pos, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{pos}</span>
                </div>
              ))}
              {data?.health_improvements?.map((imp, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{imp}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/financial-health')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 pt-1"
            >
              <span>Explore full 5-pillar report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* AI Advisor Prompt Starter Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Ask your AI Advisor</h3>
                  <p className="text-[11px] text-slate-400">Grounded in your actual transactions</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                Gemini AI
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Explore decisions, assess purchase affordability, or run what-if scenarios. The Python engine calculates the numbers; Gemini explains the financial logic.
            </p>

            {/* Suggested Prompts */}
            <div className="space-y-2">
              {(data?.suggested_prompts || [
                "Analyze my monthly spending",
                "Can I afford an iPhone for ₹80,000?",
                "How can I improve my financial health score?"
              ]).slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/ai-advisor?prompt=${encodeURIComponent(prompt)}`)}
                  className="w-full text-left p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-emerald-500/30 rounded-xl text-xs text-slate-300 hover:text-white flex items-center justify-between transition-all group"
                >
                  <span className="truncate pr-2">"{prompt}"</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate('/ai-advisor')}
            className="w-full mt-4 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <span>Open AI Chat Window</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Recent Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">Recent Transactions</h3>
            <p className="text-xs text-slate-400">Latest activity across all accounts</p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View all transactions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {hasTransactions ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.recent_transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono text-[11px] whitespace-nowrap text-slate-400">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-3 font-medium text-white max-w-[220px] truncate">
                      {tx.description}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium border border-slate-700">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`text-[10px] font-semibold capitalize ${
                        tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className={`py-3 text-right font-bold whitespace-nowrap ${
                      tx.transaction_type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {tx.transaction_type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No transactions yet"
            description="Start building your financial ledger. Add a transaction manually or upload an official bank CSV statement."
            primaryAction={{
              label: "Add Transaction",
              onClick: openAddTransaction
            }}
            secondaryAction={{
              label: "Import CSV Statement",
              onClick: () => setCsvModalOpen(true)
            }}
          />
        )}
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onSuccess={() => {
          setCsvModalOpen(false);
          fetchDashboardData();
        }}
      />

      {/* PDF Import Modal */}
      <PdfImportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onSuccess={() => {
          setPdfModalOpen(false);
          fetchDashboardData();
        }}
      />
    </div>
  );
}
