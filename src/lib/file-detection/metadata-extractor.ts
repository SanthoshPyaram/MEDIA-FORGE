import { FileMetadata, VideoMetadata, ImageMetadata, AudioMetadata, PdfMetadata } from '@/types/job';

export async function extractMetadata(
  file: File,
  category: string
): Promise<{ metadata: FileMetadata; thumbnailUrl?: string }> {
  try {
    switch (category) {
      case 'video':
        return await extractVideoMetadata(file);
      case 'image':
        return await extractImageMetadata(file);
      case 'audio':
        return await extractAudioMetadata(file);
      case 'pdf':
        return await extractPdfMetadata(file);
      case 'document':
        return { metadata: {} };
      default:
        return { metadata: {} };
    }
  } catch (err) {
    console.warn(`Failed to extract metadata for ${file.name}:`, err);
    return { metadata: {} };
  }
}

async function extractVideoMetadata(file: File): Promise<{ metadata: VideoMetadata; thumbnailUrl?: string }> {
  // First attempt: HTML5 video metadata
  const html5Result = await new Promise<{ metadata: VideoMetadata; thumbnailUrl?: string }>((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    let resolved = false;
    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const finish = (meta: VideoMetadata, thumb?: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve({ metadata: meta, thumbnailUrl: thumb });
    };

    const timeout = setTimeout(() => {
      finish({
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        fps: 30,
      });
    }, 4000);

    video.onloadedmetadata = () => {
      const meta: VideoMetadata = {
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        fps: 30,
        hasAudio: (video as any).mozHasAudio || Boolean((video as any).webkitAudioDecodedByteCount) || true,
      };

      // Seek slightly to grab a representative frame
      const seekTime = Math.min(1.0, video.duration / 2);
      if (video.duration > 0 && seekTime > 0) {
        try {
          video.currentTime = seekTime;
        } catch (e) {
          clearTimeout(timeout);
          finish(meta);
        }
      } else {
        clearTimeout(timeout);
        finish(meta);
      }
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      let thumbnailUrl: string | undefined;

      try {
        const canvas = document.createElement('canvas');
        const maxThumb = 320;
        const w = video.videoWidth || 320;
        const h = video.videoHeight || 240;
        const scale = Math.min(1, maxThumb / Math.max(w, h));
        canvas.width = Math.max(1, Math.floor(w * scale));
        canvas.height = Math.max(1, Math.floor(h * scale));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (e) {
        console.warn('Video thumbnail generation failed:', e);
      }

      finish(
        {
          duration: video.duration || 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
          fps: 30,
          hasAudio: true,
        },
        thumbnailUrl
      );
    };

    video.onerror = () => {
      clearTimeout(timeout);
      finish({
        duration: 0,
        width: 0,
        height: 0,
        fps: 30,
      });
    };
  });

  // If HTML5 video could not extract width/height (e.g. MKV, AVI, or unsupported codec), try binary inspection
  if (!html5Result.metadata.width || !html5Result.metadata.height) {
    const binaryDims = await tryExtractMp4DimensionsFromBinary(file);
    if (binaryDims) {
      html5Result.metadata.width = binaryDims.width;
      html5Result.metadata.height = binaryDims.height;
    }
  }

  return html5Result;
}

async function extractImageMetadata(file: File): Promise<{ metadata: ImageMetadata; thumbnailUrl?: string }> {
  // First try binary inspection for instant, bulletproof dimensions
  const binaryDims = await tryExtractImageDimensionsFromBinary(file);

  if (typeof Image === 'undefined') {
    return {
      metadata: {
        width: binaryDims?.width || 0,
        height: binaryDims?.height || 0,
        aspectRatio: (binaryDims?.width || 1) / (binaryDims?.height || 1),
        format: file.name.split('.').pop() || 'image',
      },
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      let thumbnailUrl: string | undefined;

      try {
        const canvas = document.createElement('canvas');
        const maxThumb = 320;
        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        const scale = Math.min(1, maxThumb / Math.max(w, h));
        canvas.width = Math.max(1, Math.floor(w * scale));
        canvas.height = Math.max(1, Math.floor(h * scale));

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (e) {
        console.warn('Image thumbnail generation failed:', e);
      }

      const finalWidth = img.naturalWidth || binaryDims?.width || 0;
      const finalHeight = img.naturalHeight || binaryDims?.height || 0;

      const meta: ImageMetadata = {
        width: finalWidth,
        height: finalHeight,
        aspectRatio: finalWidth / (finalHeight || 1),
        format: file.type.replace('image/', '') || file.name.split('.').pop() || 'image',
      };

      // Safely revoke object url since thumbnail is now a self-contained base64 data URL
      URL.revokeObjectURL(url);
      resolve({ metadata: meta, thumbnailUrl });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      const finalWidth = binaryDims?.width || 0;
      const finalHeight = binaryDims?.height || 0;

      resolve({
        metadata: {
          width: finalWidth,
          height: finalHeight,
          aspectRatio: finalWidth / (finalHeight || 1),
          format: file.name.split('.').pop() || 'image',
        },
      });
    };
  });
}

async function extractAudioMetadata(file: File): Promise<{ metadata: AudioMetadata }> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.src = url;

    audio.onloadedmetadata = () => {
      const meta: AudioMetadata = {
        duration: audio.duration || 0,
        channels: 2,
        sampleRate: 44100,
        format: file.name.split('.').pop() || 'audio',
      };
      URL.revokeObjectURL(url);
      resolve({ metadata: meta });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        metadata: {
          duration: 0,
          channels: 2,
          sampleRate: 44100,
          format: file.name.split('.').pop() || 'audio',
        },
      });
    };
  });
}

async function extractPdfMetadata(file: File): Promise<{ metadata: PdfMetadata }> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const count = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle();
    const author = pdfDoc.getAuthor();
    return {
      metadata: {
        pageCount: count,
        title,
        author,
      },
    };
  } catch (e) {
    return {
      metadata: {
        pageCount: 1,
      },
    };
  }
}

// Binary header parser for instant image dimensions
async function tryExtractImageDimensionsFromBinary(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const buffer = await file.slice(0, 65536).arrayBuffer();
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // PNG: bytes 16..24
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      const width = view.getUint32(16, false);
      const height = view.getUint32(20, false);
      if (width > 0 && height > 0) return { width, height };
    }

    // GIF: bytes 6..10
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      const width = view.getUint16(6, true);
      const height = view.getUint16(8, true);
      if (width > 0 && height > 0) return { width, height };
    }

    // JPEG: Scan for SOF markers (0xFFC0, 0xFFC1, 0xFFC2)
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.byteLength - 8) {
        if (view.getUint8(offset) !== 0xff) {
          offset++;
          continue;
        }
        const marker = view.getUint8(offset + 1);
        // SOF0, SOF1, SOF2 markers
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = view.getUint16(offset + 5, false);
          const width = view.getUint16(offset + 7, false);
          if (width > 0 && height > 0) return { width, height };
        }
        const len = view.getUint16(offset + 2, false);
        offset += len + 2;
      }
    }
  } catch (e) {
    // Non-fatal binary inspection
  }
  return null;
}

// Binary header parser for MP4/MOV track dimensions
async function tryExtractMp4DimensionsFromBinary(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const buffer = await file.slice(0, 524288).arrayBuffer(); // read first 512KB
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // Search for 'tkhd' atom
    for (let i = 0; i < bytes.length - 84; i++) {
      if (
        bytes[i] === 0x74 && // 't'
        bytes[i + 1] === 0x6b && // 'k'
        bytes[i + 2] === 0x68 && // 'h'
        bytes[i + 3] === 0x64 // 'd'
      ) {
        const version = view.getUint8(i + 4);
        const offset = version === 1 ? i + 4 + 88 : i + 4 + 76;
        if (offset + 8 <= buffer.byteLength) {
          // Fixed point 16.16 values
          const width = view.getUint32(offset, false) >> 16;
          const height = view.getUint32(offset + 4, false) >> 16;
          if (width > 0 && height > 0 && width < 10000 && height < 10000) {
            return { width, height };
          }
        }
      }
    }
  } catch (e) {}
  return null;
}
