import React, { useState } from 'react';
import { AlertTriangle, X, Info } from 'lucide-react';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';

export const CompatibilityBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const caps = useDeviceCapabilities();

  if (dismissed || caps.warnings.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-200 px-4 py-2.5 text-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Browser Environment Notice:</strong> {caps.warnings[0]}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-amber-500/20 transition-colors shrink-0 text-amber-700 dark:text-amber-300"
          aria-label="Dismiss notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

