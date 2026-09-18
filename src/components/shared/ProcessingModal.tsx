import React, { useEffect, useState } from 'react';
import { Loader2, X, CheckCircle2, Clock, Cpu, Sparkles } from 'lucide-react';
import { ProcessingJob } from '@/types/job';
import { formatDuration } from '@/utils/formatters';

interface ProcessingModalProps {
  job: ProcessingJob;
  onCancel: () => void;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({ job, onCancel }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.min(100, Math.max(0, job.progress));

  // Determine stage checklist statuses based on progress percent
  const stages = job.category === 'video'
    ? [
        { label: 'Loading video & preparing engine', done: progress >= 15, active: progress < 15 },
        { label: 'Applying crop & transforms', done: progress >= 25, active: progress >= 15 && progress < 25 },
        { label: 'Applying trim & filters', done: progress >= 40, active: progress >= 25 && progress < 40 },
        { label: 'Processing audio & tracks', done: progress >= 60, active: progress >= 40 && progress < 60 },
        { label: `Encoding ${job.options?.outputFormat?.toUpperCase() || 'MP4'} container`, done: progress >= 90, active: progress >= 60 && progress < 90 },
        { label: 'Finalizing & saving output', done: progress >= 100, active: progress >= 90 && progress < 100 },
      ]
    : [
        { label: 'Reading file data & metadata', done: progress >= 15, active: progress < 15 },
        { label: 'Initializing browser engine (WASM/Workers)', done: progress >= 30, active: progress >= 15 && progress < 30 },
        { label: 'Executing core transformation', done: progress >= 85, active: progress >= 30 && progress < 85 },
        { label: 'Encoding container & finalizing blob', done: progress >= 100, active: progress >= 85 && progress < 100 },
      ];

  // Calculate estimated remaining seconds based on progress and elapsed time
  let estRemaining: number | null = null;
  if (progress > 10 && elapsed > 2) {
    const totalSecs = (elapsed / progress) * 100;
    estRemaining = Math.max(1, Math.round(totalSecs - elapsed));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl text-left">
        {/* Header with Title and Cancel button */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                PROCESSING IN BROWSER
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-[280px]">
                {job.file.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title="Cancel Processing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="my-6">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-slate-600 dark:text-slate-400">{job.currentStage || 'Processing...'}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm font-bold">
              {progress}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden p-0.5 border border-slate-200/60 dark:border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-300 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Pipeline Stages Checklist */}
        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 space-y-2.5 mb-6">
          {stages.map((stage, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs">
              {stage.done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : stage.active ? (
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                </span>
              ) : (
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-white/20" />
                </span>
              )}
              <span
                className={`${
                  stage.done
                    ? 'text-slate-900 dark:text-slate-200 font-medium'
                    : stage.active
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {stage.label}
              </span>
            </div>
          ))}
        </div>

        {/* Timers & System Info */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-6">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Elapsed: {formatDuration(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-slate-600 dark:text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>
              {estRemaining !== null ? `Est. left: ~${estRemaining}s` : 'Calculating...'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 transition-colors"
          >
            Cancel Processing
          </button>
        </div>
      </div>
    </div>
  );
};

