import { PDFDocument, degrees } from 'pdf-lib';

export async function mergePdfs(
  files: File[],
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(10, 'Initializing PDF merger...');
  const mergedPdf = await PDFDocument.create();

  const total = files.length;
  let processed = 0;

  for (const file of files) {
    onProgress?.(
      15 + Math.round((processed / total) * 70),
      `Merging ${file.name}...`
    );

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }

    processed++;
  }

  onProgress?.(90, 'Saving merged PDF...');
  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob, pageCount: mergedPdf.getPageCount() };
}

export async function splitPdf(
  file: File,
  pageIndices: number[], // 0-based
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(15, 'Loading source PDF...');
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  onProgress?.(45, 'Extracting selected pages...');
  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);

  for (const page of copiedPages) {
    newPdf.addPage(page);
  }

  onProgress?.(85, 'Compiling extracted PDF...');
  const pdfBytes = await newPdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob, pageCount: newPdf.getPageCount() };
}

export async function reorderAndRotatePdf(
  file: File,
  pageActions: { index: number; rotation: number }[], // index in original, rotation delta in degrees (e.g. 0, 90, 180, 270)
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(15, 'Loading PDF document...');
  const arrayBuffer = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  onProgress?.(45, 'Rearranging and rotating pages...');
  const newPdf = await PDFDocument.create();

  const indicesToCopy = pageActions.map((p) => p.index);
  const copiedPages = await newPdf.copyPages(srcPdf, indicesToCopy);

  for (let i = 0; i < copiedPages.length; i++) {
    const page = copiedPages[i];
    const action = pageActions[i];
    if (action.rotation) {
      const currentRot = page.getRotation().angle;
      page.setRotation(degrees((currentRot + action.rotation) % 360));
    }
    newPdf.addPage(page);
  }

  onProgress?.(85, 'Saving document...');
  const pdfBytes = await newPdf.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob, pageCount: newPdf.getPageCount() };
}

export async function imagesToPdf(
  imageFiles: File[],
  options: { pageSize?: 'A4' | 'fit'; margin?: number } = {},
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; pageCount: number }> {
  onProgress?.(10, 'Initializing PDF creator...');
  const pdfDoc = await PDFDocument.create();
  const total = imageFiles.length;

  for (let i = 0; i < total; i++) {
    const file = imageFiles[i];
    onProgress?.(15 + Math.round((i / total) * 70), `Embedding ${file.name}...`);

    const buffer = await file.arrayBuffer();
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    let embeddedImage;
    if (ext === 'jpg' || ext === 'jpeg') {
      embeddedImage = await pdfDoc.embedJpg(buffer);
    } else if (ext === 'png') {
      embeddedImage = await pdfDoc.embedPng(buffer);
    } else {
      // For webp/other formats, draw to canvas and convert to PNG first
      const pngBlob = await new Promise<Blob>((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          canvas.toBlob((b) => resolve(b!), 'image/png');
        };
        img.src = url;
      });
      const pngBuffer = await pngBlob.arrayBuffer();
      embeddedImage = await pdfDoc.embedPng(pngBuffer);
    }

    const imgDims = embeddedImage.scale(1);

    if (options.pageSize === 'fit') {
      const page = pdfDoc.addPage([imgDims.width, imgDims.height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgDims.width,
        height: imgDims.height,
      });
    } else {
      // A4 default: 595.28 x 841.89 points
      const a4Width = 595.28;
      const a4Height = 841.89;
      const margin = options.margin ?? 36;
      const usableW = a4Width - margin * 2;
      const usableH = a4Height - margin * 2;

      const scale = Math.min(usableW / imgDims.width, usableH / imgDims.height, 1);
      const drawW = imgDims.width * scale;
      const drawH = imgDims.height * scale;
      const x = (a4Width - drawW) / 2;
      const y = (a4Height - drawH) / 2;

      const page = pdfDoc.addPage([a4Width, a4Height]);
      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawW,
        height: drawH,
      });
    }
  }

  onProgress?.(90, 'Generating PDF...');
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob, pageCount: pdfDoc.getPageCount() };
}

export async function compressPdf(
  file: File,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob; size: number }> {
  onProgress?.(20, 'Reading PDF streams...');
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  onProgress?.(60, 'Re-encoding and optimizing cross-references...');
  // pdf-lib removes unused objects and deflates streams upon save
  const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob, size: blob.size };
}
