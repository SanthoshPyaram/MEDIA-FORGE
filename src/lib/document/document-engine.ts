import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function convertDocxToHtml(file: File): Promise<{ html: string; messages: string[] }> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return {
    html: result.value,
    messages: result.messages.map((m) => m.message),
  };
}

export async function convertDocxToPdf(
  file: File,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob }> {
  onProgress?.(20, 'Extracting text and structure from Word document...');
  const arrayBuffer = await file.arrayBuffer();
  const { value: text } = await mammoth.extractRawText({ arrayBuffer });

  onProgress?.(50, 'Formatting PDF pages...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const lines = text.split('\n');
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const usableWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Simple text wrapping
  const wrappedLines: string[] = [];
  for (const line of lines) {
    if (!line.trim()) {
      wrappedLines.push('');
      continue;
    }
    const words = line.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, 11);
      if (width > usableWidth) {
        if (currentLine) wrappedLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) wrappedLines.push(currentLine);
  }

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineCount = 0;

  for (let i = 0; i < wrappedLines.length; i++) {
    if (lineCount >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      lineCount = 0;
    }

    const y = pageHeight - margin - lineCount * lineHeight;
    currentPage.drawText(wrappedLines[i], {
      x: margin,
      y,
      size: 11,
      font,
      color: rgb(0.1, 0.1, 0.15),
    });
    lineCount++;
  }

  onProgress?.(85, 'Finalizing document...');
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob };
}

export async function convertSheet(
  file: File,
  targetFormat: 'csv' | 'json' | 'html',
  sheetIndex = 0
): Promise<{ output: string | Blob; sheetNames: string[] }> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const selectedSheet = workbook.Sheets[sheetNames[sheetIndex] || sheetNames[0]];

  if (!selectedSheet) {
    throw new Error('No readable sheet found in workbook.');
  }

  if (targetFormat === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(selectedSheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    return { output: blob, sheetNames };
  } else if (targetFormat === 'json') {
    const json = XLSX.utils.sheet_to_json(selectedSheet);
    const jsonStr = JSON.stringify(json, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    return { output: blob, sheetNames };
  } else {
    const html = XLSX.utils.sheet_to_html(selectedSheet);
    return { output: html, sheetNames };
  }
}

export async function convertTxtToPdf(
  file: File,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ blob: Blob }> {
  onProgress?.(15, 'Reading text file...');
  const text = await file.text();

  onProgress?.(45, 'Creating PDF document...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Courier);

  const lines = text.split('\n');
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const usableWidth = pageWidth - margin * 2;
  const fontSize = 10;
  const lineHeight = 14;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  // Wrap lines for fixed-width courier font
  const wrappedLines: string[] = [];
  for (const line of lines) {
    if (line.length === 0) {
      wrappedLines.push('');
      continue;
    }
    let cur = '';
    for (let i = 0; i < line.length; i++) {
      cur += line[i];
      if (font.widthOfTextAtSize(cur, fontSize) > usableWidth) {
        wrappedLines.push(cur.slice(0, -1));
        cur = line[i];
      }
    }
    if (cur) wrappedLines.push(cur);
  }

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let lineCount = 0;

  for (let i = 0; i < wrappedLines.length; i++) {
    if (lineCount >= maxLinesPerPage) {
      currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
      lineCount = 0;
    }

    const y = pageHeight - margin - lineCount * lineHeight;
    currentPage.drawText(wrappedLines[i], {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.15, 0.15, 0.2),
    });
    lineCount++;
  }

  onProgress?.(90, 'Saving PDF...');
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  onProgress?.(100, 'Complete');

  return { blob };
}
