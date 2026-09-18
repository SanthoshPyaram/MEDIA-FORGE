import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Scissors,
  BarChart2,
  Sparkles,
  Download,
  Volume2,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';
import { formatBytes, formatDuration } from '@/utils/formatters';

interface AudioWorkspaceProps {
  initialFile?: DetectedFileInfo | null;
  onStartJob: (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any>) => void;
}

export const AudioWorkspace: React.FC<AudioWorkspaceProps> = ({ initialFile, onStartJob }) => {
  const [fileInfo, setFileInfo] = useState<DetectedFileInfo | null>(initialFile || null);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Settings
  const [outputFormat, setOutputFormat] = useState<'mp3' | 'wav' | 'ogg' | 'aac' | 'm4a'>('mp3');
  const [bitrate, setBitrate] = useState<'64k' | '128k' | '192k' | '256k' | '320k'>('192k');
  const [normalize, setNormalize] = useState(true);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (initialFile) {
      setFileInfo(initialFile);
    }
  }, [initialFile]);

  useEffect(() => {
    if (fileInfo?.file) {
      const url = URL.createObjectURL(fileInfo.file);
      setAudioSrc(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [fileInfo]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration || 0;
      setDuration(dur);
      setTrimStart(0);
      setTrimEnd(dur);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (trimEnd > 0 && audioRef.current.currentTime >= trimEnd) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTime >= trimEnd) {
        audioRef.current.currentTime = trimStart;
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSubmit = () => {
    if (!fileInfo) return;
    const options: Record<string, any> = {
      outputFormat,
      bitrate,
      normalize,
    };
    if (trimStart > 0 || (trimEnd > 0 && trimEnd < duration)) {
      options.trim = { start: trimStart, end: trimEnd };
    }

    onStartJob(fileInfo, 'convert', options);
  };

  if (!fileInfo) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-12 text-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl">
        <Music className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          No audio loaded
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">
          Upload an MP3, WAV, OGG, AAC, or video file to extract and process audio.
        </p>
        <label className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs cursor-pointer shadow-md shadow-amber-600/25 transition-all">
          Browse Audio File
          <input
            type="file"
            accept="audio/*,video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFileInfo({
                  file,
                  name: file.name,
                  extension: file.name.split('.').pop() || 'mp3',
                  mimeType: file.type,
                  realMimeType: file.type,
                  category: file.type.startsWith('video/') ? 'video' : 'audio',
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              🎵 AUDIO STUDIO & MASTERING
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {fileInfo.name} ({fileInfo.formattedSize})
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
            Convert, Snip & Master Audio
          </h2>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Process Audio</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left 2 Cols: Visualizer & Trimmer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-8 rounded-3xl bg-slate-950 border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[300px] text-center">
            {/* Waveform graphic bars */}
            <div className="flex items-end justify-center gap-1.5 h-32 w-full max-w-lg mb-8 px-4">
              {Array.from({ length: 48 }).map((_, i) => {
                const height = Math.sin(i * 0.3) * 40 + Math.cos(i * 0.1) * 25 + 45;
                const isPast = (i / 48) * duration <= currentTime;
                return (
                  <div
                    key={i}
                    className={`w-full rounded-full transition-all duration-150 ${
                      isPast
                        ? 'bg-gradient-to-t from-amber-500 to-orange-500 shadow-xs shadow-amber-500/50'
                        : 'bg-slate-800'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>

            <audio
              ref={audioRef}
              src={audioSrc}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
            />

            {/* Audio Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 transition-transform hover:scale-105 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5 fill-current" />}
              </button>
            </div>

            <div className="mt-4 text-xs font-mono text-slate-400">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </div>
          </div>

          {/* Trimmer */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-4 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Scissors className="w-4 h-4" />
                <span>Trim Audio: {formatDuration(trimStart)} — {formatDuration(trimEnd)}</span>
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-12 text-slate-400">Start</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (v < trimEnd) setTrimStart(v);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="font-mono w-14 text-right">{trimStart.toFixed(1)}s</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-12 text-slate-400">End</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (v > trimStart) setTrimEnd(v);
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="font-mono w-14 text-right">{trimEnd.toFixed(1)}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Format & Codec */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Format & Bitrate
            </h3>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Output Audio Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['mp3', 'wav', 'ogg', 'aac', 'm4a'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={`py-2 text-xs font-bold uppercase rounded-xl border transition-all cursor-pointer ${
                      outputFormat === fmt
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/30'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {outputFormat !== 'wav' && (
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Audio Bitrate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['64k', '128k', '192k', '256k', '320k'] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setBitrate(b)}
                      className={`py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        bitrate === b
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/30'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalize}
                  onChange={(e) => setNormalize(e.target.checked)}
                  className="rounded text-amber-600 accent-amber-500 cursor-pointer"
                />
                <span>Normalize Loudness Dynamics (EBU R128)</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

