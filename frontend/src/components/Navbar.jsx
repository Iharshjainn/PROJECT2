import React from 'react';
import { Menu, Bell, Sparkles, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick, onQuickAction }) {
  const { user, currency } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="text-xs text-slate-400 font-medium">Authoritative Financial Intelligence</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onQuickAction && (
          <button
            onClick={onQuickAction}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400">
            {currency}
          </span>
        </div>
      </div>
    </header>
  );
}
