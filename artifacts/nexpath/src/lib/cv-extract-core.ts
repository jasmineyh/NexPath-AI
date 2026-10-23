/**
 * Layout-aware text extraction from a PDF using pdfjs-dist. Keeps x, y, width,
 * font size and a bold flag for every text item so the server can rebuild lines
 * and columns in visual order. No file content leaves this module except the
 * extracted text items.
 *
 * Pure of bundler specifics (no worker URL import) so it also runs in Node tests.
 */
export interface CvTextItem {
  text: string;
  x: number;
  y: number; // distance from top of page (baseline)
  w: number;
  size: number;
  page: number;
  bold?: boolean;
}
export interface CvPageInfo {
  width: number;
  height: number;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}
interface PdfPage {
  getViewport(o: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: unknown[]; styles: Record<string, { fontFamily?: string }> }>;
  getOperatorList(): Promise<unknown>;
  commonObjs: { get(id: string): { name?: string } | undefined; has?(id: string): boolean };
}
interface PdfDoc {
  numPages: number;
  getPage(n: number): Promise<PdfPage>;
}
export interface PdfJsLike {
  getDocument(src: { data: Uint8Array }): { promise: Promise<PdfDoc> };
}

const BOLD_RE = /bold|black|heavy|semibold|demi|extrabold/i;

export async function itemsFromPdf(pdfjs: PdfJsLike, data: ArrayBuffer | Uint8Array): Promise<{ items: CvTextItem[]; pages: CvPageInfo[] }> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  const items: CvTextItem[] = [];
  const pages: CvPageInfo[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1 });
    pages.push({ width: viewport.width, height: viewport.height });
    const content = await page.getTextContent();
    // Loading the operator list makes pdfjs resolve the real font names.
    try {
      await page.getOperatorList();
    } catch {
      /* font names stay unresolved; size is still used for emphasis */
    }
    const boldCache = new Map<string, boolean>();
    const isBold = (fontName: string): boolean => {
      const hit = boldCache.get(fontName);
      if (hit !== undefined) return hit;
      let name = "";
      try {
        name = page.commonObjs.get(fontName)?.name ?? "";
      } catch {
        name = "";
      }
      const family = content.styles[fontName]?.fontFamily ?? "";
      const v = BOLD_RE.test(name) || BOLD_RE.test(family);
      boldCache.set(fontName, v);
      return v;
    };
    for (const raw of content.items) {
      const it = raw as Partial<PdfTextItem>;
      if (typeof it.str !== "string" || !it.transform || it.str.trim() === "") continue;
      const [a, b, , , e, f] = it.transform as [number, number, number, number, number, number];
      const size = Math.hypot(a, b) || it.height || 10;
      items.push({
        text: it.str,
        x: e,
        y: viewport.height - f,
        w: it.width ?? it.str.length * size * 0.5,
        size: Math.round(size * 10) / 10,
        page: n,
        bold: isBold(it.fontName ?? ""),
      });
    }
  }
  return { items, pages };
}

/** Plain text (TXT, or DOCX raw text) as layout items: one line per item, no size information. */
export function itemsFromPlainText(text: string): CvTextItem[] {
  const out: CvTextItem[] = [];
  text
    .split(/\r?\n/)
    .forEach((l, i) => {
      const t = l.trim();
      if (t) out.push({ text: t, x: 0, y: i * 14, w: t.length * 5, size: 10, page: 1 });
    });
  return out;
}

/** DOCX HTML (from mammoth.convertToHtml) as layout items; headings and bold paragraphs become larger/bold items. */
export function itemsFromDocxHtml(html: string): CvTextItem[] {
  const out: CvTextItem[] = [];
  const re = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  let y = 0;
  const strip = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  while ((m = re.exec(html)) !== null) {
    const tag = m[1]!.toLowerCase();
    const inner = m[2]!;
    const heading = tag.startsWith("h");
    const allBold = /^\s*<(strong|b)>[\s\S]*<\/(strong|b)>\s*$/i.test(inner);
    const bullet = tag === "li";
    for (const part of strip(inner).split("\n")) {
      const t = part.trim();
      if (!t) continue;
      out.push({
        text: bullet ? `- ${t}` : t,
        x: bullet ? 12 : 0,
        y,
        w: t.length * 5,
        size: heading ? 14 : 10,
        page: 1,
        bold: heading || allBold,
      });
      y += 14;
    }
  }
  return out;
}
