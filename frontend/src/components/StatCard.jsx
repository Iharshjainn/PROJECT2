import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, // positive, negative, neutral
  trendLabel,
  color = "emerald" // emerald, sky, violet, amber, rose
}) {
  const colorMap = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    sky: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  const badgeClass = colorMap[color] || colorMap.emerald;

  return (
    <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-5 shadow-sm hover:border-slate-700/80 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${badgeClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold tracking-tight text-white">{value}</div>
        
        {(subtitle || trendLabel) && (
          <div className="flex items-center gap-1.5 text-xs">
            {trend === 'positive' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
            {trend === 'negative' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
            {trend === 'neutral' && <Minus className="w-3.5 h-3.5 text-slate-400" />}
            <span className={
              trend === 'positive' ? 'text-emerald-400 font-medium' :
              trend === 'negative' ? 'text-rose-400 font-medium' : 'text-slate-400'
            }>
              {trendLabel || subtitle}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
