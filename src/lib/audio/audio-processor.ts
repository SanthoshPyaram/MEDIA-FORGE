import { fetchFile } from '@ffmpeg/util';
import { getFFmpeg } from '../ffmpeg/ffmpeg-manager';

export interface AudioProcessingOptions {
  outputFormat: 'mp3' | 'wav' | 'ogg' | 'aac' | 'm4a';
  bitrate?: '64k' | '128k' | '192k' | '256k' | '320k';
  trim?: { start: number; end: number };
  normalize?: boolean;
}

export async function processAudio(
  file: File,
  options: AudioProcessingOptions,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; outputName: string; size: number }> {
  onProgress?.(5, 'Loading audio engine...');
  const ffmpeg = await getFFmpeg((p) => {
    const mapped = 25 + Math.round(p * 0.65);
    onProgress?.(mapped, 'Converting audio...');
  });

  onProgress?.(15, 'Reading input...');
  const inputExt = (file.name.split('.').pop() || 'mp3').toLowerCase();
  const inputName = `audio_in_${Date.now()}.${inputExt}`;
  const outExt = options.outputFormat;
  const outputName = `audio_out_${Date.now()}.${outExt}`;

  const data = await fetchFile(file);
  await ffmpeg.writeFile(inputName, data);

  onProgress?.(25, 'Configuring audio filters...');

  const args: string[] = [];

  if (options.trim && options.trim.start > 0) {
    args.push('-ss', options.trim.start.toFixed(2));
  }

  args.push('-i', inputName);

  if (options.trim && options.trim.end > options.trim.start) {
    const duration = options.trim.end - options.trim.start;
    args.push('-t', duration.toFixed(2));
  }

  // Audio filters
  if (options.normalize) {
    args.push('-filter:a', 'loudnorm=I=-16:LRA=11:TP=-1.5');
  }

  // Audio Codec & Bitrate
  if (outExt === 'mp3') {
    args.push('-c:a', 'libmp3lame', '-b:a', options.bitrate || '192k');
  } else if (outExt === 'wav') {
    args.push('-c:a', 'pcm_s16le');
  } else if (outExt === 'ogg') {
    args.push('-c:a', 'libvorbis', '-b:a', options.bitrate || '160k');
  } else if (outExt === 'aac' || outExt === 'm4a') {
    args.push('-c:a', 'aac', '-b:a', options.bitrate || '192k');
  }

  args.push(outputName);

  onProgress?.(30, 'Rendering audio...');
  await ffmpeg.exec(args);

  onProgress?.(92, 'Packaging output...');
  const outputData = (await ffmpeg.readFile(outputName)) as Uint8Array;

  const mimeMap: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
  };

  const blob = new Blob([outputData.buffer as ArrayBuffer], { type: mimeMap[outExt] || 'audio/mpeg' });

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch (e) {}

  onProgress?.(100, 'Complete');

  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  return {
    blob,
    outputName: `${baseName}_mediaforge.${outExt}`,
    size: blob.size,
  };
}
