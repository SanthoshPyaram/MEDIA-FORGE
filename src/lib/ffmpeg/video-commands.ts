import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from './ffmpeg-manager';
import { WatermarkOptions, DelogoOptions, CustomAudioOptions } from '@/types/job';

export interface VideoCropParams {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WatermarkModifyParams {
  mode: 'delogo' | 'blur' | 'pixelate' | 'cover';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface VideoProcessingOptions {
  outputFormat: 'mp4' | 'webm' | 'mov';
  resolution?: 'original' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '4k';
  quality?: 'fast' | 'balanced' | 'high';
  bitrate?: string; // e.g. '1M', '2.5M', '5M'
  fps?: number; // 24, 30, 60
  trim?: { start: number; end: number };
  rotate?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  crop?: VideoCropParams;
  speed?: number; // 0.25 to 2.0
  filter?: string; // 'bright', 'contrast', 'warm', 'cool', 'grayscale', 'vintage', 'sharp'
  muteAudio?: boolean;
  normalizeAudio?: boolean;
  smartEnhance?: boolean;
  sharpen?: number; // 0 to 100
  denoise?: number; // 0 to 100
  brightness?: number; // -1 to 1 (in ffmpeg eq)
  contrast?: number; // -1 to 1 (in ffmpeg eq)
  saturation?: number; // 0 to 3 (in ffmpeg eq)
  gamma?: number; // 0.1 to 10
  watermark?: WatermarkOptions;
  delogo?: DelogoOptions;
  watermarkModify?: WatermarkModifyParams;
  customAudio?: CustomAudioOptions;
  audioFade?: { in?: number; out?: number; duration?: number };
  audioBehavior?: 'cut' | 'loop' | 'keep';
  compressionPreset?: 'max' | 'high' | 'balanced' | 'small' | 'custom';
}

export async function generateWatermarkBytes(options: WatermarkOptions): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  if (options.type === 'text') {
    const text = options.text || 'MediaForge';
    const fontSize = options.fontSize || 36;
    const color = options.color || '#ffffff';
    const opacity = options.opacity ?? 0.85;
    const hasBg = options.hasBackground ?? true;

    const font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.font = font;
    const metrics = ctx.measureText(text);
    const textW = Math.ceil(metrics.width);
    const textH = Math.ceil(fontSize * 1.25);

    const padX = hasBg ? Math.round(fontSize * 0.4) : 4;
    const padY = hasBg ? Math.round(fontSize * 0.25) : 4;

    canvas.width = textW + padX * 2;
    canvas.height = textH + padY * 2;

    const c = canvas.getContext('2d')!;
    c.font = font;
    c.textBaseline = 'middle';

    if (hasBg) {
      c.fillStyle = `rgba(0, 0, 0, ${(0.65 * opacity).toFixed(2)})`;
      const r = Math.min(8, Math.round(canvas.height / 4));
      c.beginPath();
      c.roundRect(0, 0, canvas.width, canvas.height, r);
      c.fill();
    } else {
      c.shadowColor = 'rgba(0, 0, 0, 0.85)';
      c.shadowBlur = 6;
      c.shadowOffsetX = 2;
      c.shadowOffsetY = 2;
    }

    c.fillStyle = color;
    c.globalAlpha = opacity;
    c.fillText(text, padX, canvas.height / 2);
  } else {
    let imgSource: HTMLImageElement | null = null;
    if (options.imageFile) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(options.imageFile!);
      });
      imgSource = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
      });
    } else if (options.imageDataUrl) {
      imgSource = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = options.imageDataUrl!;
      });
    }

    if (!imgSource) throw new Error('No watermark image provided');

    const nativeW = imgSource.naturalWidth || imgSource.width || 200;
    const nativeH = imgSource.naturalHeight || imgSource.height || 100;
    const scale = options.scale || 0.25;
    const targetW = Math.round(nativeW * scale);
    const aspect = nativeW / nativeH;
    const targetH = Math.round(targetW / aspect);

    canvas.width = Math.max(20, targetW);
    canvas.height = Math.max(20, targetH);

    const c = canvas.getContext('2d')!;
    c.globalAlpha = options.opacity ?? 0.85;
    c.drawImage(imgSource, 0, 0, canvas.width, canvas.height);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Watermark blob creation failed'));
      blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf))).catch(reject);
    }, 'image/png');
  });
}

// Generate atempo filter string for speed values that may exceed 0.5 - 2.0 bounds
function getAtempoFilter(speed: number): string {
  if (speed <= 0) return 'atempo=1.0';
  let s = speed;
  const parts: string[] = [];
  while (s > 2.0) {
    parts.push('atempo=2.0');
    s /= 2.0;
  }
  while (s < 0.5) {
    parts.push('atempo=0.5');
    s /= 0.5;
  }
  parts.push(`atempo=${s.toFixed(3)}`);
  return parts.join(',');
}

export async function processVideo(
  file: File,
  options: VideoProcessingOptions,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; outputName: string; size: number }> {
  onProgress?.(5, 'Loading video engine...');
  const ffmpeg = await getFFmpeg((p) => {
    // Map ffmpeg progress into 30..90%
    const mapped = 30 + Math.round(p * 0.6);
    onProgress?.(mapped, 'Transcoding video...');
  });

  onProgress?.(12, 'Preparing media file...');
  const inputExt = (file.name.split('.').pop() || 'mp4').toLowerCase();
  const inputName = `input_${Date.now()}.${inputExt}`;
  const outExt = options.outputFormat;
  const outputName = `output_${Date.now()}.${outExt}`;

  // Write file to in-memory virtual FS
  const fileData = await fetchFile(file);
  await ffmpeg.writeFile(inputName, fileData);

  // Check if watermark overlay is requested
  let watermarkFileName: string | null = null;
  if (options.watermark && options.watermark.enabled) {
    try {
      onProgress?.(18, 'Generating watermark overlay...');
      const wmBytes = await generateWatermarkBytes(options.watermark);
      watermarkFileName = `watermark_${Date.now()}.png`;
      await ffmpeg.writeFile(watermarkFileName, wmBytes);
    } catch (wmErr) {
      console.warn('Could not generate watermark, proceeding without it:', wmErr);
    }
  }

  // Check if custom audio track is requested
  let customAudioFileName: string | null = null;
  if (options.customAudio && options.customAudio.enabled && options.customAudio.file) {
    try {
      onProgress?.(22, 'Preparing custom audio track...');
      const aExt = (options.customAudio.file.name.split('.').pop() || 'mp3').toLowerCase();
      customAudioFileName = `custom_audio_${Date.now()}.${aExt}`;
      const aData = await fetchFile(options.customAudio.file);
      await ffmpeg.writeFile(customAudioFileName, aData);
    } catch (aErr) {
      console.warn('Could not write custom audio, continuing:', aErr);
    }
  }

  onProgress?.(26, 'Configuring filters and encoders...');

  const args: string[] = [];

  // Trim start
  if (options.trim && options.trim.start > 0) {
    args.push('-ss', options.trim.start.toFixed(2));
  }

  args.push('-i', inputName);

  // Trim duration
  if (options.trim && options.trim.end > options.trim.start) {
    const duration = options.trim.end - options.trim.start;
    args.push('-t', duration.toFixed(2));
  }

  let nextInputIdx = 1;
  let watermarkInputIdx = -1;
  let customAudioInputIdx = -1;

  if (watermarkFileName) {
    args.push('-i', watermarkFileName);
    watermarkInputIdx = nextInputIdx++;
  }

  if (customAudioFileName) {
    args.push('-i', customAudioFileName);
    customAudioInputIdx = nextInputIdx++;
  }

  // Video filters list
  const vf: string[] = [];

  // 1. Rotation and Flip
  if (options.rotate === 90) {
    vf.push('transpose=1');
  } else if (options.rotate === 180) {
    vf.push('transpose=1,transpose=1');
  } else if (options.rotate === 270) {
    vf.push('transpose=2');
  }
  if (options.flipH) {
    vf.push('hflip');
  }
  if (options.flipV) {
    vf.push('vflip');
  }

  // 2. Crop
  if (options.crop && options.crop.width > 0 && options.crop.height > 0) {
    const cw = Math.round(options.crop.width);
    const ch = Math.round(options.crop.height);
    const cx = Math.max(0, Math.round(options.crop.x));
    const cy = Math.max(0, Math.round(options.crop.y));
    vf.push(`crop=${cw}:${ch}:${cx}:${cy}`);
  }

  // 3. User-owned Watermark Modification (delogo, blur, cover, pixelate)
  const mod = options.watermarkModify;
  if (mod && mod.width > 0 && mod.height > 0) {
    const mx = Math.max(0, Math.round(mod.x));
    const my = Math.max(0, Math.round(mod.y));
    const mw = Math.max(4, Math.round(mod.width));
    const mh = Math.max(4, Math.round(mod.height));

    if (mod.mode === 'delogo') {
      vf.push(`delogo=x=${mx}:y=${my}:w=${mw}:h=${mh}`);
    } else if (mod.mode === 'cover') {
      const color = mod.color || '#000000';
      vf.push(`drawbox=x=${mx}:y=${my}:w=${mw}:h=${mh}:color=${color}@1:t=fill`);
    } else if (mod.mode === 'blur' || mod.mode === 'pixelate') {
      // High-quality delogo inpainting is the standard safe local implementation
      vf.push(`delogo=x=${mx}:y=${my}:w=${mw}:h=${mh}`);
    }
  } else if (options.delogo && options.delogo.enabled) {
    // Backwards-compatibility
    const dx = Math.max(0, Math.round(options.delogo.x));
    const dy = Math.max(0, Math.round(options.delogo.y));
    const dw = Math.max(4, Math.round(options.delogo.width));
    const dh = Math.max(4, Math.round(options.delogo.height));
    vf.push(`delogo=x=${dx}:y=${dy}:w=${dw}:h=${dh}`);
  }

  // 4. Filter Presets
  if (options.filter && options.filter !== 'original') {
    switch (options.filter) {
      case 'bright':
        vf.push('eq=brightness=0.08:contrast=1.12:saturation=1.05');
        break;
      case 'contrast':
        vf.push('eq=contrast=1.28:saturation=1.12');
        break;
      case 'warm':
        vf.push('colorbalance=rs=0.10:gs=0.03:bs=-0.10');
        break;
      case 'cool':
        vf.push('colorbalance=rs=-0.10:gs=0.0:bs=0.10');
        break;
      case 'grayscale':
        vf.push('hue=s=0');
        break;
      case 'vintage':
        vf.push('eq=saturation=0.75:contrast=1.20:gamma=1.10');
        break;
      case 'sharp':
        vf.push('unsharp=5:5:1.25:5:5:0.0');
        break;
    }
  }

  // 5. Color grading / Enhancement filters
  const smart = options.smartEnhance;
  const b = smart ? 0.04 : (options.brightness ? options.brightness / 100 : 0);
  const c = smart ? 1.12 : (options.contrast ? 1 + options.contrast / 100 : 1);
  const s = smart ? 1.15 : (options.saturation ? 1 + options.saturation / 100 : 1);
  const g = options.gamma ?? 1.0;

  if (b !== 0 || c !== 1 || s !== 1 || g !== 1.0) {
    vf.push(`eq=brightness=${b.toFixed(2)}:contrast=${c.toFixed(2)}:saturation=${s.toFixed(2)}:gamma=${g.toFixed(2)}`);
  }

  // 6. Sharpen filter (unsharp)
  const sharpen = smart ? 35 : (options.sharpen || 0);
  if (sharpen > 0) {
    const amount = (sharpen / 100) * 1.5;
    vf.push(`unsharp=5:5:${amount.toFixed(2)}:5:5:0.0`);
  }

  // 7. Denoise (hqdn3d)
  if (options.denoise && options.denoise > 0) {
    const dStrength = ((options.denoise / 100) * 4).toFixed(1);
    vf.push(`hqdn3d=${dStrength}:${dStrength}:6:6`);
  }

  // 8. Speed (setpts)
  if (options.speed && options.speed !== 1.0) {
    const ptsMultiplier = (1 / options.speed).toFixed(4);
    vf.push(`setpts=${ptsMultiplier}*PTS`);
  }

  // 9. Resolution
  if (options.resolution && options.resolution !== 'original') {
    switch (options.resolution) {
      case '360p':
        vf.push('scale=-2:360');
        break;
      case '480p':
        vf.push('scale=-2:480');
        break;
      case '720p':
        vf.push('scale=-2:720');
        break;
      case '1080p':
        vf.push('scale=-2:1080');
        break;
      case '1440p':
        vf.push('scale=-2:1440');
        break;
      case '4k':
        vf.push('scale=-2:2160');
        break;
    }
  }

  // 10. FPS
  if (options.fps) {
    vf.push(`fps=${options.fps}`);
  }

  // Construct Filter Complex and Stream Mapping
  const filterComplexParts: string[] = [];
  let videoMap = '0:v';
  let audioMap: string | null = null;

  // Video Graph
  if (watermarkInputIdx !== -1) {
    const margin = options.watermark?.margin ?? 24;
    let overlayCoord = `W-w-${margin}:H-h-${margin}`;
    const pos = options.watermark?.position || 'bottom-right';

    switch (pos) {
      case 'top-left':
        overlayCoord = `${margin}:${margin}`;
        break;
      case 'top-center':
        overlayCoord = `(W-w)/2:${margin}`;
        break;
      case 'top-right':
        overlayCoord = `W-w-${margin}:${margin}`;
        break;
      case 'center':
        overlayCoord = `(W-w)/2:(H-h)/2`;
        break;
      case 'bottom-left':
        overlayCoord = `${margin}:H-h-${margin}`;
        break;
      case 'bottom-center':
        overlayCoord = `(W-w)/2:H-h-${margin}`;
        break;
      case 'bottom-right':
      default:
        overlayCoord = `W-w-${margin}:H-h-${margin}`;
        break;
    }

    if (vf.length > 0) {
      const vfChain = vf.join(',');
      filterComplexParts.push(`[0:v]${vfChain}[base]`, `[base][${watermarkInputIdx}:v]overlay=${overlayCoord}[outv]`);
    } else {
      filterComplexParts.push(`[0:v][${watermarkInputIdx}:v]overlay=${overlayCoord}[outv]`);
    }
    videoMap = '[outv]';
  } else if (customAudioInputIdx !== -1 && vf.length > 0) {
    filterComplexParts.push(`[0:v]${vf.join(',')}[outv]`);
    videoMap = '[outv]';
  } else if (vf.length > 0) {
    args.push('-vf', vf.join(','));
    videoMap = '0:v';
  }

  // Audio Graph
  const af: string[] = [];

  // Audio Speed
  if (options.speed && options.speed !== 1.0) {
    af.push(getAtempoFilter(options.speed));
  }

  // Audio Fades
  if (options.audioFade?.in && options.audioFade.in > 0) {
    af.push(`afade=t=in:ss=0:d=${options.audioFade.in}`);
  }
  if (options.audioFade?.out && options.audioFade.out > 0 && options.audioFade.duration) {
    const startFade = Math.max(0, options.audioFade.duration - options.audioFade.out);
    af.push(`afade=t=out:st=${startFade.toFixed(2)}:d=${options.audioFade.out}`);
  }

  if (options.muteAudio) {
    audioMap = null;
    args.push('-an');
  } else if (customAudioInputIdx !== -1) {
    if (options.customAudio?.mode === 'mix') {
      const origVol = (options.customAudio?.originalVolume ?? 1.0).toFixed(2);
      const custVol = (options.customAudio?.customVolume ?? 0.8).toFixed(2);
      filterComplexParts.push(
        `[0:a]volume=${origVol}[a0]`,
        `[${customAudioInputIdx}:a]volume=${custVol}[a1]`,
        `[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[outa]`
      );
      audioMap = '[outa]';
    } else {
      // Replace mode: map the custom audio track directly
      audioMap = `${customAudioInputIdx}:a`;
    }
    args.push('-shortest');
  } else {
    audioMap = '0:a?';
    if (af.length > 0) {
      args.push('-af', af.join(','));
    }
    if (options.normalizeAudio) {
      args.push('-filter:a', 'loudnorm=I=-16:LRA=11:TP=-1.5');
    }
  }

  if (filterComplexParts.length > 0) {
    args.push('-filter_complex', filterComplexParts.join(';'));
    args.push('-map', videoMap);
    if (audioMap) args.push('-map', audioMap);
  } else if (customAudioInputIdx !== -1) {
    args.push('-map', videoMap);
    if (audioMap) args.push('-map', audioMap);
  }

  // Set compatible audio codec
  if (!options.muteAudio) {
    if (outExt === 'mp4' || outExt === 'mov') {
      args.push('-c:a', 'aac', '-b:a', '192k');
    } else if (outExt === 'webm') {
      args.push('-c:a', 'libopus', '-b:a', '128k');
    }
  }

  // Video Codec & Quality settings
  if (outExt === 'mp4') {
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p');
    if (options.bitrate) {
      args.push('-b:v', options.bitrate);
    } else if (options.compressionPreset) {
      const crfMap = {
        max: '18',
        high: '21',
        balanced: '25',
        small: '30',
        custom: '24',
      };
      args.push('-crf', crfMap[options.compressionPreset] || '24');
    } else {
      const crf = options.quality === 'high' ? '20' : options.quality === 'fast' ? '28' : '23';
      args.push('-crf', crf);
    }
  } else if (outExt === 'webm') {
    args.push('-c:v', 'libvpx-vp9');
    if (options.bitrate) {
      args.push('-b:v', options.bitrate);
    } else if (options.compressionPreset) {
      const crfMap = {
        max: '24',
        high: '28',
        balanced: '33',
        small: '38',
        custom: '32',
      };
      args.push('-crf', crfMap[options.compressionPreset] || '32', '-b:v', '0');
    } else {
      const crf = options.quality === 'high' ? '26' : options.quality === 'fast' ? '36' : '31';
      args.push('-crf', crf, '-b:v', '0');
    }
  } else if (outExt === 'mov') {
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  }

  args.push(outputName);

  onProgress?.(30, 'Encoding video...');
  await ffmpeg.exec(args);

  onProgress?.(92, 'Finalizing container...');
  const outputData = (await ffmpeg.readFile(outputName)) as Uint8Array;
  const mimeType = outExt === 'mp4' ? 'video/mp4' : outExt === 'webm' ? 'video/webm' : 'video/quicktime';
  const blob = new Blob([outputData.buffer as ArrayBuffer], { type: mimeType });

  // Cleanup virtual files
  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    if (watermarkFileName) {
      await ffmpeg.deleteFile(watermarkFileName);
    }
    if (customAudioFileName) {
      await ffmpeg.deleteFile(customAudioFileName);
    }
  } catch (e) {
    // Ignore cleanup error
  }

  onProgress?.(100, 'Complete');

  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  return {
    blob,
    outputName: `${baseName}_mediaforge.${outExt}`,
    size: blob.size,
  };
}
