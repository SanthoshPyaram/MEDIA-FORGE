import { FileCategory, OperationDescriptor } from '@/types/job';

export const VIDEO_OPERATIONS: OperationDescriptor[] = [
  {
    id: 'transcode',
    label: 'Convert Video',
    description: 'Transcode to MP4, WebM, or MOV with custom codec & bitrate settings.',
    iconName: 'Film',
    category: 'video',
  },
  {
    id: 'enhance',
    label: 'Video Enhance',
    description: 'Apply Smart Enhance, sharpen, denoise, brightness, contrast, and color grading.',
    iconName: 'Sparkles',
    category: 'video',
  },
  {
    id: 'compress',
    label: 'Compress Video',
    description: 'Intelligently reduce file size while preserving visual fidelity.',
    iconName: 'Minimize2',
    category: 'video',
  },
  {
    id: 'trim',
    label: 'Trim & Cut',
    description: 'Set precise start and end timestamps to extract clips without re-recording.',
    iconName: 'Scissors',
    category: 'video',
  },
  {
    id: 'extract_audio',
    label: 'Extract Audio',
    description: 'Strip the video track and save audio as MP3, WAV, AAC, or OGG.',
    iconName: 'Music',
    category: 'video',
  },
  {
    id: 'mute',
    label: 'Mute / Remove Audio',
    description: 'Strip all audio streams from the video container completely.',
    iconName: 'VolumeX',
    category: 'video',
  },
];

export const IMAGE_OPERATIONS: OperationDescriptor[] = [
  {
    id: 'convert',
    label: 'Convert Format',
    description: 'Convert between JPG, PNG, WebP, BMP, and ICO formats instantly.',
    iconName: 'RefreshCw',
    category: 'image',
  },
  {
    id: 'enhance',
    label: 'Filter & Enhance',
    description: 'Sharpen, denoise, brightness, contrast, saturation, exposure, and smart filter.',
    iconName: 'Sliders',
    category: 'image',
  },
  {
    id: 'upscale',
    label: 'Super-Resolution Upscale',
    description: '2x & 4x edge-directed algorithmic upscaling without cloud dependencies.',
    iconName: 'Maximize',
    category: 'image',
  },
  {
    id: 'compress',
    label: 'Compress Image',
    description: 'Lossy or lossless compression with instant size comparison.',
    iconName: 'FileArchive',
    category: 'image',
  },
  {
    id: 'crop_resize',
    label: 'Crop & Resize',
    description: 'Crop to standard ratios, resize dimensions, and rotate/flip freely.',
    iconName: 'Crop',
    category: 'image',
  },
];

export const AUDIO_OPERATIONS: OperationDescriptor[] = [
  {
    id: 'convert',
    label: 'Convert Audio',
    description: 'Convert between MP3, WAV, OGG, AAC, and WebM audio formats.',
    iconName: 'Music2',
    category: 'audio',
  },
  {
    id: 'trim',
    label: 'Trim Audio',
    description: 'Snip audio waveforms with millisecond accuracy.',
    iconName: 'Scissors',
    category: 'audio',
  },
  {
    id: 'normalize',
    label: 'Normalize & Level',
    description: 'Even out peak loudness and normalize volume dynamics.',
    iconName: 'BarChart2',
    category: 'audio',
  },
  {
    id: 'bitrate',
    label: 'Adjust Bitrate',
    description: 'Change bitrate from 64 kbps (voice) up to 320 kbps (studio master).',
    iconName: 'Activity',
    category: 'audio',
  },
];

export const PDF_OPERATIONS: OperationDescriptor[] = [
  {
    id: 'merge',
    label: 'Merge PDFs',
    description: 'Combine multiple PDF documents into a single consolidated file.',
    iconName: 'Layers',
    category: 'pdf',
  },
  {
    id: 'reorder',
    label: 'Reorder & Rotate Pages',
    description: 'Visual drag-and-drop page grid with per-page 90°/180° rotation.',
    iconName: 'Grid',
    category: 'pdf',
  },
  {
    id: 'split',
    label: 'Split / Extract Pages',
    description: 'Extract custom page ranges or break PDF into individual page files.',
    iconName: 'FileMinus',
    category: 'pdf',
  },
  {
    id: 'pdf_to_images',
    label: 'PDF to Images',
    description: 'Render every PDF page into high-resolution PNG or JPG images.',
    iconName: 'Image',
    category: 'pdf',
  },
  {
    id: 'compress',
    label: 'Compress PDF',
    description: 'Optimize embedded streams and images to reduce PDF file size.',
    iconName: 'Minimize2',
    category: 'pdf',
  },
];

export const DOCUMENT_OPERATIONS: OperationDescriptor[] = [
  {
    id: 'docx_to_pdf',
    label: 'DOCX to PDF',
    description: 'Convert Microsoft Word documents to PDF directly inside the browser.',
    iconName: 'FileText',
    category: 'document',
  },
  {
    id: 'docx_to_html',
    label: 'DOCX to HTML',
    description: 'Extract formatted HTML markup and clean CSS from Word documents.',
    iconName: 'Code',
    category: 'document',
  },
  {
    id: 'sheet_to_csv',
    label: 'Excel to CSV / JSON',
    description: 'Read spreadsheets (.xlsx, .xls) and export sheets to CSV or JSON.',
    iconName: 'Table',
    category: 'document',
  },
  {
    id: 'txt_to_pdf',
    label: 'Text to PDF',
    description: 'Convert plain text, markdown, or logs into clean formatted PDF documents.',
    iconName: 'FileCode',
    category: 'document',
  },
];

export function getSupportedOperations(category: FileCategory, extension: string): OperationDescriptor[] {
  switch (category) {
    case 'video':
      return VIDEO_OPERATIONS;
    case 'image':
      return IMAGE_OPERATIONS;
    case 'audio':
      return AUDIO_OPERATIONS;
    case 'pdf':
      return PDF_OPERATIONS;
    case 'document': {
      const ext = extension.toLowerCase();
      if (ext === 'docx') {
        return DOCUMENT_OPERATIONS.filter(op => op.id.startsWith('docx'));
      }
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        return DOCUMENT_OPERATIONS.filter(op => op.id.startsWith('sheet'));
      }
      if (['txt', 'md', 'log'].includes(ext)) {
        return DOCUMENT_OPERATIONS.filter(op => op.id === 'txt_to_pdf');
      }
      return DOCUMENT_OPERATIONS;
    }
    default:
      return [];
  }
}

