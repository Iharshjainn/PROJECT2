import React from 'react';

export default function LoadingSpinner({ message = "Loading financial data...", size = "normal" }) {
  const sizeClass = size === 'small' ? 'w-5 h-5 border-2' : size === 'large' ? 'w-10 h-10 border-3' : 'w-7 h-7 border-2';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
      <div className={`${sizeClass} rounded-full border-slate-700 border-t-emerald-400 animate-spin mb-3`} />
      {message && <p className="text-xs font-medium text-slate-400 animate-pulse">{message}</p>}
    </div>
  );
}
