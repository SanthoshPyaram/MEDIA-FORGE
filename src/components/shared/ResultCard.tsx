import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Download,
  Eye,
  RefreshCw,
  Sparkles,
  ArrowDownRight,
  FileCheck,
  SplitSquareVertical,
  Film,
  Image as ImageIcon,
  Maximize2,
  Sliders,
  Edit3,
} from 'lucide-react';
import { ProcessingJob } from '@/types/job';
import { formatBytes, calculateSavings } from '@/utils/formatters';
import { BeforeAfterCompare } from './BeforeAfterCompare';

interface ResultCardProps {
  job: ProcessingJob;
  onReset: () => void;
  onEditAgain?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ job, onReset, onEditAgain }) => {
  const [showCompare, setShowCompare] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [origDims, setOrigDims] = useState<string>('');
  const [outDims, setOutDims] = useState<string>('');

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'],
      });
    } catch (e) {}

    const url = URL.createObjectURL(job.file);
    setOriginalUrl(url);

    // Read original dimensions
    const metaW = (job.fileInfo.metadata as any)?.width;
    const metaH = (job.fileInfo.metadata as any)?.height;
    if (metaW && metaH) {
      setOrigDims(`${metaW} × ${metaH}`);
    } else if (job.category === 'image') {
      const img = new Image();
      img.onload = () => setOrigDims(`${img.naturalWidth} × ${img.naturalHeight}`);
      img.src = url;
    } else if (job.category === 'video') {
      const vid = document.createElement('video');
      vid.onloadedmetadata = () => {
        if (vid.videoWidth && vid.videoHeight) {
          setOrigDims(`${vid.videoWidth} × ${vid.videoHeight}`);
        }
      };
      vid.src = url;
    }

    // Read output dimensions
    if (job.outputDimensions && job.outputDimensions.width && job.outputDimensions.height) {
      setOutDims(`${job.outputDimensions.width} × ${job.outputDimensions.height}`);
    } else if (job.outputUrl && job.category === 'image') {
      const outImg = new Image();
      outImg.onload = () => setOutDims(`${outImg.naturalWidth} × ${outImg.naturalHeight}`);
      outImg.src = job.outputUrl;
    } else if (job.outputUrl && job.category === 'video') {
      const outVid = document.createElement('video');
      outVid.onloadedmetadata = () => {
        if (outVid.videoWidth && outVid.videoHeight) {
          setOutDims(`${outVid.videoWidth} × ${outVid.videoHeight}`);
        }
      };
      outVid.src = job.outputUrl;
    }

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [job]);

  const savings = calculateSavings(job.file.size, job.outputSize || 0);

  const handleDownload = () => {
    if (!job.outputUrl || !job.outputBlob) return;
    const a = document.createElement('a');
    a.href = job.outputUrl;
    a.download = job.outputName || 'mediaforge_result';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isVisual = job.category === 'image' || job.category === 'video';
  const isVideo = job.category === 'video';

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl text-left">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {isVideo ? '✓ VIDEO READY' : '✓ COMPLETE'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                100% Processed Locally
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-sm">
              {job.outputName || job.file.name}
            </h3>
          </div>
        </div>

        {savings.isSmaller && savings.percent > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
            <ArrowDownRight className="w-4 h-4" />
            <span>-{savings.percent}% size</span>
          </div>
        )}
      </div>

      {/* Comparison Metrics with Dimensions and Quality Display */}
      <div className="grid grid-cols-2 gap-4 my-6">
        {/* Original File */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Original File
          </span>

          {origDims && (
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{origDims}</span>
            </div>
          )}

          <div className="text-xl font-black text-slate-900 dark:text-white">
            {formatBytes(job.file.size)}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-white/5">
            <span className="truncate max-w-[130px]">{job.file.name}</span>
            <span className="font-semibold uppercase">{job.fileInfo.extension}</span>
          </div>
        </div>

        {/* Processed Output File */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Processed Output
            </span>
            {job.outputQuality && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 truncate max-w-[120px]">
                {job.outputQuality}
              </span>
            )}
          </div>

          {(outDims || origDims) && (
            <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>{outDims || origDims}</span>
            </div>
          )}

          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
            {formatBytes(job.outputSize || 0)}
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-indigo-500/10">
            <span className="truncate max-w-[130px]">{job.outputName}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {savings.isSmaller ? `-${savings.percent}%` : 'Optimized'}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Preview / Comparison View */}
      {job.outputUrl && isVisual && (
        <div className="mb-6">
          {showCompare ? (
            <BeforeAfterCompare
              beforeUrl={originalUrl}
              afterUrl={job.outputUrl}
              beforeLabel={`Original (${origDims || 'Source'})`}
              afterLabel={`Output (${outDims || origDims || 'Processed'})`}
            />
          ) : job.category === 'image' ? (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 p-2">
              <img
                src={job.outputUrl}
                alt="Processed output"
                className="max-h-[350px] w-auto mx-auto object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-black p-1">
              <video
                src={job.outputUrl}
                controls
                className="max-h-[350px] w-full rounded-lg"
              />
            </div>
          )}
        </div>
      )}

      {/* Audio player preview */}
      {job.category === 'audio' && job.outputUrl && (
        <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
          <audio src={job.outputUrl} controls className="w-full" />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isVisual && job.category === 'image' && (
            <button
              onClick={() => setShowCompare(!showCompare)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              <SplitSquareVertical className="w-4 h-4" />
              <span>{showCompare ? 'Hide Comparison' : 'Compare Split'}</span>
            </button>
          )}

          {isVideo && onEditAgain && (
            <button
              onClick={onEditAgain}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors w-full sm:w-auto"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Again</span>
            </button>
          )}

          <button
            onClick={onReset}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Process Another</span>
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all w-full sm:w-auto"
        >
          <Download className="w-4 h-4" />
          <span>{isVideo ? 'Download Video' : 'Download File'}</span>
        </button>
      </div>
    </div>
  );
};
