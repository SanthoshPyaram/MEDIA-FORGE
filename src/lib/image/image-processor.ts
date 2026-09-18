export interface ImageAdjustmentOptions {
  brightness?: number; // -100 to 100 (default 0)
  contrast?: number; // -100 to 100 (default 0)
  saturation?: number; // -100 to 100 (default 0)
  exposure?: number; // -100 to 100 (default 0)
  gamma?: number; // 0.2 to 3.0 (default 1.0)
  sharpen?: number; // 0 to 100 (default 0)
  denoise?: number; // 0 to 100 (default 0)
  blur?: number; // 0 to 50 (default 0)
  grayscale?: number; // 0 to 100 (default 0)
  invert?: boolean;
  sepia?: number; // 0 to 100 (default 0)
  rotation?: number; // degrees: 0, 90, 180, 270
  flipH?: boolean;
  flipV?: boolean;
  crop?: { x: number; y: number; width: number; height: number };
  resize?: { width?: number; height?: number; maintainAspect?: boolean };
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
  quality?: number; // 0.1 to 1.0 (default 0.92)
  smartEnhance?: boolean;
}

export async function processImage(
  source: File | HTMLImageElement | HTMLCanvasElement,
  options: ImageAdjustmentOptions = {},
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; width: number; height: number }> {
  onProgress?.(10);

  // Load image element if File
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
  } else if (source instanceof HTMLCanvasElement) {
    img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = source.toDataURL();
    });
  } else {
    img = source;
  }

  onProgress?.(25);

  // Determine crop rectangle
  const cropX = options.crop ? options.crop.x : 0;
  const cropY = options.crop ? options.crop.y : 0;
  const cropW = options.crop ? options.crop.width : img.naturalWidth;
  const cropH = options.crop ? options.crop.height : img.naturalHeight;

  // Determine destination resize dimensions
  let destW = cropW;
  let destH = cropH;

  if (options.resize?.width && options.resize?.height) {
    destW = options.resize.width;
    destH = options.resize.height;
  } else if (options.resize?.width) {
    destW = options.resize.width;
    destH = Math.round((options.resize.width / cropW) * cropH);
  } else if (options.resize?.height) {
    destH = options.resize.height;
    destW = Math.round((options.resize.height / cropH) * cropW);
  }

  // Handle rotation
  const rotation = (options.rotation || 0) % 360;
  const isPerpendicular = rotation === 90 || rotation === 270;
  const canvasW = isPerpendicular ? destH : destW;
  const canvasH = isPerpendicular ? destW : destH;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, canvasW);
  canvas.height = Math.max(1, canvasH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not obtain 2D rendering context');

  onProgress?.(40);

  // Draw with transformations
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1);

  // High quality smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(img, cropX, cropY, cropW, cropH, -destW / 2, -destH / 2, destW, destH);
  ctx.restore();

  if (revokeUrl && sourceUrl) {
    URL.revokeObjectURL(sourceUrl);
  }

  onProgress?.(55);

  // Pixel manipulation: adjustments & filters
  const smart = options.smartEnhance;
  const brightness = smart ? 8 : (options.brightness || 0);
  const contrast = smart ? 12 : (options.contrast || 0);
  const saturation = smart ? 10 : (options.saturation || 0);
  const exposure = options.exposure || 0;
  const gamma = options.gamma || 1.0;
  const sharpen = smart ? 25 : (options.sharpen || 0);
  const denoise = options.denoise || 0;
  const grayscale = options.grayscale || 0;
  const invert = options.invert || false;
  const sepia = options.sepia || 0;

  const needsPixelFilter =
    brightness !== 0 ||
    contrast !== 0 ||
    saturation !== 0 ||
    exposure !== 0 ||
    gamma !== 1.0 ||
    grayscale > 0 ||
    invert ||
    sepia > 0 ||
    sharpen > 0 ||
    denoise > 0;

  if (needsPixelFilter) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const len = data.length;

    // Contrast factor
    const cf = (259 * (contrast + 255)) / (255 * (259 - contrast));
    // Brightness factor + exposure
    const bf = brightness * 2.55 + exposure * 2.55;
    // Saturation factor
    const sf = 1 + saturation / 100;
    // Gamma correction lookup table
    const gammaLut = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      gammaLut[i] = Math.min(255, Math.max(0, Math.pow(i / 255, 1 / gamma) * 255));
    }

    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Exposure & Brightness
      r += bf;
      g += bf;
      b += bf;

      // Contrast
      r = cf * (r - 128) + 128;
      g = cf * (g - 128) + 128;
      b = cf * (b - 128) + 128;

      // Gamma
      r = gammaLut[Math.min(255, Math.max(0, Math.round(r)))];
      g = gammaLut[Math.min(255, Math.max(0, Math.round(g)))];
      b = gammaLut[Math.min(255, Math.max(0, Math.round(b)))];

      // Saturation
      if (sf !== 1) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * sf;
        g = gray + (g - gray) * sf;
        b = gray + (b - gray) * sf;
      }

      // Grayscale
      if (grayscale > 0) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const gFactor = grayscale / 100;
        r = r * (1 - gFactor) + lum * gFactor;
        g = g * (1 - gFactor) + lum * gFactor;
        b = b * (1 - gFactor) + lum * gFactor;
      }

      // Sepia
      if (sepia > 0) {
        const sFactor = sepia / 100;
        const sr = r * 0.393 + g * 0.769 + b * 0.189;
        const sg = r * 0.349 + g * 0.686 + b * 0.168;
        const sb = r * 0.272 + g * 0.534 + b * 0.131;
        r = r * (1 - sFactor) + sr * sFactor;
        g = g * (1 - sFactor) + sg * sFactor;
        b = b * (1 - sFactor) + sb * sFactor;
      }

      // Invert
      if (invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      data[i] = Math.min(255, Math.max(0, r));
      data[i + 1] = Math.min(255, Math.max(0, g));
      data[i + 2] = Math.min(255, Math.max(0, b));
    }

    // Apply sharpen convolution if requested
    if (sharpen > 0) {
      applySharpenConvolution(imageData, sharpen / 100);
    }

    // Apply denoise filter if requested
    if (denoise > 0) {
      applyDenoise(imageData, denoise / 100);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  onProgress?.(80);

  // Output format & compression
  const format = options.outputFormat || 'image/png';
  const quality = options.quality ?? 0.92;

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas blob generation failed'));
      },
      format,
      quality
    );
  });

  onProgress?.(100);
  return { blob, width: canvas.width, height: canvas.height };
}

// 3x3 Convolution Sharpen Kernel
function applySharpenConvolution(imageData: ImageData, intensity: number) {
  const w = imageData.width;
  const h = imageData.height;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  // Normal kernel: [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ]
  const strength = intensity * 1.5;
  const center = 1 + 4 * strength;
  const edge = -strength;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          src[idx + c] * center +
          src[((y - 1) * w + x) * 4 + c] * edge +
          src[((y + 1) * w + x) * 4 + c] * edge +
          src[(y * w + (x - 1)) * 4 + c] * edge +
          src[(y * w + (x + 1)) * 4 + c] * edge;

        dst[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }
}

// Lightweight edge-preserving 3x3 median/denoise filter
function applyDenoise(imageData: ImageData, intensity: number) {
  const w = imageData.width;
  const h = imageData.height;
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;
  const blend = Math.min(1, intensity);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;

      for (let c = 0; c < 3; c++) {
        // Collect 3x3 neighborhood
        let sum = 0;
        let count = 0;
        const current = src[idx + c];

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nVal = src[((y + dy) * w + (x + dx)) * 4 + c];
            // Only average pixels with similar intensity (bilateral edge preservation)
            if (Math.abs(nVal - current) < 32) {
              sum += nVal;
              count++;
            }
          }
        }
        const filtered = count > 0 ? sum / count : current;
        dst[idx + c] = Math.min(255, Math.max(0, current * (1 - blend) + filtered * blend));
      }
    }
  }
}

