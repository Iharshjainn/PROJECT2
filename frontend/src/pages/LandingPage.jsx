import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  TrendingUp, 
  Bot, 
  PieChart, 
  FileSpreadsheet, 
  Calculator, 
  Lock, 
  CheckCircle2 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navigation */}
      <header className="h-20 border-b border-slate-800/80 px-6 lg:px-12 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white block">AuraFinance</span>
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Personal Financial Health</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-all"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28 px-6 text-center max-w-4xl mx-auto flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mx-auto mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Authoritative Python Calculations + Gemini AI Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-6 leading-tight">
          Understand Your Money. <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Make Better Financial Decisions.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Track your finances, understand your spending, monitor your transparent 0–100 wellness score, 
          and explore real-world what-if scenarios with a personal AI financial advisor grounded strictly on your facts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            to="/signup"
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <span>Start Tracking Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl border border-slate-800 transition-all text-sm"
          >
            Explore Dashboard Demo
          </Link>
        </div>

        {/* Value Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-slate-900 text-left">
          <div className="p-3">
            <div className="text-emerald-400 font-bold text-lg">0–100</div>
            <div className="text-xs text-slate-400 font-medium">Financial Health Score</div>
          </div>
          <div className="p-3">
            <div className="text-emerald-400 font-bold text-lg">CSV & PDF</div>
            <div className="text-xs text-slate-400 font-medium">Statement Parsing</div>
          </div>
          <div className="p-3">
            <div className="text-emerald-400 font-bold text-lg">Python Engine</div>
            <div className="text-xs text-slate-400 font-medium">Authoritative Math</div>
          </div>
          <div className="p-3">
            <div className="text-emerald-400 font-bold text-lg">Gemini AI</div>
            <div className="text-xs text-slate-400 font-medium">Conversational Advisor</div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-20 bg-slate-900/50 border-t border-slate-900 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Complete Financial Health Intelligence
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Everything you need to track, optimize, and build lasting financial resilience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
                <PieChart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Track Finances & Statements</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Import statements from your bank via CSV or PDF. Automatic column mapping, duplicate detection, and merchant categorization.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4 border border-teal-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">0–100 Financial Wellness</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Not a credit score. A transparent wellness gauge measuring savings rate, expense stability, debt burden, emergency reserves, and net worth.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 border border-cyan-500/20">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Talk to Your AI Advisor</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Ask questions like "Where am I overspending?" or "Can I afford an ₹80,000 iPhone?" Gemini explains calculations powered by Python backend math.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 px-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} AuraFinance. Personal Financial Health Platform. Built with React, FastAPI, Supabase & Gemini.</p>
      </footer>
    </div>
  );
}
