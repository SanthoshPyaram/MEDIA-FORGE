import React from 'react';
import { ShieldCheck, Zap, Sparkles, Lock, Cpu, Upload, Link } from 'lucide-react';

interface HeroProps {
  onScrollToUpload?: () => void;
  onUploadVideo?: () => void;
  onImportUrl?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onScrollToUpload,
  onUploadVideo,
  onImportUrl,
}) => {
  const handleUploadClick = () => {
    if (onUploadVideo) {
      onUploadVideo();
    } else if (onScrollToUpload) {
      onScrollToUpload();
    }
  };

  return (
    <div className="relative pt-12 pb-10 overflow-hidden text-center">
      {/* Background glowing gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-gradient-to-tr from-indigo-500/20 via-violet-500/15 to-cyan-500/20 blur-[130px] pointer-events-none rounded-full" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Privacy & Authorized Content Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 dark:bg-white/5 border border-indigo-500/20 dark:border-white/10 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm mb-6 backdrop-blur-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Local Browser Engine</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="text-slate-600 dark:text-slate-400 font-normal">Zero server storage • 100% Private</span>
        </div>

        {/* Main Hero Title */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12] mb-6">
          Turn Your Videos Into{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 dark:from-indigo-400 dark:via-violet-300 dark:to-cyan-300">
            Better Clips.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          Trim, crop, enhance, convert and customize your authorized videos.
        </p>

        {/* Primary Import Methods */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Video</span>
          </button>

          <button
            onClick={onImportUrl}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold text-sm sm:text-base border border-slate-200 dark:border-white/15 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Link className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Import Authorized URL</span>
          </button>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>WebAssembly FFmpeg</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Local & Confidential</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/70 dark:bg-white/5 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-cyan-500" />
            <span>Multi-Core Web Workers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Hero;
