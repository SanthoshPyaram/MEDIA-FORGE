export type JobStatus =
  | 'QUEUED'
  | 'LOADING'
  | 'PROCESSING'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FileCategory = 'video' | 'image' | 'audio' | 'pdf' | 'document' | 'unknown';

export interface StageStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  codec?: string;
  hasAudio?: boolean;
}

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: number;
  format: string;
}

export interface AudioMetadata {
  duration: number;
  channels: number;
  sampleRate: number;
  format: string;
}

export interface PdfMetadata {
  pageCount: number;
  title?: string;
  author?: string;
}

export interface DocumentMetadata {
  wordCount?: number;
  sheetNames?: string[];
  rowCount?: number;
}

export type FileMetadata =
  | VideoMetadata
  | ImageMetadata
  | AudioMetadata
  | PdfMetadata
  | DocumentMetadata
  | Record<string, any>;

export interface WatermarkOptions {
  enabled: boolean;
  type: 'text' | 'image';
  text?: string;
  fontSize?: number; // e.g. 24, 32, 48, 64
  color?: string; // hex color e.g. '#ffffff'
  hasBackground?: boolean;
  imageFile?: File;
  imageDataUrl?: string;
  position: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center' | 'center';
  opacity: number; // 0.1 to 1.0
  margin?: number; // offset in px
  scale?: number; // relative scale for image (0.1 to 0.5)
}

export interface DelogoOptions {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CustomAudioOptions {
  enabled: boolean;
  file?: File;
  mode: 'replace' | 'mix';
  originalVolume?: number; // 0.0 to 1.5
  customVolume?: number; // 0.0 to 1.5
}

export interface DetectedFileInfo {
  file: File;
  name: string;
  extension: string;
  mimeType: string;
  realMimeType: string;
  category: FileCategory;
  size: number;
  formattedSize: string;
  metadata?: FileMetadata;
  thumbnailUrl?: string;
  supportedOperations: OperationDescriptor[];
  isCorrupted?: boolean;
  corruptionReason?: string;
}

export interface OperationDescriptor {
  id: string;
  label: string;
  description: string;
  iconName: string;
  category: FileCategory;
}

export interface ProcessingJob {
  id: string;
  file: File;
  fileInfo: DetectedFileInfo;
  category: FileCategory;
  operation: string;
  options: Record<string, any>;
  status: JobStatus;
  progress: number; // 0 - 100
  currentStage: string;
  stages: StageStep[];
  startedAt?: number;
  completedAt?: number;
  elapsedSeconds?: number;
  estimatedRemainingSeconds?: number;
  outputBlob?: Blob;
  outputUrl?: string;
  outputName?: string;
  outputSize?: number;
  outputDimensions?: { width: number; height: number };
  outputQuality?: string;
  error?: {
    message: string;
    details?: string;
  };
  cancel?: () => void;
}

