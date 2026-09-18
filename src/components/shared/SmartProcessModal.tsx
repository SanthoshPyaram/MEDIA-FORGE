import React from 'react';
import { Sparkles, X, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';

interface SmartProcessModalProps {
  fileInfo: DetectedFileInfo;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: Record<string, any>) => void;
}

export const SmartProcessModal: React.FC<SmartProcessModalProps> = ({
  fileInfo,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  // Compute smart decisions tailored to file category and type
  const getDecisions = () => {
    switch (fileInfo.category) {
      case 'video':
        return {
          targetFormat: 'mp4',
          decisions: [
            { label: 'Container', val: 'MP4 (Universal compatibility across all OS & devices)' },
            { label: 'Video Codec', val: 'H.264 (AVC) with YUV420p color matrix' },
            { label: 'Audio Codec', val: 'AAC-LC 128 kbps Stereo' },
            { label: 'Target Quality', val: 'Balanced CRF 23 (Optimal perceptual fidelity & ~50% size reduction)' },
            { label: 'Smart Filter', val: 'Mild unsharp contrast enhancement enabled' },
          ],
          options: {
            outputFormat: 'mp4',
            quality: 'balanced',
            smartEnhance: true,
            resolution: 'original',
          },
        };
      case 'image':
        return {
          targetFormat: 'webp',
          decisions: [
            { label: 'Format Conversion', val: 'WebP (Superior modern compression, preserves alpha)' },
            { label: 'Compression Quality', val: '92% Quality with high-frequency edge retention' },
            { label: 'Color Balance', val: 'Smart contrast stretching & subtle sharpening' },
            { label: 'Estimated Reduction', val: '40% - 65% smaller than original JPEG/PNG' },
          ],
          options: {
            outputFormat: 'image/webp',
            quality: 0.92,
            smartEnhance: true,
          },
        };
      case 'audio':
        return {
          targetFormat: 'mp3',
          decisions: [
            { label: 'Target Format', val: 'MP3 (Universal compatibility)' },
            { label: 'Bitrate', val: '192 kbps (High quality stereo master)' },
            { label: 'Dynamic Range', val: 'Loudness normalization enabled (EBU R128 standard)' },
          ],
          options: {
            outputFormat: 'mp3',
            bitrate: '192k',
            normalize: true,
          },
        };
      case 'pdf':
        return {
          targetFormat: 'pdf',
          decisions: [
            { label: 'Stream Compression', val: 'Flate object stream optimization enabled' },
            { label: 'Redundant Objects', val: 'Strip orphaned cross-reference tables' },
          ],
          options: {
            compress: true,
          },
        };
      case 'document':
      default:
        return {
          targetFormat: 'pdf',
          decisions: [
            { label: 'Export Format', val: 'Standard A4 PDF Document' },
            { label: 'Typography', val: 'Clean vector font embedding with margins' },
          ],
          options: {
            targetFormat: 'pdf',
          },
        };
    }
  };

  const plan = getDecisions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                ONE-CLICK INTELLIGENT WORKFLOW
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ✨ SMART PROCESS
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source File Summary */}
        <div className="my-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
              Input File
            </span>
            <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px] block">
              {fileInfo.name}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">
              Detected Size
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{fileInfo.formattedSize}</span>
          </div>
        </div>

        {/* Recommended Decisions Checklist */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Intelligent Automation Decisions
          </h4>
          <div className="space-y-2">
            {plan.decisions.map((d, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-white/5 flex items-start gap-2.5 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">{d.label}</span>
                  <span className="text-slate-500 dark:text-slate-400">{d.val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(plan.options)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
          >
            <span>Execute Smart Optimization</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

