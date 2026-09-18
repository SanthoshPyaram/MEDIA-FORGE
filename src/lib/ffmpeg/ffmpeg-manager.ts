import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;
let loadPromise: Promise<FFmpeg> | null = null;

export interface FFmpegLoadProgress {
  ratio: number;
}

export async function getFFmpeg(
  onProgress?: (progress: number) => void
): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const ffmpeg = new FFmpeg();

      ffmpeg.on('progress', (e) => {
        if (onProgress && typeof e.progress === 'number') {
          onProgress(Math.min(100, Math.max(0, Math.round(e.progress * 100))));
        }
      });

      // Load FFmpeg from local server bundle first (/ffmpeg/), fallback to jsdelivr CDN
      let coreURL = '';
      let wasmURL = '';

      try {
        const localBase = `${window.location.origin}/ffmpeg`;
        coreURL = await toBlobURL(`${localBase}/ffmpeg-core.js`, 'text/javascript');
        wasmURL = await toBlobURL(`${localBase}/ffmpeg-core.wasm`, 'application/wasm');
      } catch (localErr) {
        console.warn('Local ffmpeg core load failed, trying jsdelivr CDN fallback...', localErr);
        const cdnBase = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
        coreURL = await toBlobURL(`${cdnBase}/ffmpeg-core.js`, 'text/javascript');
        wasmURL = await toBlobURL(`${cdnBase}/ffmpeg-core.wasm`, 'application/wasm');
      }

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      ffmpegInstance = ffmpeg;
      isLoaded = true;
      return ffmpeg;
    } catch (err: any) {
      loadPromise = null;
      console.error('Failed to load FFmpeg.wasm:', err);
      const isSharedArrayBufferMissing = typeof SharedArrayBuffer === 'undefined';
      let msg = 'Failed to initialize the browser video processing engine.';
      if (isSharedArrayBufferMissing) {
        msg = 'SharedArrayBuffer is disabled in this browser context. Cross-Origin-Opener-Policy headers or a secure context (HTTPS/localhost) are required.';
      }
      throw new Error(msg, { cause: err });
    }
  })();

  return loadPromise;
}

export function terminateFFmpeg() {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch (e) {
      console.warn('Error terminating FFmpeg instance', e);
    }
    ffmpegInstance = null;
    isLoaded = false;
    loadPromise = null;
  }
}

