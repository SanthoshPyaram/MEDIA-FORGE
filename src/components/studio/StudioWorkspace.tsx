import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StudioTopBar } from './StudioTopBar';
import { StudioToolsSidebar } from './StudioToolsSidebar';
import { StudioPlayer } from './StudioPlayer';
import { StudioTimeline } from './StudioTimeline';
import { StudioPropertiesPanel } from './StudioPropertiesPanel';
import { useStudioState } from '@/hooks/useStudioState';
import { StudioTool } from '@/types/studio';
import { DetectedFileInfo } from '@/types/job';
import { VideoImportModal, ImportTab } from '@/components/shared/VideoImportModal';
import { Upload, Film, Link as LinkIcon } from 'lucide-react';

interface StudioWorkspaceProps {
  initialFile?: DetectedFileInfo | null;
  onStartJob: (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any>) => void;
  onBackToHome?: () => void;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  initialFile,
  onStartJob,
  onBackToHome,
}) => {
  const [currentFileInfo, setCurrentFileInfo] = useState<DetectedFileInfo | null>(initialFile || null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string>('');
  const [duration, setDuration] = useState<number>(60);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<StudioTool>('trim');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importModalTab, setImportModalTab] = useState<ImportTab>('upload');

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Studio State with Undo / Redo
  const {
    state,
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetAll,
  } = useStudioState(duration);

  // Initialize or change file object URL
  useEffect(() => {
    if (initialFile) {
      setCurrentFileInfo(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    if (currentFileInfo?.file) {
      const url = URL.createObjectURL(currentFileInfo.file);
      setVideoObjectUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [currentFileInfo]);

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop() || 'mp4';
    const info: DetectedFileInfo = {
      file,
      name: file.name,
      extension: ext,
      mimeType: file.type || 'video/mp4',
      realMimeType: file.type || 'video/mp4',
      category: 'video',
      size: file.size,
      formattedSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      supportedOperations: [],
    };
    setCurrentFileInfo(info);
  };

  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleDurationChange = useCallback((d: number) => {
    if (d > 0) {
      setDuration(d);
      updateState((prev) => ({
        ...prev,
        trim: {
          ...prev.trim,
          end: prev.trim.end === 60 ? d : prev.trim.end,
        },
      }));
    }
  }, [updateState]);

  // Execute export job
  const handleExport = useCallback(() => {
    if (!currentFileInfo) return;

    // Calculate crop parameters in pixels if crop is enabled
    let cropParams = undefined;
    if (state.crop.enabled && currentFileInfo.metadata && 'width' in currentFileInfo.metadata) {
      const metaW = currentFileInfo.metadata.width || 1920;
      const metaH = currentFileInfo.metadata.height || 1080;
      cropParams = {
        x: Math.round((state.crop.x / 100) * metaW),
        y: Math.round((state.crop.y / 100) * metaH),
        width: Math.round((state.crop.width / 100) * metaW),
        height: Math.round((state.crop.height / 100) * metaH),
      };
    }

    const options = {
      outputFormat: state.exportSettings.format,
      resolution: state.exportSettings.resolution,
      fps: state.exportSettings.fps,
      trim: state.trim.enabled ? { start: state.trim.start, end: state.trim.end } : undefined,
      rotate: state.transform.rotate !== 0 ? state.transform.rotate : undefined,
      flipH: state.transform.flipH,
      flipV: state.transform.flipV,
      crop: cropParams,
      speed: state.speed,
      filter: state.filter !== 'original' ? state.filter : undefined,
      watermark: state.watermark.enabled ? state.watermark : undefined,
      watermarkModify: state.watermarkModify.enabled ? state.watermarkModify : undefined,
      smartEnhance: state.enhancement.smartEnhance,
      brightness: state.enhancement.brightness,
      contrast: state.enhancement.contrast,
      saturation: state.enhancement.saturation,
      sharpen: state.enhancement.sharpness,
      denoise: state.enhancement.denoise,
      muteAudio: !state.audio.originalAudioEnabled && !state.audio.customAudioFile,
      customAudio:
        state.audio.customAudioFile && state.audio.customAudioEnabled
          ? {
              enabled: true,
              file: state.audio.customAudioFile,
              mode: state.audio.mode,
              originalVolume: state.audio.originalVolume,
              customVolume: state.audio.customVolume,
            }
          : undefined,
      audioFade: {
        in: state.audio.fadeIn,
        out: state.audio.fadeOut,
        duration: state.trim.enabled ? state.trim.end - state.trim.start : duration,
      },
      audioBehavior: state.audio.behavior,
      compressionPreset: state.compression.preset,
    };

    onStartJob(currentFileInfo, 'transcode', options);
  }, [currentFileInfo, state, duration, onStartJob]);

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

  // If no video is selected yet, display initial upload view
  if (!currentFileInfo || !videoObjectUrl) {
    return (
      <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-slate-50 dark:bg-[#070b14]">
        <input
          type="file"
          ref={fileInputRef}
          accept="video/*"
          onChange={handleFilePicked}
          className="hidden"
        />

        <div className="max-w-xl w-full p-8 rounded-3xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <Film className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              MediaForge Studio
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select or import an authorized video to launch the professional studio suite
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setImportModalTab('upload');
                setIsImportModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
            </button>

            <button
              onClick={() => {
                setImportModalTab('url');
                setIsImportModalOpen(true);
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-sm border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
            >
              <LinkIcon className="w-4 h-4 text-indigo-500" />
              <span>Import Authorized URL</span>
            </button>
          </div>
        </div>

        <VideoImportModal
          isOpen={isImportModalOpen}
          initialTab={importModalTab}
          onClose={() => setIsImportModalOpen(false)}
          onImportFile={(info) => {
            setCurrentFileInfo(info);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-100 dark:bg-[#070b14]">
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleFilePicked}
        className="hidden"
      />

      {/* Top Navigation Bar */}
      <StudioTopBar
        fileInfo={currentFileInfo}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onReset={() => resetAll(duration)}
        onBack={() => onBackToHome?.()}
        onExport={handleExport}
        isCompareMode={isCompareMode}
        onToggleCompare={() => setIsCompareMode(!isCompareMode)}
        currentTimeFormatted={formatTime(currentTime)}
        durationFormatted={formatTime(duration)}
      />

      {/* Main Workspace Body: Sidebar + Player + Properties */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 12 Tools Vertical Palette */}
        <StudioToolsSidebar
          activeTool={activeTool}
          onSelectTool={(tool) => setActiveTool(tool)}
        />

        {/* Center: Video Preview Player */}
        <StudioPlayer
          videoUrl={videoObjectUrl}
          fileInfo={currentFileInfo}
          state={state}
          activeTool={activeTool}
          onUpdateState={updateState}
          isCompareMode={isCompareMode}
          videoRef={videoRef}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onTimeUpdate={(t) => setCurrentTime(t)}
          onDurationChange={handleDurationChange}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
        />

        {/* Right: Contextual Properties Panel */}
        <StudioPropertiesPanel
          activeTool={activeTool}
          state={state}
          fileInfo={currentFileInfo}
          duration={duration}
          onUpdateState={updateState}
          onTriggerExport={handleExport}
          onTriggerFilePicker={() => {
            setImportModalTab('upload');
            setIsImportModalOpen(true);
          }}
          isCompareMode={isCompareMode}
          onToggleCompare={() => setIsCompareMode(!isCompareMode)}
        />
      </div>

      {/* Bottom: Multi-Track Timeline */}
      <StudioTimeline
        duration={duration}
        currentTime={currentTime}
        state={state}
        onUpdateState={updateState}
        onSeek={handleSeek}
        onSelectTool={(t) => setActiveTool(t)}
      />

      {/* Authorized Video Import Modal */}
      <VideoImportModal
        isOpen={isImportModalOpen}
        initialTab={importModalTab}
        onClose={() => setIsImportModalOpen(false)}
        onImportFile={(info) => {
          setCurrentFileInfo(info);
        }}
      />
    </div>
  );
};
export default StudioWorkspace;
