import { VideoSourceProvider, VideoSourceMetadata, ProviderStatus } from './types';

export class InstagramProvider implements VideoSourceProvider {
  name = 'InstagramProvider';

  canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|tv)\//i.test(trimmed);
  }

  isReel(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?instagram\.com\/reel\//i.test(url.trim());
  }

  async getMetadata(url: string): Promise<VideoSourceMetadata | null> {
    if (!this.canHandle(url)) return null;
    const isReel = this.isReel(url);
    const platformType = isReel ? 'Instagram Reel' : 'Instagram Video';

    return {
      title: isReel ? 'Instagram Reel' : 'Instagram Video',
      platform: 'instagram',
      platformType,
      isDirectMedia: false,
    };
  }

  async getStatus(url: string): Promise<ProviderStatus> {
    const isReel = this.isReel(url);
    const badgeLabel = isReel ? '✓ Instagram Reel detected' : '✓ Instagram Video detected';

    return {
      handled: true,
      downloadable: false,
      badgeLabel,
      message:
        'This platform URL does not provide an authorized downloadable video file to this application.',
      platformUrl: url.trim(),
    };
  }

  async getAuthorizedMedia(): Promise<File | Blob | null> {
    // We never scrape private accounts or bypass Instagram authentication/access controls.
    return null;
  }
}

export const instagramProvider = new InstagramProvider();

