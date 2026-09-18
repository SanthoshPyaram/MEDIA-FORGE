import React from 'react';
import { DetectedFileInfo } from '@/types/job';
import { StudioWorkspace } from '@/components/studio/StudioWorkspace';

interface VideoWorkspaceProps {
  initialFile?: DetectedFileInfo | null;
  onStartJob: (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any>) => void;
  onBackToHome?: () => void;
}

export const VideoWorkspace: React.FC<VideoWorkspaceProps> = ({
  initialFile,
  onStartJob,
  onBackToHome,
}) => {
  return (
    <StudioWorkspace
      initialFile={initialFile}
      onStartJob={onStartJob}
      onBackToHome={onBackToHome}
    />
  );
};
export default VideoWorkspace;
