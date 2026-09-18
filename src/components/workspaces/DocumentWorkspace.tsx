import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Code,
  Table,
  Sparkles,
  Download,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';
import { formatBytes } from '@/utils/formatters';

interface DocumentWorkspaceProps {
  initialFile?: DetectedFileInfo | null;
  onStartJob: (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any>) => void;
}

export const DocumentWorkspace: React.FC<DocumentWorkspaceProps> = ({ initialFile, onStartJob }) => {
  const [fileInfo, setFileInfo] = useState<DetectedFileInfo | null>(initialFile || null);
  const [docType, setDocType] = useState<'docx' | 'sheet' | 'txt' | 'unsupported'>('docx');

  useEffect(() => {
    if (initialFile) {
      setFileInfo(initialFile);
      const ext = initialFile.extension.toLowerCase();
      if (ext === 'docx') setDocType('docx');
      else if (['xlsx', 'xls', 'csv'].includes(ext)) setDocType('sheet');
      else if (['txt', 'md', 'log'].includes(ext)) setDocType('txt');
      else setDocType('unsupported');
    }
  }, [initialFile]);

  const handleFileChange = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const info: DetectedFileInfo = {
      file,
      name: file.name,
      extension: ext,
      mimeType: file.type || 'application/octet-stream',
      realMimeType: file.type,
      category: 'document',
      size: file.size,
      formattedSize: formatBytes(file.size),
      supportedOperations: [],
    };
    setFileInfo(info);
    if (ext === 'docx') setDocType('docx');
    else if (['xlsx', 'xls', 'csv'].includes(ext)) setDocType('sheet');
    else if (['txt', 'md', 'log'].includes(ext)) setDocType('txt');
    else setDocType('unsupported');
  };

  if (!fileInfo) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-12 text-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl">
        <FileSpreadsheet className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          No document loaded
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Upload a Word (.docx), Excel (.xlsx, .csv), or plain text (.txt, .md) file to process.
        </p>
        <label className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer shadow-md shadow-blue-600/25 transition-all">
          Browse Document
          <input
            type="file"
            accept=".docx,.xlsx,.xls,.csv,.txt,.md,.log"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileChange(file);
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              📊 DOCUMENT & SPREADSHEET LAB
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fileInfo.name} ({fileInfo.formattedSize})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Convert Documents & Spreadsheets
          </h2>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {docType === 'docx' && (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Microsoft Word Document (.docx)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Parsed locally via Mammoth.js and rendered into clean vector PDF or HTML.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => onStartJob(fileInfo, 'docx_to_pdf', {})}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-blue-500/50 bg-slate-50 dark:bg-white/5 text-left transition-all group cursor-pointer"
              >
                <FileText className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Convert to PDF
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Generates a paginated, formatted PDF document with vector text.
                </p>
              </button>

              <button
                onClick={() => onStartJob(fileInfo, 'docx_to_html', {})}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-white/5 text-left transition-all group"
              >
                <Code className="w-8 h-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Extract Clean HTML
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Exports semantically structured HTML markup and web styling.
                </p>
              </button>
            </div>
          </div>
        )}

        {docType === 'sheet' && (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Spreadsheet File ({fileInfo.extension.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Processed via SheetJS engine directly in memory.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={() => onStartJob(fileInfo, 'sheet_to_csv', { targetFormat: 'csv' })}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-white/5 text-left transition-all group"
              >
                <Table className="w-8 h-8 text-emerald-500 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Export to CSV
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Extracts raw tabular data separated by standard commas.
                </p>
              </button>

              <button
                onClick={() => onStartJob(fileInfo, 'sheet_to_csv', { targetFormat: 'json' })}
                className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 bg-slate-50 dark:bg-white/5 text-left transition-all group"
              >
                <Code className="w-8 h-8 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Export to JSON Array
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Converts rows into structured JSON key-value records.
                </p>
              </button>
            </div>
          </div>
        )}

        {docType === 'txt' && (
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Plain Text / Markdown ({fileInfo.extension.toUpperCase()})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Converts plain text or code files into a printable, formatted PDF.
              </p>
            </div>

            <button
              onClick={() => onStartJob(fileInfo, 'txt_to_pdf', {})}
              className="p-5 w-full rounded-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-white/5 text-left transition-all flex items-center justify-between"
            >
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Generate PDF Document
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Wraps lines, formats margins, and embeds monospace fonts.
                </p>
              </div>
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </button>
          </div>
        )}

        {docType === 'unsupported' && (
          <div className="p-8 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200">
              Format Unsupported In Browser
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto leading-relaxed">
              This conversion requires a compatible browser-side engine and is not available for this file type ({fileInfo.extension}). MediaForge does not upload files to remote servers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

