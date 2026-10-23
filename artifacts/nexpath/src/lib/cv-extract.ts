
export const MAX_CV_BYTES = 5 * 1024 * 1024;

export type CvReadKind =
  | 'type'
  | 'size'
  | 'encrypted'
  | 'scanned'
  | 'corrupt'
  | 'unreadable';

export class CvReadError extends Error {
  kind: CvReadKind;

  constructor(kind: CvReadKind, message: string) {
    super(message);
    this.name = 'CvReadError';
    this.kind = kind;
  }
}

function kindOf(file: File): 'pdf' | 'docx' | 'txt' | null {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf') || file.type === 'application/pdf')
    return 'pdf';

  if (
    name.endsWith('.docx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'docx';

  if (name.endsWith('.txt') || file.type === 'text/plain')
    return 'txt';

  return null;
}

export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/([A-Za-z])-\n\s*([a-z])/g, '$1$2')
    .replace(/(?<=\w)\n(?=\w)/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function classifyCvText(
  text: string
): { ok: boolean; reason?: CvReadKind; message?: string } {
  const compact = text.replace(/\s/g, '');

  if (!compact) {
    return {
      ok: false,
      reason: 'scanned',
      message:
        'No readable text was detected. This may be a scanned or image-only document.',
    };
  }

  if (compact.length < 30) {
    return {
      ok: false,
      reason: 'unreadable',
      message:
        'Not enough readable text was found to build a CV profile. Try another export or paste the CV text.',
    };
  }

  return { ok: true };
}

function documentError(error: unknown, kind: 'pdf' | 'docx'): CvReadError {
  if (error instanceof CvReadError) return error;

  const name =
    error instanceof Error ? error.name : '';

  const message =
    error instanceof Error ? error.message : String(error ?? '');

  const detail = `${name} ${message}`.toLowerCase();

  if (/password|encrypted|permission|need password/.test(detail)) {
    return new CvReadError(
      'encrypted',
      'This document is password-protected or encrypted. Remove the protection or paste your CV text.'
    );
  }

  if (
    /invalidpdfexception|formaterror|invalid pdf|corrupt|xref|trailer|unexpected eof|failed to parse|parse error/.test(
      detail
    )
  ) {
    return new CvReadError(
      'corrupt',
      'This document appears damaged or malformed. Try exporting it again.'
    );
  }

  return new CvReadError(
    'unreadable',
    `We could not read this ${kind.toUpperCase()} file. Try another export or paste the CV text.`
  );
}

async function pdfText(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const worker = await import(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
  );

  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buf),
  }).promise;

  const pages: string[] = [];

  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);

      let content;

      try {
        content = await page.getTextContent();
      } catch {
        // Continue with other pages if one page is unreadable.
        continue;
      }

      const rows = new Map<
        number,
        Array<{ x: number; text: string }>
      >();

      for (const item of content.items) {
        if (!('str' in item) || !item.str) continue;

        const transform =
          'transform' in item && Array.isArray(item.transform)
            ? item.transform
            : [0, 0, 0, 0, 0, 0];

        const y = Math.round((transform[5] ?? 0) * 10) / 10;
        const x = Number((transform[4] ?? 0).toFixed(2));

        const text = String(item.str)
          .replace(/\s+/g, ' ')
          .trim();

        if (!text) continue;

        if (!rows.has(y)) rows.set(y, []);
        rows.get(y)!.push({ x, text });
      }

      const lines = [...rows.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([, chunks]) =>
          chunks
            .sort((a, b) => a.x - b.x)
            .map((chunk) => chunk.text)
            .join(' ')
        )
        .filter(Boolean);

      pages.push(lines.join('\n'));
    }
  } finally {
    await doc.destroy();
  }

  return pages.join('\n\n');
}

async function docxText(buf: ArrayBuffer): Promise<string> {
  const mod = await import('mammoth');

  const mammoth =
    (mod as unknown as { default?: typeof mod }).default ?? mod;

  const result = await mammoth.extractRawText({
    arrayBuffer: buf,
  });

  return result.value;
}

/**
 * Extracts CV text in the browser.
 * The original file is not uploaded by this function.
 */
export async function extractCvText(file: File): Promise<string> {
  const kind = kindOf(file);

  if (!kind) {
    throw new CvReadError(
      'type',
      'Please upload a PDF, DOCX or TXT file.'
    );
  }

  if (file.size > MAX_CV_BYTES) {
    throw new CvReadError(
      'size',
      'This file is larger than 5 MB. Please upload a smaller version.'
    );
  }

  let text = '';

  try {
    if (kind === 'txt') {
      text = await file.text();
    } else {
      const buf = await file.arrayBuffer();

      text =
        kind === 'pdf'
          ? await pdfText(buf)
          : await docxText(buf);
    }
  } catch (error) {
    throw documentError(error, kind);
  }

  text = normalizeExtractedText(text);

  const assessment = classifyCvText(text);

  if (!assessment.ok) {
    throw new CvReadError(
      assessment.reason ?? 'unreadable',
      assessment.message ?? 'We could not read this file.'
    );
  }

  return text.slice(0, 60000);
}
