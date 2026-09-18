import { useState, useCallback } from 'react';
import { DetectedFileInfo } from '@/types/job';
import { detectFileType } from '@/lib/file-detection/magic-bytes';
import { extractMetadata } from '@/lib/file-detection/metadata-extractor';
import { getSupportedOperations } from '@/lib/file-detection/format-catalog';
import { formatBytes } from '@/utils/formatters';

export function useFileDetector() {
  const [isDetecting, setIsDetecting] = useState(false);

  const analyzeFile = useCallback(async (file: File): Promise<DetectedFileInfo> => {
    setIsDetecting(true);
    try {
      const detected = await detectFileType(file);
      const { metadata, thumbnailUrl } = await extractMetadata(file, detected.category);
      const supportedOperations = getSupportedOperations(detected.category, detected.extension);

      const info: DetectedFileInfo = {
        file,
        name: file.name,
        extension: detected.extension,
        mimeType: file.type || detected.mime,
        realMimeType: detected.mime,
        category: detected.category,
        size: file.size,
        formattedSize: formatBytes(file.size),
        metadata,
        thumbnailUrl,
        supportedOperations,
      };

      return info;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const analyzeMultipleFiles = useCallback(
    async (files: File[]): Promise<DetectedFileInfo[]> => {
      setIsDetecting(true);
      try {
        const results = await Promise.all(files.map((file) => analyzeFile(file)));
        return results;
      } finally {
        setIsDetecting(false);
      }
    },
    [analyzeFile]
  );

  return {
    analyzeFile,
    analyzeMultipleFiles,
    isDetecting,
  };
}

