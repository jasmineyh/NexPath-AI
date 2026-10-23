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

async function pdfText(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let line = '';
    const out: string[] = [];
    for (const item of content.items) {
      if (!('str' in item)) continue;
      line += item.str;
      if (item.hasEOL) { out.push(line); line = ''; } else if (item.str && !item.str.endsWith(' ')) line += ' ';
    }
    if (line) out.push(line);
    pages.push(out.join('\n'));
  }
  return pages.join('\n\n');
}

async function docxText(buf: ArrayBuffer): Promise<string> {
  const mod = await import('mammoth');
  const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value;
}

/** Extracts plain text from a CV entirely in the browser. The file never leaves the device. */
export async function extractCvText(file: File): Promise<string> {
  const kind = kindOf(file);
  if (!kind) throw new CvReadError('type', 'Please upload a PDF, DOCX or TXT file.');
  if (file.size > MAX_CV_BYTES) throw new CvReadError('size', 'This file is larger than 5 MB. Please upload a smaller version.');
  let text = '';
  try {
    if (kind === 'txt') text = await file.text();
    else {
      const buf = await file.arrayBuffer();
      text = kind === 'pdf' ? await pdfText(buf) : await docxText(buf);
    }
  } catch {
    throw new CvReadError('unreadable', 'We could not read this file. It may be password-protected or damaged.');
  }
  text = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (text.replace(/\s/g, '').length < 30) {
    throw new CvReadError('unreadable', 'We could not read any text in this file. Scanned PDFs (images of pages) have no selectable text.');
  }
  return text.slice(0, 60000);
}
