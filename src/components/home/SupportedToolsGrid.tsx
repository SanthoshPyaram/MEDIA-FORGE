import React from 'react';
import {
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface SupportedToolsGridProps {
  onSelectCategory: (category: string) => void;
}

export const SupportedToolsGrid: React.FC<SupportedToolsGridProps> = ({ onSelectCategory }) => {
  const categories = [
    {
      id: 'video',
      title: 'Video Processor',
      badge: 'FFmpeg.wasm',
      description: 'Transcode, trim, crop, mute, compress, and enhance video with hardware-level fidelity.',
      icon: Film,
      color: 'from-blue-500 to-indigo-600',
      iconColor: 'text-indigo-400',
      features: ['MP4, WebM, MOV, MKV, AVI', '360p to 4K Scaling', 'Smart Enhance & Sharpen', 'Precise Time Trimming'],
    },
    {
      id: 'image',
      title: 'Image Studio',
      badge: 'Canvas & WebGL',
      description: 'Convert between PNG, JPG, WebP, apply color corrections, filters, and algorithmic upscaling.',
      icon: ImageIcon,
      color: 'from-violet-500 to-purple-600',
      iconColor: 'text-violet-400',
      features: ['JPG, PNG, WebP, BMP, ICO', '2x & 4x Edge-Directed Upscale', 'Crop, Rotate & Compress', 'Live Before/After Slider'],
    },
    {
      id: 'audio',
      title: 'Audio Suite',
      badge: 'High Fidelity',
      description: 'Convert music & recordings, snip waveforms, adjust bitrates, and extract audio tracks from video.',
      icon: Music,
      color: 'from-cyan-500 to-teal-600',
      iconColor: 'text-cyan-400',
      features: ['MP3, WAV, OGG, AAC, WebM', 'Extract Audio from Video', 'Loudness Normalization', 'Bitrate up to 320 kbps'],
    },
    {
      id: 'pdf',
      title: 'PDF Workspace',
      badge: 'pdf-lib',
      description: 'Merge multiple PDFs, split ranges, visually rotate and reorder pages, and convert images to PDF.',
      icon: FileText,
      color: 'from-rose-500 to-pink-600',
      iconColor: 'text-rose-400',
      features: ['Images to PDF (JPG/PNG)', 'Drag-and-Drop Page Grid', 'Per-Page 90°/180° Rotate', 'Extract & Split Ranges'],
    },
    {
      id: 'document',
      title: 'Document & Sheet Engine',
      badge: 'Mammoth & SheetJS',
      description: 'Convert Word DOCX to clean PDF or HTML, export Excel sheets to CSV/JSON, and text to PDF.',
      icon: FileSpreadsheet,
      color: 'from-emerald-500 to-green-600',
      iconColor: 'text-emerald-400',
      features: ['DOCX to PDF & HTML', 'Excel (.xlsx) to CSV & JSON', 'Plain Text to Formatted PDF', 'Local In-Memory Parsing'],
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Dedicated Processing Workspaces
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
          Each file category has its own specialized studio engineered for speed, privacy, and zero data leakage.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className="group relative rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 p-6 sm:p-7 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 group-hover:scale-105 transition-transform">
                    <Icon className={`w-6 h-6 ${cat.iconColor}`} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                    {cat.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {cat.description}
                </p>

                <ul className="mt-5 space-y-2">
                  {cat.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">
                <span>Open {cat.title}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

