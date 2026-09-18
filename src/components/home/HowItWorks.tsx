import React from 'react';
import { UploadCloud, Sliders, Cpu, Download } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01',
      title: 'Select or Drop Files',
      desc: 'Pick your files from your hard drive, drag & drop, or paste directly from your clipboard.',
      icon: UploadCloud,
    },
    {
      num: '02',
      title: 'Customize Settings',
      desc: 'Pick resolution, quality, filters, trim points, page ordering, or use ✨ Smart Process.',
      icon: Sliders,
    },
    {
      num: '03',
      title: 'Local Processing',
      desc: 'WebAssembly & Web Workers process bytes using your local CPU/GPU cores in an isolated sandbox.',
      icon: Cpu,
    },
    {
      num: '04',
      title: 'Instant Download',
      desc: 'Review side-by-side comparisons, view exact size savings, and save directly to disk.',
      icon: Download,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-white/5">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          How It Works
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Effortless four-step transformation pipeline without waiting for uploads or server queues.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="relative p-6 rounded-3xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-slate-200 dark:text-white/10 select-none">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

