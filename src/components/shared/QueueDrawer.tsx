import React from 'react';
import JSZip from 'jszip';
import {
  X,
  Play,
  Trash2,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
} from 'lucide-react';
import { useJobQueue } from '@/context/JobQueueContext';
import { formatBytes } from '@/utils/formatters';

interface QueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ isOpen, onClose }) => {
  const {
    jobs,
    startAllJobs,
    cancelJob,
    removeJob,
    clearCompleted,
    retryJob,
    isProcessingBatch,
    totalProgress,
  } = useJobQueue();

  if (!isOpen) return null;

  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED' && j.outputBlob);
  const queuedJobs = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'FAILED');

  const handleDownloadZip = async () => {
    if (completedJobs.length === 0) return;
    const zip = new JSZip();

    for (const job of completedJobs) {
      if (job.outputBlob && job.outputName) {
        zip.file(job.outputName, job.outputBlob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediaforge_batch_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-white/10 shadow-2xl flex flex-col">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Batch Processing Queue
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {jobs.length} files in session • {completedJobs.length} completed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Progress Bar (if processing) */}
        {isProcessingBatch && (
          <div className="px-5 py-3 bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-500/20">
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold text-indigo-600 dark:text-indigo-400">
              <span>Batch Progress</span>
              <span>{totalProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900/50 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-3 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={startAllJobs}
            disabled={isProcessingBatch || queuedJobs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start All</span>
          </button>

          <div className="flex items-center gap-2">
            {completedJobs.length > 0 && (
              <button
                onClick={handleDownloadZip}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                title="Download all completed files as .ZIP"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ZIP</span>
              </button>
            )}
            <button
              onClick={clearCompleted}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              Clear Done
            </button>
          </div>
        </div>

        {/* Job Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {jobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">No files in queue.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Drop multiple files to start batch converting.
              </p>
            </div>
          ) : (
            jobs.map((job, idx) => (
              <div
                key={job.id}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800/40 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-slate-400 text-[11px]">{idx + 1}.</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {job.file.name}
                    </span>
                  </div>

                  {/* Status Badges */}
                  {job.status === 'QUEUED' && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-semibold text-[10px]">
                      Waiting
                    </span>
                  )}
                  {job.status === 'PROCESSING' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {job.progress}%
                    </span>
                  )}
                  {job.status === 'COMPLETED' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                      <CheckCircle2 className="w-3 h-3" />
                      Done
                    </span>
                  )}
                  {job.status === 'FAILED' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-[10px]">
                      <AlertCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    {formatBytes(job.file.size)} • {job.operation}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {job.status === 'FAILED' && (
                      <button
                        onClick={() => retryJob(job.id)}
                        className="p-1 hover:text-indigo-500"
                        title="Retry"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {job.status === 'COMPLETED' && job.outputUrl && (
                      <a
                        href={job.outputUrl}
                        download={job.outputName}
                        className="p-1 text-emerald-500 hover:text-emerald-400"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => removeJob(job.id)}
                      className="p-1 hover:text-red-500"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

