import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';

export const CompatibilityBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('mediaforge_compat_dismissed') === 'true';
  });
  const caps = useDeviceCapabilities();

  if (dismissed || caps.warnings.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('mediaforge_compat_dismissed', 'true');
  };

  return (
    <div className="bg-slate-100/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-1.5 text-xs backdrop-blur-sm transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="text-[11px] leading-tight">
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Browser Notice:</strong> {caps.warnings[0]}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          aria-label="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
