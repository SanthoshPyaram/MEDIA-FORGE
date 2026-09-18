import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  Rewind,
  Eye,
  Sliders,
  Crop as CropIcon,
  ShieldCheck,
} from 'lucide-react';
import { StudioState, StudioTool } from '@/types/studio';
import { DetectedFileInfo } from '@/types/job';

interface StudioPlayerProps {
  videoUrl: string;
  fileInfo: DetectedFileInfo;
  state: StudioState;
  activeTool: StudioTool;
  onUpdateState: (updater: Partial<StudioState> | ((prev: StudioState) => StudioState)) => void;
  isCompareMode: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onTimeUpdate: (t: number) => void;
  onDurationChange: (d: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = ({
  videoUrl,
  fileInfo,
  state,
  activeTool,
  onUpdateState,
  isCompareMode,
  videoRef,
  currentTime,
  duration,
  isPlaying,
  onTimeUpdate,
  onDurationChange,
  onTogglePlay,
  onSeek,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Dragging states for visual crop
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const dragCropStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  // Dragging states for watermark removal box
  const [isDraggingDelogo, setIsDraggingDelogo] = useState(false);
  const dragDelogoStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });

  // Sync playback speed and volume on the HTML5 video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = state.speed;
      videoRef.current.muted = !state.audio.originalAudioEnabled;
      videoRef.current.volume = Math.min(1.0, state.audio.originalVolume);
    }
  }, [state.speed, state.audio.originalAudioEnabled, state.audio.originalVolume, videoRef]);

  // Compute CSS filter string for enhancement & preset filters
  const getFilterStyle = (): string => {
    if (isCompareMode) return 'none'; // When comparing, bypass filters

    const e = state.enhancement;
    const smart = e.smartEnhance;

    const b = smart ? 1.05 : 1 + e.brightness / 100;
    const c = smart ? 1.15 : 1 + e.contrast / 100;
    const s = smart ? 1.18 : 1 + e.saturation / 100;
    const exp = 1 + e.exposure / 100;

    let filterString = `brightness(${b * exp}) contrast(${c}) saturate(${s})`;

    if (state.filter === 'grayscale') {
      filterString += ' grayscale(100%)';
    } else if (state.filter === 'warm') {
      filterString += ' sepia(25%) saturate(120%)';
    } else if (state.filter === 'cool') {
      filterString += ' hue-rotate(180deg) saturate(90%)';
    } else if (state.filter === 'vintage') {
      filterString += ' sepia(40%) contrast(110%) brightness(95%)';
    } else if (state.filter === 'bright') {
      filterString += ' brightness(120%) contrast(105%)';
    } else if (state.filter === 'contrast') {
      filterString += ' contrast(135%) saturate(110%)';
    } else if (state.filter === 'sharp') {
      filterString += ' contrast(115%) brightness(102%)';
    }

    return filterString;
  };

  // Compute CSS transform string for rotate & flip
  const getTransformStyle = (): string => {
    if (isCompareMode) return 'none';
    const r = state.transform.rotate;
    const sx = state.transform.flipH ? -1 : 1;
    const sy = state.transform.flipV ? -1 : 1;
    return `rotate(${r}deg) scale(${sx}, ${sy})`;
  };

  // Format seconds to MM:SS.ms
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00.00';
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms
      .toString()
      .padStart(2, '0')}`;
  };

  // Timeline scrubber pointer events
  const handleScrubberPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    onSeek(targetTime);
    setIsScrubbing(true);
  };

  const handleScrubberPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    if (isScrubbing) {
      onSeek(pos * duration);
    }
  };

  const handleScrubberPointerUp = () => {
    setIsScrubbing(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Crop drag handling
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingCrop(true);
    dragCropStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: state.crop.x,
      initY: state.crop.y,
    };
  };

  // Delogo drag handling
  const handleDelogoMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingDelogo(true);
    dragDelogoStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: state.watermarkModify.x,
      initY: state.watermarkModify.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingCrop && containerRef.current) {
        const deltaX = ((e.clientX - dragCropStartRef.current.startX) / containerRef.current.clientWidth) * 100;
        const deltaY = ((e.clientY - dragCropStartRef.current.startY) / containerRef.current.clientHeight) * 100;
        const newX = Math.max(0, Math.min(100 - state.crop.width, dragCropStartRef.current.initX + deltaX));
        const newY = Math.max(0, Math.min(100 - state.crop.height, dragCropStartRef.current.initY + deltaY));
        onUpdateState((prev) => ({
          ...prev,
          crop: { ...prev.crop, x: Math.round(newX), y: Math.round(newY) },
        }));
      }

      if (isDraggingDelogo) {
        const deltaX = e.clientX - dragDelogoStartRef.current.startX;
        const deltaY = e.clientY - dragDelogoStartRef.current.startY;
        const newX = Math.max(0, dragDelogoStartRef.current.initX + deltaX);
        const newY = Math.max(0, dragDelogoStartRef.current.initY + deltaY);
        onUpdateState((prev) => ({
          ...prev,
          watermarkModify: { ...prev.watermarkModify, x: Math.round(newX), y: Math.round(newY) },
        }));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingCrop(false);
      setIsDraggingDelogo(false);
    };

    if (isDraggingCrop || isDraggingDelogo) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingCrop, isDraggingDelogo, state.crop.width, state.crop.height, onUpdateState]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-slate-950 text-white select-none overflow-hidden relative"
    >
      {/* Viewport Center Area */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden p-4 sm:p-6"
        onClick={onTogglePlay}
      >
        {/* Background checkerboard for transparency */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Video Player Wrapper */}
        <div
          className="relative max-h-full max-w-full flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden bg-black"
          style={{
            aspectRatio: fileInfo.metadata && 'width' in fileInfo.metadata && fileInfo.metadata.width
              ? `${fileInfo.metadata.width} / ${fileInfo.metadata.height}`
              : '16 / 9',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Video Element */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain pointer-events-auto transition-transform duration-150"
            style={{
              filter: getFilterStyle(),
              transform: getTransformStyle(),
            }}
            onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
            playsInline
          />

          {/* Interactive Visual Crop Rectangle Overlay */}
          {activeTool === 'crop' && state.crop.enabled && (
            <div
              onMouseDown={handleCropMouseDown}
              style={{
                left: `${state.crop.x}%`,
                top: `${state.crop.y}%`,
                width: `${state.crop.width}%`,
                height: `${state.crop.height}%`,
              }}
              className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/10 cursor-move shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] z-20 flex flex-col justify-between p-2 pointer-events-auto group"
            >
              <div className="flex items-center justify-between text-[10px] font-bold text-indigo-300 bg-black/70 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                <CropIcon className="w-3 h-3 mr-1" />
                <span>Crop: {state.crop.preset.toUpperCase()}</span>
              </div>
              <div className="self-end text-[9px] font-mono text-white/70 bg-black/60 px-1.5 py-0.5 rounded">
                {state.crop.width}% × {state.crop.height}%
              </div>
              {/* Corner handles */}
              <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-indigo-400 border border-white" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-400 border border-white" />
              <div className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-indigo-400 border border-white" />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-indigo-400 border border-white" />
            </div>
          )}

          {/* Watermark Modification / Removal (Delogo / Blur / Cover) Bounding Box */}
          {activeTool === 'watermark' && state.watermarkModify.enabled && (
            <div
              onMouseDown={handleDelogoMouseDown}
              style={{
                left: `${state.watermarkModify.x}px`,
                top: `${state.watermarkModify.y}px`,
                width: `${state.watermarkModify.width}px`,
                height: `${state.watermarkModify.height}px`,
              }}
              className="absolute border-2 border-dashed border-amber-400 bg-amber-500/20 cursor-move shadow-[0_0_15px_rgba(245,158,11,0.4)] z-20 flex items-center justify-center p-1 pointer-events-auto"
            >
              <div className="flex items-center gap-1 text-[10px] font-bold text-amber-200 bg-black/80 px-2 py-0.5 rounded shadow">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span className="uppercase">{state.watermarkModify.mode} Zone</span>
              </div>
            </div>
          )}

          {/* Live Watermark Overlay (Text or Image) */}
          {state.watermark.enabled && (
            <div
              className={`absolute pointer-events-none z-10 p-4 flex ${
                state.watermark.position === 'top-left'
                  ? 'top-0 left-0 justify-start items-start'
                  : state.watermark.position === 'top-center'
                  ? 'top-0 left-1/2 -translate-x-1/2 items-start'
                  : state.watermark.position === 'top-right'
                  ? 'top-0 right-0 justify-end items-start'
                  : state.watermark.position === 'center'
                  ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                  : state.watermark.position === 'bottom-left'
                  ? 'bottom-0 left-0 justify-start items-end'
                  : state.watermark.position === 'bottom-center'
                  ? 'bottom-0 left-1/2 -translate-x-1/2 items-end'
                  : 'bottom-0 right-0 justify-end items-end'
              }`}
            >
              {state.watermark.type === 'text' ? (
                <div
                  style={{
                    color: state.watermark.color || '#ffffff',
                    opacity: state.watermark.opacity,
                    fontSize: `${state.watermark.fontSize || 32}px`,
                  }}
                  className={`font-black tracking-wider ${
                    state.watermark.hasBackground
                      ? 'bg-black/60 px-3.5 py-1.5 rounded-xl backdrop-blur-xs border border-white/10 shadow-lg'
                      : 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                  }`}
                >
                  {state.watermark.text || 'MediaForge'}
                </div>
              ) : (
                state.watermark.imageDataUrl && (
                  <img
                    src={state.watermark.imageDataUrl}
                    alt="Watermark Preview"
                    style={{
                      opacity: state.watermark.opacity,
                      width: `${(state.watermark.scale || 0.25) * 400}px`,
                    }}
                    className="object-contain drop-shadow-lg"
                  />
                )
              )}
            </div>
          )}

          {/* Compare Badge */}
          {isCompareMode && (
            <div className="absolute top-4 left-4 z-30 px-3 py-1 rounded-lg bg-indigo-600/90 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-sm shadow-md">
              Original Video (Unmodified)
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div className="h-16 bg-slate-900/90 border-t border-white/10 px-4 sm:px-6 flex flex-col justify-center gap-1 select-none backdrop-blur-md z-30">
        {/* Scrubber Timeline Bar */}
        <div
          className="relative h-2 w-full bg-slate-800 rounded-full cursor-pointer group flex items-center"
          onPointerDown={handleScrubberPointerDown}
          onPointerMove={handleScrubberPointerMove}
          onPointerUp={handleScrubberPointerUp}
          onPointerLeave={() => setHoverTime(null)}
        >
          {/* Progress Filled */}
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            {/* Playhead Dot */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
          </div>

          {/* Hover Tooltip Timecode */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-slate-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded shadow pointer-events-none border border-white/10"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Buttons and Meta Row */}
        <div className="flex items-center justify-between text-xs text-slate-300 pt-0.5">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onTogglePlay}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={() => onSeek(Math.max(0, currentTime - 5))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:block"
              title="Rewind 5s"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSeek(Math.min(duration, currentTime + 5))}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:block"
              title="Fast Forward 5s"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-1.5 ml-1">
              <button
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    audio: {
                      ...prev.audio,
                      originalAudioEnabled: !prev.audio.originalAudioEnabled,
                    },
                  }))
                }
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title={state.audio.originalAudioEnabled ? 'Mute' : 'Unmute'}
              >
                {state.audio.originalAudioEnabled ? (
                  <Volume2 className="w-4 h-4 text-slate-300" />
                ) : (
                  <VolumeX className="w-4 h-4 text-red-400" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={state.audio.originalVolume}
                onChange={(e) =>
                  onUpdateState((prev) => ({
                    ...prev,
                    audio: {
                      ...prev.audio,
                      originalVolume: parseFloat(e.target.value),
                    },
                  }))
                }
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hidden md:block"
              />
            </div>

            {/* Time readout */}
            <div className="font-mono text-[11px] text-slate-400 ml-1">
              <span className="text-white font-semibold">{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Technical Meta Badges & Fullscreen */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Resolution */}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hidden md:inline-block">
              {fileInfo.metadata && 'width' in fileInfo.metadata
                ? `${fileInfo.metadata.width}×${fileInfo.metadata.height}`
                : '1080p'}
            </span>

            {/* FPS */}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 hidden lg:inline-block">
              {fileInfo.metadata && 'fps' in fileInfo.metadata ? `${fileInfo.metadata.fps} FPS` : '30 FPS'}
            </span>

            {/* Speed Badge */}
            {state.speed !== 1 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {state.speed}×
              </span>
            )}

            {/* Fullscreen button */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
