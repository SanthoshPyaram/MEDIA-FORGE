import React from 'react';
import { ShieldCheck, Cpu, HardDrive, Lock, Globe } from 'lucide-react';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const caps = useDeviceCapabilities();

  return (
    <footer className="w-full border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-[#070a11]/90 backdrop-blur-md mt-20 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Guarantee */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-cyan-400">
                MEDIAFORGE
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> 100% Client-Side
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
              MediaForge processes your videos, images, audio, and documents directly inside your browser
              using WebAssembly and Web Workers. Your files are never uploaded to any remote server or database.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>{caps.hardwareConcurrency} CPU Cores</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10">
                <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
                <span>WebAssembly {caps.hasWebAssembly ? 'Active' : 'Disabled'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Zero Server Uploads</span>
              </div>
            </div>
          </div>

          {/* Col 2: Fast Tools */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Workspaces
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button onClick={() => onNavigate('video')} className="hover:text-indigo-500 transition-colors">
                  Video Converter & Enhancer
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('image')} className="hover:text-indigo-500 transition-colors">
                  Image Studio & Upscaler
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('audio')} className="hover:text-indigo-500 transition-colors">
                  Audio Trimmer & Converter
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pdf')} className="hover:text-indigo-500 transition-colors">
                  PDF Merger & Page Manager
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('document')} className="hover:text-indigo-500 transition-colors">
                  Document & Spreadsheet Suite
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Principles & Privacy */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-4">
              Privacy & Trust
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-indigo-500 transition-colors">
                  Architecture & Privacy Statement
                </button>
              </li>
              <li>
                <span className="text-xs text-slate-500 dark:text-slate-500 block">
                  • No accounts or sign-up needed
                </span>
              </li>
              <li>
                <span className="text-xs text-slate-500 dark:text-slate-500 block">
                  • No database or remote telemetry
                </span>
              </li>
              <li>
                <span className="text-xs text-slate-500 dark:text-slate-500 block">
                  • Deployable anywhere as static frontend
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} MediaForge. Free, private, open browser technology.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> Runs 100% Offline After Load
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

