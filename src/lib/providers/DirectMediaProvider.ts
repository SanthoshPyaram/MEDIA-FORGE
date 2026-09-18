import { VideoSourceProvider, VideoSourceMetadata, ProviderStatus } from './types';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.m4v', '.avi', '.ts', '.3gp', '.mpg', '.mpeg'];

export class DirectMediaProvider implements VideoSourceProvider {
  name = 'DirectMediaProvider';

  canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    try {
      const parsed = new URL(trimmed);
      const pathname = parsed.pathname.toLowerCase();
      return VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  async getMetadata(url: string): Promise<VideoSourceMetadata | null> {
    try {
      const parsed = new URL(url.trim());
      const fileName = parsed.pathname.split('/').pop() || 'video.mp4';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4';

      return {
        title: fileName,
        format: ext,
        platform: 'direct',
        platformType: 'Direct Video File',
        isDirectMedia: true,
      };
    } catch {
      return null;
    }
  }

  async getStatus(url: string): Promise<ProviderStatus> {
    if (!this.canHandle(url)) {
      return {
        handled: false,
        downloadable: false,
        message: "That doesn't appear to be a supported video URL.",
        errorCode: 'INVALID_URL',
      };
    }

    try {
      // Test browser access and CORS headers
      const res = await fetch(url.trim(), { method: 'HEAD', signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const ctype = res.headers.get('content-type') || '';
        if (ctype.includes('video') || ctype.includes('octet-stream')) {
          const clen = res.headers.get('content-length');
          const sizeMB = clen ? `${(parseInt(clen, 10) / (1024 * 1024)).toFixed(1)} MB` : '';
          return {
            handled: true,
            downloadable: true,
            badgeLabel: '✓ Direct Video File detected',
            message: sizeMB ? `Ready to import directly (${sizeMB})` : 'Ready to import directly',
          };
        }
      }

      return {
        handled: true,
        downloadable: false,
        badgeLabel: 'Direct Video URL',
        message: 'This URL does not provide a browser-accessible video file.',
        errorCode: 'UNSUPPORTED_FORMAT',
      };
    } catch (err: any) {
      // If browser blocked due to CORS or network error
      const isCors =
        err.name === 'TypeError' ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError');

      if (isCors) {
        return {
          handled: true,
          downloadable: false,
          badgeLabel: 'Direct Video URL (CORS Restricted)',
          message: 'The source server does not allow this browser to access the file (CORS restriction).',
          errorCode: 'CORS_BLOCKED',
        };
      }

      return {
        handled: true,
        downloadable: false,
        message: 'Unable to reach the source server. Please check your network connection.',
        errorCode: 'NETWORK_ERROR',
      };
    }
  }

  async getAuthorizedMedia(
    url: string,
    onProgress?: (receivedBytes: number, totalBytes: number) => void
  ): Promise<File | null> {
    const res = await fetch(url.trim());
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }

    const total = parseInt(res.headers.get('content-length') || '0', 10);
    const contentType = res.headers.get('content-type') || 'video/mp4';

    let blob: Blob;
    if (res.body && onProgress && total > 0) {
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          onProgress(received, total);
        }
      }
      blob = new Blob(chunks as any[], { type: contentType });
    } else {
      blob = await res.blob();
    }

    const parsed = new URL(url.trim());
    const fileName = parsed.pathname.split('/').pop()?.split('?')[0] || 'imported_video.mp4';
    return new File([blob], fileName, { type: blob.type || contentType });
  }
}

export const directMediaProvider = new DirectMediaProvider();
