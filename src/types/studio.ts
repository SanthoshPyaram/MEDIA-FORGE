import { WatermarkOptions, DelogoOptions, CustomAudioOptions } from './job';

export type StudioTool =
  | 'import'
  | 'trim'
  | 'crop'
  | 'audio'
  | 'enhance'
  | 'resize'
  | 'rotate'
  | 'watermark'
  | 'filters'
  | 'speed'
  | 'compress'
  | 'export';

export type CropPreset = 'original' | '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | 'custom';

export type FilterPreset =
  | 'original'
  | 'bright'
  | 'contrast'
  | 'warm'
  | 'cool'
  | 'grayscale'
  | 'vintage'
  | 'sharp';

export type ResolutionPreset = 'original' | '360p' | '480p' | '720p' | '1080p' | '1440p' | '4k';

export type SpeedPreset = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export type WatermarkModifyMode = 'delogo' | 'blur' | 'pixelate' | 'cover';

export interface CropState {
  enabled: boolean;
  preset: CropPreset;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
}

export interface TransformState {
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface TrimState {
  enabled: boolean;
  start: number; // seconds
  end: number; // seconds
}

export interface AudioTrackState {
  originalAudioEnabled: boolean;
  originalVolume: number; // 0 to 1.5
  fadeIn: number; // 0 to 5 seconds
  fadeOut: number; // 0 to 5 seconds
  customAudioEnabled: boolean;
  customAudioFile: File | null;
  customAudioName?: string;
  customAudioDuration?: number;
  mode: 'replace' | 'mix';
  customVolume: number; // 0 to 1.5
  startAt: number; // seconds
  behavior: 'cut' | 'loop' | 'keep';
}

export interface WatermarkModifyState {
  enabled: boolean;
  mode: WatermarkModifyMode;
  x: number; // pixel coords
  y: number;
  width: number;
  height: number;
  color?: string; // for cover mode
}

export interface EnhancementState {
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  sharpness: number; // 0 to 100
  gamma: number; // 0.1 to 2.5
  exposure: number; // -100 to 100
  denoise: number; // 0 to 100
  smartEnhance: boolean;
}

export interface CompressionState {
  preset: 'max' | 'high' | 'balanced' | 'small' | 'custom';
  bitrate?: string; // e.g. '2.5M'
}

export interface ExportSettingsState {
  format: 'mp4' | 'webm';
  resolution: ResolutionPreset;
  fps: number; // 24, 30, 60
}

export interface StudioState {
  trim: TrimState;
  crop: CropState;
  transform: TransformState;
  audio: AudioTrackState;
  watermark: WatermarkOptions;
  watermarkModify: WatermarkModifyState;
  enhancement: EnhancementState;
  filter: FilterPreset;
  speed: SpeedPreset;
  compression: CompressionState;
  exportSettings: ExportSettingsState;
}

export interface SocialPreset {
  id: string;
  platform: 'YouTube' | 'YouTube Shorts' | 'Instagram Reels' | 'Instagram Feed';
  name: string;
  aspect: CropPreset;
  resolution: ResolutionPreset;
  fps: number;
  description: string;
}

export const SOCIAL_PRESETS: SocialPreset[] = [
  {
    id: 'yt-16-9',
    platform: 'YouTube',
    name: 'YouTube Standard (16:9 1080p)',
    aspect: '16:9',
    resolution: '1080p',
    fps: 30,
    description: 'Landscape Full HD for classic YouTube uploads',
  },
  {
    id: 'yt-4k',
    platform: 'YouTube',
    name: 'YouTube 4K (16:9 2160p)',
    aspect: '16:9',
    resolution: '4k',
    fps: 60,
    description: 'Ultra High Definition for YouTube creators',
  },
  {
    id: 'yt-shorts',
    platform: 'YouTube Shorts',
    name: 'YouTube Shorts (9:16 1080x1920)',
    aspect: '9:16',
    resolution: '1080p',
    fps: 30,
    description: 'Vertical video format optimized for Shorts algorithm',
  },
  {
    id: 'ig-reels',
    platform: 'Instagram Reels',
    name: 'Instagram Reels (9:16 1080x1920)',
    aspect: '9:16',
    resolution: '1080p',
    fps: 30,
    description: 'Full-screen vertical reel format',
  },
  {
    id: 'ig-feed-4-5',
    platform: 'Instagram Feed',
    name: 'Instagram Portrait Feed (4:5)',
    aspect: '4:5',
    resolution: '1080p',
    fps: 30,
    description: 'Vertical carousel/post maximizing feed screen real estate',
  },
  {
    id: 'ig-feed-1-1',
    platform: 'Instagram Feed',
    name: 'Instagram Square Feed (1:1)',
    aspect: '1:1',
    resolution: '1080p',
    fps: 30,
    description: 'Classic square post format',
  },
];

