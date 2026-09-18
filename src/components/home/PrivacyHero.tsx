import React from 'react';
import { ShieldCheck, Lock, EyeOff, ServerOff, CheckCircle2, XCircle } from 'lucide-react';

export const PrivacyHero: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-white/5">
      <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-indigo-900/10 via-slate-900/40 to-cyan-900/10 border border-indigo-500/20 backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-4">
              <ShieldCheck className="w-4 h-4" />
              <span>Zero-Knowledge Architecture</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              Your browser does the work.
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
              Conventional file converters upload your sensitive photos, contracts, and videos to cloud servers,
              leaving your confidential data exposed on external disks and databases.
            </p>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
              <strong>MediaForge changes this completely.</strong> All processing occurs inside your browser&apos;s
              sandboxed memory space via WebAssembly. When you close the tab, the memory is purged immediately.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>No account or sign-up needed</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <ServerOff className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>No database or cloud storage</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <EyeOff className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero telemetry on file contents</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Works offline once loaded</span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Comparison Box */}
          <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200 dark:border-white/10 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
              Architectural Comparison
            </h3>

            <div className="space-y-4 text-xs">
              {/* Cloud Converter */}
              <div className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/15">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold mb-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Traditional Cloud Converters</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  Slow upload across the internet → Stored in remote AWS/GCP buckets → Processed on remote servers → Download link generated.
                </p>
              </div>

              {/* MediaForge */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold mb-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>MediaForge (Browser-Local)</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Direct byte transfer to local WebAssembly sandbox → Multithreaded CPU processing on your device → Instant memory download. 0 bytes uploaded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

