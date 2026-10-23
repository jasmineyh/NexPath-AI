export const MAX_CV_BYTES = 5 * 1024 * 1024;

export type CvReadKind = 'type' | 'size' | 'encrypted' | 'scanned' | 'corrupt' | 'unreadable';

export class CvReadError extends Error {
  kind: CvReadKind;

  constructor(kind: CvReadKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function kindOf(file: File): 'pdf' | 'docx' | 'txt' | null {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
  if (n.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (n.endsWith('.txt') || file.type === 'text/plain') return 'txt';
  return null;
}

export function normalizeExtractedText(raw: string): string {
  let text = raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([A-Za-z])\-\n\s*([a-z])/g, '$1$2')
    .replace(/(?<=\w)\n(?=\w)/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return text
    .split(/\n+/)
    .map((line) => line.replace(/^\s+|\s+$/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

export function classifyCvText(text: string): { ok: boolean; reason?: CvReadKind; message?: string } {
  const compact = text.replace(/\s/g, '');
  if (!compact) return { ok: false, reason: 'scanned', message: 'No readable text was detected in this file. Scanned PDFs and image-only documents need OCR or text-based files.' };
  if (compact.length < 30) return { ok: false, reason: 'scanned', message: 'We could not read enough text to build a CV profile. This may be a scanned PDF or an image-only upload.' };
  return { ok: true };
}

function toPdfMessage(error: unknown): CvReadError {
  const summary = String(error instanceof Error ? error.message : error ?? '');
  const merged = `${summary}`.toLowerCase();
  if (/(password|encrypted|permission|bad password|need password)/i.test(merged)) {
    return new CvReadError('encrypted', 'This PDF is password-protected or encrypted. Remove the password and try again, or paste the text manually.');
  }
  if (/(invalid pdf|corrupt|missing data|xref|endstream|unexpected eof|trailer|not a pdf|cannot find|failed to parse|parse error|object stream)/i.test(merged)) {
    return new CvReadError('corrupt', 'This PDF file appears to be damaged or malformed. Try a fresh export or paste the CV text manually.');
  }
  return new CvReadError('corrupt', 'This PDF file appears to be damaged or malformed. Try a fresh export or paste the CV text manually.');
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
    const rows = new Map<number, Array<{ x: number; text: string }>>();

    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue;
      const transform = Array.isArray((item as { transform?: number[] }).transform) ? (item as { transform: number[] }).transform : [0, 0, 0, 0, 0, 0];
      const y = Math.round((transform[5] ?? 0) * 10) / 10;
      const x = Number((transform[4] ?? 0).toFixed(2));
      const text = String(item.str).replace(/\s+/g, ' ').trim();
      if (!text) continue;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, text });
    }

    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, chunks]) => chunks.sort((a, b) => a.x - b.x).map((chunk) => chunk.text).join(' '))
      .filter(Boolean);

    pages.push(lines.join('\n'));
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
  } catch (error) {
    throw toPdfMessage(error);
  }

  text = normalizeExtractedText(text);
  const assessment = classifyCvText(text);
  if (!assessment.ok) {
    throw new CvReadError(assessment.reason ?? 'scanned', assessment.message ?? 'We could not read enough text from this file.');
  }
  return text.slice(0, 60000);
}
