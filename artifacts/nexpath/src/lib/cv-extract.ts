export const MAX_CV_BYTES = 5 * 1024 * 1024;

export class CvReadError extends Error {
  constructor(public kind: 'type' | 'size' | 'unreadable' | 'encrypted' | 'corrupt' | 'scanned', message: string) {
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
  // The legacy build bundles polyfills (e.g. Math.sumPrecise). The modern build throws while parsing
  // embedded fonts in browsers that lack them, which surfaced as "Could not read this file".
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    let content;
    try {
      content = await page.getTextContent();
    } catch {
      continue; // one damaged page should not discard the rest of the CV
    }
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
  } catch (e) {
    const name = (e as { name?: string } | null)?.name ?? '';
    if (name === 'PasswordException') throw new CvReadError('encrypted', 'This PDF is password-protected. Remove the password and upload it again, or paste your CV text instead.');
    if (name === 'InvalidPDFException' || name === 'FormatError') throw new CvReadError('corrupt', 'This file looks damaged or is not a valid document. Try exporting it again, or paste your CV text instead.');
    throw new CvReadError('unreadable', 'We could not read this file. Try exporting it again as a PDF, or paste your CV text instead.');
  }
  text = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (text.replace(/\s/g, '').length < 30) {
    throw new CvReadError('scanned', 'We could not find any text in this file. It may be a scanned PDF (an image of a page), which needs manual entry or pasted text because OCR is not available.');
  }
  return text.slice(0, 60000);
}
