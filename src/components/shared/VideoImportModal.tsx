import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  UserCheck,
  Film,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileVideo,
  Info,
  Download,
  Sparkles,
  Loader2,
  Check,
  Music,
  Video,
  Play,
  Clock,
  User,
  Scissors,
  Crop,
  VolumeX,
  Volume2,
  Type,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  Tv,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';
import { findProviderForUrl, ProviderStatus, VideoSourceMetadata } from '@/lib/providers';
import { processVideo } from '@/lib/ffmpeg/video-commands';
import { processAudio } from '@/lib/audio/audio-processor';

export type ImportTab = 'upload' | 'url' | 'my-content';

interface VideoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile: (fileInfo: DetectedFileInfo) => void;
  initialTab?: ImportTab;
}

export interface QualityOption {
  id: string;
  label: string;
  height: number;
  ext: string;
  type: 'video' | 'audio';
}

export interface VideoInfoResponse {
  success: boolean;
  title: string;
  duration: number;
  thumbnail: string;
  author: string;
  width?: number;
  height?: number;
  isVertical?: boolean;
  qualities?: QualityOption[];
  maxHeight?: number;
}

const SESSION_STORAGE_KEY = 'mediaforge_active_video_session';

const SUPPORTED_EXTENSIONS = [
  '.mp4',
  '.mov',
  '.mkv',
  '.avi',
  '.webm',
  '.m4v',
  '.mpeg',
  '.mpg',
  '.ts',
  '.3gp',
];

export const VideoImportModal: React.FC<VideoImportModalProps> = ({
  isOpen,
  onClose,
  onImportFile,
  initialTab = 'upload',
}) => {
  const [activeTab, setActiveTab] = useState<ImportTab>(initialTab);

  // URL Tab State
  const [inputUrl, setInputUrl] = useState('');
  const [isCheckingUrl, setIsCheckingUrl] = useState(false);
  const [urlStatus, setUrlStatus] = useState<ProviderStatus | null>(null);
  const [urlMetadata, setUrlMetadata] = useState<VideoSourceMetadata | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfoResponse | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Multi-Quality Download State
  const [downloadingQuality, setDownloadingQuality] = useState<string | null>(null);
  const [downloadedQualities, setDownloadedQualities] = useState<Record<string, boolean>>({});
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [batchProgressText, setBatchProgressText] = useState<string | null>(null);

  // Quick Edit State
  const [showQuickEdit, setShowQuickEdit] = useState<boolean>(true);
  const [trimStartStr, setTrimStartStr] = useState<string>('00:00');
  const [trimEndStr, setTrimEndStr] = useState<string>('01:00');
  const [limit1Min, setLimit1Min] = useState<boolean>(true);
  const [cropRatio, setCropRatio] = useState<'original' | '9:16' | '16:9' | '1:1' | 'fit'>('9:16');
  const [selectedTrimQuality, setSelectedTrimQuality] = useState<'1080p' | '720p' | '480p' | '360p' | 'audio'>('720p');
  const [isMuteAudio, setIsMuteAudio] = useState<boolean>(false);
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('@MediaForge');
  const [watermarkPos, setWatermarkPos] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');

  // Edit Processing State
  const [isProcessingEdit, setIsProcessingEdit] = useState<boolean>(false);
  const [editProgressText, setEditProgressText] = useState<string | null>(null);

  // Player & Timecode State
  const [playerMode, setPlayerMode] = useState<'native' | 'embed'>('native');
  const [playerCurrentTime, setPlayerCurrentTime] = useState<number>(0);
  const [previewStreamError, setPreviewStreamError] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Session Time & Screen WakeLock (Keep-Alive) State
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isKeepAliveActive, setIsKeepAliveActive] = useState(false);
  const wakeLockRef = useRef<any>(null);

  // Disturbance & Resume State
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [interruptionReason, setInterruptionReason] = useState<string | null>(null);
  const [lastAttemptedAction, setLastAttemptedAction] = useState<(() => Promise<void>) | null>(null);
  const [savedSessionNotice, setSavedSessionNotice] = useState(false);

  // Upload & Local Trimmer File Inputs & Local Media State
  const [loadedLocalFile, setLoadedLocalFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimmerFileInputRef = useRef<HTMLInputElement>(null);
  const myContentInputRef = useRef<HTMLInputElement>(null);
  const customAudioInputRef = useRef<HTMLInputElement>(null);

  // Screen Wake Lock Handler to prevent screen sleep during video processing
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsKeepAliveActive(true);
          wakeLockRef.current.addEventListener('release', () => {
            setIsKeepAliveActive(false);
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('Wake Lock request skipped or denied:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      try {
        wakeLockRef.current.release();
      } catch (e) {}
      wakeLockRef.current = null;
      setIsKeepAliveActive(false);
    }
  }, []);

  // Session timer & initial wake lock
  useEffect(() => {
    if (isOpen) {
      requestWakeLock();
      const timer = setInterval(() => {
        setSessionSeconds((s) => s + 1);
      }, 1000);
      return () => {
        clearInterval(timer);
        releaseWakeLock();
      };
    } else {
      setSessionSeconds(0);
      releaseWakeLock();
    }
  }, [isOpen, requestWakeLock, releaseWakeLock]);

  // Re-request wake lock if tab visibility changes back to active
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && isOpen) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isOpen, requestWakeLock]);

  // Disturbance detection: network drop during active processing
  useEffect(() => {
    const handleOffline = () => {
      if (isProcessingEdit || downloadingQuality || isDownloadingAll) {
        setIsInterrupted(true);
        setInterruptionReason('Internet connection dropped during processing.');
        setIsProcessingEdit(false);
        setDownloadingQuality(null);
        setIsDownloadingAll(false);
      }
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, [isProcessingEdit, downloadingQuality, isDownloadingAll]);

  // Save active session continuously to localStorage
  useEffect(() => {
    if (!videoInfo || !inputUrl) return;
    try {
      const stateToSave = {
        inputUrl,
        videoInfo,
        trimStartStr,
        trimEndStr,
        limit1Min,
        cropRatio,
        selectedTrimQuality,
        isMuteAudio,
        watermarkText,
        isWatermarkEnabled,
        watermarkPos,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {}
  }, [
    inputUrl,
    videoInfo,
    trimStartStr,
    trimEndStr,
    limit1Min,
    cropRatio,
    selectedTrimQuality,
    isMuteAudio,
    watermarkText,
    isWatermarkEnabled,
    watermarkPos,
  ]);

  // Check for restorable previous session on open
  useEffect(() => {
    if (isOpen && !videoInfo) {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.inputUrl && saved.videoInfo && Date.now() - saved.timestamp < 3600000 * 4) {
            setSavedSessionNotice(true);
          }
        }
      } catch (e) {}
    }
  }, [isOpen, videoInfo]);

  const handleRestoreSavedSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        setInputUrl(s.inputUrl || '');
        setVideoInfo(s.videoInfo || null);
        if (s.trimStartStr) setTrimStartStr(s.trimStartStr);
        if (s.trimEndStr) setTrimEndStr(s.trimEndStr);
        if (s.limit1Min !== undefined) setLimit1Min(s.limit1Min);
        if (s.cropRatio) setCropRatio(s.cropRatio);
        if (s.selectedTrimQuality) setSelectedTrimQuality(s.selectedTrimQuality);
        if (s.isMuteAudio !== undefined) setIsMuteAudio(s.isMuteAudio);
        if (s.watermarkText) setWatermarkText(s.watermarkText);
        if (s.isWatermarkEnabled !== undefined) setIsWatermarkEnabled(s.isWatermarkEnabled);
        if (s.watermarkPos) setWatermarkPos(s.watermarkPos);
      }
    } catch (e) {}
    setSavedSessionNotice(false);
  };

  const handleDiscardSavedSession = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {}
    setSavedSessionNotice(false);
  };

  // Extract YouTube Video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/)([^#&?]*).*/;
      const match = url.match(regExp);
      return match && match[2].length === 11 ? match[2] : null;
    } catch {
      return null;
    }
  };

  const isDirectVideo = (url: string): boolean => {
    return /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url.trim());
  };

  const currentYouTubeId = getYouTubeVideoId(inputUrl);
  const isDirectMediaUrl = isDirectVideo(inputUrl);

  // Auto-configure AI defaults when videoInfo changes
  useEffect(() => {
    if (videoInfo) {
      if (videoInfo.isVertical) {
        setCropRatio('9:16');
      } else {
        setCropRatio('9:16'); // Default to 9:16 for instant Shorts/Reels creation
      }
      const initialDuration = videoInfo.duration || 60;
      setTrimStartStr('00:00');
      const endSec = Math.min(initialDuration, 60);
      setTrimEndStr(formatSecondsToMMSS(endSec));
    }
  }, [videoInfo]);

  if (!isOpen) return null;

  const handleProcessLocalFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const info: DetectedFileInfo = {
      file,
      name: file.name,
      extension: ext,
      mimeType: file.type || `video/${ext}`,
      realMimeType: file.type || `video/${ext}`,
      category: 'video',
      size: file.size,
      formattedSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      supportedOperations: [],
    };
    onImportFile(info);
    onClose();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessLocalFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessLocalFile(file);
    }
  };

  const handleSelectLocalFileForTrimming = (file: File) => {
    setLoadedLocalFile(file);
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
    setPlayerMode('native');

    // Probe video metadata
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      const dur = Math.round(tempVideo.duration) || 60;
      setVideoInfo({
        success: true,
        title: file.name.replace(/\.[^/.]+$/, ''),
        author: 'Local Video File',
        duration: dur,
        thumbnail: '',
        isVertical: false,
        qualities: [
          { id: '1080p', label: '1080p Full HD', height: 1080, ext: 'mp4', type: 'video' },
          { id: '720p', label: '720p HD', height: 720, ext: 'mp4', type: 'video' },
          { id: '480p', label: '480p SD', height: 480, ext: 'mp4', type: 'video' },
          { id: '360p', label: '360p Fast', height: 360, ext: 'mp4', type: 'video' },
          { id: 'audio', label: 'MP3 High Quality Audio', height: 0, ext: 'mp3', type: 'audio' },
        ],
      });
      setTrimStartStr('00:00');
      setTrimEndStr(formatSecondsToMMSS(Math.min(dur, 60)));
    };
  };

  const handleTrimmerFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSelectLocalFileForTrimming(file);
    }
  };

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  function parseTimeToSeconds(str: string): number {
    if (!str) return 0;
    const parts = str.trim().split(':').map(Number);
    if (parts.length === 2) {
      return (parts[0] || 0) * 60 + (parts[1] || 0);
    }
    if (parts.length === 3) {
      return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
    }
    return Number(str) || 0;
  }

  function formatSecondsToMMSS(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const triggerBrowserDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  // URL Tab: Check and handle URL
  const handleCheckUrl = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    setIsCheckingUrl(true);
    setUrlError(null);
    setUrlStatus(null);
    setUrlMetadata(null);
    setVideoInfo(null);
    setDownloadedQualities({});
    setBatchProgressText(null);

    // 1. Try server resolver endpoint first for rich multi-quality extraction
    try {
      const infoRes = await fetch('/api/video-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      if (infoRes.ok) {
        const data: VideoInfoResponse = await infoRes.json();
        if (data.success && data.qualities?.length) {
          setVideoInfo(data);
          setIsCheckingUrl(false);
          return;
        }
      }
    } catch {
      // Fall through to client providers
    }

    // 2. Client-side provider fallback (oEmbed / DirectMedia)
    const provider = findProviderForUrl(trimmed);
    if (!provider) {
      setIsCheckingUrl(false);
      setUrlError("That doesn't appear to be a supported video URL.");
      return;
    }

    try {
      const [status, meta] = await Promise.all([
        provider.getStatus(trimmed),
        provider.getMetadata(trimmed),
      ]);
      setUrlStatus(status);
      setUrlMetadata(meta);

      const ytId = getYouTubeVideoId(trimmed);
      const isShort = /shorts\//i.test(trimmed);

      // Populate full interactive studio workspace & trimmer for YouTube, Shorts & web URLs
      if (ytId || meta?.platform === 'youtube' || meta?.platform === 'instagram' || isDirectVideo(trimmed)) {
        const title = meta?.title || (isShort ? 'YouTube Short' : 'YouTube Video');
        const author = (meta as any)?.author || 'Content Creator';
        const thumbnail = meta?.thumbnailUrl || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '');

        setVideoInfo({
          success: true,
          title,
          author,
          duration: meta?.duration || 60,
          thumbnail,
          isVertical: isShort,
          qualities: [
            { id: '1080p', label: '1080p Full HD', height: 1080, ext: 'mp4', type: 'video' },
            { id: '720p', label: '720p HD', height: 720, ext: 'mp4', type: 'video' },
            { id: '480p', label: '480p SD', height: 480, ext: 'mp4', type: 'video' },
            { id: '360p', label: '360p Fast', height: 360, ext: 'mp4', type: 'video' },
            { id: 'audio', label: 'MP3 High Quality Audio', height: 0, ext: 'mp3', type: 'audio' },
          ],
        });

        if (ytId) {
          setPlayerMode('embed');
        } else {
          setPlayerMode('native');
        }
      }

      // If provider can directly provide media (e.g. DirectMediaProvider)
      if (status.downloadable && isDirectVideo(trimmed)) {
        setDownloadProgress(0);
        const downloaded = await provider.getAuthorizedMedia(trimmed, (received, total) => {
          if (total > 0) {
            setDownloadProgress(Math.round((received / total) * 100));
          }
        });

        if (downloaded) {
          const file =
            downloaded instanceof File
              ? downloaded
              : new File([downloaded], meta?.title || 'imported_video.mp4', {
                  type: downloaded.type || 'video/mp4',
                });
          handleProcessLocalFile(file);
          return;
        }
      }
    } catch (err: any) {
      setUrlError(err.message || 'Unable to inspect URL');
    } finally {
      setIsCheckingUrl(false);
    }
  };

  // Timecode helpers from native video player
  const handleSetStartFromPlayer = () => {
    if (videoPlayerRef.current) {
      const cur = Math.floor(videoPlayerRef.current.currentTime);
      setTrimStartStr(formatSecondsToMMSS(cur));
      if (limit1Min) {
        setTrimEndStr(formatSecondsToMMSS(Math.min(cur + 60, videoInfo?.duration || cur + 60)));
      }
    }
  };

  const handleSetEndFromPlayer = () => {
    if (videoPlayerRef.current) {
      const cur = Math.ceil(videoPlayerRef.current.currentTime);
      setTrimEndStr(formatSecondsToMMSS(cur));
    }
  };

  // Download a single quality (without edits) directly in-browser
  const handleDownloadQuality = async (quality: QualityOption) => {
    if (downloadingQuality || isDownloadingAll || isProcessingEdit) return;
    requestWakeLock();
    setLastAttemptedAction(() => () => handleDownloadQuality(quality));
    setIsInterrupted(false);
    setDownloadingQuality(quality.id);
    setUrlError(null);

    const cleanTitle = (videoInfo?.title || loadedLocalFile?.name || 'video').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'video';
    const ext = quality.type === 'audio' ? 'mp3' : 'mp4';
    const filename = `${cleanTitle}_${quality.id}.${ext}`;

    try {
      let sourceFile: File | null = loadedLocalFile;

      const isStaticHosting = typeof window !== 'undefined' && (
        window.location.hostname.includes('github.io') ||
        window.location.protocol === 'file:' ||
        !window.location.port
      );

      if (!sourceFile && !isStaticHosting && inputUrl.trim()) {
        try {
          const res = await fetch('/api/download-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: inputUrl.trim(), quality: quality.id }),
          });

          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              const blob = await res.blob();
              triggerBrowserDownload(blob, filename);
              setDownloadedQualities((prev) => ({ ...prev, [quality.id]: true }));
              setBatchProgressText(`✓ Saved ${filename} to Downloads folder!`);
              setTimeout(() => setBatchProgressText(null), 4000);
              return;
            }
          }
        } catch {}
      }

      // If direct media URL, fetch directly in browser
      if (!sourceFile && inputUrl.trim() && isDirectVideo(inputUrl.trim())) {
        try {
          const directRes = await fetch(inputUrl.trim());
          if (directRes.ok) {
            const blob = await directRes.blob();
            sourceFile = new File([blob], `${cleanTitle}.mp4`, { type: blob.type || 'video/mp4' });
          }
        } catch {}
      }

      if (sourceFile) {
        if (quality.type === 'audio') {
          const res = await processAudio(
            sourceFile,
            { outputFormat: 'mp3', bitrate: '320k' },
            (p, stage) => setBatchProgressText(`${stage} (${p}%)`)
          );
          triggerBrowserDownload(res.blob, filename);
        } else {
          const res = await processVideo(
            sourceFile,
            {
              outputFormat: 'mp4',
              resolution: quality.id === '1080p' || quality.id === '720p' || quality.id === '480p' || quality.id === '360p' ? quality.id : '720p',
            },
            (p, stage) => setBatchProgressText(`${stage} (${p}%)`)
          );
          triggerBrowserDownload(res.blob, filename);
        }
        setDownloadedQualities((prev) => ({ ...prev, [quality.id]: true }));
        setBatchProgressText(`✓ Saved ${filename} to Downloads folder!`);
        setTimeout(() => setBatchProgressText(null), 4000);
        return;
      }

      setBatchProgressText('Select or drop your video file to process and download directly!');
      trimmerFileInputRef.current?.click();
    } catch (err: any) {
      setUrlError(`Unable to complete download for ${quality.label}`);
    } finally {
      setDownloadingQuality(null);
    }
  };

  // Open a specific untouched quality in Studio
  const handleOpenInStudio = async (quality: QualityOption) => {
    if (downloadingQuality || isDownloadingAll || isProcessingEdit) return;
    requestWakeLock();
    setDownloadingQuality(quality.id);
    setUrlError(null);

    const cleanTitle = (videoInfo?.title || loadedLocalFile?.name || 'video').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'video';
    const filename = `${cleanTitle}_${quality.id}.mp4`;

    try {
      if (loadedLocalFile) {
        handleProcessLocalFile(loadedLocalFile);
        return;
      }

      if (inputUrl.trim() && isDirectVideo(inputUrl.trim())) {
        const directRes = await fetch(inputUrl.trim());
        if (directRes.ok) {
          const blob = await directRes.blob();
          const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
          handleProcessLocalFile(file);
          return;
        }
      }

      const isStaticHosting = typeof window !== 'undefined' && (
        window.location.hostname.includes('github.io') ||
        window.location.protocol === 'file:' ||
        !window.location.port
      );

      if (!isStaticHosting && inputUrl.trim()) {
        const res = await fetch('/api/download-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputUrl.trim(), quality: quality.id }),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
            const blob = await res.blob();
            const file = new File([blob], filename, { type: blob.type || 'video/mp4' });
            handleProcessLocalFile(file);
            return;
          }
        }
      }

      trimmerFileInputRef.current?.click();
    } catch (err: any) {
      setUrlError(`Failed to load ${quality.label} into studio`);
    } finally {
      setDownloadingQuality(null);
    }
  };

  // Download ALL available qualities sequentially
  const handleDownloadAllQualities = async () => {
    if (!videoInfo?.qualities || isDownloadingAll || downloadingQuality || isProcessingEdit) return;
    requestWakeLock();
    setLastAttemptedAction(() => () => handleDownloadAllQualities());
    setIsInterrupted(false);
    setIsDownloadingAll(true);
    setUrlError(null);

    try {
      for (const q of videoInfo.qualities) {
        setBatchProgressText(`Downloading ${q.label}...`);
        await handleDownloadQuality(q);
      }
      setBatchProgressText('✓ All qualities processed directly to your Downloads folder!');
      setTimeout(() => setBatchProgressText(null), 5000);
    } catch (err: any) {
      setUrlError('Download batch interrupted.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Helper to construct editing payload
  const buildEditPayload = async (quality = selectedTrimQuality) => {
    const startSec = parseTimeToSeconds(trimStartStr);
    let endSec = parseTimeToSeconds(trimEndStr);

    if (endSec <= startSec) endSec = startSec + 60;
    if (limit1Min && endSec - startSec > 60) {
      endSec = startSec + 60;
    }

    const payload: any = {
      url: inputUrl.trim(),
      quality,
      trimStart: startSec,
      trimEnd: endSec,
      limit1Min,
      crop: cropRatio,
      muteAudio: isMuteAudio,
      watermarkText: isWatermarkEnabled && watermarkText.trim() ? watermarkText.trim() : undefined,
      watermarkPos,
    };

    if (customAudioFile && !isMuteAudio) {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(',')[1] || '';
          resolve(base64);
        };
      });
      reader.readAsDataURL(customAudioFile);
      payload.customAudioBase64 = await base64Promise;
      payload.customAudioExt = customAudioFile.name.split('.').pop() || 'mp3';
    }

    return payload;
  };

  // ⚡ Download Edited Clip in Selected Quality (Direct in-browser download)
  const handleDownloadEditedClip = async () => {
    if (isProcessingEdit || downloadingQuality || isDownloadingAll) return;
    requestWakeLock();
    setLastAttemptedAction(() => () => handleDownloadEditedClip());
    setIsInterrupted(false);
    setIsProcessingEdit(true);
    setUrlError(null);

    const cleanTitle = (videoInfo?.title || loadedLocalFile?.name || 'clip').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'clip';
    const isAudioOnly = selectedTrimQuality === 'audio';
    const ext = isAudioOnly ? 'mp3' : 'mp4';
    const filename = `${cleanTitle}_${selectedTrimQuality}_trimmed.${ext}`;

    setEditProgressText(`Preparing ${selectedTrimQuality.toUpperCase()} clip (${trimStartStr} to ${trimEndStr})...`);

    try {
      let sourceFile: File | null = loadedLocalFile;

      const isStaticHosting = typeof window !== 'undefined' && (
        window.location.hostname.includes('github.io') ||
        window.location.protocol === 'file:' ||
        !window.location.port
      );

      // 1. If backend API is available (non-static)
      if (!sourceFile && !isStaticHosting && inputUrl.trim()) {
        try {
          const payload = await buildEditPayload(selectedTrimQuality);
          const res = await fetch('/api/download-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              const blob = await res.blob();
              triggerBrowserDownload(blob, filename);
              setEditProgressText(`✓ Saved ${filename} to Downloads folder!`);
              setTimeout(() => setEditProgressText(null), 4000);
              return;
            }
          }
        } catch {}
      }

      // 2. Direct media URL fetch in browser
      if (!sourceFile && inputUrl.trim() && isDirectVideo(inputUrl.trim())) {
        try {
          setEditProgressText('Fetching video stream in browser...');
          const directRes = await fetch(inputUrl.trim());
          if (directRes.ok) {
            const blob = await directRes.blob();
            sourceFile = new File([blob], `${cleanTitle}.mp4`, { type: blob.type || 'video/mp4' });
          }
        } catch (e) {
          console.warn('Direct media fetch failed:', e);
        }
      }

      // 3. Process with In-Browser WebAssembly Engine
      if (sourceFile) {
        const startSec = parseTimeToSeconds(trimStartStr);
        let endSec = parseTimeToSeconds(trimEndStr);
        if (endSec <= startSec) endSec = startSec + 60;
        if (limit1Min && endSec - startSec > 60) {
          endSec = startSec + 60;
        }

        if (isAudioOnly) {
          setEditProgressText('Extracting and trimming audio track in-browser...');
          const audioResult = await processAudio(
            sourceFile,
            {
              outputFormat: 'mp3',
              bitrate: '320k',
              trim: { start: startSec, end: endSec },
            },
            (p, stage) => setEditProgressText(`${stage} (${p}%)`)
          );
          triggerBrowserDownload(audioResult.blob, filename);
          setEditProgressText(`✓ Saved ${filename} to your Downloads folder!`);
          setTimeout(() => setEditProgressText(null), 4000);
          return;
        }

        setEditProgressText('Loading video engine & trimming clip in-browser...');
        const result = await processVideo(
          sourceFile,
          {
            outputFormat: 'mp4',
            resolution: selectedTrimQuality === '1080p' || selectedTrimQuality === '720p' || selectedTrimQuality === '480p' || selectedTrimQuality === '360p'
              ? selectedTrimQuality
              : '720p',
            trim: { start: startSec, end: endSec },
            muteAudio: isMuteAudio,
            customAudio: customAudioFile ? {
              enabled: true,
              file: customAudioFile,
              mode: 'replace',
            } : undefined,
            watermark: isWatermarkEnabled && watermarkText.trim() ? {
              enabled: true,
              type: 'text',
              text: watermarkText.trim(),
              position: watermarkPos,
              opacity: 0.85,
            } : undefined,
          },
          (p, stage) => setEditProgressText(`${stage} (${p}%)`)
        );

        triggerBrowserDownload(result.blob, filename);
        setEditProgressText(`✓ Successfully saved ${filename} to your Downloads folder!`);
        setTimeout(() => setEditProgressText(null), 5000);
        return;
      }

      // If no file loaded yet, prompt user to select video file for in-browser trimming
      setEditProgressText('Select or drop your video file to trim and download directly in-browser!');
      trimmerFileInputRef.current?.click();
    } catch (err: any) {
      console.error('Trimming failed:', err);
      setUrlError(err.message || 'Failed to process trimmed video in browser.');
      setEditProgressText(null);
    } finally {
      setIsProcessingEdit(false);
    }
  };

  // 🎬 Open in Studio with Edits Applied
  const handleOpenInStudioWithEdits = async () => {
    if (isProcessingEdit || downloadingQuality || isDownloadingAll) return;
    requestWakeLock();
    setIsProcessingEdit(true);
    setEditProgressText('Preparing customized clip for MediaForge Studio...');
    setUrlError(null);

    const cleanTitle = (videoInfo?.title || loadedLocalFile?.name || 'clip').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'clip';
    const filename = `${cleanTitle}_edited.mp4`;

    try {
      let sourceFile: File | null = loadedLocalFile;

      const isStaticHosting = typeof window !== 'undefined' && (
        window.location.hostname.includes('github.io') ||
        window.location.protocol === 'file:' ||
        !window.location.port
      );

      if (!sourceFile && !isStaticHosting && inputUrl.trim()) {
        try {
          const payload = await buildEditPayload('720p');
          const res = await fetch('/api/download-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
              const blob = await res.blob();
              const file = new File([blob], filename, { type: 'video/mp4' });
              handleProcessLocalFile(file);
              return;
            }
          }
        } catch {}
      }

      if (!sourceFile && inputUrl.trim() && isDirectVideo(inputUrl.trim())) {
        try {
          const directRes = await fetch(inputUrl.trim());
          if (directRes.ok) {
            const blob = await directRes.blob();
            sourceFile = new File([blob], `${cleanTitle}.mp4`, { type: blob.type || 'video/mp4' });
          }
        } catch {}
      }

      if (sourceFile) {
        const startSec = parseTimeToSeconds(trimStartStr);
        let endSec = parseTimeToSeconds(trimEndStr);
        if (endSec <= startSec) endSec = startSec + 60;
        if (limit1Min && endSec - startSec > 60) {
          endSec = startSec + 60;
        }

        const res = await processVideo(
          sourceFile,
          {
            outputFormat: 'mp4',
            resolution: '720p',
            trim: { start: startSec, end: endSec },
            muteAudio: isMuteAudio,
          },
          (p, stage) => setEditProgressText(`${stage} (${p}%)`)
        );

        const file = new File([res.blob], filename, { type: 'video/mp4' });
        handleProcessLocalFile(file);
        return;
      }

      trimmerFileInputRef.current?.click();
    } catch (err: any) {
      setUrlError(err.message || 'Failed to load edited clip into Studio');
    } finally {
      setIsProcessingEdit(false);
      setEditProgressText(null);
    }
  };

  // Compute calculated clip duration for display
  const startSec = parseTimeToSeconds(trimStartStr);
  const endSec = parseTimeToSeconds(trimEndStr);
  const rawClipDuration = Math.max(0, endSec - startSec);
  const effectiveClipDuration = limit1Min ? Math.min(rawClipDuration, 60) : rawClipDuration;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col text-left max-h-[92vh]">
        {/* Hidden File Pickers */}
        <input
          type="file"
          ref={fileInputRef}
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          type="file"
          ref={trimmerFileInputRef}
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleTrimmerFileInputChange}
          className="hidden"
        />
        <input
          type="file"
          ref={myContentInputRef}
          accept={SUPPORTED_EXTENSIONS.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          type="file"
          ref={customAudioInputRef}
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setCustomAudioFile(file);
          }}
          className="hidden"
        />

        {/* Modal Header: High Contrast Pro Design with Live Session Timer & Screen Wake Lock */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/25">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Import & Preview Video URL</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                  Pro Trimmer
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  Session: {formatSecondsToMMSS(sessionSeconds)}
                </span>
                <span>•</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${isKeepAliveActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${isKeepAliveActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {isKeepAliveActive ? 'Screen Keep-Alive ON (No Sleep)' : 'Keep-Alive Ready'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Previous Restored Session Notification */}
        {savedSessionNotice && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="text-xs font-semibold truncate">
                Previous working session restored with your trim points & settings.
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRestoreSavedSession}
                className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={handleDiscardSavedSession}
                className="px-2 py-1 rounded-xl hover:bg-indigo-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 text-xs font-medium transition-all cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Process Interruption / Disturbance Notification Banner */}
        {isInterrupted && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-xs font-bold">Process Interrupted</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-tight">
                  {interruptionReason || 'Screen turned off or network disturbed during processing. Your settings are preserved.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsInterrupted(false);
                if (lastAttemptedAction) {
                  lastAttemptedAction();
                } else {
                  handleDownloadEditedClip();
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 btn-pro-emerald cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Now</span>
            </button>
          </div>
        )}

        {/* Three Tabs Header */}
        <div className="px-6 pt-3 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>Video URL & Preview</span>
          </button>

          <button
            onClick={() => setActiveTab('my-content')}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'my-content'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Content</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="overflow-y-auto flex-1">
          {/* Tab 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="group border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/10"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Drag and drop your video file here, or browse
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports MP4, MOV, MKV, AVI, WebM, M4V, MPEG, TS, 3GP
                </p>
                <button
                  type="button"
                  className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 btn-pro-primary cursor-pointer"
                >
                  Choose Local Video File
                </button>
              </div>

              {/* Large File Advisory */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  Files are processed 100% locally on your device using WebAssembly. Large videos (&gt;500 MB) may require significant memory.
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: Video URL */}
          {activeTab === 'url' && (
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Paste YouTube, Shorts, Instagram, or Direct Video URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://youtube.com/watch?v=... or https://youtube.com/shorts/... or direct .mp4"
                    value={inputUrl}
                    onChange={(e) => {
                      setInputUrl(e.target.value);
                      setUrlStatus(null);
                      setUrlError(null);
                      setVideoInfo(null);
                      setIsInterrupted(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCheckUrl();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  <button
                    onClick={handleCheckUrl}
                    disabled={!inputUrl.trim() || isCheckingUrl}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md shadow-indigo-500/25 btn-pro-primary flex items-center gap-1.5"
                  >
                    {isCheckingUrl && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isCheckingUrl ? 'Analyzing...' : 'Check & Preview'}</span>
                  </button>
                </div>
              </div>

              {/* Multi-Quality Download & Studio Hub */}
              {videoInfo && (
                <div className="space-y-4 animate-fade-in">
                  {/* LIVE INTERACTIVE VIDEO PLAYER PREVIEW WITH GUARANTEED NATIVE STREAMING */}
                  <div className="space-y-2">
                    {playerMode === 'native' || !currentYouTubeId ? (
                      <div className="w-full rounded-2xl overflow-hidden bg-black border border-slate-700/80 shadow-lg relative">
                        <video
                          ref={videoPlayerRef}
                          controls
                          playsInline
                          crossOrigin="anonymous"
                          src={isDirectMediaUrl ? inputUrl : `/api/video-preview?url=${encodeURIComponent(inputUrl.trim())}`}
                          className="w-full max-h-72 object-contain mx-auto bg-black"
                          onTimeUpdate={(e) => {
                            setPlayerCurrentTime(e.currentTarget.currentTime);
                          }}
                        />

                        {/* Direct Scrubbing & Time-Sync Control Bar */}
                        <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-indigo-400 font-bold text-xs">
                              {formatSecondsToMMSS(playerCurrentTime)}
                            </span>
                            <span className="text-slate-600">/</span>
                            <span className="font-mono text-slate-400 text-xs">
                              {formatSecondsToMMSS(videoInfo.duration || 60)}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold">
                              ⚡ Native Direct Stream
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSetStartFromPlayer}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Set Trim Start Point to current video position"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Set as Start</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleSetEndFromPlayer}
                              className="px-2.5 py-1 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Set Trim End Point to current video position"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Set as End</span>
                            </button>

                            {currentYouTubeId && (
                              <button
                                type="button"
                                onClick={() => setPlayerMode('embed')}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] transition-all cursor-pointer"
                                title="Switch to YouTube embed player"
                              >
                                🌐 Web Embed
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full rounded-2xl overflow-hidden bg-black border border-slate-700/80 shadow-lg relative">
                        <div className="w-full aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${currentYouTubeId}?rel=0&modestbranding=1`}
                            title={videoInfo.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">YouTube Web Embed Active</span>
                          <button
                            type="button"
                            onClick={() => setPlayerMode('native')}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Zap className="w-3 h-3" />
                            <span>Switch to Native Direct Player (Direct Scrubbing)</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* High-res Title & Author Bar */}
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="min-w-0 flex-1 pr-3">
                        <span className="font-bold text-slate-900 dark:text-white truncate block">
                          {videoInfo.title}
                        </span>
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                          {videoInfo.author && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-indigo-500" />
                              <span className="truncate max-w-[160px]">{videoInfo.author}</span>
                            </span>
                          )}
                          {videoInfo.duration > 0 && (
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              <span>{formatSecondsToMMSS(videoInfo.duration)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ⚡ AI QUICK EDIT & CUSTOMIZE DRAWER */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setShowQuickEdit(!showQuickEdit)}
                      className="w-full px-4 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              ⚡ Visual Trimmer & Customizer
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                              1-Min Limit & Quality Options
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Set trim start/end while watching, select output quality, crop to 9:16, audio & watermark
                          </span>
                        </div>
                      </div>
                      {showQuickEdit ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {showQuickEdit && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fade-in text-xs">
                        {/* AI Analysis Diagnostic Badge & Local Video Picker */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-indigo-950 dark:text-indigo-200">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-[11px] font-semibold">
                              {loadedLocalFile ? (
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                                  ✓ Video loaded: {loadedLocalFile.name} (100% In-Browser Local Processing)
                                </span>
                              ) : (
                                <>⚡ AI Trimmer: {limit1Min ? '1-Min Limit Active' : 'Full length'} • Output: {selectedTrimQuality.toUpperCase()} • Direct Download</>
                              )}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => trimmerFileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <Upload className="w-3 h-3" />
                            <span>{loadedLocalFile ? 'Change Video' : 'Load Video File to Trim'}</span>
                          </button>
                        </div>

                        {/* 1. Trim & 1-Minute Limit with Video Playhead Help */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <Scissors className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Trim Timestamps</span>
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              <input
                                type="checkbox"
                                checked={limit1Min}
                                onChange={(e) => {
                                  setLimit1Min(e.target.checked);
                                  if (e.target.checked) {
                                    const s = parseTimeToSeconds(trimStartStr);
                                    setTrimEndStr(formatSecondsToMMSS(s + 60));
                                  }
                                }}
                                className="accent-indigo-600 rounded cursor-pointer"
                              />
                              <span>Enforce 1-Min Limit (Max 60s)</span>
                            </label>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                                Start Point (MM:SS)
                              </label>
                              <input
                                type="text"
                                value={trimStartStr}
                                onChange={(e) => setTrimStartStr(e.target.value)}
                                placeholder="00:00"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 uppercase font-mono block mb-1">
                                End Point (MM:SS)
                              </label>
                              <input
                                type="text"
                                value={trimEndStr}
                                onChange={(e) => setTrimEndStr(e.target.value)}
                                placeholder="01:00"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs text-slate-900 dark:text-slate-100 font-bold"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-500">
                              Trimmed Duration: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{effectiveClipDuration}s</strong>
                              {limit1Min && rawClipDuration > 60 && ' (Capped at 60s)'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setTrimStartStr('00:00');
                                  setTrimEndStr('01:00');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                0-60s
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const mid = Math.max(0, Math.floor((videoInfo.duration || 60) / 2) - 30);
                                  setTrimStartStr(formatSecondsToMMSS(mid));
                                  setTrimEndStr(formatSecondsToMMSS(mid + 60));
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Middle 60s
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 2. Quality Options for Trimmed Video */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                              <Tv className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Trimmed Video Quality</span>
                            </span>
                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                              Choose Output Quality
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                              { id: '1080p', label: '1080p Full HD' },
                              { id: '720p', label: '720p HD' },
                              { id: '480p', label: '480p SD' },
                              { id: '360p', label: '360p Mobile' },
                              { id: 'audio', label: 'Audio (MP3)' },
                            ].map((q) => (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => setSelectedTrimQuality(q.id as any)}
                                className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                                  selectedTrimQuality === q.id
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                              >
                                {q.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Crop & Aspect Ratio */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <Crop className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Crop Framing</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                              { id: '9:16', label: '9:16 Shorts/Reels' },
                              { id: '16:9', label: '16:9 Widescreen' },
                              { id: '1:1', label: '1:1 Square' },
                              { id: 'fit', label: 'Fit to Screen' },
                              { id: 'original', label: 'Original' },
                            ].map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => setCropRatio(preset.id as any)}
                                className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                                  cropRatio === preset.id
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 4. Audio Controls */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Audio Options</span>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-rose-600 dark:text-rose-400">
                              <input
                                type="checkbox"
                                checked={isMuteAudio}
                                onChange={(e) => setIsMuteAudio(e.target.checked)}
                                className="accent-rose-600 rounded cursor-pointer"
                              />
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>Remove Original Audio</span>
                            </label>
                          </div>

                          {!isMuteAudio && (
                            <div className="pt-1">
                              {customAudioFile ? (
                                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Music className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                                      {customAudioFile.name}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setCustomAudioFile(null)}
                                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => customAudioInputRef.current?.click()}
                                  className="w-full py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  <Music className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Add Custom Audio Track (MP3 / WAV / AAC)</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 5. Watermark Features */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                              <Type className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Watermark Overlay</span>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                              <input
                                type="checkbox"
                                checked={isWatermarkEnabled}
                                onChange={(e) => setIsWatermarkEnabled(e.target.checked)}
                                className="accent-indigo-600 rounded cursor-pointer"
                              />
                              <span>Enable Watermark</span>
                            </label>
                          </div>

                          {isWatermarkEnabled && (
                            <div className="space-y-2 pt-1 animate-fade-in">
                              <input
                                type="text"
                                value={watermarkText}
                                onChange={(e) => setWatermarkText(e.target.value)}
                                placeholder="Watermark Text (e.g. @MyChannel)"
                                className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-slate-100"
                              />
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 uppercase font-mono">Position:</span>
                                {(['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'] as const).map((pos) => (
                                  <button
                                    key={pos}
                                    type="button"
                                    onClick={() => setWatermarkPos(pos)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                                      watermarkPos === pos
                                        ? 'bg-indigo-600 text-white shadow-xs'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                    }`}
                                  >
                                    {pos.replace('-', ' ')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Edit Action Banner & Buttons */}
                        {editProgressText && (
                          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs font-semibold text-indigo-950 dark:text-indigo-200 animate-fade-in">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                            <span>{editProgressText}</span>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleDownloadEditedClip}
                            disabled={isProcessingEdit}
                            className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-700 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 btn-pro-primary"
                          >
                            {isProcessingEdit ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span>⚡ Download Trimmed Video ({selectedTrimQuality.toUpperCase()} • {effectiveClipDuration}s)</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenInStudioWithEdits}
                            disabled={isProcessingEdit}
                            className="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Open in Studio</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Available Qualities Header & Batch Download Action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Full Untouched Qualities (Source Video)
                      </span>
                    </div>

                    <button
                      onClick={handleDownloadAllQualities}
                      disabled={isDownloadingAll || !!downloadingQuality || isProcessingEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isDownloadingAll ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>Download All Qualities</span>
                    </button>
                  </div>

                  {/* Batch Progress Banner */}
                  {batchProgressText && (
                    <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center gap-2 text-xs font-semibold text-indigo-950 dark:text-indigo-200 animate-fade-in">
                      {isDownloadingAll && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
                      <span>{batchProgressText}</span>
                    </div>
                  )}

                  {/* Qualities Grid List */}
                  <div className="space-y-2">
                    {videoInfo.qualities?.map((q) => {
                      const isThisDownloading = downloadingQuality === q.id;
                      const isDownloaded = downloadedQualities[q.id];

                      return (
                        <div
                          key={q.id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                              {q.type === 'audio' ? (
                                <Music className="w-4 h-4" />
                              ) : (
                                <Video className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                  {q.label}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono uppercase text-slate-600 dark:text-slate-300">
                                  {q.ext}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {q.type === 'audio' ? 'Clean 320 kbps MP3 track' : 'Merged MP4 with full audio'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadQuality(q)}
                              disabled={isThisDownloading || isDownloadingAll || isProcessingEdit}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isDownloaded
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs btn-pro-primary'
                              } disabled:opacity-50`}
                            >
                              {isThisDownloading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : isDownloaded ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              <span>{isThisDownloading ? 'Processing...' : isDownloaded ? 'Downloaded' : 'Download'}</span>
                            </button>

                            {/* Open in Studio Button (for video types) */}
                            {q.type === 'video' && (
                              <button
                                onClick={() => handleOpenInStudio(q)}
                                disabled={isThisDownloading || isDownloadingAll || isProcessingEdit}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Play className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Open in Studio</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Download Progress for Direct Media Stream */}
              {downloadProgress !== null && !videoInfo && (
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                    <span>Downloading direct media stream...</span>
                    <span className="font-mono">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all duration-150"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Platform Detection Fallback Card (when video-info is unavailable) */}
              {urlStatus && !urlStatus.downloadable && !videoInfo && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5 animate-fade-in">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{urlStatus.badgeLabel || 'Platform URL detected'}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {urlStatus.message}
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md btn-pro-primary cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Video File</span>
                    </button>

                    {urlStatus.platformUrl && (
                      <a
                        href={urlStatus.platformUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                      >
                        <span>Open Platform</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {urlError && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">{urlError}</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 inline-flex items-center gap-1 font-bold underline hover:opacity-80 cursor-pointer text-indigo-600 dark:text-indigo-400"
                    >
                      Upload your video file directly instead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: My Content */}
          {activeTab === 'my-content' && (
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-950 dark:text-indigo-200">
                <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">I Own This Content</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    MediaForge never asks for your account passwords, cookies, or browser session tokens. Retrieve your authorized original video using your platform creator dashboard and upload it directly.
                  </p>
                </div>
              </div>

              {/* Platform Guides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white block">YouTube Creators</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    <li>Sign in to YouTube Studio (studio.youtube.com)</li>
                    <li>Click <strong>Content</strong> on the left</li>
                    <li>Hover over your clip and click <strong>⋮ (Options)</strong></li>
                    <li>Click <strong>Download</strong> to get the MP4</li>
                  </ol>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-900 dark:text-white block">Instagram Creators</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                    <li>Open your Reel in the Instagram app</li>
                    <li>Tap the <strong>••• (More)</strong> button</li>
                    <li>Tap <strong>Save to Camera Roll / Download</strong></li>
                    <li>Upload the exported Reel file here</li>
                  </ol>
                </div>
              </div>

              {/* Direct Upload CTA for My Content */}
              <button
                onClick={() => myContentInputRef.current?.click()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer btn-pro-primary"
              >
                <Upload className="w-4 h-4" />
                <span>Select My Downloaded Video File</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default VideoImportModal;
