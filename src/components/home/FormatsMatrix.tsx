import React, { useState } from 'react';
import { Search, CheckCircle2, AlertCircle } from 'lucide-react';

export const FormatsMatrix: React.FC = () => {
  const [filter, setFilter] = useState('');

  const formats = [
    { name: 'MP4', category: 'Video', input: true, output: true, engine: 'FFmpeg.wasm (H.264/AAC)', note: 'Maximum compatibility across all browsers & OS' },
    { name: 'WebM', category: 'Video', input: true, output: true, engine: 'FFmpeg.wasm (VP9/Opus)', note: 'Ideal for web distribution & small size' },
    { name: 'MOV', category: 'Video', input: true, output: true, engine: 'FFmpeg.wasm', note: 'Apple QuickTime container' },
    { name: 'MKV', category: 'Video', input: true, output: false, engine: 'FFmpeg.wasm decoder', note: 'Transcodes into MP4 or WebM' },
    { name: 'AVI', category: 'Video', input: true, output: false, engine: 'FFmpeg.wasm decoder', note: 'Transcodes into modern formats' },
    { name: 'JPG / JPEG', category: 'Image', input: true, output: true, engine: 'Canvas 2D / WebGL', note: 'Full quality and compression control' },
    { name: 'PNG', category: 'Image', input: true, output: true, engine: 'Canvas 2D / WebGL', note: 'Lossless with transparent alpha channel' },
    { name: 'WebP', category: 'Image', input: true, output: true, engine: 'Canvas 2D / WebGL', note: 'Modern high compression format' },
    { name: 'BMP / ICO', category: 'Image', input: true, output: true, engine: 'Canvas 2D', note: 'Standard bitmap formats' },
    { name: 'MP3', category: 'Audio', input: true, output: true, engine: 'FFmpeg (libmp3lame)', note: 'Universal audio up to 320 kbps' },
    { name: 'WAV', category: 'Audio', input: true, output: true, engine: 'Web Audio / FFmpeg', note: 'Uncompressed PCM studio audio' },
    { name: 'OGG', category: 'Audio', input: true, output: true, engine: 'FFmpeg (libvorbis)', note: 'Open container format' },
    { name: 'PDF', category: 'PDF', input: true, output: true, engine: 'pdf-lib', note: 'Merge, split, rotate, reorder, compress' },
    { name: 'DOCX', category: 'Document', input: true, output: true, engine: 'Mammoth.js & pdf-lib', note: 'Export to clean PDF or HTML' },
    { name: 'XLSX / CSV', category: 'Document', input: true, output: true, engine: 'SheetJS', note: 'Spreadsheet viewer & CSV/JSON converter' },
    { name: 'TXT / MD', category: 'Document', input: true, output: true, engine: 'pdf-lib', note: 'Formatted typography PDF builder' },
  ];

  const filtered = formats.filter(
    (f) =>
      f.name.toLowerCase().includes(filter.toLowerCase()) ||
      f.category.toLowerCase().includes(filter.toLowerCase()) ||
      f.note.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200/80 dark:border-white/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Supported Formats & Engines
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            MediaForge only advertises formats that the in-browser engines can genuinely decode and transcode.
          </p>
        </div>

        {/* Search Filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search formats or codecs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">
              <th className="py-3 px-4">Format</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Input</th>
              <th className="py-3 px-4">Output</th>
              <th className="py-3 px-4">Browser Engine</th>
              <th className="py-3 px-4">Capability Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{item.name}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-medium">
                    {item.category}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </td>
                <td className="py-3 px-4">
                  {item.output ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <span className="text-slate-400 font-medium">Input only</span>
                  )}
                </td>
                <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-mono">{item.engine}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{item.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

