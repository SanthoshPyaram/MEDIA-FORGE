import React, { useState } from 'react';
import {
  X,
  Link,
  ShieldCheck,
  AlertTriangle,
  Upload,
  CheckCircle2,
  ExternalLink,
  Video,
  Info,
} from 'lucide-react';
import { DetectedFileInfo } from '@/types/job';

interface UrlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFile: (fileInfo: DetectedFileInfo) => void;
  onTriggerLocalUpload: () => void;
}

export const UrlImportModal: React.FC<UrlImportModalProps> = ({
  isOpen,
  onClose,
  onImportFile,
  onTriggerLocalUpload,
}) => {
  const [url, setUrl] = useState('');
  const [hasPermission, setHasPermission] = useState(false);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'checking' | 'unavailable' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateUrl = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      setDetectedType(null);
      return null;
    }

    // Check YouTube Watch / Shorts
    if (/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)/i.test(trimmed)) {
      setDetectedType('YouTube Video');
      return 'youtube-video';
    }
    if (/^(https?:\/\/)?(www\.)?youtube\.com\/shorts\//i.test(trimmed)) {
      setDetectedType('YouTube Shorts');
      return 'youtube-shorts';
    }
    // Check Instagram Reel / Post
    if (/^(https?:\/\/)?(www\.)?instagram\.com\/reel\//i.test(trimmed)) {
      setDetectedType('Instagram Reel');
      return 'instagram-reel';
    }
    if (/^(https?:\/\/)?(www\.)?instagram\.com\/(p|tv)\//i.test(trimmed)) {
      setDetectedType('Instagram Video');
      return 'instagram-video';
    }
    // Direct public media stream (mp4/webm)
    if (/^https?:\/\/.*(\.mp4|\.webm|\.mov)(\?.*)?$/i.test(trimmed)) {
      setDetectedType('Direct Media Stream');
      return 'direct-media';
    }

    setDetectedType('Unsupported or Invalid Format');
    return 'unsupported';
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setStatus('idle');
    setErrorMessage(null);
    validateUrl(val);
  };

  const handleInspectAndImport = async () => {
    if (!hasPermission) {
      setErrorMessage('Please confirm that you own this content or have permission to edit it.');
      return;
    }

    const type = validateUrl(url);
    if (!type || type === 'unsupported') {
      setErrorMessage(
        'Please enter a valid public YouTube (video/shorts) or Instagram (reel/video) URL.'
      );
      return;
    }

    setStatus('checking');
    setErrorMessage(null);

    // Direct client-side fetch verification
    // Platforms like YouTube & Instagram enforce strict CORS headers, DRM, and bot-prevention tokens
    // which deliberately block direct client-side fetch requests in browsers.
    // In strict compliance with guidelines: we never bypass authentication or DRM.
    // When direct fetch is not permitted by the origin, we immediately provide the compliant fallback.
    try {
      if (type === 'direct-media') {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          const blobResponse = await fetch(url);
          const blob = await blobResponse.blob();
          const fileName = url.split('/').pop()?.split('?')[0] || 'imported_video.mp4';
          const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });

          const info: DetectedFileInfo = {
            file,
            name: file.name,
            extension: file.name.split('.').pop() || 'mp4',
            mimeType: file.type,
            realMimeType: file.type,
            category: 'video',
            size: file.size,
            formattedSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            supportedOperations: [],
          };
          onImportFile(info);
          onClose();
          return;
        }
      }

      setStatus('unavailable');
      setErrorMessage(
        "URL import is unavailable for this platform stream due to browser CORS policies. Please upload the video file directly to convert and trim in-browser."
      );
    } catch (err) {
      setStatus('unavailable');
      setErrorMessage(
        "URL import is unavailable for this video. Please upload the video file directly to convert and trim in-browser."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden text-left flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Import Authorized Video URL
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                YouTube & Instagram Video / Reel
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Platform Notice Banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">Authorized Content Policy</span>
              <span>
                Only download and edit videos that you own or have permission to use. Private videos,
                DRM, and platform-protected content are never bypassed.
              </span>
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Paste YouTube or Instagram video/reel URL</span>
              {detectedType && (
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                  {detectedType}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or https://www.instagram.com/reel/..."
                value={url}
                onChange={handleUrlChange}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasPermission}
              onChange={(e) => setHasPermission(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-tight">
              I certify that I own this video or have explicit permission from the copyright owner to download and edit it.
            </span>
          </label>

          {/* Error / Fallback Alert */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 space-y-3">
              <div className="flex items-start gap-3 text-red-700 dark:text-red-400 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>

              {status === 'unavailable' && (
                <div className="pt-2 border-t border-red-200 dark:border-red-900/40 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">
                    Already have the file on your device?
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onTriggerLocalUpload();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Video File Instead</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInspectAndImport}
            disabled={!url.trim() || status === 'checking'}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
          >
            {status === 'checking' ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking Permissions...</span>
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                <span>Import Authorized Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

