import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sliders,
  Scissors,
  Minimize2,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { useFileDetector } from '@/hooks/useFileDetector';
import { DetectedFileInfo, FileCategory } from '@/types/job';
import { formatDuration, formatResolution } from '@/utils/formatters';

interface UniversalUploadZoneProps {
  onFileDetected: (fileInfo: DetectedFileInfo, defaultOperation?: string) => void;
  onBatchDetected: (files: DetectedFileInfo[]) => void;
  onSmartProcess: (fileInfo: DetectedFileInfo) => void;
}

export const UniversalUploadZone: React.FC<UniversalUploadZoneProps> = ({
  onFileDetected,
  onBatchDetected,
  onSmartProcess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory>('video');
  const [analyzedFile, setAnalyzedFile] = useState<DetectedFileInfo | null>(null);
  const [analyzedBatch, setAnalyzedBatch] = useState<DetectedFileInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { analyzeFile, analyzeMultipleFiles, isDetecting } = useFileDetector();

  // Paste from clipboard listener
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length === 1) {
        const info = await analyzeFile(files[0]);
        setAnalyzedFile(info);
      } else if (files.length > 1) {
        const batch = await analyzeMultipleFiles(files);
        setAnalyzedBatch(batch);
        onBatchDetected(batch);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [analyzeFile, analyzeMultipleFiles, onBatchDetected]);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    if (droppedFiles.length === 1) {
      const info = await analyzeFile(droppedFiles[0]);
      setAnalyzedFile(info);
    } else {
      const batch = await analyzeMultipleFiles(droppedFiles);
      setAnalyzedBatch(batch);
      onBatchDetected(batch);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFiles = Array.from(e.target.files);

    if (selectedFiles.length === 1) {
      const info = await analyzeFile(selectedFiles[0]);
      setAnalyzedFile(info);
    } else {
      const batch = await analyzeMultipleFiles(selectedFiles);
      setAnalyzedBatch(batch);
      onBatchDetected(batch);
    }
  };

  const handleSelectOperation = (opId: string) => {
    if (analyzedFile) {
      onFileDetected(analyzedFile, opId);
    }
  };

  const getAcceptString = () => {
    switch (selectedCategory) {
      case 'video':
        return 'video/*,.mp4,.mov,.mkv,.avi,.webm,.ts,.m4v,.3gp';
      case 'image':
        return 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg';
      case 'audio':
        return 'audio/*,.mp3,.wav,.ogg,.aac,.m4a,.flac';
      case 'pdf':
        return '.pdf';
      case 'document':
        return '.docx,.xlsx,.xls,.csv,.txt,.md';
      default:
        return '*/*';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Category Selection Filter - Specific Categories Only */}
      <div className="flex items-center justify-center flex-wrap gap-2 mb-4">
        {[
          { id: 'video', label: 'VIDEO', icon: Film },
          { id: 'image', label: 'IMAGE', icon: ImageIcon },
          { id: 'audio', label: 'AUDIO', icon: Music },
          { id: 'pdf', label: 'PDF', icon: FileText },
          { id: 'document', label: 'DOCUMENT', icon: FileSpreadsheet },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              selectedCategory === cat.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !analyzedFile && fileInputRef.current?.click()}
        className={`relative group rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer border-2 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[1.01] shadow-2xl shadow-indigo-500/20'
            : 'border-dashed border-slate-300 dark:border-white/15 bg-white/70 dark:bg-slate-900/60 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-900/90 shadow-xl dark:shadow-2xl backdrop-blur-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptString()}
          onChange={handleFileChange}
          className="hidden"
        />

        {isDetecting ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Analyzing file signatures & characteristics...
            </p>
          </div>
        ) : analyzedFile ? (
          /* Universal File Detection Analysis Display */
          <div className="text-left space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 overflow-hidden shrink-0 shadow-xs">
                  {analyzedFile.thumbnailUrl ? (
                    <img
                      src={analyzedFile.thumbnailUrl}
                      alt={analyzedFile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : analyzedFile.category === 'video' ? (
                    <Film className="w-7 h-7" />
                  ) : analyzedFile.category === 'image' ? (
                    <ImageIcon className="w-7 h-7" />
                  ) : analyzedFile.category === 'audio' ? (
                    <Music className="w-7 h-7" />
                  ) : analyzedFile.category === 'pdf' ? (
                    <FileText className="w-7 h-7" />
                  ) : (
                    <FileSpreadsheet className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      {analyzedFile.category}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                      {analyzedFile.extension}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 break-all">
                    {analyzedFile.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnalyzedFile(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  Choose Different File
                </button>
                <button
                  onClick={() => onSmartProcess(analyzedFile)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
                  ✨ SMART PROCESS
                </button>
              </div>
            </div>

            {/* File Characteristics Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">File Size</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{analyzedFile.formattedSize}</span>
              </div>
              {analyzedFile.category === 'video' && (
                <>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Dimensions</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {(analyzedFile.metadata as any)?.width && (analyzedFile.metadata as any)?.height
                        ? `${(analyzedFile.metadata as any).width} × ${(analyzedFile.metadata as any).height}`
                        : formatResolution(
                            (analyzedFile.metadata as any)?.width,
                            (analyzedFile.metadata as any)?.height
                          )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Duration</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {formatDuration((analyzedFile.metadata as any)?.duration)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Framerate</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {(analyzedFile.metadata as any)?.fps || 30} FPS
                    </span>
                  </div>
                </>
              )}
              {analyzedFile.category === 'image' && (
                <>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Dimensions</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {(analyzedFile.metadata as any)?.width && (analyzedFile.metadata as any)?.height
                        ? `${(analyzedFile.metadata as any).width} × ${(analyzedFile.metadata as any).height} px`
                        : 'Auto-detecting...'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Aspect Ratio</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {((analyzedFile.metadata as any)?.aspectRatio || 1).toFixed(2)} : 1
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[10px] uppercase font-bold tracking-wider">Verified Format</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {analyzedFile.extension.toUpperCase()}
                    </span>
                  </div>
                </>
              )}
              {analyzedFile.category === 'pdf' && (
                <>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Page Count</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {(analyzedFile.metadata as any)?.pageCount || 1} Pages
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Security</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">Decrypted</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Engine</span>
                    <span className="font-bold text-slate-900 dark:text-white">pdf-lib (Local)</span>
                  </div>
                </>
              )}
              {analyzedFile.category === 'audio' && (
                <>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Duration</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formatDuration((analyzedFile.metadata as any)?.duration)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Channels</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {(analyzedFile.metadata as any)?.channels || 2} (Stereo)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Sample Rate</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {(analyzedFile.metadata as any)?.sampleRate || 44100} Hz
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Available Action Operations */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Available Operations for this {analyzedFile.category.toUpperCase()}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {analyzedFile.supportedOperations.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => handleSelectOperation(op.id)}
                    className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 border border-slate-200 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/40 text-left transition-all group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {op.label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {op.description}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Empty / Default Dropzone State */
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Drag & drop files here, or{' '}
                <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-4 decoration-indigo-400/50">
                  browse
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Supports Video, Image, Audio, PDF, and Documents • Multiple files supported • Paste with Ctrl+V
              </p>
            </div>

            {/* Privacy indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Your files stay on your device</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

