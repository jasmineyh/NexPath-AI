import type { Cell, Col, Line, PageInfo, RawItem } from "./types";

/**
 * Layout-aware line reconstruction.
 * Items are grouped into lines by y proximity, columns are detected from the
 * x positions, and each column is read top to bottom. Items that straddle the
 * column gutter (full-width paragraphs) split the page into horizontal bands.
 */

function itemEnd(i: RawItem): number {
  return i.x + (i.w > 0 ? i.w : i.text.length * i.size * 0.5);
}

function findGutter(items: RawItem[], pageWidth: number): number | null {
  const n = items.length;
  if (n < 14) return null;
  const candidates = Array.from(new Set(items.map((i) => Math.round(i.x / 3) * 3))).filter(
    (x) => x > pageWidth * 0.2 && x < pageWidth * 0.85,
  );
  let best: { g: number; score: number } | null = null;
  for (const g of candidates) {
    let left = 0;
    let right = 0;
    let crossing = 0;
    let aligned = 0;
    let rightChars = 0;
    const rightLines = new Set<number>();
    for (const i of items) {
      const end = itemEnd(i);
      if (i.x >= g - 4) {
        right++;
        rightChars += i.text.length;
        rightLines.add(Math.round(i.y / 4));
        if (Math.abs(i.x - g) <= 5) aligned++;
      } else if (end <= g + 2) left++;
      else crossing++;
    }
    if (left < 6 || right < 6) continue;
    if (rightLines.size < 5) continue;
    if (aligned / right < 0.45) continue;
    if (rightChars / right < 7) continue;
    if (crossing > Math.max(3, 0.12 * n)) continue;
    // the left column must actually end near the gutter at some point (otherwise this is just an indent)
    const leftEnds = items.filter((i) => i.x < g - 4 && itemEnd(i) <= g + 2).map(itemEnd);
    if (leftEnds.length === 0) continue;
    const score = Math.min(left, right) - 3 * crossing;
    if (!best || score > best.score) best = { g, score };
  }
  return best ? best.g : null;
}

interface Group {
  items: RawItem[];
  y: number;
  size: number;
}

function groupByY(items: RawItem[]): Group[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const groups: Group[] = [];
  for (const it of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(it.y - g.y) <= 0.45 * Math.max(it.size, g.size)) {
      g.items.push(it);
      g.y = (g.y * (g.items.length - 1) + it.y) / g.items.length;
      g.size = Math.max(g.size, it.size);
    } else groups.push({ items: [it], y: it.y, size: it.size });
  }
  return groups;
}

function toLine(g: Group, page: number, col: Col): Omit<Line, "idx" | "section"> {
  const items = [...g.items].sort((a, b) => a.x - b.x);
  const cells: Cell[] = [];
  let boldChars = 0;
  let chars = 0;
  for (const it of items) {
    const text = it.text.replace(/\s+/g, " ");
    chars += text.trim().length;
    if (it.bold) boldChars += text.trim().length;
    const last = cells[cells.length - 1];
    const gap = last ? it.x - last.xEnd : 0;
    if (last && gap <= Math.max(g.size * 2.5, 14)) {
      const glue = gap > g.size * 0.15 && !/\s$/.test(last.text) && !/^\s/.test(text) ? " " : "";
      last.text += glue + text;
      last.xEnd = Math.max(last.xEnd, itemEnd(it));
      last.size = Math.max(last.size, it.size);
    } else cells.push({ text, x: it.x, xEnd: itemEnd(it), size: it.size });
  }
  for (const c of cells) c.text = c.text.replace(/\s+/g, " ").trim();
  const live = cells.filter((c) => c.text.length > 0);
  return {
    text: live.map((c) => c.text).join("  "),
    cells: live,
    x: live[0]?.x ?? 0,
    xEnd: live[live.length - 1]?.xEnd ?? 0,
    y: g.y,
    size: g.size,
    bold: chars > 0 && boldChars / chars >= 0.6,
    page,
    col,
  };
}

/** Collapse letter-spaced text such as "E X P E R I E N C E". */
export function collapseLetterSpacing(text: string): string {
  const t = text.trim();
  const tokens = t.split(/\s+/);
  if (tokens.length < 4) return t;
  const single = tokens.filter((x) => x.length === 1 && /[A-Za-z&]/.test(x)).length;
  if (single / tokens.length < 0.75) return t;
  const groups = t.split(/\s{2,}/);
  if (groups.length > 1) return groups.map((g) => g.replace(/\s+/g, "")).join(" ");
  return t.replace(/\s+/g, "");
}

export function buildLines(rawItems: RawItem[], pages: PageInfo[] = []): Line[] {
  const items = rawItems
    .map((i) => ({ ...i, text: i.text.replace(/\u00a0/g, " ") }))
    .filter((i) => i.text.trim().length > 0 && Number.isFinite(i.x) && Number.isFinite(i.y));
  const pageNums = Array.from(new Set(items.map((i) => i.page))).sort((a, b) => a - b);
  const out: Line[] = [];

  for (const pg of pageNums) {
    const pItems = items.filter((i) => i.page === pg);
    const pageWidth = pages[pg - 1]?.width ?? Math.max(...pItems.map(itemEnd), 1);
    const gutter = findGutter(pItems, pageWidth);

    if (gutter === null) {
      for (const g of groupByY(pItems)) out.push({ ...toLine(g, pg, "S"), idx: 0, section: "header" });
      continue;
    }

    const span: RawItem[] = [];
    const left: RawItem[] = [];
    const right: RawItem[] = [];
    for (const i of pItems) {
      const end = itemEnd(i);
      if (i.x < gutter - 4 && end > gutter + 2) span.push(i);
      else if (i.x >= gutter - 4) right.push(i);
      else left.push(i);
    }
    // A spanning item makes its whole row full-width: group spans by y.
    const spanGroups = groupByY(span);
    const spanYs = spanGroups.map((g) => g.y);
    const bandOf = (y: number, size: number) => {
      let b = 0;
      for (const sy of spanYs) if (y > sy + 0.45 * size) b++;
      return b;
    };
    const rowTouchesSpan = (y: number, size: number) => spanYs.some((sy) => Math.abs(sy - y) <= 0.45 * size);

    // Non-span items on the same row as a spanning item join that spanning row.
    const keepL: RawItem[] = [];
    const keepR: RawItem[] = [];
    const extraSpan: RawItem[] = [...span];
    for (const i of left) (rowTouchesSpan(i.y, i.size) ? extraSpan : keepL).push(i);
    for (const i of right) (rowTouchesSpan(i.y, i.size) ? extraSpan : keepR).push(i);
    const spanLines = groupByY(extraSpan).map((g) => toLine(g, pg, "S"));
    const lGroups = groupByY(keepL);
    const rGroups = groupByY(keepR);

    const nBands = spanLines.length + 1;
    for (let b = 0; b < nBands; b++) {
      for (const g of lGroups) if (bandOf(g.y, g.size) === b) out.push({ ...toLine(g, pg, "L"), idx: 0, section: "header" });
      for (const g of rGroups) if (bandOf(g.y, g.size) === b) out.push({ ...toLine(g, pg, "R"), idx: 0, section: "header" });
      const sl = spanLines[b];
      if (sl) out.push({ ...sl, idx: 0, section: "header" });
    }
  }
  out.forEach((l, i) => (l.idx = i));
  return out;
}

/** Items for plain text (TXT / DOCX without layout information). */
export function itemsFromText(text: string): RawItem[] {
  const items: RawItem[] = [];
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/g, ""))
    .forEach((l, i) => {
      if (!l.trim()) return;
      items.push({ text: l.trim(), x: 0, y: i * 14, w: l.length * 5, size: 10, page: 1 });
    });
  return items;
}

export function bodySize(lines: Line[]): number {
  const weights = new Map<number, number>();
  for (const l of lines) {
    const k = Math.round(l.size * 2) / 2;
    weights.set(k, (weights.get(k) ?? 0) + l.text.length);
  }
  let best = 10;
  let bw = -1;
  for (const [k, w] of weights) {
    if (w > bw) {
      bw = w;
      best = k;
    }
  }
  return best;
}
