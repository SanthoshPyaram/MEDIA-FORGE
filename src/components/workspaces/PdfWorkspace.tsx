import React, { useState, useEffect } from 'react';
import {
  FileText,
  Layers,
  Scissors,
  RotateCw,
  Plus,
  Trash2,
  Sparkles,
  ArrowUpDown,
  Download,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Shuffle,
  RotateCcw,
  Check,
  Eye,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';
import { formatBytes } from '@/utils/formatters';
import { mergePdfs, imagesToPdf, compressPdf } from '@/lib/pdf/pdf-engine';

interface PdfWorkspaceProps {
  initialFile?: DetectedFileInfo | null;
  onStartJob: (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any>) => void;
}

interface PageItem {
  id: string;
  originalIndex: number;
  rotation: number;
}

export interface ImageOrderItem {
  id: string;
  file: File;
  previewUrl: string;
  orderNumber: number;
  name: string;
  size: number;
  formattedSize: string;
}

export interface MergePdfItem {
  id: string;
  file: File;
  orderNumber: number;
  name: string;
  size: number;
  formattedSize: string;
}

export const PdfWorkspace: React.FC<PdfWorkspaceProps> = ({ initialFile, onStartJob }) => {
  const [activeTab, setActiveTab] = useState<'reorder' | 'merge' | 'images_to_pdf' | 'compress'>('images_to_pdf');
  const [pdfFile, setPdfFile] = useState<DetectedFileInfo | null>(initialFile || null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // For Merge PDFs Table
  const [mergeItems, setMergeItems] = useState<MergePdfItem[]>([]);

  // For Images to PDF Table
  const [imageItems, setImageItems] = useState<ImageOrderItem[]>([]);
  const [pageSize, setPageSize] = useState<'A4' | 'fit'>('A4');
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    if (initialFile) {
      setPdfFile(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    if (pdfFile) {
      const count = (pdfFile.metadata as any)?.pageCount || 4;
      const initialPages: PageItem[] = Array.from({ length: count }, (_, i) => ({
        id: `page_${i}`,
        originalIndex: i,
        rotation: 0,
      }));
      setPages(initialPages);
    }
  }, [pdfFile]);

  // Page reordering in Reorder tab
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === idx) return;

    const newPages = [...pages];
    const item = newPages.splice(draggedIdx, 1)[0];
    newPages.splice(idx, 0, item);
    setDraggedIdx(idx);
    setPages(newPages);
  };

  const rotatePage = (idx: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const deletePage = (idx: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReorderSubmit = () => {
    if (!pdfFile) return;
    onStartJob(pdfFile, 'reorder', {
      pageActions: pages.map((p) => ({ index: p.originalIndex, rotation: p.rotation })),
    });
  };

  // --- IMAGES TO PDF TABLE HANDLERS ---
  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const newItems: ImageOrderItem[] = Array.from(files).map((file, idx) => ({
      id: `img_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      orderNumber: imageItems.length + idx + 1,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
    }));
    setImageItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateImageOrderNumber = (id: string, newNumber: number) => {
    setImageItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, orderNumber: isNaN(newNumber) ? 1 : newNumber } : item))
    );
  };

  // Sort rows strictly by custom orderNumber values
  const handleSortImagesByNumber = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setImageItems((prev) => {
        const sorted = [...prev].sort((a, b) => a.orderNumber - b.orderNumber);
        // Clean re-sequence numbers to 1..N
        return sorted.map((item, idx) => ({ ...item, orderNumber: idx + 1 }));
      });
      setIsShuffling(false);
    }, 200);
  };

  // Randomly shuffle rows and renumber
  const handleRandomShuffleImages = () => {
    setIsShuffling(true);
    setTimeout(() => {
      setImageItems((prev) => {
        const shuffled = [...prev];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.map((item, idx) => ({ ...item, orderNumber: idx + 1 }));
      });
      setIsShuffling(false);
    }, 200);
  };

  const handleMoveImage = (idx: number, direction: 'up' | 'down') => {
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === imageItems.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const copy = [...imageItems];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);

    // Re-sequence order numbers
    setImageItems(copy.map((item, i) => ({ ...item, orderNumber: i + 1 })));
  };

  const handleDeleteImage = (id: string) => {
    setImageItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.map((item, idx) => ({ ...item, orderNumber: idx + 1 }));
    });
  };

  const handleImagesToPdfSubmit = async () => {
    if (imageItems.length === 0) return;
    const files = imageItems.map((item) => item.file);
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);

    const placeholderInfo: DetectedFileInfo = {
      file: files[0],
      name: `compiled_images_${Date.now()}.pdf`,
      extension: 'pdf',
      mimeType: 'application/pdf',
      realMimeType: 'application/pdf',
      category: 'pdf',
      size: totalSize,
      formattedSize: formatBytes(totalSize),
      supportedOperations: [],
    };
    onStartJob(placeholderInfo, 'images_to_pdf', { files, pageSize });
  };

  // --- MERGE PDF TABLE HANDLERS ---
  const handleAddMergePdfs = (files: FileList | null) => {
    if (!files) return;
    const newItems: MergePdfItem[] = Array.from(files).map((file, idx) => ({
      id: `pdf_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      orderNumber: mergeItems.length + idx + 1,
      name: file.name,
      size: file.size,
      formattedSize: formatBytes(file.size),
    }));
    setMergeItems((prev) => [...prev, ...newItems]);
  };

  const handleUpdateMergeOrderNumber = (id: string, newNumber: number) => {
    setMergeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, orderNumber: isNaN(newNumber) ? 1 : newNumber } : item))
    );
  };

  const handleSortMergeByNumber = () => {
    setMergeItems((prev) => {
      const sorted = [...prev].sort((a, b) => a.orderNumber - b.orderNumber);
      return sorted.map((item, idx) => ({ ...item, orderNumber: idx + 1 }));
    });
  };

  const handleMergeSubmit = () => {
    if (mergeItems.length < 2) return;
    const files = mergeItems.map((m) => m.file);
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);

    const placeholderInfo: DetectedFileInfo = {
      file: files[0],
      name: `merged_${Date.now()}.pdf`,
      extension: 'pdf',
      mimeType: 'application/pdf',
      realMimeType: 'application/pdf',
      category: 'pdf',
      size: totalSize,
      formattedSize: formatBytes(totalSize),
      supportedOperations: [],
    };
    onStartJob(placeholderInfo, 'merge', { files });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400">
              PDF & MULTI-FILE STUDIO
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Client-Side (pdf-lib)
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Table Reorder, Convert & Compile PDF
          </h2>
        </div>

        {/* Tab Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('images_to_pdf')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'images_to_pdf'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🖼️ Images → PDF Table
          </button>
          <button
            onClick={() => setActiveTab('merge')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'merge'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📑 Merge PDFs
          </button>
          <button
            onClick={() => setActiveTab('reorder')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'reorder'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            🔄 Reorder & Rotate
          </button>
          <button
            onClick={() => setActiveTab('compress')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              activeTab === 'compress'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md shadow-rose-600/25 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            📦 Compress
          </button>
        </div>
      </div>

      {/* TAB 1: Images to PDF Table Format with Numbering & Row Shuffling */}
      {activeTab === 'images_to_pdf' && (
        <div className="mt-8 max-w-4xl mx-auto space-y-6">
          {/* Upload Drop Zone */}
          <div className="p-8 text-center rounded-3xl border-2 border-dashed border-indigo-300 dark:border-indigo-500/30 bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Convert Images to PDF with Table Sequencing
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Select multiple images. Arrange, edit page numbers, and shuffle rows in the animated table below.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 hover:opacity-95 text-white font-bold text-xs cursor-pointer shadow-md shadow-indigo-600/25 btn-3d-neon">
              <Plus className="w-4 h-4" />
              <span>Choose Image Files</span>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAddImages(e.target.files)}
              />
            </label>
          </div>

          {/* Interactive Table of Selected Images */}
          {imageItems.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-xl space-y-5 animate-fade-in">
              {/* Table Controls Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Selected Images ({imageItems.length})</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono">
                      Editable Table
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Edit the row numbers to change PDF page sequence, then click &quot;Sort by Numbers&quot; or shuffle.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSortImagesByNumber}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Sort by Numbers</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRandomShuffleImages}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>🎲 Shuffle Rows</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageItems((prev) => prev.map((item, idx) => ({ ...item, orderNumber: idx + 1 })))}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    title="Renumber from 1 to N"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>1..N</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageItems([])}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Responsive Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px]">
                      <th className="py-3 px-4 w-20"># Page</th>
                      <th className="py-3 px-3 w-16">Preview</th>
                      <th className="py-3 px-4">Filename</th>
                      <th className="py-3 px-3 w-28">Size</th>
                      <th className="py-3 px-4 w-32 text-right">Reorder & Actions</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y divide-slate-100 dark:divide-white/5 transition-opacity duration-200 ${isShuffling ? 'opacity-40 scale-[0.99]' : 'opacity-100'}`}>
                    {imageItems.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="table-row-animated hover:bg-indigo-50/40 dark:hover:bg-white/3"
                      >
                        {/* 1. Editable Order Number */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max={imageItems.length * 2}
                              value={item.orderNumber}
                              onChange={(e) => handleUpdateImageOrderNumber(item.id, parseInt(e.target.value))}
                              className="w-12 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/15 font-mono font-bold text-center text-xs text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </td>

                        {/* 2. Thumbnail Preview */}
                        <td className="py-3 px-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 group relative">
                            <img
                              src={item.previewUrl}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-125"
                            />
                          </div>
                        </td>

                        {/* 3. Filename */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 dark:text-slate-100 block truncate max-w-xs" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400">Image file</span>
                        </td>

                        {/* 4. File Size */}
                        <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                          {item.formattedSize}
                        </td>

                        {/* 5. Row Controls: Up, Down, Delete */}
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'down')}
                              disabled={idx === imageItems.length - 1}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-colors"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteImage(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition-colors"
                              title="Remove from PDF"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Compilation Settings & Action */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Page Sizing:</span>
                  <button
                    type="button"
                    onClick={() => setPageSize('A4')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      pageSize === 'A4'
                        ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Standard A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageSize('fit')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      pageSize === 'fit'
                        ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Fit to Image Dimensions
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleImagesToPdfSubmit}
                  className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  ✨ Compile {imageItems.length} Images to PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Merge Multiple PDFs with Table Sequencing */}
      {activeTab === 'merge' && (
        <div className="mt-8 max-w-4xl mx-auto space-y-6">
          <div className="p-8 text-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
            <Layers className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Add PDF Documents to Merge
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Combine multiple documents into one single PDF in your specified table order.
            </p>
            <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md btn-3d-neon">
              <Plus className="w-4 h-4" />
              <span>Choose Multiple PDFs</span>
              <input
                type="file"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleAddMergePdfs(e.target.files)}
              />
            </label>
          </div>

          {mergeItems.length > 0 && (
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 shadow-xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    PDF Documents ({mergeItems.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Adjust row numbers to set merge sequence.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSortMergeByNumber}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Sort by Number</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMergeItems([])}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 uppercase font-mono text-[10px]">
                      <th className="py-3 px-4 w-20"># Order</th>
                      <th className="py-3 px-4">Document Name</th>
                      <th className="py-3 px-3 w-28">Size</th>
                      <th className="py-3 px-4 w-24 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {mergeItems.map((item) => (
                      <tr key={item.id} className="table-row-animated hover:bg-slate-50 dark:hover:bg-white/3">
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            min="1"
                            max={mergeItems.length * 2}
                            value={item.orderNumber}
                            onChange={(e) => handleUpdateMergeOrderNumber(item.id, parseInt(e.target.value))}
                            className="w-12 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/15 font-mono font-bold text-center text-xs text-indigo-600 dark:text-indigo-400"
                          />
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {item.formattedSize}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setMergeItems((prev) => prev.filter((m) => m.id !== item.id))}
                            className="p-1 hover:text-red-500 text-slate-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={handleMergeSubmit}
                disabled={mergeItems.length < 2}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                Merge {mergeItems.length} Documents Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Visual Reorder & Rotate */}
      {activeTab === 'reorder' && (
        <div className="mt-8 space-y-6">
          {!pdfFile ? (
            <div className="p-12 text-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
              <FileText className="w-14 h-14 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                No PDF Document Selected
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                Select a PDF to rearrange its pages and rotate orientation.
              </p>
              <label className="inline-block px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer">
                Select PDF
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPdfFile({
                        file: f,
                        name: f.name,
                        extension: 'pdf',
                        mimeType: 'application/pdf',
                        realMimeType: 'application/pdf',
                        category: 'pdf',
                        size: f.size,
                        formattedSize: formatBytes(f.size),
                        supportedOperations: [],
                      });
                    }
                  }}
                />
              </label>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pages ({pages.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Drag pages to rearrange. Hover to rotate or delete individual pages.
                  </p>
                </div>
                <button
                  onClick={handleReorderSubmit}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
                >
                  Apply & Save PDF
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    className="relative group p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 shadow-xs cursor-move hover:shadow-md transition-all text-center space-y-2"
                  >
                    <div
                      className="w-full h-36 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-400 transition-transform duration-200"
                      style={{ transform: `rotate(${p.rotation}deg)` }}
                    >
                      <FileText className="w-8 h-8 text-rose-400" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block font-mono">
                      Page {idx + 1}
                    </span>

                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/70 p-1 rounded-lg">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          rotatePage(idx);
                        }}
                        className="p-1 text-white hover:text-rose-400"
                        title="Rotate 90°"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePage(idx);
                        }}
                        className="p-1 text-white hover:text-red-400"
                        title="Delete Page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Compress PDF */}
      {activeTab === 'compress' && (
        <div className="mt-8 max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-center space-y-4">
          <FileText className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Compress PDF Document
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Optimizes internal stream objects and removes orphaned references to reduce file size.
          </p>
          {pdfFile ? (
            <button
              onClick={() => onStartJob(pdfFile, 'compress', {})}
              className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md btn-3d-neon"
            >
              Compress {pdfFile.name}
            </button>
          ) : (
            <label className="inline-block px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer btn-3d-neon">
              Select PDF to Compress
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setPdfFile({
                      file: f,
                      name: f.name,
                      extension: 'pdf',
                      mimeType: 'application/pdf',
                      realMimeType: 'application/pdf',
                      category: 'pdf',
                      size: f.size,
                      formattedSize: formatBytes(f.size),
                      supportedOperations: [],
                    });
                  }
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
};
export default PdfWorkspace;
