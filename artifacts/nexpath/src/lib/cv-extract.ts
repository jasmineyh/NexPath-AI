import { itemsFromDocxHtml, itemsFromPdf, itemsFromPlainText, type CvPageInfo, type CvTextItem, type PdfJsLike } from './cv-extract-core';

export interface CvLayout { items: CvTextItem[]; pages: CvPageInfo[] }

export const MAX_CV_BYTES = 5 * 1024 * 1024;

export class CvReadError extends Error {
  constructor(public kind: 'type' | 'size' | 'unreadable', message: string) {
    super(message);
  }
}

function kindOf(file: File): 'pdf' | 'docx' | 'txt' | null {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (n.endsWith('.txt') || file.type === 'text/plain') return 'txt';
  return null;
}

async function pdfLayout(buf: ArrayBuffer): Promise<CvLayout> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return itemsFromPdf(pdfjs as unknown as PdfJsLike, new Uint8Array(buf));
}

async function docxLayout(buf: ArrayBuffer): Promise<CvLayout> {
  const mod = await import('mammoth');
  const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  return { items: itemsFromDocxHtml(res.value), pages: [] };
}

/** Extracts text with layout (x, y, size) from a CV entirely in the browser. The file never leaves the device. */
export async function extractCvLayout(file: File): Promise<CvLayout> {
  const kind = kindOf(file);
  if (!kind) throw new CvReadError('type', 'Please upload a PDF, DOCX or TXT file.');
  if (file.size > MAX_CV_BYTES) throw new CvReadError('size', 'This file is larger than 5 MB. Please upload a smaller version.');
  let layout: CvLayout;
  try {
    if (kind === 'txt') layout = { items: itemsFromPlainText((await file.text()).replace(/\u0000/g, '')), pages: [] };
    else {
      const buf = await file.arrayBuffer();
      layout = kind === 'pdf' ? await pdfLayout(buf) : await docxLayout(buf);
    }
  } catch {
    throw new CvReadError('unreadable', 'We could not read this file. It may be password-protected or damaged.');
  }
  const chars = layout.items.reduce((n, i) => n + i.text.replace(/\s/g, '').length, 0);
  if (chars < 30) {
    throw new CvReadError('unreadable', 'We could not read any text in this file. Scanned PDFs (images of pages) have no selectable text.');
  }
  return { items: layout.items.slice(0, 6000), pages: layout.pages };
}
