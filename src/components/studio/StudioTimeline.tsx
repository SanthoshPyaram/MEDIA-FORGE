import React, { useRef } from 'react';
import {
  Scissors,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Stamp,
  Music,
  Video,
  Layers,
  Split,
  Clock,
} from 'lucide-react';
import { StudioState, StudioTool } from '@/types/studio';

interface StudioTimelineProps {
  duration: number;
  currentTime: number;
  state: StudioState;
  onUpdateState: (updater: Partial<StudioState> | ((prev: StudioState) => StudioState)) => void;
  onSeek: (time: number) => void;
  onSelectTool: (tool: StudioTool) => void;
}

export const StudioTimeline: React.FC<StudioTimelineProps> = ({
  duration,
  currentTime,
  state,
  onUpdateState,
  onSeek,
  onSelectTool,
}) => {
  const rulerTicks = [0, 0.2, 0.4, 0.6, 0.8, 1];

  const trimStart = state.trim.enabled ? state.trim.start : 0;
  const trimEnd = state.trim.enabled ? state.trim.end : duration;
  const trimDuration = Math.max(0, trimEnd - trimStart);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(2, '0')}`;
  };

  const handleApplyTrim = () => {
    onUpdateState((prev) => ({
      ...prev,
      trim: {
        ...prev.trim,
        enabled: true,
      },
    }));
  };

  const handleResetTrim = () => {
    onUpdateState((prev) => ({
      ...prev,
      trim: {
        enabled: false,
        start: 0,
        end: duration,
      },
    }));
  };

  const handlePreviewTrim = () => {
    onSeek(trimStart);
  };

  const handleSplitAtPlayhead = () => {
    // Splits video by setting trim end or start to current playhead
    if (currentTime > trimStart && currentTime < trimEnd) {
      onUpdateState((prev) => ({
        ...prev,
        trim: {
          enabled: true,
          start: prev.trim.enabled ? prev.trim.start : 0,
          end: currentTime,
        },
      }));
    }
  };

  const startPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
  const endPercent = duration > 0 ? (trimEnd / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="h-56 md:h-60 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a0f1d] flex flex-col select-none text-slate-800 dark:text-slate-200 shrink-0">
      {/* Top Trim Controls & Timecode Bar */}
      <div className="h-10 px-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between text-xs bg-white dark:bg-[#0d1424]">
        {/* Timecode Chips */}
        <div className="flex items-center gap-2 sm:gap-4 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
            <span className="text-slate-500 text-[10px] uppercase font-bold">Start</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formatTime(trimStart)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">
            <span className="text-slate-500 text-[10px] uppercase font-bold">End</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formatTime(trimEnd)}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
            <span className="text-indigo-600 dark:text-indigo-300 text-[10px] uppercase font-bold">Duration</span>
            <span className="text-indigo-700 dark:text-indigo-300 font-bold">{formatTime(trimDuration)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSplitAtPlayhead}
            title="Split at Playhead"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors"
          >
            <Split className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Split</span>
          </button>

          <button
            onClick={handlePreviewTrim}
            title="Preview Selected Clip"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Preview Clip</span>
          </button>

          <button
            onClick={handleApplyTrim}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            Apply Trim
          </button>

          <button
            onClick={handleResetTrim}
            title="Reset Trim"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Multi-Track Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Column */}
        <div className="w-40 md:w-48 border-r border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-[#0c1222] flex flex-col justify-between py-1 shrink-0 text-[11px] font-bold">
          {/* Track 1 Header: VIDEO TRACK */}
          <div
            onClick={() => onSelectTool('trim')}
            className="h-14 px-3 flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-500" />
              <span>VIDEO TRACK</span>
            </div>
            <Scissors className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Track 2 Header: AUDIO TRACK */}
          <div
            onClick={() => onSelectTool('audio')}
            className="h-14 px-3 flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer border-t border-slate-200 dark:border-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-500" />
              <span>AUDIO TRACK</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
              {state.audio.originalAudioEnabled ? 'ON' : 'MUTED'}
            </span>
          </div>

          {/* Track 3 Header: WATERMARK/OVERLAY */}
          <div
            onClick={() => onSelectTool('watermark')}
            className="h-12 px-3 flex items-center justify-between hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer border-t border-slate-200 dark:border-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Stamp className="w-4 h-4 text-cyan-500" />
              <span className="truncate">OVERLAY TRACK</span>
            </div>
            {state.watermark.enabled && (
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>
        </div>

        {/* Tracks Content Viewport */}
        <div className="flex-1 relative flex flex-col overflow-x-auto overflow-y-hidden bg-slate-50 dark:bg-[#070b14]">
          {/* Playhead Vertical Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none"
            style={{ left: `${currentPercent}%` }}
          >
            <div className="w-3 h-3 bg-rose-500 rounded-b-md -translate-x-[5px] shadow" />
          </div>

          {/* Track 1: Video Track with Trim Region & Filmstrip Style */}
          <div className="h-14 relative flex items-center px-2 py-1.5 border-b border-slate-200 dark:border-white/5">
            {/* Background Filmstrip Track */}
            <div className="w-full h-full rounded-xl bg-slate-200 dark:bg-slate-800/80 overflow-hidden relative flex items-center border border-slate-300 dark:border-white/10">
              {/* Filmstrip mock thumbnails */}
              <div className="absolute inset-0 flex items-center justify-around opacity-30 pointer-events-none">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-8 w-14 bg-slate-400 dark:bg-slate-700 rounded-sm border border-black/10" />
                ))}
              </div>

              {/* Active Trimmed Region Box */}
              <div
                className="absolute top-0 bottom-0 bg-indigo-500/30 border-y-2 border-indigo-500 backdrop-blur-2xs z-10 flex items-center justify-between"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(1, endPercent - startPercent)}%`,
                }}
              >
                {/* Left Trim Handle */}
                <div
                  className="w-3.5 h-full bg-indigo-600 hover:bg-indigo-500 cursor-ew-resize flex items-center justify-center text-white rounded-l-md shadow"
                  title={`Start: ${formatTime(trimStart)}`}
                >
                  <div className="w-0.5 h-5 bg-white/70" />
                </div>

                <span className="text-[10px] font-bold text-white font-mono bg-indigo-900/80 px-1.5 py-0.5 rounded shadow truncate">
                  {formatTime(trimDuration)}
                </span>

                {/* Right Trim Handle */}
                <div
                  className="w-3.5 h-full bg-indigo-600 hover:bg-indigo-500 cursor-ew-resize flex items-center justify-center text-white rounded-r-md shadow"
                  title={`End: ${formatTime(trimEnd)}`}
                >
                  <div className="w-0.5 h-5 bg-white/70" />
                </div>
              </div>
            </div>
          </div>

          {/* Track 2: Audio Track */}
          <div className="h-14 relative flex items-center px-2 py-1.5 border-b border-slate-200 dark:border-white/5">
            <div className="w-full h-full rounded-xl bg-slate-200 dark:bg-slate-800/50 overflow-hidden relative flex items-center border border-slate-300 dark:border-white/10 px-3">
              {/* Audio Waveform visualization representation */}
              <div className="flex-1 flex items-center gap-1 h-6 opacity-70">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full ${
                      state.audio.originalAudioEnabled ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                    style={{
                      height: `${Math.max(4, (Math.sin(i * 0.5) * 0.5 + 0.5) * 20)}px`,
                    }}
                  />
                ))}
              </div>

              {/* Custom BGM overlay if added */}
              {state.audio.customAudioFile && (
                <div className="ml-3 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                  <Music className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{state.audio.customAudioFile.name}</span>
                  <span className="text-[8px] opacity-80 uppercase">({state.audio.mode})</span>
                </div>
              )}
            </div>
          </div>

          {/* Track 3: Overlay / Watermark Track */}
          <div className="h-12 relative flex items-center px-2 py-1">
            <div className="w-full h-full rounded-xl bg-slate-200 dark:bg-slate-800/30 overflow-hidden relative flex items-center border border-slate-300 dark:border-white/10 px-3">
              {state.watermark.enabled ? (
                <div className="px-2.5 py-1 rounded bg-cyan-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                  <Stamp className="w-3 h-3" />
                  <span>
                    Watermark: {state.watermark.type === 'text' ? `"${state.watermark.text}"` : 'Logo Image'}
                  </span>
                </div>
              ) : state.watermarkModify.enabled ? (
                <div className="px-2.5 py-1 rounded bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1.5 shadow-sm">
                  <span className="uppercase">{state.watermarkModify.mode} Box Active</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">No active overlay track</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

