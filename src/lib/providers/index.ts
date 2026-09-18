import { VideoSourceProvider } from './types';
import { youTubeProvider } from './YouTubeProvider';
import { instagramProvider } from './InstagramProvider';
import { directMediaProvider } from './DirectMediaProvider';

export * from './types';
export * from './YouTubeProvider';
export * from './InstagramProvider';
export * from './DirectMediaProvider';

const providers: VideoSourceProvider[] = [
  youTubeProvider,
  instagramProvider,
  directMediaProvider,
];

export function findProviderForUrl(url: string): VideoSourceProvider | null {
  if (!url || typeof url !== 'string') return null;
  return providers.find((p) => p.canHandle(url)) || null;
}

