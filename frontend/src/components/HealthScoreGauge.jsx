import React from 'react';
import { ShieldCheck, AlertCircle, Award } from 'lucide-react';

export default function HealthScoreGauge({ score = 0, rating = "Good", size = "normal" }) {
  // Color determination
  let color = "text-emerald-400 stroke-emerald-400";
  let bgGradient = "from-emerald-500/20 to-teal-500/5";
  let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";

  if (score >= 80) {
    color = "text-emerald-400 stroke-emerald-400";
    bgGradient = "from-emerald-500/20 to-teal-500/5";
    badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (score >= 65) {
    color = "text-teal-400 stroke-teal-400";
    bgGradient = "from-teal-500/20 to-cyan-500/5";
    badgeColor = "bg-teal-500/10 text-teal-400 border-teal-500/30";
  } else if (score >= 50) {
    color = "text-amber-400 stroke-amber-400";
    bgGradient = "from-amber-500/20 to-yellow-500/5";
    badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else {
    color = "text-rose-400 stroke-rose-400";
    bgGradient = "from-rose-500/20 to-orange-500/5";
    badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";
  }

  // Circular gauge calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`relative flex items-center justify-center ${size === 'large' ? 'w-44 h-44' : 'w-32 h-32'}`}>
      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-slate-800"
          strokeWidth="7"
          fill="transparent"
        />
        {/* Animated value stroke */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          className={`${color} transition-all duration-1000 ease-out`}
          strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className={`font-black tracking-tight text-white ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>
          {score}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          / 100
        </span>
        <span className={`mt-0.5 px-2 py-0.2 rounded-full border text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
          {rating}
        </span>
      </div>
    </div>
  );
}
