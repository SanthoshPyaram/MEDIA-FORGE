import React, { useRef } from 'react';
import {
  Scissors,
  Crop,
  Volume2,
  Sparkles,
  Maximize2,
  RotateCw,
  Stamp,
  SlidersHorizontal,
  Gauge,
  FileArchive,
  DownloadCloud,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Music,
  Trash2,
  ShieldCheck,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import {
  StudioTool,
  StudioState,
  CropPreset,
  FilterPreset,
  ResolutionPreset,
  SpeedPreset,
  SOCIAL_PRESETS,
} from '@/types/studio';
import { DetectedFileInfo } from '@/types/job';

interface StudioPropertiesPanelProps {
  activeTool: StudioTool;
  state: StudioState;
  fileInfo: DetectedFileInfo;
  duration: number;
  onUpdateState: (updater: Partial<StudioState> | ((prev: StudioState) => StudioState)) => void;
  onTriggerExport: () => void;
  onTriggerFilePicker: () => void;
  isCompareMode: boolean;
  onToggleCompare: () => void;
}

export const StudioPropertiesPanel: React.FC<StudioPropertiesPanelProps> = ({
  activeTool,
  state,
  fileInfo,
  duration,
  onUpdateState,
  onTriggerExport,
  onTriggerFilePicker,
  isCompareMode,
  onToggleCompare,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const watermarkImageInputRef = useRef<HTMLInputElement>(null);

  // Format seconds to MM:SS.ms
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(2, '0')}`;
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpdateState((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        customAudioEnabled: true,
        customAudioFile: file,
        customAudioName: file.name,
      },
    }));
  };

  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUpdateState((prev) => ({
      ...prev,
      watermark: {
        ...prev.watermark,
        type: 'image',
        imageFile: file,
        imageDataUrl: url,
        enabled: true,
      },
    }));
  };

  // Smart Enhance auto-configuration
  const handleSmartEnhance = () => {
    onUpdateState((prev) => ({
      ...prev,
      enhancement: {
        ...prev.enhancement,
        smartEnhance: !prev.enhancement.smartEnhance,
        brightness: 4,
        contrast: 12,
        saturation: 15,
        sharpness: 35,
        denoise: 10,
      },
    }));
  };

  const originalHeight =
    fileInfo.metadata && 'height' in fileInfo.metadata ? fileInfo.metadata.height : 1080;

  const isTargetUpscaling = (res: ResolutionPreset): boolean => {
    const heightMap: Record<ResolutionPreset, number> = {
      original: originalHeight,
      '360p': 360,
      '480p': 480,
      '720p': 720,
      '1080p': 1080,
      '1440p': 1440,
      '4k': 2160,
    };
    return heightMap[res] > originalHeight;
  };

  // Estimated file size calculation
  const getEstimatedSize = (): string => {
    const originalMB = fileInfo.size / (1024 * 1024);
    const trimRatio = state.trim.enabled && duration > 0 ? (state.trim.end - state.trim.start) / duration : 1;
    let factor = 1;
    if (state.compression.preset === 'max') factor = 1.3;
    else if (state.compression.preset === 'high') factor = 0.85;
    else if (state.compression.preset === 'balanced') factor = 0.55;
    else if (state.compression.preset === 'small') factor = 0.3;

    const est = originalMB * trimRatio * factor;
    return `${Math.max(0.5, est).toFixed(1)} MB`;
  };

  return (
    <aside className="w-80 md:w-96 border-l border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c1220] flex flex-col select-none overflow-y-auto shrink-0 p-5 space-y-6">
      {/* 1. IMPORT TOOL PANEL */}
      {activeTool === 'import' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Upload className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">File & Media</h3>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">File Name</span>
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{fileInfo.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block">Size</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{fileInfo.formattedSize}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Duration</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatTime(duration)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Format</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{fileInfo.extension}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Resolution</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {fileInfo.metadata && 'width' in fileInfo.metadata
                    ? `${fileInfo.metadata.width}×${fileInfo.metadata.height}`
                    : '1080p'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onTriggerFilePicker}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Choose Another Video</span>
          </button>
        </div>
      )}

      {/* 2. TRIM TOOL PANEL */}
      {activeTool === 'trim' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Scissors className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Precision Trim</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Drag the trim handles on the bottom timeline or manually specify start and end points below.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Time (seconds)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={state.trim.end - 0.1}
                  value={Number(state.trim.start.toFixed(2))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onUpdateState((prev) => ({
                      ...prev,
                      trim: { ...prev.trim, enabled: true, start: Math.max(0, val) },
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500 font-mono">{formatTime(state.trim.start)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Time (seconds)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min={state.trim.start + 0.1}
                  max={duration}
                  value={Number(state.trim.end.toFixed(2))}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || duration;
                    onUpdateState((prev) => ({
                      ...prev,
                      trim: { ...prev.trim, enabled: true, end: Math.min(duration, val) },
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500 font-mono">{formatTime(state.trim.end)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Selected Duration:</span>
              <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                {formatTime(state.trim.end - state.trim.start)}
              </span>
            </div>

            {/* Quick 1-Minute Short / Reel Limits */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Clip Presets (1-Min Limit)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      trim: { ...prev.trim, enabled: true, start: 0, end: Math.min(duration, 60) },
                    }))
                  }
                  className="py-1.5 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  ⏱️ 1-Min Short (0-60s)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      trim: { ...prev.trim, enabled: true, start: 0, end: Math.min(duration, 30) },
                    }))
                  }
                  className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 text-[11px] font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  ⚡ 30s Story / Reel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CROP TOOL PANEL */}
      {activeTool === 'crop' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Crop className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Crop & Framing</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={state.crop.enabled}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    crop: { ...prev.crop, enabled: e.target.checked },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
            </label>
          </div>

          {/* Social Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Social Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {SOCIAL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    const presetAspects: Record<CropPreset, { w: number; h: number }> = {
                      original: { w: 100, h: 100 },
                      '16:9': { w: 100, h: 56.25 },
                      '9:16': { w: 56.25, h: 100 },
                      '1:1': { w: 80, h: 80 },
                      '4:5': { w: 80, h: 100 },
                      '4:3': { w: 100, h: 75 },
                      custom: { w: 80, h: 80 },
                    };
                    const dim = presetAspects[p.aspect] || { w: 100, h: 100 };
                    onUpdateState((prev) => ({
                      ...prev,
                      crop: {
                        enabled: true,
                        preset: p.aspect,
                        x: Math.round((100 - dim.w) / 2),
                        y: Math.round((100 - dim.h) / 2),
                        width: dim.w,
                        height: dim.h,
                      },
                      exportSettings: {
                        ...prev.exportSettings,
                        resolution: p.resolution,
                        fps: p.fps,
                      },
                    }));
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    state.crop.preset === p.aspect
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-indigo-300 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block truncate">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.aspect}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Standard Aspect Presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Aspect Ratio</span>
            <div className="flex flex-wrap gap-1.5">
              {(['original', '16:9', '9:16', '1:1', '4:5', '4:3', 'custom'] as CropPreset[]).map((preset) => (
                <button
                  key={preset}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      crop: {
                        ...prev.crop,
                        enabled: true,
                        preset,
                      },
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                    state.crop.preset === preset
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. AUDIO TOOL PANEL */}
      {activeTool === 'audio' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Volume2 className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Audio Controls</h3>
          </div>

          {/* Original Audio Switch */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Original Audio Track</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.audio.originalAudioEnabled}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, originalAudioEnabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600" />
              </label>
            </div>

            {state.audio.originalAudioEnabled && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Original Volume</span>
                  <span className="font-bold font-mono">{Math.round(state.audio.originalVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={state.audio.originalVolume}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, originalVolume: parseFloat(e.target.value) },
                    }))
                  }
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            <button
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  audio: { ...prev.audio, originalAudioEnabled: false, originalVolume: 0 },
                }))
              }
              className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              Remove Original Audio
            </button>
          </div>

          {/* Add New Audio Track */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Add New Audio File</span>
              <span className="text-[10px] text-slate-400 uppercase font-mono">MP3/WAV/AAC</span>
            </div>

            <input
              type="file"
              ref={audioInputRef}
              accept="audio/*"
              onChange={handleCustomAudioUpload}
              className="hidden"
            />

            {state.audio.customAudioFile ? (
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Music className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                    {state.audio.customAudioFile.name}
                  </span>
                </div>
                <button
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, customAudioFile: null, customAudioEnabled: false },
                    }))
                  }
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-500 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Music className="w-4 h-4 text-indigo-500" />
                <span>Upload Audio Track</span>
              </button>
            )}

            {state.audio.customAudioFile && (
              <div className="space-y-3 pt-2">
                {/* Audio Mode: Replace vs Mix */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Audio Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          audio: { ...prev.audio, mode: 'replace', originalAudioEnabled: false },
                        }))
                      }
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        state.audio.mode === 'replace'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Replace Original
                    </button>
                    <button
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          audio: { ...prev.audio, mode: 'mix', originalAudioEnabled: true },
                        }))
                      }
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        state.audio.mode === 'mix'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Mix with Original
                    </button>
                  </div>
                </div>

                {/* New Audio Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>New Audio Volume</span>
                    <span className="font-bold font-mono">{Math.round(state.audio.customVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={state.audio.customVolume}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        audio: { ...prev.audio, customVolume: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                {/* Audio Behavior */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Audio Duration Behavior</label>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audioBehavior"
                        checked={state.audio.behavior === 'cut'}
                        onChange={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            audio: { ...prev.audio, behavior: 'cut' },
                          }))
                        }
                        className="text-indigo-600"
                      />
                      <span>Cut audio to video duration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audioBehavior"
                        checked={state.audio.behavior === 'loop'}
                        onChange={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            audio: { ...prev.audio, behavior: 'loop' },
                          }))
                        }
                        className="text-indigo-600"
                      />
                      <span>Loop audio to video duration</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="audioBehavior"
                        checked={state.audio.behavior === 'keep'}
                        onChange={() =>
                          onUpdateState((prev) => ({
                            ...prev,
                            audio: { ...prev.audio, behavior: 'keep' },
                          }))
                        }
                        className="text-indigo-600"
                      />
                      <span>Keep original audio length</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. ENHANCE TOOL PANEL */}
      {activeTool === 'enhance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Video Enhancement</h3>
            </div>
            <button
              onClick={onToggleCompare}
              className={`text-[11px] font-bold px-2 py-1 rounded transition-colors ${
                isCompareMode ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isCompareMode ? 'Original' : 'Compare'}
            </button>
          </div>

          {/* Smart Enhance Action */}
          <button
            onClick={handleSmartEnhance}
            className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all shadow-md ${
              state.enhancement.smartEnhance
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-cyan-500/20'
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{state.enhancement.smartEnhance ? 'Smart Enhance Active' : '✨ Smart Enhance Video'}</span>
          </button>

          {/* Sliders */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
            {/* Brightness */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Brightness</span>
                <span className="font-mono">{state.enhancement.brightness}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={state.enhancement.brightness}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    enhancement: { ...prev.enhancement, brightness: parseInt(e.target.value) },
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Contrast */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Contrast</span>
                <span className="font-mono">{state.enhancement.contrast}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={state.enhancement.contrast}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    enhancement: { ...prev.enhancement, contrast: parseInt(e.target.value) },
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Saturation</span>
                <span className="font-mono">{state.enhancement.saturation}</span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                value={state.enhancement.saturation}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    enhancement: { ...prev.enhancement, saturation: parseInt(e.target.value) },
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Sharpness</span>
                <span className="font-mono">{state.enhancement.sharpness}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={state.enhancement.sharpness}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    enhancement: { ...prev.enhancement, sharpness: parseInt(e.target.value) },
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Denoise */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Denoise</span>
                <span className="font-mono">{state.enhancement.denoise}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={state.enhancement.denoise}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    enhancement: { ...prev.enhancement, denoise: parseInt(e.target.value) },
                  }))
                }
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. RESIZE TOOL PANEL */}
      {activeTool === 'resize' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Maximize2 className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Resolution & Scale</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Maintains original aspect ratio without stretching. Higher resolutions than original are processed using high-fidelity upscaling.
          </p>

          <div className="space-y-2">
            {(['original', '360p', '480p', '720p', '1080p', '1440p', '4k'] as ResolutionPreset[]).map((res) => {
              const isSelected = state.exportSettings.resolution === res;
              const isUpscale = isTargetUpscaling(res);
              return (
                <button
                  key={res}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      exportSettings: { ...prev.exportSettings, resolution: res },
                    }))
                  }
                  className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="uppercase">{res === 'original' ? 'Original Resolution' : res}</span>
                  {isUpscale && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Upscaling
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. ROTATE & FLIP TOOL PANEL */}
      {activeTool === 'rotate' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <RotateCw className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Rotate & Flip</h3>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rotation</span>
            <div className="grid grid-cols-3 gap-2">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      transform: { ...prev.transform, rotate: deg as 0 | 90 | 180 | 270 },
                    }))
                  }
                  className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    state.transform.rotate === deg
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Flip Orientation</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    transform: { ...prev.transform, flipH: !prev.transform.flipH },
                  }))
                }
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  state.transform.flipH
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                Flip Horizontal
              </button>
              <button
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    transform: { ...prev.transform, flipV: !prev.transform.flipV },
                  }))
                }
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  state.transform.flipV
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                Flip Vertical
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. WATERMARK TOOL PANEL */}
      {activeTool === 'watermark' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Stamp className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Watermark Suite</h3>
          </div>

          {/* Section A: Add Watermark */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Add Watermark</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.watermark.enabled}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      watermark: { ...prev.watermark, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
              </label>
            </div>

            {state.watermark.enabled && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, type: 'text' },
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg font-bold ${
                      state.watermark.type === 'text'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Text Watermark
                  </button>
                  <button
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, type: 'image' },
                      }))
                    }
                    className={`flex-1 py-1.5 rounded-lg font-bold ${
                      state.watermark.type === 'image'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Logo Image
                  </button>
                </div>

                {state.watermark.type === 'text' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={state.watermark.text || ''}
                      onChange={(e) =>
                        onUpdateState((prev) => ({
                          ...prev,
                          watermark: { ...prev.watermark, text: e.target.value },
                        }))
                      }
                      placeholder="Enter watermark text..."
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      ref={watermarkImageInputRef}
                      accept="image/png,image/svg+xml,image/jpeg"
                      onChange={handleWatermarkImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => watermarkImageInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-indigo-500 font-bold"
                    >
                      {state.watermark.imageDataUrl ? 'Change Logo Image' : 'Upload PNG/SVG Logo'}
                    </button>
                  </div>
                )}

                {/* Opacity */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Opacity</span>
                    <span className="font-mono">{Math.round(state.watermark.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={state.watermark.opacity}
                    onChange={(e) =>
                      onUpdateState((prev) => ({
                        ...prev,
                        watermark: { ...prev.watermark, opacity: parseFloat(e.target.value) },
                      }))
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section B: Modify / Remove MY Watermark */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200">Modify MY Watermark</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.watermarkModify.enabled}
                  onChange={(e) =>
                    onUpdateState((prev) => ({
                      ...prev,
                      watermarkModify: { ...prev.watermarkModify, enabled: e.target.checked },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-600" />
              </label>
            </div>

            <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
              Only remove or modify watermarks you own or have permission to modify.
            </p>

            {state.watermarkModify.enabled && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-1.5">
                  {(['delogo', 'blur', 'pixelate', 'cover'] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          watermarkModify: { ...prev.watermarkModify, mode: m },
                        }))
                      }
                      className={`py-1.5 rounded-lg font-bold capitalize ${
                        state.watermarkModify.mode === m
                          ? 'bg-amber-600 text-white'
                          : 'bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] text-slate-500">
                  Tip: You can drag and position the amber removal bounding box directly on the video player!
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. FILTERS TOOL PANEL */}
      {activeTool === 'filters' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <SlidersHorizontal className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Filter Presets</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              ['original', 'bright', 'contrast', 'warm', 'cool', 'grayscale', 'vintage', 'sharp'] as FilterPreset[]
            ).map((filter) => (
              <button
                key={filter}
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    filter,
                  }))
                }
                className={`p-3 rounded-xl border text-xs font-bold capitalize text-left transition-all ${
                  state.filter === filter
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 10. SPEED TOOL PANEL */}
      {activeTool === 'speed' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Gauge className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Playback Speed</h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Adjust speed from 0.25× slow-motion to 2× fast-forward. Audio pitch is preserved automatically.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as SpeedPreset[]).map((spd) => (
              <button
                key={spd}
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    speed: spd,
                  }))
                }
                className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                  state.speed === spd
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                }`}
              >
                {spd}×
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 11. COMPRESS TOOL PANEL */}
      {activeTool === 'compress' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <FileArchive className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Compression</h3>
          </div>

          {/* Preset options */}
          <div className="space-y-2">
            {[
              { id: 'max', label: 'Maximum Quality', desc: 'Minimal compression, best visual fidelity' },
              { id: 'high', label: 'High Quality', desc: 'Slight compression, great balance' },
              { id: 'balanced', label: 'Balanced', desc: 'Recommended default for sharing & web' },
              { id: 'small', label: 'Small File', desc: 'Smaller file size for emails & quick uploads' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    compression: {
                      ...prev.compression,
                      preset: preset.id as any,
                    },
                  }))
                }
                className={`w-full p-3 rounded-xl border text-left transition-all ${
                  state.compression.preset === preset.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-600 text-indigo-700 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{preset.label}</div>
                <div className="text-[10px] text-slate-500">{preset.desc}</div>
              </button>
            ))}
          </div>

          {/* File Size Readout */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Original Size:</span>
              <span className="font-bold font-mono">{fileInfo.formattedSize}</span>
            </div>
            <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
              <span>Estimated Output:</span>
              <span className="font-mono">{getEstimatedSize()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 12. EXPORT TOOL PANEL */}
      {activeTool === 'export' && (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <DownloadCloud className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Export Video</h3>
          </div>

          {/* Format selector */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {(['mp4', 'webm'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() =>
                    onUpdateState((prev) => ({
                      ...prev,
                      exportSettings: { ...prev.exportSettings, format: fmt },
                    }))
                  }
                  className={`py-2 rounded-xl border text-xs font-bold uppercase transition-all ${
                    state.exportSettings.format === fmt
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {fmt} ({fmt === 'mp4' ? 'H.264' : 'VP9'})
                </button>
              ))}
            </div>
          </div>

          {/* Quick Quality Export */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Quick Quality Export</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: '1080p', label: '1080p Full HD' },
                { id: '720p', label: '720p HD' },
                { id: '480p', label: '480p SD' },
                { id: '360p', label: '360p Mobile' },
              ].map((q) => (
                <button
                  key={q.id}
                  onClick={() => {
                    onUpdateState((prev) => ({
                      ...prev,
                      exportSettings: { ...prev.exportSettings, resolution: q.id as any },
                    }));
                    setTimeout(onTriggerExport, 50);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    state.exportSettings.resolution === q.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white'
                  }`}
                >
                  <div className="text-xs font-bold">{q.label}</div>
                  <div className="text-[10px] text-indigo-500 font-medium">Export {q.id}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Export Summary Table */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Resolution</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                {state.exportSettings.resolution}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Frame Rate</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{state.exportSettings.fps} FPS</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Audio Status</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {state.audio.originalAudioEnabled ? 'Enabled' : 'Muted'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Speed</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{state.speed}×</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            Estimated processing time depends on your device CPU and duration. All encoding happens directly in your browser.
          </p>

          <button
            onClick={onTriggerExport}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 hover:opacity-95 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            ✨ EXPORT VIDEO
          </button>
        </div>
      )}
    </aside>
  );
};

