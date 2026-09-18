import React from 'react';
import {
  Undo2,
  Redo2,
  Sparkles,
  RotateCcw,
  SplitSquareVertical,
  Film,
  ArrowLeft,
  Download,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';

interface StudioTopBarProps {
  fileInfo: DetectedFileInfo;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onBack: () => void;
  onExport: () => void;
  isCompareMode: boolean;
  onToggleCompare: () => void;
  currentTimeFormatted: string;
  durationFormatted: string;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  fileInfo,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  onBack,
  onExport,
  isCompareMode,
  onToggleCompare,
  currentTimeFormatted,
  durationFormatted,
}) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#0b101b]/95 backdrop-blur-md px-4 flex items-center justify-between gap-3 select-none">
      {/* Left: Brand & Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onBack}
          title="Back to Home"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-sm shrink-0 flex items-center justify-center">
            <Film className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                MEDIAFORGE STUDIO
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {fileInfo.name}
            </p>
          </div>
        </div>
      </div>

      {/* Center: Undo/Redo & Timecode & Compare */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Undo</span>
        </button>

        {/* Redo Button */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Redo</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

        {/* Current Timecode Display */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold">
          <span>{currentTimeFormatted}</span>
          <span className="text-slate-400">/</span>
          <span>{durationFormatted}</span>
        </div>

        {/* Compare Before / After */}
        <button
          onClick={onToggleCompare}
          title="Toggle Before/After Comparison"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            isCompareMode
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <SplitSquareVertical className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">{isCompareMode ? 'Original' : 'Compare'}</span>
        </button>

        {/* Reset All Changes */}
        <button
          onClick={onReset}
          title="Reset to Original"
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors hidden sm:block"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Export Button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>✨ EXPORT VIDEO</span>
        </button>
      </div>
    </header>
  );
};

