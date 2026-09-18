export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatResolution(w?: number, h?: number): string {
  if (!w || !h) return 'Original / Stream';
  if (w === 3840 && h === 2160) return '4K (3840×2160)';
  if (w === 2560 && h === 1440) return '2K (2560×1440)';
  if (w === 1920 && h === 1080) return '1080p Full HD';
  if (w === 1280 && h === 720) return '720p HD';
  if (w === 854 && h === 480) return '480p SD';
  return `${w} × ${h}`;
}

export function calculateSavings(original: number, current: number) {
  if (!original || !current) return { diff: 0, percent: 0, isSmaller: false };
  const diff = original - current;
  const percent = Math.round((diff / original) * 100);
  return {
    diff,
    percent: Math.abs(percent),
    isSmaller: diff > 0,
  };
}

export function generateId(): string {
  return 'mf_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

