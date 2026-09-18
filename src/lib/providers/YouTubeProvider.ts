import { VideoSourceProvider, VideoSourceMetadata, ProviderStatus } from './types';

export class YouTubeProvider implements VideoSourceProvider {
  name = 'YouTubeProvider';

  canHandle(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    return (
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/i.test(trimmed)
    );
  }

  isShort(url: string): boolean {
    return /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\//i.test(url.trim());
  }

  async getMetadata(url: string): Promise<VideoSourceMetadata | null> {
    if (!this.canHandle(url)) return null;
    const isShort = this.isShort(url);
    const platformType = isShort ? 'YouTube Short' : 'YouTube Video';

    try {
      // Use YouTube's official public oEmbed endpoint for metadata
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url.trim())}&format=json`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const data = await res.json();
        return {
          title: data.title,
          author: data.author_name,
          thumbnailUrl: data.thumbnail_url,
          platform: 'youtube',
          platformType,
          isDirectMedia: false,
        };
      }
    } catch (e) {
      // Ignore network timeout on oEmbed; fallback to basic detection
    }

    return {
      title: isShort ? 'YouTube Short' : 'YouTube Video',
      platform: 'youtube',
      platformType,
      isDirectMedia: false,
    };
  }

  async getStatus(url: string): Promise<ProviderStatus> {
    const isShort = this.isShort(url);
    const badgeLabel = isShort ? '✓ YouTube Short detected' : '✓ YouTube Video detected';

    return {
      handled: true,
      downloadable: false,
      badgeLabel,
      message:
        'Preview available. To edit or export this video, use a video file that you own or are authorized to download and process.',
      platformUrl: url.trim(),
    };
  }

  async getAuthorizedMedia(): Promise<File | Blob | null> {
    // We never bypass YouTube access controls or pretend a webpage is an MP4.
    return null;
  }
}

export const youTubeProvider = new YouTubeProvider();

