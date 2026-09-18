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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs mb-6 backdrop-blur-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
          <span className="font-semibold">Local Browser Engine</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <span className="text-slate-500 dark:text-slate-400">Zero server storage • 100% Private</span>
        </div>

        {/* Main Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-5">
          Turn Your Videos Into{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 dark:from-indigo-400 dark:via-violet-400 dark:to-purple-300">
            Better Clips.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-7">
          Trim, crop, enhance, convert and customize your authorized videos directly in your browser.
        </p>

        {/* Primary Import Methods */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-semibold text-sm shadow-sm shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Video</span>
          </button>

          <button
            onClick={onImportUrl}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-[0.98] text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <Link className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Import Authorized URL</span>
          </button>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>WebAssembly FFmpeg</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Local & Confidential</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Multi-Core Web Workers</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Hero;
