import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ProcessingJob, JobStatus, DetectedFileInfo } from '@/types/job';
import { generateId } from '@/utils/formatters';
import { processVideo } from '@/lib/ffmpeg/video-commands';
import { processAudio } from '@/lib/audio/audio-processor';
import { processImage } from '@/lib/image/image-processor';
import { upscaleImage } from '@/lib/image/upscaler';
import { mergePdfs, splitPdf, reorderAndRotatePdf, imagesToPdf, compressPdf } from '@/lib/pdf/pdf-engine';
import { convertDocxToPdf, convertDocxToHtml, convertSheet, convertTxtToPdf } from '@/lib/document/document-engine';

interface JobQueueContextType {
  jobs: ProcessingJob[];
  activeJobId: string | null;
  addJob: (fileInfo: DetectedFileInfo, operation: string, options?: Record<string, any>) => string;
  startJob: (id: string) => Promise<void>;
  startAllJobs: () => Promise<void>;
  cancelJob: (id: string) => void;
  removeJob: (id: string) => void;
  clearCompleted: () => void;
  retryJob: (id: string) => Promise<void>;
  isProcessingBatch: boolean;
  totalProgress: number;
}

const JobQueueContext = createContext<JobQueueContextType | undefined>(undefined);

export const JobQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const jobsRef = useRef<ProcessingJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const activeControllers = useRef<Map<string, AbortController>>(new Map());

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      jobsRef.current.forEach((job) => {
        if (job.outputUrl) URL.revokeObjectURL(job.outputUrl);
      });
    };
  }, []);

  const updateJob = useCallback((id: string, updates: Partial<ProcessingJob>) => {
    jobsRef.current = jobsRef.current.map((job) => {
      if (job.id === id) {
        return { ...job, ...updates };
      }
      return job;
    });
    setJobs([...jobsRef.current]);
  }, []);

  const addJob = useCallback(
    (fileInfo: DetectedFileInfo, operation: string, options: Record<string, any> = {}): string => {
      const id = generateId();
      const initialStages = [
        { id: '1', label: 'Preparing file', status: 'pending' as const },
        { id: '2', label: 'Initializing processor', status: 'pending' as const },
        { id: '3', label: 'Executing transformation', status: 'pending' as const },
        { id: '4', label: 'Finalizing output', status: 'pending' as const },
      ];

      const newJob: ProcessingJob = {
        id,
        file: fileInfo.file,
        fileInfo,
        category: fileInfo.category,
        operation,
        options,
        status: 'QUEUED',
        progress: 0,
        currentStage: 'Queued',
        stages: initialStages,
      };

      jobsRef.current = [...jobsRef.current, newJob];
      setJobs([...jobsRef.current]);
      return id;
    },
    []
  );

  const executeJobLogic = async (job: ProcessingJob) => {
    const { id, file, fileInfo, operation, options } = job;
    const startTime = Date.now();

    updateJob(id, {
      status: 'PROCESSING',
      startedAt: startTime,
      currentStage: 'Starting operation...',
      progress: 5,
    });

    try {
      let outputBlob: Blob | undefined;
      let outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_processed`;
      let outputDimensions: { width: number; height: number } | undefined;
      let outputQuality: string | undefined;

      // 1. VIDEO OPERATIONS
      if (fileInfo.category === 'video') {
        if (operation === 'extract_audio') {
          const res = await processAudio(
            file,
            { outputFormat: options.outputFormat || 'mp3', bitrate: options.bitrate || '192k' },
            (p, stage) => {
              updateJob(id, { progress: p, currentStage: stage });
            }
          );
          outputBlob = res.blob;
          outputName = res.outputName;
          outputQuality = `${options.bitrate || '192k'} (${(options.outputFormat || 'mp3').toUpperCase()})`;
        } else {
          const res = await processVideo(
            file,
            {
              outputFormat: options.outputFormat || 'mp4',
              resolution: options.resolution,
              quality: options.quality,
              bitrate: options.bitrate,
              fps: options.fps,
              trim: options.trim,
              muteAudio: operation === 'mute' || options.muteAudio,
              normalizeAudio: options.normalizeAudio,
              smartEnhance: operation === 'enhance' || options.smartEnhance,
              sharpen: options.sharpen,
              denoise: options.denoise,
              brightness: options.brightness,
              contrast: options.contrast,
              saturation: options.saturation,
              gamma: options.gamma,
              watermark: options.watermark,
              delogo: options.delogo,
              customAudio: options.customAudio,
            },
            (p, stage) => {
              updateJob(id, { progress: p, currentStage: stage });
            }
          );
          outputBlob = res.blob;
          outputName = res.outputName;
          if (options.resolution === '4k') outputDimensions = { width: 3840, height: 2160 };
          else if (options.resolution === '1440p') outputDimensions = { width: 2560, height: 1440 };
          else if (options.resolution === '1080p') outputDimensions = { width: 1920, height: 1080 };
          else if (options.resolution === '720p') outputDimensions = { width: 1280, height: 720 };
          else if (options.resolution === '480p') outputDimensions = { width: 854, height: 480 };
          else if (options.resolution === '360p') outputDimensions = { width: 640, height: 360 };
          else if ((fileInfo.metadata as any)?.width && (fileInfo.metadata as any)?.height) {
            outputDimensions = { width: (fileInfo.metadata as any).width, height: (fileInfo.metadata as any).height };
          }
          outputQuality = `${(options.quality || 'balanced').toUpperCase()} (${(options.outputFormat || 'mp4').toUpperCase()}${options.bitrate && options.bitrate !== 'auto' ? ' • ' + options.bitrate : ''})`;
        }
      }
      // 2. IMAGE OPERATIONS
      else if (fileInfo.category === 'image') {
        if (operation === 'upscale') {
          const res = await upscaleImage(
            file,
            {
              factor: options.factor || 2,
              quality: options.quality || 'high',
              enhanceEdges: options.enhanceEdges ?? true,
            },
            (p) => updateJob(id, { progress: p, currentStage: `Algorithmic upscaling ${options.factor || 2}x...` })
          );
          outputBlob = res.blob;
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_upscaled_${options.factor || 2}x.png`;
          outputDimensions = { width: res.width, height: res.height };
          outputQuality = `${options.factor || 2}x Super-Res (${(options.quality || 'high').toUpperCase()})`;
        } else {
          const res = await processImage(
            file,
            {
              brightness: options.brightness,
              contrast: options.contrast,
              saturation: options.saturation,
              exposure: options.exposure,
              gamma: options.gamma,
              sharpen: options.sharpen,
              denoise: options.denoise,
              blur: options.blur,
              grayscale: options.grayscale,
              invert: options.invert,
              sepia: options.sepia,
              rotation: options.rotation,
              flipH: options.flipH,
              flipV: options.flipV,
              crop: options.crop,
              resize: options.resize,
              outputFormat: options.outputFormat || 'image/png',
              quality: options.quality,
              smartEnhance: operation === 'enhance' || options.smartEnhance,
            },
            (p) => updateJob(id, { progress: p, currentStage: 'Processing image pixels...' })
          );
          outputBlob = res.blob;
          const ext = options.outputFormat === 'image/jpeg' ? 'jpg' : options.outputFormat === 'image/webp' ? 'webp' : 'png';
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_mediaforge.${ext}`;
          outputDimensions = { width: res.width, height: res.height };
          outputQuality = `${Math.round((options.quality ?? 0.92) * 100)}% Quality (${(options.outputFormat || 'image/webp').replace('image/', '').toUpperCase()})`;
        }
      }
      // 3. AUDIO OPERATIONS
      else if (fileInfo.category === 'audio') {
        const res = await processAudio(
          file,
          {
            outputFormat: options.outputFormat || 'mp3',
            bitrate: options.bitrate,
            trim: options.trim,
            normalize: operation === 'normalize' || options.normalize,
          },
          (p, stage) => updateJob(id, { progress: p, currentStage: stage })
        );
        outputBlob = res.blob;
        outputName = res.outputName;
      }
      // 4. PDF OPERATIONS
      else if (fileInfo.category === 'pdf') {
        if (operation === 'split') {
          const res = await splitPdf(file, options.pageIndices || [0], (p, stage) =>
            updateJob(id, { progress: p, currentStage: stage })
          );
          outputBlob = res.blob;
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_extracted.pdf`;
        } else if (operation === 'reorder') {
          const res = await reorderAndRotatePdf(file, options.pageActions || [], (p, stage) =>
            updateJob(id, { progress: p, currentStage: stage })
          );
          outputBlob = res.blob;
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_reordered.pdf`;
        } else if (operation === 'compress') {
          const res = await compressPdf(file, (p, stage) =>
            updateJob(id, { progress: p, currentStage: stage })
          );
          outputBlob = res.blob;
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}_compressed.pdf`;
        } else {
          outputBlob = file;
          outputName = file.name;
        }
      }
      // 5. DOCUMENT OPERATIONS
      else if (fileInfo.category === 'document') {
        const ext = fileInfo.extension.toLowerCase();
        if (ext === 'docx') {
          if (operation === 'docx_to_html') {
            const res = await convertDocxToHtml(file);
            outputBlob = new Blob([res.html], { type: 'text/html;charset=utf-8;' });
            outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}.html`;
          } else {
            const res = await convertDocxToPdf(file, (p, stage) =>
              updateJob(id, { progress: p, currentStage: stage })
            );
            outputBlob = res.blob;
            outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}.pdf`;
          }
        } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
          const target = options.targetFormat || 'csv';
          const res = await convertSheet(file, target, options.sheetIndex || 0);
          outputBlob = res.output instanceof Blob ? res.output : new Blob([res.output], { type: 'text/html' });
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}.${target}`;
        } else if (['txt', 'md', 'log'].includes(ext)) {
          const res = await convertTxtToPdf(file, (p, stage) =>
            updateJob(id, { progress: p, currentStage: stage })
          );
          outputBlob = res.blob;
          outputName = `${file.name.substring(0, file.name.lastIndexOf('.'))}.pdf`;
        }
      }

      if (!outputBlob) {
        throw new Error('Transformation resulted in an empty output.');
      }

      const outputUrl = URL.createObjectURL(outputBlob);
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      updateJob(id, {
        status: 'COMPLETED',
        progress: 100,
        currentStage: 'Completed successfully',
        outputBlob,
        outputUrl,
        outputName,
        outputSize: outputBlob.size,
        outputDimensions,
        outputQuality,
        completedAt: Date.now(),
        elapsedSeconds: elapsed,
      });
    } catch (err: any) {
      console.error(`Job ${id} failed:`, err);
      updateJob(id, {
        status: 'FAILED',
        progress: 100,
        currentStage: 'Processing failed',
        error: {
          message: err.message || 'An unexpected error occurred during processing.',
          details: err.stack || String(err),
        },
      });
    }
  };

  const startJob = useCallback(
    async (id: string) => {
      const job = jobsRef.current.find((j) => j.id === id) || jobs.find((j) => j.id === id);
      if (!job) {
        console.warn(`Job ${id} not found in queue.`);
        return;
      }

      setActiveJobId(id);
      const controller = new AbortController();
      activeControllers.current.set(id, controller);

      await executeJobLogic(job);

      activeControllers.current.delete(id);
      setActiveJobId(null);
    },
    [jobs]
  );

  const startAllJobs = useCallback(async () => {
    setIsProcessingBatch(true);
    const queuedJobs = jobsRef.current.filter((j) => j.status === 'QUEUED' || j.status === 'FAILED');

    for (const job of queuedJobs) {
      setActiveJobId(job.id);
      const controller = new AbortController();
      activeControllers.current.set(job.id, controller);

      await executeJobLogic(job);

      activeControllers.current.delete(job.id);
    }

    setActiveJobId(null);
    setIsProcessingBatch(false);
  }, []);

  const cancelJob = useCallback(
    (id: string) => {
      const controller = activeControllers.current.get(id);
      if (controller) {
        controller.abort();
        activeControllers.current.delete(id);
      }
      updateJob(id, {
        status: 'CANCELLED',
        currentStage: 'Cancelled by user',
      });
      if (activeJobId === id) setActiveJobId(null);
    },
    [activeJobId, updateJob]
  );

  const removeJob = useCallback((id: string) => {
    const job = jobsRef.current.find((j) => j.id === id);
    if (job?.outputUrl) URL.revokeObjectURL(job.outputUrl);
    jobsRef.current = jobsRef.current.filter((j) => j.id !== id);
    setJobs([...jobsRef.current]);
  }, []);

  const clearCompleted = useCallback(() => {
    jobsRef.current.forEach((j) => {
      if ((j.status === 'COMPLETED' || j.status === 'CANCELLED') && j.outputUrl) {
        URL.revokeObjectURL(j.outputUrl);
      }
    });
    jobsRef.current = jobsRef.current.filter((j) => j.status !== 'COMPLETED' && j.status !== 'CANCELLED');
    setJobs([...jobsRef.current]);
  }, []);

  const retryJob = useCallback(
    async (id: string) => {
      updateJob(id, { status: 'QUEUED', progress: 0, error: undefined });
      await startJob(id);
    },
    [startJob, updateJob]
  );

  // Calculate batch total progress
  const totalProgress =
    jobs.length === 0
      ? 0
      : Math.round(
          jobs.reduce((acc, job) => acc + (job.status === 'COMPLETED' ? 100 : job.progress), 0) /
            jobs.length
        );

  return (
    <JobQueueContext.Provider
      value={{
        jobs,
        activeJobId,
        addJob,
        startJob,
        startAllJobs,
        cancelJob,
        removeJob,
        clearCompleted,
        retryJob,
        isProcessingBatch,
        totalProgress,
      }}
    >
      {children}
    </JobQueueContext.Provider>
  );
};

export const useJobQueue = (): JobQueueContextType => {
  const context = useContext(JobQueueContext);
  if (!context) {
    throw new Error('useJobQueue must be used within a JobQueueProvider');
  }
  return context;
};

