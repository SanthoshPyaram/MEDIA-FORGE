import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Do my files get uploaded to any server or cloud database?',
      a: 'Never. MediaForge operates under a strict zero-upload architecture. When you select or drop a file, it stays entirely in your device’s local memory and is processed through WebAssembly, Canvas, and Web Workers. We have no backend conversion server, no database, and no tracking of file contents.',
    },
    {
      q: 'Are there file size limitations?',
      a: 'Because files are processed directly inside your browser tab’s available RAM, files under 200MB–300MB will convert smoothly and rapidly on most modern computers. For very large files (e.g. 1GB+ 4K videos), browser tab memory limits set by Chrome/Edge/Firefox may apply.',
    },
    {
      q: 'How does MediaForge compare in speed to traditional online converters?',
      a: 'Traditional converters require you to wait for a full upload (which can take minutes on home connections), wait in an online server queue, and then wait for a download. MediaForge begins processing instantly on your local CPU without sending any data over the internet.',
    },
    {
      q: 'How does the Super-Resolution Image Upscaling work?',
      a: 'We use high-fidelity edge-directed Lanczos resampling and multi-step progressive scaling algorithms written in Canvas and Web Workers. It sharpens object contours and transitions without hallucinating fake details or uploading your images to remote servers.',
    },
    {
      q: 'Can MediaForge work completely offline?',
      a: 'Yes! Once the web application and its WebAssembly engines have loaded in your browser cache, you can disconnect your Wi-Fi or go into airplane mode and continue converting images, videos, audio, and documents locally.',
    },
    {
      q: 'Do I need to sign up, subscribe, or create an account?',
      a: 'No account, password, credit card, or email address is ever required. MediaForge is completely free and friction-free.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-white/5">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          Everything you need to know about browser-local processing and MediaForge.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-indigo-500' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

