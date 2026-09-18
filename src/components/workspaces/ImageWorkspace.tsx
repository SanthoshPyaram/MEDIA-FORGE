import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Sparkles,
  Maximize2,
  Sliders,
  SplitSquareVertical,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';
import { formatBytes } from '@/utils/formatters';
import { BeforeAfterCompare } from '../shared/BeforeAfterCompare';

interface ImageWorkspaceProps {
  initialFile?: DetectedFileInfo | null;
  onStartJob: (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any>) => void;
}

export const ImageWorkspace: React.FC<ImageWorkspaceProps> = ({ initialFile, onStartJob }) => {
  const [fileInfo, setFileInfo] = useState<DetectedFileInfo | null>(initialFile || null);
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showCompare, setShowCompare] = useState(false);

  // Transformations
  const [outputFormat, setOutputFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/webp');
  const [quality, setQuality] = useState(0.92);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Resize
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [lockAspect, setLockAspect] = useState(true);

  // Filters
  const [smartEnhance, setSmartEnhance] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [denoise, setDenoise] = useState(0);
  const [blur, setBlur] = useState(0);
  const [grayscale, setGrayscale] = useState(0);

  // Upscale
  const [upscaleFactor, setUpscaleFactor] = useState<1 | 2 | 4>(1);
  const [upscaleQuality, setUpscaleQuality] = useState<'fast' | 'balanced' | 'high'>('high');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (initialFile) {
      setFileInfo(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    if (fileInfo?.file) {
      const url = URL.createObjectURL(fileInfo.file);
      setSourceUrl(url);

      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        setResizeWidth(img.naturalWidth);
        setResizeHeight(img.naturalHeight);
        setAspectRatio(img.naturalWidth / (img.naturalHeight || 1));
        updateCanvasPreview(img);
      };
      img.src = url;

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [fileInfo]);

  const updateCanvasPreview = (img?: HTMLImageElement) => {
    const targetImg = img || originalImageRef.current;
    if (!targetImg) return;

    const canvas = canvasRef.current || document.createElement('canvas');
    const w = targetImg.naturalWidth;
    const h = targetImg.naturalHeight;

    const isPerp = rotation % 180 !== 0;
    canvas.width = isPerp ? h : w;
    canvas.height = isPerp ? w : h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    // CSS filter approximation for real-time live preview responsiveness
    const b = smartEnhance ? 1.08 : 1 + brightness / 100;
    const c = smartEnhance ? 1.12 : 1 + contrast / 100;
    const s = smartEnhance ? 1.15 : 1 + saturation / 100;
    const g = grayscale;
    const bl = blur;

    ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s}) grayscale(${g}%) blur(${bl}px)`;
    ctx.drawImage(targetImg, -w / 2, -h / 2, w, h);
    ctx.restore();

    setPreviewUrl(canvas.toDataURL(outputFormat, quality));
  };

  useEffect(() => {
    updateCanvasPreview();
  }, [rotation, flipH, flipV, brightness, contrast, saturation, grayscale, blur, smartEnhance, outputFormat, quality]);

  const handleWidthChange = (val: number) => {
    setResizeWidth(val);
    if (lockAspect && aspectRatio > 0) {
      setResizeHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setResizeHeight(val);
    if (lockAspect && aspectRatio > 0) {
      setResizeWidth(Math.round(val * aspectRatio));
    }
  };

  const handleSubmit = () => {
    if (!fileInfo) return;

    if (upscaleFactor > 1) {
      onStartJob(fileInfo, 'upscale', {
        factor: upscaleFactor,
        quality: upscaleQuality,
        enhanceEdges: true,
      });
      return;
    }

    const options: Record<string, any> = {
      outputFormat,
      quality,
      rotation,
      flipH,
      flipV,
      smartEnhance,
      brightness: smartEnhance ? 8 : brightness,
      contrast: smartEnhance ? 12 : contrast,
      saturation: smartEnhance ? 10 : saturation,
      sharpen: smartEnhance ? 30 : sharpen,
      denoise: smartEnhance ? 15 : denoise,
      blur,
      grayscale,
    };

    if (resizeWidth > 0 && resizeHeight > 0) {
      options.resize = { width: resizeWidth, height: resizeHeight };
    }

    onStartJob(fileInfo, 'enhance', options);
  };

  if (!fileInfo) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-12 text-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl">
        <ImageIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          No image loaded
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Upload a JPG, PNG, WebP, BMP, or GIF to access the image editing studio.
        </p>
        <label className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer shadow-md shadow-emerald-600/25 transition-all">
          Browse Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileInfo({
                  file,
                  name: file.name,
                  extension: file.name.split('.').pop() || 'png',
                  mimeType: file.type,
                  realMimeType: file.type,
                  category: 'image',
                  size: file.size,
                  formattedSize: formatBytes(file.size),
                  supportedOperations: [],
                });
              }
            }}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Workspace Header with Emerald / Cyan Signature */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              🖼️ IMAGE STUDIO & ENHANCER
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fileInfo.name} ({fileInfo.formattedSize})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Transform, Enhance & Upscale Image
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCompare(!showCompare)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <SplitSquareVertical className="w-4 h-4" />
            <span>{showCompare ? 'Single View' : 'Compare Split'}</span>
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Process Image</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left 2 Cols: Preview Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl bg-slate-950 p-4 border border-slate-200 dark:border-white/10 shadow-2xl flex items-center justify-center min-h-[420px] overflow-hidden">
            {showCompare && previewUrl ? (
              <BeforeAfterCompare
                beforeUrl={sourceUrl}
                afterUrl={previewUrl}
                beforeLabel="Original"
                afterLabel="Adjusted"
              />
            ) : (
              <img
                src={previewUrl || sourceUrl}
                alt="Preview"
                className="max-h-[500px] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Quick Toolbar (Rotate & Flip) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate 90°</span>
              </button>
              <button
                onClick={() => setFlipH(!flipH)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  flipH
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                    : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Flip Horizontal"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFlipV(!flipV)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  flipV
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                    : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                title="Flip Vertical"
              >
                <FlipVertical className="w-4 h-4" />
              </button>
            </div>

            <span className="text-slate-500 font-mono">
              {resizeWidth} × {resizeHeight} px
            </span>
          </div>
        </div>

        {/* Right Col: Controls */}
        <div className="space-y-6">
          {/* Dimensions & Quality Status Card */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Source Dimensions
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm block">
                {originalImageRef.current
                  ? `${originalImageRef.current.naturalWidth} × ${originalImageRef.current.naturalHeight}`
                  : (fileInfo.metadata as any)?.width
                  ? `${(fileInfo.metadata as any).width} × ${(fileInfo.metadata as any).height}`
                  : `${resizeWidth} × ${resizeHeight}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Output Dimensions
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">
                {upscaleFactor > 1
                  ? `${resizeWidth * upscaleFactor} × ${resizeHeight * upscaleFactor} (${upscaleFactor}x)`
                  : `${resizeWidth} × ${resizeHeight}`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Target Quality
              </span>
              <span className="font-bold text-slate-900 dark:text-white block">
                {upscaleFactor > 1
                  ? `Super-Res (${upscaleQuality.toUpperCase()})`
                  : `${Math.round(quality * 100)}% (${outputFormat.replace('image/', '').toUpperCase()})`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Original Size
              </span>
              <span className="font-bold text-slate-900 dark:text-white block">
                {fileInfo.formattedSize}
              </span>
            </div>
          </div>

          {/* Format & Compression */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Format & Compression
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'image/webp', label: 'WebP' },
                { id: 'image/jpeg', label: 'JPEG' },
                { id: 'image/png', label: 'PNG' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setOutputFormat(fmt.id as any)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    outputFormat === fmt.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {outputFormat !== 'image/png' && (
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Quality Preset</span>
                  <span className="font-mono">{Math.round(quality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Super-Resolution Upscaling */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Super-Resolution Upscale
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Edge-Directed
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map((fac) => (
                <button
                  key={fac}
                  onClick={() => setUpscaleFactor(fac as any)}
                  className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    upscaleFactor === fac
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30'
                      : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  {fac === 1 ? '1x (Off)' : `${fac}x Scale`}
                </button>
              ))}
            </div>

            {upscaleFactor > 1 && (
              <div className="space-y-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block">Resampling Engine</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['fast', 'balanced', 'high'] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setUpscaleQuality(q)}
                      className={`py-1.5 capitalize rounded-lg text-xs font-medium border cursor-pointer ${
                        upscaleQuality === q
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                          : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Target dimensions: {resizeWidth * upscaleFactor} × {resizeHeight * upscaleFactor} px
                </p>
              </div>
            )}
          </div>

          {/* Color & Filters */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Filters & Grading
              </h3>
              <button
                onClick={() => setSmartEnhance(!smartEnhance)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                  smartEnhance
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>SMART</span>
              </button>
            </div>

            {!smartEnhance && (
              <>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Brightness</span>
                    <span className="font-mono">{brightness}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Contrast</span>
                    <span className="font-mono">{contrast}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={contrast}
                    onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Saturation</span>
                    <span className="font-mono">{saturation}</span>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={saturation}
                    onChange={(e) => setSaturation(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-500">Grayscale</span>
                    <span className="font-mono">{grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={grayscale}
                    onChange={(e) => setGrayscale(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

