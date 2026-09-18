import React from 'react';
import {
  ShieldCheck,
  Lock,
  ServerOff,
  Database,
  Cpu,
  EyeOff,
  HardDrive,
  FileCheck,
} from 'lucide-react';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';

export const PrivacyPage: React.FC = () => {
  const caps = useDeviceCapabilities();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in text-left">
      <div className="space-y-4 text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy & Architectural Transparency</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Privacy Policy & Engine Principles
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Learn exactly how MediaForge operates inside your browser and why your files never leave your device.
        </p>
      </div>

      <div className="space-y-8">
        {/* Core Principles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <Lock className="w-8 h-8 text-emerald-500 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Account Required
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              No login, email address, API keys, or cookies are needed. The application is completely open and free.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <Database className="w-8 h-8 text-indigo-500 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Database Required
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              MediaForge does not have MongoDB, PostgreSQL, Supabase, or Firebase. No metadata or file records exist anywhere.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 shadow-xs">
            <ServerOff className="w-8 h-8 text-cyan-500 mb-3" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Zero Server Uploads
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Files are not intentionally uploaded for browser-local processing. All bytes remain in client RAM.
            </p>
          </div>
        </div>

        {/* Detailed Architecture Breakdown */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            How Browser-Local Processing Functions
          </h2>

          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              When you select or drop a file on MediaForge, the browser&apos;s native File API creates an in-memory pointer (a <code>Blob</code> or <code>ArrayBuffer</code>). At no point in the network lifecycle is an HTTP <code>POST</code> or <code>PUT</code> request dispatched containing your file payload.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
                Processing Subsystems
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>
                  <strong>Video & Audio (FFmpeg.wasm):</strong> Compiles FFmpeg C/C++ source code directly into WebAssembly bytecode executed on your local CPU cores.
                </li>
                <li>
                  <strong>Images (Canvas & Web Workers):</strong> Offloads pixel manipulation (convolution matrices, sharpening, noise reduction, color space conversions) to background Web Workers without blocking the main UI thread.
                </li>
                <li>
                  <strong>Documents & PDFs (pdf-lib & Mammoth):</strong> Reads binary file streams client-side, manipulates vector pages in RAM, and compiles fresh PDF binaries.
                </li>
              </ul>
            </div>

            <p>
              <strong>Memory Safety:</strong> All Object URLs created during processing (<code>blob:http...</code>) are tracked in the execution state and destroyed using <code>URL.revokeObjectURL()</code> once a job finishes or is dismissed, freeing your system RAM.
            </p>
          </div>
        </div>

        {/* Device Capabilities Sandbox Inspection */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Current Device Sandbox Status
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 block">WebAssembly</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {caps.hasWebAssembly ? 'Supported' : 'Unavailable'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 block">Web Workers</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {caps.hasWebWorkers ? 'Supported' : 'Unavailable'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 block">CPU Hardware Cores</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {caps.hardwareConcurrency} Threads
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
              <span className="text-slate-500 block">Isolation Context</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {caps.isCrossOriginIsolated ? 'Cross-Origin Isolated' : 'Standard Web'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

