export interface VideoSourceMetadata {
  title?: string;
  author?: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  sizeBytes?: number;
  thumbnailUrl?: string;
  isDirectMedia?: boolean;
  platform?: 'youtube' | 'instagram' | 'direct' | 'local';
  platformType?: 'YouTube Video' | 'YouTube Short' | 'Instagram Reel' | 'Instagram Video' | 'Direct Video File';
}

export interface ProviderStatus {
  handled: boolean;
  downloadable: boolean;
  badgeLabel?: string;
  message: string;
  platformUrl?: string;
  errorCode?:
    | 'CORS_BLOCKED'
    | 'PLATFORM_RESTRICTION'
    | 'AUTH_REQUIRED'
    | 'INVALID_URL'
    | 'NETWORK_ERROR'
    | 'UNSUPPORTED_FORMAT';
}

export interface VideoSourceProvider {
  name: string;
  canHandle(url: string): boolean;
  getMetadata(url: string): Promise<VideoSourceMetadata | null>;
  getAuthorizedMedia(
    url: string,
    onProgress?: (receivedBytes: number, totalBytes: number) => void
  ): Promise<File | Blob | null>;
  getStatus(url: string): Promise<ProviderStatus>;
}

