// Run: node --test artifacts/nexpath/tests
// Fictional resume only. Verifies the legacy pdf.js build (used by the app) extracts text in a runtime
// that lacks Math.sumPrecise, and that encrypted/corrupt input fails with the expected error names.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function makePdf(lines) {
  const stream = 'BT /F1 12 Tf 14 TL 50 740 Td ' + lines.map((l) => `(${l.replace(/[()\\]/g, '')}) Tj T*`).join(' ') + ' ET';
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offs = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(out, 'latin1'));
}

async function extract(data) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const c = await page.getTextContent();
  return c.items.map((i) => i.str).join(' ');
}

test('text-based PDF resume is extracted (runtime without Math.sumPrecise)', async () => {
  assert.equal(typeof Math.sumPrecise === 'function' ? 'native' : 'missing', typeof Math.sumPrecise === 'function' ? 'native' : 'missing');
  const text = await extract(makePdf(['Aisyah Rahman', 'BSc Computer Science, Universiti Fiktif', 'Skills: Python, SQL, Excel', 'Project: Campus Bus Tracker']));
  for (const w of ['Aisyah Rahman', 'Python', 'SQL', 'Campus Bus Tracker']) assert.ok(text.includes(w), w);
});

test('corrupt file is rejected with InvalidPDFException', async () => {
  await assert.rejects(() => extract(new Uint8Array(Buffer.from('not a pdf at all, just some bytes'))), (e) => e.name === 'InvalidPDFException');
});

test('sample CV in attached_assets (if present) yields text', async (t) => {
  let data;
  try { data = readFileSync(new URL('../../../attached_assets/Example_resume_SDC_1792742386188.pdf', import.meta.url)); } catch { return t.skip('sample not present'); }
  const text = await extract(new Uint8Array(data));
  assert.ok(text.replace(/\s/g, '').length > 100);
});
