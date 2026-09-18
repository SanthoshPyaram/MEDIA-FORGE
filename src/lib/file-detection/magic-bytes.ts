export interface MagicByteResult {
  mime: string;
  category: 'video' | 'image' | 'audio' | 'pdf' | 'document' | 'unknown';
  extension: string;
}

export async function detectFileType(file: File): Promise<MagicByteResult> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  try {
    const buffer = await file.slice(0, 64).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return { mime: 'image/png', category: 'image', extension: 'png' };
    }

    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { mime: 'image/jpeg', category: 'image', extension: 'jpg' };
    }

    // GIF: 47 49 46 38 (GIF8)
    if (
      bytes[0] === 0x47 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x38
    ) {
      return { mime: 'image/gif', category: 'image', extension: 'gif' };
    }

    // WebP or AVI or WAV: RIFF container
    if (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46
    ) {
      // Check 8..12
      const tag = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (tag === 'WEBP') {
        return { mime: 'image/webp', category: 'image', extension: 'webp' };
      }
      if (tag === 'AVI ') {
        return { mime: 'video/x-msvideo', category: 'video', extension: 'avi' };
      }
      if (tag === 'WAVE') {
        return { mime: 'audio/wav', category: 'audio', extension: 'wav' };
      }
    }

    // BMP: 42 4D
    if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
      return { mime: 'image/bmp', category: 'image', extension: 'bmp' };
    }

    // PDF: 25 50 44 46 (%PDF)
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    ) {
      return { mime: 'application/pdf', category: 'pdf', extension: 'pdf' };
    }

    // MP4 / MOV / M4V: ftyp box
    // Check bytes 4..7 for "ftyp" or "moov"
    if (
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand === 'qt  ') {
        return { mime: 'video/quicktime', category: 'video', extension: 'mov' };
      }
      return { mime: 'video/mp4', category: 'video', extension: 'mp4' };
    }

    // MKV / WebM: EBML header 1A 45 DF A3
    if (
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    ) {
      if (ext === 'webm') {
        return { mime: 'video/webm', category: 'video', extension: 'webm' };
      }
      return { mime: 'video/x-matroska', category: 'video', extension: 'mkv' };
    }

    // MP3: ID3 header or sync word
    if (
      (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes[0] === 0xff && (bytes[1] === 0xfb || bytes[1] === 0xf3 || bytes[1] === 0xf2))
    ) {
      return { mime: 'audio/mpeg', category: 'audio', extension: 'mp3' };
    }

    // OGG: 4F 67 67 53 (OggS)
    if (
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53
    ) {
      return { mime: 'audio/ogg', category: 'audio', extension: 'ogg' };
    }

    // FLAC: 66 4C 61 43 (fLaC)
    if (
      bytes[0] === 0x66 &&
      bytes[1] === 0x4c &&
      bytes[2] === 0x61 &&
      bytes[3] === 0x43
    ) {
      return { mime: 'audio/flac', category: 'audio', extension: 'flac' };
    }

    // ZIP based files: 50 4B 03 04 (PK..) -> DOCX, XLSX, or ZIP
    if (
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      bytes[2] === 0x03 &&
      bytes[3] === 0x04
    ) {
      if (ext === 'docx') {
        return {
          mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          category: 'document',
          extension: 'docx',
        };
      }
      if (ext === 'xlsx') {
        return {
          mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          category: 'document',
          extension: 'xlsx',
        };
      }
      return { mime: 'application/zip', category: 'document', extension: 'zip' };
    }
  } catch (err) {
    console.warn('Magic byte inspection failed, falling back to file.type & extension', err);
  }

  // Fallback to extension and browser mime type
  if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'ts', 'm4v', '3gp', 'flv', 'wmv'].includes(ext)) {
    return { mime: file.type || `video/${ext}`, category: 'video', extension: ext };
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg', 'ico', 'avif'].includes(ext)) {
    return { mime: file.type || `image/${ext}`, category: 'image', extension: ext };
  }
  if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext)) {
    return { mime: file.type || `audio/${ext}`, category: 'audio', extension: ext };
  }
  if (ext === 'pdf') {
    return { mime: 'application/pdf', category: 'pdf', extension: 'pdf' };
  }
  if (['docx', 'xlsx', 'csv', 'txt', 'html', 'json', 'md'].includes(ext)) {
    return { mime: file.type || 'text/plain', category: 'document', extension: ext };
  }

  return { mime: file.type || 'application/octet-stream', category: 'unknown', extension: ext };
}

