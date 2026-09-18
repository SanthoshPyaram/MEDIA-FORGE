export type UpscaleFactor = 1 | 2 | 4;
export type UpscaleQuality = 'fast' | 'balanced' | 'high';

export interface UpscaleOptions {
  factor: UpscaleFactor;
  quality: UpscaleQuality;
  enhanceEdges?: boolean;
}

export async function upscaleImage(
  source: File | HTMLImageElement,
  options: UpscaleOptions,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; width: number; height: number }> {
  onProgress?.(10);

  let img: HTMLImageElement;
  let revokeUrl = false;
  let sourceUrl = '';

  if (source instanceof File) {
    img = await new Promise((resolve, reject) => {
      const el = new Image();
      sourceUrl = URL.createObjectURL(source);
      revokeUrl = true;
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = sourceUrl;
    });
  } else {
    img = source;
  }

  const factor = options.factor;
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const targetW = srcW * factor;
  const targetH = srcH * factor;

  onProgress?.(25);

  if (factor === 1) {
    const canvas = document.createElement('canvas');
    canvas.width = srcW;
    canvas.height = srcH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    ctx.drawImage(img, 0, 0);

    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('ToBlob failed'))), 'image/png')
    );
    if (revokeUrl && sourceUrl) URL.revokeObjectURL(sourceUrl);
    onProgress?.(100);
    return { blob, width: srcW, height: srcH };
  }

  // Multi-step progressive resampling for superior edge sharpness
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get 2D context');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = options.quality === 'fast' ? 'medium' : 'high';

  if (factor === 2 || options.quality === 'fast') {
    ctx.drawImage(img, 0, 0, targetW, targetH);
  } else if (factor === 4) {
    // 2-step upscale: 1x -> 2x -> 4x preserves higher mid-frequency fidelity
    const intermediate = document.createElement('canvas');
    intermediate.width = srcW * 2;
    intermediate.height = srcH * 2;
    const ictx = intermediate.getContext('2d');
    if (ictx) {
      ictx.imageSmoothingEnabled = true;
      ictx.imageSmoothingQuality = 'high';
      ictx.drawImage(img, 0, 0, srcW * 2, srcH * 2);
      ctx.drawImage(intermediate, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(img, 0, 0, targetW, targetH);
    }
  }

  onProgress?.(60);

  // For High Quality / Balanced: Apply an adaptive unsharp edge boost pass
  if (options.quality === 'high' || options.enhanceEdges) {
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;
    const srcCopy = new Uint8ClampedArray(data);

    // Adaptive unsharp mask on luminance
    const amount = options.quality === 'high' ? 0.35 : 0.2;
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const idx = (y * targetW + x) * 4;
        for (let c = 0; c < 3; c++) {
          const center = srcCopy[idx + c];
          const blurVal =
            (srcCopy[((y - 1) * targetW + x) * 4 + c] +
              srcCopy[((y + 1) * targetW + x) * 4 + c] +
              srcCopy[(y * targetW + (x - 1)) * 4 + c] +
              srcCopy[(y * targetW + (x + 1)) * 4 + c]) /
            4;
          const delta = center - blurVal;
          // Accentuate edge transitions without blowing out noise
          if (Math.abs(delta) < 40) {
            data[idx + c] = Math.min(255, Math.max(0, center + delta * amount));
          }
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  if (revokeUrl && sourceUrl) {
    URL.revokeObjectURL(sourceUrl);
  }

  onProgress?.(85);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png');
  });

  onProgress?.(100);
  return { blob, width: targetW, height: targetH };
}

