import React from 'react';
import { FolderPlus } from 'lucide-react';

export default function EmptyState({ 
  icon: Icon = FolderPlus, 
  title = "No data found", 
  description = "Get started by adding your first record.",
  primaryAction,
  secondaryAction 
}) {
  return (
    <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      
      <h3 className="text-base sm:text-lg font-bold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              {primaryAction.label}
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
